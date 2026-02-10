import os
import shutil
import asyncio
import json
import datetime
import time
from typing import List, Dict

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from config.settings import OUTPUT_DIR, GEMINI_ENGINE
from core.pdf_utils import convert_pdf_to_images
from core.schema_manager import load_schemas, update_schema_memory
from core.ai_extractor import extract_invoice_with_rotation
from core.excel_writer import update_excel_sheet
from costing.cost_manager import CostManager
from costing.price_updater import update_model_prices


BASE_UPLOAD_DIR = "uploads"
BASE_OUTPUT_DIR = "outputs"

MAX_CONCURRENT_TASKS = 3 

MAX_FILES_ALLOWED = 10
MAX_FILE_SIZE_MB = 10
MAX_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
SESSION_STATUS: Dict[str, Dict] = {}

app = FastAPI(title="Mizhou Invoice Extractor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def process_single_file_async(file_path, schemas, semaphore):
    """
    Async Worker: Performs the extraction.
    Does NOT update global status (keeps it pure).
    """
    async with semaphore:
        filename = os.path.basename(file_path)
        start_time = time.time()
        
        try:
            images = convert_pdf_to_images(file_path)
            if not images:
                return None, None, f"Skipped (Image Conversion Failed): {filename}"

            invoices_list, usage_stats = await extract_invoice_with_rotation(images, schemas)
            
            end_time = time.time()
            duration = round(end_time - start_time, 2)

            if invoices_list:
                unique_invoices = []
                seen_invoice_numbers = set()
                
                for invoice in invoices_list:
                    inv_no = str(invoice.get("Invoice No", "")).strip()
                    if inv_no and inv_no in seen_invoice_numbers:
                        continue
                    if inv_no:
                        seen_invoice_numbers.add(inv_no)
                    unique_invoices.append(invoice)

                if unique_invoices:
                    return unique_invoices, usage_stats, f"Completed ({duration}s)"
                else:
                    return None, usage_stats, f"Skipped (Duplicate) ({duration}s)"
            else:
                return None, None, f"Failed (AI returned no data) ({duration}s)"

        except Exception as e:
            end_time = time.time()
            duration = round(end_time - start_time, 2)
            return None, None, f"Error: {str(e)} ({duration}s)"

async def process_and_track_file(file_path, schemas, semaphore, session_key, cost_manager):
    """
    🔥 THE SMART WRAPPER 🔥
    This function calls the worker AND updates the global status IMMEDIATELY.
    """
    filename = os.path.basename(file_path)
    
    SESSION_STATUS[session_key]["files"][filename] = "Processing..."
    
    invoices, stats, msg = await process_single_file_async(file_path, schemas, semaphore)
    
    print(f"⏱️  Worker Finished: {filename} -> {msg}")
    SESSION_STATUS[session_key]["files"][filename] = msg
    SESSION_STATUS[session_key]["completed_count"] += 1
    
    if stats:
        cost_manager.log_usage(
            model_name=GEMINI_ENGINE,
            input_tokens=stats["input_tokens"],
            output_tokens=stats["output_tokens"],
            filename=filename
        )
        
    return invoices

async def background_extraction_task(user_id: str, session_id: str, saved_paths: List[str]):
    """
    Async Background Manager
    """
    session_key = f"{user_id}_{session_id}"
    
    # Initialize Status
    file_sizes_map = {}
    for p in saved_paths:
        try:
            file_sizes_map[os.path.basename(p)] = os.path.getsize(p)
        except:
            file_sizes_map[os.path.basename(p)] = 0

    SESSION_STATUS[session_key] = {
        "status": "processing",
        "files": {os.path.basename(p): "pending" for p in saved_paths},
        "file_sizes": file_sizes_map,
        "completed_count": 0,
        "total_count": len(saved_paths),
        "download_url": None,
        "cost_analysis": None
    }

    try:
        print("💰 Updating Model Prices...")
        update_model_prices()

        cost_manager = CostManager()
        schemas = load_schemas()
        
        session_output_dir = os.path.join(BASE_OUTPUT_DIR, user_id, session_id)
        os.makedirs(session_output_dir, exist_ok=True)

        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        report_filename = f"Report_{timestamp}.xlsx"
        report_path = os.path.join(session_output_dir, report_filename)

        print(f"🚀 Processing {len(saved_paths)} files asynchronously for Session: {session_id}")
        
        semaphore = asyncio.Semaphore(MAX_CONCURRENT_TASKS)
        
        tasks = [
            process_and_track_file(path, schemas, semaphore, session_key, cost_manager)
            for path in saved_paths
        ]
        results = await asyncio.gather(*tasks)

        all_file_results = [res for res in results if res is not None]

        print(f"💾 Writing Excel...")
        for file_batch in all_file_results:
            if not file_batch: continue
            first_item = file_batch[0]
            vendor_name = first_item.get("Vendor Name", "Unknown_Vendor")
            
            final_columns = update_excel_sheet(vendor_name, file_batch, file_path=report_path)
            if final_columns:
                update_schema_memory(vendor_name, final_columns)

        financial_summary = cost_manager.generate_total()
        with open(os.path.join(session_output_dir, "costing.json"), "w") as f:
            json.dump(financial_summary, f, indent=4)

        download_link = f"http://127.0.0.1:8000/download/{user_id}/{session_id}/{report_filename}"

        SESSION_STATUS[session_key]["status"] = "completed"
        SESSION_STATUS[session_key]["download_url"] = download_link
        SESSION_STATUS[session_key]["cost_analysis"] = financial_summary
        
        print(f"✅ Session {session_id} Completed.")

    except Exception as e:
        print(f"❌ Global Error in Background Task: {e}")
        SESSION_STATUS[session_key]["status"] = "failed"
        SESSION_STATUS[session_key]["error"] = str(e)


@app.post("/extract")
async def extract_invoices(
    background_tasks: BackgroundTasks,
    user_id: str = Form(...),
    session_id: str = Form(...),
    files: List[UploadFile] = File(...)
):
    if len(files) > MAX_FILES_ALLOWED:
        raise HTTPException(status_code=400, detail=f"Too many files. Max {MAX_FILES_ALLOWED}.")

    for file in files:
        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)
        if size > MAX_BYTES:
            raise HTTPException(status_code=400, detail=f"File {file.filename} too large. Max {MAX_FILE_SIZE_MB}MB.")

    session_upload_dir = os.path.join(BASE_UPLOAD_DIR, user_id, session_id)
    session_output_dir = os.path.join(BASE_OUTPUT_DIR, user_id, session_id)

    if os.path.exists(session_upload_dir): shutil.rmtree(session_upload_dir)
    if os.path.exists(session_output_dir): shutil.rmtree(session_output_dir)
    os.makedirs(session_upload_dir, exist_ok=True)
    os.makedirs(session_output_dir, exist_ok=True)

    saved_paths = []
    for file in files:
        file_path = os.path.join(session_upload_dir, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        saved_paths.append(file_path)

    background_tasks.add_task(background_extraction_task, user_id, session_id, saved_paths)

    return {
        "status": "started",
        "message": "Processing started in background (Async Mode).",
        "session_id": session_id,
        "check_status_url": f"http://127.0.0.1:8000/status/{user_id}/{session_id}"
    }

@app.get("/status/{user_id}/{session_id}")
def check_status(user_id: str, session_id: str):
    session_key = f"{user_id}_{session_id}"
    status_data = SESSION_STATUS.get(session_key)
    
    if not status_data:
        raise HTTPException(status_code=404, detail="Session not found or expired.")
    
    return status_data

@app.get("/download/{user_id}/{session_id}/{filename}")
def download_excel(user_id: str, session_id: str, filename: str):
    base_path = os.path.join(BASE_OUTPUT_DIR, user_id, session_id)
    file_path = os.path.join(base_path, filename)

    if not os.path.exists(file_path):
        if os.path.exists(file_path + ".xlsx"):
            file_path += ".xlsx"
            filename += ".xlsx"

    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    raise HTTPException(status_code=404, detail="Report not found.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True, workers=1)
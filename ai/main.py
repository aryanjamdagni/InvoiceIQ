import os
import json
import asyncio
from config.settings import DATA_DIR, OUTPUT_DIR, GEMINI_ENGINE
from core.pdf_utils import convert_pdf_to_images
from core.schema_manager import load_schemas, update_schema_memory
from core.ai_extractor import extract_invoice_with_rotation
from core.excel_writer import update_excel_sheet
from core.logger import setup_logger
from costing.cost_manager import CostManager
from costing.price_updater import update_model_prices

logger = setup_logger()

MAX_CONCURRENT_TASKS = 3 

async def process_single_invoice_async(file_path, schemas, semaphore):
    """
    Async Worker function.
    Uses a semaphore to limit concurrency.
    """
    async with semaphore:
        filename = os.path.basename(file_path)
        parent_folder = os.path.basename(os.path.dirname(file_path))
        
        try:
            images = convert_pdf_to_images(file_path)
            
            if not images:
                return None, None, f"Skipped (Image Conversion Failed): {filename}"

            invoices_list, usage_stats = await extract_invoice_with_rotation(images, schemas)
            
            if invoices_list:
                return invoices_list, usage_stats, f"Success: {parent_folder}/{filename} (Found {len(invoices_list)} invoices)"
            else:
                return None, None, f"Failed (AI returned no data): {filename}"
                
        except Exception as e:
            return None, None, f"Error processing {filename}: {str(e)}"

async def main_async():
    logger.info("🚀 Starting Mizhou Invoice Extraction System (Async Mode)...")
    
    logger.info("💰 Updating Model Prices...")
    update_model_prices()
    cost_manager = CostManager()

    logger.info(f"📂 Scanning Data Root: {DATA_DIR}")
    schemas = load_schemas()
    
    pdf_files = []
    for root, dirs, files in os.walk(DATA_DIR):
        for file in files:
            if file.lower().endswith(".pdf"):
                full_path = os.path.join(root, file)
                pdf_files.append(full_path)
    
    if not pdf_files:
        logger.warning("⚠️  No PDF files found.")
        return

    logger.info(f"   > Found {len(pdf_files)} PDF(s). Starting execution...")
    
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_TASKS)

    tasks = [
        process_single_invoice_async(f, schemas, semaphore) 
        for f in pdf_files
    ]

    results = await asyncio.gather(*tasks)
    for i, (invoices_found, usage_stats, status_msg) in enumerate(results, 1):
        logger.info(f"[{i}/{len(pdf_files)}] {status_msg}")
        
        if usage_stats:
            cost_manager.log_usage(
                model_name=GEMINI_ENGINE,
                input_tokens=usage_stats["input_tokens"],
                output_tokens=usage_stats["output_tokens"]
            )

        if invoices_found:
            for invoice_data in invoices_found:
                vendor_name = invoice_data.get("vendor_name", invoice_data.get("Vendor Name", "Unknown"))
                
                final_columns = update_excel_sheet(vendor_name, invoice_data)
                if final_columns:
                    update_schema_memory(vendor_name, final_columns)

    logger.info("📊 Generating Financial Report...")
    financial_summary = cost_manager.generate_total()
    
    logger.info(f"   > Total Cost: ${financial_summary['total_cost']:.5f}")
    
    cost_output_path = "costing.json"
    final_json_structure = {
        "llm_cost_analysis": financial_summary
    }
    
    try:
        with open(cost_output_path, "w") as f:
            json.dump(final_json_structure, f, indent=4)
        logger.info(f"💾 Cost analysis saved to: {cost_output_path}")
    except Exception as e:
        logger.error(f"❌ Failed to save costing.json: {e}")

    logger.info(f"🎉 All files processed. Excel Output: {os.path.join(OUTPUT_DIR, 'Consolidated_Report.xlsx')}")

if __name__ == "__main__":
    asyncio.run(main_async())
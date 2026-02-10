import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

load_dotenv(os.path.join(BASE_DIR, ".env"))

GEMINI_API_KEYS = [v for k, v in os.environ.items() if k.startswith("GEMINI_API_KEY") and v]
if not GEMINI_API_KEYS:
    print("⚠️  WARNING: No GEMINI_API_KEYS found in .env file!")

GEMINI_ENGINE = os.getenv("Gemini_Engine")
TIMEOUT_SECONDS = os.getenv("TIMEOUT_SECONDS")

DATA_DIR = os.path.join(BASE_DIR, "data") 

OUTPUT_DIR = os.path.join(BASE_DIR, "output")
REGISTRY_DIR = os.path.join(BASE_DIR, "registry")
LOG_DIR = os.path.join(BASE_DIR, "logs")

SCHEMA_FILE = os.path.join(REGISTRY_DIR, "vendor_schemas.json")
EXCEL_FILE = os.path.join(OUTPUT_DIR, "Consolidated_Report.xlsx")
LOG_FILE = os.path.join(LOG_DIR, "app.log")

for path in [DATA_DIR, OUTPUT_DIR, REGISTRY_DIR, LOG_DIR]:
    os.makedirs(path, exist_ok=True)
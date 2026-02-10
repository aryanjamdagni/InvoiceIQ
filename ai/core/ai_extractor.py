import asyncio
import json
import re
from google import genai
from google.genai import types

from config.settings import GEMINI_API_KEYS, GEMINI_ENGINE, TIMEOUT_SECONDS


def normalize_vendor_name(name):
    if not name:
        return "Unknown_Vendor"
    return name.strip().title()


async def _generate_content_internal(client, images, prompt):
    """
    Async wrapper for the Gemini API call.
    """
    response = await client.aio.models.generate_content(
        model=GEMINI_ENGINE,
        contents=[*images, prompt],
        config=types.GenerateContentConfig(
            response_mime_type="application/json"
        ),
    )
    return response


async def extract_invoice_with_rotation(images, master_schema_columns):
    """
    Orchestrates the extraction process Asynchronously.
    """
    
    base_prompt = """
You are an expert invoice data extraction agent. Your PRIMARY MISSION is to extract EVERY SINGLE ROW from invoice tables.

- "Asset Description":
  Capture full description including specifications, model numbers, and additional details. For example (Full Description :- PowerEdge R660 Server Place of Supply: MAHARASHTRA (27), IN........PowerEdge R660 No CCC, No CE Marking No Cables Required Shipping). NEVER truncate ANY DETAIL. *** DONT INCLUDE THE SERIAL NUMBERS in the Description BUT KEEP THEM IN MIND FOR "ASSET SERIAL NUMBER" FIELD. 

  Extract the only the Description if they contains Serial numbers after the description along with specifications and everything (e.g., "Chest Freezer Glass Top LED Commercial 000041978250600578,000041978250600579,00 000041978250600" ---> 000041978250600578, 000041978250600579, 000041978250600 are the serial Numbers Asset Description will be "Chest Freezer Glass Top LED Commercial") 

***LOOK AT ALL THE PAGES OF THE INVOICE CAREFULLY. INVOICE TABLE MAY SPAN MULTIPLE PAGES. EXTRACT ALL THE ROWS FROM ALL THE PAGES.***

### 🚨🚨🚨 ULTRA-CRITICAL: COUNT THE ROWS 🚨🚨🚨

**BEFORE YOU START EXTRACTION:**
1. Look at the invoice table
2. COUNT how many rows are in the table (look at Sr. No. column: 1, 2, 3, 4, 5...)
3. Your "Line Items" array MUST have EXACTLY that many objects
4. If the table has 5 rows → "Line Items" must have 5 objects
5. If the table has 8 rows → "Line Items" must have 8 objects
6. Look carefully for ALL rows understand the description of each row Dont mix the discription of two different items into one row Extract all the items carefully and with precision. **DONT EVER NEVER STOP EARLY** EXTRACT EVERYTHING.

*** FOR "Deliver Address" FIELD: Look ONLY for "Ship To", "Shipped To", or "Shipping Address". Dont search in "Bill To" or "Billed To".***
*** FOR Delivery Location FIELD: Look in delivery address for location details of city mentioned in the address. ***
*** FOR Delivery State FIELD: Look in delivery address for location details of state mentioned in the address. ***

**EXAMPLE:** Invoice table shows:
Sr. No. | Description           | Qty | Amount
1    | Server                |  1  | 725000
2    | Wireless Combo        |  1  | 0
3    | Monitor               |  1  | 9500
4    | Hard Drive            |  3  | 0
5    | Server Software       |  1  | 0

You MUST create 5 objects in "Line Items" array - ONE FOR EACH ROW.

**DO NOT:**
- ❌ Extract only the first row
- ❌ Skip rows with zero value
- ❌ Summarize multiple rows into one
- ❌ Stop early 

### RULE 1: DUPLICATE PAGE DETECTION

- Ignore pages marked: "Duplicate", "Triplicate", "Transporter Copy", "Supplier Copy"
- If same Invoice Number appears twice, use ONLY the first occurrence

-- Customer Name:
  Look ONLY for "Ship To", "Shipped To", or "Shipping Address" ANYTHING RELATED TO SHIPPING. NEVER search in "Bill To" or "Billed To".

-- Invoice Status (Proforma/Final):
    If Proforma Invoice is mentioned, set "Invoice Status" to "Proforma".
    Else, set it to "Final".

### RULE 2: SERIAL NUMBER EXTRACTION

**CRITICAL: Serial numbers are OPTIONAL. Most invoices DON'T have them.**

**STEP 1:** Look for explicit serial number column/field with labels:
- "Serial No:" or "Serial Number:" or "Tag Nos:" or "S/N:" or "SN:"
- Note: "Sr. No." followed by 1, 2, 3, 4, 5 is a ROW NUMBER, not a serial number

**STEP 2:** If explicit serial numbers exist:
- Extract the EXACT value from the serial field
- If multiple serials for ONE item → Return as ARRAY: ["SN001", "SN002", "SN003"]
- Example: Text shows "Sr. No. 1S7D76A049SGJF00015F" → Extract "1S7D76A049SGJF00015F"
- "PW0JC1YMPW0JC25EPW0JC25Q" such Numbers if ai is extracting for Serial number THen u need to look for Pattern and split them (for example here its 3 serial numbers PW0JC1YM, PW0JC25E, PW0JC25Q their initial part is same PW0JC and last 3-4 characters are different so split them accordingly and understand the pattern properly while extracting serial numbers)

**STEP 3:** If NO serial numbers exist:
- Leave "Asset Serial Number" empty string: ""
- Extract from the Description only if the description contains a serial number after the description along with specification and everything (e.g., "Chest Freezer Glass Top LED Commercial 000041978250600578,000041978250600579,00 000041978250600" ---> 000041978250600578, 000041978250600579, 000041978250600 are the serial Numbers) 
- If the Description contains Motor no and VIN Number then they Dont need to be considered in Asset Serial Number they should be include in the Asset Description but not in Asset Serial Number.
- DO NOT extract item codes or product codes


**IMPORTANT**: If you see "7D76A049SG TWO SOCKET..." in description, "7D76A049SG" is a MODEL NUMBER, not a serial.

### RULE 3: FIELD MAPPING

| Source Field | Output Key |
|--------------|------------|
| Serial No. / Tag Nos. (only actual serials) | Asset Serial Number |
| Description / Item Description | Asset Description (full text) |
| Quantity / Qty / Nos | Qty (number only) |
| Amount / Rate / Net Amount | Total Base Price |

### RULE 4: ASSET CATEGORIZATION

**Asset Category** (choose ONE):
- "L-Information & Technology" → Servers, Laptops, Monitors, Software, Networking
- "E-furniture & fixture" → Chairs, Tables, Desks
- "C-plant & Machinery" → Generators, Heavy Equipment

**Asset Make:**
- IF "L-Information & Technology" → Extract brand (Dell, HP, Lenovo, Cisco, Microsoft)
- ELSE → "N/A"

### RULE 5: QUANTITY

1. Check "Quantity" / "Qty" / "Nos" column
2. Return clean number (53, not "53 nos")

**❌ NEVER extract these as "Asset Serial Number":**
- Model numbers in descriptions: numbers/letters FOR EXAMPLE like 7D76A049SG, 4X31N50708 which occur before product details
- Item codes:  FOR EXAMPLE AMCINSPP0358, CISCOVIDEO491,....
- Product codes: FOR EXAMPLE CON-SNT-CSBA4LUK, CS-BAR-C-UK9,....
"""

    schema_context = f"""
Return a JSON list using these exact keys:
{json.dumps(master_schema_columns)}

### EXAMPLE 1: Orient Technologies Invoice

**Invoice has 5 rows in table:**
1. Server with serial
2. Wireless combo with serial
3. Monitor with serial
4. Hard drives (3x) with 3 serials
5. Server software (no serial)

**Your output MUST have 5 objects in Line Items:**

[
  {{
    "Vendor Name": "Orient Technologies Limited",
    "Invoice No": "MUM/2526/07509",
    "Invoice Date": "27/11/2025",
    "Currency Code": "INR",
    "Line Items": [
      {{
        "Asset Description": "7D76A049SG TWO SOCKET, SILVER 4514Y (16C), 2.4GHz, 32 GB DDR5 RAM, 3x2.4 TB 10K RPM SAS HDD RAID 530-8I, MICROSOFT WINDOWS SERVER 2022 STANDARD ROK (16 CORE) 3Yr 24x7 4Hr, MS WINDOWS SERVER CLIENT 2022 (5 USER)",
        "Asset Serial Number": "1S7D76A049SGJF00015F",
        "Qty": 1,
        "Total Base Price": 725000,
        "Asset Category": "L-Information & Technology",
        "Asset Make": "Dell",......,
      }},
      {{
        "Asset Description": "4XB7A83970 LENOVO 2.4TB 10K SAS HDD",
        "Asset Serial Number": ["1S4XB7A83970J902D45D", "1S4XB7A83970J902D45E", "1S4XB7A83970J902D456"],
        "Qty": 3,
        "Total Base Price": 0,
        "Asset Category": "L-Information & Technology",
        "Asset Make": "Lenovo",......,
      }}
    ]
  }}
]

### EXAMPLE 2: Online Instruments Invoice

**Invoice has 8 rows in table - all are Cisco AMC contracts with NO serials:**

[
  {{
    "Vendor Name": "Online Instruments (India) Pvt Ltd",
    "Invoice No": "PSIS2526-97622",
    "Invoice Date": "04-November-2025",
    "Currency Code": "INR",
    "Line Items": [
      {{
        "Asset Description": "AMCINSPP0358 / CISCO CON-SNT-CSBA4LUK",
        "Asset Serial Number": "",
        "Qty": 53,
        "Total Base Price": 1000329.42,
        "Asset Category": "L-Information & Technology",
        "Asset Make": "Cisco",.....,
      }},
      {{
        "Asset Description": "CISCOVIDEO491 / CISCO CON-ECDN-CSBARAT3",
        "Asset Serial Number": "",
        "Qty": 13,
        "Total Base Price": 346138.00,
        "Asset Category": "L-Information & Technology",
        "Asset Make": "Cisco",....,
      }},
      {{
        "Asset Description": "AMCINSPP0352 / CISCO CON-ECDN-CSBARCK9",
        "Asset Serial Number": "",
        "Qty": 17,
        "Total Base Price": 2126904.00,
        "Asset Category": "L-Information & Technology",
        "Asset Make": "Cisco",.....,
      }}
    ]
  }}
]

### 🔥 FINAL CHECKLIST BEFORE RETURNING OUTPUT 🔥

1. Did I count the table rows? (Look for Sr. No. 1, 2, 3, 4, 5...)
2. Does my "Line Items" array have the SAME number of objects as table rows?
3. Did I include zero-value items?
4. Did I avoid extracting model numbers (7D76A049SG, 4X31N50708) as serials?
5. Did I avoid extracting item codes (AMCINSPP0358) as serials?
6. If no serial numbers exist in the PDF, did I leave them empty ("")?

**IF YOUR "LINE ITEMS" ARRAY HAS FEWER OBJECTS THAN TABLE ROWS, YOU FAILED THE TASK.**
"""

    full_prompt = base_prompt + schema_context
    
    MAX_RETRIES = 5
    BASE_WAIT_TIME = 2

    for api_key in GEMINI_API_KEYS:
        attempt = 0
        while attempt < MAX_RETRIES:
            try:
                client = genai.Client(api_key=api_key,vertexai=False)
                response = await asyncio.wait_for(
                    _generate_content_internal(client, images, full_prompt),
                    timeout=TIMEOUT_SECONDS
                )

                usage_stats = {"input_tokens": 0, "output_tokens": 0}
                if response.usage_metadata:
                    usage_stats["input_tokens"] = response.usage_metadata.prompt_token_count
                    usage_stats["output_tokens"] = response.usage_metadata.candidates_token_count

                json_text = response.text.strip()

                json_text = re.sub(r"^```[a-zA-Z]*\n", "", json_text)
                json_text = re.sub(r"\n```$", "", json_text)
                json_text = json_text.strip("`")

                data = json.loads(json_text)

                if isinstance(data, dict):
                    data = [data]

                for invoice in data:
                    raw_name = invoice.get(
                        "Vendor Name",
                        invoice.get("vendor_name", "Unknown_Vendor"),
                    )

                    normalized_name = normalize_vendor_name(raw_name)
                    invoice["Vendor Name"] = normalized_name
                    invoice.pop("vendor_name", None)

                return data, usage_stats

            except (asyncio.TimeoutError, json.JSONDecodeError, Exception) as e:
                attempt += 1
                wait_time = BASE_WAIT_TIME * (2 ** (attempt - 1))
                print(f"   > ⚠️ Attempt {attempt}/{MAX_RETRIES} failed: {type(e).__name__}. Retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
                
        print(f"   > ❌ Key failed {MAX_RETRIES} times. Moving to next API Key...")
        continue
        
    return None, None
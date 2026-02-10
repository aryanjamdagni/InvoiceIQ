# import json
# import os
# from config.settings import SCHEMA_FILE

# def load_schemas():
#     """
#     Loads the existing vendor schemas from the JSON registry.
#     """
#     if os.path.exists(SCHEMA_FILE):
#         try:
#             with open(SCHEMA_FILE, "r") as f:
#                 return json.load(f)
#         except json.JSONDecodeError:
#             print(f"   > ⚠️ Warning: Schema file at {SCHEMA_FILE} is corrupted. Starting fresh.")
#             return {}
#     return {}

# def save_schemas(schemas):
#     """
#     Saves the updated schemas back to the JSON registry.
#     """
#     try:
#         with open(SCHEMA_FILE, "w") as f:
#             json.dump(schemas, f, indent=4)
#     except Exception as e:
#         print(f"   > ❌ Error saving schema registry: {e}")

# def update_schema_memory(vendor_name, new_keys):
#     """
#     Updates the registry for a specific vendor with new keys found.
#     CRITICAL: Preserves the order of existing keys. Appends new keys to the end.
#     """
#     schemas = load_schemas()
#     vendor_key = vendor_name.strip()

#     if vendor_key not in schemas:
#         schemas[vendor_key] = new_keys
#     else:
#         current_keys = schemas[vendor_key]
        
#         existing_set = set(current_keys)
        
#         keys_added = False
#         for key in new_keys:
#             if key not in existing_set:
#                 current_keys.append(key)
#                 existing_set.add(key)
#                 keys_added = True
        
#         if keys_added:
#             schemas[vendor_key] = current_keys
#             save_schemas(schemas)
#         else:
#             pass

#     if vendor_key not in schemas or keys_added: 
#          save_schemas(schemas)

import json
import os
from config.settings import SCHEMA_FILE

def load_schemas():
    """
    Loads the MASTER_SCHEMA from the JSON registry.
    Returns: A LIST of column strings (The Blueprint).
    """
    if os.path.exists(SCHEMA_FILE):
        try:
            with open(SCHEMA_FILE, "r") as f:
                data = json.load(f)
                return data.get("MASTER_SCHEMA", [])
        except json.JSONDecodeError:
            print(f"   > ⚠️ Warning: Schema file at {SCHEMA_FILE} is corrupted.")
            return []
    return []

def save_schemas(schemas):
    """
    DEPRECATED: We are using a strict Master Schema now. 
    We do not write dynamic columns back to the file.
    """
    pass

def update_schema_memory(vendor_name, new_keys):
    """
    DEPRECATED: The schema is fixed. We do not learn new keys per vendor anymore.
    Kept as a placeholder to prevent 'ImportError' in other files until they are cleaned up.
    """
    pass
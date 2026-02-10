import requests
import json
import os

PRICE_URL = "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json"
OUTPUT_FILE = "costing/model_prices.json" 

def update_model_prices():
    """
    Fetches the latest model price data from the remote LiteLLM URL.
    It saves ALL providers (not just DeepInfra) and includes tiered pricing fields.
    """
    print("💰 Starting model price update from remote source...")
    try:
        response = requests.get(PRICE_URL, timeout=10)
        response.raise_for_status()
        data = response.json()
    except requests.Timeout:
        print("⚠️ Price update timed out. Using existing model_prices.json.")
        return
    except requests.RequestException as e:
        print(f"❌ Error during price update: {e}. Using existing model_prices.json.")
        return

    full_price_list = {}
    for model_name, details in data.items():
        full_price_list[model_name] = {
            "litellm_provider": details.get("litellm_provider"),
            "mode": details.get("mode"),
            "input_cost_per_token": details.get("input_cost_per_token", 0),
            "output_cost_per_token": details.get("output_cost_per_token", 0),
            # "input_cost_per_token_above_128k_tokens": details.get("input_cost_per_token_above_128k_tokens"),
            # "output_cost_per_token_above_128k_tokens": details.get("output_cost_per_token_above_128k_tokens"),
            # "input_cost_per_token_above_200k_tokens": details.get("input_cost_per_token_above_200k_tokens"),
            # "output_cost_per_token_above_200k_tokens": details.get("output_cost_per_token_above_200k_tokens"),
            "cache_read_input_token_cost": details.get("cache_read_input_token_cost"),
            "cache_creation_input_token_cost": details.get("cache_creation_input_token_cost"),
            "max_tokens": details.get("max_tokens"),
            "max_input_tokens": details.get("max_input_tokens"),
            "max_output_tokens": details.get("max_output_tokens")
        }

    try:
        os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True) 
        
        with open(OUTPUT_FILE, "w") as f:
            json.dump(full_price_list, f, indent=4)
            
        print(f"✅ Model prices updated successfully! {len(full_price_list)} models saved to {OUTPUT_FILE}")
    except Exception as e:
        print(f"❌ Error saving price file: {e}")

if __name__ == "__main__":
    update_model_prices()
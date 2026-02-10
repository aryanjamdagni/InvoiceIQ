# import json
# import pandas as pd
# import os

# class CostManager:
#     def __init__(self, cost_file="model_prices.json"):
#         base_dir = os.path.dirname(os.path.abspath(__file__))
#         self.cost_file = os.path.join(base_dir, cost_file)
#         self.cost_data = {}
#         self.map = {}

#         try:
#             print(f"CostManager: Loading prices from {self.cost_file}")
#             with open(self.cost_file,"r") as f:
#                 self.cost_data=json.load(f)
#                 for full_name in self.cost_data.keys():
#                     short_name=full_name.split("/")[-1]
#                     self.map[short_name]=full_name
#         except FileNotFoundError:
#             pass

#         self.logger=[]  

#     def log_usage(self,model_name,input_tokens,output_tokens):
#         full_model_name = self.map.get(model_name)
#         if full_model_name is None:
#             print(f"Warning: Model short-name '{model_name}' not found in price map. Skipping cost.")
#             return
        
#         model_costs=self.cost_data.get(full_model_name)
#         if model_costs is None:
#             print(f"Warning: Model full-name '{full_model_name}' not found in cost data. Skipping cost.")
#             return


#         input_cost=model_costs["input_cost_per_token"] * input_tokens
#         output_cost=model_costs["output_cost_per_token"] * output_tokens
#         total_cost=input_cost + output_cost
#         self.logger.append({
#             "model_name": full_model_name,
#             "input_tokens": input_tokens,
#             "output_tokens": output_tokens,
#             "input_cost": input_cost,
#             "output_cost": output_cost,
#             "total_cost": total_cost
#         })

#     def generate_total(self):
#         if not self.logger:
#             print("No usage logged")
#             return {
#                 "total_input_tokens": 0,
#                 "total_output_tokens": 0,
#                 "total_cost": 0.0,
#                 "cost_by_model": {}
#             }
#         df=pd.DataFrame(self.logger)
#         total_input_tokens=df["input_tokens"].sum()
#         total_output_tokens=df["output_tokens"].sum()
#         total_input_cost=df["input_cost"].sum()
#         total_output_cost=df["output_cost"].sum()
#         total_cost=df["total_cost"].sum()
#         cost_by_model=df.groupby("model_name")["total_cost"].sum().to_dict()
#         return {
#             "total_input_tokens": int(total_input_tokens),
#             "total_output_tokens": int(total_output_tokens),
#             "total_input_cost": total_input_cost,
#             "total_output_cost": total_output_cost,
#             "total_cost": total_cost,
#             "cost_by_model": cost_by_model
#         }




# Mizhou Speical Costing per pdf
import json
import pandas as pd
import os

class CostManager:
    def __init__(self, cost_file="model_prices.json"):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        self.cost_file = os.path.join(base_dir, cost_file)
        self.cost_data = {}
        self.map = {}

        try:
            print(f"CostManager: Loading prices from {self.cost_file}")
            with open(self.cost_file,"r") as f:
                self.cost_data=json.load(f)
                for full_name in self.cost_data.keys():
                    short_name=full_name.split("/")[-1]
                    self.map[short_name]=full_name
        except FileNotFoundError:
            pass

        self.logger=[]  

    def log_usage(self, model_name, input_tokens, output_tokens, filename="Unknown_File"):
        """
        Logs usage with a specific filename tag.
        """
        full_model_name = self.map.get(model_name)
        if full_model_name is None:
            print(f"Warning: Model short-name '{model_name}' not found in price map. Skipping cost.")
            return
        
        model_costs=self.cost_data.get(full_model_name)
        if model_costs is None:
            print(f"Warning: Model full-name '{full_model_name}' not found in cost data. Skipping cost.")
            return

        input_cost=model_costs["input_cost_per_token"] * input_tokens
        output_cost=model_costs["output_cost_per_token"] * output_tokens
        total_cost=input_cost + output_cost
        
        self.logger.append({
            "filename": filename,
            "model_name": full_model_name,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "input_cost": input_cost,
            "output_cost": output_cost,
            "total_cost": total_cost
        })

    def generate_total(self):
        """
        Generates a summary AND an itemized breakdown per file.
        """
        if not self.logger:
            print("No usage logged")
            return {
                "summary": {
                    "total_input_tokens": 0,
                    "total_output_tokens": 0,
                    "total_cost": 0.0,
                    "cost_by_model": {}
                },
                "files": {}
            }
            
        df = pd.DataFrame(self.logger)
        
        total_input_tokens = df["input_tokens"].sum()
        total_output_tokens = df["output_tokens"].sum()
        total_input_cost = df["input_cost"].sum()
        total_output_cost = df["output_cost"].sum()
        total_cost = df["total_cost"].sum()
        cost_by_model = df.groupby("model_name")["total_cost"].sum().to_dict()
        
        files_breakdown = {}
        file_groups = df.groupby("filename")
        
        for name, group in file_groups:
            files_breakdown[name] = {
                "input_tokens": int(group["input_tokens"].sum()),
                "output_tokens": int(group["output_tokens"].sum()),
                "total_cost": round(float(group["total_cost"].sum()), 6),
                "model_used": group["model_name"].iloc[0] if not group.empty else "Unknown"
            }

        return {
            "summary": {
                "total_input_tokens": int(total_input_tokens),
                "total_output_tokens": int(total_output_tokens),
                "total_input_cost": total_input_cost,
                "total_output_cost": total_output_cost,
                "total_cost": total_cost,
                "cost_by_model": cost_by_model
            },
            "files": files_breakdown
        }


    

    
        
        
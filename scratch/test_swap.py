import sys
sys.path.append('.')
from datetime import date
from backend.db import fetch_all, fetch_one, execute
from backend.services.recommendation_service import swap_checklist_item

today = date.today()
profile = fetch_one("SELECT * FROM profiles WHERE user_id = 2")
items = fetch_all("SELECT * FROM daily_plan_checklist WHERE user_id = 2 AND plan_date = %s", (today,))
item_to_swap = items[0]
print(f"Original item: {item_to_swap['food_name']} ({item_to_swap['calories']} kcal, P:{item_to_swap['protein_g']}g, C:{item_to_swap['carbs_g']}g, F:{item_to_swap['fat_g']}g)")

res = swap_checklist_item(2, item_to_swap["id"], profile)
print("Swap result:", res)
new_item = fetch_one("SELECT * FROM daily_plan_checklist WHERE id = %s", (item_to_swap["id"],))
print(f"New swapped item: {new_item['food_name']} ({new_item['calories']} kcal, P:{new_item['protein_g']}g, C:{new_item['carbs_g']}g, F:{new_item['fat_g']}g)")

# Revert back for clean state
execute("""
    UPDATE daily_plan_checklist SET 
        food_id = %s, food_name = %s, serving = %s, calories = %s, protein_g = %s, carbs_g = %s, fat_g = %s, swapped_from_id = NULL
    WHERE id = %s
""", (
    item_to_swap["food_id"], item_to_swap["food_name"], item_to_swap["serving"],
    item_to_swap["calories"], item_to_swap["protein_g"], item_to_swap["carbs_g"], item_to_swap["fat_g"],
    item_to_swap["id"]
))
print("Reverted back to original item successfully.")

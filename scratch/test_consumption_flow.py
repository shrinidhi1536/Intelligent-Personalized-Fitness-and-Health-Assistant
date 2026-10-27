import sys
sys.path.append('.')
from datetime import date
from backend.db import fetch_one, fetch_all, execute
from backend.routes.nutrition import toggle_checklist_item
from pydantic import BaseModel

class DummyChecklistToggle(BaseModel):
    checklist_id: int
    is_consumed: bool

user = {"id": 2, "name": "Test User"}
today = date.today()

# Get all checklist items for today
checklist = fetch_all("SELECT * FROM daily_plan_checklist WHERE user_id = 2 AND plan_date = %s", (today,))
print(f"Found {len(checklist)} checklist items for today.")

# Clear any food logs for today to simulate clean start
execute("DELETE FROM food_logs WHERE user_id = 2 AND log_date = %s", (today,))

# Toggle every item as consumed
for item in checklist:
    execute("UPDATE daily_plan_checklist SET is_consumed = 1 WHERE id = %s", (item["id"],))
    execute("""
        INSERT INTO food_logs 
        (user_id, food_id, food_name, serving, calories, protein_g, carbs_g, fat_g, meal_type, log_date)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        2, item.get("food_id"), item["food_name"], item["serving"],
        float(item["calories"]), float(item["protein_g"]), float(item["carbs_g"]), float(item["fat_g"]),
        item["meal_type"], today
    ))

# Now query the totals from food_logs like the dashboard does
totals = fetch_one("""
    SELECT 
        COALESCE(SUM(calories), 0) as total_cals,
        COALESCE(SUM(protein_g), 0) as total_prot,
        COALESCE(SUM(carbs_g), 0) as total_carbs,
        COALESCE(SUM(fat_g), 0) as total_fat
    FROM food_logs WHERE user_id = %s AND log_date = %s
""", (2, today))

profile = fetch_one("SELECT * FROM profiles WHERE user_id = 2")

print("\n=== DASHBOARD / FOOD LOGS TOTALS AFTER CONSUMING ALL RECOMMENDED MEALS ===")
print(f"Calories:  Consumed = {float(totals['total_cals']):.1f} / Target = {profile['calorie_goal']} kcal (Diff: {float(totals['total_cals']) - profile['calorie_goal']:.1f})")
print(f"Protein:   Consumed = {float(totals['total_prot']):.1f}g / Target = {profile['protein_goal_g']}g (Diff: {float(totals['total_prot']) - profile['protein_goal_g']:.1f}g)")
print(f"Carbs:     Consumed = {float(totals['total_carbs']):.1f}g / Target = {profile['carbs_goal_g']}g (Diff: {float(totals['total_carbs']) - profile['carbs_goal_g']:.1f}g)")
print(f"Fat:       Consumed = {float(totals['total_fat']):.1f}g / Target = {profile['fat_goal_g']}g (Diff: {float(totals['total_fat']) - profile['fat_goal_g']:.1f}g)")

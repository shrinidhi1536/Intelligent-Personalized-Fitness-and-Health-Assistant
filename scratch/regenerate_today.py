import sys
sys.path.append('.')
from datetime import date
from backend.db import fetch_one, fetch_all, execute
from backend.services.recommendation_service import generate_or_get_daily_plan

user_id = 2
today = date.today()
profile = fetch_one("SELECT * FROM profiles WHERE user_id = %s", (user_id,))

print("Clearing stale today data for user 2...")
execute("DELETE FROM daily_plan_checklist WHERE user_id = %s AND plan_date = %s", (user_id, today))
execute("DELETE FROM food_logs WHERE user_id = %s AND log_date = %s", (user_id, today))

print("Generating new balanced plan for today...")
plan = generate_or_get_daily_plan(user_id, profile, today)

print("Target:       ", plan["target"])
print("Planned Total:", plan["planned_total"])
print("\nMeal items generated:")
for meal, items in plan["meals"].items():
    print(f"== {meal} ==")
    for it in items:
        print(f"  {it['food_name']:30s} | {it['serving']:20s} | {float(it['calories']):5.1f} kcal | P:{float(it['protein_g']):4.1f}g | C:{float(it['carbs_g']):4.1f}g | F:{float(it['fat_g']):4.1f}g")

import sys
sys.path.append('.')
from backend.db import fetch_all, fetch_one

profiles = fetch_all('SELECT user_id, calorie_goal, protein_goal_g, carbs_goal_g, fat_goal_g, diet_preference, cuisine_preference FROM profiles')
print('=== PROFILES ===')
for p in profiles:
    print(p)

uid = profiles[0]['user_id'] if profiles else 1
plan = fetch_all('SELECT id, user_id, plan_date, meal_type, food_name, serving, calories, protein_g, carbs_g, fat_g, is_consumed FROM daily_plan_checklist WHERE user_id = %s ORDER BY plan_date DESC, id ASC', (uid,))
print(f'\n=== ALL DAILY PLAN CHECKLIST FOR USER {uid} ({len(plan)} rows) ===')
by_date = {}
for x in plan:
    pdate = str(x['plan_date'])
    by_date.setdefault(pdate, []).append(x)

for pdate, items in by_date.items():
    tot_cal = sum(float(x['calories']) for x in items)
    tot_p = sum(float(x['protein_g']) for x in items)
    tot_c = sum(float(x['carbs_g']) for x in items)
    tot_f = sum(float(x['fat_g']) for x in items)
    consumed_count = sum(1 for x in items if x['is_consumed'])
    print(f"\n--- DATE: {pdate} ({len(items)} items, {consumed_count} consumed) ---")
    for x in items:
        print(f"  [{'X' if x['is_consumed'] else ' '}] {x['meal_type']:10s} | {x['food_name']:28s} | {x['serving']:16s} | Cal:{x['calories']:5.1f} | P:{x['protein_g']:4.1f}g | C:{x['carbs_g']:4.1f}g | F:{x['fat_g']:4.1f}g")
    print(f"  TOTAL PLANNED: Cal: {tot_cal:.1f} kcal | Protein: {tot_p:.1f}g | Carbs: {tot_c:.1f}g | Fat: {tot_f:.1f}g")

logs = fetch_all('SELECT * FROM food_logs WHERE user_id = %s ORDER BY log_date DESC, id DESC LIMIT 15', (uid,))
print(f'\n=== RECENT FOOD LOGS FOR USER {uid} ({len(logs)} rows) ===')
for l in logs:
    print(f"  {l['log_date']} | {l['meal_type']:10s} | {l['food_name']:28s} | Cal:{l['calories']:5.1f} | P:{l['protein_g']:4.1f}g | C:{l['carbs_g']:4.1f}g | F:{l['fat_g']:4.1f}g")

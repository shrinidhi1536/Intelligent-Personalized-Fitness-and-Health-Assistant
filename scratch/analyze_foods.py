import sys
sys.path.append('.')
from backend.db import fetch_all

foods = fetch_all('SELECT category, count(*) as count, avg(calories) as avg_cal, avg(protein_g) as avg_p, avg(carbs_g) as avg_c, avg(fat_g) as avg_f FROM food_database GROUP BY category ORDER BY count DESC')
print('=== FOOD CATEGORIES ===')
for f in foods:
    cat = f['category'] or 'None'
    print(f"{cat:25s} | Count: {f['count']:3d} | Avg Cal: {float(f['avg_cal']):5.1f} | P: {float(f['avg_p']):4.1f}g | C: {float(f['avg_c']):4.1f}g | F: {float(f['avg_f']):4.1f}g")

total_foods = fetch_all('SELECT count(*) as total FROM food_database')[0]['total']
print(f'\nTotal foods in database: {total_foods}')

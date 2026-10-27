import sys
sys.path.append('.')
from backend.db import fetch_all

chickens = fetch_all("SELECT id, name, category, calories, protein_g, carbs_g, fat_g FROM food_database WHERE LOWER(name) LIKE %s OR LOWER(name) LIKE %s OR LOWER(name) LIKE %s", ('%chicken%', '%fish%', '%salmon%'))
for c in chickens:
    print(c)

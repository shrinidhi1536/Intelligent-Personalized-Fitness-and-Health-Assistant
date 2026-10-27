from backend.db import execute, fetch_all

def clean_food_categories():
    queries = [
        "UPDATE food_database SET category = 'Fruits' WHERE LOWER(category) IN ('fruit', 'fruits');",
        "UPDATE food_database SET category = 'Grains' WHERE LOWER(category) IN ('grain', 'grains');",
        "UPDATE food_database SET category = 'Vegetables' WHERE LOWER(category) IN ('vegetable', 'vegetables');",
        "UPDATE food_database SET category = 'Healthy Beverages' WHERE LOWER(category) IN ('beverage', 'beverages', 'healthy beverages');",
        "UPDATE food_database SET category = 'Healthy Snacks' WHERE LOWER(category) IN ('snack', 'snacks', 'healthy snacks');",
        "UPDATE food_database SET category = 'Nuts & Seeds' WHERE LOWER(category) IN ('nuts', 'seeds', 'nuts & seeds', 'spread');",
        "UPDATE food_database SET category = 'Vegetarian Protein' WHERE LOWER(category) IN ('veg protein', 'vegetarian protein', 'protein');",
        "UPDATE food_database SET category = 'Vegan Protein' WHERE LOWER(category) IN ('vegan protein');",
        "UPDATE food_database SET category = 'Eggs & Poultry' WHERE LOWER(category) IN ('eggs', 'poultry', 'eggs & poultry');",
        "UPDATE food_database SET category = 'Seafood' WHERE LOWER(category) IN ('fish', 'seafood');",
        "UPDATE food_database SET category = 'Tubers' WHERE LOWER(category) IN ('tuber', 'tubers');",
        "UPDATE food_database SET category = 'Healthy Oils' WHERE LOWER(category) IN ('oil', 'oils', 'healthy oils');",
        "UPDATE food_database SET category = 'South Indian' WHERE LOWER(category) IN ('south indian', 'indian');",
        "UPDATE food_database SET category = 'North Indian' WHERE LOWER(category) IN ('north indian');"
    ]
    for q in queries:
        execute(q)

    cats = fetch_all("SELECT DISTINCT category, COUNT(*) as cnt FROM food_database GROUP BY category ORDER BY category ASC")
    print("Cleaned Categories in food_database:")
    for c in cats:
        print(f"  - {c['category']}: {c['cnt']} items")

if __name__ == '__main__':
    clean_food_categories()

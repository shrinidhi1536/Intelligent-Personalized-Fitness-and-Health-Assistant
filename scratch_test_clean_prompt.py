import json
from google import genai
from google.genai import types
from backend.config import config
from pathlib import Path

client = genai.Client(api_key=config.GEMINI_API_KEY)
p = Path(r"C:\Users\SHRINIDHI\.gemini\antigravity\brain\990453cb-b353-481c-ae73-86d2c9848a2d\.user_uploaded\media_1790669973412.png")
with open(p, "rb") as f:
    d = f.read()

prompt = """You are an advanced, world-class AI vision nutritionist and food recognition engine (similar to BetterMe / MyFitnessPal Vision).
Analyze this food photograph and identify EVERY edible food item, dish, snack, or beverage that is PHYSICALLY VISIBLE in the photo.

CRITICAL VISION RULES:
1. STRICT VISUAL INTEGRITY (DETECT ONLY WHAT IS PHYSICALLY VISIBLE):
   - Inspect the image carefully and detect ONLY items that are actually present.
   - NEVER assume or hallucinate accompaniments (do NOT assume white rice, do NOT assume curd, do NOT assume boiled egg, do NOT assume bread, do NOT assume side dips) unless clearly visible.
   - Strictly ignore background blurred objects, decorative garnishes, and empty utensils.

2. ACCURATE IDENTIFICATION & SEPARATION:
   - If multiple foods are served (e.g. Parotta and Curry): detect each visible food item separately.
   - If mixed items are served (e.g. mixed nuts, assorted sweets platter, mixed salad): decompose and classify each visible item separately with piece counts.

3. ACCURATE PORTIONS & MACROS:
   - Provide realistic portion estimates (grams, count, unit) and accurate macro values (calories, protein_g, carbs_g, fat_g) for each identified item.

Return ONLY a valid JSON array of objects:
[
  {
    "name": "Exact Food Name",
    "grams": 100,
    "count": 1,
    "unit": "pc / bowl / serving / slice / cup / scoop / tbsp",
    "calories": 150.0,
    "protein_g": 5.0,
    "carbs_g": 20.0,
    "fat_g": 6.0
  }
]"""

image_part = types.Part.from_bytes(data=d, mime_type="image/jpeg")
cfg = types.GenerateContentConfig(response_mime_type="application/json")

resp = client.models.generate_content(
    model="gemini-3.8-flash",
    contents=[prompt, image_part],
    config=cfg
)

print("GEMINI-2.5-FLASH RESULT FOR PAROTTA:")
print(resp.text)

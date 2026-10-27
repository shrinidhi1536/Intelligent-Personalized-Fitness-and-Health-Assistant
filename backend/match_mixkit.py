import re

path = r"C:\Users\SHRINIDHI\.gemini\antigravity\brain\990453cb-b353-481c-ae73-86d2c9848a2d\.system_generated\steps\2604\content.md"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

# Look for items with their title / href
items = re.findall(r'href="(/free-stock-video/[^"]+)"[^>]*>.*?assets\.mixkit\.co/videos/(\d+)', text, re.DOTALL)
print(f"Found {len(items)} matched items:")
for href, vid in items:
    print(f"ID {vid}: {href}")

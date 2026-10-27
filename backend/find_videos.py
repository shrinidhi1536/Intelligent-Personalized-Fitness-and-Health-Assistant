import re
import json

path = r"C:\Users\SHRINIDHI\.gemini\antigravity\brain\990453cb-b353-481c-ae73-86d2c9848a2d\.system_generated\steps\2604\content.md"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

urls = set(re.findall(r"https://assets\.mixkit\.co/videos/[^\"\'\s<>]+\.mp4", text))
print(f"Found {len(urls)} Mixkit video URLs:")
for u in sorted(urls):
    print(u)

import urllib.request
import re

url = "https://pixabay.com/videos/search/woman%20squat/"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode("utf-8")
        print(f"Pixabay page length: {len(html)}")
        vids = set(re.findall(r'https://[^\s"\'<>]+\.mp4[^\s"\'<>]*', html))
        print(f"Found {len(vids)} mp4 URLs:")
        for v in list(vids)[:10]:
            print(v)
except Exception as e:
    print(f"Error: {e}")

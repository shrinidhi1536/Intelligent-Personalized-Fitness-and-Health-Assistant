import urllib.request
import re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
for term in ['pushups', 'push-up', 'plank', 'dips', 'bridge', 'gym-workout']:
    url = f'https://coverr.co/s?q={term}'
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as r:
            html = r.read().decode('utf-8', errors='ignore')
        coverr_vids = set(re.findall(r'https://cdn\.coverr\.co/videos/[^\s"\'<>]+\.mp4', html))
        print(f"=== Coverr {term} : {len(coverr_vids)} free videos ===")
        for v in list(coverr_vids)[:5]:
            print(' ', v)
    except Exception as e:
        print(e)

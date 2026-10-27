import urllib.request
import re
import json

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

for term in ['pushups', 'plank', 'tricep-dips', 'glute-bridge']:
    url = f'https://coverr.co/s?q={term}'
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as r:
            html = r.read().decode('utf-8', errors='ignore')
        
        # Look for mp4 URLs
        mp4s = set(re.findall(r'https://[^\s"\'<>]+\.mp4', html))
        print(f"=== Coverr {term} : {len(mp4s)} mp4 links ===")
        for m in list(mp4s)[:5]:
            print(f"  {m}")
            
        # Also check for Next.js data
        next_data = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html)
        if next_data:
            data = json.loads(next_data.group(1))
            props = data.get('props', {}).get('pageProps', {})
            # Look for videos in pageProps
            items = props.get('videos', []) or props.get('data', {}).get('videos', [])
            print(f"  NextData videos: {len(items)}")
            for v in items[:3]:
                if isinstance(v, dict):
                    print("   ", v.get('title'), v.get('urls', {}).get('mp4'))
    except Exception as e:
        print(f"Coverr {term} error: {e}")

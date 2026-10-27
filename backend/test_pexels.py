import urllib.request
import re

url = "https://www.pexels.com/search/videos/woman%20squat/"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode("utf-8")
        print(f"Page length: {len(html)}")
        # Look for video URLs
        vids = set(re.findall(r'https://[^\s"\'<>]+\.mp4[^\s"\'<>]*', html))
        print(f"Found {len(vids)} mp4 URLs:")
        for v in list(vids)[:10]:
            print(v)
        # Look for video data attributes or ids
        video_ids = re.findall(r'data-video-id="(\d+)"', html)
        print(f"Found video IDs: {video_ids[:10]}")
except Exception as e:
    print(f"Error: {e}")

import urllib.request

base = "http://127.0.0.1:8000/static/assets/trainer/"
vids = [
    "squat", "pushup", "lunge", "plank", "yoga", 
    "cardio", "wall_pilates", "dips", "stretch", "bridge", "dumbbell"
]

all_ok = True
for name in vids:
    for ext in [".mp4", ".jpg"]:
        url = base + name + ext
        try:
            req = urllib.request.Request(url, method="HEAD")
            with urllib.request.urlopen(req, timeout=5) as r:
                cl = r.headers.get("Content-Length")
                ct = r.headers.get("Content-Type")
                print(f"[OK 200] {name}{ext} -> {cl} bytes, Type: {ct}")
        except Exception as e:
            print(f"[ERROR] {name}{ext} -> {e}")
            all_ok = False

if all_ok:
    print("\nALL 22 ASSET ENDPOINTS RESPONDED WITH HTTP 200 OK!")

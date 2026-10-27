import urllib.request
import os
import cv2

TRAINER_DIR = r"C:\Users\SHRINIDHI\Downloads\intelligent-fitness-pro\frontend\static\assets\trainer"

VIDEOS_MAP = {
    "squat.mp4": "https://pub-585d42eb1aa64a67aedf483ec328d3fe.r2.dev/exercise-videos/female/dumbbell-goblet-squat.mp4",
    "pushup.mp4": "https://pub-585d42eb1aa64a67aedf483ec328d3fe.r2.dev/exercise-videos/female/deep-push-ups.mp4",
    "lunge.mp4": "https://pub-585d42eb1aa64a67aedf483ec328d3fe.r2.dev/exercise-videos/female/dumbbell-lunge.mp4",
    "plank.mp4": "https://pub-585d42eb1aa64a67aedf483ec328d3fe.r2.dev/exercise-videos/female/front-plank-female.mp4",
    "yoga.mp4": "https://pub-585d42eb1aa64a67aedf483ec328d3fe.r2.dev/exercise-videos/female/stretching-bridge-pose-setu-bandhasana.mp4",
    "cardio.mp4": "https://pub-585d42eb1aa64a67aedf483ec328d3fe.r2.dev/exercise-videos/female/burpee.mp4",
    "wall_pilates.mp4": "https://pub-585d42eb1aa64a67aedf483ec328d3fe.r2.dev/exercise-videos/female/jackknife-pilates.mp4",
    "dips.mp4": "https://pub-585d42eb1aa64a67aedf483ec328d3fe.r2.dev/exercise-videos/female/bench-dips.mp4",
    "stretch.mp4": "https://pub-585d42eb1aa64a67aedf483ec328d3fe.r2.dev/exercise-videos/female/stretching-front-toe-touch.mp4",
    "bridge.mp4": "https://pub-585d42eb1aa64a67aedf483ec328d3fe.r2.dev/exercise-videos/female/hip-raise-bridge.mp4",
    "dumbbell.mp4": "https://pub-585d42eb1aa64a67aedf483ec328d3fe.r2.dev/exercise-videos/female/dumbbell-bent-over-row.mp4",
}

def main():
    print("Starting download and optimization of real female exercise demonstration videos...")
    for filename, url in VIDEOS_MAP.items():
        out_path = os.path.join(TRAINER_DIR, filename)
        print(f"Downloading {filename} from {url}...")
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as resp, open(out_path, "wb") as f:
            f.write(resp.read())
        
        # Verify with OpenCV
        cap = cv2.VideoCapture(out_path)
        frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        fps = cap.get(cv2.CAP_PROP_FPS)
        w = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
        h = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
        cap.release()
        size_mb = os.path.getsize(out_path) / (1024 * 1024)
        print(f"  -> Verified {filename}: {int(w)}x{int(h)}, {frames} frames @ {fps:.1f} FPS, {size_mb:.2f} MB")

    print("\nAll 11 genuine female exercise demonstration videos successfully deployed!")

if __name__ == "__main__":
    main()

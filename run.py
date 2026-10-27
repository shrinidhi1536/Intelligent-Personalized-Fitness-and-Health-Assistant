import uvicorn
from backend.config import config

if __name__ == "__main__":
    print(f"Starting Intelligent Personalized Fitness and Health Assistant server on http://{config.APP_HOST}:{config.APP_PORT}...")
    uvicorn.run("backend.app:app", host=config.APP_HOST, port=config.APP_PORT, reload=True)

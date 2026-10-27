import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-123456789-intelligent-fitness-pro-secure-key-2026")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

    # MySQL Configuration
    MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "Shri@2006")
    MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "ipfha_db")

    # AI Service Configuration
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

    # Server Configuration
    APP_HOST = os.getenv("APP_HOST", "127.0.0.1")
    APP_PORT = int(os.getenv("APP_PORT", 8000))

config = Config()

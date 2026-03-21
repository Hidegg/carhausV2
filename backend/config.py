import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
    # Railway provides postgres:// but SQLAlchemy requires postgresql://
    _db_url = os.environ.get('DATABASE_URL', 'sqlite:///carhaus.db')
    SQLALCHEMY_DATABASE_URI = _db_url.replace('postgres://', 'postgresql://', 1)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    DEBUG = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    TESTING = os.environ.get('TESTING', 'false').lower() == 'true'
    MAX_CONTENT_LENGTH = 1 * 1024 * 1024  # 1MB request body limit

    # Session security
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_SECURE = os.environ.get('FLASK_DEBUG', 'false').lower() != 'true'
    PERMANENT_SESSION_LIFETIME = timedelta(hours=12)

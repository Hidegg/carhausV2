"""
Run before gunicorn. Handles both fresh and existing databases:
- Fresh DB: create all tables + stamp migrations as current
- Existing DB: run pending migrations normally
"""
from backend import create_app
from backend.extensions import db
from sqlalchemy import inspect

app = create_app()

with app.app_context():
    inspector = inspect(db.engine)
    existing_tables = inspector.get_table_names()

    if 'locatie' not in existing_tables:
        print('[deploy] Fresh database — creating all tables...')
        db.create_all()
        from flask_migrate import stamp
        stamp()
        print('[deploy] Done. Tables created and migrations stamped.')
    else:
        print('[deploy] Existing database — running migrations...')
        from flask_migrate import upgrade
        upgrade()
        print('[deploy] Done.')

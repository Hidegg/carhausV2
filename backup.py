import os
import shutil
from datetime import datetime

BACKUPS_DIR = os.path.join(os.path.dirname(__file__), 'backups')
# SQLite DB is created by Flask-SQLAlchemy under instance/
DB_CANDIDATES = [
    os.path.join(os.path.dirname(__file__), 'instance', 'carhaus.db'),
    os.path.join(os.path.dirname(__file__), 'carhaus.db'),
]


def backup_database():
    db_path = next((p for p in DB_CANDIDATES if os.path.exists(p)), None)
    if not db_path:
        print('[backup] DB file not found, skipping.')
        return

    os.makedirs(BACKUPS_DIR, exist_ok=True)
    timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    dest = os.path.join(BACKUPS_DIR, f'carhaus_backup_{timestamp}.db')
    shutil.copy2(db_path, dest)
    print(f'[backup] Saved: {dest}')

    # Keep only the last 8 backups (~2 months of weekly backups)
    backups = sorted(
        f for f in os.listdir(BACKUPS_DIR) if f.endswith('.db')
    )
    for old in backups[:-8]:
        os.remove(os.path.join(BACKUPS_DIR, old))
        print(f'[backup] Removed old backup: {old}')


if __name__ == '__main__':
    backup_database()

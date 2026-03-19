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

    # Guard: ensure every column added after the initial schema exists.
    # Alembic was stamped to head on this DB without running migrations,
    # so we apply all structural changes idempotently via SQL.
    with db.engine.connect() as conn:
        stmts = [
            # servicii
            "ALTER TABLE servicii ADD COLUMN IF NOT EXISTS \"nrFirma\" VARCHAR(100)",
            "ALTER TABLE servicii ADD COLUMN IF NOT EXISTS notite VARCHAR(500)",
            # spalatori
            "ALTER TABLE spalatori ADD COLUMN IF NOT EXISTS \"prezentAzi\" BOOLEAN NOT NULL DEFAULT TRUE",
            # clienti
            "ALTER TABLE clienti ADD COLUMN IF NOT EXISTS \"gdprAcceptat\" BOOLEAN NOT NULL DEFAULT FALSE",
            "ALTER TABLE clienti ADD COLUMN IF NOT EXISTS \"newsletterAcceptat\" BOOLEAN NOT NULL DEFAULT FALSE",
            "ALTER TABLE clienti ADD COLUMN IF NOT EXISTS \"termeniAcceptati\" BOOLEAN NOT NULL DEFAULT FALSE",
            # pret_servicii
            "ALTER TABLE pret_servicii ADD COLUMN IF NOT EXISTS activ BOOLEAN NOT NULL DEFAULT TRUE",
            "ALTER TABLE pret_servicii ADD COLUMN IF NOT EXISTS locatie_id INTEGER REFERENCES locatie(id)",
            # user — widen password_hash so scrypt hashes fit
            'ALTER TABLE "user" ALTER COLUMN password_hash TYPE VARCHAR(512)',
        ]
        for stmt in stmts:
            conn.execute(db.text(stmt))
        conn.commit()
    print('[deploy] Column guards applied.')

    # One-time: rename locations to drop "CARHAUS " prefix
    from backend.models import Locatie
    renames = {'CARHAUS STRAULESTI': 'STRAULESTI', 'CARHAUS CARANFIL': 'CARANFIL'}
    for old, new in renames.items():
        loc = Locatie.query.filter_by(numeLocatie=old).first()
        if loc:
            loc.numeLocatie = new
            print(f'[deploy] Renamed location: {old} → {new}')
    db.session.commit()

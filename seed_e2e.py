"""
Standalone E2E seed script.
Creates test data in whatever DATABASE_URL is set (or the default SQLite db).

Usage:
    python seed_e2e.py
"""
import os
import sys

# Ensure the repo root is on the path so backend can be imported
sys.path.insert(0, os.path.dirname(__file__))

from backend import create_app
from backend.extensions import db
from backend.models import Locatie, User, Spalatori, PretServicii


def seed():
    app = create_app()
    with app.app_context():
        db.create_all()

        # Location
        loc = Locatie.query.filter_by(numeLocatie='Straulesti').first()
        if not loc:
            loc = Locatie(numeLocatie='Straulesti')
            db.session.add(loc)
            db.session.flush()

        # Admin
        if not User.query.filter_by(username='admin').first():
            admin = User(username='admin', rol='admin')
            admin.set_password('adminpass')
            db.session.add(admin)

        # Manager
        if not User.query.filter_by(username='manager').first():
            manager = User(username='manager', rol='manager', locatie_id=loc.id)
            manager.set_password('mgrpass')
            db.session.add(manager)

        # Dev
        if not User.query.filter_by(username='dev').first():
            dev_user = User(username='dev', rol='dev')
            dev_user.set_password('devpass')
            db.session.add(dev_user)

        # Spalator
        if not Spalatori.query.filter_by(numeSpalator='Ion', locatie_id=loc.id).first():
            sp = Spalatori(numeSpalator='Ion', locatie_id=loc.id)
            db.session.add(sp)

        # Price entries
        price_entries = [
            {
                'serviciiPrestate': 'Spalare Simpla',
                'pretAutoturism': 35.0,
                'pretSUV': 55.0,
                'pretVan': 45.0,
                'comisionAutoturism': 5.0,
                'comisionSUV': 8.0,
                'comisionVan': 6.0,
            },
            {
                'serviciiPrestate': 'Interior',
                'pretAutoturism': 25.0,
                'pretSUV': 40.0,
                'pretVan': 30.0,
                'comisionAutoturism': 4.0,
                'comisionSUV': 6.0,
                'comisionVan': 5.0,
            },
            {
                'serviciiPrestate': 'Complet',
                'pretAutoturism': 60.0,
                'pretSUV': 90.0,
                'pretVan': 75.0,
                'comisionAutoturism': 10.0,
                'comisionSUV': 15.0,
                'comisionVan': 12.0,
            },
        ]
        for entry in price_entries:
            if not PretServicii.query.filter_by(serviciiPrestate=entry['serviciiPrestate']).first():
                p = PretServicii(**entry)
                db.session.add(p)

        db.session.commit()
        print('E2E seed data created')


if __name__ == '__main__':
    seed()

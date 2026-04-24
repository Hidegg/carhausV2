"""
Run once on a fresh deployment to seed initial admin accounts and services.
Usage: python initialize.py
"""
from backend import create_app
from backend.extensions import db
from backend.models import User, PretServicii

app = create_app()

USERS = [
    ("admin",  "admin", "12345678"),
    ("admin2", "admin", "12345678"),
]

PRICES = [
    ("SPALARE STANDARD",  119.0, 129.0, 129.0, 20.0, 20.0, 20.0),
    ("SPALARE PREMIUM",   150.0, 170.0, 170.0, 30.0, 30.0, 30.0),
    ("SPALARE TAPITERIE", 1499.0, 2000.0, 2000.0, 300.0, 400.0, 400.0),
    ("POLISH",            2000.0, 2000.0, 2000.0, 400.0, 400.0, 400.0),
    ("POLISH FARURI",     150.0, 150.0, 150.0, 10.0, 10.0, 10.0),
    ("SERVICIU VALET",    100.0, 100.0, 100.0, 10.0, 10.0, 10.0),
    ("EXTERIOR",          69.0, 79.0, 79.0, 10.0, 10.0, 10.0),
    ("INTERIOR",          50.0, 50.0, 50.0, 10.0, 10.0, 10.0),
    ("CONTRACT",          0.0, 0.0, 0.0, 10.0, 10.0, 10.0),
    ("ALTE SERVICII",     0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
]

with app.app_context():
    for username, rol, password in USERS:
        u = User.query.filter_by(username=username).first()
        if not u:
            u = User(username=username, rol=rol)
            u.set_password(password)
            db.session.add(u)
            print(f"Created user: {username}")
        elif not u.check_password(password):
            u.set_password(password)
            print(f"Repaired password hash for: {username}")
    db.session.commit()

    for name, pa, ps, pv, ca, cs, cv in PRICES:
        if not PretServicii.query.filter_by(serviciiPrestate=name).first():
            db.session.add(PretServicii(
                serviciiPrestate=name,
                pretAutoturism=pa, pretSUV=ps, pretVan=pv,
                comisionAutoturism=ca, comisionSUV=cs, comisionVan=cv
            ))
            print(f"Created service: {name}")
    db.session.commit()

    print("Done.")

"""
Run once on a fresh deployment to seed initial admin accounts and services.
Usage: python initialize.py
"""
from backend import create_app
from backend.extensions import db
from backend.models import User, PretServicii, Locatie

app = create_app()

USERS = [
    ("admin",    "admin",   "12345678", None),
    ("admin2",   "admin",   "12345678", None),
    ("dev",      "dev",     "CHANGE_ME", None),
    ("manager1", "manager", "pass1",    "STRAULESTI"),
    ("manager2", "manager", "pass2",    "CARANFIL"),
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
    # Locations
    locations = {}
    for name in ["STRAULESTI", "CARANFIL"]:
        loc = Locatie.query.filter_by(numeLocatie=name).first()
        if not loc:
            loc = Locatie(numeLocatie=name)
            db.session.add(loc)
            db.session.commit()
            print(f"Created location: {name}")
        locations[name] = loc

    for username, rol, password, locatie_name in USERS:
        locatie_id = locations[locatie_name].id if locatie_name else None
        u = User.query.filter_by(username=username).first()
        if not u:
            u = User(username=username, rol=rol, locatie_id=locatie_id)
            u.set_password(password)
            db.session.add(u)
            print(f"Created user: {username}")
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

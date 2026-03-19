"""
Run once to seed the database with locations, users, washers, and prices.
Each resource is checked independently so partial previous runs are repaired.
Usage: python initialize.py
"""
from backend import create_app
from backend.extensions import db
from backend.models import Locatie, User, Spalatori, PretServicii

app = create_app()

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
    # Locations — idempotent per name
    straulesti = Locatie.query.filter_by(numeLocatie="STRAULESTI").first()
    if not straulesti:
        straulesti = Locatie(numeLocatie="STRAULESTI")
        db.session.add(straulesti)
        db.session.commit()
        print("Created location: STRAULESTI")

    caranfil = Locatie.query.filter_by(numeLocatie="CARANFIL").first()
    if not caranfil:
        caranfil = Locatie(numeLocatie="CARANFIL")
        db.session.add(caranfil)
        db.session.commit()
        print("Created location: CARANFIL")

    # Users — each checked independently so a partial previous run is repaired
    users_to_create = [
        ("admin",              "admin",   "12345678",  None),
        ("dev",                "dev",     "87654321",  None),
        ("carhaus_straulesti", "manager", "password1", straulesti.id),
        ("carhaus_caranfil",   "manager", "password",  caranfil.id),
    ]
    for username, rol, password, locatie_id in users_to_create:
        if not User.query.filter_by(username=username).first():
            u = User(username=username, rol=rol, locatie_id=locatie_id)
            u.set_password(password)
            db.session.add(u)
            print(f"Created user: {username}")
    db.session.commit()

    # Washers — idempotent
    spalatori_straulesti = ["Marin", "Alin", "Ionut", "Adrian", "Alex"]
    spalatori_caranfil   = ["Chinezul", "Toni", "Cristian", "Eugen", "Cezar", "Gheorghita"]

    for name in spalatori_straulesti:
        if not Spalatori.query.filter_by(numeSpalator=name, locatie_id=straulesti.id).first():
            db.session.add(Spalatori(numeSpalator=name, locatie_id=straulesti.id))
            print(f"Created spalator: {name}")
    for name in spalatori_caranfil:
        if not Spalatori.query.filter_by(numeSpalator=name, locatie_id=caranfil.id).first():
            db.session.add(Spalatori(numeSpalator=name, locatie_id=caranfil.id))
            print(f"Created spalator: {name}")
    db.session.commit()

    # Prices — idempotent
    for row in PRICES:
        name, pa, ps, pv, ca, cs, cv = row
        if not PretServicii.query.filter_by(serviciiPrestate=name).first():
            db.session.add(PretServicii(
                serviciiPrestate=name,
                pretAutoturism=pa, pretSUV=ps, pretVan=pv,
                comisionAutoturism=ca, comisionSUV=cs, comisionVan=cv
            ))
            print(f"Created price: {name}")
    db.session.commit()

    print("Database initialization complete.")

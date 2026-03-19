"""
Run once to seed the database with locations, users, washers, and prices.
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
    # Skip seeding if data already exists
    if Locatie.query.first():
        print("Database already seeded, skipping.")
        exit(0)

    # Locations
    straulesti = Locatie(numeLocatie="STRAULESTI")
    caranfil   = Locatie(numeLocatie="CARANFIL")
    db.session.add_all([straulesti, caranfil])
    db.session.commit()

    # Users
    admin = User(username="admin", rol="admin")
    admin.set_password("12345678")

    dev = User(username="dev", rol="dev")
    dev.set_password("87654321")

    mgr1 = User(username="carhaus_straulesti", rol="manager", locatie_id=straulesti.id)
    mgr1.set_password("password1")

    mgr2 = User(username="carhaus_caranfil", rol="manager", locatie_id=caranfil.id)
    mgr2.set_password("password")

    db.session.add_all([admin, dev, mgr1, mgr2])
    db.session.commit()

    # Washers per location
    spalatori_straulesti = ["Marin", "Alin", "Ionut", "Adrian", "Alex"]
    spalatori_caranfil   = ["Chinezul", "Toni", "Cristian", "Eugen", "Cezar", "Gheorghita"]

    for n in spalatori_straulesti:
        db.session.add(Spalatori(numeSpalator=n, locatie_id=straulesti.id))
    for n in spalatori_caranfil:
        db.session.add(Spalatori(numeSpalator=n, locatie_id=caranfil.id))
    db.session.commit()

    # Prices
    for row in PRICES:
        name, pa, ps, pv, ca, cs, cv = row
        if not PretServicii.query.filter_by(serviciiPrestate=name).first():
            db.session.add(PretServicii(
                serviciiPrestate=name,
                pretAutoturism=pa, pretSUV=ps, pretVan=pv,
                comisionAutoturism=ca, comisionSUV=cs, comisionVan=cv
            ))
    db.session.commit()

    print("Database seeded successfully.")
    print("  Locations: STRAULESTI, CARANFIL")
    print("  Users: admin / dev / carhaus_straulesti / carhaus_caranfil")
    print("  Washers and prices loaded.")

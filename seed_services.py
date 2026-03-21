"""
Seed realistic service submissions so the app looks populated.
Run AFTER initialize.py:  python seed_services.py
"""
import random
from datetime import datetime, timedelta, time
from zoneinfo import ZoneInfo

from backend import create_app
from backend.extensions import db
from backend.models import Clienti, Servicii, Spalatori, PretServicii, Locatie

BUCHAREST = ZoneInfo('Europe/Bucharest')

app = create_app()

PLATES = [
    # Bucharest B plates
    "B12ABC", "B34DEF", "B56GHI", "B78JKL", "B90MNO",
    "B11PQR", "B22STU", "B33VWX", "B44YZA", "B55BCD",
    "B66EFG", "B77HIJ", "B88KLM", "B99NOP", "B10QRS",
    "B20TUV", "B30WXY", "B40ZAB", "B50CDE", "B60FGH",
    # Other county plates
    "IF01AAA", "IF02BBB", "IF03CCC", "IF04DDD", "IF05EEE",
    "CL01AAA", "CL02BBB", "GL03CCC", "CT04DDD", "IS05EEE",
    "SB01AAA", "TM02BBB", "CJ03CCC", "BV04DDD", "PH05EEE",
    "AG01AAA", "MH02BBB", "DJ03CCC", "OT04DDD", "VL05EEE",
]

BRANDS = [
    "BMW", "MERCEDES", "AUDI", "VOLKSWAGEN", "TOYOTA",
    "FORD", "DACIA", "RENAULT", "HYUNDAI", "KIA",
    "SKODA", "SEAT", "HONDA", "NISSAN", "OPEL",
    "VOLVO", "PEUGEOT", "CITROEN", "FIAT", "MAZDA",
]

TYPES   = ["AUTOTURISM", "AUTOTURISM", "AUTOTURISM", "SUV", "SUV", "VAN"]
PLATA   = ["CASH", "CASH", "CASH", "CARD", "CARD", "CURS", "CONTRACT", "PROTOCOL"]

SERVICES_BY_TYPE = {
    "SPALARE STANDARD":  ["SPALARE STANDARD"],
    "SPALARE PREMIUM":   ["SPALARE PREMIUM"],
    "COMBO":             ["SPALARE STANDARD", "INTERIOR"],
    "COMBO PREMIUM":     ["SPALARE PREMIUM", "INTERIOR"],
    "FULL":              ["SPALARE PREMIUM", "INTERIOR", "EXTERIOR"],
    "EXTERIOR ONLY":     ["EXTERIOR"],
    "INTERIOR ONLY":     ["INTERIOR"],
    "POLISH":            ["POLISH"],
    "POLISH FARURI":     ["POLISH FARURI"],
    "TAPITERIE":         ["SPALARE TAPITERIE"],
}


def random_hour():
    """Returns a realistic working hour (8am–8pm)."""
    return random.randint(8, 19), random.randint(0, 59)


def day_start(date_):
    return datetime.combine(date_, time(4, 0), tzinfo=BUCHAREST)


with app.app_context():
    if Servicii.query.first():
        print("Services already seeded, skipping.")
        exit(0)

    # Clear any partial seed data (clients created but services never committed)
    Clienti.query.delete()
    db.session.commit()

    locatii = Locatie.query.all()
    preturi = {p.serviciiPrestate: p for p in PretServicii.query.all()}

    if not locatii:
        print("No locations found. Run initialize.py first.")
        exit(1)

    # Build per-location spalatori map
    spalatori_map = {
        loc.id: Spalatori.query.filter_by(locatie_id=loc.id).all()
        for loc in locatii
    }

    # Create clients — split evenly across locations
    clients = []
    plates_used = random.sample(PLATES, min(len(PLATES), 40))
    for i, plate in enumerate(plates_used):
        loc = locatii[i % len(locatii)]
        tip = random.choice(TYPES)
        c = Clienti(
            numarAutoturism=plate,
            marcaAutoturism=random.choice(BRANDS),
            tipAutoturism=tip,
            emailClient=f"client{i}@email.com" if random.random() > 0.5 else None,
            telefonClient=f"07{random.randint(10,99)}{random.randint(100000,999999)}" if random.random() > 0.4 else None,
            gdprAcceptat=random.random() > 0.1,
            newsletterAcceptat=random.random() > 0.5,
            termeniAcceptati=True,
            locatie_id=loc.id,
        )
        db.session.add(c)
        clients.append((c, loc))

    db.session.commit()

    # Generate services over the past 60 days
    today = datetime.now(BUCHAREST).date()
    records = []

    for day_offset in range(60, -1, -1):
        date_ = today - timedelta(days=day_offset)
        # Today gets a guaranteed solid number; weekends more, weekdays fewer
        is_weekend = date_.weekday() >= 5
        if day_offset == 0:
            cars_today = random.randint(10, 18)
        else:
            cars_today = random.randint(8, 18) if is_weekend else random.randint(4, 12)

        # Pick a random location bias per day (some days one loc is busier)
        for _ in range(cars_today):
            loc = random.choice(locatii)
            loc_clients = [(c, l) for c, l in clients if l.id == loc.id]
            if not loc_clients:
                continue

            client, _ = random.choice(loc_clients)
            spalatori = spalatori_map.get(loc.id, [])
            if not spalatori:
                continue

            spalator = random.choice(spalatori)
            tip_plata = random.choice(PLATA)
            nr_firma = f"F{random.randint(100,999)}" if tip_plata in ("CONTRACT", "PROTOCOL") else None

            combo_key = random.choice(list(SERVICES_BY_TYPE.keys()))
            service_names = SERVICES_BY_TYPE[combo_key]

            h, m = random_hour()
            ts = datetime.combine(date_, time(h, m), tzinfo=BUCHAREST).astimezone(ZoneInfo('UTC')).replace(tzinfo=None)

            # Sequential number for the day
            same_day_count = sum(1 for r in records if r.dataSpalare.date() == date_ and r.locatie_id == loc.id)
            nr = same_day_count + 1

            for sname in service_names:
                p = preturi.get(sname)
                pret, comision = 0.0, 0.0
                if p:
                    if client.tipAutoturism == "SUV":
                        pret, comision = p.pretSUV, p.comisionSUV
                    elif client.tipAutoturism == "VAN":
                        pret, comision = p.pretVan, p.comisionVan
                    else:
                        pret, comision = p.pretAutoturism, p.comisionAutoturism

                s = Servicii(
                    serviciiPrestate=sname,
                    dataSpalare=ts,
                    numarCurent=nr,
                    pretServicii=pret,
                    comisionServicii=comision,
                    tipPlata=tip_plata,
                    nrFirma=nr_firma,
                    clienti_id=client.id,
                    spalatori_id=spalator.id,
                    locatie_id=loc.id,
                )
                db.session.add(s)
                records.append(s)
                nr += 1

    db.session.commit()

    total_clients = Clienti.query.count()
    total_services = Servicii.query.count()
    print(f"Seeded {total_clients} clients and {total_services} service records across {len(locatii)} locations.")
    print(f"Date range: {today - timedelta(days=60)} → {today}")

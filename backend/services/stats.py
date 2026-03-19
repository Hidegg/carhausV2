from datetime import timedelta
from zoneinfo import ZoneInfo
from dateutil.relativedelta import relativedelta
from sqlalchemy import func
from backend.extensions import db
from backend.models import Servicii, Spalatori

BUCHAREST = ZoneInfo('Europe/Bucharest')


def get_date_ranges():
    from datetime import datetime
    today = datetime.now(BUCHAREST).date()
    return {
        'ziuaCurenta':      (today, today + timedelta(days=1)),
        'ziuaTrecuta':      (today - timedelta(days=1), today),
        'saptamanaCurenta': (today - timedelta(days=today.weekday()), today + timedelta(days=1)),
        'saptamanaTrecuta': (
            today - timedelta(days=today.weekday()) - timedelta(weeks=1),
            today - timedelta(days=today.weekday())
        ),
        'lunaCurenta':      (today.replace(day=1), today + timedelta(days=1)),
        'lunaTrecuta':      (
            (today - relativedelta(months=1)).replace(day=1),
            today.replace(day=1)
        ),
    }


REAL_PAYMENT_TYPES = {'CASH', 'CARD', 'CONTRACT', 'PROTOCOL'}


def get_period_stats(locatie_id, start, end):
    base = [Servicii.dataSpalare >= start, Servicii.dataSpalare < end]
    if locatie_id is not None:
        base.append(Servicii.locatie_id == locatie_id)

    # Payment type aggregation
    payment_rows = (
        db.session.query(
            Servicii.tipPlata,
            func.count(Servicii.id).label('cnt'),
            func.sum(Servicii.pretServicii).label('total'),
        )
        .filter(*base)
        .group_by(Servicii.tipPlata)
        .all()
    )

    # Spalator aggregation
    spalator_rows = (
        db.session.query(
            Spalatori.numeSpalator,
            func.count(Servicii.id).label('cnt'),
            func.sum(Servicii.comisionServicii).label('comision'),
        )
        .join(Spalatori, Servicii.spalatori_id == Spalatori.id)
        .filter(*base)
        .group_by(Spalatori.numeSpalator)
        .all()
    )

    # Service type aggregation
    service_rows = (
        db.session.query(
            Servicii.serviciiPrestate,
            func.count(Servicii.id).label('cnt'),
            func.sum(Servicii.pretServicii).label('total'),
        )
        .filter(*base)
        .group_by(Servicii.serviciiPrestate)
        .all()
    )

    # Unique cars served
    masini = db.session.query(
        func.count(func.distinct(Servicii.clienti_id))
    ).filter(*base).scalar() or 0

    # Process payment rows
    spalari_tip_plata = {'CASH': 0, 'CARD': 0, 'CURS': 0, 'CONTRACT': 0, 'PROTOCOL': 0}
    incasari_tip_plata = {'CASH': 0.0, 'CARD': 0.0, 'CONTRACT': 0.0, 'PROTOCOL': 0.0}
    curs_count = 0
    curs_amount = 0.0
    total_spalari = 0

    for row in payment_rows:
        tip = row.tipPlata
        cnt = row.cnt or 0
        total = float(row.total or 0)
        total_spalari += cnt
        if tip == 'CURS':
            spalari_tip_plata['CURS'] += cnt
            curs_count += cnt
            curs_amount += total
        else:
            real_tip = tip if tip in REAL_PAYMENT_TYPES else 'CASH'
            spalari_tip_plata[real_tip] += cnt
            incasari_tip_plata[real_tip] += total

    return {
        'spalari': total_spalari,
        'incasari': sum(incasari_tip_plata.values()),
        'cursInAsteptare': {'count': curs_count, 'amount': curs_amount},
        'clientiNoi': masini,
        'spalariTipPlata': spalari_tip_plata,
        'incasariTipPlata': incasari_tip_plata,
        'spalariPerSpalator': {r.numeSpalator: r.cnt for r in spalator_rows},
        'comisionPerSpalator': {r.numeSpalator: float(r.comision or 0) for r in spalator_rows},
        'spalariTipServiciu': {r.serviciiPrestate: r.cnt for r in service_rows},
        'incasariTipServiciu': {r.serviciiPrestate: float(r.total or 0) for r in service_rows},
    }


def get_location_report(locatie_id):
    ranges = get_date_ranges()
    return {
        period_name: get_period_stats(locatie_id, start, end)
        for period_name, (start, end) in ranges.items()
    }

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from dateutil.relativedelta import relativedelta
from backend.extensions import db
from backend.models import Servicii, Clienti

BUCHAREST = ZoneInfo('Europe/Bucharest')


def get_date_ranges():
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


def query_servicii(locatie_id, start, end):
    q = Servicii.query.filter(
        Servicii.dataSpalare >= start,
        Servicii.dataSpalare < end
    )
    if locatie_id is not None:
        q = q.filter(Servicii.locatie_id == locatie_id)
    return q.all()


def get_period_stats(servicii):
    clienti_ids = list({s.clienti_id for s in servicii})
    clienti_noi = Clienti.query.filter(Clienti.id.in_(clienti_ids)).count() if clienti_ids else 0

    spalari_tip_plata = {'CASH': 0, 'CARD': 0, 'CURS': 0}
    incasari_tip_plata = {'CASH': 0.0, 'CARD': 0.0, 'CURS': 0.0}
    spalari_per_spalator = {}
    comision_per_spalator = {}
    spalari_tip_serviciu = {}
    incasari_tip_serviciu = {}

    for s in servicii:
        tip = s.tipPlata if s.tipPlata in spalari_tip_plata else 'CURS'
        spalari_tip_plata[tip] += 1
        incasari_tip_plata[tip] += s.pretServicii or 0

        nume = s.spalatori.numeSpalator if s.spalatori else 'Necunoscut'
        spalari_per_spalator[nume] = spalari_per_spalator.get(nume, 0) + 1
        comision_per_spalator[nume] = comision_per_spalator.get(nume, 0) + (s.comisionServicii or 0)

        sv = s.serviciiPrestate
        spalari_tip_serviciu[sv] = spalari_tip_serviciu.get(sv, 0) + 1
        incasari_tip_serviciu[sv] = incasari_tip_serviciu.get(sv, 0.0) + (s.pretServicii or 0)

    return {
        'spalari': len(servicii),
        'incasari': sum(s.pretServicii or 0 for s in servicii),
        'clientiNoi': clienti_noi,
        'spalariTipPlata': spalari_tip_plata,
        'incasariTipPlata': incasari_tip_plata,
        'spalariPerSpalator': spalari_per_spalator,
        'comisionPerSpalator': comision_per_spalator,
        'spalariTipServiciu': spalari_tip_serviciu,
        'incasariTipServiciu': incasari_tip_serviciu,
    }


def get_location_report(locatie_id):
    ranges = get_date_ranges()
    report = {}
    for period_name, (start, end) in ranges.items():
        servicii = query_servicii(locatie_id, start, end)
        report[period_name] = get_period_stats(servicii)
    return report

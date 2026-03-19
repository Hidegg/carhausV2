from flask import Blueprint, request, jsonify, session
from flask_login import login_required, current_user
from datetime import datetime, timedelta, time
from zoneinfo import ZoneInfo

BUCHAREST = ZoneInfo('Europe/Bucharest')
from functools import wraps
from backend.extensions import db
from backend.models import Clienti, Servicii, PretServicii, Spalatori, Locatie

manager_bp = Blueprint('manager', __name__)


def get_day_window():
    """Returns (day_start, day_end) with a 4am cutoff in Bucharest time."""
    now = datetime.now(BUCHAREST)
    if now.hour < 4:
        base = now.date() - timedelta(days=1)
    else:
        base = now.date()
    day_start = datetime.combine(base, time(4, 0), tzinfo=BUCHAREST)
    day_end = day_start + timedelta(days=1)
    return day_start, day_end


def manager_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated or current_user.rol not in ['manager', 'admin', 'dev']:
            return jsonify({'error': 'Forbidden'}), 403
        return f(*args, **kwargs)
    return decorated


@manager_bp.route('/form-data')
@login_required
@manager_required
def form_data():
    locatie_id = session.get('locatie_id')
    preturi = PretServicii.query.all()
    spalatori = (Spalatori.query.filter_by(locatie_id=locatie_id).all()
                 if locatie_id else Spalatori.query.all())
    return jsonify({
        'preturi': [{
            'id': p.id,
            'serviciiPrestate': p.serviciiPrestate,
            'pretAutoturism': p.pretAutoturism,
            'pretSUV': p.pretSUV,
            'pretVan': p.pretVan,
            'comisionAutoturism': p.comisionAutoturism,
            'comisionSUV': p.comisionSUV,
            'comisionVan': p.comisionVan,
        } for p in preturi],
        'spalatori': [{'id': s.id, 'numeSpalator': s.numeSpalator} for s in spalatori]
    })


@manager_bp.route('/servicii', methods=['POST'])
@login_required
@manager_required
def add_serviciu():
    data = request.get_json()
    locatie_id = session.get('locatie_id')

    try:
        dataSpalare = datetime.fromisoformat(data['date']).replace(tzinfo=BUCHAREST)
    except (KeyError, ValueError) as e:
        return jsonify({'error': f'Invalid date: {e}'}), 400

    numar = data.get('numarAutoturism', '').upper()
    if not numar:
        return jsonify({'error': 'Numar autoturism required'}), 400

    client = Clienti.query.filter_by(numarAutoturism=numar).first()
    if not client:
        client = Clienti(
            numarAutoturism=numar,
            emailClient=data.get('emailClient') or None,
            telefonClient=data.get('telefonClient') or None,
            tipAutoturism=data.get('tipAutoturism', '').upper(),
            marcaAutoturism=data.get('marcaAutoturism', '').upper(),
            gdprAcceptat=bool(data.get('gdprAcceptat', False)),
            newsletterAcceptat=bool(data.get('newsletterAcceptat', False)),
            termeniAcceptati=bool(data.get('termeniAcceptati', False)),
            locatie_id=locatie_id
        )
        db.session.add(client)
        db.session.commit()

    spalator = Spalatori.query.filter_by(numeSpalator=data.get('spalator')).first()
    if not spalator:
        return jsonify({'error': 'Spalator not found'}), 400

    ultimul = Servicii.query.filter(
        db.func.date(Servicii.dataSpalare) == dataSpalare.date()
    ).order_by(Servicii.numarCurent.desc()).with_for_update().first()
    numarCurent = (ultimul.numarCurent + 1) if ultimul else 1

    servicii_adaugate = []
    servicii_list = data.get('serviciiPrestate', [])
    if not servicii_list:
        return jsonify({'error': 'Trebuie selectat cel putin un serviciu'}), 400

    for serviciu_name in servicii_list:
        pret_obj = PretServicii.query.filter_by(serviciiPrestate=serviciu_name).first()
        if not pret_obj:
            return jsonify({'error': f'Serviciu "{serviciu_name}" nu a fost gasit in lista de preturi'}), 400
        tip = client.tipAutoturism
        if tip == 'SUV':
            pret, comision = pret_obj.pretSUV, pret_obj.comisionSUV
        elif tip == 'VAN':
            pret, comision = pret_obj.pretVan, pret_obj.comisionVan
        else:
            pret, comision = pret_obj.pretAutoturism, pret_obj.comisionAutoturism

        s = Servicii(
            serviciiPrestate=serviciu_name,
            dataSpalare=dataSpalare,
            numarCurent=numarCurent,
            pretServicii=pret,
            comisionServicii=comision,
            tipPlata=data.get('tipPlata', 'CASH'),
            nrFirma=data.get('nrFirma') or None,
            clienti_id=client.id,
            spalatori_id=spalator.id,
            locatie_id=locatie_id
        )
        db.session.add(s)
        numarCurent += 1
        servicii_adaugate.append(serviciu_name)

    db.session.commit()
    return jsonify({'ok': True, 'servicii': servicii_adaugate})


@manager_bp.route('/dashboard')
@login_required
@manager_required
def dashboard():
    locatie_id = session.get('locatie_id')
    day_start, day_end = get_day_window()

    q = Servicii.query.filter(
        Servicii.dataSpalare >= day_start,
        Servicii.dataSpalare < day_end
    )
    if locatie_id:
        q = q.filter(Servicii.locatie_id == locatie_id)

    servicii = q.order_by(Servicii.id.desc()).all()

    grouped = {}
    for s in servicii:
        plate = s.clienti.numarAutoturism
        if plate not in grouped:
            grouped[plate] = {
                'client': {
                    'numarAutoturism': plate,
                    'marcaAutoturism': s.clienti.marcaAutoturism,
                    'tipAutoturism': s.clienti.tipAutoturism,
                    'emailClient': s.clienti.emailClient,
                    'telefonClient': s.clienti.telefonClient,
                },
                'servicii': []
            }
        grouped[plate]['servicii'].append({
            'id': s.id,
            'serviciiPrestate': s.serviciiPrestate,
            'dataSpalare': s.dataSpalare.isoformat(),
            'pretServicii': s.pretServicii,
            'comisionServicii': s.comisionServicii,
            'tipPlata': s.tipPlata,
            'nrFirma': s.nrFirma,
            'spalator': s.spalatori.numeSpalator if s.spalatori else None,
        })

    return jsonify(list(grouped.values()))


@manager_bp.route('/update-payment/<int:service_id>', methods=['POST'])
@login_required
@manager_required
def update_payment(service_id):
    data = request.get_json()
    s = Servicii.query.get_or_404(service_id)
    s.tipPlata = data.get('tipPlata')
    if 'nrFirma' in data:
        s.nrFirma = data.get('nrFirma') or None
    db.session.commit()
    return jsonify({'ok': True})


@manager_bp.route('/echipa')
@login_required
@manager_required
def echipa_get():
    locatie_id = session.get('locatie_id')
    spalatori = Spalatori.query.filter_by(locatie_id=locatie_id).all() if locatie_id else []
    return jsonify([{'id': s.id, 'numeSpalator': s.numeSpalator} for s in spalatori])


@manager_bp.route('/echipa', methods=['POST'])
@login_required
@manager_required
def echipa_add():
    locatie_id = session.get('locatie_id')
    if not locatie_id:
        return jsonify({'error': 'Locatie negasita'}), 400
    name = (request.get_json() or {}).get('numeSpalator', '').strip()
    if not name:
        return jsonify({'error': 'Numele este obligatoriu'}), 400
    sp = Spalatori(numeSpalator=name, locatie_id=locatie_id)
    db.session.add(sp)
    db.session.commit()
    return jsonify({'id': sp.id, 'numeSpalator': sp.numeSpalator}), 201


@manager_bp.route('/echipa/<int:id>', methods=['DELETE'])
@login_required
@manager_required
def echipa_delete(id):
    locatie_id = session.get('locatie_id')
    sp = Spalatori.query.get_or_404(id)
    if sp.locatie_id != locatie_id:
        return jsonify({'error': 'Forbidden'}), 403
    db.session.delete(sp)
    db.session.commit()
    return jsonify({'ok': True})


@manager_bp.route('/analytics')
@login_required
@manager_required
def analytics():
    locatie_id = session.get('locatie_id')
    day_start, day_end = get_day_window()

    q = Servicii.query.filter(
        Servicii.dataSpalare >= day_start,
        Servicii.dataSpalare < day_end
    )
    if locatie_id:
        q = q.filter(Servicii.locatie_id == locatie_id)

    servicii = q.all()

    cash = sum(s.pretServicii or 0 for s in servicii if s.tipPlata == 'CASH')
    card = sum(s.pretServicii or 0 for s in servicii if s.tipPlata == 'CARD')
    curs = sum(s.pretServicii or 0 for s in servicii if s.tipPlata == 'CURS')
    contract = sum(s.pretServicii or 0 for s in servicii if s.tipPlata == 'CONTRACT')
    protocol = sum(s.pretServicii or 0 for s in servicii if s.tipPlata == 'PROTOCOL')
    total = cash + card + contract + protocol  # CURS excluded — not yet collected
    masini = len(set(s.clienti_id for s in servicii))

    spalatori_map = {}
    for s in servicii:
        name = s.spalatori.numeSpalator if s.spalatori else 'Necunoscut'
        if name not in spalatori_map:
            spalatori_map[name] = {'servicii': 0, 'total': 0.0, 'comision': 0.0, 'items': []}
        spalatori_map[name]['servicii'] += 1
        # Only count collected revenue toward spalator total
        if s.tipPlata != 'CURS':
            spalatori_map[name]['total'] += s.pretServicii or 0
        spalatori_map[name]['comision'] += s.comisionServicii or 0
        spalatori_map[name]['items'].append({
            'serviciu': s.serviciiPrestate,
            'masina': s.clienti.numarAutoturism,
            'pret': s.pretServicii or 0,
            'ora': s.dataSpalare.astimezone(BUCHAREST).strftime('%H:%M'),
        })

    servicii_map = {}
    for s in servicii:
        name = s.serviciiPrestate
        if name not in servicii_map:
            servicii_map[name] = {'count': 0, 'total': 0.0}
        servicii_map[name]['count'] += 1
        servicii_map[name]['total'] += s.pretServicii or 0

    return jsonify({
        'total': total,
        'cash': cash,
        'card': card,
        'curs': curs,
        'contract': contract,
        'protocol': protocol,
        'masini': masini,
        'servicii_count': len(servicii),
        'spalatori': [{'name': k, **v} for k, v in spalatori_map.items()],
        'servicii_breakdown': [{'name': k, **v} for k, v in servicii_map.items()],
    })


@manager_bp.route('/client/<numar>')
@login_required
@manager_required
def get_client(numar):
    client = Clienti.query.filter_by(numarAutoturism=numar.upper()).first()
    if client:
        return jsonify({
            'tipAutoturism': client.tipAutoturism or '',
            'marcaAutoturism': client.marcaAutoturism or '',
            'emailClient': client.emailClient or '',
            'telefonClient': client.telefonClient or ''
        })
    return jsonify({'tipAutoturism': '', 'marcaAutoturism': '', 'emailClient': '', 'telefonClient': ''})

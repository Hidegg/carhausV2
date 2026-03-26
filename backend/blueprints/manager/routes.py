from flask import Blueprint, request, jsonify, session
from flask_login import login_required, current_user
from datetime import datetime, timedelta, time
from zoneinfo import ZoneInfo
from collections import Counter

BUCHAREST = ZoneInfo('Europe/Bucharest')
from functools import wraps
from sqlalchemy.orm import joinedload
from backend.extensions import db
from backend.models import Clienti, Servicii, PretServicii, Spalatori, Locatie

manager_bp = Blueprint('manager', __name__)

ALLOWED_TIP_PLATA = {'CASH', 'CARD', 'CURS', 'CONTRACT', 'PROTOCOL'}


def get_day_window():
    """Returns (day_start, day_end) as naive UTC datetimes with a 4am Bucharest cutoff."""
    now = datetime.now(BUCHAREST)
    if now.hour < 4:
        base = now.date() - timedelta(days=1)
    else:
        base = now.date()
    day_start_buc = datetime.combine(base, time(4, 0), tzinfo=BUCHAREST)
    day_end_buc = day_start_buc + timedelta(days=1)
    # Convert to naive UTC for DB comparison (column is timestamp without tz)
    day_start = day_start_buc.astimezone(ZoneInfo('UTC')).replace(tzinfo=None)
    day_end = day_end_buc.astimezone(ZoneInfo('UTC')).replace(tzinfo=None)
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

    # Per-location pricing: prefer locatie-specific rows, fall back to global (NULL locatie_id)
    if locatie_id:
        loc_preturi = PretServicii.query.filter_by(locatie_id=locatie_id, activ=True).all()
        loc_names = {p.serviciiPrestate for p in loc_preturi}
        global_preturi = PretServicii.query.filter_by(locatie_id=None, activ=True).all()
        preturi = loc_preturi + [p for p in global_preturi if p.serviciiPrestate not in loc_names]
    else:
        preturi = PretServicii.query.filter_by(activ=True).all()

    # Workers: only present ones; fall back to all if none are present
    if locatie_id:
        spalatori = Spalatori.query.filter_by(locatie_id=locatie_id, prezentAzi=True).all()
        if not spalatori:
            spalatori = Spalatori.query.filter_by(locatie_id=locatie_id).all()
    else:
        spalatori = Spalatori.query.all()

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
        dataSpalare = datetime.fromisoformat(data['date']).replace(tzinfo=BUCHAREST).astimezone(ZoneInfo('UTC')).replace(tzinfo=None)
    except (KeyError, ValueError) as e:
        return jsonify({'error': f'Invalid date: {e}'}), 400

    numar = data.get('numarAutoturism', '').upper()
    if not numar:
        return jsonify({'error': 'Numar autoturism required'}), 400

    client = Clienti.query.filter_by(numarAutoturism=numar).first()
    if not client:
        client = Clienti(
            numarAutoturism=numar,
            numeClient=data.get('numeClient') or None,
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
    else:
        # Update name if provided and client doesn't have one yet
        incoming_name = data.get('numeClient') or None
        if incoming_name and not client.numeClient:
            client.numeClient = incoming_name
            db.session.commit()

    # Accept spalatori_id (preferred) or spalator name (legacy)
    spalatori_id = data.get('spalatori_id')
    if spalatori_id:
        spalator = Spalatori.query.get(spalatori_id)
    else:
        spalator = Spalatori.query.filter_by(numeSpalator=data.get('spalator')).first()
    if not spalator:
        return jsonify({'error': 'Spalator not found'}), 400
    if locatie_id and spalator.locatie_id != locatie_id:
        return jsonify({'error': 'Spalator nu apartine acestei locatii'}), 400

    _day_start, _day_end = get_day_window()
    _q = Servicii.query.filter(
        Servicii.dataSpalare >= _day_start,
        Servicii.dataSpalare < _day_end
    ).order_by(Servicii.numarCurent.desc())
    if db.engine.dialect.name != 'sqlite':
        _q = _q.with_for_update()
    ultimul = _q.first()
    numarCurent = (ultimul.numarCurent + 1) if ultimul else 1

    tip_plata = data.get('tipPlata', 'CASH')
    if tip_plata not in ALLOWED_TIP_PLATA:
        return jsonify({'error': f'Tip plata invalid: {tip_plata}'}), 400

    servicii_adaugate = []
    servicii_list = data.get('serviciiPrestate', [])
    if not servicii_list:
        return jsonify({'error': 'Trebuie selectat cel putin un serviciu'}), 400
    if len(servicii_list) > 20:
        return jsonify({'error': 'Prea multe servicii (max 20)'}), 400

    for serviciu_name in servicii_list:
        # Prefer location-specific price, fall back to global
        pret_obj = None
        if locatie_id:
            pret_obj = PretServicii.query.filter_by(serviciiPrestate=serviciu_name, locatie_id=locatie_id).first()
        if not pret_obj:
            pret_obj = PretServicii.query.filter_by(serviciiPrestate=serviciu_name, locatie_id=None).first()
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
            tipPlata=tip_plata,
            nrFirma=data.get('nrFirma') or None,
            notite=data.get('notite') or None,
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

    q = Servicii.query.options(
        joinedload(Servicii.clienti), joinedload(Servicii.spalatori)
    ).filter(
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
            'notite': s.notite,
            'spalator': s.spalatori.numeSpalator if s.spalatori else None,
            'spalatori_id': s.spalatori_id,
        })

    return jsonify(list(grouped.values()))


@manager_bp.route('/update-payment/<int:service_id>', methods=['POST'])
@login_required
@manager_required
def update_payment(service_id):
    data = request.get_json()
    s = Servicii.query.get_or_404(service_id)
    new_tip = data.get('tipPlata')
    if new_tip:
        if new_tip not in ALLOWED_TIP_PLATA:
            return jsonify({'error': f'Tip plata invalid: {new_tip}'}), 400
        s.tipPlata = new_tip
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
    return jsonify([{'id': s.id, 'numeSpalator': s.numeSpalator, 'prezentAzi': s.prezentAzi} for s in spalatori])


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

    q = Servicii.query.options(
        joinedload(Servicii.clienti), joinedload(Servicii.spalatori)
    ).filter(
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
            'ora': s.dataSpalare.replace(tzinfo=ZoneInfo('UTC')).astimezone(BUCHAREST).strftime('%H:%M'),
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


@manager_bp.route('/servicii/<int:service_id>', methods=['DELETE'])
@login_required
@manager_required
def delete_serviciu(service_id):
    locatie_id = session.get('locatie_id')
    s = Servicii.query.get_or_404(service_id)
    if locatie_id and s.locatie_id != locatie_id:
        return jsonify({'error': 'Forbidden'}), 403
    db.session.delete(s)
    db.session.commit()
    return jsonify({'ok': True})


@manager_bp.route('/servicii/<int:service_id>', methods=['PUT'])
@login_required
@manager_required
def edit_serviciu(service_id):
    locatie_id = session.get('locatie_id')
    s = Servicii.query.get_or_404(service_id)
    if locatie_id and s.locatie_id != locatie_id:
        return jsonify({'error': 'Forbidden'}), 403
    data = request.get_json()

    if 'spalatori_id' in data or 'spalator' in data:
        if 'spalatori_id' in data:
            sp = Spalatori.query.get(data['spalatori_id'])
        else:
            sp = Spalatori.query.filter_by(numeSpalator=data['spalator']).first()
        if not sp:
            return jsonify({'error': 'Spalator not found'}), 400
        s.spalatori_id = sp.id

    if 'serviciiPrestate' in data and data['serviciiPrestate'] != s.serviciiPrestate:
        new_name = data['serviciiPrestate']
        pret_obj = None
        if locatie_id:
            pret_obj = PretServicii.query.filter_by(serviciiPrestate=new_name, locatie_id=locatie_id).first()
        if not pret_obj:
            pret_obj = PretServicii.query.filter_by(serviciiPrestate=new_name, locatie_id=None).first()
        if not pret_obj:
            return jsonify({'error': f'Serviciu "{new_name}" nu a fost gasit'}), 400
        client = s.clienti
        tip = client.tipAutoturism
        if tip == 'SUV':
            pret, comision = pret_obj.pretSUV, pret_obj.comisionSUV
        elif tip == 'VAN':
            pret, comision = pret_obj.pretVan, pret_obj.comisionVan
        else:
            pret, comision = pret_obj.pretAutoturism, pret_obj.comisionAutoturism
        s.serviciiPrestate = new_name
        s.pretServicii = pret
        s.comisionServicii = comision

    if 'tipPlata' in data:
        if data['tipPlata'] not in ALLOWED_TIP_PLATA:
            return jsonify({'error': f'Tip plata invalid: {data["tipPlata"]}'}), 400
        s.tipPlata = data['tipPlata']
    if 'nrFirma' in data:
        s.nrFirma = data.get('nrFirma') or None
    if 'notite' in data:
        s.notite = data.get('notite') or None

    db.session.commit()
    return jsonify({'ok': True})


@manager_bp.route('/plates-search')
@login_required
@manager_required
def plates_search():
    q = request.args.get('q', '').upper().strip()
    if len(q) < 2:
        return jsonify([])
    locatie_id = session.get('locatie_id')
    query = Clienti.query.filter(Clienti.numarAutoturism.like(f'%{q}%'))
    if locatie_id:
        query = query.filter(Clienti.locatie_id == locatie_id)
    results = query.order_by(Clienti.numarAutoturism).limit(10).all()
    return jsonify([{'numar': c.numarAutoturism, 'marca': c.marcaAutoturism or '', 'tip': c.tipAutoturism or ''} for c in results])


@manager_bp.route('/nrfirma-suggestions')
@login_required
@manager_required
def nrfirma_suggestions():
    locatie_id = session.get('locatie_id')
    q = db.session.query(db.distinct(Servicii.nrFirma)).filter(Servicii.nrFirma.isnot(None))
    if locatie_id:
        q = q.filter(Servicii.locatie_id == locatie_id)
    results = [r[0] for r in q.order_by(Servicii.nrFirma).limit(50).all()]
    return jsonify(results)


@manager_bp.route('/echipa/<int:id>', methods=['PUT'])
@login_required
@manager_required
def echipa_toggle(id):
    locatie_id = session.get('locatie_id')
    sp = Spalatori.query.get_or_404(id)
    if locatie_id and sp.locatie_id != locatie_id:
        return jsonify({'error': 'Forbidden'}), 403
    data = request.get_json() or {}
    if 'prezentAzi' in data:
        sp.prezentAzi = bool(data['prezentAzi'])
    db.session.commit()
    return jsonify({'id': sp.id, 'numeSpalator': sp.numeSpalator, 'prezentAzi': sp.prezentAzi})


@manager_bp.route('/client/<numar>')
@login_required
@manager_required
def get_client(numar):
    client = Clienti.query.filter_by(numarAutoturism=numar.upper()).first()
    if client:
        servicii_list = Servicii.query.filter_by(clienti_id=client.id).all()
        vizite = len(servicii_list)
        ultima_vizita = None
        serviciu_frecvent = None
        tip_plata_frecvent = None
        if servicii_list:
            ultima_vizita = max(s.dataSpalare for s in servicii_list).isoformat()
            serviciu_frecvent = Counter(s.serviciiPrestate for s in servicii_list).most_common(1)[0][0]
            tip_plata_frecvent = Counter(s.tipPlata for s in servicii_list).most_common(1)[0][0]
        return jsonify({
            'tipAutoturism': client.tipAutoturism or '',
            'marcaAutoturism': client.marcaAutoturism or '',
            'numeClient': client.numeClient or '',
            'emailClient': client.emailClient or '',
            'telefonClient': client.telefonClient or '',
            'vizite': vizite,
            'ultimaVizita': ultima_vizita,
            'serviciuFrecvent': serviciu_frecvent,
            'tipPlataFrecvent': tip_plata_frecvent,
        })
    return jsonify({
        'tipAutoturism': '', 'marcaAutoturism': '', 'numeClient': '', 'emailClient': '', 'telefonClient': '',
        'vizite': 0, 'ultimaVizita': None, 'serviciuFrecvent': None, 'tipPlataFrecvent': None,
    })

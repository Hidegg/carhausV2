from flask import Blueprint, request, jsonify, session
from flask_login import login_required, current_user
from datetime import datetime, timedelta
from functools import wraps
from backend.extensions import db
from backend.models import Clienti, Servicii, PretServicii, Spalatori, Locatie

manager_bp = Blueprint('manager', __name__)


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
        dataSpalare = datetime.fromisoformat(data['date'])
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
            locatie_id=locatie_id
        )
        db.session.add(client)
        db.session.commit()

    spalator = Spalatori.query.filter_by(numeSpalator=data.get('spalator')).first()
    if not spalator:
        return jsonify({'error': 'Spalator not found'}), 400

    ultimul = Servicii.query.filter(
        db.func.date(Servicii.dataSpalare) == dataSpalare.date()
    ).order_by(Servicii.numarCurent.desc()).first()
    numarCurent = (ultimul.numarCurent + 1) if ultimul else 1

    servicii_adaugate = []
    for serviciu_name in data.get('serviciiPrestate', []):
        pret_obj = PretServicii.query.filter_by(serviciiPrestate=serviciu_name).first()
        pret, comision = 0.0, 0.0
        if pret_obj:
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
    today = datetime.today().date()

    q = Servicii.query.filter(
        Servicii.dataSpalare >= today,
        Servicii.dataSpalare < today + timedelta(days=1)
    )
    if locatie_id:
        q = q.filter(Servicii.locatie_id == locatie_id)

    servicii = q.order_by(Servicii.dataSpalare.desc()).all()

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
    db.session.commit()
    return jsonify({'ok': True})


@manager_bp.route('/client/<numar>')
@login_required
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

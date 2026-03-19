from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from functools import wraps
from sqlalchemy import func
from backend.extensions import db
from backend.models import Locatie, User, Clienti, Servicii, Spalatori, PretServicii

dev_bp = Blueprint('dev', __name__)


def dev_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated or current_user.rol != 'dev':
            return jsonify({'error': 'Forbidden'}), 403
        return f(*args, **kwargs)
    return decorated


@dev_bp.route('/overview')
@login_required
@dev_required
def overview():
    total_servicii = Servicii.query.count()
    total_incasari = db.session.query(func.sum(Servicii.pretServicii)).scalar() or 0
    total_clienti = Clienti.query.count()
    total_comision = db.session.query(func.sum(Servicii.comisionServicii)).scalar() or 0

    locatii = Locatie.query.all()

    servicii_counts = dict(db.session.query(Servicii.locatie_id, func.count(Servicii.id)).group_by(Servicii.locatie_id).all())
    incasari_totals = dict(db.session.query(Servicii.locatie_id, func.sum(Servicii.pretServicii)).group_by(Servicii.locatie_id).all())
    clienti_counts = dict(db.session.query(Clienti.locatie_id, func.count(Clienti.id)).group_by(Clienti.locatie_id).all())
    spalatori_counts = dict(db.session.query(Spalatori.locatie_id, func.count(Spalatori.id)).group_by(Spalatori.locatie_id).all())
    managers_counts = dict(db.session.query(User.locatie_id, func.count(User.id)).filter(User.rol == 'manager').group_by(User.locatie_id).all())

    per_locatie = [{
        'id': loc.id,
        'numeLocatie': loc.numeLocatie,
        'totalServicii': servicii_counts.get(loc.id, 0),
        'totalIncasari': float(incasari_totals.get(loc.id) or 0),
        'totalClienti': clienti_counts.get(loc.id, 0),
        'totalSpalatori': spalatori_counts.get(loc.id, 0),
        'totalManageri': managers_counts.get(loc.id, 0),
    } for loc in locatii]

    return jsonify({
        'allTime': {
            'totalServicii': total_servicii,
            'totalIncasari': float(total_incasari),
            'totalClienti': total_clienti,
            'totalComision': float(total_comision),
        },
        'perLocatie': per_locatie,
        'users': {
            'admins': User.query.filter_by(rol='admin').count(),
            'managers': User.query.filter_by(rol='manager').count(),
            'devs': User.query.filter_by(rol='dev').count(),
        },
    })


@dev_bp.route('/clients')
@login_required
@dev_required
def clients():
    search = request.args.get('q', '').strip().upper()
    page = max(1, int(request.args.get('page', 1)))
    per_page = 30

    q = Clienti.query
    if search:
        q = q.filter(Clienti.numarAutoturism.ilike(f'%{search}%'))

    total = q.count()
    clienti = q.order_by(Clienti.id.desc()).offset((page - 1) * per_page).limit(per_page).all()

    loc_map = {l.id: l.numeLocatie for l in Locatie.query.all()}

    client_ids = [c.id for c in clienti]
    last_service_map = dict(
        db.session.query(Servicii.clienti_id, func.max(Servicii.dataSpalare))
        .filter(Servicii.clienti_id.in_(client_ids))
        .group_by(Servicii.clienti_id).all()
    ) if client_ids else {}
    service_count_map = dict(
        db.session.query(Servicii.clienti_id, func.count(Servicii.id))
        .filter(Servicii.clienti_id.in_(client_ids))
        .group_by(Servicii.clienti_id).all()
    ) if client_ids else {}

    result = []
    for c in clienti:
        last_date = last_service_map.get(c.id)
        result.append({
            'id': c.id,
            'numarAutoturism': c.numarAutoturism,
            'marcaAutoturism': c.marcaAutoturism,
            'tipAutoturism': c.tipAutoturism,
            'emailClient': c.emailClient,
            'telefonClient': c.telefonClient,
            'locatie': loc_map.get(c.locatie_id),
            'totalServicii': service_count_map.get(c.id, 0),
            'ultimaSpalare': last_date.isoformat() if last_date else None,
            'gdpr': c.gdprAcceptat,
            'newsletter': c.newsletterAcceptat,
        })

    return jsonify({
        'clients': result,
        'total': total,
        'page': page,
        'pages': max(1, (total + per_page - 1) // per_page),
    })


@dev_bp.route('/client/<plate>/history')
@login_required
@dev_required
def client_history(plate):
    c = Clienti.query.filter_by(numarAutoturism=plate.upper()).first_or_404()
    loc = Locatie.query.get(c.locatie_id)
    servicii = Servicii.query.filter_by(clienti_id=c.id).order_by(
        Servicii.dataSpalare.desc()).all()

    return jsonify({
        'client': {
            'numarAutoturism': c.numarAutoturism,
            'marcaAutoturism': c.marcaAutoturism,
            'tipAutoturism': c.tipAutoturism,
            'emailClient': c.emailClient,
            'telefonClient': c.telefonClient,
            'locatie': loc.numeLocatie if loc else None,
            'gdpr': c.gdprAcceptat,
            'newsletter': c.newsletterAcceptat,
        },
        'servicii': [{
            'id': s.id,
            'serviciiPrestate': s.serviciiPrestate,
            'dataSpalare': s.dataSpalare.isoformat(),
            'pretServicii': s.pretServicii,
            'comisionServicii': s.comisionServicii,
            'tipPlata': s.tipPlata,
            'nrFirma': s.nrFirma,
            'spalator': s.spalatori.numeSpalator if s.spalatori else None,
        } for s in servicii],
    })


@dev_bp.route('/accounts')
@login_required
@dev_required
def accounts_list():
    users = User.query.order_by(User.rol, User.username).all()
    locatii = Locatie.query.all()
    loc_map = {l.id: l.numeLocatie for l in locatii}

    return jsonify({
        'users': [{
            'id': u.id,
            'username': u.username,
            'rol': u.rol,
            'locatie_id': u.locatie_id,
            'locatie': loc_map.get(u.locatie_id) if u.locatie_id else None,
        } for u in users],
        'locatii': [{'id': l.id, 'numeLocatie': l.numeLocatie} for l in locatii],
    })


@dev_bp.route('/accounts', methods=['POST'])
@login_required
@dev_required
def account_add():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    rol = data.get('rol', 'manager')
    locatie_id = data.get('locatie_id')

    if not username or not password:
        return jsonify({'error': 'Username si parola sunt obligatorii'}), 400
    if rol not in ['admin', 'manager', 'dev']:
        return jsonify({'error': 'Rol invalid'}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username deja existent'}), 409

    u = User(username=username, rol=rol, locatie_id=locatie_id or None)
    u.set_password(password)
    db.session.add(u)
    db.session.commit()
    return jsonify({'id': u.id, 'username': u.username, 'rol': u.rol,
                    'locatie_id': u.locatie_id, 'locatie': None}), 201


@dev_bp.route('/accounts/<int:id>', methods=['PUT'])
@login_required
@dev_required
def account_edit(id):
    u = User.query.get_or_404(id)
    if u.id == current_user.id:
        return jsonify({'error': 'Nu iti poti edita propriul cont din aceasta sectiune'}), 403

    data = request.get_json()
    new_username = data.get('username', '').strip()
    if new_username and new_username != u.username:
        if User.query.filter_by(username=new_username).first():
            return jsonify({'error': 'Username deja existent'}), 409
        u.username = new_username
    if data.get('password'):
        u.set_password(data['password'].strip())
    if 'rol' in data and data['rol'] in ['admin', 'manager', 'dev']:
        u.rol = data['rol']
    if 'locatie_id' in data:
        u.locatie_id = data['locatie_id'] or None

    db.session.commit()
    loc = Locatie.query.get(u.locatie_id) if u.locatie_id else None
    return jsonify({'id': u.id, 'username': u.username, 'rol': u.rol,
                    'locatie_id': u.locatie_id, 'locatie': loc.numeLocatie if loc else None})


@dev_bp.route('/accounts/<int:id>', methods=['DELETE'])
@login_required
@dev_required
def account_delete(id):
    u = User.query.get_or_404(id)
    if u.id == current_user.id:
        return jsonify({'error': 'Nu iti poti sterge propriul cont'}), 403
    db.session.delete(u)
    db.session.commit()
    return jsonify({'ok': True})


@dev_bp.route('/system')
@login_required
@dev_required
def system():
    import os
    from backup import BACKUPS_DIR

    counts = {
        'servicii': Servicii.query.count(),
        'clienti': Clienti.query.count(),
        'spalatori': Spalatori.query.count(),
        'locatii': Locatie.query.count(),
        'users': User.query.count(),
        'preturi': PretServicii.query.count(),
    }

    backup_files = []
    if os.path.isdir(BACKUPS_DIR):
        files = sorted(
            (f for f in os.listdir(BACKUPS_DIR) if f.endswith('.db')),
            reverse=True
        )
        backup_files = files[:5]

    recent = Servicii.query.order_by(Servicii.dataSpalare.desc()).limit(15).all()
    loc_map = {l.id: l.numeLocatie for l in Locatie.query.all()}
    recent_data = [{
        'id': s.id,
        'serviciiPrestate': s.serviciiPrestate,
        'dataSpalare': s.dataSpalare.isoformat(),
        'tipPlata': s.tipPlata,
        'pretServicii': s.pretServicii,
        'locatie': loc_map.get(s.locatie_id),
        'plate': s.clienti.numarAutoturism if s.clienti else None,
    } for s in recent]

    db_uri = os.environ.get('DATABASE_URL', '')
    db_type = 'PostgreSQL' if 'postgresql' in db_uri else 'SQLite'

    return jsonify({
        'counts': counts,
        'backups': backup_files,
        'recentServices': recent_data,
        'env': {
            'dbType': db_type,
            'debug': os.environ.get('FLASK_DEBUG', '0') == '1',
            'version': '2.0.0',
        },
    })


@dev_bp.route('/backup', methods=['POST'])
@login_required
@dev_required
def trigger_backup():
    try:
        from backup import backup_database
        backup_database()
        return jsonify({'ok': True, 'message': 'Backup realizat cu succes'})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500

from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from functools import wraps
from backend.extensions import db
from backend.models import Locatie, Spalatori, PretServicii, User
from backend.services.stats import get_location_report

admin_bp = Blueprint('admin', __name__)


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated or current_user.rol not in ['admin', 'dev']:
            return jsonify({'error': 'Forbidden'}), 403
        return f(*args, **kwargs)
    return decorated


def build_reports():
    locatii = Locatie.query.all()
    reports = {loc.numeLocatie: get_location_report(loc.id) for loc in locatii}
    reports['TOTAL'] = get_location_report(None)
    locatii_data = [{'id': l.id, 'numeLocatie': l.numeLocatie} for l in locatii]
    return locatii_data, reports


@admin_bp.route('/overview')
@login_required
@admin_required
def overview():
    locatii, reports = build_reports()
    return jsonify({'locatii': locatii, 'reports': reports})


@admin_bp.route('/zilnic')
@login_required
@admin_required
def zilnic():
    locatii, reports = build_reports()
    return jsonify({'locatii': locatii, 'reports': reports})


@admin_bp.route('/saptamanal')
@login_required
@admin_required
def saptamanal():
    locatii, reports = build_reports()
    return jsonify({'locatii': locatii, 'reports': reports})


@admin_bp.route('/lunar')
@login_required
@admin_required
def lunar():
    locatii, reports = build_reports()
    return jsonify({'locatii': locatii, 'reports': reports})


@admin_bp.route('/spalatori')
@login_required
@admin_required
def spalatori_report():
    locatii, reports = build_reports()
    return jsonify({'locatii': locatii, 'reports': reports})


# ── Settings ────────────────────────────────────────────────────────────────

@admin_bp.route('/settings')
@login_required
@admin_required
def settings():
    locatii = Locatie.query.all()
    preturi = PretServicii.query.all()
    return jsonify({
        'locatii': [{
            'id': l.id,
            'numeLocatie': l.numeLocatie,
            'spalatori': [{'id': s.id, 'numeSpalator': s.numeSpalator} for s in l.spalatori]
        } for l in locatii],
        'preturi': [{
            'id': p.id, 'serviciiPrestate': p.serviciiPrestate,
            'pretAutoturism': p.pretAutoturism, 'pretSUV': p.pretSUV, 'pretVan': p.pretVan,
            'comisionAutoturism': p.comisionAutoturism, 'comisionSUV': p.comisionSUV, 'comisionVan': p.comisionVan
        } for p in preturi]
    })


@admin_bp.route('/settings/locatie', methods=['POST'])
@login_required
@admin_required
def locatie_add():
    data = request.get_json()
    loc = Locatie(numeLocatie=data.get('numeLocatie', '').strip().upper())
    db.session.add(loc)
    db.session.commit()
    return jsonify({'id': loc.id, 'numeLocatie': loc.numeLocatie}), 201


@admin_bp.route('/settings/locatie/<int:id>', methods=['PUT'])
@login_required
@admin_required
def locatie_edit(id):
    loc = Locatie.query.get_or_404(id)
    loc.numeLocatie = request.get_json().get('numeLocatie', '').strip().upper()
    db.session.commit()
    return jsonify({'id': loc.id, 'numeLocatie': loc.numeLocatie})


@admin_bp.route('/settings/locatie/<int:id>', methods=['DELETE'])
@login_required
@admin_required
def locatie_delete(id):
    db.session.delete(Locatie.query.get_or_404(id))
    db.session.commit()
    return jsonify({'ok': True})


@admin_bp.route('/settings/spalator', methods=['POST'])
@login_required
@admin_required
def spalator_add():
    data = request.get_json()
    sp = Spalatori(numeSpalator=data.get('numeSpalator', '').strip(), locatie_id=data.get('locatie_id'))
    db.session.add(sp)
    db.session.commit()
    return jsonify({'id': sp.id, 'numeSpalator': sp.numeSpalator}), 201


@admin_bp.route('/settings/spalator/<int:id>', methods=['PUT'])
@login_required
@admin_required
def spalator_edit(id):
    sp = Spalatori.query.get_or_404(id)
    data = request.get_json()
    sp.numeSpalator = data.get('numeSpalator', '').strip()
    sp.locatie_id = data.get('locatie_id', sp.locatie_id)
    db.session.commit()
    return jsonify({'id': sp.id, 'numeSpalator': sp.numeSpalator})


@admin_bp.route('/settings/spalator/<int:id>', methods=['DELETE'])
@login_required
@admin_required
def spalator_delete(id):
    db.session.delete(Spalatori.query.get_or_404(id))
    db.session.commit()
    return jsonify({'ok': True})


@admin_bp.route('/settings/preturi', methods=['PUT'])
@login_required
@admin_required
def preturi_edit():
    updates = request.get_json()
    for item in updates:
        p = PretServicii.query.get(item['id'])
        if p:
            p.pretAutoturism = item.get('pretAutoturism', p.pretAutoturism)
            p.pretSUV = item.get('pretSUV', p.pretSUV)
            p.pretVan = item.get('pretVan', p.pretVan)
            p.comisionAutoturism = item.get('comisionAutoturism', p.comisionAutoturism)
            p.comisionSUV = item.get('comisionSUV', p.comisionSUV)
            p.comisionVan = item.get('comisionVan', p.comisionVan)
    db.session.commit()
    return jsonify({'ok': True})


# ── Managers ─────────────────────────────────────────────────────────────────

def _user_dict(u):
    return {'id': u.id, 'username': u.username, 'locatie_id': u.locatie_id}


@admin_bp.route('/settings/managers')
@login_required
@admin_required
def managers_list():
    managers = User.query.filter_by(rol='manager').all()
    return jsonify([_user_dict(u) for u in managers])


@admin_bp.route('/settings/manager', methods=['POST'])
@login_required
@admin_required
def manager_add():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    locatie_id = data.get('locatie_id')
    if not username or not password:
        return jsonify({'error': 'username si parola obligatorii'}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username deja existent'}), 409
    u = User(username=username, rol='manager', locatie_id=locatie_id or None)
    u.set_password(password)
    db.session.add(u)
    db.session.commit()
    return jsonify(_user_dict(u)), 201


@admin_bp.route('/settings/manager/<int:id>', methods=['PUT'])
@login_required
@admin_required
def manager_edit(id):
    u = User.query.get_or_404(id)
    if u.rol != 'manager':
        return jsonify({'error': 'Forbidden'}), 403
    data = request.get_json()
    new_username = data.get('username', '').strip()
    if new_username and new_username != u.username:
        if User.query.filter_by(username=new_username).first():
            return jsonify({'error': 'Username deja existent'}), 409
        u.username = new_username
    if data.get('password'):
        u.set_password(data['password'].strip())
    if 'locatie_id' in data:
        u.locatie_id = data['locatie_id'] or None
    db.session.commit()
    return jsonify(_user_dict(u))


@admin_bp.route('/settings/manager/<int:id>', methods=['DELETE'])
@login_required
@admin_required
def manager_delete(id):
    u = User.query.get_or_404(id)
    if u.rol != 'manager':
        return jsonify({'error': 'Forbidden'}), 403
    db.session.delete(u)
    db.session.commit()
    return jsonify({'ok': True})

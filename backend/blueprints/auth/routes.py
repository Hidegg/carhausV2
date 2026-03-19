from flask import Blueprint, request, jsonify, session
from flask_login import login_user, logout_user, login_required, current_user
from backend.models import User
from backend.extensions import limiter

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    if user and user.check_password(data.get('password', '')):
        login_user(user)
        if user.rol == 'manager' and user.locatie_id:
            session['locatie_id'] = user.locatie_id
        else:
            session['locatie_id'] = None
        return jsonify({
            'username': user.username,
            'rol': user.rol,
            'locatie_id': user.locatie_id
        })
    return jsonify({'error': 'Username sau parola incorecte.'}), 401


@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    session.clear()
    return jsonify({'ok': True})


@auth_bp.route('/me')
@login_required
def me():
    return jsonify({
        'username': current_user.username,
        'rol': current_user.rol,
        'locatie_id': current_user.locatie_id
    })

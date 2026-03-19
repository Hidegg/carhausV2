"""Tests for /api/dev/* endpoints."""
import pytest
from tests.conftest import uid, make_service


# ── overview ──────────────────────────────────────────────────────────────────

def test_overview_returns_allTime_and_perLocatie(as_dev, seed):
    rv = as_dev.get('/api/dev/overview')
    assert rv.status_code == 200
    data = rv.get_json()
    assert 'allTime' in data
    assert 'perLocatie' in data
    assert 'totalServicii' in data['allTime']
    assert 'totalIncasari' in data['allTime']
    assert 'totalClienti' in data['allTime']
    assert 'totalComision' in data['allTime']
    assert isinstance(data['perLocatie'], list)
    # TestLoc should appear
    loc_names = [l['numeLocatie'] for l in data['perLocatie']]
    assert 'TestLoc' in loc_names


# ── clients ──────────────────────────────────────────────────────────────────

def test_clients_list_returns_paginated(as_dev, seed, as_manager):
    make_service(as_manager, seed)
    rv = as_dev.get('/api/dev/clients')
    assert rv.status_code == 200
    data = rv.get_json()
    assert 'clients' in data
    assert 'total' in data
    assert 'page' in data
    assert 'pages' in data
    assert isinstance(data['clients'], list)


def test_clients_search_filters_by_plate(as_dev, seed, as_manager):
    unique = uid()
    plate = 'DEV' + unique
    make_service(as_manager, seed, numarAutoturism=plate)

    rv = as_dev.get(f'/api/dev/clients?q={unique}')
    assert rv.status_code == 200
    data = rv.get_json()
    plates = [c['numarAutoturism'] for c in data['clients']]
    assert plate in plates


# ── accounts ─────────────────────────────────────────────────────────────────

def test_accounts_list_returns_all_users(as_dev, seed):
    rv = as_dev.get('/api/dev/accounts')
    assert rv.status_code == 200
    data = rv.get_json()
    assert 'users' in data
    usernames = [u['username'] for u in data['users']]
    assert 't_admin' in usernames
    assert 't_manager' in usernames
    assert 't_dev' in usernames


def test_accounts_create_adds_new_user(as_dev, seed):
    username = 'new_' + uid()
    rv = as_dev.post('/api/dev/accounts', json={
        'username': username,
        'password': 'pass123',
        'rol': 'manager',
    })
    assert rv.status_code == 201
    data = rv.get_json()
    assert data['username'] == username
    assert data['rol'] == 'manager'


def test_accounts_create_duplicate_username_returns_409(as_dev, seed):
    username = 'dup_' + uid()
    as_dev.post('/api/dev/accounts', json={
        'username': username,
        'password': 'pass1',
        'rol': 'manager',
    })
    rv = as_dev.post('/api/dev/accounts', json={
        'username': username,
        'password': 'pass2',
        'rol': 'manager',
    })
    assert rv.status_code == 409
    assert 'error' in rv.get_json()


def test_accounts_edit_updates_username(as_dev, seed, app):
    username = 'edit_' + uid()
    create_rv = as_dev.post('/api/dev/accounts', json={
        'username': username,
        'password': 'pass',
        'rol': 'manager',
    })
    user_id = create_rv.get_json()['id']

    new_username = 'edited_' + uid()
    rv = as_dev.put(f'/api/dev/accounts/{user_id}', json={'username': new_username})
    assert rv.status_code == 200
    assert rv.get_json()['username'] == new_username


def test_accounts_edit_own_account_returns_403(as_dev, seed, app):
    """Editing own account via this endpoint should return 403."""
    with app.app_context():
        from backend.models import User
        dev_user = User.query.filter_by(username='t_dev').first()
        dev_id = dev_user.id

    rv = as_dev.put(f'/api/dev/accounts/{dev_id}', json={'username': 'new_name_' + uid()})
    assert rv.status_code == 403


def test_accounts_delete_removes_user(as_dev, seed, app):
    username = 'del_' + uid()
    create_rv = as_dev.post('/api/dev/accounts', json={
        'username': username,
        'password': 'pass',
        'rol': 'manager',
    })
    user_id = create_rv.get_json()['id']

    rv = as_dev.delete(f'/api/dev/accounts/{user_id}')
    assert rv.status_code == 200
    assert rv.get_json()['ok'] is True

    with app.app_context():
        from backend.models import User
        assert User.query.get(user_id) is None


def test_accounts_delete_own_account_returns_403(as_dev, seed, app):
    """Deleting own account should return 403."""
    with app.app_context():
        from backend.models import User
        dev_user = User.query.filter_by(username='t_dev').first()
        dev_id = dev_user.id

    rv = as_dev.delete(f'/api/dev/accounts/{dev_id}')
    assert rv.status_code == 403


# ── client history ────────────────────────────────────────────────────────────

def test_client_history_returns_service_data(as_dev, seed, as_manager, app):
    plate = 'DVH' + uid()
    make_service(as_manager, seed,
                 numarAutoturism=plate,
                 tipAutoturism='SUV',
                 marcaAutoturism='AUDI',
                 tipPlata='CASH')

    rv = as_dev.get(f'/api/dev/client/{plate}/history')
    assert rv.status_code == 200
    data = rv.get_json()
    assert data['client']['numarAutoturism'] == plate
    assert data['client']['tipAutoturism'] == 'SUV'
    assert data['client']['marcaAutoturism'] == 'AUDI'
    assert isinstance(data['servicii'], list)
    assert len(data['servicii']) >= 1
    first = data['servicii'][0]
    for key in ('id', 'serviciiPrestate', 'dataSpalare', 'pretServicii', 'tipPlata'):
        assert key in first


def test_client_history_unknown_plate_returns_404(as_dev):
    rv = as_dev.get('/api/dev/client/XYZUNKNOWN99999/history')
    assert rv.status_code == 404


def test_client_history_case_insensitive(as_dev, seed, as_manager):
    plate = 'DVL' + uid()
    make_service(as_manager, seed, numarAutoturism=plate)

    rv = as_dev.get(f'/api/dev/client/{plate.lower()}/history')
    assert rv.status_code == 200
    assert rv.get_json()['client']['numarAutoturism'] == plate.upper()


# ── system ────────────────────────────────────────────────────────────────────

def test_system_returns_counts_and_env(as_dev, seed, as_manager):
    make_service(as_manager, seed)  # ensure at least one service exists
    rv = as_dev.get('/api/dev/system')
    assert rv.status_code == 200
    data = rv.get_json()
    assert 'counts' in data
    for key in ('servicii', 'clienti', 'spalatori', 'locatii', 'users', 'preturi'):
        assert key in data['counts']
        assert data['counts'][key] >= 0
    assert 'env' in data
    assert 'dbType' in data['env']
    assert 'version' in data['env']
    assert 'backups' in data
    assert isinstance(data['backups'], list)
    assert 'recentServices' in data


# ── backup ────────────────────────────────────────────────────────────────────

def test_backup_trigger_returns_ok(as_dev):
    """In tests the DB is in-memory so backup_database() finds no file and returns
    without error — the endpoint should still respond with ok=True."""
    rv = as_dev.post('/api/dev/backup')
    assert rv.status_code == 200
    assert rv.get_json()['ok'] is True


# ── overview extra fields ─────────────────────────────────────────────────────

def test_overview_users_counts_present(as_dev, seed):
    rv = as_dev.get('/api/dev/overview')
    assert rv.status_code == 200
    data = rv.get_json()
    assert 'users' in data
    users = data['users']
    for role in ('admins', 'managers', 'devs'):
        assert role in users
        assert users[role] >= 0


def test_overview_per_locatie_has_expected_fields(as_dev, seed):
    rv = as_dev.get('/api/dev/overview')
    data = rv.get_json()
    loc = next(l for l in data['perLocatie'] if l['numeLocatie'] == 'TestLoc')
    for key in ('totalServicii', 'totalIncasari', 'totalClienti', 'totalSpalatori', 'totalManageri'):
        assert key in loc


# ── access control ───────────────────────────────────────────────────────────

def test_non_dev_cannot_access_dev_routes(as_manager, as_admin):
    rv = as_manager.get('/api/dev/overview')
    assert rv.status_code == 403

    rv = as_manager.get('/api/dev/clients')
    assert rv.status_code == 403

    rv = as_manager.get('/api/dev/accounts')
    assert rv.status_code == 403

    rv = as_admin.get('/api/dev/overview')
    assert rv.status_code == 403


def test_non_dev_cannot_access_system_or_backup(as_manager, as_admin):
    rv = as_manager.get('/api/dev/system')
    assert rv.status_code == 403

    rv = as_manager.post('/api/dev/backup')
    assert rv.status_code == 403

    rv = as_admin.get('/api/dev/system')
    assert rv.status_code == 403

    rv = as_admin.post('/api/dev/backup')
    assert rv.status_code == 403


def test_anon_cannot_access_dev_routes(anon):
    for path in ['/api/dev/overview', '/api/dev/clients',
                 '/api/dev/accounts', '/api/dev/system']:
        rv = anon.get(path)
        assert rv.status_code == 401, f'Expected 401 for {path}, got {rv.status_code}'

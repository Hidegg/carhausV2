"""Tests for /api/admin/* endpoints."""
import pytest
from tests.conftest import uid, make_service, _inject_login


# ── helpers ───────────────────────────────────────────────────────────────────

def _create_isolated_location(app):
    """Create an isolated location with its own manager and spalator in DB.

    Returns (loc_id, mgr_id, mgr_username, sp_id, sp_name).
    """
    from backend.models import Locatie, User, Spalatori
    from backend.extensions import db
    with app.app_context():
        loc = Locatie(numeLocatie='Iso' + uid())
        db.session.add(loc)
        db.session.flush()
        mgr = User(username='mgr_' + uid(), rol='manager', locatie_id=loc.id)
        mgr.set_password('pass')
        db.session.add(mgr)
        db.session.flush()
        sp = Spalatori(numeSpalator='TestSp' + uid(), locatie_id=loc.id)
        db.session.add(sp)
        db.session.commit()
        return loc.id, mgr.id, mgr.username, sp.id, sp.numeSpalator


def _manager_client(app, mgr_id, loc_id):
    """Return a logged-in test client for the given manager."""
    client = app.test_client()
    _inject_login(app, client, mgr_id, locatie_id=loc_id)
    return client


# ── clienti ──────────────────────────────────────────────────────────────────

def test_clienti_list_returns_paginated(as_admin, seed, as_manager):
    make_service(as_manager, seed)
    rv = as_admin.get('/api/admin/clienti')
    assert rv.status_code == 200
    data = rv.get_json()
    assert 'clienti' in data
    assert 'total' in data
    assert isinstance(data['clienti'], list)


def test_clienti_sorted_by_vizite_desc(as_admin, app):
    loc_id, mgr_id, mgr_user, sp_id, sp_name = _create_isolated_location(app)
    seed_like = {'spalator_name': sp_name}

    mc = app.test_client()
    _inject_login(app, mc, mgr_id, locatie_id=loc_id)

    plate_multi = 'MLT' + uid()
    plate_single = 'SGL' + uid()

    make_service(mc, seed_like, numarAutoturism=plate_multi)
    make_service(mc, seed_like, numarAutoturism=plate_multi)
    make_service(mc, seed_like, numarAutoturism=plate_single)

    rv = as_admin.get(f'/api/admin/clienti?locatie_id={loc_id}&sort=vizite&dir=desc')
    assert rv.status_code == 200
    clienti = rv.get_json()['clienti']
    plates = [c['numar'] for c in clienti]
    assert plate_multi in plates
    assert plate_single in plates
    assert plates.index(plate_multi) < plates.index(plate_single)


def test_clienti_sorted_by_total(as_admin, app):
    loc_id, mgr_id, mgr_user, sp_id, sp_name = _create_isolated_location(app)
    seed_like = {'spalator_name': sp_name}

    mc = app.test_client()
    _inject_login(app, mc, mgr_id, locatie_id=loc_id)

    plate_cheap = 'CHP' + uid()
    plate_exp = 'EXP' + uid()

    # Interior = pretAutoturism=20 (from original seed)
    make_service(mc, seed_like, numarAutoturism=plate_cheap,
                 serviciiPrestate=['Interior'], tipAutoturism='AUTOTURISM')
    # Spalare Simpla SUV = pretSUV=50
    make_service(mc, seed_like, numarAutoturism=plate_exp,
                 serviciiPrestate=['Spalare Simpla'], tipAutoturism='SUV')

    rv = as_admin.get(f'/api/admin/clienti?locatie_id={loc_id}&sort=total&dir=desc')
    assert rv.status_code == 200
    clienti = rv.get_json()['clienti']
    plates = [c['numar'] for c in clienti]
    assert plates.index(plate_exp) < plates.index(plate_cheap)


def test_clienti_filter_by_single_brand(as_admin, app):
    loc_id, mgr_id, mgr_user, sp_id, sp_name = _create_isolated_location(app)
    seed_like = {'spalator_name': sp_name}

    mc = app.test_client()
    _inject_login(app, mc, mgr_id, locatie_id=loc_id)

    plate_bmw = 'BMW' + uid()
    plate_vw = 'VW_' + uid()

    make_service(mc, seed_like, numarAutoturism=plate_bmw, marcaAutoturism='BMW')
    make_service(mc, seed_like, numarAutoturism=plate_vw, marcaAutoturism='VW')

    rv = as_admin.get(f'/api/admin/clienti?locatie_id={loc_id}&brand=BMW')
    assert rv.status_code == 200
    clienti = rv.get_json()['clienti']
    plates = [c['numar'] for c in clienti]
    assert plate_bmw in plates
    assert plate_vw not in plates


def test_clienti_filter_by_multiple_brands(as_admin, app):
    loc_id, mgr_id, mgr_user, sp_id, sp_name = _create_isolated_location(app)
    seed_like = {'spalator_name': sp_name}

    mc = app.test_client()
    _inject_login(app, mc, mgr_id, locatie_id=loc_id)

    plate_bmw = 'BMX' + uid()
    plate_audi = 'AUD' + uid()
    plate_vw = 'VWX' + uid()

    make_service(mc, seed_like, numarAutoturism=plate_bmw, marcaAutoturism='BMW')
    make_service(mc, seed_like, numarAutoturism=plate_audi, marcaAutoturism='AUDI')
    make_service(mc, seed_like, numarAutoturism=plate_vw, marcaAutoturism='VW')

    rv = as_admin.get(f'/api/admin/clienti?locatie_id={loc_id}&brand=BMW,AUDI')
    assert rv.status_code == 200
    clienti = rv.get_json()['clienti']
    plates = [c['numar'] for c in clienti]
    assert plate_bmw in plates
    assert plate_audi in plates
    assert plate_vw not in plates


def test_clienti_search_by_plate_fragment(as_admin, app):
    loc_id, mgr_id, mgr_user, sp_id, sp_name = _create_isolated_location(app)
    seed_like = {'spalator_name': sp_name}

    unique_fragment = uid().upper()
    plate = 'S' + unique_fragment
    other_plate = 'O' + uid()

    mc = app.test_client()
    _inject_login(app, mc, mgr_id, locatie_id=loc_id)
    make_service(mc, seed_like, numarAutoturism=plate)
    make_service(mc, seed_like, numarAutoturism=other_plate)

    rv = as_admin.get(f'/api/admin/clienti?q={unique_fragment}')
    assert rv.status_code == 200
    clienti = rv.get_json()['clienti']
    plates = [c['numar'] for c in clienti]
    assert plate in plates
    assert other_plate not in plates


def test_clienti_history_returns_service_history(as_admin, app):
    loc_id, mgr_id, mgr_user, sp_id, sp_name = _create_isolated_location(app)
    seed_like = {'spalator_name': sp_name}
    plate = 'HST' + uid()

    mc = app.test_client()
    _inject_login(app, mc, mgr_id, locatie_id=loc_id)
    make_service(mc, seed_like, numarAutoturism=plate)

    rv = as_admin.get(f'/api/admin/clienti/{plate}/history')
    assert rv.status_code == 200
    data = rv.get_json()
    assert data['client']['numar'] == plate
    assert len(data['history']) >= 1
    assert data['history'][0]['serviciu'] == 'Spalare Simpla'


# ── overview ──────────────────────────────────────────────────────────────────

def test_overview_returns_reports_for_all_locations(as_admin, seed):
    rv = as_admin.get('/api/admin/overview')
    assert rv.status_code == 200
    data = rv.get_json()
    assert 'locatii' in data
    assert 'reports' in data
    assert 'TOTAL' in data['reports']


# ── settings / locatii ───────────────────────────────────────────────────────

def test_settings_get_returns_locatii(as_admin, seed):
    rv = as_admin.get('/api/admin/settings')
    assert rv.status_code == 200
    data = rv.get_json()
    assert 'locatii' in data
    # TestLoc is stored as 'TestLoc' (not uppercased at seed time — seed
    # sets it directly without going through the route).
    names = [l['numeLocatie'] for l in data['locatii']]
    assert 'TestLoc' in names


def test_settings_post_locatie_creates_location(as_admin):
    name = 'Loc' + uid()
    rv = as_admin.post('/api/admin/settings/locatie', json={'numeLocatie': name})
    assert rv.status_code == 201
    data = rv.get_json()
    # The route uppercases the name
    assert data['numeLocatie'] == name.upper()
    assert 'id' in data


def test_settings_put_locatie_updates_name(as_admin):
    create_rv = as_admin.post('/api/admin/settings/locatie', json={'numeLocatie': 'OldName' + uid()})
    loc_id = create_rv.get_json()['id']

    new_name = 'NewName' + uid()
    rv = as_admin.put(f'/api/admin/settings/locatie/{loc_id}', json={'numeLocatie': new_name})
    assert rv.status_code == 200
    assert rv.get_json()['numeLocatie'] == new_name.upper()


def test_settings_delete_locatie_removes_location(as_admin, app):
    create_rv = as_admin.post('/api/admin/settings/locatie', json={'numeLocatie': 'ToDelete' + uid()})
    loc_id = create_rv.get_json()['id']

    rv = as_admin.delete(f'/api/admin/settings/locatie/{loc_id}')
    assert rv.status_code == 200
    assert rv.get_json()['ok'] is True

    with app.app_context():
        from backend.models import Locatie
        assert Locatie.query.get(loc_id) is None


# ── settings / spalatori ─────────────────────────────────────────────────────

def test_settings_post_spalator_creates(as_admin, seed):
    name = 'Sp' + uid()
    rv = as_admin.post('/api/admin/settings/spalator',
                       json={'numeSpalator': name, 'locatie_id': seed['loc_id']})
    assert rv.status_code == 201
    assert rv.get_json()['numeSpalator'] == name


def test_settings_put_spalator_updates(as_admin, seed):
    create_rv = as_admin.post('/api/admin/settings/spalator',
                               json={'numeSpalator': 'OldSp' + uid(), 'locatie_id': seed['loc_id']})
    sp_id = create_rv.get_json()['id']

    new_name = 'NewSp' + uid()
    rv = as_admin.put(f'/api/admin/settings/spalator/{sp_id}',
                      json={'numeSpalator': new_name, 'locatie_id': seed['loc_id']})
    assert rv.status_code == 200
    assert rv.get_json()['numeSpalator'] == new_name


def test_settings_delete_spalator_removes(as_admin, seed, app):
    create_rv = as_admin.post('/api/admin/settings/spalator',
                               json={'numeSpalator': 'DelSp' + uid(), 'locatie_id': seed['loc_id']})
    sp_id = create_rv.get_json()['id']

    rv = as_admin.delete(f'/api/admin/settings/spalator/{sp_id}')
    assert rv.status_code == 200

    with app.app_context():
        from backend.models import Spalatori
        assert Spalatori.query.get(sp_id) is None


# ── settings / managers ──────────────────────────────────────────────────────

def test_settings_get_managers_returns_list(as_admin, seed):
    rv = as_admin.get('/api/admin/settings/managers')
    assert rv.status_code == 200
    data = rv.get_json()
    assert isinstance(data, list)
    usernames = [u['username'] for u in data]
    assert 't_manager' in usernames


def test_settings_post_manager_creates_account(as_admin, seed):
    username = 'mgr_' + uid()
    rv = as_admin.post('/api/admin/settings/manager',
                       json={'username': username, 'password': 'pass123', 'locatie_id': seed['loc_id']})
    assert rv.status_code == 201
    data = rv.get_json()
    assert data['username'] == username


def test_settings_put_manager_edits(as_admin, seed):
    username = 'eMgr' + uid()
    create_rv = as_admin.post('/api/admin/settings/manager',
                               json={'username': username, 'password': 'pass', 'locatie_id': seed['loc_id']})
    mgr_id = create_rv.get_json()['id']

    new_username = 'eMgr2' + uid()
    rv = as_admin.put(f'/api/admin/settings/manager/{mgr_id}',
                      json={'username': new_username})
    assert rv.status_code == 200
    assert rv.get_json()['username'] == new_username


def test_settings_delete_manager_removes(as_admin, seed, app):
    username = 'dMgr' + uid()
    create_rv = as_admin.post('/api/admin/settings/manager',
                               json={'username': username, 'password': 'pass', 'locatie_id': seed['loc_id']})
    mgr_id = create_rv.get_json()['id']

    rv = as_admin.delete(f'/api/admin/settings/manager/{mgr_id}')
    assert rv.status_code == 200

    with app.app_context():
        from backend.models import User
        assert User.query.get(mgr_id) is None


# ── settings / preturi ───────────────────────────────────────────────────────

def test_settings_get_preturi_in_form_data(as_admin):
    rv = as_admin.get('/api/admin/settings')
    assert rv.status_code == 200
    data = rv.get_json()
    assert 'preturi' in data
    names = [p['serviciiPrestate'] for p in data['preturi']]
    assert 'Spalare Simpla' in names
    assert 'Interior' in names


def test_settings_post_pret_creates_service_type(as_admin):
    name = 'TestSvc' + uid()
    rv = as_admin.post('/api/admin/settings/pret',
                       json={'serviciiPrestate': name,
                             'pretAutoturism': 15.0, 'pretSUV': 25.0, 'pretVan': 20.0,
                             'comisionAutoturism': 2.0, 'comisionSUV': 4.0, 'comisionVan': 3.0})
    assert rv.status_code == 201
    data = rv.get_json()
    assert data['serviciiPrestate'] == name


def test_settings_put_preturi_bulk_updates(as_admin, seed):
    rv = as_admin.put('/api/admin/settings/preturi', json=[
        {
            'id': seed['pret2_id'],  # Interior
            'pretAutoturism': 22.0,
            'pretSUV': 33.0,
            'pretVan': 27.0,
            'comisionAutoturism': 3.5,
            'comisionSUV': 5.5,
            'comisionVan': 4.5,
        }
    ])
    assert rv.status_code == 200
    assert rv.get_json()['ok'] is True

    # Verify via settings GET
    rv2 = as_admin.get('/api/admin/settings')
    preturi = rv2.get_json()['preturi']
    p = next(p for p in preturi if p['id'] == seed['pret2_id'])
    assert p['pretAutoturism'] == 22.0

    # Restore original prices so other tests are not affected
    as_admin.put('/api/admin/settings/preturi', json=[
        {
            'id': seed['pret2_id'],
            'pretAutoturism': 20.0,
            'pretSUV': 30.0,
            'pretVan': 25.0,
            'comisionAutoturism': 3.0,
            'comisionSUV': 5.0,
            'comisionVan': 4.0,
        }
    ])


def test_settings_delete_pret_removes_service_type(as_admin, app):
    name = 'DelSvc' + uid()
    create_rv = as_admin.post('/api/admin/settings/pret',
                               json={'serviciiPrestate': name})
    pret_id = create_rv.get_json()['id']

    rv = as_admin.delete(f'/api/admin/settings/pret/{pret_id}')
    assert rv.status_code == 200

    with app.app_context():
        from backend.models import PretServicii
        assert PretServicii.query.get(pret_id) is None


# ── report routes (zilnic / saptamanal / lunar / spalatori) ──────────────────

def test_zilnic_returns_reports_structure(as_admin, seed):
    rv = as_admin.get('/api/admin/zilnic')
    assert rv.status_code == 200
    data = rv.get_json()
    assert 'locatii' in data
    assert 'reports' in data
    assert 'TOTAL' in data['reports']


def test_saptamanal_returns_reports_structure(as_admin, seed):
    rv = as_admin.get('/api/admin/saptamanal')
    assert rv.status_code == 200
    data = rv.get_json()
    assert 'locatii' in data
    assert 'reports' in data
    assert 'TOTAL' in data['reports']


def test_lunar_returns_reports_structure(as_admin, seed):
    rv = as_admin.get('/api/admin/lunar')
    assert rv.status_code == 200
    data = rv.get_json()
    assert 'locatii' in data
    assert 'reports' in data
    assert 'TOTAL' in data['reports']


def test_spalatori_report_returns_reports_structure(as_admin, seed):
    rv = as_admin.get('/api/admin/spalatori')
    assert rv.status_code == 200
    data = rv.get_json()
    assert 'locatii' in data
    assert 'reports' in data
    assert 'TOTAL' in data['reports']


# ── istoric ───────────────────────────────────────────────────────────────────

def test_istoric_annual_view_returns_12_bars(as_admin, seed):
    rv = as_admin.get('/api/admin/istoric')
    assert rv.status_code == 200
    data = rv.get_json()
    assert data['view'] == 'annual'
    assert 'bars' in data
    assert len(data['bars']) == 12
    assert 'kpi' in data
    for key in ('incasari', 'spalari', 'masini', 'lunaDeVarf'):
        assert key in data['kpi']
    assert 'availableYears' in data
    assert 'serviciiBreakdown' in data


def test_istoric_monthly_view_returns_week_bars(as_admin, app, seed, as_manager):
    """Drill into the current month; should return a 'monthly' view with week bars."""
    from datetime import datetime
    from zoneinfo import ZoneInfo
    now = datetime.now(ZoneInfo('Europe/Bucharest'))
    make_service(as_manager, seed)  # ensure at least one service exists in this month

    rv = as_admin.get(f'/api/admin/istoric?year={now.year}&month={now.month}')
    assert rv.status_code == 200
    data = rv.get_json()
    assert data['view'] == 'monthly'
    assert 'bars' in data
    assert len(data['bars']) >= 1
    assert 'kpi' in data
    for key in ('incasari', 'spalari', 'masini'):
        assert key in data['kpi']
    assert 'serviciiBreakdown' in data
    assert 'monthLabel' in data


def test_istoric_locatie_filter_accepted(as_admin, seed):
    """Passing locatie_id param should not crash the endpoint."""
    rv = as_admin.get(f'/api/admin/istoric?locatie_id={seed["loc_id"]}')
    assert rv.status_code == 200
    assert rv.get_json()['view'] == 'annual'


# ── clienti extra sort/direction ─────────────────────────────────────────────

def test_clienti_sorted_by_data(as_admin, app):
    """Sort by last-visit date should return 200 without error."""
    loc_id, mgr_id, _, sp_id, sp_name = _create_isolated_location(app)
    seed_like = {'spalator_name': sp_name}

    mc = app.test_client()
    _inject_login(app, mc, mgr_id, locatie_id=loc_id)
    make_service(mc, seed_like)
    make_service(mc, seed_like)

    rv = as_admin.get(f'/api/admin/clienti?locatie_id={loc_id}&sort=data&dir=desc')
    assert rv.status_code == 200
    data = rv.get_json()
    assert 'clienti' in data


def test_clienti_sorted_asc(as_admin, app):
    """Ascending sort on vizite should return the least-visited client first."""
    loc_id, mgr_id, _, sp_id, sp_name = _create_isolated_location(app)
    seed_like = {'spalator_name': sp_name}

    mc = app.test_client()
    _inject_login(app, mc, mgr_id, locatie_id=loc_id)

    plate_one = 'ONE' + uid()
    plate_two = 'TWO' + uid()
    make_service(mc, seed_like, numarAutoturism=plate_two)
    make_service(mc, seed_like, numarAutoturism=plate_two)
    make_service(mc, seed_like, numarAutoturism=plate_one)

    rv = as_admin.get(f'/api/admin/clienti?locatie_id={loc_id}&sort=vizite&dir=asc')
    assert rv.status_code == 200
    clienti = rv.get_json()['clienti']
    plates = [c['numar'] for c in clienti]
    assert plates.index(plate_one) < plates.index(plate_two)


# ── settings / manager duplicate/validation ──────────────────────────────────

def test_settings_post_manager_duplicate_username_returns_409(as_admin, seed):
    username = 'dupMgr_' + uid()
    as_admin.post('/api/admin/settings/manager',
                  json={'username': username, 'password': 'pass', 'locatie_id': seed['loc_id']})
    rv = as_admin.post('/api/admin/settings/manager',
                       json={'username': username, 'password': 'pass2', 'locatie_id': seed['loc_id']})
    assert rv.status_code == 409
    assert 'error' in rv.get_json()


def test_settings_put_manager_duplicate_username_returns_409(as_admin, seed):
    name_a = 'dupA_' + uid()
    name_b = 'dupB_' + uid()
    as_admin.post('/api/admin/settings/manager',
                  json={'username': name_a, 'password': 'pass', 'locatie_id': seed['loc_id']})
    rv_b = as_admin.post('/api/admin/settings/manager',
                         json={'username': name_b, 'password': 'pass', 'locatie_id': seed['loc_id']})
    mgr_b_id = rv_b.get_json()['id']

    rv = as_admin.put(f'/api/admin/settings/manager/{mgr_b_id}', json={'username': name_a})
    assert rv.status_code == 409
    assert 'error' in rv.get_json()


def test_settings_post_pret_duplicate_name_returns_409(as_admin):
    name = 'DupSvc_' + uid()
    as_admin.post('/api/admin/settings/pret',
                  json={'serviciiPrestate': name,
                        'pretAutoturism': 10.0, 'pretSUV': 15.0, 'pretVan': 12.0,
                        'comisionAutoturism': 1.0, 'comisionSUV': 2.0, 'comisionVan': 1.5})
    rv = as_admin.post('/api/admin/settings/pret',
                       json={'serviciiPrestate': name})
    assert rv.status_code == 409
    assert 'error' in rv.get_json()


def test_settings_post_manager_missing_fields_returns_400(as_admin, seed):
    rv = as_admin.post('/api/admin/settings/manager',
                       json={'username': '', 'password': '', 'locatie_id': seed['loc_id']})
    assert rv.status_code == 400
    assert 'error' in rv.get_json()


# ── access control ───────────────────────────────────────────────────────────

def test_non_admin_cannot_access_admin_routes(as_manager):
    rv = as_manager.get('/api/admin/overview')
    assert rv.status_code == 403

    rv = as_manager.get('/api/admin/clienti')
    assert rv.status_code == 403

    rv = as_manager.get('/api/admin/settings')
    assert rv.status_code == 403


def test_non_admin_cannot_access_report_routes(as_manager):
    for path in ['/api/admin/zilnic', '/api/admin/saptamanal',
                 '/api/admin/lunar', '/api/admin/spalatori',
                 '/api/admin/curs-pending', '/api/admin/istoric']:
        rv = as_manager.get(path)
        assert rv.status_code == 403, f'Expected 403 for {path}, got {rv.status_code}'


def test_anon_cannot_access_admin_routes(anon):
    for path in ['/api/admin/overview', '/api/admin/zilnic',
                 '/api/admin/curs-pending', '/api/admin/clienti',
                 '/api/admin/settings']:
        rv = anon.get(path)
        assert rv.status_code == 401, f'Expected 401 for {path}, got {rv.status_code}'


# ── curs-pending ──────────────────────────────────────────────────────────────

def test_curs_pending_returns_list(as_admin, seed, as_manager):
    plate = 'CUR' + uid()
    make_service(as_manager, seed, numarAutoturism=plate, tipPlata='CURS')

    rv = as_admin.get('/api/admin/curs-pending')
    assert rv.status_code == 200
    data = rv.get_json()
    assert isinstance(data, list)
    assert len(data) >= 1
    entry = next((x for x in data if x['numar'] == plate), None)
    assert entry is not None
    for key in ('numar', 'marca', 'tip', 'curs_count', 'curs_total', 'ultima_data'):
        assert key in entry


def test_curs_pending_aggregates_multiple_visits(as_admin, seed, as_manager):
    plate = 'CUA' + uid()
    make_service(as_manager, seed, numarAutoturism=plate, tipPlata='CURS')
    make_service(as_manager, seed, numarAutoturism=plate, tipPlata='CURS')

    rv = as_admin.get('/api/admin/curs-pending')
    assert rv.status_code == 200
    entry = next((x for x in rv.get_json() if x['numar'] == plate), None)
    assert entry is not None
    assert entry['curs_count'] == 2


def test_curs_pending_locatie_filter(as_admin, seed, app, as_manager):
    loc_id, mgr_id, _, sp_id, sp_name = _create_isolated_location(app)
    mc = app.test_client()
    _inject_login(app, mc, mgr_id, locatie_id=loc_id)
    seed_like = {'spalator_name': sp_name}

    plate_in = 'CUI' + uid()
    plate_out = 'CUO' + uid()
    make_service(mc, seed_like, numarAutoturism=plate_in, tipPlata='CURS')
    # plate_out is in the main seed location, not the isolated one
    make_service(as_manager, seed, numarAutoturism=plate_out, tipPlata='CURS')

    rv = as_admin.get(f'/api/admin/curs-pending?locatie_id={loc_id}')
    assert rv.status_code == 200
    numbers = [x['numar'] for x in rv.get_json()]
    assert plate_in in numbers
    assert plate_out not in numbers


def test_curs_pending_excludes_non_curs_payments(as_admin, seed, as_manager):
    plate = 'CUX' + uid()
    make_service(as_manager, seed, numarAutoturism=plate, tipPlata='CASH')

    rv = as_admin.get('/api/admin/curs-pending')
    numbers = [x['numar'] for x in rv.get_json()]
    assert plate not in numbers


# ── settings / pret PUT ───────────────────────────────────────────────────────

def test_settings_put_pret_updates_prices(as_admin):
    name = 'PutPret' + uid()
    create_rv = as_admin.post('/api/admin/settings/pret', json={'serviciiPrestate': name})
    pret_id = create_rv.get_json()['id']

    rv = as_admin.put(f'/api/admin/settings/pret/{pret_id}', json={
        'pretAutoturism': 55.0,
        'pretSUV': 75.0,
        'pretVan': 65.0,
    })
    assert rv.status_code == 200
    data = rv.get_json()
    assert data['pretAutoturism'] == 55.0
    assert data['pretSUV'] == 75.0
    assert data['pretVan'] == 65.0


def test_settings_put_pret_toggles_activ(as_admin):
    name = 'ActPret' + uid()
    create_rv = as_admin.post('/api/admin/settings/pret', json={'serviciiPrestate': name})
    pret_id = create_rv.get_json()['id']

    # Disable
    rv = as_admin.put(f'/api/admin/settings/pret/{pret_id}', json={'activ': False})
    assert rv.status_code == 200
    assert rv.get_json()['activ'] is False

    # Re-enable
    rv2 = as_admin.put(f'/api/admin/settings/pret/{pret_id}', json={'activ': True})
    assert rv2.status_code == 200
    assert rv2.get_json()['activ'] is True

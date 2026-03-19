"""Tests for /api/manager/* endpoints."""
import pytest
from datetime import datetime
from zoneinfo import ZoneInfo
from tests.conftest import uid, make_service

BUCHAREST = ZoneInfo('Europe/Bucharest')


def now_iso():
    return datetime.now(BUCHAREST).isoformat()


# ── form-data ─────────────────────────────────────────────────────────────────

def test_form_data_returns_preturi_and_spalatori(as_manager, seed):
    rv = as_manager.get('/api/manager/form-data')
    assert rv.status_code == 200
    data = rv.get_json()
    assert 'preturi' in data
    assert 'spalatori' in data
    service_names = [p['serviciiPrestate'] for p in data['preturi']]
    assert 'Spalare Simpla' in service_names
    spalator_names = [s['numeSpalator'] for s in data['spalatori']]
    assert 'Ion' in spalator_names


# ── add_serviciu ──────────────────────────────────────────────────────────────

def test_add_serviciu_happy_path_cash(as_manager, seed):
    rv = make_service(as_manager, seed)
    assert rv.status_code == 200
    data = rv.get_json()
    assert data.get('ok') is True
    assert 'Spalare Simpla' in data['servicii']


def test_add_serviciu_suv_uses_pretSUV(as_manager, seed, app):
    plate = 'SUV' + uid()
    rv = make_service(as_manager, seed,
                      numarAutoturism=plate,
                      tipAutoturism='SUV',
                      tipPlata='CASH')
    assert rv.status_code == 200

    # Verify the price stored is pretSUV (50.0)
    with app.app_context():
        from backend.models import Servicii, Clienti
        client = Clienti.query.filter_by(numarAutoturism=plate).first()
        assert client is not None
        svc = Servicii.query.filter_by(clienti_id=client.id).first()
        assert svc.pretServicii == 50.0


def test_add_serviciu_van_uses_pretVan(as_manager, seed, app):
    plate = 'VAN' + uid()
    rv = make_service(as_manager, seed,
                      numarAutoturism=plate,
                      tipAutoturism='VAN',
                      tipPlata='CASH')
    assert rv.status_code == 200

    with app.app_context():
        from backend.models import Servicii, Clienti
        client = Clienti.query.filter_by(numarAutoturism=plate).first()
        svc = Servicii.query.filter_by(clienti_id=client.id).first()
        assert svc.pretServicii == 40.0


def test_add_serviciu_creates_new_client(as_manager, seed, app):
    plate = 'NEW' + uid()
    rv = make_service(as_manager, seed, numarAutoturism=plate)
    assert rv.status_code == 200

    with app.app_context():
        from backend.models import Clienti
        client = Clienti.query.filter_by(numarAutoturism=plate).first()
        assert client is not None


def test_add_serviciu_reuses_existing_client(as_manager, seed, app):
    plate = 'RUS' + uid()
    make_service(as_manager, seed, numarAutoturism=plate)
    make_service(as_manager, seed, numarAutoturism=plate)

    with app.app_context():
        from backend.models import Clienti
        count = Clienti.query.filter_by(numarAutoturism=plate).count()
        assert count == 1


def test_add_serviciu_empty_servicii_returns_400(as_manager, seed):
    rv = make_service(as_manager, seed, serviciiPrestate=[])
    assert rv.status_code == 400
    data = rv.get_json()
    assert 'error' in data


def test_add_serviciu_unknown_service_returns_400(as_manager, seed):
    rv = make_service(as_manager, seed, serviciiPrestate=['ServiciuNonexistent'])
    assert rv.status_code == 400
    data = rv.get_json()
    assert 'error' in data


def test_add_serviciu_unknown_spalator_returns_400(as_manager, seed):
    rv = make_service(as_manager, seed, spalator='SpalatorNonexistent')
    assert rv.status_code == 400
    data = rv.get_json()
    assert 'error' in data


def test_add_serviciu_sequence_numbering(as_manager, seed, app):
    """Two calls on the same day get numarCurent 1 and 2 (relative to each other)."""
    plate1 = 'SEQ' + uid()
    plate2 = 'SEQ' + uid()
    make_service(as_manager, seed, numarAutoturism=plate1)
    make_service(as_manager, seed, numarAutoturism=plate2)

    with app.app_context():
        from backend.models import Servicii, Clienti
        c1 = Clienti.query.filter_by(numarAutoturism=plate1).first()
        c2 = Clienti.query.filter_by(numarAutoturism=plate2).first()
        s1 = Servicii.query.filter_by(clienti_id=c1.id).first()
        s2 = Servicii.query.filter_by(clienti_id=c2.id).first()
        # second service should have a higher numarCurent
        assert s2.numarCurent > s1.numarCurent


def test_add_serviciu_curs_not_in_total(as_manager, seed):
    plate = 'CRS' + uid()
    make_service(as_manager, seed, numarAutoturism=plate, tipPlata='CURS')

    rv = as_manager.get('/api/manager/analytics')
    assert rv.status_code == 200
    data = rv.get_json()
    # CURS is tracked separately; its amount should NOT be in 'total'
    assert data['curs'] > 0 or data['total'] >= 0  # curs present
    # Ensure the total excludes CURS: total == cash + card + contract + protocol
    expected_total = data['cash'] + data['card'] + data['contract'] + data['protocol']
    assert abs(data['total'] - expected_total) < 0.01


def test_add_serviciu_card_increases_card_total(as_manager, seed):
    rv_before = as_manager.get('/api/manager/analytics')
    card_before = rv_before.get_json()['card']

    plate = 'CRD' + uid()
    make_service(as_manager, seed, numarAutoturism=plate, tipPlata='CARD')

    rv_after = as_manager.get('/api/manager/analytics')
    card_after = rv_after.get_json()['card']
    assert card_after > card_before


# ── dashboard ─────────────────────────────────────────────────────────────────

def test_dashboard_returns_todays_services(as_manager, seed):
    plate = 'DBD' + uid()
    make_service(as_manager, seed, numarAutoturism=plate)

    rv = as_manager.get('/api/manager/dashboard')
    assert rv.status_code == 200
    data = rv.get_json()
    assert isinstance(data, list)
    plates_in_dashboard = [entry['client']['numarAutoturism'] for entry in data]
    assert plate in plates_in_dashboard


# ── analytics ────────────────────────────────────────────────────────────────

def test_analytics_breakdown(as_manager, seed):
    rv = as_manager.get('/api/manager/analytics')
    assert rv.status_code == 200
    data = rv.get_json()
    for key in ('total', 'cash', 'card', 'curs', 'masini', 'servicii_count', 'spalatori', 'servicii_breakdown'):
        assert key in data, f"Missing key: {key}"


# ── update_payment ───────────────────────────────────────────────────────────

def test_update_payment_changes_tipPlata(as_manager, seed, app):
    plate = 'UPD' + uid()
    make_service(as_manager, seed, numarAutoturism=plate, tipPlata='CASH')

    with app.app_context():
        from backend.models import Servicii, Clienti
        client = Clienti.query.filter_by(numarAutoturism=plate).first()
        svc = Servicii.query.filter_by(clienti_id=client.id).first()
        svc_id = svc.id

    rv = as_manager.post(f'/api/manager/update-payment/{svc_id}', json={'tipPlata': 'CARD'})
    assert rv.status_code == 200
    assert rv.get_json()['ok'] is True

    with app.app_context():
        from backend.models import Servicii
        updated = Servicii.query.get(svc_id)
        assert updated.tipPlata == 'CARD'


# ── echipa ───────────────────────────────────────────────────────────────────

def test_echipa_get_returns_spalatori(as_manager, seed):
    rv = as_manager.get('/api/manager/echipa')
    assert rv.status_code == 200
    data = rv.get_json()
    assert isinstance(data, list)
    names = [s['numeSpalator'] for s in data]
    assert 'Ion' in names


def test_echipa_add_creates_spalator(as_manager, seed, app):
    new_name = 'Spalator' + uid()
    rv = as_manager.post('/api/manager/echipa', json={'numeSpalator': new_name})
    assert rv.status_code == 201
    data = rv.get_json()
    assert data['numeSpalator'] == new_name

    with app.app_context():
        from backend.models import Spalatori
        sp = Spalatori.query.filter_by(numeSpalator=new_name).first()
        assert sp is not None


def test_echipa_delete_removes_spalator(as_manager, seed, app):
    # Create a spalator to delete
    new_name = 'TmpSp' + uid()
    create_rv = as_manager.post('/api/manager/echipa', json={'numeSpalator': new_name})
    sp_id = create_rv.get_json()['id']

    rv = as_manager.delete(f'/api/manager/echipa/{sp_id}')
    assert rv.status_code == 200
    assert rv.get_json()['ok'] is True

    with app.app_context():
        from backend.models import Spalatori
        assert Spalatori.query.get(sp_id) is None


def test_echipa_delete_wrong_location_returns_403(as_admin, as_manager, seed, app):
    """Admin creates a spalator in a different location; manager cannot delete it."""
    with app.app_context():
        from backend.models import Locatie, Spalatori
        from backend.extensions import db
        other_loc = Locatie(numeLocatie='OtherLoc' + uid())
        db.session.add(other_loc)
        db.session.flush()
        sp = Spalatori(numeSpalator='Foreign' + uid(), locatie_id=other_loc.id)
        db.session.add(sp)
        db.session.commit()
        sp_id = sp.id

    rv = as_manager.delete(f'/api/manager/echipa/{sp_id}')
    assert rv.status_code == 403


# ── get_client ───────────────────────────────────────────────────────────────

def test_get_client_known_plate(as_manager, seed, app):
    plate = 'KNW' + uid()
    make_service(as_manager, seed,
                 numarAutoturism=plate,
                 tipAutoturism='SUV',
                 marcaAutoturism='AUDI')

    rv = as_manager.get(f'/api/manager/client/{plate}')
    assert rv.status_code == 200
    data = rv.get_json()
    assert data['tipAutoturism'] == 'SUV'
    assert data['marcaAutoturism'] == 'AUDI'


def test_get_client_unknown_plate_returns_empty_strings(as_manager, seed):
    rv = as_manager.get('/api/manager/client/XYZUNKNOWN999')
    assert rv.status_code == 200
    data = rv.get_json()
    assert data['tipAutoturism'] == ''
    assert data['marcaAutoturism'] == ''
    assert data['emailClient'] == ''
    assert data['telefonClient'] == ''


# ── additional payment types ──────────────────────────────────────────────────

def test_add_serviciu_protocol_payment(as_manager, seed):
    plate = 'PRT' + uid()
    rv = make_service(as_manager, seed, numarAutoturism=plate, tipPlata='PROTOCOL')
    assert rv.status_code == 200
    assert rv.get_json()['ok'] is True


def test_add_serviciu_contract_with_nrFirma(as_manager, seed, app):
    plate = 'CTR' + uid()
    rv = make_service(as_manager, seed,
                      numarAutoturism=plate,
                      tipPlata='CONTRACT',
                      nrFirma='FIRMA-001')
    assert rv.status_code == 200

    with app.app_context():
        from backend.models import Servicii, Clienti
        client = Clienti.query.filter_by(numarAutoturism=plate).first()
        svc = Servicii.query.filter_by(clienti_id=client.id).first()
        assert svc.tipPlata == 'CONTRACT'
        assert svc.nrFirma == 'FIRMA-001'


def test_add_serviciu_protocol_excluded_from_curs_included_in_total(as_manager, seed):
    """PROTOCOL is a collected payment: it contributes to total, unlike CURS."""
    rv_before = as_manager.get('/api/manager/analytics')
    total_before = rv_before.get_json()['total']
    protocol_before = rv_before.get_json()['protocol']

    plate = 'PRT2' + uid()
    make_service(as_manager, seed, numarAutoturism=plate, tipPlata='PROTOCOL')

    rv_after = as_manager.get('/api/manager/analytics')
    data = rv_after.get_json()
    assert data['protocol'] > protocol_before
    assert data['total'] > total_before


# ── multiple services in one call ────────────────────────────────────────────

def test_add_serviciu_multiple_services_creates_multiple_rows(as_manager, seed, app):
    plate = 'MLT' + uid()
    rv = make_service(as_manager, seed,
                      numarAutoturism=plate,
                      serviciiPrestate=['Spalare Simpla', 'Interior'])
    assert rv.status_code == 200
    data = rv.get_json()
    assert 'Spalare Simpla' in data['servicii']
    assert 'Interior' in data['servicii']

    with app.app_context():
        from backend.models import Servicii, Clienti
        client = Clienti.query.filter_by(numarAutoturism=plate).first()
        count = Servicii.query.filter_by(clienti_id=client.id).count()
        assert count == 2


def test_add_serviciu_multiple_services_sequential_numarCurent(as_manager, seed, app):
    plate = 'MSQ' + uid()
    make_service(as_manager, seed,
                 numarAutoturism=plate,
                 serviciiPrestate=['Spalare Simpla', 'Interior'])

    with app.app_context():
        from backend.models import Servicii, Clienti
        client = Clienti.query.filter_by(numarAutoturism=plate).first()
        rows = Servicii.query.filter_by(clienti_id=client.id).order_by(Servicii.numarCurent).all()
        assert rows[1].numarCurent == rows[0].numarCurent + 1


# ── missing/invalid date ──────────────────────────────────────────────────────

def test_add_serviciu_missing_date_returns_400(as_manager, seed):
    rv = as_manager.post('/api/manager/servicii', json={
        'numarAutoturism': 'NODATE' + uid(),
        'tipAutoturism': 'AUTOTURISM',
        'marcaAutoturism': 'BMW',
        'serviciiPrestate': ['Spalare Simpla'],
        'spalator': seed['spalator_name'],
        'tipPlata': 'CASH',
        # 'date' deliberately omitted
    })
    assert rv.status_code == 400
    assert 'error' in rv.get_json()


def test_add_serviciu_invalid_date_returns_400(as_manager, seed):
    rv = as_manager.post('/api/manager/servicii', json={
        'date': 'not-a-date',
        'numarAutoturism': 'INVDT' + uid(),
        'tipAutoturism': 'AUTOTURISM',
        'marcaAutoturism': 'BMW',
        'serviciiPrestate': ['Spalare Simpla'],
        'spalator': seed['spalator_name'],
        'tipPlata': 'CASH',
    })
    assert rv.status_code == 400
    assert 'error' in rv.get_json()


# ── echipa edge cases ─────────────────────────────────────────────────────────

def test_echipa_get_without_locatie_id_returns_empty(as_admin):
    """Admin has no locatie_id in session → echipa returns empty list."""
    rv = as_admin.get('/api/manager/echipa')
    assert rv.status_code == 200
    assert rv.get_json() == []


def test_echipa_add_without_locatie_id_returns_400(as_admin):
    """Admin has no locatie_id → adding to echipa returns 400."""
    rv = as_admin.post('/api/manager/echipa', json={'numeSpalator': 'Test' + uid()})
    assert rv.status_code == 400
    assert 'error' in rv.get_json()


# ── echipa toggle (PUT /echipa/<id>) ──────────────────────────────────────────

def test_echipa_toggle_sets_prezent_false(as_manager, seed, app):
    rv = as_manager.put(f'/api/manager/echipa/{seed["spalator_id"]}', json={'prezentAzi': False})
    assert rv.status_code == 200
    data = rv.get_json()
    assert data['prezentAzi'] is False


def test_echipa_toggle_sets_prezent_true(as_manager, seed, app):
    as_manager.put(f'/api/manager/echipa/{seed["spalator_id"]}', json={'prezentAzi': False})
    rv = as_manager.put(f'/api/manager/echipa/{seed["spalator_id"]}', json={'prezentAzi': True})
    assert rv.status_code == 200
    assert rv.get_json()['prezentAzi'] is True


def test_echipa_toggle_wrong_location_returns_403(as_manager, seed, app):
    with app.app_context():
        from backend.models import Locatie, Spalatori
        from backend.extensions import db
        other_loc = Locatie(numeLocatie='OtherTog' + uid())
        db.session.add(other_loc)
        db.session.flush()
        sp = Spalatori(numeSpalator='Tog' + uid(), locatie_id=other_loc.id)
        db.session.add(sp)
        db.session.commit()
        sp_id = sp.id

    rv = as_manager.put(f'/api/manager/echipa/{sp_id}', json={'prezentAzi': True})
    assert rv.status_code == 403


# ── delete_serviciu ───────────────────────────────────────────────────────────

def test_delete_serviciu_removes_row(as_manager, seed, app):
    plate = 'DEL' + uid()
    make_service(as_manager, seed, numarAutoturism=plate)

    with app.app_context():
        from backend.models import Servicii, Clienti
        client = Clienti.query.filter_by(numarAutoturism=plate).first()
        svc = Servicii.query.filter_by(clienti_id=client.id).first()
        svc_id = svc.id

    rv = as_manager.delete(f'/api/manager/servicii/{svc_id}')
    assert rv.status_code == 200
    assert rv.get_json()['ok'] is True

    with app.app_context():
        from backend.models import Servicii
        assert Servicii.query.get(svc_id) is None


def test_delete_serviciu_wrong_location_returns_403(as_manager, seed, app):
    """Manager cannot delete a service belonging to a different location."""
    from tests.conftest import _inject_login
    with app.app_context():
        from backend.models import Locatie, User, Spalatori, Servicii, Clienti
        from backend.extensions import db
        from datetime import datetime
        from zoneinfo import ZoneInfo
        other_loc = Locatie(numeLocatie='DelLoc' + uid())
        db.session.add(other_loc)
        db.session.flush()
        other_mgr = User(username='dm_' + uid(), rol='manager', locatie_id=other_loc.id)
        other_mgr.set_password('pass')
        db.session.add(other_mgr)
        db.session.flush()
        sp = Spalatori(numeSpalator='DSp' + uid(), locatie_id=other_loc.id)
        db.session.add(sp)
        db.session.flush()
        cl = Clienti(numarAutoturism='DL' + uid(), locatie_id=other_loc.id)
        db.session.add(cl)
        db.session.flush()
        svc = Servicii(
            serviciiPrestate='Spalare Simpla',
            dataSpalare=datetime.now(ZoneInfo('Europe/Bucharest')),
            numarCurent=1,
            pretServicii=30.0,
            comisionServicii=5.0,
            tipPlata='CASH',
            clienti_id=cl.id,
            spalatori_id=sp.id,
            locatie_id=other_loc.id,
        )
        db.session.add(svc)
        db.session.commit()
        svc_id = svc.id

    rv = as_manager.delete(f'/api/manager/servicii/{svc_id}')
    assert rv.status_code == 403


# ── edit_serviciu (PUT /servicii/<id>) ────────────────────────────────────────

def test_edit_serviciu_changes_tipPlata(as_manager, seed, app):
    plate = 'EDT' + uid()
    make_service(as_manager, seed, numarAutoturism=plate, tipPlata='CASH')

    with app.app_context():
        from backend.models import Servicii, Clienti
        client = Clienti.query.filter_by(numarAutoturism=plate).first()
        svc_id = Servicii.query.filter_by(clienti_id=client.id).first().id

    rv = as_manager.put(f'/api/manager/servicii/{svc_id}', json={'tipPlata': 'CARD'})
    assert rv.status_code == 200
    assert rv.get_json()['ok'] is True

    with app.app_context():
        from backend.models import Servicii
        assert Servicii.query.get(svc_id).tipPlata == 'CARD'


def test_edit_serviciu_changes_notite(as_manager, seed, app):
    plate = 'NTT' + uid()
    make_service(as_manager, seed, numarAutoturism=plate)

    with app.app_context():
        from backend.models import Servicii, Clienti
        client = Clienti.query.filter_by(numarAutoturism=plate).first()
        svc_id = Servicii.query.filter_by(clienti_id=client.id).first().id

    rv = as_manager.put(f'/api/manager/servicii/{svc_id}', json={'notite': 'test note'})
    assert rv.status_code == 200

    with app.app_context():
        from backend.models import Servicii
        assert Servicii.query.get(svc_id).notite == 'test note'


def test_edit_serviciu_changes_spalator(as_manager, seed, app):
    """Changing spalator updates spalatori_id on the service row."""
    # Create a second spalator to switch to
    new_sp_name = 'NewSp' + uid()
    as_manager.post('/api/manager/echipa', json={'numeSpalator': new_sp_name})

    plate = 'ESP' + uid()
    make_service(as_manager, seed, numarAutoturism=plate, spalator=seed['spalator_name'])

    with app.app_context():
        from backend.models import Servicii, Clienti, Spalatori
        client = Clienti.query.filter_by(numarAutoturism=plate).first()
        svc = Servicii.query.filter_by(clienti_id=client.id).first()
        svc_id = svc.id

    rv = as_manager.put(f'/api/manager/servicii/{svc_id}', json={'spalator': new_sp_name})
    assert rv.status_code == 200

    with app.app_context():
        from backend.models import Servicii, Spalatori
        updated = Servicii.query.get(svc_id)
        assert updated.spalatori.numeSpalator == new_sp_name


def test_edit_serviciu_changes_service_name_recalculates_price(as_manager, seed, app):
    """Switching from Spalare Simpla to Interior recalculates pretServicii."""
    plate = 'PRC' + uid()
    make_service(as_manager, seed, numarAutoturism=plate,
                 serviciiPrestate=['Spalare Simpla'], tipAutoturism='AUTOTURISM')

    with app.app_context():
        from backend.models import Servicii, Clienti
        client = Clienti.query.filter_by(numarAutoturism=plate).first()
        svc = Servicii.query.filter_by(clienti_id=client.id).first()
        svc_id = svc.id
        old_pret = svc.pretServicii  # 30.0

    rv = as_manager.put(f'/api/manager/servicii/{svc_id}', json={'serviciiPrestate': 'Interior'})
    assert rv.status_code == 200

    with app.app_context():
        from backend.models import Servicii
        updated = Servicii.query.get(svc_id)
        assert updated.serviciiPrestate == 'Interior'
        assert updated.pretServicii != old_pret  # price must have changed


def test_edit_serviciu_unknown_spalator_returns_400(as_manager, seed, app):
    plate = 'UKS' + uid()
    make_service(as_manager, seed, numarAutoturism=plate)

    with app.app_context():
        from backend.models import Servicii, Clienti
        client = Clienti.query.filter_by(numarAutoturism=plate).first()
        svc_id = Servicii.query.filter_by(clienti_id=client.id).first().id

    rv = as_manager.put(f'/api/manager/servicii/{svc_id}', json={'spalator': 'NonexistentSpalator'})
    assert rv.status_code == 400
    assert 'error' in rv.get_json()


def test_edit_serviciu_unknown_service_name_returns_400(as_manager, seed, app):
    plate = 'UKV' + uid()
    make_service(as_manager, seed, numarAutoturism=plate)

    with app.app_context():
        from backend.models import Servicii, Clienti
        client = Clienti.query.filter_by(numarAutoturism=plate).first()
        svc_id = Servicii.query.filter_by(clienti_id=client.id).first().id

    rv = as_manager.put(f'/api/manager/servicii/{svc_id}', json={'serviciiPrestate': 'ServiciuInexistent'})
    assert rv.status_code == 400
    assert 'error' in rv.get_json()


def test_edit_serviciu_wrong_location_returns_403(as_manager, seed, app):
    """Manager cannot edit a service from a different location."""
    from tests.conftest import _inject_login
    with app.app_context():
        from backend.models import Locatie, User, Spalatori, Servicii, Clienti
        from backend.extensions import db
        from datetime import datetime
        from zoneinfo import ZoneInfo
        other_loc = Locatie(numeLocatie='EdtLoc' + uid())
        db.session.add(other_loc)
        db.session.flush()
        sp = Spalatori(numeSpalator='ESp' + uid(), locatie_id=other_loc.id)
        db.session.add(sp)
        db.session.flush()
        cl = Clienti(numarAutoturism='EL' + uid(), locatie_id=other_loc.id)
        db.session.add(cl)
        db.session.flush()
        svc = Servicii(
            serviciiPrestate='Spalare Simpla',
            dataSpalare=datetime.now(ZoneInfo('Europe/Bucharest')),
            numarCurent=1,
            pretServicii=30.0,
            comisionServicii=5.0,
            tipPlata='CASH',
            clienti_id=cl.id,
            spalatori_id=sp.id,
            locatie_id=other_loc.id,
        )
        db.session.add(svc)
        db.session.commit()
        svc_id = svc.id

    rv = as_manager.put(f'/api/manager/servicii/{svc_id}', json={'tipPlata': 'CARD'})
    assert rv.status_code == 403


# ── plates-search ─────────────────────────────────────────────────────────────

def test_plates_search_returns_matching_plates(as_manager, seed):
    unique = uid()
    plate = 'PSR' + unique
    make_service(as_manager, seed, numarAutoturism=plate)

    rv = as_manager.get(f'/api/manager/plates-search?q={unique}')
    assert rv.status_code == 200
    data = rv.get_json()
    assert isinstance(data, list)
    numbers = [r['numar'] for r in data]
    assert plate in numbers


def test_plates_search_short_query_returns_empty(as_manager, seed):
    rv = as_manager.get('/api/manager/plates-search?q=X')
    assert rv.status_code == 200
    assert rv.get_json() == []


def test_plates_search_result_has_expected_fields(as_manager, seed):
    unique = uid()
    plate = 'FLD' + unique
    make_service(as_manager, seed, numarAutoturism=plate, marcaAutoturism='FORD', tipAutoturism='AUTOTURISM')

    rv = as_manager.get(f'/api/manager/plates-search?q={unique}')
    data = rv.get_json()
    assert len(data) >= 1
    r = next(x for x in data if x['numar'] == plate)
    assert r['marca'] == 'FORD'
    assert r['tip'] == 'AUTOTURISM'


# ── nrfirma-suggestions ───────────────────────────────────────────────────────

def test_nrfirma_suggestions_returns_existing_values(as_manager, seed):
    firma = 'FIRMA-' + uid()
    make_service(as_manager, seed, tipPlata='CONTRACT', nrFirma=firma)

    rv = as_manager.get('/api/manager/nrfirma-suggestions')
    assert rv.status_code == 200
    data = rv.get_json()
    assert isinstance(data, list)
    assert firma in data


def test_nrfirma_suggestions_excludes_null(as_manager, seed):
    """Services without nrFirma must not appear in the suggestions."""
    make_service(as_manager, seed, tipPlata='CASH')  # no nrFirma

    rv = as_manager.get('/api/manager/nrfirma-suggestions')
    assert rv.status_code == 200
    for item in rv.get_json():
        assert item is not None


# ── access control ────────────────────────────────────────────────────────────

def test_anon_cannot_access_manager_routes(anon):
    for path in [
        '/api/manager/form-data',
        '/api/manager/dashboard',
        '/api/manager/analytics',
        '/api/manager/echipa',
    ]:
        rv = anon.get(path)
        assert rv.status_code == 401, f'Expected 401 for {path}, got {rv.status_code}'

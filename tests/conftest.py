"""
Test configuration and shared fixtures.

Design notes:
- `app` fixture is session-scoped: one in-memory SQLite DB for the whole test run.
- `seed` fixture is session-scoped: populates once, IDs returned in a dict.
- Per-test client fixtures (`as_admin`, `as_manager`, `as_dev`, `anon`) are
  function-scoped but log in by directly injecting a Flask-Login session,
  so no HTTP /api/auth/login calls happen during fixture setup — this avoids
  rate-limit exhaustion and the pytest-flask request-context conflict.
"""

import pytest
from uuid import uuid4
from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy.pool import StaticPool

BUCHAREST = ZoneInfo('Europe/Bucharest')


# pytest-flask's autouse _push_request_context keeps an app context alive for the
# entire test, causing Flask-Login's g._login_user cache to bleed between requests
# made by different test clients. Override it with a no-op so each test-client
# request gets its own clean app context and fresh g.
@pytest.fixture(autouse=True)
def _push_request_context(request):
    pass


def uid():
    """Return an 8-char uppercase hex string for unique test data.

    Routes uppercase plate numbers before storing them, so test comparisons
    against DB values or API responses need uppercase strings too.
    """
    return uuid4().hex[:8].upper()


# ── App & DB fixtures ─────────────────────────────────────────────────────────

@pytest.fixture(scope='session')
def app():
    from backend import create_app
    application = create_app()
    application.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI='sqlite:///:memory:',
        SQLALCHEMY_ENGINE_OPTIONS={
            'connect_args': {'check_same_thread': False},
            'poolclass': StaticPool,
        },
        RATELIMIT_ENABLED=False,
        SECRET_KEY='test',
        WTF_CSRF_ENABLED=False,
    )
    # Disable flask-limiter during tests
    from backend.extensions import limiter
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address

    from backend.extensions import db
    with application.app_context():
        db.create_all()

    yield application

    with application.app_context():
        db.drop_all()


@pytest.fixture(scope='session')
def seed(app):
    """Create baseline data once for the whole session. Returns an ID dict."""
    from backend.extensions import db
    from backend.models import Locatie, User, Spalatori, PretServicii

    with app.app_context():
        loc = Locatie(numeLocatie='TestLoc')
        db.session.add(loc)
        db.session.flush()

        admin = User(username='t_admin', rol='admin')
        admin.set_password('adminpass')

        manager = User(username='t_manager', rol='manager', locatie_id=loc.id)
        manager.set_password('mgrpass')

        dev = User(username='t_dev', rol='dev')
        dev.set_password('devpass')

        db.session.add_all([admin, manager, dev])
        db.session.flush()

        spalator = Spalatori(numeSpalator='Ion', locatie_id=loc.id)
        db.session.add(spalator)
        db.session.flush()

        pret1 = PretServicii(
            serviciiPrestate='Spalare Simpla',
            pretAutoturism=30.0,
            pretSUV=50.0,
            pretVan=40.0,
            comisionAutoturism=5.0,
            comisionSUV=8.0,
            comisionVan=6.0,
        )
        pret2 = PretServicii(
            serviciiPrestate='Interior',
            pretAutoturism=20.0,
            pretSUV=30.0,
            pretVan=25.0,
            comisionAutoturism=3.0,
            comisionSUV=5.0,
            comisionVan=4.0,
        )
        db.session.add_all([pret1, pret2])
        db.session.commit()

        return {
            'loc_id': loc.id,
            'admin_id': admin.id,
            'manager_id': manager.id,
            'dev_id': dev.id,
            'spalator_id': spalator.id,
            'spalator_name': spalator.numeSpalator,
            'pret1_id': pret1.id,
            'pret2_id': pret2.id,
        }


# ── Helpers ──────────────────────────────────────────────────────────────────

def _inject_login(app, client, user_id, locatie_id=None):
    """Set Flask-Login session without going through the HTTP login endpoint."""
    from flask_login import login_user
    from backend.models import User
    with app.app_context():
        user = User.query.get(user_id)
        with client.session_transaction() as sess:
            sess['_user_id'] = str(user.id)
            sess['_fresh'] = True
            sess['locatie_id'] = locatie_id


# ── Client fixtures ──────────────────────────────────────────────────────────

@pytest.fixture
def anon(app):
    yield app.test_client()


@pytest.fixture
def as_admin(app, seed):
    client = app.test_client()
    _inject_login(app, client, seed['admin_id'])
    yield client


@pytest.fixture
def as_manager(app, seed):
    client = app.test_client()
    _inject_login(app, client, seed['manager_id'], locatie_id=seed['loc_id'])
    yield client


@pytest.fixture
def as_dev(app, seed):
    client = app.test_client()
    _inject_login(app, client, seed['dev_id'])
    yield client


# ── Service creation helper ──────────────────────────────────────────────────

def make_service(client, seed, **overrides):
    """POST a service to /api/manager/servicii with sane defaults.

    `seed` can be the full seed dict or a minimal dict with at least 'spalator_name'.
    """
    spalator_name = seed['spalator_name']
    now_iso = datetime.now(BUCHAREST).isoformat()
    defaults = {
        'date': now_iso,
        'numarAutoturism': 'T' + uid(),
        'tipAutoturism': 'AUTOTURISM',
        'marcaAutoturism': 'BMW',
        'serviciiPrestate': ['Spalare Simpla'],
        'spalator': spalator_name,
        'tipPlata': 'CASH',
    }
    defaults.update(overrides)
    return client.post('/api/manager/servicii', json=defaults)

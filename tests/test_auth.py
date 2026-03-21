"""Tests for /api/auth/* endpoints.

These tests use actual HTTP login calls to test the auth routes themselves.
All other test files inject sessions directly to avoid rate limits.
"""
import pytest


def test_login_success_admin(app, seed):
    with app.test_client() as client:
        rv = client.post('/api/auth/login', json={
            'username': 't_admin',
            'password': 'adminpass',
        })
        assert rv.status_code == 200
        data = rv.get_json()
        assert data['username'] == 't_admin'
        assert data['rol'] == 'admin'


def test_login_success_manager_has_locatie_id(app, seed):
    with app.test_client() as client:
        rv = client.post('/api/auth/login', json={
            'username': 't_manager',
            'password': 'mgrpass',
        })
        assert rv.status_code == 200
        data = rv.get_json()
        assert data['username'] == 't_manager'
        assert data['rol'] == 'manager'
        assert data['locatie_id'] == seed['loc_id']


def test_login_wrong_password(app, seed):
    with app.test_client() as client:
        rv = client.post('/api/auth/login', json={
            'username': 't_admin',
            'password': 'wrongpassword',
        })
        assert rv.status_code == 401
        data = rv.get_json()
        assert 'error' in data


def test_login_unknown_user(app, seed):
    with app.test_client() as client:
        rv = client.post('/api/auth/login', json={
            'username': 'nobody_here_xyz',
            'password': 'anything',
        })
        assert rv.status_code == 401


def test_me_returns_user_when_authenticated(as_admin):
    rv = as_admin.get('/api/auth/me')
    assert rv.status_code == 200
    data = rv.get_json()
    assert data['username'] == 't_admin'
    assert data['rol'] == 'admin'


def test_me_returns_401_when_not_authenticated(anon):
    rv = anon.get('/api/auth/me')
    assert rv.status_code == 401


def test_logout_clears_session(app, seed):
    """Use real HTTP login then verify logout clears session."""
    with app.test_client() as client:
        login_rv = client.post('/api/auth/login', json={
            'username': 't_admin',
            'password': 'adminpass',
        })
        assert login_rv.status_code == 200

        me_rv = client.get('/api/auth/me')
        assert me_rv.status_code == 200

        logout_rv = client.post('/api/auth/logout')
        assert logout_rv.status_code == 200
        assert logout_rv.get_json()['ok'] is True

        after_rv = client.get('/api/auth/me')
        assert after_rv.status_code == 401


def test_protected_route_without_auth_returns_401(anon):
    rv = anon.get('/api/manager/dashboard')
    assert rv.status_code == 401


# ── HARD-06: security response headers ───────────────────────────────────────

def test_security_headers_present(anon):
    """All API responses must include security headers."""
    rv = anon.get('/api/auth/me')
    assert rv.headers.get('X-Frame-Options') == 'DENY'
    assert rv.headers.get('X-Content-Type-Options') == 'nosniff'
    assert rv.headers.get('Referrer-Policy') == 'strict-origin-when-cross-origin'


# ── HARD-01/02: session config ───────────────────────────────────────────────

def test_session_config_values(app):
    """Verify session security configuration is set."""
    assert app.config['SESSION_COOKIE_HTTPONLY'] is True
    assert app.config['SESSION_COOKIE_SAMESITE'] == 'Lax'
    from datetime import timedelta
    assert app.config['PERMANENT_SESSION_LIFETIME'] == timedelta(hours=12)


def test_login_sets_permanent_session(app, seed):
    """Login should set session.permanent = True."""
    with app.test_client() as client:
        rv = client.post('/api/auth/login', json={
            'username': 't_admin',
            'password': 'adminpass',
        })
        assert rv.status_code == 200
        with client.session_transaction() as sess:
            assert sess.get('_permanent') is True


# ── HARD-03: request body size limit ─────────────────────────────────────────

def test_max_content_length_configured(app):
    assert app.config['MAX_CONTENT_LENGTH'] == 1 * 1024 * 1024

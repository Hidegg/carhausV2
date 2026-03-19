import os
from flask import Flask
from backend.config import Config
from backend.extensions import db, login_manager, migrate, cors, limiter


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    login_manager.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)
    _cors_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:5173').split(',')
    cors.init_app(app, supports_credentials=True, origins=_cors_origins)

    from backend.models import User

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    @login_manager.unauthorized_handler
    def unauthorized():
        from flask import jsonify
        return jsonify({'error': 'Unauthorized'}), 401

    from backend.blueprints.auth.routes import auth_bp
    from backend.blueprints.manager.routes import manager_bp
    from backend.blueprints.admin.routes import admin_bp
    from backend.blueprints.dev.routes import dev_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(manager_bp, url_prefix='/api/manager')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(dev_bp, url_prefix='/api/dev')

    # Weekly backup scheduler (Sunday 03:00) — SQLite only
    db_url = app.config.get('SQLALCHEMY_DATABASE_URI', '')
    if db_url.startswith('sqlite') and not app.config.get('TESTING'):
        from apscheduler.schedulers.background import BackgroundScheduler
        from backup import backup_database
        scheduler = BackgroundScheduler()
        scheduler.add_job(backup_database, 'cron', day_of_week='sun', hour=3, minute=0)
        scheduler.start()

    # Serve React app for all non-API routes in production
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_react(path):
        import os
        from flask import send_from_directory
        dist = os.path.join(app.root_path, '..', 'frontend', 'dist')
        if path and os.path.exists(os.path.join(dist, path)):
            return send_from_directory(dist, path)
        return send_from_directory(dist, 'index.html')

    return app

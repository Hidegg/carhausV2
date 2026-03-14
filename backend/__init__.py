from flask import Flask
from backend.config import Config
from backend.extensions import db, login_manager, migrate, cors


def create_app():
    app = Flask(__name__, static_folder='../frontend/dist', static_url_path='/')
    app.config.from_object(Config)

    db.init_app(app)
    login_manager.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app, supports_credentials=True, origins=['http://localhost:5173'])

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

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(manager_bp, url_prefix='/api/manager')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')

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

from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from backend.extensions import db


class Locatie(db.Model):
    __tablename__ = 'locatie'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    numeLocatie = db.Column(db.String(50), nullable=False)

    clienti = db.relationship('Clienti', backref='locatie', lazy=True)
    servicii = db.relationship('Servicii', backref='locatie', lazy=True)
    spalatori = db.relationship('Spalatori', backref='locatie', lazy=True)
    users = db.relationship('User', backref='locatie', lazy=True)

    def __repr__(self):
        return f'<Locatie {self.numeLocatie}>'


class User(db.Model, UserMixin):
    __tablename__ = 'user'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    rol = db.Column(db.String(20), default='manager')  # admin | manager | dev
    locatie_id = db.Column(db.Integer, db.ForeignKey('locatie.id'), nullable=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username} ({self.rol})>'


class Clienti(db.Model):
    __tablename__ = 'clienti'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    numarAutoturism = db.Column(db.String(20), unique=True, nullable=False)
    emailClient = db.Column(db.String(100), nullable=True)
    telefonClient = db.Column(db.String(15), nullable=True)
    tipAutoturism = db.Column(db.String(50))
    marcaAutoturism = db.Column(db.String(50))
    gdprAcceptat = db.Column(db.Boolean, nullable=False, default=False, server_default='0')
    newsletterAcceptat = db.Column(db.Boolean, nullable=False, default=False, server_default='0')
    termeniAcceptati = db.Column(db.Boolean, nullable=False, default=False, server_default='0')
    locatie_id = db.Column(db.Integer, db.ForeignKey('locatie.id'), nullable=False)

    servicii = db.relationship('Servicii', backref='clienti', lazy=True)

    def __repr__(self):
        return f'<Clienti {self.numarAutoturism}>'


class Spalatori(db.Model):
    __tablename__ = 'spalatori'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    numeSpalator = db.Column(db.String(50), nullable=False)
    locatie_id = db.Column(db.Integer, db.ForeignKey('locatie.id'), nullable=False)

    def __repr__(self):
        return f'<Spalatori {self.numeSpalator}>'


class Servicii(db.Model):
    __tablename__ = 'servicii'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    serviciiPrestate = db.Column(db.String(50), nullable=False)
    dataSpalare = db.Column(db.DateTime, nullable=False)
    numarCurent = db.Column(db.Integer, nullable=False)
    pretServicii = db.Column(db.Float, nullable=True)
    comisionServicii = db.Column(db.Float, nullable=True)
    tipPlata = db.Column(db.String(50), nullable=False)
    nrFirma = db.Column(db.String(100), nullable=True)

    clienti_id = db.Column(db.Integer, db.ForeignKey('clienti.id'), nullable=False)
    spalatori_id = db.Column(db.Integer, db.ForeignKey('spalatori.id'), nullable=False)
    locatie_id = db.Column(db.Integer, db.ForeignKey('locatie.id'), nullable=False)

    spalatori = db.relationship('Spalatori', backref='servicii', lazy=True)

    def __repr__(self):
        return f'<Servicii {self.serviciiPrestate} {self.dataSpalare}>'


class PretServicii(db.Model):
    __tablename__ = 'pret_servicii'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    serviciiPrestate = db.Column(db.String(50), nullable=False)
    pretAutoturism = db.Column(db.Float, nullable=False, default=0.0)
    pretSUV = db.Column(db.Float, nullable=False, default=0.0)
    pretVan = db.Column(db.Float, nullable=False, default=0.0)
    comisionAutoturism = db.Column(db.Float, nullable=False, default=0.0)
    comisionSUV = db.Column(db.Float, nullable=False, default=0.0)
    comisionVan = db.Column(db.Float, nullable=False, default=0.0)

    def __repr__(self):
        return f'<PretServicii {self.serviciiPrestate}>'

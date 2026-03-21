from datetime import datetime, timedelta, date, time
from zoneinfo import ZoneInfo
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from functools import wraps
from sqlalchemy import func, extract
from backend.extensions import db
from backend.models import Locatie, Spalatori, PretServicii, User, Servicii, Clienti
from backend.services.stats import get_location_report

BUCHAREST = ZoneInfo('Europe/Bucharest')
UTC = ZoneInfo('UTC')


def _to_naive_utc(d):
    """Convert a date to naive UTC datetime (midnight Bucharest → UTC)."""
    return datetime.combine(d, time(0, 0), tzinfo=BUCHAREST).astimezone(UTC).replace(tzinfo=None)

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


# ── Istoric ──────────────────────────────────────────────────────────────────

RO_MONTHS_SHORT = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun',
                   'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
RO_MONTHS_FULL  = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
                   'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']


def _svc_breakdown(locatie_id, start, end):
    q = db.session.query(
        Servicii.serviciiPrestate,
        func.count(Servicii.id),
        func.sum(db.case((Servicii.tipPlata != 'CURS', Servicii.pretServicii), else_=0))
    ).filter(Servicii.dataSpalare >= start, Servicii.dataSpalare < end)
    if locatie_id:
        q = q.filter(Servicii.locatie_id == locatie_id)
    return [
        {'name': r[0], 'spalari': int(r[1]), 'incasari': float(r[2] or 0)}
        for r in q.group_by(Servicii.serviciiPrestate).order_by(func.count(Servicii.id).desc()).all()
    ]


def _month_weeks(year, month):
    """Fixed 7-day buckets: 1-7, 8-14, 15-21, 22-end. Returns (start, end_exclusive) pairs."""
    last_day = (date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)) - timedelta(days=1)
    weeks, day = [], 1
    while day <= last_day.day:
        start = date(year, month, day)
        end   = date(year, month, min(day + 6, last_day.day))
        weeks.append((start, end + timedelta(days=1)))
        day += 7
    return weeks


@admin_bp.route('/istoric')
@login_required
@admin_required
def istoric():
    locatie_id = request.args.get('locatie_id', type=int)
    today = datetime.now(BUCHAREST).date()
    year  = request.args.get('year',  type=int) or today.year
    month = request.args.get('month', type=int)

    # Earliest record → available years
    prima_q = db.session.query(func.min(Servicii.dataSpalare))
    if locatie_id:
        prima_q = prima_q.filter(Servicii.locatie_id == locatie_id)
    prima = prima_q.scalar()
    first_year      = prima.year if prima else today.year
    available_years = list(range(first_year, today.year + 1))
    prima_luna      = prima.strftime('%b %Y') if prima else None

    locatii      = Locatie.query.all()
    locatii_data = [{'id': l.id, 'numeLocatie': l.numeLocatie} for l in locatii]

    if month:
        # ── Monthly drill-down: weeks of the month ───────────────────────────
        month_start = date(year, month, 1)
        month_end   = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
        month_start_utc = _to_naive_utc(month_start)
        month_end_utc   = _to_naive_utc(month_end)

        rows = db.session.query(
            Servicii.dataSpalare,
            db.case((Servicii.tipPlata != 'CURS', Servicii.pretServicii), else_=0).label('inc'),
            Servicii.clienti_id
        ).filter(
            Servicii.dataSpalare >= month_start_utc,
            Servicii.dataSpalare < month_end_utc
        )
        if locatie_id:
            rows = rows.filter(Servicii.locatie_id == locatie_id)
        rows = rows.all()

        weeks     = _month_weeks(year, month)
        week_data = [{'incasari': 0.0, 'spalari': 0, 'clients': set()} for _ in weeks]
        for row in rows:
            d = row.dataSpalare.replace(tzinfo=UTC).astimezone(BUCHAREST).date() if hasattr(row.dataSpalare, 'date') else row.dataSpalare
            for i, (ws, we) in enumerate(weeks):
                if ws <= d < we:
                    week_data[i]['incasari'] += float(row.inc or 0)
                    week_data[i]['spalari']  += 1
                    week_data[i]['clients'].add(row.clienti_id)
                    break

        mo   = RO_MONTHS_SHORT[month - 1]
        bars = []
        for i, (ws, we) in enumerate(weeks):
            we_inc = we - timedelta(days=1)
            label  = f'{ws.day} {mo}' if ws.day == we_inc.day else f'{ws.day}-{we_inc.day} {mo}'
            wd     = week_data[i]
            bars.append({'label': label, 'incasari': wd['incasari'],
                         'spalari': wd['spalari'], 'masini': len(wd['clients'])})

        return jsonify({
            'view':             'monthly',
            'year':             year,
            'month':            month,
            'monthLabel':       f'{RO_MONTHS_FULL[month - 1]} {year}',
            'bars':             bars,
            'kpi':              {
                'incasari': sum(b['incasari'] for b in bars),
                'spalari':  sum(b['spalari']  for b in bars),
                'masini':   len({r.clienti_id for r in rows}),
            },
            'serviciiBreakdown': _svc_breakdown(locatie_id, month_start_utc, month_end_utc),
            'locatii':           locatii_data,
            'availableYears':    available_years,
            'primaLuna':         prima_luna,
        })

    else:
        # ── Annual view: single aggregation query for all 12 months ──────────
        year_start_utc = _to_naive_utc(date(year, 1, 1))
        year_end_utc   = _to_naive_utc(date(year + 1, 1, 1))

        monthly_q = db.session.query(
            extract('month', Servicii.dataSpalare).label('m'),
            func.sum(db.case((Servicii.tipPlata != 'CURS', Servicii.pretServicii), else_=0)),
            func.count(Servicii.id),
            func.count(func.distinct(Servicii.clienti_id))
        ).filter(
            Servicii.dataSpalare >= year_start_utc,
            Servicii.dataSpalare < year_end_utc
        )
        if locatie_id:
            monthly_q = monthly_q.filter(Servicii.locatie_id == locatie_id)
        stats_by_month = {int(r[0]): r for r in monthly_q.group_by('m').all()}

        bars = []
        best_label, best_inc = None, -1.0
        for m in range(1, 13):
            r    = stats_by_month.get(m)
            inc  = float(r[1] or 0) if r else 0.0
            spal = int(r[2] or 0)   if r else 0
            mas  = int(r[3] or 0)   if r else 0
            label = RO_MONTHS_SHORT[m - 1]
            bars.append({'label': label, 'month': m, 'incasari': inc, 'spalari': spal, 'masini': mas})
            if inc > best_inc:
                best_inc, best_label = inc, label

        return jsonify({
            'view': 'annual',
            'year': year,
            'bars': bars,
            'kpi':  {
                'incasari':   sum(b['incasari'] for b in bars),
                'spalari':    sum(b['spalari']  for b in bars),
                'masini':     sum(b['masini']   for b in bars),
                'lunaDeVarf': best_label,
            },
            'serviciiBreakdown': _svc_breakdown(locatie_id, year_start_utc, year_end_utc),
            'locatii':           locatii_data,
            'availableYears':    available_years,
            'primaLuna':         prima_luna,
        })


# ── CURS Pending ─────────────────────────────────────────────────────────────

@admin_bp.route('/curs-pending')
@login_required
@admin_required
def curs_pending():
    from collections import defaultdict
    locatie_id = request.args.get('locatie_id', type=int)

    q = db.session.query(
        Servicii.clienti_id,
        func.count(Servicii.id).label('curs_count'),
        func.sum(Servicii.pretServicii).label('curs_total'),
        func.max(Servicii.dataSpalare).label('ultima_data'),
    ).filter(Servicii.tipPlata == 'CURS')
    if locatie_id:
        q = q.filter(Servicii.locatie_id == locatie_id)
    rows = q.group_by(Servicii.clienti_id).order_by(func.sum(Servicii.pretServicii).desc()).all()

    client_ids = [row.clienti_id for row in rows]
    clients = {c.id: c for c in Clienti.query.filter(Clienti.id.in_(client_ids)).all()} if client_ids else {}

    result = []
    for row in rows:
        c = clients.get(row.clienti_id)
        if not c:
            continue
        result.append({
            'numar': c.numarAutoturism,
            'marca': c.marcaAutoturism or '—',
            'tip': c.tipAutoturism or '—',
            'curs_count': int(row.curs_count or 0),
            'curs_total': float(row.curs_total or 0),
            'ultima_data': row.ultima_data.isoformat() if row.ultima_data else None,
            'telefon': c.telefonClient or None,
            'email': c.emailClient or None,
        })
    # Sort oldest first (most urgent)
    result.sort(key=lambda x: x['ultima_data'] or '')
    return jsonify(result)


# ── Clienti ──────────────────────────────────────────────────────────────────

@admin_bp.route('/clienti')
@login_required
@admin_required
def clienti_list():
    from collections import defaultdict
    locatie_id = request.args.get('locatie_id', type=int)
    sort  = request.args.get('sort', 'vizite')
    dir_  = request.args.get('dir', 'desc')
    q_str = request.args.get('q', '').strip().upper()
    brand_raw = request.args.get('brand', '').strip().upper()
    brands = [b for b in brand_raw.split(',') if b]

    # Aggregate per client: visits (distinct timestamps), collected total, last visit
    stats_q = db.session.query(
        Servicii.clienti_id,
        func.count(func.distinct(Servicii.dataSpalare)).label('vizite'),
        func.sum(
            db.case((Servicii.tipPlata != 'CURS', Servicii.pretServicii), else_=0)
        ).label('total'),
        func.max(Servicii.dataSpalare).label('ultima_spalare'),
    ).group_by(Servicii.clienti_id)
    if locatie_id:
        stats_q = stats_q.filter(Servicii.locatie_id == locatie_id)
    stats_map = {row.clienti_id: row for row in stats_q.all()}

    # Most common service per client
    svc_q = db.session.query(
        Servicii.clienti_id,
        Servicii.serviciiPrestate,
        func.count().label('cnt')
    ).group_by(Servicii.clienti_id, Servicii.serviciiPrestate)
    if locatie_id:
        svc_q = svc_q.filter(Servicii.locatie_id == locatie_id)
    svc_counts = defaultdict(list)
    for row in svc_q.all():
        svc_counts[row.clienti_id].append((row.cnt, row.serviciiPrestate))
    top_svc = {cid: max(v, key=lambda x: x[0])[1] for cid, v in svc_counts.items()}

    # Fetch clients
    clienti_q = Clienti.query
    if locatie_id:
        clienti_q = clienti_q.filter_by(locatie_id=locatie_id)
    if q_str:
        clienti_q = clienti_q.filter(Clienti.numarAutoturism.contains(q_str))
    if brands:
        clienti_q = clienti_q.filter(Clienti.marcaAutoturism.in_(brands))
    all_clients = clienti_q.all()

    result = []
    for c in all_clients:
        st = stats_map.get(c.id)
        if not st:
            continue
        result.append({
            'id': c.id,
            'numar': c.numarAutoturism,
            'marca': c.marcaAutoturism or '—',
            'tip': c.tipAutoturism or '—',
            'vizite': int(st.vizite or 0),
            'total': float(st.total or 0),
            'ultimaSpalare': st.ultima_spalare.isoformat() if st.ultima_spalare else None,
            'topServiciu': top_svc.get(c.id),
            'telefon': c.telefonClient or None,
            'email': c.emailClient or None,
        })

    asc = dir_ == 'asc'
    if sort == 'total':
        result.sort(key=lambda x: x['total'], reverse=not asc)
    elif sort == 'data':
        result.sort(key=lambda x: x['ultimaSpalare'] or '', reverse=not asc)
    else:  # vizite (default)
        result.sort(key=lambda x: x['vizite'], reverse=not asc)

    return jsonify({'clienti': result, 'total': len(result)})


@admin_bp.route('/clienti/<path:plate>/history')
@login_required
@admin_required
def client_history(plate):
    plate = plate.upper()
    client = Clienti.query.filter_by(numarAutoturism=plate).first_or_404()
    rows = Servicii.query.filter_by(clienti_id=client.id).order_by(Servicii.dataSpalare.desc()).all()
    return jsonify({
        'client': {
            'id': client.id,
            'numar': client.numarAutoturism,
            'marca': client.marcaAutoturism,
            'tip': client.tipAutoturism,
        },
        'history': [{
            'id': s.id,
            'serviciu': s.serviciiPrestate,
            'data': s.dataSpalare.isoformat(),
            'pret': float(s.pretServicii or 0),
            'tipPlata': s.tipPlata,
            'nrFirma': s.nrFirma,
        } for s in rows]
    })


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
            'comisionAutoturism': p.comisionAutoturism, 'comisionSUV': p.comisionSUV, 'comisionVan': p.comisionVan,
            'activ': p.activ, 'locatie_id': p.locatie_id,
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


@admin_bp.route('/settings/pret', methods=['POST'])
@login_required
@admin_required
def pret_add():
    data = request.get_json()
    name = data.get('serviciiPrestate', '').strip()
    locatie_id = data.get('locatie_id') or None
    if not name:
        return jsonify({'error': 'Numele serviciului este obligatoriu'}), 400
    if PretServicii.query.filter_by(serviciiPrestate=name, locatie_id=locatie_id).first():
        return jsonify({'error': 'Serviciu deja existent'}), 409
    p = PretServicii(serviciiPrestate=name, locatie_id=locatie_id)
    db.session.add(p)
    db.session.commit()
    return jsonify({
        'id': p.id, 'serviciiPrestate': p.serviciiPrestate,
        'pretAutoturism': p.pretAutoturism, 'pretSUV': p.pretSUV, 'pretVan': p.pretVan,
        'comisionAutoturism': p.comisionAutoturism, 'comisionSUV': p.comisionSUV, 'comisionVan': p.comisionVan,
        'activ': p.activ, 'locatie_id': p.locatie_id,
    }), 201


@admin_bp.route('/settings/pret/<int:id>', methods=['PUT'])
@login_required
@admin_required
def pret_edit(id):
    p = PretServicii.query.get_or_404(id)
    data = request.get_json()
    if 'activ' in data:
        p.activ = bool(data['activ'])
    if 'locatie_id' in data:
        p.locatie_id = data['locatie_id'] or None
    for field in ('pretAutoturism', 'pretSUV', 'pretVan', 'comisionAutoturism', 'comisionSUV', 'comisionVan'):
        if field in data:
            setattr(p, field, float(data[field]))
    db.session.commit()
    return jsonify({
        'id': p.id, 'serviciiPrestate': p.serviciiPrestate,
        'pretAutoturism': p.pretAutoturism, 'pretSUV': p.pretSUV, 'pretVan': p.pretVan,
        'comisionAutoturism': p.comisionAutoturism, 'comisionSUV': p.comisionSUV, 'comisionVan': p.comisionVan,
        'activ': p.activ, 'locatie_id': p.locatie_id,
    })


@admin_bp.route('/settings/pret/<int:id>', methods=['DELETE'])
@login_required
@admin_required
def pret_delete(id):
    p = PretServicii.query.get_or_404(id)
    db.session.delete(p)
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

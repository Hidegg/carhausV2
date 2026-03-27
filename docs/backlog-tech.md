# Technical Backlog — Senior Engineer Perspective
> Carhaus V2 · March 2026

The app is stable and ships. These are the things that will bite you as it grows.

---

## P0 — Fix Before Trusting This in Production

### 1. Hard deletes everywhere
Every delete (services, workers, clients, locations) is permanent. There is no `deleted_at`, no soft delete, no recycle bin. One accidental click from a manager wipes a record permanently. Add a `deleted_at TIMESTAMPTZ` column to `Servicii`, `Clienti`, `Spalatori` and filter it out of every query. Restores become a one-liner.

### 2. No audit log
No record of who changed what or when. A manager changes a payment type from CURS to CASH — there is no trail. A service gets deleted — gone without a trace. A minimal `AuditLog` table (user_id, action, table_name, record_id, old_value JSON, new_value JSON, timestamp) on every write operation would give you accountability and a debuggable history.

### 3. Business logic lives in route handlers
Every calculation — daily window (4am), sequence numbering, price selection, revenue/commission split — is inlined directly inside endpoint functions in `routes.py`. There is no service layer. This means:
- The same logic can't be reused without importing from routes
- Unit testing requires spinning up Flask context even for pure math
- Any future worker (Celery task, CLI script, migration) has to duplicate it

Extract a `services/` layer: `service_service.py`, `report_service.py`, `pricing_service.py`. Routes become thin coordinators.

### 4. No input validation layer
Route handlers call `request.json.get('field')` directly with no schema validation. Wrong types, missing required fields, and unexpected payloads are handled with ad-hoc if-checks or not at all. Use marshmallow or pydantic models at the route boundary. Define schemas once, validate everywhere, get structured error responses for free.

### 5. Error responses are unstructured strings
`return jsonify({'error': 'Serviciu negasit'}), 404` — free-form Romanian strings. The frontend has to string-match on error messages. Define a consistent error envelope: `{code: 'NOT_FOUND', message: '...', field?: '...'}`. This makes frontend error handling predictable and internationalisation possible.

---

## P1 — Architecture & Correctness

### 6. Race condition on `numarCurent`
The daily sequence number is computed as `SELECT COUNT(*) WHERE date = today AND locatie = X` then used as `nr = count + 1`. Under concurrent POSTs this will produce duplicate sequence numbers. Fix: use a DB-level sequence per location per day, or add a `UNIQUE(locatie_id, DATE(dataSpalare), numarCurent)` constraint and handle the conflict.

### 7. Pricing fallback logic is untested
The form endpoint merges location-specific prices with global prices. This merge logic has no dedicated test. Write tests that: (a) location price overrides global for same service, (b) global is used when no location override exists, (c) inactive prices are excluded from the form.

### 8. `GET /admin/overview` and `/zilnic`, `/saptamanal`, `/lunar`, `/spalatori` all return identical data
Five endpoints, one function, zero differentiation. Either they should return genuinely different data (weekly aggregated differently from monthly) or collapse them into one parameterised endpoint `GET /admin/report?period=week`. The current state is dead code risk — if you fix a bug in one, you may not fix the others.

### 9. No pagination on CURS pending
`/api/admin/curs-pending` returns every unpaid service with no limit. A location that's been running for a year with sloppy CURS tracking could return thousands of rows in one response. Add `page`/`per_page` query params.

### 10. Database pool config not visible
Flask-SQLAlchemy defaults to a pool size of 5. On Railway under concurrent load this will exhaust connections and throw `OperationalError: QueuePool limit exceeded`. Set `SQLALCHEMY_POOL_SIZE`, `SQLALCHEMY_MAX_OVERFLOW`, and `SQLALCHEMY_POOL_TIMEOUT` explicitly in the app config so the values are visible and tunable.

### 11. No rate limiting on write endpoints
Only `/api/auth/login` is rate-limited. A compromised manager session could flood `/api/manager/servicii` with thousands of fake service records. Apply `limiter.limit("60/minute")` on POST/PUT/DELETE endpoints.

### 12. Migration chain is fragile
`deploy.py` applies structural changes via raw `ALTER TABLE ... IF NOT EXISTS` SQL as a safety net alongside Alembic. This dual-track approach means the Alembic history diverges from the real schema. Eventually `flask db upgrade` will try to add a column that already exists and fail. Decide: either trust Alembic fully and remove the guards, or drop Alembic and go fully with explicit migration scripts. Mixing both is technical debt that will cause a production outage.

---

## P2 — Testing Gaps

### 13. `/api/admin/istoric` has zero test coverage
The most complex query in the codebase — date bucketing, week splits, per-location aggregation — has no tests. Write at minimum:
- Annual view returns 12 monthly buckets
- Monthly view returns correct week buckets (1-7, 8-14, 15-21, 22-end)
- Correct handling of leap years and short months
- locatie filter scopes the data

### 14. Dev routes have minimal coverage
`/api/dev/overview`, `/api/dev/clients`, `/api/dev/accounts` CRUD are mostly untested. Cover: create account, prevent deleting own account, pagination on client list.

### 15. No integration tests for the deploy sequence
`deploy.py` + `initialize.py` + `seed_services.py` run in sequence on every deploy. There is no test that exercises this chain on a clean database. A test that runs all three scripts against a blank PostgreSQL instance and asserts the expected state would catch most deploy failures before they hit Railway.

### 16. Playwright tests don't run in CI
The `playwright.config.ts` exists and the tests are written but there is no GitHub Actions workflow that runs them against the deployed URL. Add a workflow: `on: [push]` → build → deploy → wait → run E2E. Without CI the tests are documentation, not guards.

---

## P3 — Nice-to-Have Improvements

### 17. Logging
No `logger = logging.getLogger(__name__)` anywhere in the backend. Production errors are invisible unless Railway captures stdout. Add structured logging (JSON format) on every state-changing operation and on errors. Log: user_id, locatie_id, action, duration.

### 18. `conftest.py` fixtures are tight
The test fixtures create data inline. Any schema change requires updating fixtures in multiple places. Consider factory functions (factory_boy or simple dicts) that generate model instances with defaults. This makes adding new required fields a one-place change.

### 19. No type stubs on API responses
The frontend `api.ts` (or equivalent) has functions that return `any` or loose `Promise<T>` types. Define TypeScript interfaces that mirror the backend JSON shapes. This makes API changes immediately visible as type errors in the frontend before runtime.

### 20. `seed_e2e.py` and `seed_services.py` have overlapping concerns
Two seed scripts with different data shapes. If you change a model you need to update both. Consolidate into one seed script with a `--mode e2e` flag that seeds minimal deterministic data, and `--mode demo` for full 60-day history.

---

## Summary Priority Order

| # | Issue | Effort | Risk if ignored |
|---|-------|--------|----------------|
| 1 | Soft deletes | Medium | Data loss, no recovery |
| 2 | Audit log | Medium | No accountability |
| 3 | Service layer | Large | Scaling/maintenance wall |
| 4 | Input validation schemas | Medium | Silent bugs, XSS surface |
| 5 | Race condition on numarCurent | Small | Duplicate sequence numbers |
| 6 | Audit `/historic` tests | Small | Silent regression |
| 7 | DB pool config | Tiny | Prod outage under load |
| 8 | E2E in CI | Small | Tests that never run |

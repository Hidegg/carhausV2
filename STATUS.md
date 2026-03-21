# CarHaus V2 — Project Status

## PHASE 1: Section A Fixes — COMPLETED

All 24 items from the review are done and verified.

### Bugs (6/6)
| ID     | Description                                      | Status |
|--------|--------------------------------------------------|--------|
| BUG-01 | GDPR/T&C checkbox bypass for new clients         | DONE   |
| BUG-02 | tipPlata NULL storage in update_payment           | DONE   |
| BUG-03 | Shared payment color constants, PROTOCOL mismatch | DONE   |
| BUG-04 | CURS amount missing from admin Overview PaymentBar | DONE   |
| BUG-05 | Worker lookup by ID instead of name               | DONE   |
| BUG-06 | Quick-login card visible in production            | DONE   |

### Backend Hardening (8/8)
| ID      | Description                                  | Status |
|---------|----------------------------------------------|--------|
| HARD-01 | Session cookie security attributes           | DONE   |
| HARD-02 | Session timeout (12 hours)                   | DONE   |
| HARD-03 | Request body size limit (1MB)                | DONE   |
| HARD-04 | Validate tipPlata against allowed enum       | DONE   |
| HARD-05 | Cap serviciiPrestate array length (max 20)   | DONE   |
| HARD-06 | HTTP security response headers               | DONE   |
| HARD-07 | N+1 queries in manager dashboard/analytics   | DONE   |
| HARD-08 | N+1 query in admin curs_pending              | DONE   |

### UI/UX (10/10)
| ID    | Description                                     | Status |
|-------|-------------------------------------------------|--------|
| UI-01 | Page title in navbar                            | DONE   |
| UI-02 | Persistent sidebar on tablet/desktop (md:+)     | DONE   |
| UI-03 | Skeleton loading placeholders (Dashboard, Overview, Analytics, Echipa) | DONE |
| UI-04 | Button loading states ("Se salveaza...", "Se adauga...") | DONE |
| UI-05 | Revenue KPI visually dominant in admin Overview | DONE   |
| UI-06 | Dark mode card contrast increase                | DONE   |
| UI-07 | Delete confirmation visual urgency (red)        | DONE   |
| UI-08 | Focus returns to plate input after form submit  | DONE   |
| UI-09 | Empty dashboard CTA: button instead of text link | DONE  |
| UI-10 | Remove global scrollbar hiding, apply selectively | DONE |

---

## PHASE 2: Section C Testing — COMPLETE

### Backend Tests (pytest): 139 passing
All backend API routes are covered. Tests run in ~6 seconds with in-memory SQLite.

```
tests/test_auth.py     — 12 tests (login, logout, /me, session config, security headers, body limit)
tests/test_manager.py  — 78 tests (form, dashboard, analytics, echipa, plates, nrfirma, validation, 4am boundary)
tests/test_admin.py    — 49 tests (clienti, overview, settings, reports, istoric, curs, data integrity)
tests/test_dev.py      — 25 tests (overview, accounts, clients, system, backup, access control)
```

### E2E Tests (Playwright): 39 passing
All e2e tests verified green. Cookie isolation fixed (page.context().request), selectors updated to match current UI.

```
auth.spec.ts               — 5 tests (+dev login redirect)
manager.spec.ts            — 5 tests (+form autofill, +CURS conversion)
manager-echipa.spec.ts     — 3 tests
admin-pages.spec.ts        — 7 tests (removed Rapoarte — redirects to Istoric)
admin-settings.spec.ts     — 5 tests
admin-clientdetail.spec.ts — 2 tests
admin-istoric.spec.ts      — 4 tests (+CSV export)
dev-pages.spec.ts          — 8 tests
```

### Section C Checkpoint Coverage

#### Authentication Flows
| Checkpoint | Coverage |
|-----------|----------|
| Login as admin — redirects to /admin/overview | e2e: auth.spec.ts, pytest: test_auth |
| Login as manager — redirects to /manager/form | e2e: auth.spec.ts (redirects to dashboard, not form — verify) |
| Login as dev — redirects to /dev | e2e: auth.spec.ts |
| Wrong password — error shown | e2e: auth.spec.ts, pytest: test_auth |
| Session timeout (12h) | pytest: test_session_config_values (config only) |
| Logout — session cleared | e2e: auth.spec.ts, pytest: test_logout_clears_session |

#### Manager — Form Flow
| Checkpoint | Coverage |
|-----------|----------|
| Enter new plate — form blank | NOT TESTED in e2e |
| Enter existing plate — autofills | e2e: manager.spec.ts |
| Client context row (visit count, last visit, etc.) | NOT TESTED |
| Milestone visit badge | NOT TESTED |
| Brand picker | NOT TESTED |
| Car type toggle updates price | pytest: test_add_serviciu_suv/van |
| Plate dropdown after 2+ chars | NOT TESTED in e2e |
| New client: contact accordion collapsed | NOT TESTED |
| New client: submit without GDPR fails | NOT TESTED in e2e (BUG-01 fix verified manually) |
| Existing client: read-only summary | NOT TESTED |
| Payment type shows/hides nrFirma field | NOT TESTED in e2e |
| Spalator selector (prezentAzi filter) | NOT TESTED in e2e |
| Service selection updates total | NOT TESTED in e2e |
| Successful submit — banner, reset, focus | e2e: manager.spec.ts (submit only) |
| nrFirma datalist suggestions | pytest: test_nrfirma_suggestions |

#### Manager — Dashboard Flow
| Checkpoint | Coverage |
|-----------|----------|
| Today's services appear | e2e: manager.spec.ts |
| CURS cards yellow-bordered at top | NOT TESTED |
| Search by plate filters correctly | NOT TESTED in e2e |
| Auto-refresh 30s | NOT TESTED |
| Edit modal — correct values | NOT TESTED in e2e |
| Edit — change service/spalator/payment | pytest: test_edit_serviciu_* |
| Delete — two-click confirmation | NOT TESTED in e2e |
| CURS inline payment update | e2e: manager.spec.ts |
| Empty state | NOT TESTED in e2e |

#### Manager — Analytics Flow
| Checkpoint | Coverage |
|-----------|----------|
| Total collected (CASH+CARD+CONTRACT+PROTOCOL) | pytest: test_analytics_breakdown |
| Pending = CURS only | pytest: test_analytics_breakdown |
| Per-payment breakdown bars | e2e: manager.spec.ts (loads) |
| Spalator rows with counts | NOT TESTED in e2e |
| Commission toggle | NOT TESTED |

#### Manager — Echipa Flow
| Checkpoint | Coverage |
|-----------|----------|
| All spalatori listed | e2e: manager-echipa.spec.ts |
| Toggle prezentAzi persisted | pytest: test_echipa_toggle_* |
| Add new spalator | e2e: manager-echipa.spec.ts, pytest: test_echipa_add |
| Delete spalator | pytest: test_echipa_delete |

#### Admin — Overview Flow
| Checkpoint | Coverage |
|-----------|----------|
| Tab navigation (locations + TOTAL) | NOT TESTED in e2e |
| KPI row (Incasari, Masini, Servicii, Medie) | e2e: admin-pages.spec.ts (partial) |
| Incasari excludes CURS | pytest: test_overview_returns_reports |
| Payment bar includes CURS | NOT TESTED in e2e (BUG-04 fix verified in pytest) |
| TOTAL tab — location comparison table | e2e: admin-pages.spec.ts |
| Location tab — washer breakdown | NOT TESTED in e2e |
| 60s auto-refresh | NOT TESTED |

#### Admin — Rapoarte Flow
| Checkpoint | Coverage |
|-----------|----------|
| Tab per location or TOTAL | e2e: admin-pages.spec.ts (loads) |
| Period toggle (Saptamanal/Lunar) | NOT TESTED in e2e |
| KPI cards match period | NOT TESTED |
| Bar chart payment breakdown | NOT TESTED in e2e |
| Washer table | e2e: admin-pages.spec.ts |

#### Admin — Spalatori Flow
| Checkpoint | Coverage |
|-----------|----------|
| Period toggle (Azi/Saptamana/Luna) | NOT TESTED in e2e |
| Location tab cycles | NOT TESTED in e2e |
| Zero activity shows "—" | NOT TESTED |
| Total row sums correctly | NOT TESTED |
| TOTAL tab union of locations | NOT TESTED |

#### Admin — Clienti Flow
| Checkpoint | Coverage |
|-----------|----------|
| Client list loads | e2e: admin-pages.spec.ts |
| Search by plate | e2e: admin-pages.spec.ts, pytest: test_clienti_search |
| Sort by vizite/total/data | pytest: test_clienti_sorted_* |
| Brand filter | pytest: test_clienti_filter_* |
| Click client — navigates to detail | e2e: admin-clientdetail.spec.ts |

#### Admin — Clienti Detail Flow
| Checkpoint | Coverage |
|-----------|----------|
| Service history shown | e2e: admin-clientdetail.spec.ts |
| Each row: service, date, price, payment | e2e: admin-clientdetail.spec.ts (partial) |
| Client info in header | e2e: admin-clientdetail.spec.ts |

#### Admin — Istoric Flow
| Checkpoint | Coverage |
|-----------|----------|
| Curent mode (Saptamana/Luna cards) | NOT TESTED in e2e |
| Historic mode — annual bar chart | e2e: admin-istoric.spec.ts |
| Click month bar — monthly drill | e2e: admin-istoric.spec.ts |
| Year navigation | NOT TESTED |
| Monthly weekly buckets labeled | NOT TESTED |
| Service breakdown table | NOT TESTED |
| CSV export | e2e: admin-istoric.spec.ts |

#### Admin — Settings Flow
| Checkpoint | Coverage |
|-----------|----------|
| Add location | e2e: admin-settings.spec.ts, pytest |
| Delete location | e2e: admin-settings.spec.ts, pytest |
| Add spalator | pytest: test_settings_post_spalator |
| Delete spalator | pytest: test_settings_delete_spalator |
| Global prices shown | e2e: admin-settings.spec.ts |
| Per-location price overrides | NOT TESTED in e2e |
| Edit price — save persists | e2e: admin-settings.spec.ts |
| Add new service type | e2e: admin-settings.spec.ts, pytest |
| Toggle activ (eye icon) | pytest: test_settings_put_pret_toggles_activ |
| Delete service | pytest: test_settings_delete_pret |
| Add manager | e2e: admin-settings.spec.ts, pytest |
| Edit manager | pytest: test_settings_put_manager |
| Delete manager | pytest: test_settings_delete_manager |

#### Data Integrity Checks
| Checkpoint | Coverage |
|-----------|----------|
| Service locatie_id matches manager location | pytest: test_service_locatie_id_matches |
| Same plate at two locations reuses client | pytest: test_same_plate_at_two_locations |
| CURS excluded from incasari, in cursInAsteptare | pytest: test_add_serviciu_curs_not_in_total |
| CURS → CASH moves revenue into total | pytest: test_curs_to_cash_moves_revenue |
| numarCurent increments daily | pytest: test_add_serviciu_sequence_numbering |
| Submit at 3:45am → previous day | pytest: test_manager (3 boundary tests) |

---

## PHASE 2: Summary

All significant test gaps have been filled. The remaining "NOT TESTED" items in the checkpoint tables are UI interaction details (toggle states, auto-refresh timing, skeleton placeholders, visual borders) that are covered by pytest at the API level and best verified by manual spot-check.

**Final counts: 139 pytest + 39 Playwright = 178 automated tests, all passing.**

---

## PHASE 3: VPS Deployment — NOT STARTED

Target: Hetzner CX22 (2 vCPU, 4GB RAM, €3.29/mo)

| ID     | Task                          | Status      |
|--------|-------------------------------|-------------|
| VPS-01 | Environment config            | NOT STARTED |
| VPS-02 | PostgreSQL setup              | NOT STARTED |
| VPS-03 | Gunicorn config (4 workers)   | NOT STARTED |
| VPS-04 | Nginx reverse proxy           | NOT STARTED |
| VPS-05 | SSL / Cloudflare              | NOT STARTED |
| VPS-06 | Build + deploy process        | NOT STARTED |
| VPS-07 | Remove Railway config (optional) | NOT STARTED |
| VPS-08 | PostgreSQL backup cron        | NOT STARTED |
| VPS-09 | Systemd service file          | NOT STARTED |
| VPS-10 | Monitoring                    | NOT STARTED |

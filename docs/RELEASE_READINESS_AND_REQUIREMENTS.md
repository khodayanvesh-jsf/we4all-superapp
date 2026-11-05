# WE4ALL — Requirements Traceability, Restoration Register & Launch Gate

**Baseline reviewed:** repository `main` at 4b107322 (2026-11-05), review branch `fix/payment-safety-guest-default`, supplied Android APK labelled v3.2.7, uploaded master architecture HTML/text, and the exported development discussions available in the project archive.

**Target date:** Sunday, 2026-11-08 (Asia/Kolkata). This date is a target for a controlled Adilabad pilot only if the go/no-go criteria below are met. It is not a promise that every production feature can be completed or safely released by that date.

## 1. Non-negotiable development/change-control rules

1. The master architecture document and accepted conversation requirements are the product baseline. Existing features must not be silently removed, hidden, renamed, or behaviorally changed.
2. Before a feature is changed, record its requirement ID, current implementation evidence, reason for change, data migration impact, owner approval, tests, and release note.
3. New scope is additive unless the founder explicitly approves a replacement or removal. Deprecation requires a migration/compatibility plan.
4. Demo/simulated behavior must be visibly labelled and must never masquerade as a completed payment, OTP, KYC, GPS, dispatch, settlement, e-signature, biometric or security operation.
5. No production deployment, database destructive migration, payment activation, secret rotation, or public launch without a verified backup and a documented rollback.
6. Main remains protected by reviewable pull requests. Work proceeds on feature branches; merge only after required tests/review and founder release approval.
7. Maintain a feature registry and automated tests for each portal. Every release must compare the registry with the previous release to detect accidental feature loss.

## 2. Current evidence and confirmed risks

| Area | Evidence from reviewed files | Required action |
|---|---|---|
| Source of truth | GitHub main has a modular React/Vite app, API relay, Supabase SQL and Capacitor Android project. The APK embeds a compiled web bundle and is not the same artifact as the current source checkout. | Create reproducible source-to-web-to-APK release pipeline and attach source commit/build metadata to each build. |
| Version identity | package.json and Android Gradle show 3.2.7; OTA manifest also shows 3.2.7. Capacitor config appId is `com.khodayanvesh.we4all`; Android applicationId is `com.we4all.superapp`. | Choose one canonical application ID; assess installed-app migration/update implications before changing it. Derive version from one release source. |
| Login/OTP | Older owner-profile flow creates OTP locally, exposes it in the UI and auto-fills the entered value; registration stores PIN and user records in browser state. | Server-side OTP provider, expiry, attempt limits, rate limits, one-time use, secure password/PIN hashing, real sessions and account recovery. |
| Founder access | Frontend contains hard-coded fallback founder credentials and client-side credential storage. | Server-validated founder authentication, MFA/step-up, RBAC, audit log, recovery procedure; remove secrets from browser bundle and repository history where applicable. Rotate any credential/key exposed in exports or source. |
| UPI/payment | Existing UPI modal had a fixed payee placeholder and called success after a timer; parent/child prop names were inconsistent. | Payment-provider integration or verified merchant VPA configuration, signed server webhook/callback, idempotent reconciliation and refund ledger. Never infer payment from app launch. |
| Cloud sync | `api/sync.js` accepts arbitrary incoming state and caller-supplied Supabase URL/key, responds with success even when persistence failed, and uses process-global in-memory state as fallback. | Replace whole-app state relay with authenticated domain APIs and tenant/role policies. Return failure on failed persistence. Validate payloads, prevent arbitrary endpoint/key relay and eliminate process memory as source of truth. |
| Database | Uploaded SQL has permissive public `FOR ALL` policies on state/orders, with no per-user or per-role authorization. Current sync code references a different table name than the schema in another SQL file. | Reconcile schema/table names; private-by-default RLS; owner/role/zone scoped policies; migration history; foreign keys, constraints, indexes and restore-tested backups. |
| Storage | App has upload helper for a public media bucket and some document use cases include KYC/identity. | Separate public product media from private KYC/bank/identity documents. Private buckets, path ownership, signed URLs, MIME/size validation, retention/deletion, audit and backup strategy. |
| Error handling | A security helper contained undefined `StringString()`; old integrity guard returned a fixed success string rather than verifying a signature. | Fix runtime errors, fail closed for unsigned OTA, add crash telemetry, global error boundaries, retry/backoff and safe user messaging. |
| Android | Source Capacitor/Gradle IDs and version settings need reconciliation. APK signing scheme/manifest attributes require Android SDK tooling for authoritative validation. | Decode APK manifest with Android SDK tools; verify signer with apksigner; review network policy, backup rules, permissions, target SDK, deep links and plugin registration. |
| OTA | Previous OTA path updated version labels and simulated staged progress; it did not download/verify/install a signed artifact. | Signed release manifest, hash + signature check, compatibility gate, atomic install/rollback and staged rollout. Until implemented, OTA install must remain disabled. |

## 3. Requirements register — preserve and complete every portal

Legend: **P0** = launch blocker; **P1** = required for complete launch scope; **P2** = planned enhancement. Status is intentionally conservative: a UI component is not proof of end-to-end completion.

### CUS — Customer Super-App

| ID | Requirement to preserve/implement | Priority | Acceptance evidence |
|---|---|---:|---|
| CUS-001 | Open directly to customer home; guest browsing without forced sign-in | P0 | Fresh install shows guest; catalogue/search/cart available without account |
| CUS-002 | Ask for sign-in/registration at protected checkout/action boundary; retain cart during auth | P0 | Guest checkout prompts auth; cart survives login and reload |
| CUS-003 | Amazon-style uncluttered header; customer order/notification surfaces | P1 | Responsive screen and navigation tests |
| CUS-004 | Ten category grid: Kirana, fresh vegetables, meat/fish, cement/steel, medicines, labour/mistri, one-hour services, decor/halls, 2W/3W/4W rides, Kisan Mandi | P0 | Category registry test verifies all ten and correct portal routing |
| CUS-005 | Dynamic admin-created categories/modules including Kisan Mandi and MediHub | P1 | Create, publish, edit, disable and restore module without code deployment |
| CUS-006 | Multi-shop price comparison per product, variant selection and merchant offers | P1 | Offer sorting, merchant attribution, stock/price consistency tests |
| CUS-007 | Inline quantity steppers and separate carts/flows for goods, services, decor and rides | P0 | Quantity, subtotal, remove, empty and cross-cart isolation tests |
| CUS-008 | Guest cart persistence and multi-device signed-in cart behavior | P1 | Reload/offline/re-login synchronization tests |
| CUS-009 | Address book, distance/zone-aware availability and delivery estimate | P1 | Address validation and distance/fee boundary tests |
| CUS-010 | Weight gated vehicle selection: 2W up to 45 kg, 3W up to 300 kg, 4W above 300 kg / up to 2,000 kg as stated in master spec | P0 | Boundary tests at 45, 45.01, 300, 300.01 and maximum capacity |
| CUS-011 | GST/fees/total calculator and downloadable order/invoice history | P0 | Shared calculation library, rounding/tax tests and invoice reconciliation |
| CUS-012 | Six-language UI and town/state slang dictionaries; English default | P1 | Translation coverage report, fallback and language persistence tests |
| CUS-013 | Voice search, reorder, substitutions, WhatsApp sharing | P2 | Feature-specific browser/device tests; no toast-only mock behavior |
| CUS-014 | Order tracking, cancellation, refunds and support/dispute path | P0 | State machine, actor permissions, idempotency and audit tests |

### MER — Product Merchant Portal

| ID | Requirement | Priority | Acceptance evidence |
|---|---|---:|---|
| MER-001 | Separate merchant role with onboarding, KYC and founder approval | P0 | Unapproved account cannot publish/manage live listings |
| MER-002 | Incoming order queue; accept/reject, heavy-load and Hamali fee fields | P0 | Order ownership and permitted state-transition tests |
| MER-003 | Dispatch request to eligible captain | P1 | Dispatch job created once; eligible vehicle capacity enforced |
| MER-004 | Stock manual: in/out, quantity adjustment, low-stock warning | P0 | Concurrent stock decrement and oversell prevention |
| MER-005 | Inline selling price/MRP edits with history | P1 | Price audit and validation |
| MER-006 | Add brand/product and multi-variant inventory | P0 | Required fields, duplicate, image, price and stock validation |
| MER-007 | Bulk Excel/CSV template import with row-level errors and rollback | P1 | Valid/invalid file fixtures and partial-failure report |
| MER-008 | Billing imports: Tally Prime, Marg ERP, Busy, Vyapar and retail POS | P2 | Document supported formats/mapping; import reconciliation tests |
| MER-009 | Barcode scan (camera/manual) and loud order buzzer | P1 | Supported-device tests and accessibility/manual fallback |
| MER-010 | GST invoice ledger, PDF/print, merchant settlement statement | P0 | Tax calculations reconcile with order/payment/settlement records |

### SRV — Home Service Provider Portal

| ID | Requirement | Priority | Acceptance evidence |
|---|---|---:|---|
| SRV-001 | Provider onboarding, category/trade, KYC and approval | P0 | Approval gate and role-scope tests |
| SRV-002 | Plumber/electrician/AC/carpenter and configurable service catalogue | P1 | Admin-managed catalogue renders and routes dynamically |
| SRV-003 | One-hour availability calendar, slots, blackout periods and conflict prevention | P0 | Concurrent booking/slot-lock tests |
| SRV-004 | Visiting-fee escrow/hold; customer 4-digit Happy Code to release | P0 | Payment callback creates hold; only correct authorized code releases |
| SRV-005 | Spare-parts estimate submitted for customer approval | P1 | Customer accepts/rejects; no unapproved charge |
| SRV-006 | Seven-day warranty record/badge | P1 | Warranty start/end, claim and audit tests |
| SRV-007 | Arrival/status updates, cancellation, dispute and payout | P1 | State machine and settlement tests |

### DEC — Decorator & Function Hall Portal

| ID | Requirement | Priority | Acceptance evidence |
|---|---|---:|---|
| DEC-001 | Separate decorator/hall partner onboarding and founder approval | P0 | Partner cannot publish before KYC approval |
| DEC-002 | High-resolution portfolio/gallery and package catalogue | P1 | Private/public media policy and upload validation |
| DEC-003 | Function hall availability, capacity and event-date calendar | P0 | Capacity/date conflict tests |
| DEC-004 | Reverse bidding/competitive quote desk | P1 | Bid revision, deadline, winner and audit trail |
| DEC-005 | Advance rule: 35% when event is at least 5 days away; 85% when under 5 days away | P0 | Exact tests at five days and less than five days; rule is configurable/versioned only by authorized founder |
| DEC-006 | Guest/package slider and quote breakdown | P1 | Price recomputation and transparent total |
| DEC-007 | Escrow stages, cancellation/refund and completion proof | P0 | Server-confirmed ledger and dispute path |

### RID — Delivery Captain & Taxi Portal

| ID | Requirement | Priority | Acceptance evidence |
|---|---|---:|---|
| RID-001 | Rider onboarding, identity/vehicle KYC and founder approval | P0 | No dispatch before approval |
| RID-002 | 2W/3W/4W registration and strict vehicle-class isolation | P0 | Cross-class access and capacity tests |
| RID-003 | Universal delivery radar across eligible order modules | P1 | Assignment uniqueness and eligibility filtering |
| RID-004 | Live GPS, 3-point route map and Google Maps turn-by-turn navigation | P1 | Explicit runtime permission, foreground/background behavior, battery and GPS denial tests |
| RID-005 | Two-way doorstep OTP/customer handoff verification | P0 | Server generated OTP, expiry, attempt limit, order binding and single-use |
| RID-006 | Fixed/locked kilometer rate card and surge/bonus controls | P1 | Versioned rate card and fee calculation tests |
| RID-007 | UPI payment request/payout workflow | P1 | Provider callback/reconciliation; no client assertion of payout |
| RID-008 | 09:00 AM auto-online duty | P2 | User consent, timezone, OS background limitations and opt-out |
| RID-009 | Net profit calculator | P1 | Transparent gross, fees, expenses, net and settlement reconciliation |
| RID-010 | Taxi booking with pickup/drop, 2W/3W/4W capacity and fare | P1 | Quote acceptance, trip state and cancellation tests |

### LAB — Labour & Worksite Adda

| ID | Requirement | Priority | Acceptance evidence |
|---|---|---:|---|
| LAB-001 | Six trades: Mason/Gavandi/Kothanar; Helper/Kooli/Bigari/Chithaal; Hamali/Mathadi; Centring/Sarya; Tiles/Painter; Farm Harvest Toli | P0 | Trade registry completeness test |
| LAB-002 | Individual worker or Mistri Toli/group registration | P0 | Group size, leader and worker consent validation |
| LAB-003 | Full day (9 AM–5:30 PM), half day and contract pricing | P1 | Duration/rate boundary and quote tests |
| LAB-004 | Tools included list and Adda pickup option | P1 | Booking details shown to both parties |
| LAB-005 | Two-step muster roll: morning start OTP and evening wage-release OTP | P0 | Server OTP lifecycle, attendance record and payment verification |
| LAB-006 | Worksite, customer, worker/toli, timesheet and wage ledger | P0 | Role-scoped access and ledger reconciliation |
| LAB-007 | Cancellation, absence, partial day, dispute and wage correction | P1 | Audited adjustment and dual confirmation where required |

### FND — Founder Master Admin

| ID | Requirement | Priority | Acceptance evidence |
|---|---|---:|---|
| FND-001 | Separate founder web console and two-step security gate | P0 | Server-side MFA/step-up, not frontend password comparison |
| FND-002 | Partner queues and mandatory five-point KYC checklist | P0 | Each checklist item evidence-backed; approval/rejection audited |
| FND-003 | Terms acceptance and digital-signature record | P0 | Versioned terms, signer identity, timestamp and evidence; no false e-sign claims |
| FND-004 | Colony/zone demand heatmap | P1 | Consent-aware aggregate location analytics; privacy thresholds |
| FND-005 | Captain surge bonus switch | P1 | Versioned configuration, audit and calculation proof |
| FND-006 | No-code dynamic module/category/portal generator | P1 | Schema validation, versioned publish, compatibility and rollback |
| FND-007 | Dynamic moderation, category kill switch, approval and rejection reasons | P1 | Role permissions and full audit history |
| FND-008 | Founder finance console, commissions, platform fees and settlements | P0 | Reconcile order, payment, refund, tax and payout ledgers |
| FND-009 | Device/session telemetry and device management | P1 | Minimize PII, explicit permission, retention and secure display |
| FND-010 | OTA broadcaster | P1 | Signed update manifest/artifact, hash/signature verification, staged rollout and rollback; no simulated progress |
| FND-011 | N-portal/split-screen diagnostic lab | P2 | Isolated test identities/data; never expose multi-role test bypass to production |
| FND-012 | Backup/restore, data export, audit log and incident controls | P0 | Restore drill, log integrity, authorized access and emergency procedure |

## 4. Cross-cutting platform requirements

| ID | Area | Acceptance requirement |
|---|---|---|
| PLT-001 | Authentication | Supabase Auth or trusted backend identity; phone OTP via provider; server-side sessions; secure logout/revocation; no PIN/password in localStorage or synced JSON |
| PLT-002 | RBAC | Server-enforced roles and ownership for customer, merchant, service, decorator, rider, labour, founder and support/admin staff |
| PLT-003 | Multi-zone tenancy | Every business record has zone/tenant scope; Adilabad is launch zone; no cross-zone data leakage |
| PLT-004 | Database | Versioned SQL migrations, foreign keys, check constraints, indexes, transaction boundaries and documented schema ownership |
| PLT-005 | RLS | Default deny; authenticated role/owner/zone-specific policies; no public `FOR ALL` policy for order, state, KYC or financial data |
| PLT-006 | Storage | Public product media separated from private identity/KYC/bank/signature documents; signed URLs, file size/type rules and retention |
| PLT-007 | Sync | Server is source of truth; conflict strategy, revision/version, idempotency, retry/backoff, outbox, no process-memory-only persistence |
| PLT-008 | Offline | Cached read-only catalogue where safe; queued mutations with unique idempotency keys; visible pending/synced/failed state |
| PLT-009 | Payments | Provider-generated order/transaction references, webhook signature verification, amount/currency/order match, dedupe, reconciliation and refunds |
| PLT-010 | Notifications | Push token registration, server queue, target scope, user preferences, delivery status and fallback inbox |
| PLT-011 | Security/privacy | HTTPS only, CSP, no secrets in browser build, least privilege, PII minimization, audit, retention/deletion, secure backups |
| PLT-012 | Reliability | Global error boundaries plus route/component recovery, structured logs, crash reporting, timeout handling, bounded retry, no silent catch on critical writes |
| PLT-013 | Accessibility/localization | Keyboard and screen-reader support, readable contrast, locale-aware dates/currency, translation coverage |
| PLT-014 | Release identity | Canonical Android package ID, one version source, reproducible artifacts, signed APK/AAB, checksum, provenance and changelog |
| PLT-015 | OTA | Do not trust version text or client-computed hash; verify signed manifest/artifact using pinned public key before applying |
| PLT-016 | Observability | Crash-free sessions, API errors/latency, payment failure, order state drift, sync delay and notification delivery dashboards |

## 5. Release plan — 6 to 8 November 2026

### 6 Nov — Baseline and stop-the-bleeding
- Freeze feature removal; establish main/tag/branch backup and source-of-truth commit.
- Verify APK with Android SDK tools (decoded manifest, signer, app ID, version, permissions, target SDK and embedded bundle).
- Reconcile package IDs/versioning and inventory all source modules/routes.
- Finish payment/OTP false-success removal and OTA fail-closed guard.
- Resolve backend endpoint/table mismatch and immediately restrict unsafe public database policies after a backup and migration plan.
- Build test fixtures and feature registry.

### 7 Nov — Pilot-critical workflow validation
- Validate real authentication, merchant onboarding/approval, catalogue/stock, guest cart, checkout, order acceptance, dispatch and fulfilment end to end.
- Validate service booking, decorator deposit rules and labour muster only if their trusted backend workflows exist; otherwise keep them disabled or explicitly marked pilot/manual.
- Validate backup/restore, network loss/retry, duplicate request, session expiry, role isolation and data access policies.
- Build signed release candidate from a clean checkout; run web build, unit/integration/e2e tests and Android install/upgrade smoke tests.
- Collect founder/business acceptance and operational readiness (merchant inventory, captain coverage, support contact, refund handling).

### 8 Nov — Controlled pilot go/no-go
A limited Adilabad pilot may proceed only if:
- No P0 security or data-loss issue remains open.
- Authentication and all enabled privileged actions are server-authorized.
- Orders cannot be marked paid without server-confirmed payment; any unsupported payment method remains disabled.
- Order totals, taxes, delivery fees and state transitions reconcile.
- RLS/storage access tests prove no cross-user/role/zone leakage.
- Backup and restore succeeds from a fresh environment.
- Signed APK installs/upgrades; package identity is correct; smoke tests pass on representative Android devices.
- Crash/error reporting and support/rollback owners are active.
- The founder explicitly approves the pilot scope and build hash.

**If any P0 criterion fails, do not release the affected flow.** A staged pilot with a smaller verified feature set is safer than opening every portal with mocked or insecure functionality.

## 6. Launch scope recommendation

Given the two-day target, treat 8 November as a **controlled pilot date**, not a nationwide public launch. Start only with the workflows that pass the release gate. Do not activate real money flows, identity-document upload, background location collection, automated wages, escrow or OTA until their server-side and operational controls are verified.

Candidate pilot modules (only after all P0 checks): guest browse/search, approved merchant catalogue and stock, verified customer sign-in, order creation/merchant acceptance, and explicitly supported fulfilment/payment methods. Every other module must remain available only if its own acceptance checks pass; otherwise mark it clearly as coming soon/limited pilot without deleting its code or requirements.

## 7. Required test layers and exit criteria

- Pure unit tests: order math, 45kg/300kg vehicle thresholds, tax rounding, 35%/85% advance threshold, OTP expiry/attempts, permissions, role mapping and validation.
- Component tests: guest/auth gates, cart, forms, portal isolation, empty/loading/error states and accessibility.
- API integration: authentication, RLS, storage signed URLs, idempotency, database transactions, payment webhooks and notification queue.
- End-to-end: customer → merchant → captain → delivery; customer → service provider → Happy Code; customer → decorator → reverse bid → escrow; employer → labour group → attendance → wage release.
- Reliability: slow/offline network, server timeout, process death/restart, duplicate submission, stale sessions, low storage, permission denied, app upgrade and rollback.
- Security: unauthorized API, forged role, IDOR, cross-zone access, public bucket exposure, secret scan and signed OTA tampering.
- Android: clean install, existing v3.2.7 upgrade compatibility, permissions denial/regrant, deep links, GPS background rules, push delivery, rotation/process recreation and release signer verification.

**No release is declared crash-proof.** Release evidence must report measured tests, unresolved defects and supported device/network conditions.

## 8. Current branch work already proposed

The review branch `fix/payment-safety-guest-default` contains:
- Guest fallback for clean installs.
- Corrected UPI modal prop contract.
- Removal of client-side “payment succeeded” transitions after opening a UPI app.
- UPI intent guard requiring a valid amount and explicitly verified VPA.
- Fail-closed OTA verification until real signed-release verification is built.
- Fixed undefined function in government-ID redaction.
- Ten-tile customer quick-entry grid is restored while retaining the existing five-tab navigation; Kisan Mandi is seeded as a catalogue category. The dedicated Kisan Mandi farmer onboarding/marketplace and MediHub pharmacy-specific workflows are still incomplete.
- Fixed the customer category translation helper call to pass the category object and language code expected by the helper.
- Ten Node unit tests (seven payment/security helpers plus three category registry/route checks).
- Capacitor/Android package identity alignment, packaged web assets (no remote WebView override), HTTPS-only WebView traffic, conservative Android backup setting and foreground location permissions.
- Reproducible Android CI build workflow and local Windows build instructions using JDK 21.
- This requirements register and change-control/launch gate.

**Latest observed CI evidence (6 Nov 2026):**
- Latest branch commit: `07c64ffd74e9f69fa0841ac2ed6c961f3cd93624`.
- `npm ci`: passed.
- `npm test`: 10/10 passed (payment/security helpers plus ten-category registry/routing checks).
- `npm run build`: passed; Vite emitted the production bundle.
- `npx cap sync android`: passed.
- Android `assembleDebug`: passed with JDK 21; debug APK artifact was uploaded by GitHub Actions run 42100565545.
- Artifact: `WE4ALL-debug-7d4100a27b1a2641502081e56da7becde910dea6`; APK SHA-256: `69fb2aa42f45ace3e5123cfca45f3c4f417485288202b530e8d30cd9bef06ef3`.
- This is a debug/testing APK, not a production-signed release. It has not been installed and exercised on a physical Android device as part of this review.
- npm install reported 8 dependency advisories (7 moderate, 1 high); identify and resolve the high-severity issue before public release.
- Vercel preview reported Ready; this is a web preview, not a native APK or device-stability certification.

The work is in draft PR #1 and is not merged into production. Successful JavaScript tests/web build/Capacitor sync do not prove backend security, payment processing, all portal workflows or physical-device stability. The current Supabase schema policies and state sync relay remain launch blockers until authenticated and role/zone-scoped.

## 9. Founder approval and release decision log

Before each feature removal/replacement or production release, record:
- Requirement ID(s):
- Current behavior and evidence:
- Proposed change and reason:
- Data/API migration:
- Test evidence:
- Rollback:
- Founder decision (approve/reject/defer):
- Release version/build hash:

**Current release decision: NOT APPROVED FOR GENERAL PUBLIC LAUNCH.** Continue hardening and target a controlled pilot on 2026-11-08 only if every enabled P0 workflow passes the release gate.


## 11. Additional authentication hardening (6 Nov 2026)

The legacy Account portal also contained two authentication demonstrations that must not be treated as secure sign-in:
- The OTP button generated a code in the browser, exposed it in a toast, and pre-filled the verification field. This is not SMS OTP.
- The biometric button displayed a successful passkey message and continued into the local account lookup without a server-generated challenge or server-side assertion verification.

The review branch now disables both false-success paths and explains that the real SMS provider/server verification and passkey enrollment/challenge verification are not configured yet. This is a deliberate fail-closed staging behavior. It does not mean OTP or passkey functionality is complete.

Before enabling either method:
1. Configure the selected SMS/identity provider using server-side secrets.
2. Enforce OTP expiry, replay protection, rate limits, attempt limits and phone-number ownership.
3. For passkeys, create challenges server-side, verify signed WebAuthn assertions against registered credential public keys, and bind the assertion to the authenticated account/session.
4. Audit account/role changes and revoke sessions on logout, suspension and account recovery.
5. Add integration and abuse-case tests before removing the temporary unavailable state.

### Additional fail-closed authentication changes (6 Nov 2026)
- Removed hard-coded founder login/password/PIN fallback checks from the application gate. Founder Admin now remains locked until server-side identity and step-up authentication are available.
- Founder credential reads now return an unconfigured state; browser-side save is disabled. Legacy founder credential objects are scrubbed from local and shared cloud snapshots on read/write and are not re-synced.
- Guest checkout can no longer create a locally authenticated customer session from a phone number and arbitrary PIN. The cart remains intact; checkout reports that secure server authentication is not yet configured.
- Added regression tests for founder bypass removal, browser credential storage, and checkout session fabrication.
- These changes intentionally restrict staging functionality. They do not implement the missing server-side authentication provider.

### Version identity for the next debug candidate
- Version label: 3.2.8; Android version code: 328 (incremented from 3.2.7 / 327 so it can be installed as an update to the supplied APK).
- The production OTA manifest is deliberately left at its currently published version until a signed release APK and verified OTA manifest are ready. A CI debug APK is not a production OTA release.

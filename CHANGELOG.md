# Changelog

## [0.10.0](https://github.com/justolise/lms-app/compare/v0.9.0...v0.10.0) (2026-11-22)


### Features

* **reports,dashboard:** implement RPT-1 circulation and executive dashboard ([ec3f309](https://github.com/justolise/lms-app/commit/ec3f309fdb8eb357eafa39586b400df555f5ad60))


### Bug Fixes

* **env:** update REDIS_URL to include devpassword matching compose.yaml ([1e4860a](https://github.com/justolise/lms-app/commit/1e4860a01cdfa2169b1b824fd5c3b273903b77b9))
* **reports:** provide TokenModule and SessionModule dependencies for AccessTokenGuard in ReportsModule ([bbda3b4](https://github.com/justolise/lms-app/commit/bbda3b4c8515c3193639d7af0e761d87296cc949))
* **web:** set Next.js dev port to 3001 to prevent EADDRINUSE conflict with API ([8b29b3d](https://github.com/justolise/lms-app/commit/8b29b3dea82506143e8fd15bf5ee944c696ae6ca))

## [0.9.0](https://github.com/justolise/lms-app/compare/v0.8.0...v0.9.0) (2026-11-22)


### Features

* **auth,web:** extend session to 24h, auto-redirect on expiry, and clean sessions from profile UI ([507e716](https://github.com/justolise/lms-app/commit/507e716e15834af9ca11c38a8cf42998aeb10622))
* **members:** MEM-1, MEM-4 + lint clean (0 warnings) ([bab985a](https://github.com/justolise/lms-app/commit/bab985ae72a47284f603da418239d642f349a955))


### Bug Fixes

* **circulation,members:** use jsonb_array_elements_text for authors field; fix enquiries route ordering ([7af0733](https://github.com/justolise/lms-app/commit/7af07331cbeddc8c0aa6ae58ef07316bb7c4cd54))
* **web:** refresh auth profile on login and redirect to dashboard ([9ef390b](https://github.com/justolise/lms-app/commit/9ef390b0a63c8dd312598da26fbd83b24cb49f94))


### Documentation

* **readme:** update project status, feature matrix, architecture, and verification metrics ([7a39aba](https://github.com/justolise/lms-app/commit/7a39aba9bcb484feb4e3a09f3fd0fae92c2d39ed))

## [0.8.0](https://github.com/justolise/lms-app/compare/v0.7.0...v0.8.0) (2026-11-22)


### Features

* **fines:** implement configurable fine rules, append-only fine ledger, payments with receipts, and waiver desk (FIN-1, FIN-2, FIN-3) ([27fbb42](https://github.com/justolise/lms-app/commit/27fbb4230967ed60aac13bca833a1b59ae903b49))
* **public:** tenant-specific catalogue with search and pagination, and public membership enquiry ([97ee2c9](https://github.com/justolise/lms-app/commit/97ee2c920463d6db0e641bfe1a92767ef91d8989))
* **web:** add library selection to enquiry UI and route via relative API proxy ([9eccc2b](https://github.com/justolise/lms-app/commit/9eccc2bcb182288e125d7bd13272bb1ddb702aaa))


### Bug Fixes

* **db:** apply holds and membership_enquiries migrations with idempotent RLS and grants ([bdc46ad](https://github.com/justolise/lms-app/commit/bdc46ad344d481d7f24edda0c3c73cb4e6a07972))
* **multi-tenant:** eliminate hardcoded tenant fallbacks and link library context across public routes ([24f123e](https://github.com/justolise/lms-app/commit/24f123ececdffd0a46a277be3870f913b6454a82))


### Documentation

* **progress:** update verification records for 228 tests, migration 0011, and multi-tenant hardening ([9f2c858](https://github.com/justolise/lms-app/commit/9f2c858b2733d9142c4a946e33143d33bca85c70))

## [0.7.0](https://github.com/justolise/lms-app/compare/v0.6.0...v0.7.0) (2026-11-22)


### Features

* **ui:** complete UI architecture, forest theme, route groups, and public module ([a259826](https://github.com/justolise/lms-app/commit/a2598268e53a04d67f31ca8e29a41eb57a93289c))

## [0.6.0](https://github.com/justolise/lms-app/compare/v0.5.0...v0.6.0) (2026-11-22)


### Features

* **holds:** implement holds & reservations (HLD-1, HLD-2, HLD-3) with checkout/return integration and UI ([67a9b74](https://github.com/justolise/lms-app/commit/67a9b74cd0788b4e8fe87d0a3f7c4146da5efe87))
* **web:** complete frontend integration for all backend features (members, sessions, loans ledger, catalogue edit/archive) ([2fa0f70](https://github.com/justolise/lms-app/commit/2fa0f70463c92f0aa8414c66c09e189ec34d0871))
* **web:** modular frontend architecture with Tailwind v4 tokens, RBAC, toasts, and error boundaries ([b9b8198](https://github.com/justolise/lms-app/commit/b9b819833c3451ff71b00015aec27b512bd561c5))


### Bug Fixes

* **auth,web:** scope selection cookie to / and remove nested form in circulation page ([ecd940b](https://github.com/justolise/lms-app/commit/ecd940b9cbfd88fcf276eb95ed715fdece41fda0))

## [0.5.0](https://github.com/justolise/lms-app/compare/v0.4.0...v0.5.0) (2026-11-22)


### Features

* **circulation:** implement CIR-1 to CIR-6 checkout, return, renewal, and barcode scanner ([88d0d3d](https://github.com/justolise/lms-app/commit/88d0d3de5919de6d145b2045a0d38db023eec7e2))


### Bug Fixes

* **circulation:** invalidate catalogue list cache on checkout and return ([652e8f3](https://github.com/justolise/lms-app/commit/652e8f31897aa6f1a5f3535eda4e27a30c89dd0e))

## [0.4.0](https://github.com/justolise/lms-app/compare/v0.3.0...v0.4.0) (2026-11-21)


### Features

* **catalogue:** integrate catalogue and categories in frontend and add search filters (SRC-1, SRC-2) ([#51](https://github.com/justolise/lms-app/issues/51)) ([31806a7](https://github.com/justolise/lms-app/commit/31806a76a2286e45dca2ff2bdcd00075c500c0d7))


### Bug Fixes

* **catalogue:** invalidate catalogue list cache when copies are added, updated, or withdrawn ([96279ac](https://github.com/justolise/lms-app/commit/96279ac7ca2e30d2e63e6f20b65380cd493c8fa8))
* **catalogue:** qualify catalogue_items.id in copy count subqueries ([#50](https://github.com/justolise/lms-app/issues/50)) ([b7f9418](https://github.com/justolise/lms-app/commit/b7f94186381294357593806ce471f3482d5722d6))
* **db:** add 0007 to migration journal and grant lms_app permissions on catalogue tables ([4382192](https://github.com/justolise/lms-app/commit/4382192f7fe0612ad8dc9041bea6a643ab656611))
* **db:** sequence table creation, unique indexes, and foreign keys in 0007_catalogue.sql ([ccafb18](https://github.com/justolise/lms-app/commit/ccafb18254fe6d5da37593575142f0ba3a0b8412))

## [0.3.0](https://github.com/justolise/lms-app/compare/v0.2.0...v0.3.0) (2026-11-21)


### Features

* **auth,policies:** complete AUTH-1-5, PO-1-4, MEM-2 and ADM-2 policy matrix ([df40249](https://github.com/justolise/lms-app/commit/df40249c23cc83d3df341cd7d8742b5f49130c3f))
* **catalogue:** implement CAT-1 through CAT-5 — catalogue, copies, categories ([10bc41c](https://github.com/justolise/lms-app/commit/10bc41c70a67f1e16be340a6eacdb33a5614b52e))
* **security:** apply helmet, dynamic env CORS, redis caching, and decouple rate limiting ([a23d45f](https://github.com/justolise/lms-app/commit/a23d45f7db73c7a4ca5174b7116fd411ddbb516e))


### Bug Fixes

* **api:** declare express dependency and import auth modules in catalogue and categories ([9be3873](https://github.com/justolise/lms-app/commit/9be38739bf66a11e35e90099c530405a5bb74689))
* **AUTH-2:** clarify anonymous guest token roles ([fa282d8](https://github.com/justolise/lms-app/commit/fa282d8e473e423633d22eec3f6c82f76b27dc75))
* **catalogue:** source Open Library and Google Books URLs from env vars ([dd377c5](https://github.com/justolise/lms-app/commit/dd377c5272e927a34f8b34049fbd361538bc9387))
* resolve CI typecheck and Semgrep configuration ([d35112e](https://github.com/justolise/lms-app/commit/d35112e2a399752bd119aec48c1f1658239206be))
* resolve web import ordering for CI ([82c9b1d](https://github.com/justolise/lms-app/commit/82c9b1d90d1aa40b0381dac0eba527275940afe0))


### Documentation

* add latest release badge to README ([daaa6c7](https://github.com/justolise/lms-app/commit/daaa6c714b9fcfcd6a43052342de2ba802ce0aac))
* elevate README to investor-grade pitch document ([971fd42](https://github.com/justolise/lms-app/commit/971fd4289e6350affc2e9e77766578a90ff76c99))

# Changelog

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

-- Migration: 0007_catalogue.sql
-- Implements CAT-1, CAT-2, CAT-3, CAT-4, CAT-5
-- Creates: item_format, catalogue_status, copy_status, copy_condition enums
-- Creates: categories, catalogue_items, copies tables
-- Applies: RLS policies matching slice-3 pattern
-- Pre-wires: tsvector GIN index for SRC-1 (search) at zero future migration cost

-- ─── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE item_format AS ENUM (
  'BOOK', 'PERIODICAL', 'REFERENCE', 'AUDIO', 'VIDEO', 'OTHER'
);

CREATE TYPE catalogue_status AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TYPE copy_status AS ENUM (
  'AVAILABLE', 'ON_LOAN', 'RESERVED', 'IN_TRANSIT', 'LOST', 'DAMAGED', 'WITHDRAWN'
);

CREATE TYPE copy_condition AS ENUM ('NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED');

-- ─── Categories (CAT-5) ───────────────────────────────────────────────────────

CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants (id) ON DELETE RESTRICT,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  parent_id   UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT categories_tenant_parent_fk
    FOREIGN KEY (tenant_id, parent_id)
    REFERENCES categories (tenant_id, id)
);

CREATE UNIQUE INDEX categories_tenant_id_id_unique   ON categories (tenant_id, id);
CREATE UNIQUE INDEX categories_tenant_name_unique     ON categories (tenant_id, name);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories FORCE ROW LEVEL SECURITY;

CREATE POLICY categories_tenant_isolation ON categories
  USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- ─── Catalogue Items (CAT-1, CAT-2, CAT-5) ───────────────────────────────────

CREATE TABLE catalogue_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants (id) ON DELETE RESTRICT,
  title           VARCHAR(500) NOT NULL,
  subtitle        VARCHAR(500),
  authors         JSONB NOT NULL DEFAULT '[]'::jsonb,
  isbn13          VARCHAR(13),
  isbn10          VARCHAR(10),
  publisher       VARCHAR(300),
  published_year  INTEGER,
  language        VARCHAR(10) NOT NULL DEFAULT 'en',
  format          item_format NOT NULL DEFAULT 'BOOK',
  description     TEXT,
  cover_url       TEXT,
  call_number     VARCHAR(100),
  shelf_location  VARCHAR(100),
  category_id     UUID,
  subjects        JSONB NOT NULL DEFAULT '[]'::jsonb,
  status          catalogue_status NOT NULL DEFAULT 'ACTIVE',
  isbn_metadata   JSONB,
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT catalogue_items_published_year_range_check
    CHECK (published_year IS NULL OR (published_year BETWEEN 1 AND 9999)),

  CONSTRAINT catalogue_items_tenant_category_fk
    FOREIGN KEY (tenant_id, category_id)
    REFERENCES categories (tenant_id, id),

  CONSTRAINT catalogue_items_tenant_created_by_fk
    FOREIGN KEY (tenant_id, created_by)
    REFERENCES users (tenant_id, id)
);

CREATE UNIQUE INDEX catalogue_items_tenant_id_id_unique
  ON catalogue_items (tenant_id, id);

CREATE UNIQUE INDEX catalogue_items_tenant_isbn13_unique
  ON catalogue_items (tenant_id, isbn13)
  WHERE isbn13 IS NOT NULL;

CREATE INDEX catalogue_items_tenant_status_idx   ON catalogue_items (tenant_id, status);
CREATE INDEX catalogue_items_tenant_format_idx   ON catalogue_items (tenant_id, format);
CREATE INDEX catalogue_items_tenant_category_idx ON catalogue_items (tenant_id, category_id);

-- SRC-1 preparation: full-text search vector column (populated by application or trigger).
-- Adding the column and GIN index now avoids a future blocking migration.
ALTER TABLE catalogue_items ADD COLUMN IF NOT EXISTS
  search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(subtitle, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) STORED;

CREATE INDEX catalogue_items_search_vector_idx
  ON catalogue_items USING GIN (search_vector);

ALTER TABLE catalogue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogue_items FORCE ROW LEVEL SECURITY;

CREATE POLICY catalogue_items_tenant_isolation ON catalogue_items
  USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

-- ─── Copies (CAT-3, CAT-4) ───────────────────────────────────────────────────

CREATE TABLE copies (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants (id) ON DELETE RESTRICT,
  catalogue_item_id  UUID NOT NULL,
  barcode            VARCHAR(100) NOT NULL,
  condition          copy_condition NOT NULL DEFAULT 'GOOD',
  status             copy_status    NOT NULL DEFAULT 'AVAILABLE',
  shelf_location     VARCHAR(100),
  acquired_at        DATE,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT copies_tenant_catalogue_item_fk
    FOREIGN KEY (tenant_id, catalogue_item_id)
    REFERENCES catalogue_items (tenant_id, id)
    ON DELETE RESTRICT
);

CREATE UNIQUE INDEX copies_tenant_id_id_unique     ON copies (tenant_id, id);
CREATE UNIQUE INDEX copies_tenant_barcode_unique   ON copies (tenant_id, barcode);
CREATE INDEX        copies_tenant_status_idx        ON copies (tenant_id, status);
CREATE INDEX        copies_tenant_catalogue_item_idx ON copies (tenant_id, catalogue_item_id);

ALTER TABLE copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE copies FORCE ROW LEVEL SECURITY;

CREATE POLICY copies_tenant_isolation ON copies
  USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);

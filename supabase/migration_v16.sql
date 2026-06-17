-- ── Tailles et rupture de stock ──────────────────────────────────────────────

ALTER TABLE boutique_products
  ADD COLUMN IF NOT EXISTS sizes    text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS in_stock boolean NOT NULL DEFAULT true;

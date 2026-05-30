-- ═══════════════════════════════════════════════════════════
-- Sima Arôme SCM — Database Migration: Extend Warehouse & Stock
-- ═══════════════════════════════════════════════════════════
-- Description: Extend warehouses table with code, capacity, status, and create stock_movements.
-- Date: 2026-05-30
-- ═══════════════════════════════════════════════════════════

-- ── 1. Extend Warehouses Table ─────────────────────────────
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE;
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS capacity BIGINT NOT NULL DEFAULT 10000;
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE'));

-- Populate unique codes for any existing warehouses as a safety measure
UPDATE public.warehouses SET code = 'WH-' || UPPER(SUBSTRING(id::text FROM 1 FOR 6)) WHERE code IS NULL;

-- Make code column NOT NULL now that it is populated
ALTER TABLE public.warehouses ALTER COLUMN code SET NOT NULL;


-- ── 2. Create Stock Movements Table ────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_material_id UUID REFERENCES public.raw_materials(id) ON DELETE CASCADE,
    product_stock_id UUID REFERENCES public.product_stocks(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('STOCK_IN', 'STOCK_OUT', 'STOCK_ADJUSTMENT')),
    quantity DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);


-- ── 3. Enable Row Level Security (RLS) ─────────────────────
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON public.stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON public.stock_movements FOR ALL TO authenticated USING (true);


-- ── 4. Indexes for Performance ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_stock_movements_raw_material_id ON public.stock_movements(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_stock_id ON public.stock_movements(product_stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_by ON public.stock_movements(created_by);


-- ── 5. Grants ─────────────────────────────────────────────
GRANT ALL PRIVILEGES ON TABLE public.stock_movements TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stock_movements TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- Sima Arôme SCM — Raw Material Intake & Supplier Migration
-- ═══════════════════════════════════════════════════════════
-- Description: Extend tables for raw materials & suppliers, configure Procurement Staff role.
-- Author: Antigravity AI
-- Date: 2026-05-31
-- ═══════════════════════════════════════════════════════════

-- ── 1. Extend Suppliers Table ──────────────────────────────
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE'));

-- Populate unique codes for existing suppliers
UPDATE public.suppliers SET code = 'SUP-' || UPPER(SUBSTRING(id::text FROM 1 FOR 6)) WHERE code IS NULL;
ALTER TABLE public.suppliers ALTER COLUMN code SET NOT NULL;

-- ── 2. Extend Raw Materials Table ──────────────────────────
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE RESTRICT;
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS intake_number VARCHAR(100) UNIQUE;
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS expired_date TIMESTAMP;
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'kg';

-- Drop NOT NULL constraint on offer_id so we can record raw material intake directly without a pre-existing offer
ALTER TABLE public.raw_materials ALTER COLUMN offer_id DROP NOT NULL;

-- Update supplier_id for existing raw_materials based on their offers
UPDATE public.raw_materials rm 
SET supplier_id = (SELECT supplier_id FROM public.offers o WHERE o.id = rm.offer_id) 
WHERE rm.supplier_id IS NULL;

-- Populate unique intake numbers for existing raw materials
UPDATE public.raw_materials SET intake_number = 'INTAKE-' || TO_CHAR(received_at, 'YYYYMMDD') || '-' || UPPER(SUBSTRING(id::text FROM 1 FOR 4)) WHERE intake_number IS NULL;
ALTER TABLE public.raw_materials ALTER COLUMN intake_number SET NOT NULL;

-- ── 3. Role and Permissions Configuration ──────────────────

-- Insert the 'raw_materials' permission node and register roles
DO $$
DECLARE
    perm_id UUID;
    role_id UUID;
    admin_role_id UUID;
BEGIN
    -- Check if permissions and role_permissions tables exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permissions') THEN
        
        -- 1. Insert 'raw_materials' permission node
        INSERT INTO public.permissions (code, name)
        VALUES ('raw_materials', 'Raw Materials Module Access')
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO perm_id;

        -- 2. Create 'Procurement Staff' role if not exists
        INSERT INTO public.roles (name, description)
        VALUES ('Procurement Staff', 'Responsible for raw material procurement, supplier master data, and supplier evaluation')
        ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
        RETURNING id INTO role_id;

        -- 3. Map permission to 'Procurement Staff' role
        IF perm_id IS NOT NULL AND role_id IS NOT NULL THEN
            INSERT INTO public.role_permissions (role_id, permission_id)
            VALUES (role_id, perm_id)
            ON CONFLICT DO NOTHING;
        END IF;

        -- 4. Map permission to 'Super Admin' role
        SELECT id INTO admin_role_id FROM public.roles WHERE name = 'Super Admin';
        IF perm_id IS NOT NULL AND admin_role_id IS NOT NULL THEN
            INSERT INTO public.role_permissions (role_id, permission_id)
            VALUES (admin_role_id, perm_id)
            ON CONFLICT DO NOTHING;
        END IF;

    END IF;
END $$;

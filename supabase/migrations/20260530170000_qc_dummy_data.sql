-- ═══════════════════════════════════════════════════════════
-- Sima Arôme Supply Chain Management — Seed QC Dummy Data
-- ═══════════════════════════════════════════════════════════
-- Description: Inserts realistic dummy data for roles, users, suppliers,
--              offers, raw materials, productions, QC, and audit trails.
-- Author: Antigravity AI
-- Date: 2026-05-30
-- ═══════════════════════════════════════════════════════════

-- ── 1. Clean Up Existing Seed Data (Optional) ──────────────
-- Uncomment the lines below if you want a fresh start.
-- DELETE FROM public.audit_trails;
-- DELETE FROM public.quality_control;
-- DELETE FROM public.productions_materials;
-- DELETE FROM public.productions_phase;
-- DELETE FROM public.productions;
-- DELETE FROM public.recipe;
-- DELETE FROM public.raw_materials;
-- DELETE FROM public.warehouses;
-- DELETE FROM public.offers;
-- DELETE FROM public.product_suppliers;
-- DELETE FROM public.suppliers;
-- DELETE FROM public.users;
-- DELETE FROM public.roles;

-- ── 2. Insert Roles ────────────────────────────────────────
INSERT INTO public.roles (id, name, description)
VALUES 
    ('1c782b72-9ec5-4288-8751-310220c0081b', 'Super Admin', 'Full system management and configuration access'),
    ('ccdcd364-e2f7-47dd-b3e7-40f34c6f934c', 'QC Staff', 'Responsible for material & product quality control inspections')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- ── 3. Insert Users ────────────────────────────────────────
INSERT INTO public.users (id, role_id, email, fullname, phone_number, gender, password_hash, created_at)
VALUES 
    (
        'e79e63c0-3023-4df4-8d48-8df0041d4de2', 
        'ccdcd364-e2f7-47dd-b3e7-40f34c6f934c', 
        'john.smyth@sima-arome.com', 
        'John Smyth', 
        '0812345678', 
        1, 
        '$2b$10$xyzDummyHashBcryptForQCStaffUserJohnSmyth12345', 
        NOW() - INTERVAL '10 days'
    ),
    (
        'b11b5e5c-7833-40e1-bd6b-b4618e7774e1', 
        '1c782b72-9ec5-4288-8751-310220c0081b', 
        'admin@sima-arome.com', 
        'Essensima Admin', 
        '0812345679', 
        2, 
        '$2b$10$xyzDummyHashBcryptForSuperAdminUserEssensima54321', 
        NOW() - INTERVAL '10 days'
    )
ON CONFLICT (email) DO NOTHING;

-- ── 4. Insert Suppliers ────────────────────────────────────
INSERT INTO public.suppliers (id, name, favorite, phone_number, address, created_at)
VALUES 
    ('e5270146-5b4d-4a15-a7b3-8c467a1451b6', 'Nusantara Essential Oils', TRUE, '031-555123', 'Jl. Rungkut Industri Raya No.15, Surabaya', NOW() - INTERVAL '10 days'),
    ('f8a42531-158a-40a2-9e90-c25785bb326b', 'Global Aroma Imports Ltd.', FALSE, '021-444567', 'Tanjung Priok Logistics Zone, Jakarta', NOW() - INTERVAL '9 days')
ON CONFLICT (id) DO NOTHING;

-- ── 5. Insert Product Suppliers ────────────────────────────
INSERT INTO public.product_suppliers (id, name, price, unit, created_at)
VALUES 
    ('a2155bc2-3c8b-4b14-8be0-b98a1a364bb2', 'Pure Patchouli Oil (Minyak Nilam)', 1200000, 'kg', NOW() - INTERVAL '10 days'),
    ('c827b5b8-dcd2-4e44-bb83-8a39e9e1bb34', 'Premium Vetiver Oil (Minyak Akar Wangi)', 2500000, 'kg', NOW() - INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;

-- ── 6. Insert Offers ───────────────────────────────────────
INSERT INTO public.offers (id, supplier_id, product_supplier_id, price, quality, lead_time)
VALUES 
    ('b532e75e-857c-47b2-bd7f-94d35ebc117b', 'e5270146-5b4d-4a15-a7b3-8c467a1451b6', 'a2155bc2-3c8b-4b14-8be0-b98a1a364bb2', 1150000, 95, 3),
    ('d9e03d40-f1db-4952-ba8f-5183efecaa21', 'f8a42531-158a-40a2-9e90-c25785bb326b', 'c827b5b8-dcd2-4e44-bb83-8a39e9e1bb34', 2450000, 90, 5)
ON CONFLICT (id) DO NOTHING;

-- ── 7. Insert Warehouses ───────────────────────────────────
INSERT INTO public.warehouses (id, log_id, name, location, created_at)
VALUES 
    ('d862b9a7-96fa-4680-9286-905e3f5b8222', NULL, 'Raw Materials Cold Storage A', 11275, NOW() - INTERVAL '10 days'),
    ('e3f89832-6bf8-46db-9086-a7959de99999', NULL, 'Finished Goods Warehouse B', 11276, NOW() - INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;

-- ── 8. Insert Raw Materials (Batches) ─────────────────────
INSERT INTO public.raw_materials (id, warehouse_id, offer_id, batch_code, material_name, status, total_price, weight_kg, received_by, received_at, updated_at)
VALUES 
    (
        '2a84efca-3c4b-4b2a-bf3d-51a84f3e9bb6', 
        'd862b9a7-96fa-4680-9286-905e3f5b8222', 
        'b532e75e-857c-47b2-bd7f-94d35ebc117b', 
        'RM-2026-001', 
        'Patchouli Oil Batch A', 
        'QC_ACCEPTED', 
        115000000, 
        100.00, 
        'e79e63c0-3023-4df4-8d48-8df0041d4de2', 
        NOW() - INTERVAL '5 days',
        NOW() - INTERVAL '5 days'
    ),
    (
        '4c96bf2a-4d7a-4c28-be8d-71b84f3e9bb7', 
        'd862b9a7-96fa-4680-9286-905e3f5b8222', 
        'b532e75e-857c-47b2-bd7f-94d35ebc117b', 
        'RM-2026-002', 
        'Patchouli Oil Batch B', 
        'QC_REJECTED', 
        57500000, 
        50.00, 
        'e79e63c0-3023-4df4-8d48-8df0041d4de2', 
        NOW() - INTERVAL '4 days',
        NOW() - INTERVAL '4 days'
    ),
    (
        '6e78cf2b-5e8a-4d3a-bf8e-81c84f3e9bb8', 
        'd862b9a7-96fa-4680-9286-905e3f5b8222', 
        'd9e03d40-f1db-4952-ba8f-5183efecaa21', 
        'RM-2026-003', 
        'Vetiver Oil Batch C', 
        'PENDING_QC', 
        245000000, 
        100.00, 
        'e79e63c0-3023-4df4-8d48-8df0041d4de2', 
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day'
    )
ON CONFLICT (batch_code) DO NOTHING;

-- ── 9. Insert Products ─────────────────────────────────────
INSERT INTO public.products (id, type, categories, price)
VALUES 
    ('b78a9c3d-d42a-4a25-83e8-5b4a8e8b2b10', 'Sima Arôme Signature Parfum', 'Fragrance', 450000),
    ('c92b8d5a-1b5e-4c2f-b48e-a9b8e8b99e22', 'SimArome Eau De Toilette', 'Fragrance', 250000)
ON CONFLICT (id) DO NOTHING;

-- ── 10. Insert Product Stocks ──────────────────────────────
INSERT INTO public.product_stocks (id, product_id, warehouse_id, amount)
VALUES 
    ('f91a1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b', 'b78a9c3d-d42a-4a25-83e8-5b4a8e8b2b10', 'e3f89832-6bf8-46db-9086-a7959de99999', 500),
    ('a92a1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4c', 'c92b8d5a-1b5e-4c2f-b48e-a9b8e8b99e22', 'e3f89832-6bf8-46db-9086-a7959de99999', 1200)
ON CONFLICT (id) DO NOTHING;

-- ── 11. Insert Productions (Product Batches) ───────────────
INSERT INTO public.productions (id, products_id, scheduled_date, planned_quantity, actual_quantity, start_date, end_date, status, lot_number, created_by, created_at)
VALUES 
    (
        'd78b9c4d-a12b-4567-8a8b-c9a76d8b5bb1', 
        'b78a9c3d-d42a-4a25-83e8-5b4a8e8b2b10', 
        CURRENT_DATE - 5, 
        500, 
        502, 
        CURRENT_DATE - 5, 
        CURRENT_DATE - 4, 
        'COMPLETED', 
        'PRD-2026-001', 
        'b11b5e5c-7833-40e1-bd6b-b4618e7774e1', 
        NOW() - INTERVAL '5 days'
    ),
    (
        'e89c0d5e-b23c-5678-9b9c-d0a87e9b6cc2', 
        'c92b8d5a-1b5e-4c2f-b48e-a9b8e8b99e22', 
        CURRENT_DATE - 4, 
        300, 
        298, 
        CURRENT_DATE - 4, 
        CURRENT_DATE - 3, 
        'COMPLETED', 
        'PRD-2026-002', 
        'b11b5e5c-7833-40e1-bd6b-b4618e7774e1', 
        NOW() - INTERVAL '4 days'
    ),
    (
        'f90d1e6f-c34d-6789-a0a0-e1b98f0c7dd3', 
        'b78a9c3d-d42a-4a25-83e8-5b4a8e8b2b10', 
        CURRENT_DATE - 1, 
        1000, 
        1000, 
        CURRENT_DATE - 1, 
        CURRENT_DATE, 
        'COMPLETED', 
        'PRD-2026-003', 
        'b11b5e5c-7833-40e1-bd6b-b4618e7774e1', 
        NOW() - INTERVAL '1 day'
    )
ON CONFLICT (lot_number) DO NOTHING;

-- ── 12. Insert Quality Control Records ─────────────────────
INSERT INTO public.quality_control (id, raw_material_id, production_id, checked_by, qc_status, qc_notes, created_at, evidence_images)
VALUES 
    (
        '742b8e3a-96da-4712-8e8b-d7a86f9b4cc1', 
        '2a84efca-3c4b-4b2a-bf3d-51a84f3e9bb6', 
        NULL, 
        'e79e63c0-3023-4df4-8d48-8df0041d4de2', 
        'PASSED', 
        'Packaging condition is acceptable. Odor profile meets premium standard (Patchouli purity 99.8%). Material is clear of turbidities.', 
        NOW() - INTERVAL '5 days' + INTERVAL '3 hours',
        '[]'::jsonb
    ),
    (
        '853c9f4b-07eb-5823-9f9c-e8b97f0c5dd2', 
        '4c96bf2a-4d7a-4c28-be8d-71b84f3e9bb7', 
        NULL, 
        'e79e63c0-3023-4df4-8d48-8df0041d4de2', 
        'FAILED', 
        'Color is way off (too dark, potential iron contamination from storage drum). High moisture levels detected (3.4% > 1.0% limit). Rejected.', 
        NOW() - INTERVAL '4 days' + INTERVAL '2 hours',
        '[]'::jsonb
    ),
    (
        '964d0a5c-18fc-6934-a0a0-f9ca8f1d6ee3', 
        NULL, 
        'd78b9c4d-a12b-4567-8a8b-c9a76d8b5bb1', 
        'e79e63c0-3023-4df4-8d48-8df0041d4de2', 
        'PASSED', 
        'Fragrance profile matches master sample. Color clarity is absolute. Packaging seal is airtight, cap torque checks passed.', 
        NOW() - INTERVAL '4 days' + INTERVAL '5 hours',
        '[]'::jsonb
    ),
    (
        'a75e1b6d-29fd-7045-b0b0-0adb9f2e7ff4', 
        NULL, 
        'e89c0d5e-b23c-5678-9b9c-d0a87e9b6cc2', 
        'e79e63c0-3023-4df4-8d48-8df0041d4de2', 
        'FAILED', 
        'Leaking caps detected on 18 units due to thread misalignment. Slight sediment observed at bottom of batch. Product rejected for bottling rework.', 
        NOW() - INTERVAL '3 days' + INTERVAL '4 hours',
        '[]'::jsonb
    )
ON CONFLICT (id) DO NOTHING;

-- ── 13. Insert Manual Audit Log Entries ────────────────────
INSERT INTO public.audit_trails (id, user_id, action, target_table, record_id, old_data, new_data, timestamp)
VALUES 
    (
        '001a1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4a', 
        'e79e63c0-3023-4df4-8d48-8df0041d4de2', 
        'VIEW', 
        'raw_materials', 
        '2a84efca-3c4b-4b2a-bf3d-51a84f3e9bb6', 
        NULL, 
        'QC Staff viewed Batch RM-2026-001 details', 
        NOW() - INTERVAL '5 days' + INTERVAL '1 hour'
    ),
    (
        '002a1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b', 
        'e79e63c0-3023-4df4-8d48-8df0041d4de2', 
        'QC_SUBMIT', 
        'quality_control', 
        '742b8e3a-96da-4712-8e8b-d7a86f9b4cc1', 
        NULL, 
        '{"qc_status": "PASSED", "qc_notes": "Packaging condition is acceptable..."}', 
        NOW() - INTERVAL '5 days' + INTERVAL '3 hours'
    ),
    (
        '003a1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4c', 
        'e79e63c0-3023-4df4-8d48-8df0041d4de2', 
        'STATUS_CHANGE', 
        'raw_materials', 
        '2a84efca-3c4b-4b2a-bf3d-51a84f3e9bb6', 
        '{"status": "PENDING_QC"}', 
        '{"status": "QC_ACCEPTED"}', 
        NOW() - INTERVAL '5 days' + INTERVAL '3 hours'
    ),
    (
        '004a1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4d', 
        'e79e63c0-3023-4df4-8d48-8df0041d4de2', 
        'VIEW', 
        'productions', 
        'd78b9c4d-a12b-4567-8a8b-c9a76d8b5bb1', 
        NULL, 
        'QC Staff viewed Product Batch PRD-2026-001 details', 
        NOW() - INTERVAL '4 days' + INTERVAL '3 hours'
    )
ON CONFLICT (id) DO NOTHING;

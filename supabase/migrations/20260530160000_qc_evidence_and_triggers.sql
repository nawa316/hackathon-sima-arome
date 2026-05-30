-- ═══════════════════════════════════════════════════════════
-- Sima Arôme Supply Chain Management — QC Evidence & Triggers
-- ═══════════════════════════════════════════════════════════
-- Description: Add evidence_images to quality_control and set up audit logging triggers.
-- Author: Antigravity AI
-- Date: 2026-05-30
-- ═══════════════════════════════════════════════════════════

-- ── 1. Add Evidence Images column ─────────────────────────
ALTER TABLE public.quality_control 
ADD COLUMN IF NOT EXISTS evidence_images JSONB DEFAULT '[]'::jsonb;

-- ── 2. Create Audit Logger Trigger Functions ──────────────

-- Function to log status changes in raw_materials
CREATE OR REPLACE FUNCTION public.log_raw_materials_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.status <> NEW.status) THEN
        INSERT INTO public.audit_trails (user_id, action, target_table, record_id, old_data, new_data)
        VALUES (
            COALESCE(NEW.received_by, OLD.received_by),
            'STATUS_CHANGE',
            'raw_materials',
            NEW.id::text,
            jsonb_build_object('status', OLD.status)::text,
            jsonb_build_object('status', NEW.status)::text
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log QC results submission
CREATE OR REPLACE FUNCTION public.log_quality_control_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_trails (user_id, action, target_table, record_id, old_data, new_data)
        VALUES (
            NEW.checked_by,
            'QC_SUBMIT',
            'quality_control',
            NEW.id::text,
            NULL,
            jsonb_build_object('qc_status', NEW.qc_status, 'qc_notes', NEW.qc_notes)::text
        );
    ELSIF (TG_OP = 'UPDATE' AND OLD.qc_status <> NEW.qc_status) THEN
        INSERT INTO public.audit_trails (user_id, action, target_table, record_id, old_data, new_data)
        VALUES (
            NEW.checked_by,
            'QC_STATUS_CHANGE',
            'quality_control',
            NEW.id::text,
            jsonb_build_object('qc_status', OLD.qc_status)::text,
            jsonb_build_object('qc_status', NEW.qc_status)::text
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 3. Attach Triggers ─────────────────────────────────────

DROP TRIGGER IF EXISTS trigger_raw_materials_status_audit ON public.raw_materials;
CREATE TRIGGER trigger_raw_materials_status_audit
    AFTER UPDATE ON public.raw_materials
    FOR EACH ROW
    EXECUTE FUNCTION public.log_raw_materials_audit();

DROP TRIGGER IF EXISTS trigger_quality_control_audit ON public.quality_control;
CREATE TRIGGER trigger_quality_control_audit
    AFTER INSERT OR UPDATE ON public.quality_control
    FOR EACH ROW
    EXECUTE FUNCTION public.log_quality_control_audit();

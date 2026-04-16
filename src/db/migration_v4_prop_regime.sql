-- Migration: Add fiscal_regime to condominiums for granular tax control
-- This allows different properties in the same organization to have different tax logic

ALTER TABLE condominiums 
ADD COLUMN IF NOT EXISTS fiscal_regime text;

-- Update existing condominiums to use the organization's logic if desired, 
-- but for now we leave it NULL to trigger the "No fiscal regime" UI branch as requested.

COMMENT ON COLUMN condominiums.fiscal_regime IS 'fiscal_regime (condominio_no_lucrativo, arrendamiento, actividad_empresarial)';

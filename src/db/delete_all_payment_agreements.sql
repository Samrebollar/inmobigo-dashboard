-- Elimina TODOS los convenios de pago y datos relacionados (cuotas y
-- recordatorios). Es irreversible — no hay respaldo automático.
-- Actualmente hay 13 convenios y 7 cuotas en la base de datos.

BEGIN;

-- 1. Cuotas de todos los convenios
DELETE FROM agreement_installments;

-- 2. Recordatorios de convenios registrados en el historial de comunicación
DELETE FROM communication_logs
WHERE type = 'payment_agreement_reminder';

-- 3. Los convenios en sí
DELETE FROM payment_agreements;

COMMIT;

-- Script para arreglar los límites de suscripción que se guardaron mal en la base de datos

-- Actualizar todas las suscripciones del plan 'CORE PRUEBA' al límite correcto de 5 unidades
UPDATE subscriptions
SET unit_limit = 5
WHERE plan_name = 'CORE PRUEBA' AND unit_limit > 5;

-- Si tu plan no tiene un nombre exacto pero tiene un límite de 500, puedes correr esto para asegurarte:
-- UPDATE subscriptions SET unit_limit = 5 WHERE unit_limit = 500 AND subscription_status = 'active';

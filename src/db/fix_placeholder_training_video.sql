-- seedDefaultBenefitsAction (src/app/actions/benefit-actions.ts) sembraba las
-- 3 capacitaciones por defecto con content_url apuntando al video de broma de
-- YouTube ("Never Gonna Give You Up" / Rickroll) en vez de contenido real.
-- Ya se corrigió el código para que las nuevas organizaciones se siembren con
-- content_url vacío (la app ahora muestra un estado honesto de "Video en
-- preparación" en vez de una URL falsa), pero las organizaciones que ya se
-- sembraron antes de este fix (29,001 filas verificadas al momento de
-- escribir esto) siguen con la URL de broma guardada.
--
-- Este UPDATE limpia esas filas existentes para que dejen de mostrar el
-- Rickroll y pasen al mismo estado honesto de "Video en preparación".

UPDATE benefit_trainings
SET content_url = ''
WHERE content_url ILIKE '%dQw4w9WgXcQ%';

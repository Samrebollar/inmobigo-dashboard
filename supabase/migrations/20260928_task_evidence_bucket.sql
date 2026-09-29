-- Fotos de evidencia que el equipo sube desde Mis Tareas. Se suben desde el
-- servidor (service role) tras validar que la tarea es del usuario; rutas con
-- uuid, lectura pública igual que complaint_evidence / fine_evidences.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('task_evidence', 'task_evidence', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

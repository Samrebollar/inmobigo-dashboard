@AGENTS.md

# InmobiGo — app móvil (Expo + expo-router + TypeScript)

App de InmobiGo para residentes de condominios. Comparte la base de datos de
Supabase con el panel web (`inmobigo-dashboard`). Rutas en `src/app/`, cliente de
Supabase en `src/lib/supabase.ts`.

## Reglas de negocio (obligatorias)

1. **Tablas de usuarios**
   - `profiles` contiene **solo residentes**.
   - `organization_users` contiene **solo administradores**.
   - Nunca crear, mover ni buscar administradores en `profiles`, ni residentes en
     `organization_users`.
2. **Convenios de pago**: siempre requieren **aprobación de un administrador**.
   Desde la app el residente solo puede *solicitar* un convenio (queda pendiente);
   nunca se crean como aprobados ni se aplican a sus adeudos sin esa aprobación.
3. **Amenidades**: un residente con **adeudo vencido** no puede reservar
   amenidades. Validarlo antes de mostrar o enviar la reserva (y la base de datos
   debe rechazarlo también; la validación de la app no basta).
4. **Multi-tenant**: todo dato pertenece a una organización (`organization_id`) y
   a un condominio (`condominium_id`). Toda consulta debe filtrar por el
   condominio/organización del usuario en sesión; nunca mostrar ni escribir datos
   de otro tenant.

## Supabase

- La app usa **solo** la llave anon/publishable (`EXPO_PUBLIC_SUPABASE_ANON_KEY`).
  **Nunca** usar ni pedir la `service_role` key: todo `EXPO_PUBLIC_*` queda
  incrustado en el bundle. `src/lib/supabase.ts` se niega a arrancar si detecta
  una llave privilegiada.
- La seguridad depende de las políticas RLS de Supabase, no de filtros en la app.
- **No ejecutar nada destructivo en Supabase**: nada de `DROP`, `TRUNCATE`,
  `DELETE`/`UPDATE` masivos, ni migraciones que borren columnas o datos. Cambios
  de esquema o de políticas RLS se proponen y los aprueba el usuario antes de
  aplicarlos (y viven en `supabase/migrations` del repo web).

## Configuración

- Copia `.env.example` a `.env` y completa los valores (`.env` no se sube a git).
- `npx expo start` para desarrollo; `npx tsc --noEmit` y `npx expo lint` antes de
  dar algo por terminado.
- Instalar dependencias siempre con `npx expo install <paquete>`.

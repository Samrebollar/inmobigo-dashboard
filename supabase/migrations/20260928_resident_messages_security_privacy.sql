-- El guardia de seguridad también vive en organization_users, así que las
-- políticas "Org staff" le daban acceso a TODAS las conversaciones de la
-- organización (residentes <-> administración). Se excluye el rol security:
-- el guardia solo ve su propio chat con la administración (políticas
-- "Security users ... own thread", que no cambian).

drop policy if exists "Org staff can view org threads" on public.resident_messages;
create policy "Org staff can view org threads" on public.resident_messages
    for select using (
        organization_id in (
            select ou.organization_id from public.organization_users ou
            where ou.user_id = auth.uid() and ou.role_new is distinct from 'security'
        )
    );

drop policy if exists "Org staff can mark org threads read" on public.resident_messages;
create policy "Org staff can mark org threads read" on public.resident_messages
    for update using (
        organization_id in (
            select ou.organization_id from public.organization_users ou
            where ou.user_id = auth.uid() and ou.role_new is distinct from 'security'
        )
    ) with check (
        organization_id in (
            select ou.organization_id from public.organization_users ou
            where ou.user_id = auth.uid() and ou.role_new is distinct from 'security'
        )
    );

drop policy if exists "Org staff can send messages in org threads" on public.resident_messages;
create policy "Org staff can send messages in org threads" on public.resident_messages
    for insert with check (
        sender_role = 'admin'
        and sender_id = auth.uid()
        and organization_id in (
            select ou.organization_id from public.organization_users ou
            where ou.user_id = auth.uid() and ou.role_new is distinct from 'security'
        )
    );

-- Harden an existing database after deploying the server-side checkout RPC call.
-- The function creates orders and decrements inventory, so it must never be
-- executable with the public anon or authenticated Supabase keys.

revoke execute on function public.checkout_transaction(jsonb) from public, anon, authenticated;
grant execute on function public.checkout_transaction(jsonb) to service_role;

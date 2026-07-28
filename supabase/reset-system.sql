-- ATENÇÃO: execute no Supabase SQL Editor somente se quiser apagar todos os dados
-- deste sistema (usuários, produtos, clientes, vendas e estoque).
-- Não remove configurações do projeto Supabase, autenticação ou arquivos Storage.

drop table if exists public.stock_movements cascade;
drop table if exists public.sale_items cascade;
drop table if exists public.sales cascade;
drop table if exists public.clients cascade;
drop table if exists public.products cascade;
drop table if exists public.app_users cascade;

drop function if exists public.set_updated_at() cascade;
drop function if exists public.create_app_user(text, text, text, text) cascade;
drop function if exists public.verify_app_login(text, text) cascade;
drop function if exists public.list_app_users() cascade;
drop function if exists public.update_app_user(uuid, text, text, text, text) cascade;
drop function if exists public.delete_app_user(uuid) cascade;
drop function if exists public.register_sale(jsonb, text) cascade;
drop function if exists public.pay_client_debt(uuid, numeric, text) cascade;

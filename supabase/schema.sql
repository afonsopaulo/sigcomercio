-- SigComércio: execute este arquivo inteiro em Supabase > SQL Editor.
-- O script pode ser executado somente em um projeto novo (ele cria as tabelas).

create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  name text not null,
  role text not null default 'employee' check (role in ('admin', 'employee')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  category text,
  purchase_price numeric(12,2) not null default 0 check (purchase_price >= 0),
  selling_price numeric(12,2) not null default 0 check (selling_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  min_stock integer not null default 0 check (min_stock >= 0),
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  debt numeric(12,2) not null default 0 check (debt >= 0),
  purchase_count integer not null default 0,
  total_spent numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  date timestamptz not null default now(),
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null default 'Consumidor Final',
  subtotal numeric(12,2) not null,
  discount numeric(12,2) not null default 0 check (discount >= 0),
  total numeric(12,2) not null,
  payment_method text not null check (payment_method in ('dinheiro', 'pix', 'cartao', 'fiado')),
  seller text not null
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  total_price numeric(12,2) not null
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  type text not null check (type in ('input', 'output')),
  motive text not null,
  date timestamptz not null default now(),
  "user" text not null default 'Sistema'
);

create index if not exists sales_date_idx on public.sales(date desc);
create index if not exists sale_items_sale_id_idx on public.sale_items(sale_id);
create index if not exists stock_movements_date_idx on public.stock_movements(date desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
drop trigger if exists clients_updated_at on public.clients;
create trigger clients_updated_at before update on public.clients for each row execute function public.set_updated_at();

-- Cria usuários com senha protegida por hash; a senha nunca é retornada ao site.
create or replace function public.create_app_user(p_username text, p_password text, p_name text, p_role text default 'employee')
returns public.app_users language plpgsql security definer set search_path = public as $$
declare result public.app_users;
begin
  insert into app_users (username, password_hash, name, role)
  values (lower(trim(p_username)), extensions.crypt(p_password, extensions.gen_salt('bf')), p_name, p_role)
  returning * into result;
  return result;
end; $$;

create or replace function public.verify_app_login(p_username text, p_password text)
returns table(id uuid, username text, name text, role text) language sql security definer set search_path = public as $$
  select id, username, name, role from app_users
  where username = lower(trim(p_username)) and password_hash = extensions.crypt(p_password, password_hash);
$$;

create or replace function public.list_app_users()
returns table(id uuid, username text, name text, role text) language sql security definer set search_path = public as $$
  select id, username, name, role from app_users order by name;
$$;

create or replace function public.update_app_user(p_id uuid, p_username text, p_name text, p_role text, p_password text default null)
returns public.app_users language plpgsql security definer set search_path = public as $$
declare result public.app_users;
begin
  update app_users set username = lower(trim(p_username)), name = p_name, role = p_role,
    password_hash = case when coalesce(p_password, '') = '' then password_hash else extensions.crypt(p_password, extensions.gen_salt('bf')) end
  where id = p_id returning * into result;
  return result;
end; $$;

create or replace function public.delete_app_user(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare admin_count integer;
begin
  select count(*) into admin_count from app_users where role = 'admin';
  if (select role from app_users where id = p_id) = 'admin' and admin_count <= 1 then
    raise exception 'Não é possível excluir o último administrador';
  end if;
  delete from app_users where id = p_id;
end; $$;

-- Registra a venda, os itens, a baixa do estoque e o fiado em uma única transação.
create or replace function public.register_sale(p_sale jsonb, p_operator text)
returns public.sales language plpgsql security definer set search_path = public as $$
declare result public.sales; item jsonb; p_id uuid; p_stock integer; qty integer;
begin
  if jsonb_array_length(coalesce(p_sale->'items', '[]'::jsonb)) = 0 then raise exception 'A venda não possui itens'; end if;
  insert into sales (client_id, client_name, subtotal, discount, total, payment_method, seller)
  values (nullif(p_sale->>'clientId','')::uuid, coalesce(p_sale->>'clientName','Consumidor Final'),
    (p_sale->>'subtotal')::numeric, coalesce((p_sale->>'discount')::numeric,0), (p_sale->>'total')::numeric,
    p_sale->>'paymentMethod', p_operator) returning * into result;
  for item in select * from jsonb_array_elements(p_sale->'items') loop
    p_id := (item->>'productId')::uuid; qty := (item->>'quantity')::integer;
    select stock into p_stock from products where id = p_id for update;
    if p_stock is null then raise exception 'Produto não encontrado'; end if;
    if p_stock < qty then raise exception 'Estoque insuficiente'; end if;
    insert into sale_items (sale_id, product_id, name, quantity, unit_price, total_price)
    values (result.id, p_id, item->>'name', qty, (item->>'unitPrice')::numeric, (item->>'totalPrice')::numeric);
    update products set stock = stock - qty where id = p_id;
    insert into stock_movements (product_id, product_name, quantity, type, motive, "user")
    values (p_id, item->>'name', qty, 'output', 'Venda nº ' || result.id, p_operator);
  end loop;
  if result.client_id is not null then
    update clients set purchase_count = purchase_count + 1, total_spent = total_spent + result.total,
      debt = debt + case when result.payment_method = 'fiado' then result.total else 0 end
    where id = result.client_id;
  end if;
  return result;
end; $$;

create or replace function public.pay_client_debt(p_client_id uuid, p_amount numeric, p_operator text)
returns public.clients language plpgsql security definer set search_path = public as $$
declare result public.clients; paid numeric;
begin
  select * into result from clients where id = p_client_id for update;
  if not found then raise exception 'Cliente não encontrado'; end if;
  paid := least(p_amount, result.debt);
  update clients set debt = debt - paid where id = p_client_id returning * into result;
  insert into sales (client_id, client_name, subtotal, discount, total, payment_method, seller)
  values (result.id, result.name, -paid, 0, -paid, 'dinheiro', p_operator);
  return result;
end; $$;

-- Para esta versão simples (sem Supabase Auth), o site usa a chave ANON e RLS libera o acesso.
-- Antes de publicar para terceiros, substitua estas políticas por autenticação Supabase e regras por usuário/loja.
alter table public.app_users enable row level security;
alter table public.products enable row level security;
alter table public.clients enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.stock_movements enable row level security;
drop policy if exists "app access" on public.products;
drop policy if exists "app access" on public.clients;
drop policy if exists "app access" on public.sales;
drop policy if exists "app access" on public.sale_items;
drop policy if exists "app access" on public.stock_movements;
create policy "app access" on public.products for all to anon using (true) with check (true);
create policy "app access" on public.clients for all to anon using (true) with check (true);
create policy "app access" on public.sales for select to anon using (true);
create policy "app access" on public.sale_items for select to anon using (true);
create policy "app access" on public.stock_movements for all to anon using (true) with check (true);
grant execute on function public.create_app_user(text,text,text,text), public.verify_app_login(text,text), public.list_app_users(), public.update_app_user(uuid,text,text,text,text), public.delete_app_user(uuid), public.register_sale(jsonb,text), public.pay_client_debt(uuid,numeric,text) to anon;

-- Primeiro acesso: usuário admin / senha admin123. Troque a senha após entrar.
select public.create_app_user('admin', 'admin123', 'Administrador', 'admin')
where not exists (select 1 from public.app_users where username = 'admin');

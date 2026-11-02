-- Jalankan hanya pada proyek Supabase khusus FlexKas.
begin;
create table if not exists public.flex_members (
  member_key text primary key check(member_key in ('adit','rainer','kiandra','bima','fakhri')),
  display_name text not null,
  login_email text not null unique,
  display_role text not null,
  access_role text not null check(access_role in ('admin','viewer')),
  constraint flex_fixed_admin check((member_key='fakhri' and access_role='admin') or (member_key<>'fakhri' and access_role='viewer'))
);
insert into public.flex_members values
 ('adit','Adit','adit@flexboxstudio.site','Leader','viewer'),
 ('rainer','Rainer','rainer@flexboxstudio.site','Wakil Leader','viewer'),
 ('kiandra','Kiandra','kiandra@flexboxstudio.site','Keamanan','viewer'),
 ('bima','Bima','bima@flexboxstudio.site','Kreatif','viewer'),
 ('fakhri','Fakhri','fakhri@flexboxstudio.site','Bendahara','admin')
on conflict(member_key) do update set display_name=excluded.display_name,login_email=excluded.login_email,display_role=excluded.display_role,access_role=excluded.access_role;

-- Hanya owner/service_role yang boleh menghubungkan Auth user ke anggota.
-- Tidak ada trigger berdasarkan email atau user_metadata dari pendaftaran publik.
create table if not exists public.flex_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  member_key text not null unique references public.flex_members(member_key),
  created_at timestamptz not null default now()
);
create table if not exists public.flex_wallet (
  singleton boolean primary key default true check(singleton),
  state jsonb not null,
  revision bigint not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
with periods as (
 select 2026 as year,n as week,date '2026-10-23'+(n-1)*7 as start_date,least(date '2026-10-23'+(n-1)*7+6,date '2026-12-31') as end_date from generate_series(1,10) n
 union all
 select 2027,n,date '2027-01-01'+(n-1)*7,least(date '2027-01-01'+(n-1)*7+6,date '2027-12-31') from generate_series(1,53) n
), p as (
 select jsonb_agg(jsonb_build_object('id',year||'-W'||lpad(week::text,2,'0'),'year',year,'week',week,'start',start_date::text,'end',end_date::text) order by start_date) as value from periods
), m as (
 select jsonb_agg(jsonb_build_object('id','flexbox-'||member_key,'name',display_name,'role',display_role) order by case member_key when 'adit' then 1 when 'rainer' then 2 when 'kiandra' then 3 when 'bima' then 4 else 5 end) as value from public.flex_members
)
insert into public.flex_wallet(singleton,state)
select true,jsonb_build_object('demo',false,'teamRosterVersion',1,'monthlyDues',5000,'weeklyDues',5000,'duesFrequency','weekly','openingBalance',0,'duesPeriods',p.value,'selectedDuesPeriod','2026-W01','members',m.value,'transactions','[]'::jsonb) from p,m
on conflict(singleton) do nothing;

create or replace function public.flex_has_profile() returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.flex_profiles where user_id=auth.uid());
$$;
create or replace function public.flex_is_admin() returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.flex_profiles p join public.flex_members m using(member_key) where p.user_id=auth.uid() and m.member_key='fakhri' and m.access_role='admin');
$$;
alter table public.flex_members enable row level security;
alter table public.flex_profiles enable row level security;
alter table public.flex_wallet enable row level security;
revoke all on public.flex_members,public.flex_profiles,public.flex_wallet from anon,authenticated;
grant all on public.flex_members,public.flex_profiles,public.flex_wallet to service_role;
revoke all on function public.flex_has_profile(),public.flex_is_admin() from public;
grant execute on function public.flex_has_profile(),public.flex_is_admin() to authenticated;

create or replace function public.flex_snapshot() returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare account jsonb; wallet jsonb;
begin
 if not public.flex_has_profile() then raise exception 'Akun belum diizinkan untuk FlexKas' using errcode='42501'; end if;
 select jsonb_build_object('user_id',p.user_id,'member_key',m.member_key,'display_name',m.display_name,'display_role',m.display_role,'access_role',m.access_role,'login_email',m.login_email) into account
 from public.flex_profiles p join public.flex_members m using(member_key) where p.user_id=auth.uid();
 select jsonb_build_object('state',state,'revision',revision,'updated_at',updated_at) into wallet from public.flex_wallet where singleton;
 return wallet||jsonb_build_object('profile',account);
end; $$;
revoke all on function public.flex_snapshot() from public;
grant execute on function public.flex_snapshot() to authenticated;

create or replace function public.flex_save_wallet(p_state jsonb,p_expected_revision bigint) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare current_revision bigint; item jsonb; total numeric; member_ids text[]; names text[]; period_ids text[];
begin
 if not public.flex_is_admin() then raise exception 'Hanya Fakhri sebagai admin yang dapat mengubah kas' using errcode='42501'; end if;
 select revision into current_revision from public.flex_wallet where singleton for update;
 if current_revision is distinct from p_expected_revision then raise exception 'Kas sudah berubah. Muat ulang sebelum menyimpan.' using errcode='40001'; end if;
 if p_state is null or jsonb_typeof(p_state)<>'object' or octet_length(p_state::text)>2000000 or jsonb_typeof(p_state->'members') is distinct from 'array' or jsonb_typeof(p_state->'transactions') is distinct from 'array' or jsonb_typeof(p_state->'duesPeriods') is distinct from 'array' then raise exception 'Format kas tidak valid'; end if;
 if jsonb_array_length(p_state->'members')<>5 or jsonb_array_length(p_state->'transactions')>20000 or jsonb_array_length(p_state->'duesPeriods') not between 1 and 1000 then raise exception 'Jumlah data kas tidak valid'; end if;
 select array_agg(value->>'id'),array_agg(lower(trim(value->>'name')) order by lower(trim(value->>'name'))) into member_ids,names from jsonb_array_elements(p_state->'members');
 if names is distinct from array['adit','bima','fakhri','kiandra','rainer'] or (select count(distinct x) from unnest(member_ids) x)<>5 or exists(select 1 from unnest(member_ids) x where coalesce(x,'')!~'^[A-Za-z0-9_-]{1,100}$') then raise exception 'Anggota harus sesuai lima akun Flexbox'; end if;
 if (p_state->>'duesFrequency') is distinct from 'weekly' or coalesce(p_state->>'weeklyDues','')!~'^[0-9]+$' or (p_state->>'weeklyDues')::numeric not between 1 and 1000000000 or coalesce(p_state->>'openingBalance','0')!~'^[0-9]+$' then raise exception 'Nominal iuran atau saldo awal tidak valid'; end if;
 total:=coalesce((p_state->>'openingBalance')::numeric,0);
 if total>100000000000 then raise exception 'Saldo awal terlalu besar'; end if;
 select array_agg(value->>'id') into period_ids from jsonb_array_elements(p_state->'duesPeriods');
 if (select count(distinct x) from unnest(period_ids) x)<>cardinality(period_ids) then raise exception 'Periode iuran berulang'; end if;
 for item in select value from jsonb_array_elements(p_state->'duesPeriods') loop
  if coalesce(item->>'year','')!~'^[0-9]{4}$' or coalesce(item->>'week','')!~'^[0-9]{1,2}$' or (item->>'week')::int not between 1 and 53 or (item->>'id') is distinct from ((item->>'year')||'-W'||lpad(item->>'week',2,'0')) or coalesce(item->>'id','')!~'^[0-9]{4}-W[0-9]{2}$' or coalesce(item->>'start','')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or coalesce(item->>'end','')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or (item->>'start')::date>(item->>'end')::date then raise exception 'Periode iuran tidak valid'; end if;
 end loop;
 if (select count(distinct value->>'id') from jsonb_array_elements(p_state->'transactions'))<>jsonb_array_length(p_state->'transactions') then raise exception 'ID transaksi berulang'; end if;
 for item in select value from jsonb_array_elements(p_state->'transactions') loop
  if coalesce(item->>'id','')!~'^[A-Za-z0-9_-]{1,100}$' or coalesce(item->>'type','') not in ('income','expense') or coalesce(item->>'amount','')!~'^[0-9]+$' or (item->>'amount')::numeric not between 1 and 100000000000 or coalesce(length(item->>'title'),0) not between 1 and 1000 or coalesce(length(item->>'note'),0)>5000 or coalesce(item->>'date','')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Transaksi tidak valid'; end if;
  perform (item->>'date')::date;
  if item->>'type'='income' and item->>'category'='Iuran' and (not coalesce(item->>'memberId'=any(member_ids),false) or not coalesce(item->>'duesPeriod'=any(period_ids),false)) then raise exception 'Alokasi iuran tidak valid'; end if;
  total:=total+case when item->>'type'='income' then (item->>'amount')::numeric else -(item->>'amount')::numeric end;
 end loop;
 if total<0 then raise exception 'Saldo kas tidak boleh negatif'; end if;
 update public.flex_wallet set state=(p_state-'importSummary')||jsonb_build_object('demo',false,'teamRosterVersion',1),revision=revision+1,updated_at=now(),updated_by=auth.uid() where singleton;
 return public.flex_snapshot();
end; $$;
revoke all on function public.flex_save_wallet(jsonb,bigint) from public;
grant execute on function public.flex_save_wallet(jsonb,bigint) to authenticated;

create table if not exists public.flex_push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.flex_profiles(user_id) on delete cascade,
 endpoint text not null unique check(length(endpoint)<2048 and endpoint~'^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-zA-Z0-9.-]+\.push\.apple\.com|[a-zA-Z0-9-]+\.notify\.windows\.com)/'),
 p256dh text not null check(length(p256dh) between 40 and 200),
 auth text not null check(length(auth) between 16 and 100),
 created_at timestamptz not null default now()
);
alter table public.flex_push_subscriptions enable row level security;
revoke all on public.flex_push_subscriptions from anon,authenticated;
grant select,insert,update,delete on public.flex_push_subscriptions to authenticated;
grant all on public.flex_push_subscriptions to service_role;
drop policy if exists flex_own_push on public.flex_push_subscriptions;
create policy flex_own_push on public.flex_push_subscriptions for all to authenticated using(user_id=auth.uid() and public.flex_has_profile()) with check(user_id=auth.uid() and public.flex_has_profile());

create table if not exists public.flex_reminder_deliveries (
 user_id uuid not null references public.flex_profiles(user_id) on delete cascade,
 period_id text not null,
 day_jakarta date not null,
 status text not null check(status in ('processing','sent','failed')),
 updated_at timestamptz not null default now(),
 primary key(user_id,period_id,day_jakarta)
);
create table if not exists public.flex_push_test_limits(user_id uuid primary key references public.flex_profiles(user_id) on delete cascade,last_test_at timestamptz not null);
alter table public.flex_reminder_deliveries enable row level security;
alter table public.flex_push_test_limits enable row level security;
revoke all on public.flex_reminder_deliveries,public.flex_push_test_limits from anon,authenticated;
grant all on public.flex_reminder_deliveries,public.flex_push_test_limits to service_role;
create or replace function public.flex_claim_reminder(p_user_id uuid,p_period_id text,p_day date) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare claimed uuid;
begin
 insert into public.flex_reminder_deliveries values(p_user_id,p_period_id,p_day,'processing',now())
 on conflict(user_id,period_id,day_jakarta) do update set status='processing',updated_at=now()
 where flex_reminder_deliveries.status='failed' or (flex_reminder_deliveries.status='processing' and flex_reminder_deliveries.updated_at<now()-interval '15 minutes')
 returning user_id into claimed;
 return claimed is not null;
end; $$;
create or replace function public.flex_claim_push_test(p_user_id uuid) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare claimed uuid;
begin
 insert into public.flex_push_test_limits values(p_user_id,now()) on conflict(user_id) do update set last_test_at=now() where flex_push_test_limits.last_test_at<now()-interval '60 seconds' returning user_id into claimed;
 return claimed is not null;
end; $$;
revoke all on function public.flex_claim_reminder(uuid,text,date),public.flex_claim_push_test(uuid) from public,anon,authenticated;
grant execute on function public.flex_claim_reminder(uuid,text,date),public.flex_claim_push_test(uuid) to service_role;
commit;

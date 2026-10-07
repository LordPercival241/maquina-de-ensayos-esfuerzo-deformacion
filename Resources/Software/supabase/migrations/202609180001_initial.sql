-- UTM Lab · Esquema de Supabase
--
-- POLÍTICA DE PRIVACIDAD Y ALMACENAMIENTO:
-- Todos los datos de ensayos mecánicos (muestras numéricas, curvas de esfuerzo-deformación,
-- archivos CSV y reportes PDF) se procesan y generan 100% en la memoria local del navegador
-- del operador y se descargan a su computadora.
--
-- NO se almacenan archivos masivos ni mediciones en Supabase para evitar consumir el espacio
-- de almacenamiento gratuito o limitado de la nube.
--
-- Supabase se reserva EXCLUSIVAMENTE para:
-- 1. Autenticación de operadores (auth.users con Email y Contraseña).
-- 2. Validación de tokens JWT para el Asistente de IA (/api/assistant).

-- Tabla opcional de perfiles de operadores (para consultar nombres y roles)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text default 'operator',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Operadores pueden ver su propio perfil" 
  on public.profiles for select 
  using (auth.uid() = id);

create policy "Operadores pueden actualizar su propio perfil" 
  on public.profiles for update 
  using (auth.uid() = id);

-- Trigger automático para registrar el perfil cuando un usuario se registra
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'Operador')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

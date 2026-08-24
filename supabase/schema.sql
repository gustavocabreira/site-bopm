-- Rode este script no SQL editor do Supabase (Project > SQL Editor).
-- Guarda a ultima guarnicao usada por cada usuario Discord, para reaproveitar
-- no formulario de emissao de boletim.

create table if not exists crews (
  discord_user_id text primary key,
  prefixo text not null,
  chefe_equipe text not null,
  motorista text not null,
  homem3 text,
  homem4 text,
  updated_at timestamptz not null default now()
);

alter table crews enable row level security;

-- Apenas a service role (usada nas API routes do servidor) acessa esta tabela;
-- nenhuma policy é criada para anon/authenticated de propósito.

-- Historico dos boletins confirmados, para consulta e copia posterior (ex.: colar no Discord).
create table if not exists boletins (
  id uuid primary key default gen_random_uuid(),
  discord_user_id text not null,
  discord_user_name text,
  prefixo text not null,
  local text not null,
  natureza text not null,
  texto text not null,
  created_at timestamptz not null default now()
);

alter table boletins enable row level security;

-- Apenas a service role (usada nas API routes do servidor) acessa esta tabela;
-- nenhuma policy é criada para anon/authenticated de propósito.

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

-- Migracao: suporte a multiplos individuos abordados e materiais apreendidos
-- estruturados por boletim, usados no relatorio agregado por periodo.
-- Rode este bloco no SQL editor do Supabase para atualizar uma tabela `boletins`
-- ja existente (o `create table if not exists` acima nao adiciona colunas novas).
alter table boletins add column if not exists individuos jsonb not null default '[]'::jsonb;
alter table boletins add column if not exists materiais jsonb not null default '[]'::jsonb;

-- Migracao: chefe da equipe, usado no ranking de prisoes por policial no relatorio.
alter table boletins add column if not exists chefe_equipe text;

-- Migracao: demais integrantes da guarnicao, para o ranking de prisoes contar
-- todo mundo que participou da ocorrencia, nao so o chefe da equipe.
alter table boletins add column if not exists motorista text;
alter table boletins add column if not exists homem3 text;
alter table boletins add column if not exists homem4 text;

-- Migracao: campos que faltavam para reconstruir o boletim inteiro na edicao
-- pos-confirmacao (o `texto` passa a ser gerado a partir destes, nao editado
-- direto, para nao divergir dos dados estruturados usados no relatorio).
alter table boletins add column if not exists data text;
alter table boletins add column if not exists horario text;
alter table boletins add column if not exists veiculo text;
alter table boletins add column if not exists relato text;
alter table boletins add column if not exists artigos text;

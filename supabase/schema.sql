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

-- Migracao: RSO (Relatorio de Servico Operacional) obrigatorio antes de
-- qualquer BOPM. Guarda a guarnicao aberta (4 rodas ou ROCAM), o horario de
-- inicio/fim do servico e a produtividade apurada no fechamento.
create table if not exists rsos (
  id uuid primary key default gen_random_uuid(),
  discord_user_id text not null,
  discord_user_name text,
  tipo text not null check (tipo in ('quatro_rodas', 'rocam')),
  turno text,
  viatura text,
  prefixo text not null,
  chefe_equipe text,
  motorista text,
  homem3 text,
  homem4 text,
  r1_encarregado text,
  r2_apoio_tatico text,
  r3_interventor text,
  iniciado_em timestamptz not null default now(),
  encerrado_em timestamptz,
  produtividade jsonb,
  texto_fechamento text,
  created_at timestamptz not null default now()
);

alter table rsos enable row level security;

-- Garante um unico RSO aberto por usuario.
create unique index if not exists rsos_um_aberto_por_usuario
  on rsos (discord_user_id) where encerrado_em is null;

-- Liga cada BOPM ao RSO em que foi feito, para agregar produtividade e
-- listar os BOPMs do servico atual.
alter table boletins add column if not exists rso_id uuid references rsos(id);

-- Historico de remodulacoes (troca de integrante da guarnicao) durante um RSO.
create table if not exists rso_remodulacoes (
  id uuid primary key default gen_random_uuid(),
  rso_id uuid not null references rsos(id),
  trocado_em timestamptz not null default now(),
  integrantes_anteriores jsonb not null,
  integrantes_novos jsonb not null,
  created_at timestamptz not null default now()
);

alter table rso_remodulacoes enable row level security;

-- Migracao: numero do BOPM no sistema oficial da cidade, informado pelo
-- policial no fechamento do RSO (nao existe no momento da criacao do BOPM).
alter table boletins add column if not exists numero_sistema text;

-- Cache dos membros de uma guilda do Discord, mantido pelo bot (conexao
-- gateway persistente, fora da Vercel) a cada entrada/saida/troca de
-- apelido — usado para preencher o autocomplete de nomes ao abrir RSO e
-- remodular, sem bater na API do Discord a cada requisicao do site.
create table if not exists guild_members (
  guild_id text not null,
  discord_user_id text not null,
  nome text not null,
  is_bot boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (guild_id, discord_user_id)
);

alter table guild_members enable row level security;

-- Apenas a service role (usada pelo bot e pelas API routes do servidor)
-- acessa esta tabela; nenhuma policy e criada para anon/authenticated.

-- ============================================================
-- Studio Deck Builder — schema (Chunk 1 of the May 2026 plan).
--
-- Adds three tables:
--   1. studio_decks            — one row per draft/published deck
--   2. studio_assets           — per-deck source material (images,
--                                 PDFs, YouTube transcripts, avatars)
--   3. studio_topic_starters   — curated topic ideas shown on the
--                                 composer's sample-topics gallery
--
-- And extends:
--   - profiles  → closing-slide personalisation fields
--                 (title, phone, whatsapp, calendar_url, rera_number)
--
-- RLS model: tenant-scoped read/write for adviser-side queries;
-- published decks are publicly readable so the share link
-- (/p/:share_token) can resolve without auth.
--
-- The `template_slug` enum is the 4 templates shipping in Chunk 1:
--   cinematic-gold / architectural-bold / editorial-light / investor-brief
--
-- The `audience` enum supports both the existing investor-flow values
-- (end_user / investor / both) AND the spec's training/event values
-- (team / clients / open_house) so the composer can adapt over time
-- without another migration.
-- ============================================================

-- ─── studio_decks ─────────────────────────────────────────────
create table public.studio_decks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  profile_id uuid not null references public.profiles(id),

  template_slug text not null default 'cinematic-gold'
    check (template_slug in (
      'cinematic-gold', 'architectural-bold',
      'editorial-light', 'investor-brief'
    )),

  topic text,
  audience text check (audience in (
    'end_user', 'investor', 'both',
    'team', 'clients', 'open_house'
  )),

  -- Brief = the raw input form (topic, audience, voice_notes,
  --   contact_bg_prompt, language). Persisted so we can re-run
  --   generation later without losing intent.
  brief jsonb not null default '{}'::jsonb,

  -- Outline = the LLM-produced slide list. Each entry:
  --   { slide_type: 'cover'|'market_trend'|…, headline, body,
  --     citation?: { tool, params, rows, fetched_at, source } }
  outline jsonb not null default '[]'::jsonb,

  -- Visuals = per-slide image overrides, keyed by slide_type or index:
  --   { '0': { src, source: 'upload'|'stock', asset_id?, stock_id? }, … }
  visuals jsonb not null default '{}'::jsonb,

  -- Reference assets attached to the deck (PDFs + YouTube transcripts):
  --   [{ kind: 'pdf'|'youtube', asset_id?, source_url? }]
  -- `references` is reserved-ish in SQL; using `reference_assets`.
  reference_assets jsonb not null default '[]'::jsonb,

  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),

  share_token text unique,
  slug text,
  last_data_refresh_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index studio_decks_tenant_status_idx
  on public.studio_decks (tenant_id, status);
create index studio_decks_profile_idx
  on public.studio_decks (profile_id);
create index studio_decks_share_token_idx
  on public.studio_decks (share_token) where share_token is not null;

-- ─── studio_assets ───────────────────────────────────────────
create table public.studio_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  profile_id uuid not null references public.profiles(id),
  deck_id uuid references public.studio_decks(id) on delete cascade,

  kind text not null
    check (kind in ('image', 'pdf', 'youtube_transcript', 'avatar')),

  -- Either a Storage path (for uploads) OR a remote source URL
  -- (for YouTube). Exactly one should be populated per row.
  storage_path text,
  source_url text,

  -- For PDFs and YouTube transcripts, the extracted text. Indexed
  -- (BTree, not GIN — we look up the row by id, never search the text).
  extracted_text text,

  created_at timestamptz not null default now(),

  constraint studio_assets_source_check check (
    storage_path is not null or source_url is not null
  )
);

create index studio_assets_tenant_idx on public.studio_assets (tenant_id);
create index studio_assets_deck_idx   on public.studio_assets (deck_id);

-- ─── studio_topic_starters ───────────────────────────────────
-- Curated starter topics for the composer's sample-topics gallery.
-- Admin-editable via a future admin page; ship with ~12 seeds.
create table public.studio_topic_starters (
  id uuid primary key default gen_random_uuid(),
  label text not null,            -- short card title (≤60 chars)
  prompt text not null,           -- pre-filled topic textarea content
  audience text check (audience in (
    'end_user', 'investor', 'both',
    'team', 'clients', 'open_house'
  )),
  sort_order int not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index studio_topic_starters_enabled_idx
  on public.studio_topic_starters (enabled, sort_order);

-- ─── profiles — closing-slide personalisation ─────────────────
alter table public.profiles
  add column if not exists title text,
  add column if not exists phone text,
  add column if not exists whatsapp text,
  add column if not exists calendar_url text,
  add column if not exists rera_number text;

-- (avatar_url + email already confirmed present on profiles.
--  tenants.rera_number = brokerage ORN (already exists);
--  profiles.rera_number = adviser BRN (added above) — the closing
--  slide shows the adviser's BRN, the brokerage ORN comes from
--  tenants if a tenant-wide footer is needed.)

-- ─── RLS ─────────────────────────────────────────────────────
alter table public.studio_decks            enable row level security;
alter table public.studio_assets           enable row level security;
alter table public.studio_topic_starters   enable row level security;

-- studio_decks ────
create policy "studio_decks_select_own_tenant_or_published"
  on public.studio_decks for select
  using (
    status = 'published'
    or tenant_id in (
      select tenant_id from public.profiles where user_id = auth.uid()
    )
  );

create policy "studio_decks_insert_own_tenant"
  on public.studio_decks for insert
  with check (
    profile_id in (
      select id from public.profiles where user_id = auth.uid()
    )
    and tenant_id in (
      select tenant_id from public.profiles where user_id = auth.uid()
    )
  );

create policy "studio_decks_update_own_tenant"
  on public.studio_decks for update
  using (
    tenant_id in (
      select tenant_id from public.profiles where user_id = auth.uid()
    )
  );

create policy "studio_decks_delete_own_tenant"
  on public.studio_decks for delete
  using (
    tenant_id in (
      select tenant_id from public.profiles where user_id = auth.uid()
    )
  );

-- studio_assets ────
create policy "studio_assets_select_own_tenant"
  on public.studio_assets for select
  using (
    tenant_id in (
      select tenant_id from public.profiles where user_id = auth.uid()
    )
  );

create policy "studio_assets_insert_own_tenant"
  on public.studio_assets for insert
  with check (
    profile_id in (
      select id from public.profiles where user_id = auth.uid()
    )
    and tenant_id in (
      select tenant_id from public.profiles where user_id = auth.uid()
    )
  );

create policy "studio_assets_update_own_tenant"
  on public.studio_assets for update
  using (
    tenant_id in (
      select tenant_id from public.profiles where user_id = auth.uid()
    )
  );

create policy "studio_assets_delete_own_tenant"
  on public.studio_assets for delete
  using (
    tenant_id in (
      select tenant_id from public.profiles where user_id = auth.uid()
    )
  );

-- studio_topic_starters: world-readable when enabled.
create policy "studio_topic_starters_select_enabled"
  on public.studio_topic_starters for select
  using (enabled = true);

-- ─── Seed: 12 starter topics ─────────────────────────────────
insert into public.studio_topic_starters (label, prompt, audience, sort_order) values
  ('Off-plan vs secondary in Dubai 2026',
   'How the off-plan vs secondary market has shifted in Dubai over the last 12 months — volumes, prices, what investors should choose now.',
   'investor', 10),
  ('Why JVC rents outperform',
   'A deep look at Jumeirah Village Circle: why rents and price-per-sqft growth have outpaced the rest of Dubai, and which sub-zones to target.',
   'investor', 20),
  ('Cooling signals after a strong year',
   'A cautious read of Dubai market cooling signals over the last quarter and what they mean for portfolio decisions.',
   'investor', 30),
  ('First-time buyer in Dubai',
   'A friendly buyer-side brief on what an end user can realistically afford in Dubai today, with payment plans and area picks.',
   'end_user', 40),
  ('Top yield areas right now',
   'The five highest gross rental yield areas in Dubai based on the latest 12 months of DLD data.',
   'investor', 50),
  ('Palm Jumeirah secondary market',
   'A focused brief on the Palm Jumeirah secondary market — sales velocity, price trends, what is selling.',
   'both', 60),
  ('Open house playbook — Dubai Hills',
   'A presentation-style brief for an open house in Dubai Hills Estate, with comparable sales and amenity story.',
   'end_user', 70),
  ('Adviser team training — Q2 market',
   'A team-training brief covering the Dubai Q2 market: volumes, areas to push, areas to deprioritise.',
   'team', 80),
  ('London prime — SW1 + W1 buyers',
   'A brief on London prime postcodes (SW1, W1) for clients comparing Dubai to London — price PSF, transaction velocity, recent shifts.',
   'both', 90),
  ('NYC vs Dubai for global investors',
   'A side-by-side framing of New York City vs Dubai for a global investor — comparable transaction sizes, yield, regulatory environment.',
   'investor', 100),
  ('Off-plan launches worth a meeting',
   'A curated tour of the off-plan project launches that justify a serious client meeting this quarter.',
   'investor', 110),
  ('Why secondary, not off-plan, right now',
   'A persuasive brief on why an investor should consider the secondary market over an off-plan launch in the current cycle.',
   'investor', 120);

-- ─── updated_at trigger on studio_decks ─────────────────────
create or replace function public.studio_decks_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger studio_decks_set_updated_at_trg
  before update on public.studio_decks
  for each row execute function public.studio_decks_set_updated_at();

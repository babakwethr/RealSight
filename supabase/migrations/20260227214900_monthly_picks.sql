create table public.monthly_picks (
    id uuid default gen_random_uuid() primary key,
    month varchar not null, -- format 'YYYY-MM'
    title text not null,
    notes text,
    created_by uuid references auth.users(id),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.monthly_pick_items (
    id uuid default gen_random_uuid() primary key,
    pick_id uuid references public.monthly_picks(id) on delete cascade not null,
    project_source varchar not null check (project_source in ('reelly', 'demo')),
    project_id varchar not null,
    rank integer not null default 1,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.monthly_picks enable row level security;
alter table public.monthly_pick_items enable row level security;

-- Policies
create policy "Anyone can read monthly picks" on public.monthly_picks
    for select using (true);

create policy "Admins can manage monthly picks" on public.monthly_picks
    for all using (
        exists (
            select 1 from public.user_roles
            where user_roles.user_id = auth.uid() and user_roles.role = 'admin'
        )
    );

create policy "Anyone can read monthly pick items" on public.monthly_pick_items
    for select using (true);

create policy "Admins can manage monthly pick items" on public.monthly_pick_items
    for all using (
        exists (
            select 1 from public.user_roles
            where user_roles.user_id = auth.uid() and user_roles.role = 'admin'
        )
    );

-- ============================================================
-- スポット表の作成
--
-- Supabase の「SQL Editor」にこのファイルの中身を貼り付けて実行します。
-- SQL = データベースに指示を出すための言語です。
-- ============================================================

-- ------------------------------------------------------------
-- 1. 表（テーブル）を作る
--    表 = Excelのシートのようなもの。1行が1スポット。
-- ------------------------------------------------------------
create table if not exists public.spots (
  -- id: 1行ごとの固有番号。自動で作られる（gen_random_uuid）
  id uuid primary key default gen_random_uuid(),

  name    text not null,  -- not null = 空っぽを許さない
  address text not null,
  ward    text not null,  -- 区（chiyoda / shibuya など）
  genre   text not null,  -- ジャンル（cafe / dinner など）

  budget_band  text not null,  -- 予算帯
  time_of_day  text not null,  -- 昼 / 夜 / 両方

  memo text not null default '',  -- ひとことメモ。未入力なら空文字

  -- 緯度・経度。double precision = 小数を精密に扱う型
  lat double precision not null,
  lng double precision not null,

  -- 元投稿のリンク。無い場合もあるので not null を付けない
  instagram_url text,
  tiktok_url    text,

  -- false にすると下書き扱いになり、一般には表示されない
  is_published boolean not null default true,

  created_at timestamptz not null default now(),  -- 作成日時（自動）
  updated_at timestamptz not null default now(),  -- 更新日時（自動）

  -- ----------------------------------------------------------
  -- 制約（check）: 決められた値以外は保存させない。
  -- アプリ側にバグがあってもデータが壊れないようにする最後の砦。
  -- ----------------------------------------------------------
  constraint spots_ward_check check (ward in (
    'chiyoda','chuo','minato','shinjuku','bunkyo','taito','sumida','koto',
    'shinagawa','meguro','ota','setagaya','shibuya','nakano','suginami',
    'toshima','kita','arakawa','itabashi','nerima','adachi','katsushika','edogawa'
  )),

  constraint spots_genre_check check (genre in (
    'cafe','dinner','nightview','experience','walk','indoor'
  )),

  constraint spots_budget_band_check check (budget_band in (
    'under_1000','b1000_3000','b3000_6000','b6000_10000','over_10000'
  )),

  constraint spots_time_of_day_check check (time_of_day in ('day','night','both')),

  -- 東京23区からかけ離れた座標を弾く（入力ミス対策）
  constraint spots_lat_check check (lat between 35.4 and 35.95),
  constraint spots_lng_check check (lng between 139.4 and 140.05),

  constraint spots_name_not_blank check (length(trim(name)) > 0)
);

-- ------------------------------------------------------------
-- 2. 索引（インデックス）を作る
--    本の索引と同じで、絞り込みを速くするための仕組み。
-- ------------------------------------------------------------
create index if not exists spots_ward_idx         on public.spots (ward);
create index if not exists spots_genre_idx        on public.spots (genre);
create index if not exists spots_is_published_idx on public.spots (is_published);

-- ------------------------------------------------------------
-- 3. 更新日時を自動で記録する仕組み（トリガー）
--    行が更新されるたびに updated_at を今の時刻に書き換える。
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists spots_set_updated_at on public.spots;

create trigger spots_set_updated_at
  before update on public.spots
  for each row
  execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 4. 行レベルセキュリティ（RLS）
--
--    ここが最重要。
--    「誰がどの行を読み書きできるか」をデータベース自身に守らせる。
--    アプリのコードにバグがあっても、ここが守ってくれる。
--
--    anon          = ログインしていない人（＝一般の訪問者）
--    authenticated = ログイン済みの人（＝管理者のあなただけ）
-- ------------------------------------------------------------
alter table public.spots enable row level security;

-- 作り直せるように、同名のものがあれば先に消す
drop policy if exists "公開済みスポットは誰でも閲覧できる" on public.spots;
drop policy if exists "ログイン済みは全件閲覧できる"       on public.spots;
drop policy if exists "ログイン済みは追加できる"           on public.spots;
drop policy if exists "ログイン済みは更新できる"           on public.spots;
drop policy if exists "ログイン済みは削除できる"           on public.spots;

-- 一般の訪問者は「公開済み」の行だけ読める（下書きは見えない）
create policy "公開済みスポットは誰でも閲覧できる"
  on public.spots for select
  to anon, authenticated
  using (is_published = true);

-- 管理者は下書きも含めて全部読める
create policy "ログイン済みは全件閲覧できる"
  on public.spots for select
  to authenticated
  using (true);

-- 書き込みはログイン済みのみ。一般の訪問者は一切できない
create policy "ログイン済みは追加できる"
  on public.spots for insert
  to authenticated
  with check (true);

create policy "ログイン済みは更新できる"
  on public.spots for update
  to authenticated
  using (true)
  with check (true);

create policy "ログイン済みは削除できる"
  on public.spots for delete
  to authenticated
  using (true);

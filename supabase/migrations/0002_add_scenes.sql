-- ============================================================
-- シーン（タグ）の列を追加する
--
-- npm run sql:scenes でクリップボードにコピーし、
-- Supabase の「SQL Editor」に貼り付けて Run します。
-- 何度実行しても壊れないように書いてあります。
-- ============================================================

-- ------------------------------------------------------------
-- 1. scenes 列を足す
--    text[] = 文字の「一覧」を入れられる型。1つのスポットに複数のシーンを付けられる。
--    既にあるスポットは「シーンなし（空の一覧）」になる。
-- ------------------------------------------------------------
alter table public.spots
  add column if not exists scenes text[] not null default '{}';

-- ------------------------------------------------------------
-- 2. 決められたシーン以外は保存させない（src/constants/scenes.ts と一致させる）
--    <@ は「左の一覧の中身が、すべて右の一覧に含まれる」という意味。
-- ------------------------------------------------------------
alter table public.spots drop constraint if exists spots_scenes_check;
alter table public.spots add constraint spots_scenes_check check (
  scenes <@ array['first_date','anniversary','rainy_day','photogenic','no_reservation']::text[]
);

-- ------------------------------------------------------------
-- 3. シーンでの絞り込みを速くする索引
--    gin = 一覧の「中身」で探すための索引の種類。
-- ------------------------------------------------------------
create index if not exists spots_scenes_idx on public.spots using gin (scenes);

-- ------------------------------------------------------------
-- 実行後に「結果の表」に scenes / ARRAY の1行が表示されれば成功です。
-- 何も表示されない場合は、SQL全体がコメント扱いになっています（改行の問題）。
-- ------------------------------------------------------------
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'spots' and column_name = 'scenes';

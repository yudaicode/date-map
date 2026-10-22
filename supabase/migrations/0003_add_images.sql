-- ============================================================
-- 写真（サムネイル）の列と、写真の置き場所を作る
--
-- npm run sql:images でクリップボードにコピーし、
-- Supabase の「SQL Editor」に貼り付けて Run します。
-- 何度実行しても壊れないように書いてあります。
-- ============================================================

-- ------------------------------------------------------------
-- 1. image_url 列を足す（写真の場所。写真が無いスポットは null）
-- ------------------------------------------------------------
alter table public.spots
  add column if not exists image_url text;

-- ------------------------------------------------------------
-- 2. 写真の置き場所（Storage の「バケツ」）を作る
--    public = true: 写真のURLを知っていれば誰でも見られる（地図に表示するため）
--    1枚 5MB まで。JPEG / PNG / WebP だけ受け付ける
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('spot-images', 'spot-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ------------------------------------------------------------
-- 3. 写真を置く・消すのは、ログイン済み（管理者）だけ
--    （見るのは public = true なので、ここで許可しなくても誰でもできる）
-- ------------------------------------------------------------
drop policy if exists "spot-images insert by admin" on storage.objects;
create policy "spot-images insert by admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'spot-images');

drop policy if exists "spot-images update by admin" on storage.objects;
create policy "spot-images update by admin" on storage.objects
  for update to authenticated
  using (bucket_id = 'spot-images')
  with check (bucket_id = 'spot-images');

drop policy if exists "spot-images delete by admin" on storage.objects;
create policy "spot-images delete by admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'spot-images');

-- ------------------------------------------------------------
-- 実行後に「結果の表」に 写真の列 = 1 / 写真の置き場所 = 1 と出れば成功です。
-- 何も表示されない場合は、SQL全体がコメント扱いになっています（改行の問題）。
-- ------------------------------------------------------------
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'spots' and column_name = 'image_url') as 写真の列,
  (select count(*) from storage.buckets where id = 'spot-images') as 写真の置き場所;

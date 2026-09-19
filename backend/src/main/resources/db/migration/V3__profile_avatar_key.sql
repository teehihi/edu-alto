alter table profiles add column if not exists avatar_key varchar(512);

-- Remove old avatar_url column to keep avatar_key as single source of truth for object storage
alter table profiles drop column if exists avatar_url;

alter table profiles add column if not exists custom_handle varchar(60) null;
alter table profiles add column if not exists tiktok_url varchar(1024) null;

create unique index if not exists uk_profiles_custom_handle on profiles(custom_handle);

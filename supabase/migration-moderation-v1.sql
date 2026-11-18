-- Moderation v1: hidden/flagged posts + link gate (executed 2026-11-18 via Supabase SQL editor)
alter table posts add column if not exists is_hidden boolean not null default false;
alter table posts add column if not exists flag_reason text;

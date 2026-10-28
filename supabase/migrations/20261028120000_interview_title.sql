-- A name the candidate gives an interview (e.g. "Mock Google, rodada 2"). Null shows the target role, as before.
-- Kept apart from target_role, which the analysis uses as context.
alter table public.interviews
  add column title text,
  add constraint interviews_title_length_check
    check (title is null or char_length(btrim(title)) between 1 and 80);

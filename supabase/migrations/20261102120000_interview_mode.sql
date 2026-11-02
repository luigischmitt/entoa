-- Free conversation mode: a session is either an interview or a conversation with Tuck. Existing rows stay interviews.
-- conversation_topic holds the plan's short title, which also labels the session in the history.
alter table public.interviews
  add column mode text not null default 'interview',
  add column conversation_topic text,
  add constraint interviews_mode_check
    check (mode in ('interview', 'conversation')),
  add constraint interviews_conversation_topic_length_check
    check (conversation_topic is null or char_length(btrim(conversation_topic)) between 1 and 80);

CREATE TABLE public.bot_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  title TEXT NOT NULL DEFAULT 'New bot',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_threads TO authenticated;
GRANT ALL ON public.bot_threads TO service_role;
ALTER TABLE public.bot_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own threads" ON public.bot_threads FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.bot_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.bot_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users,
  role TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  sdk_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_messages TO authenticated;
GRANT ALL ON public.bot_messages TO service_role;
ALTER TABLE public.bot_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own messages" ON public.bot_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX bot_messages_thread_idx ON public.bot_messages (thread_id, created_at);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER update_bot_threads_updated_at BEFORE UPDATE ON public.bot_threads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
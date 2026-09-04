-- Published event rows are public; administrator checks only run for authenticated users.
-- Exact workshop addresses remain in the private schema behind paid-token RPCs.
ALTER POLICY "events admin all" ON public.events TO authenticated;
ALTER POLICY "published events read" ON public.events TO anon, authenticated USING (is_published);

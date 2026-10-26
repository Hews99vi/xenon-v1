process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://test-project.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-service-role-key";
(process.env as Record<string, string | undefined>).NODE_ENV = "test";

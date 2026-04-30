// lib/env.ts — runtime env validation. Public vars are bundled into the client
// and must be NEXT_PUBLIC_*. Server-only secrets must NEVER use NEXT_PUBLIC_*.

interface PublicEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

interface ServerEnv extends PublicEnv {
  SUPABASE_SERVICE_ROLE_KEY: string;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export function getPublicEnv(): PublicEnv {
  return {
    SUPABASE_URL: required("NEXT_PUBLIC_SUPABASE_URL"),
    SUPABASE_ANON_KEY: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

export function getServerEnv(): ServerEnv {
  return {
    ...getPublicEnv(),
    SUPABASE_SERVICE_ROLE_KEY: required("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

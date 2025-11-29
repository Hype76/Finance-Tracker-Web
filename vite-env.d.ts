// Reference to vite/client removed to fix "Cannot find type definition" error
// /// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Fallback declaration for CSS imports since vite/client is removed
declare module '*.css' {}

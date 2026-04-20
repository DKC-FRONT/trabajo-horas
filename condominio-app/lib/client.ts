import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // Retornamos un cliente "fantasma" o null que no rompa el build
    // pero que avisará en consola en tiempo de ejecución.
    if (typeof window !== 'undefined') {
      console.warn('Supabase keys are missing. Please check your Vercel settings.');
    }
    // Devolvemos algo que permita a Next.js terminar de construir
    // aunque no servirá para hacer peticiones reales.
    return { auth: {}, from: () => ({ select: () => ({ eq: () => ({ single: () => ({}) }) }) }) } as any;
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseKey
  )
}

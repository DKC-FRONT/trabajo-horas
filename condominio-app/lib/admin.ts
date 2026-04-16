import { createClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase con privilegios de administrador (Service Role).
 * ÚNICAMENTE para uso en el LADO DEL SERVIDOR (Server Actions / Route Handlers).
 * Permite gestionar usuarios de Auth directamente sin confirmación de email.
 */
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Faltan variables de entorno para el cliente Admin (URL o Service Role Key).');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

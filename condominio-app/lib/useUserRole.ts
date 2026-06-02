'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/client';

type Rol = 'admin' | 'trabajador' | 'residente' | 'extras';

export function useUserRole() {
  const [role, setRole] = useState<Rol | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadRole() {
      try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          if (active) setRole(null);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('id', user.id)
          .single();

        if (!active) return;

        if (profileError || !profile) {
          setRole('residente');
        } else {
          setRole((profile.rol as Rol) || 'residente');
        }
      } catch (error) {
        if (active) setRole(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRole();
    return () => {
      active = false;
    };
  }, []);

  return { role, loading };
}

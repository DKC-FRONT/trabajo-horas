Despliegue seguro de `supabase/setup.sql`

Resumen
- Este documento explica cómo respaldar y desplegar el archivo `supabase/setup.sql` en un proyecto Supabase.

Prerequisitos
- `psql`, `pg_dump`, `pg_restore` instalados (parte de Postgres client tools)
- (Opcional) `supabase` CLI instalado y autenticado (`supabase login`)
- Variables de entorno establecidas: `SUPABASE_DB_URL` o `DATABASE_URL` (cadena de conexión PostgreSQL), o `SUPABASE_PROJECT_REF` + `SUPABASE_ACCESS_TOKEN` para el CLI

Pasos recomendados
1) Crear respaldo completo (preferido: supabase CLI)

  - Con supabase CLI (si tienes `SUPABASE_PROJECT_REF`):

    supabase db dump --project-ref "$SUPABASE_PROJECT_REF" --file "backups/pre_migration_YYYYMMDD_HHMMSS.sql"

  - Con pg_dump (si tienes `DATABASE_URL` o `SUPABASE_DB_URL`):

    pg_dump "$DATABASE_URL" -Fc -f "backups/pre_migration_YYYYMMDD_HHMMSS.dump"

2) Revisar el SQL en `supabase/setup.sql`
- Revisa manualmente las secciones que hacen `DROP TABLE` o cambios destructivos.
- Ejecuta el script primero contra una instancia de staging o local antes de production.

3) Ejecutar migración en staging
- Usar el script de despliegue incluido: `scripts/deploy_supabase_setup.sh`
- Ejemplo (Linux/macOS/WSL):

    export DATABASE_URL="postgres://..."
    bash scripts/deploy_supabase_setup.sh

- Para Windows PowerShell, usa WSL o Git Bash. Evita ejecutar scripts directos si no estás en un entorno POSIX.

4) Verificaciones post-migración
- Validar que las tablas y políticas RLS existen:

    psql "$DATABASE_URL" -c "\d+ casas"

- Probar endpoints críticos (login, lecturas, reservas) en staging.

5) Despliegue en producción
- Repetir pasos 1–4 apuntando al `DATABASE_URL` de producción.
- Considerar ventana de mantenimiento si el script hace cambios drásticos.

Rollback
- Si usaste `pg_dump -Fc` (formato custom), restaurar con `pg_restore`:

    pg_restore -d "$DATABASE_URL" -c "backups/pre_migration_YYYYMMDD_HHMMSS.dump"

- Si usaste SQL plano generado por `supabase db dump`, restaurar con `psql`:

    psql "$DATABASE_URL" -f "backups/pre_migration_YYYYMMDD_HHMMSS.sql"

Notas de seguridad
- NO guardar dumps con credenciales en repositorios públicos.
- Mantener `SUPABASE_SERVICE_ROLE_KEY` fuera del entorno del deploy script; solo usar en servidores seguros.

Soporte
- Si quieres puedo:
  - Generar comandos `curl` para probar endpoints por rol.
  - Ejecutar un dry-run (simulación) del script contra una conexión de staging.

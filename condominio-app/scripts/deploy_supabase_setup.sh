#!/usr/bin/env bash
set -euo pipefail

# deploy_supabase_setup.sh
# Uso: export SUPABASE_DB_URL or export DATABASE_URL (PG connection string),
#       or set SUPABASE_PROJECT_REF + SUPABASE_ACCESS_TOKEN for supabase CLI.
# Recomendado: ejecutar primero en un entorno de staging.

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"
MIGRATION_FILE="supabase/setup.sql"

mkdir -p "$BACKUP_DIR"

# 1) Preferimos usar supabase CLI dump si está disponible
if command -v supabase >/dev/null 2>&1 && [ -n "${SUPABASE_PROJECT_REF:-}" ]; then
  echo "Creando volcado con supabase CLI..."
  supabase db dump --project-ref "$SUPABASE_PROJECT_REF" --file "$BACKUP_DIR/pre_migration_$TIMESTAMP.sql"
fi

# 2) También crear dump con pg_dump (necesita psql/pg_dump instalados)
PG_CONN="${SUPABASE_DB_URL:-${DATABASE_URL:-}}"
if [ -z "$PG_CONN" ]; then
  echo "Error: no se encontró SUPABASE_DB_URL ni DATABASE_URL. Exporta la variable y vuelve a intentar." >&2
  exit 2
fi

echo "Creando copia de seguridad completa con pg_dump..."
pg_dump "$PG_CONN" -Fc -f "$BACKUP_DIR/pre_migration_$TIMESTAMP.dump"

# 3) Validación rápida del archivo de migración
if [ ! -f "$MIGRATION_FILE" ]; then
  echo "Error: no existe $MIGRATION_FILE" >&2
  exit 3
fi

# 4) Ejecutar migración en modo transaccional
echo "Aplicando migración: $MIGRATION_FILE"
psql "$PG_CONN" -v ON_ERROR_STOP=1 -1 -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
  echo "Migración aplicada correctamente. Guarda la copia en $BACKUP_DIR/pre_migration_$TIMESTAMP.dump"
else
  echo "Falló la migración. Revisa el log y, si es necesario, restaura desde el dump." >&2
  exit 4
fi

# 5) Opcional: crear dump post-migration
pg_dump "$PG_CONN" -Fc -f "$BACKUP_DIR/post_migration_$TIMESTAMP.dump"

echo "Hecho."

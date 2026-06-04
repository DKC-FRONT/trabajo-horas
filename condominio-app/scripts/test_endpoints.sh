#!/usr/bin/env bash
set -euo pipefail

# scripts/test_endpoints.sh
# Pruebas básicas de endpoints HTTP para validar roles y autorización.
# Requisitos:
#   - curl
#   - jq
#   - API_URL debe apuntar al host donde corre la app (p.ej. http://localhost:3000)
#   - CREDENTIALS deben ser válidos para usuarios admin y residente

API_URL="${API_URL:-http://localhost:3000}"
COOKIE_DIR="tmp_cookies"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin-password}"
RESIDENT_EMAIL="${RESIDENT_EMAIL:-residente@example.com}"
RESIDENT_PASSWORD="${RESIDENT_PASSWORD:-residente-password}"
COOKIE_ADMIN="$COOKIE_DIR/admin_cookie.txt"
COOKIE_RESIDENT="$COOKIE_DIR/resident_cookie.txt"

mkdir -p "$COOKIE_DIR"

function show_header() {
  echo
  echo "===== $1 ====="
}

function http_post_json() {
  local url="$1" payload="$2" cookie_file="${3:-}" skip_cookie="${4:-false}"
  local args=("-sS" "-H" "Content-Type: application/json" "-d" "$payload")
  if [[ "$cookie_file" != "" ]]; then
    args+=("-c" "$cookie_file" "-b" "$cookie_file")
  fi
  if [[ "$skip_cookie" == "true" ]]; then
    args=("-sS" "-H" "Content-Type: application/json" "-d" "$payload")
  fi
  curl "${args[@]}" "$url"
}

function login_user() {
  local email="$1" password="$2" cookie_file="$3"
  show_header "Login: $email"
  http_post_json "$API_URL/api/login" "{\"correo\":\"$email\",\"password\":\"$password\"}" "$cookie_file" false | jq '.'
}

function test_login_invalid() {
  show_header "Login inválido"
  http_post_json "$API_URL/api/login" '{"correo":"invalid@example.com","password":"bad"}' '' true | jq '.'
}

function test_actualizacion_get() {
  local cookie_file="$1"
  show_header "GET /api/actualizacion-datos"
  curl -sS -c "$cookie_file" -b "$cookie_file" "$API_URL/api/actualizacion-datos" | jq '.'
}

function test_actualizacion_put() {
  local cookie_file="$1" body="$2"
  show_header "PUT /api/actualizacion-datos"
  curl -sS -X PUT -H "Content-Type: application/json" -c "$cookie_file" -b "$cookie_file" -d "$body" "$API_URL/api/actualizacion-datos" | jq '.'
}

function test_semana_get() {
  local cookie_file="$1" semanaKey="$2"
  show_header "GET /api/semana?semanaKey=$semanaKey"
  curl -sS -c "$cookie_file" -b "$cookie_file" "$API_URL/api/semana?semanaKey=$semanaKey" | jq '.'
}

function test_porteria_auth() {
  local pin="$1"
  show_header "POST /api/porteria/auth pin=$pin"
  http_post_json "$API_URL/api/porteria/auth" "{\"pin\": \"$pin\"}" '' true | jq '.'
}

function test_excel_admin() {
  local cookie_file="$1"
  show_header "GET /api/excel (admin)"
  curl -sS -o /dev/null -w '%{http_code}\n' -c "$cookie_file" -b "$cookie_file" "$API_URL/api/excel"
}

# Ejecutar pruebas
login_user "$ADMIN_EMAIL" "$ADMIN_PASSWORD" "$COOKIE_ADMIN"
login_user "$RESIDENT_EMAIL" "$RESIDENT_PASSWORD" "$COOKIE_RESIDENT"

test_login_invalid

test_actualizacion_get "$COOKIE_ADMIN"
test_actualizacion_get "$COOKIE_RESIDENT"

test_actualizacion_put "$COOKIE_RESIDENT" '{"casa_id":1,"nombre_propietario":"Prueba Residente","celular":"3001234567"}'

test_semana_get "$COOKIE_ADMIN" "semana-1"

test_semana_get "$COOKIE_RESIDENT" "semana-1"

test_porteria_auth "1234"

test_porteria_auth "0000"

test_excel_admin "$COOKIE_ADMIN"

echo
show_header "Pruebas completadas"

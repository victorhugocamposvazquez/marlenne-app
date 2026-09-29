#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
REF="fahiaepvzrotcfumzxyb"
# Session pooler (IPv4). db.<ref>.supabase.co suele ser solo IPv6 → ENOTFOUND en algunas redes.
POOL_HOST="aws-1-eu-west-1.pooler.supabase.com"
POOL_USER="postgres.${REF}"

echo "=== Marlén · migraciones a Supabase (prod) ==="
echo "Proyecto: $REF · pooler $POOL_HOST"
echo ""
echo "Pega la contraseña de Postgres (Dashboard → Database → password):"
read -rs DB_PASS
echo ""
if [[ -z "$DB_PASS" ]]; then
  echo "Contraseña vacía. Cancelado."
  exit 1
fi

ENC_PASS="$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$DB_PASS")"
URL="postgresql://${POOL_USER}:${ENC_PASS}@${POOL_HOST}:5432/postgres"

echo "Aplicando migraciones pendientes…"
supabase db push --db-url "$URL"
echo ""
echo "Listo."

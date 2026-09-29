#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
REF="fahiaepvzrotcfumzxyb"
POOL_HOST="aws-1-eu-west-1.pooler.supabase.com"
POOL_USER="postgres.${REF}"
OUT="/tmp/marlenne-mig-check.txt"

# psql de Homebrew (libpq) no suele estar en PATH
PSQL_BIN="$(command -v psql || true)"
if [[ -z "$PSQL_BIN" ]]; then
  for c in /usr/local/opt/libpq/bin/psql /opt/homebrew/opt/libpq/bin/psql; do
    [[ -x "$c" ]] && PSQL_BIN="$c" && break
  done
fi
if [[ -z "$PSQL_BIN" ]]; then
  echo "No hay psql. Instala libpq: brew install libpq"
  exit 1
fi

echo "=== Marlén · ¿migraciones al día? ==="
echo "Proyecto: $REF · solo pass de Postgres (sin login CLI)"
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
unset DB_PASS

REMOTE="$("$PSQL_BIN" "$URL" -Atc "select version from supabase_migrations.schema_migrations order by version;" 2>&1)" || {
  echo "Error consultando remoto:"
  echo "$REMOTE"
  exit 1
}

{
  echo "LOCAL | REMOTO | archivo"
  echo "----- | ------ | -------"
  for f in supabase/migrations/*.sql; do
    base="$(basename "$f")"
    ver="${base%%_*}"
    if printf '%s\n' "$REMOTE" | grep -qx "$ver"; then
      echo "  ✓   |   ✓    | $base"
    else
      echo "  ✓   |   ✗    | $base  ← FALTA EN REMOTO"
    fi
  done
  echo ""
  echo "Versiones en remoto que no están en local:"
  while IFS= read -r ver; do
    [[ -z "$ver" ]] && continue
    if ! ls supabase/migrations/"${ver}"_*.sql >/dev/null 2>&1; then
      echo "  ✗ local | ✓ remoto | $ver"
    fi
  done <<< "$REMOTE"
} | tee "$OUT"

echo ""
echo "Resultado también en $OUT"
unset ENC_PASS URL

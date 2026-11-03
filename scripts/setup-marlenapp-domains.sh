#!/usr/bin/env bash
# Monta dominios marlenapp.com en los 3 proyectos Vercel.
# Ejecutar en Terminal.app (login interactivo).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCOPE="${VERCEL_SCOPE:-team_47tAAi1nUYN7K2vefudH1YNc}"

vercel_token() {
  python3 - <<'PY'
import json, pathlib, sys
p = pathlib.Path.home() / "Library/Application Support/com.vercel.cli/auth.json"
if not p.exists():
    sys.exit(1)
data = json.load(p.open())
token = data.get("token") or data.get("accessToken")
if not token:
    sys.exit(1)
print(token)
PY
}

api() {
  local method="$1" path="$2"
  shift 2
  local auth
  auth="$(vercel_token)"
  curl -sS -X "$method" "https://api.vercel.com${path}?teamId=${SCOPE}" \
    -H "Authorization: Bearer ${auth}" \
    -H "Content-Type: application/json" \
    "$@"
}

echo "==> Login Vercel"
if ! vercel whoami >/dev/null 2>&1; then
  echo "Se abrirá el navegador para iniciar sesión…"
  vercel login
fi
echo "Usuario: $(vercel whoami)"

echo "==> Proyecto marlen-website"
vercel project add marlen-website --scope "$SCOPE" 2>/dev/null || true
api PATCH "/v9/projects/marlen-website" \
  -d '{"rootDirectory":"main-website","framework":"nextjs","nodeVersion":"22.x"}' \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print("root:", d.get("rootDirectory"), "id:", d.get("id","err"))' \
  || echo "(no se pudo parchear rootDirectory; revisa en dashboard)"

# Link desde la raíz del monorepo (igual que marlenne-app)
cd "$ROOT"
mkdir -p /tmp/marlen-website-link
# Link local en main-website para deploys CLI
cd "$ROOT/main-website"
rm -rf .vercel
vercel link --yes --scope "$SCOPE" --project marlen-website

echo "==> Env NEXT_PUBLIC_APP_URL (web)"
# Quitar y re-crear evita prompts raros si ya existe
vercel env rm NEXT_PUBLIC_APP_URL production --scope "$SCOPE" --yes 2>/dev/null || true
printf '%s' 'https://app.marlenapp.com' | vercel env add NEXT_PUBLIC_APP_URL production --scope "$SCOPE"

echo "==> Deploy coming soon"
vercel --prod --yes --scope "$SCOPE"

echo "==> Mover www/apex de la app a la web (si aplica)"
api DELETE "/v9/projects/marlenne-app/domains/www.marlenapp.com" >/dev/null || true
api DELETE "/v9/projects/marlenne-app/domains/marlenapp.com" >/dev/null || true

echo "==> Asignar dominios"
api POST "/v10/projects/marlen-website/domains" -d '{"name":"www.marlenapp.com"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin))' || true
api POST "/v10/projects/marlen-website/domains" \
  -d '{"name":"marlenapp.com","redirect":"www.marlenapp.com","redirectStatusCode":308}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin))' || true
api POST "/v10/projects/marlenne-app/domains" -d '{"name":"app.marlenapp.com"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin))' || true
api POST "/v10/projects/marlen-panel-saas/domains" -d '{"name":"panel.marlenapp.com"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin))' || true

echo "==> Env PWA + panel"
cd "$ROOT/marlen-app"
vercel env rm APP_URL production --scope "$SCOPE" --yes 2>/dev/null || true
printf '%s' 'https://app.marlenapp.com' | vercel env add APP_URL production --scope "$SCOPE"
vercel env rm NEXT_PUBLIC_PANEL_URL production --scope "$SCOPE" --yes 2>/dev/null || true
printf '%s' 'https://panel.marlenapp.com' | vercel env add NEXT_PUBLIC_PANEL_URL production --scope "$SCOPE"

cd "$ROOT/panel-saas"
vercel env rm NEXT_PUBLIC_APP_URL production --scope "$SCOPE" --yes 2>/dev/null || true
printf '%s' 'https://app.marlenapp.com' | vercel env add NEXT_PUBLIC_APP_URL production --scope "$SCOPE"
vercel env rm NEXT_PUBLIC_MARLEN_APP_URL production --scope "$SCOPE" --yes 2>/dev/null || true
printf '%s' 'https://app.marlenapp.com' | vercel env add NEXT_PUBLIC_MARLEN_APP_URL production --scope "$SCOPE"

echo
echo "==== Dominios por proyecto ===="
for p in marlen-website marlenne-app marlen-panel-saas; do
  echo "--- $p ---"
  api GET "/v9/projects/${p}/domains" \
    | python3 -c 'import sys,json; d=json.load(sys.stdin); print("\n".join(x.get("name","?") for x in d.get("domains",[])) or d)' \
    || true
done

echo
echo "Listo."
echo "1) Si Vercel pide DNS, configúralo en el dashboard."
echo "2) Supabase Auth → Site URL https://app.marlenapp.com + Redirect https://app.marlenapp.com/**"
echo "3) Equipo: reinstalar PWA desde https://app.marlenapp.com"
echo "4) Redeploy marlenne-app y marlen-panel-saas para coger los env nuevos."

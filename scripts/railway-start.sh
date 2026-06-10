#!/usr/bin/env sh
# En runtime Railway sí tiene DATABASE_URL (Postgres del proyecto).
set -e
if ! output=$(npx prisma migrate deploy 2>&1); then
  printf '%s\n' "$output"
  # Un deploy anterior pudo dejar 20260417130000_safety_catalog en estado fallido (P3009).
  # Sin tocar DATABASE_URL a mano: marcamos rolled-back y volvemos a aplicar migraciones.
  if echo "$output" | grep -q 'P3009' && echo "$output" | grep -q '20260417130000_safety_catalog'; then
    echo "Resolving failed migration 20260417130000_safety_catalog (P3009) and retrying deploy..."
    npx prisma migrate resolve --rolled-back 20260417130000_safety_catalog
    npx prisma migrate deploy
  else
    exit 1
  fi
else
  printf '%s\n' "$output"
fi

# Sincronizar el schema con la DB de Railway: aplica los modelos que no
# están en migraciones (ej: SearchEvent agregado vía db push en local).
# Es idempotente; si ya están sincronizados no hace nada.
echo "Syncing schema with prisma db push..."
npx prisma db push --skip-generate --accept-data-loss || echo "Warning: db push falló, continuando con la app de todos modos"

exec npm start

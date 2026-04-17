#!/usr/bin/env sh
# En runtime Railway sí tiene DATABASE_URL (Postgres del proyecto).
set -e
npx prisma migrate deploy
exec npm start

#!/usr/bin/env sh
# Nixpacks/Docker build: Prisma necesita DATABASE_URL para leer el schema.
# Si Railway no inyecta la variable en build, usamos un placeholder (solo generate + next build).
set -e
export DATABASE_URL="${DATABASE_URL:-postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder?schema=public}"
npm run build

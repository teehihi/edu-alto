#!/usr/bin/env bash
set -e
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
set -a
source .env
set +a
export SPRING_DATASOURCE_PASSWORD="$POSTGRES_PASSWORD"
export SPRING_DATASOURCE_USERNAME="${POSTGRES_USER:-edualto}"
export SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:${POSTGRES_PORT:-5432}/${POSTGRES_DB:-edualto}"
export REDIS_HOST=localhost
export REDIS_PORT="${REDIS_PORT:-6379}"
exec ./backend/mvnw -f backend/pom.xml spring-boot:run

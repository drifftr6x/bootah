#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  docker compose down -v --remove-orphans
}
trap cleanup EXIT

export POSTGRES_PASSWORD="$(openssl rand -hex 24)"
export SESSION_SECRET="$(openssl rand -base64 48)"
export ENCRYPTION_KEY="$(openssl rand -hex 32)"
export BOOTSTRAP_TOKEN="$(openssl rand -base64 48)"

docker compose config >/dev/null
docker compose up --build -d

for _ in $(seq 1 18); do
  if [ "$(docker inspect --format='{{.State.Health.Status}}' bootah-app 2>/dev/null || true)" = "healthy" ]; then
    break
  fi
  sleep 5
done

test "$(docker inspect --format='{{.State.Health.Status}}' bootah-app)" = "healthy"
test "$(docker compose ps -q db-init | xargs docker inspect --format='{{.State.ExitCode}}')" = "0"
test "$(docker compose ps -q postgres | xargs docker inspect --format='{{range $p, $_ := .NetworkSettings.Ports}}{{$p}} {{end}}')" = ""
test "$(docker compose exec -T postgres psql -U bootah -d bootah -tAc \"select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('users', 'roles', 'permissions');\")" = "3"

test "$(curl --silent --output /dev/null --write-out '%{http_code}' http://localhost:5000/api/health)" = "200"
test "$(curl --silent --output /dev/null --write-out '%{http_code}' http://localhost:5000/public-objects/test)" = "503"
test "$(curl --silent --output /dev/null --write-out '%{http_code}' http://localhost:5000/pxe/test)" = "503"
test "$(curl --silent --output /dev/null --write-out '%{http_code}' -X POST http://localhost:5000/api/images/upload)" = "401"

if docker compose logs --no-color bootah | grep --extended-regexp --quiet 'PXE network services started|TFTP Server listening|DHCP Proxy listening|traffic sniffer started|Deployment scheduler started'; then
  echo "Unsafe runtime service started" >&2
  exit 1
fi

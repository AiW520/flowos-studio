#!/usr/bin/env bash
set -euo pipefail

release_id="${1:?Usage: activate-release.sh YYYYMMDDHHMMSS}"
if [[ ! "$release_id" =~ ^[0-9]{14}$ ]]; then
  echo "Invalid release id" >&2
  exit 2
fi

base=/opt/flowos-lumen
release="$base/releases/$release_id"
test -f "$release/server.js"
test -f "$release/.next/BUILD_ID"
test -d "$release/.next/static/chunks"
test -f "$release/public/media/product-closeup.png"

previous="$(readlink -f "$base/current" || true)"
chown -R www-data:www-data "$release"
ln -sfn "$release" "$base/current.next"
mv -Tf "$base/current.next" "$base/current"
systemctl restart flowos-lumen

healthy=0
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS --max-time 3 http://127.0.0.1:3015/api/health >/dev/null; then
    healthy=1
    break
  fi
  sleep 1
done

if [[ "$healthy" -ne 1 ]]; then
  echo "Health check failed; rolling back to $previous" >&2
  if [[ -n "$previous" && -f "$previous/server.js" ]]; then
    ln -sfn "$previous" "$base/current.next"
    mv -Tf "$base/current.next" "$base/current"
    systemctl restart flowos-lumen
  fi
  exit 1
fi

echo "Active release: $(readlink -f "$base/current")"
curl -fsS http://127.0.0.1:3015/api/health

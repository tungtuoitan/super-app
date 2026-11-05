#!/usr/bin/env bash
set -euo pipefail

ENV="${1:-staging}"
TAG="$(git rev-parse --short HEAD)"
APP=shop-api

if [[ "$ENV" != "staging" && "$ENV" != "production" ]]; then
  echo "usage: deploy.sh [staging|production]" >&2
  exit 2
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "working tree is dirty, commit first" >&2
  exit 1
fi

echo "==> building $APP:$TAG"
docker build -t "registry.local/$APP:$TAG" .
npm test -- --ci

if [[ "$ENV" == "production" ]]; then
  read -r -p "Deploy $TAG to PRODUCTION? (yes/no) " answer
  [[ "$answer" == "yes" ]] || { echo "aborted"; exit 1; }
fi

docker push "registry.local/$APP:$TAG"
PREVIOUS="$(kubectl -n "$ENV" get deploy/$APP -o jsonpath='{.spec.template.spec.containers[0].image}')"

rollback() {
  echo "!! rollout failed, rolling back to $PREVIOUS" >&2
  kubectl -n "$ENV" set image deploy/$APP app="$PREVIOUS"
}
trap rollback ERR

kubectl -n "$ENV" set image deploy/$APP app="registry.local/$APP:$TAG"
kubectl -n "$ENV" rollout status deploy/$APP --timeout=180s

for i in 1 2 3 4 5; do
  if curl -fsS "https://$ENV.shop.local/health" >/dev/null; then
    echo "==> $TAG is live on $ENV"
    exit 0
  fi
  sleep 5
done
echo "health check failed" >&2
false

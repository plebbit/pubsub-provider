root_path=$(cd `dirname $0` && cd .. && pwd)
cd "$root_path"

docker rm -f precache-gateway 2>/dev/null

docker build \
  --file config/Dockerfile \
  --no-cache \
  --tag pubsub-provider \
  .  2>/dev/null

docker run \
  --detach \
  --name precache-gateway \
  --restart always \
  --log-opt max-size=10m \
  --log-opt max-file=5 \
  pubsub-provider \
  node scripts/precache-gateway

docker logs --follow precache-gateway

root_path=$(cd `dirname $0` && cd .. && pwd)
cd "$root_path"

docker rm -f pubsub-provider 2>/dev/null

docker build \
  --file config/Dockerfile \
  --no-cache \
  --tag pubsub-provider \
  .  2>/dev/null

# listen on 8080 and 80 ports because sometimes 80 doesn't work
# 4001 is the ipfs p2p port
docker run \
  --detach \
  --name pubsub-provider \
  --restart always \
  --log-opt max-size=10m \
  --log-opt max-file=5 \
  --publish 8080:8080 \
  --publish 80:80 \
  --publish 4001:4001 \
  pubsub-provider

docker logs --follow pubsub-provider

root_path=$(cd `dirname $0` && cd .. && pwd)
cd "$root_path"

docker rm -f pubsub-provider 2>/dev/null

# listen on 8000 and 80 ports because sometimes 80 doesn't work
# 4001 is the ipfs p2p port
docker run \
  --detach \
  --volume=$(pwd):/usr/src/pubsub-provider \
  --workdir=/usr/src/pubsub-provider \
  --name pubsub-provider \
  --restart always \
  --log-opt max-size=10m \
  --log-opt max-file=5 \
  --publish 8000:8000 \
  --publish 80:80 \
  --publish 4001:4001 \
  node:16 sh -c "npm ci && npm start"

docker logs --follow pubsub-provider

docker build . -t pubsub-provider

# listen on 8080 and 8443 ports to be compatible with http and https on cloudflare
# 4001 is the ipfs p2p port
docker run \
  --detach \
  --name pubsub-provider \
  --restart always \
  --log-opt max-size=10m \
  --log-opt max-file=5 \
  --publish 8080:8080 \
  --publish 8443:8443 \
  --publish 4001:4001 \
  pubsub-provider

docker logs --follow pubsub-provider

docker run \
  --detach \
  --name pubsub-provider \
  --restart always \
  --log-opt max-size=10m \
  --log-opt max-file=5 \
  --publish 8080:8080 \
  --publish 4001:4001 \
  pubsub-provider

docker logs --follow pubsub-provider

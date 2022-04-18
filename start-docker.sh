docker run \
  --detach \
  --name pubsub-provider \
  --restart always \
  --log-opt max-size=10m \
  --log-opt max-file=5 \
  --port 8080:8080 \
  --port 4001:4001 \
  pubsub-provider

docker logs --follow pubsub-provider

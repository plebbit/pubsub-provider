root_path=$(cd `dirname $0` && cd .. && pwd)
cd "$root_path"

docker rm -f pubsub-provider 2>/dev/null

docker build \
  --file config/Dockerfile \
  --no-cache \
  --tag pubsub-provider \
  .  2>/dev/null

docker run \
  --detach \
  --name pubsub-provider-monitor \
  --restart always \
  --log-opt max-size=10m \
  --log-opt max-file=5 \
  --volume=./telegram-bot.js:/usr/src/pubsub-provider/telegram-bot.js \
  pubsub-provider \
  npm run monitor

docker logs --follow pubsub-provider-monitor

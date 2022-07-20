root_path=$(cd `dirname $0` && cd .. && pwd)
cd "$root_path"

docker rm -f pubsub-provider-monitor 2>/dev/null

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
  --volume=$(pwd)/telegram-bot.js:/usr/src/pubsub-provider/telegram-bot.js \
  --volume=$(pwd)/server-info.js:/usr/src/pubsub-provider/server-info.js \
  --volume=$(pwd)/scripts:/usr/src/pubsub-provider/scripts \
  --volume=$(pwd)/chrome-profile:/usr/src/pubsub-provider/chrome-profile \
  pubsub-provider \
  npm run monitor

docker logs --follow pubsub-provider-monitor

FROM node:16

# install
WORKDIR /usr/src/pubsub-provider
COPY ./package.json /usr/src/pubsub-provider/package.json
COPY ./package-lock.json /usr/src/pubsub-provider/package-lock.json
RUN npm ci
COPY ./src /usr/src/pubsub-provider/src
COPY ./bin /usr/src/pubsub-provider/bin

# ipfs p2p port
EXPOSE 4001

CMD [ "node", "src/start.js" ]

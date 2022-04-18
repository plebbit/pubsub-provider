FROM node:16

# install
WORKDIR /usr/src/app
COPY . .
RUN npm ci

# proxy port
EXPOSE 8080
# ipfs p2p port
EXPOSE 4001

CMD [ "node", "start.js" ]

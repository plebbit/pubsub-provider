FROM node:16

# install
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci

# copy files
COPY .. .

# proxy port
EXPOSE 8080
# ipfs p2p port
EXPOSE 4001

CMD [ "node", "start.js" ]

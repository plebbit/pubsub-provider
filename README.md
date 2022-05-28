> Note: Cannot use the pubsub provider with Cloudflare to run a subplebbit because Cloudflare timesout the keepalive connection after 2 minutes, and the IPFS HTTP client doesn't automatically reconnect.

#### Install and start

```sh
npm install
node start
```

#### Install and start with Docker

```sh
./start-docker.sh
```

#### Test locally

```sh
node start
# in another terminal
node test-local
```

#### Test remote

- Edit URL in test-remote.js

```sh
# on server
node start
# locally
node test-remote
```

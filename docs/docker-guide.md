#### 1. Install Docker

- https://docs.docker.com/engine/install/ubuntu/

#### 2. Clone the repo

```sh
git clone https://github.com/plebbit/pubsub-provider.git && cd pubsub-provider
```

#### 3. Start docker

```sh
scripts/start-docker.sh
```

> NOTE: this starts docker on port 80, to start on another port, edit start-docker.sh

#### 4. Test that it works

```sh
curl localhost:80/ipns/12D3KooWG3XbzoVyAE6Y9vHZKF64Yuuu4TjdgQKedk14iYmTEPWu

# or

curl <ip-of-your-server>:80/ipns/12D3KooWG3XbzoVyAE6Y9vHZKF64Yuuu4TjdgQKedk14iYmTEPWu

# you should receive some JSON
```

> NOTE: if it doesn't work, maybe port 4001 isn't open on your server, tcp or udp 4001 must be open, preferably both

#### 5. Add SSL

- Buy a domain name, e.g. namecheap.com accepts BTC
- Link your domain name with your server https://www.namecheap.com/support/knowledgebase/article.aspx/434/2237/how-do-i-set-up-host-records-for-a-domain/
- Add SSL to your domain, e.g. using cloudflare https://www.namecheap.com/support/knowledgebase/article.aspx/9607/2210/how-to-set-up-dns-records-for-your-domain-in-cloudflare-account/

#### 5. Test that it works

```sh
curl https://<your-domain-name>/ipns/12D3KooWG3XbzoVyAE6Y9vHZKF64Yuuu4TjdgQKedk14iYmTEPWu

# e.g.

curl https://ipfs.io/ipns/12D3KooWG3XbzoVyAE6Y9vHZKF64Yuuu4TjdgQKedk14iYmTEPWu
```

> NOTE: it can take a few hours for DNS to propagate, so if it doesn't work, try again later

# Mario.v5 Docker

This folder is a standalone Docker project for running the hardened Mario site behind NGINX.

## What it includes

- The hardened static site files for the leaderboard wrapper
- A `Dockerfile` that downloads the public `robertkleffner/mariohtml5` engine source during image build and places it under `mariohtml5-my-version`
- `Dockerfile` for a small NGINX image
- `docker/nginx/default.conf` with:
  - `/healthz` endpoint
  - SPA-friendly fallback to `index.html`
  - static asset caching
  - security headers via `nginx-security-headers.conf`
- `docker-compose.yml` for local testing

## Local Docker usage

Build:

```bash
docker build -t mario-v5 .
```

Run:

```bash
docker run -d --name Mario-Leaderboard -p 18673:80 --restart unless-stopped mario-v5
```

Then open:

`http://localhost:18673`

## Docker Compose

```bash
docker compose up -d --build
```

## Unraid notes

For an Unraid Docker template, use:

- Repository: your built image name, for example `mario-v5:latest`
- Name: `Mario-Leaderboard`
- Container Port: `80`
- Host Port: `18673`
- Network Type: `bridge`
- Restart Policy: `unless-stopped`

If you prefer to build on another machine and import into Unraid, build the image there and push it to your registry, or save/load it with `docker save` and `docker load`.

## External dependency

This project depends on:

- the live Supabase backend used by the leaderboard in `leaderboard.js`
- GitHub availability during image build, because the Docker build downloads the public Mario engine source once and bakes it into the final image

## GitHub and GHCR

This repo is set up to publish a container image to:

`ghcr.io/articwone/mario-leaderboard:latest`

Once GitHub Actions finishes, Unraid can pull that image directly instead of building locally.

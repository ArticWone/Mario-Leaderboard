# Mario.v5 Docker

This folder is a standalone Docker project for running the hardened Mario site behind NGINX.

## What it includes

- The full static site and game assets
- `mariohtml5-my-version.zip` containing the game engine, source, images, sounds, and midi files
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

This project is self-contained except for the live Supabase backend used by the leaderboard in `leaderboard.js`.

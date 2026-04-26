# Mario Leaderboard Docker

This repo is a standalone Docker project for running the hardened Mario site with a self-contained score system.

Verification note: Docker packaging was updated on April 26, 2026.

## What It Includes

- Hardened static site files for the Mario leaderboard wrapper
- `server.js`, a small Node HTTP server that serves the site and score API
- `/api/scores` for reading and writing the top 10 scores
- `/healthz` for Docker health checks
- Static asset caching and security headers
- `docker-compose.yml` for local testing
- `unraid/Mario-Leaderboard.xml` for Unraid imports

## Local Docker Usage

Build:

```bash
docker build -t mario-leaderboard .
```

Run:

```bash
docker run -d --name Mario-Leaderboard -p 18673:80 -v mario-scores:/data --restart unless-stopped mario-leaderboard
```

Then open:

`http://localhost:18673`

## Docker Compose

```bash
docker compose up -d --build
```

Scores are stored in the `mario-scores` Docker volume at:

`/data/scores.json`

## Score API

Read the current top 10:

```bash
curl http://localhost:18673/api/scores
```

Submit a score:

```bash
curl -X POST http://localhost:18673/api/scores \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"MARIO\",\"score\":12345}"
```

Names are normalized to 6 uppercase letters/numbers. Scores must be whole numbers from `0` to `9999999`.

## Unraid Notes

For an Unraid Docker template, use:

- Repository: `ghcr.io/whonot-servers/mario-leaderboard:latest`
- Name: `Mario-Leaderboard`
- Container Port: `80`
- Host Port: `18673`
- Data Path: map `/mnt/user/appdata/Mario-Leaderboard` to container path `/data`
- Network Type: `bridge`
- Restart Policy: `unless-stopped`

Or run it directly on Unraid:

```bash
docker run -d --name Mario-Leaderboard -p 18673:80 -v /mnt/user/appdata/Mario-Leaderboard:/data --restart unless-stopped ghcr.io/whonot-servers/mario-leaderboard:latest
```

## External Dependency

Runtime score storage is fully self-contained inside Docker.

The image build still needs GitHub availability because the Docker build unpacks the bundled Mario engine archive into the final image.

## GitHub And GHCR

This repo is set up to publish a container image to:

`ghcr.io/whonot-servers/mario-leaderboard:latest`

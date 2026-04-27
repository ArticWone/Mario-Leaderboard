# Mario Leaderboard Docker

This repo is a standalone Docker project for running the hardened Mario site with a self-contained score system.

Verification note: Docker packaging was updated on April 26, 2026.

Current release channel: `beta.1.0.2`

## What It Includes

- Hardened static site files for the Mario leaderboard wrapper
- `server.js`, a small Node HTTP server that serves the site and score API
- `/api/scores` for reading and writing the top 10 scores
- `/healthz` for Docker health checks
- Static asset caching and security headers
- `docker-compose.yml` for local testing
- `unraid/Mario-Leaderboard.xml` for Unraid imports
- `ca_profile.xml` for the Unraid Community Applications maintainer profile
- `UNRAID-TEST.md` for test-container and GHCR troubleshooting commands

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

This repository includes the files expected by the Unraid Community Applications submission flow:

- `LICENSE`, an OSI-approved MIT license for this repository's template, metadata, documentation, and wrapper code
- `ca_profile.xml`, with a non-empty maintainer `<Profile>` section
- `unraid/Mario-Leaderboard.xml`, a Docker template for Community Applications

For a safe first run on the Unraid server, use the test-container flow in `UNRAID-TEST.md`.

For an Unraid Docker template, use:

- Repository: `ghcr.io/articwone/mario-leaderboard:latest`
- Name: `Mario-Leaderboard`
- Container Port: `80`
- Host Port: `18673`
- Data Path: map `/mnt/user/appdata/Mario-Leaderboard` to container path `/data`
- Network Type: `bridge`
- Restart Policy: `unless-stopped`

Or run it directly on Unraid:

```bash
docker run -d --name Mario-Leaderboard -p 18673:80 -v /mnt/user/appdata/Mario-Leaderboard:/data --restart unless-stopped ghcr.io/articwone/mario-leaderboard:latest
```

## Container Console Commands

These are useful commands after opening a shell inside the running container.

Open the production container shell from Unraid:

```bash
docker exec -it Mario-Leaderboard sh
```

Open the test container shell from Unraid:

```bash
docker exec -it Mario-Leaderboard-Test sh
```

Show the app files:

```bash
ls -la /usr/share/mario
```

This shows the static site files and `server.js` copied into the image.

Show the persistent score folder:

```bash
ls -la /data
```

This shows the mounted Docker data folder. In production, it maps to `/mnt/user/appdata/Mario-Leaderboard` on Unraid.

View the current score file:

```bash
cat /data/scores.json
```

This prints the saved scores used by `/api/scores`.

Back up the score file from inside the container:

```bash
cp /data/scores.json /data/scores.backup.json
```

This creates a backup beside the active score file in the same persistent data folder.

Check the server health from inside the container:

```bash
node -e "fetch('http://127.0.0.1/healthz').then(r=>r.text()).then(console.log)"
```

This should print `ok`.

Check the score API from inside the container:

```bash
node -e "fetch('http://127.0.0.1/api/scores').then(r=>r.text()).then(console.log)"
```

This prints the top 10 scores returned by the local server.

Submit a test score from inside the container:

```bash
node -e "fetch('http://127.0.0.1/api/scores',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'TEST',score:100})}).then(r=>r.text()).then(console.log)"
```

This writes a test score through the same API the browser uses.

Show the Node server process:

```bash
ps
```

This confirms the server process is running inside the container.

Show the container hostname:

```bash
hostname
```

This prints the container ID-style hostname, which can help confirm which container shell you are in.

Exit the container shell:

```bash
exit
```

This returns you to the Unraid console without stopping the container.

## External Dependency

Runtime score storage is fully self-contained inside Docker.

The image build still needs GitHub availability because the Docker build unpacks the bundled Mario engine archive into the final image.

The MIT license in this repository covers this repository's template, metadata, documentation, and wrapper code. Any third-party game engine or media content keeps its own upstream license terms.

## Credits And Upstream Notes

This Docker and Unraid packaging work builds on prior Mario HTML5 project work from:

- Xavier Hernandez's `mariohtml5` `my-version` branch: https://github.com/xavier-hernandez/mariohtml5/tree/my-version
- Infinite Mario Bros by Markus Persson, also known as Notch

The downloaded Infinite Mario Bros source package notes that its `/src/` code was released as public domain, while its `/res/` art resources remain owned by Nintendo. This repository's MIT license does not relicense upstream game code, Nintendo-owned art, trademarks, or other third-party assets.

## GitHub And GHCR

This repo is set up to publish a container image to:

`ghcr.io/articwone/mario-leaderboard:latest`

Release uploads should also be tagged with the `beta.1.x.x` format. The current version is tracked in `VERSION`. For each update that is committed and pushed, bump the version before release and create a matching git tag, for example:

```bash
git tag beta.1.0.1
git push articwone beta.1.0.1
```

The Docker publish workflow publishes matching beta tags to GHCR as:

`ghcr.io/articwone/mario-leaderboard:beta.1.x.x`

## Quick Production Update

Run this on Unraid after a new image is published:

```bash
docker pull ghcr.io/articwone/mario-leaderboard:latest
docker rm -f Mario-Leaderboard
docker run -d \
  --name Mario-Leaderboard \
  -p 18673:80 \
  -v /mnt/user/appdata/Mario-Leaderboard:/data \
  --restart unless-stopped \
  ghcr.io/articwone/mario-leaderboard:latest
```

This updates the app container while keeping the production scores in `/mnt/user/appdata/Mario-Leaderboard/scores.json`.

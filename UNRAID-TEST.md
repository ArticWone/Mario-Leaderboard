# Unraid Test Container

Use this when testing the Docker-only Mario leaderboard on the Unraid server before replacing the production container.

## Test From GHCR

Run this on the Unraid terminal:

```bash
docker pull ghcr.io/articwone/mario-leaderboard:latest
docker rm -f Mario-Leaderboard-Test
docker run -d \
  --name Mario-Leaderboard-Test \
  -p 18674:80 \
  -v /mnt/user/appdata/Mario-Leaderboard-Test:/data \
  --restart unless-stopped \
  ghcr.io/articwone/mario-leaderboard:latest
```

Open:

```text
http://192.168.8.122:18674
```

Test scores are stored separately from production:

```text
/mnt/user/appdata/Mario-Leaderboard-Test/scores.json
```

## GHCR Unauthorized Fix

If Unraid shows:

```text
unauthorized
```

then GHCR is reachable, but the image package is private or Unraid is not logged in.

Log in from Unraid:

```bash
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

The token needs `read:packages`. If the repo or package is private, also include `repo`.

After login, rerun the test container command.

Long term, make the package public in GitHub:

```text
GitHub -> ArticWone -> Packages -> mario-leaderboard -> Package settings -> Change visibility -> Public
```

## Direct Build Fallback

If GHCR is not ready yet, build directly on Unraid:

```bash
cd /mnt/user/appdata
git clone https://github.com/ArticWone/Mario-Leaderboard.git
cd Mario-Leaderboard
docker build -t mario-leaderboard:test .
docker run -d \
  --name Mario-Leaderboard-Test \
  -p 18674:80 \
  -v /mnt/user/appdata/Mario-Leaderboard-Test:/data \
  --restart unless-stopped \
  mario-leaderboard:test
```

If the test container already exists, remove it first:

```bash
docker rm -f Mario-Leaderboard-Test
```

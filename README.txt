Mario Leaderboard is a Docker-only deployment of the hardened Mario site.

Included locally:
- index.html
- styles.css
- main.js
- leaderboard.js
- server.js
- mariohtml5-my-version/Enjine
- mariohtml5-my-version/code
- mariohtml5-my-version/images
- mariohtml5-my-version/midi
- mariohtml5-my-version/sounds

Notes:
- This copy does not depend on jQuery, Google Fonts, Supabase, or an external score service.
- Leaderboard access uses local `/api/scores` endpoints from `server.js`.
- Scores are stored in the writable JSON file configured by `SCORE_FILE`, defaulting to `/data/scores.json`.
- The Docker image declares `/data` as a volume so scores can survive container replacement.

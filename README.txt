Mario.v5 is a clean deployment copy of the hardened site.

Included locally:
- index.html
- styles.css
- main.js
- leaderboard.js
- nginx-security-headers.conf
- mariohtml5-my-version/Enjine
- mariohtml5-my-version/code
- mariohtml5-my-version/images
- mariohtml5-my-version/midi
- mariohtml5-my-version/sounds

Notes:
- This copy no longer depends on jQuery, Google Fonts, or the Supabase JS CDN.
- Leaderboard access uses direct HTTPS requests to the Supabase REST/RPC endpoints.
- Realtime leaderboard subscriptions were replaced with 15-second polling.
- The only remaining external requirement is reachability to the Supabase backend URL used by leaderboard.js.
- If you serve this with NGINX, include nginx-security-headers.conf in the site config.

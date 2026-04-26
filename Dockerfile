FROM node:22-alpine

WORKDIR /usr/share/mario/html

RUN apk add --no-cache libcap unzip

COPY index.html /usr/share/mario/html/index.html
COPY styles.css /usr/share/mario/html/styles.css
COPY main.js /usr/share/mario/html/main.js
COPY leaderboard.js /usr/share/mario/html/leaderboard.js
COPY server.js /usr/share/mario/server.js
COPY assets/favicon-16.png assets/favicon-32.png assets/favicon-192.png assets/favicon-512.png assets/apple-touch-icon.png /usr/share/mario/html/assets/
COPY mariohtml5-my-version.zip /tmp/mariohtml5-my-version.zip

RUN unzip -q /tmp/mariohtml5-my-version.zip -d /usr/share/mario/html \
    && rm -f /tmp/mariohtml5-my-version.zip \
    && mkdir -p /data \
    && setcap 'cap_net_bind_service=+ep' /usr/local/bin/node \
    && chown -R node:node /data /usr/share/mario

USER node

ENV PUBLIC_DIR=/usr/share/mario/html
ENV SCORE_FILE=/data/scores.json

EXPOSE 80
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/healthz || exit 1

CMD ["node", "/usr/share/mario/server.js"]

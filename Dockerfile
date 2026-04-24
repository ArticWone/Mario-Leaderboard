FROM nginx:1.27-alpine

WORKDIR /usr/share/nginx/html

RUN apk add --no-cache unzip

COPY index.html /usr/share/nginx/html/index.html
COPY styles.css /usr/share/nginx/html/styles.css
COPY main.js /usr/share/nginx/html/main.js
COPY leaderboard.js /usr/share/nginx/html/leaderboard.js
COPY nginx-security-headers.conf /usr/share/nginx/html/nginx-security-headers.conf
COPY mariohtml5-my-version.zip /tmp/mariohtml5-my-version.zip
RUN unzip -q /tmp/mariohtml5-my-version.zip -d /usr/share/nginx/html && rm -f /tmp/mariohtml5-my-version.zip
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

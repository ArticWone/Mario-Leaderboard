FROM nginx:1.27-alpine

WORKDIR /usr/share/nginx/html

RUN apk add --no-cache unzip

COPY index.html /usr/share/nginx/html/index.html
COPY styles.css /usr/share/nginx/html/styles.css
COPY main.js /usr/share/nginx/html/main.js
COPY leaderboard.js /usr/share/nginx/html/leaderboard.js
COPY nginx-security-headers.conf /usr/share/nginx/html/nginx-security-headers.conf
RUN wget -qO /tmp/mariohtml5.zip https://codeload.github.com/robertkleffner/mariohtml5/zip/refs/heads/master \
  && unzip -q /tmp/mariohtml5.zip -d /tmp \
  && mkdir -p /usr/share/nginx/html/mariohtml5-my-version \
  && cp -R /tmp/mariohtml5-master/Enjine /usr/share/nginx/html/mariohtml5-my-version/Enjine \
  && cp -R /tmp/mariohtml5-master/code /usr/share/nginx/html/mariohtml5-my-version/code \
  && cp -R /tmp/mariohtml5-master/images /usr/share/nginx/html/mariohtml5-my-version/images \
  && cp -R /tmp/mariohtml5-master/midi /usr/share/nginx/html/mariohtml5-my-version/midi \
  && cp -R /tmp/mariohtml5-master/sounds /usr/share/nginx/html/mariohtml5-my-version/sounds \
  && rm -rf /tmp/mariohtml5.zip /tmp/mariohtml5-master
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

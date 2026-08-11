FROM node:20-slim

RUN sed -i 's|deb.debian.org|mirrors.aliyun.com|g; s|security.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list.d/debian.sources \
  && apt-get update \
  && apt-get install -y ffmpeg fonts-noto-cjk \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3005

COPY package.json ./package.json
COPY package-lock.json ./package-lock.json
RUN npm config set registry https://registry.npmmirror.com \
  && npm ci --omit=dev --no-audit --no-fund

COPY dist-web ./dist-web
COPY dist-server ./dist-server
COPY public ./public

RUN mkdir -p uploads converted

EXPOSE 3005

CMD ["node", "dist-server/server/index.js"]

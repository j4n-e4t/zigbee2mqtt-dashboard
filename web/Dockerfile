# --- build ---
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# --- serve ---
FROM nginx:1.29-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/40-z2m-config.sh /docker-entrypoint.d/40-z2m-config.sh
RUN chmod +x /docker-entrypoint.d/40-z2m-config.sh
COPY --from=build /app/build /usr/share/nginx/html
# Z2M frontend WebSocket as seen *from the browser*, e.g. ws://192.168.1.10:8080/api
ENV Z2M_URL="" \
    Z2M_TOKEN=""
EXPOSE 80

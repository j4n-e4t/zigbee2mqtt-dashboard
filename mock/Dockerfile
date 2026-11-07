FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY *.mjs *.json ./
ENV PORT=8080
EXPOSE 8080
USER node
CMD ["node", "server.mjs"]

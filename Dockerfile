FROM node:22-bookworm-slim AS base

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build

COPY tsconfig.server.json ./
COPY server ./server
RUN npm run build:server && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/server/report-templates ./server/report-templates

EXPOSE 8787

CMD ["node", "dist-server/server/index.js"]

# node:22-slim (Debian/glibc), not alpine — sharp's prebuilt binaries and
# Prisma's driver-adapter (@prisma/adapter-pg, no native query-engine
# binary) are both most reliably supported on glibc.
FROM node:22-slim AS base
WORKDIR /app

FROM base AS deps
# `npm ci` below runs the "postinstall" script (`prisma generate`), which
# needs both the schema itself and prisma.config.ts (which declares its
# path) present on disk — so those are copied here too, not just the lock
# files — and needs DATABASE_URL to be resolvable just to load the config,
# even though nothing at build time ever actually connects to it. This
# placeholder is never baked into the final `runner` stage (that's built
# fresh from `base`, not from this stage) — the real DATABASE_URL comes
# from docker-compose's `environment:` at container start.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/generated ./generated
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "start"]

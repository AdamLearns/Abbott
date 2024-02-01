FROM node:18.17.0-slim AS base

WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY . ./

FROM base AS install-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# This build is needed to build the database
WORKDIR /app/packages/web
RUN pnpm build
WORKDIR /app
RUN pnpm --filter "abbott-web" deploy deploy/web
RUN pnpm --filter "abbott-database" deploy deploy/database

FROM base AS build
COPY --from=install-deps /app/deploy/ /app/deploy
# This is needed to create the web's dist folder
WORKDIR /app/deploy/web
RUN pnpm run build

FROM node:18.17.0-slim AS runtime
COPY --from=install-deps /app/deploy/web/package.json /app/deploy/package.json
COPY --from=install-deps /app/deploy/web/node_modules /app/deploy/node_modules
COPY --from=build /app/deploy/web/dist /app/deploy/

ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD node /app/deploy/server/entry.mjs

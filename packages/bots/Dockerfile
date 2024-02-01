FROM node:18.17.0-slim AS base

WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY . ./

FROM base AS install-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter "abbott-bots" deploy deploy/bots
RUN pnpm --filter "abbott-database" deploy deploy/database

FROM base AS build
COPY --from=install-deps /app/deploy/ /app/deploy
WORKDIR /app/deploy/bots
RUN pnpm build

FROM node:18.17.0-slim
COPY --from=install-deps /app/deploy/bots/package.json /app/deploy/package.json
COPY --from=install-deps /app/deploy/bots/node_modules /app/deploy/node_modules
COPY --from=build /app/deploy/bots/dist /app/deploy/dist

# Allow for Postgres 16 to be installed
RUN apt-get update && apt-get install -y wget gnupg lsb-release
RUN bash -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
RUN wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -

# postgresql-client is needed for pg_dump.
# Its version needs to match the database server
RUN apt-get update && apt install -y postgresql-client-16

CMD [ "node", "app/deploy" ]

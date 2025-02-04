# Abbott

A bot specifically for the Adam Learns show (Twitch, Discord, etc.).

## Expectations

This code is publicly viewable, but it isn't exactly "open-source":

- The code is not licensed for use by anyone other than myself.
- I don't plan on making the bot be generally available or usable (e.g. I probably won't add features that people ask about).
- I probably won't do anything explicit to maintain this repo unless it's something I need for myself.

## Running

- Copy `.env.example` to another file (e.g. `.env.development.local`) and fill out the values.
- Run migrations (see [Migrations](#migrations)).
- Get a Twitch access token: `NODE_ENV=development pnpm tsx packages/bots/src/get-tokens.ts`
  - Follow the instructions that it outputs

### Typical development flow

- Start everything up:
  - Go to root
  - `cd packages/web`
  - `pnpm run dev`
  - Go to root
  - `cd packages/bots`
  - `NODE_ENV=development pnpm run start`
  - Go to root
  - `cd packages/database`
  - `pnpm run watch`
  - Go to root
  - `cd packages/youtube-api`
  - `pnpm run watch`
- Go to the web interface or the test channel to try things out

### Running Docker images locally

Just run the `pnpm` script from the root `package.json`, e.g. `pnpm run docker:web`.

## Linting/correctness

- `pnpm run lint` (optionally with `--fix` at the end)
- `pnpm run type-check`

## Testing

- Start the test database in a Docker image: `docker compose -f ./packages/database/src/test_compose.yml up`
- Switch to the package where you want to run tests. Note that at the time of writing, the `bots` package doesn't need a `.env.test` file since it doesn't connect to a real database.
- Make sure to use the test environment: `NODE_ENV=test pnpm test`. If you want to run only certain files, add them like this `NODE_ENV=test pnpm test ./packages/bots/src/test/bot.test.ts`.
- When running `pnpm coverage`, open the results with `open coverage/index.html`.

## Migrations

- Switch to the database directory first: `cd packages/database`
- Creating: `pnpm run kysely-migration-cli create migration-name-with-hyphens`
- Back up: `backUpDatabase` in my shell (command defined [here](https://github.com/Adam13531/AdamsApple/blob/dbfbfdfa4ad9b09e969fb4aeab2b88228757bdbb/shell/zsh/.zshrc#L637-L643))
- Write the contents of the migration file.
- Migrating: `NODE_ENV=development pnpm run kysely-migration-cli latest`
  - Note: migrations should happen automatically on start-up. See `.env.example` for how to configure this. However, they won't automatically regenerate types.
- Regenerating types (make sure to replace the variables): `DATABASE_URL=postgres://postgres:bar@localhost/foo pnpm run kysely-codegen`
- Copy the regenerated types to the right location: `cp ./node_modules/kysely-codegen/dist/db.d.ts ./src/types/db.d.ts`
- Make sure to run "Developer: Restart Extension Host" in VSCode or else you'll get a lot of squigglies.

## Manually building the Docker images

- Build the `bots` image:
  - From the root of the directory, run `docker build . -t adamlearns/abbott-bots -f packages/bots/Dockerfile`.
- Build the `web` image:
  - From the root of the directory, run `docker build . -t adamlearns/abbott-web -f packages/web/Dockerfile`.

Notes:

- This needs to be run from the root because that's where `pnpm-lock.yaml` is, which we need from each package that gets built. Also, packages may depend on one another (e.g. `bots` depends on `database`).
- The `.dockerignore` files can be next to the `Dockerfile`s as long as their names match the `Dockerfile`s ([reference](https://docs.docker.com/build/building/context/#filename-and-location)).

## `ircv3`

I had to install the `ircv3` package specifically for one issue: `ChatMessage` has a `target` that is only provided as a result of [`ircv3`'s `PrivateMessage` class](https://github.com/d-fischer/ircv3/blob/483f330f52ea533b567c118ada37d30c54ac80e9/src/Message/MessageTypes/Commands/PrivateMessage.ts#L4), so [this line of code](https://github.com/AdamLearns/Abbott/blob/86815e2ec20e62c89ab753e07ea065d2f75d1227/src/twitch/BotCommandContext.ts#L18) would have a TypeScript error without installing `ircv3`. This is partially because `@types/ircv3` does not exist.

## Initial setup

### Ansible

- Install prerequisites:
  - Get Docker prerequisites ([reference](https://docs.ansible.com/ansible/2.9/modules/docker_container_module.html#requirements))
    - Namely, this just means running `pip3 install docker` (or its equivalent, `python3 -m pip install docker`)
- Run the playbook:
  - Modify `inventory.ini` to contain the IP address of the target (e.g. a mini PC).
  - Change to the right directory: `cd ansible`
  - Run: `ansible-playbook -i inventory.ini playbook.yaml -K`
    - It will prompt you for the "BECOME" password. This is the password of the user that you're SSHing as.

## Post-Ansible steps

- Set up the `.env` file. It may help to start with a local one: `scp .env.development.local adam@minipc:code/Abbott/`
  - Set `DATABASE_BACKUP_LOCATION=/database_backups` in the `.env` file since that's what Docker expects.
  - Make sure `~/database_backups` exists on the host.
- Set up tokens. At the time of writing, the mini PC doesn't have Node installed directly, so we use the Docker images we build, which have Node AND the requirements to connect to the database:
  - From main computer: `ssh -L 3000:localhost:3000 -L 3005:localhost:3005 adam@minipc`
    - Port 3000 is what `get-tokens` uses for its redirect, and 3005 is what `get-youtube-tokens` uses.
  - From the mini PC:
    - Switch to a directory that has an `.env` file with database and YouTube creds: `cd code/Abbott/packages/bots`
    - `docker run --net=host -v .:/envfile --entrypoint /bin/bash -it ghcr.io/adamlearns/abbott-bots:latest`
      - (`--net=host` is needed to be able to contact the database since it's running in a separate container)
      - (no need to do `-p 3000:3000` thanks to `--net=host`)
    - `cd app/deploy/dist`
    - `cp /envfile/.env.production.local ./`
    - `apt install -y vim`
    - `vim .env.production.local`
      - Change `@db` in the database connection string to `@127.0.0.1`
    - `NODE_ENV=production node get-tokens`
      - Follow the instructions on the main computer. When you get redirected to `localhost:3000`, it'll go through the SSH tunnel onto the mini PC.
      - Make sure to run `get-tokens` twice: once to save the bot's token, and once to save the streamer's token.
    - `NODE_ENV=production node get-youtube-tokens`
- Migrate the database from my main computer (I only did this once):
  - Just run `pg_dump` on my main computer and then `psql -h MINI_PC_IP` to restore it directly to the mini PC.

### How to run `get-tokens` with a test database from my Mac

- Note: at the time I'm writing these instructions, it's possible that there'll be a collision on port 3000. If that's the case, then update `get-tokens` and probably this README.
- Start the database with `docker-compose-adam-dev.yml`.
- Copy `.env.development.local` from the `bots` directory to `.env.madeup.local`.
- Overwrite `DATABASE_CONNECTION_STRING` to point to port 5434 (which is what the compose file exposes)
- `cd packages/bots`
- `NODE_ENV=madeup pnpx tsx src/get-tokens.ts`
- Follow the instructions

## Getting YouTube tokens

- `cd packages/bots`
- `NODE_ENV=development pnpx tsx src/get-youtube-tokens.ts`
- Follow the instructions

## Register Discord bot

- Register the commands with the Discord API
  - `NODE_ENV=development pnpm tsx ./packages/bots/src/discord/deploy-commands.ts`
    - Note: change `NODE_ENV` as appropriate (e.g. to `production`)
- Invite the bot to your server ([reference](https://discordjs.guide/preparations/adding-your-bot-to-servers.html#bot-invite-links))
  - Make sure to select the `bot` and `applications.commands` options
- Allow permissions on the `#content-announcement` channel.
  - In Discord, right-click the channel → Edit Channel → Permissions → Click the ➕ next to "ROLES/MEMBERS" and add your bot. Then, check the following:
    - "Send Messages"
    - "Embed Links"
    - "Mention everyone, here, and All Roles"
  - Note that opting in to the notification role is something that I handle through Discord's onboarding.

## Deploying

- Make any changes
- Push to GitHub to get it to build new Docker images
- Make sure the build actually works through GitHub actions
- Watchtower on the mini PC should automatically detect and pull the new images. If it doesn't, run `ansible-playbook` from my main computer

## Back-ups

They're taken automatically at start-up if there was a migration. If there isn't a migration, you can take one manually with `pg_dump -d postgres://postgres:bar@localhost/foo > ./backup.sql`.

## Troubleshooting

### Generic issues

Are you building everything? Run `pnpm watch`. The typical problem is that I'll make changes in the `database` package and then not be able to run that code from another package. It's because nothing is building `database`.

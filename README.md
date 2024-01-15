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
- Get a Twitch access token: `NODE_ENV=development pnpm tsx src/get-tokens.ts`
  - Follow the instructions that it outputs

## Linting/correctness

- `pnpm run lint` (optionally with `--fix` at the end)
- `pnpm run type-check`

## Testing

- Start the test database in a Docker image: `docker compose -f ./src/database/test_compose.yml up`
- Make sure to use the test environment: `NODE_ENV=test pnpm test`. If you want to run only certain files, add them like this `NODE_ENV=test pnpm test ./src/test/database.test.ts`.
- When running `pnpm coverage`, open the results with `open coverage/index.html`.

## Migrations

- Creating: `pnpm run kysely-migration-cli create <migration_name>`
- Back up: `backUpDatabase` in my shell (this is important as of Fri 12/22/2023 when I only have one database 👀)
- Migrating: `NODE_ENV=development pnpm run kysely-migration-cli latest`
  - Note: migrations should happen automatically on start-up. See `.env.example` for how to configure this. However, they won't automatically regenerate types.
- Regenerating types (make sure to replace the variables): `DATABASE_URL=postgres://postgres:bar@localhost/foo pnpm run kysely-codegen`
- Copy the regenerated types to the right location: `cp ./node_modules/kysely-codegen/dist/db.d.ts ./src/database/types/db.d.ts`

## `ircv3`

I had to install the `ircv3` package specifically for one issue: `ChatMessage` has a `target` that is only provided as a result of [`ircv3`'s `PrivateMessage` class](https://github.com/d-fischer/ircv3/blob/483f330f52ea533b567c118ada37d30c54ac80e9/src/Message/MessageTypes/Commands/PrivateMessage.ts#L4), so [this line of code](https://github.com/AdamLearns/Abbott/blob/86815e2ec20e62c89ab753e07ea065d2f75d1227/src/twitch/BotCommandContext.ts#L18) would have a TypeScript error without installing `ircv3`. This is partially because `@types/ircv3` does not exist.

## Ansible

- Install prerequisites:
  - Get Docker prerequisites ([reference](https://docs.ansible.com/ansible/2.9/modules/docker_container_module.html#requirements))
    - Namely, this just means running `pip3 install docker` (or its equivalent, `python3 -m pip install docker`)
- Run the playbook:
  - Modify `inventory.ini` to contain the IP address of the target (e.g. a mini PC).
  - Change to the right directory: `cd ansible`
  - Run: `ansible-playbook -i inventory.ini playbook.yaml -K`
    - It will prompt you for the "BECOME" password. This is the password of the user that you're SSHing as.
- Copy over the `.env` file: `scp .env.development.local adam@<IP_ADDRESS>:code/Abbott/`
  - Set `DATABASE_BACKUP_LOCATION=/database_backups`.
  - Make sure `~/database_backups` exists on the host.
- Set up tokens. At the time of writing, the mini PC doesn't have Node installed directly, so you can run this from the `Abbott` folder:
  - `docker run --net=host -v .:/abbott --entrypoint /bin/bash -it node:18.17.0-slim`
    - (`--net=host` is needed to be able to contact the database since it's running in a separate container)
    - (no need to do `-p 3000:3000` thanks to `--net=host`)
  - `apt update && apt install -y wget`
  - `wget -qO- https://get.pnpm.io/install.sh | ENV="$HOME/.bashrc" SHELL="$(which bash)" bash -`
  - `source /root/.bashrc`
  - `cd /abbott`
  - `NODE_ENV=development pnpm tsx src/get-tokens.ts`
  - From main computer: `ssh -L 3000:localhost:3000 minipc@IP`
- Migrate the database (I only did this once):
  - Just run `pg_dump` on my main computer and then `psql -h MINI_PC_IP` to restore it directly to the mini PC.

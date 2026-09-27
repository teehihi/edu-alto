# Local PostgreSQL migration recovery

Use this procedure only when an already-applied migration checksum differs from its current file. It repairs Flyway history metadata; it does not make the database schema match a changed migration. Do not edit an applied migration to silence validation.

## Preconditions

1. Confirm the target is the local development database and identify every applied migration whose checksum differs from the corresponding file.
2. Inspect the migration SQL and database catalog. Confirm the live schema is already equivalent to the current migration and check for data constraints such as duplicate values before relying on a unique index.
3. Stop if any applied migration other than the specifically investigated version differs, if any history row failed, or if schema equivalence is uncertain.
4. Make and verify a private backup before repair. Keep credentials in the process environment or a protected local configuration file; do not put passwords in command arguments or logs.

Example backup for the local Compose database:

```sh
mkdir -p backend/target/local-backups
chmod 700 backend/target/local-backups
umask 077
backup="backend/target/local-backups/edualto-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker exec edualto-postgres pg_dump -U edualto -d edualto -Fc > "$backup"
chmod 600 "$backup"
pg_restore --list "$backup" >/dev/null
```

## Run Flyway repair

Use the Flyway version matching the backend dependency (`11.14.1` at the time this procedure was recorded) and mount the repository migrations read-only. Set `FLYWAY_URL`, `FLYWAY_USER`, and `FLYWAY_PASSWORD` in the shell environment from a protected local configuration. Point `FLYWAY_URL` at the database host visible from the Docker network.

First inspect Flyway’s view and confirm the only mismatch is the version already proven schema-equivalent:

```sh
docker run --rm --network "$DB_DOCKER_NETWORK" \
  -v "$PWD/backend/src/main/resources/db/migration:/flyway/sql:ro" \
  --env FLYWAY_URL --env FLYWAY_USER --env FLYWAY_PASSWORD \
  --env FLYWAY_LOCATIONS=filesystem:/flyway/sql \
  flyway/flyway:11.14.1 info
```

After the preconditions pass, run repair against that same database and migration location:

```sh
docker run --rm --network "$DB_DOCKER_NETWORK" \
  -v "$PWD/backend/src/main/resources/db/migration:/flyway/sql:ro" \
  --env FLYWAY_URL --env FLYWAY_USER --env FLYWAY_PASSWORD \
  --env FLYWAY_LOCATIONS=filesystem:/flyway/sql \
  flyway/flyway:11.14.1 repair
```

Then run `info` again and validate applied migrations. If the current checkout has pending migrations that are intentionally not being applied, set `FLYWAY_IGNORE_MIGRATION_PATTERNS='*:pending'` for validation only. Do not run `migrate` as part of checksum recovery. `repair` updates Flyway schema history; it does not execute migration SQL or change application data.

## Recorded local recovery (2026-09-27)

Before repair, applied V1–V3 checksums matched their files. V4 was successful in history with checksum `-1429971411`, while the current file resolved to `2027237668`. The live `profiles` table already had nullable `custom_handle varchar(60)` and `tiktok_url varchar(1024)` columns and the unique `uk_profiles_custom_handle` index; one custom handle was present. V5 and V6 were pending. A private custom-format backup was created at `backend/target/local-backups/edualto-20260927T115910Z.dump` (mode `0600`) and its archive listing was readable.

Flyway `repair` changed only V4’s stored checksum to `2027237668`. A subsequent Flyway validation passed for all applied migrations while ignoring pending migrations. V5 and V6 remain pending, and no application process was restarted.

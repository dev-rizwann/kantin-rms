#!/bin/sh
set -eu
umask 077
base=/root/kantin-muzafarabad-20261022
db=a9r80wl5irjdbv8hqn2brpjh
app=lp3viig5ot8a9xzjntelp49v-103751147095
qa=kantin_muzafarabad_qa_20261022
test -z "$(docker exec "$db" psql -U kantin_rms -d postgres -Atc "SELECT datname FROM pg_database WHERE datname='$qa'")"
docker exec "$db" createdb -U kantin_rms "$qa"
docker exec "$db" pg_dump -U kantin_rms -d kantin_rms --schema-only --no-owner --no-privileges > "$base/schema.sql"
docker exec "$db" pg_dump -U kantin_rms -d kantin_rms --data-only --no-owner --no-privileges -t _prisma_migrations > "$base/migrations.sql"
docker exec -i "$db" psql -U kantin_rms -d "$qa" -v ON_ERROR_STOP=1 < "$base/schema.sql" > "$base/schema-restore.log"
docker exec -i "$db" psql -U kantin_rms -d "$qa" -v ON_ERROR_STOP=1 < "$base/migrations.sql" > "$base/migrations-restore.log"
mkdir -p "$base/source"
tar -xzf "$base/source.tgz" -C "$base/source"
docker build -t kantin-muzafarabad-qa:20261022 "$base/source" > "$base/build.log" 2>&1
docker inspect "$app" | jq -r '.[0].Config.Env[] | if startswith("DATABASE_URL=") then sub("/kantin_rms(?<tail>\\?.*|$)"; "/kantin_muzafarabad_qa_20261022\(.tail)") else . end' > "$base/qa.env"
grep -q '^DATABASE_URL=.*\/kantin_muzafarabad_qa_20261022' "$base/qa.env"
docker run -d --name kantin-muzafarabad-qa-20261022 --network coolify --env-file "$base/qa.env" kantin-muzafarabad-qa:20261022
docker cp "$base/test-launch.cjs" kantin-muzafarabad-qa-20261022:/tmp/test-launch.cjs
docker cp "$base/synthetic-tables.json" kantin-muzafarabad-qa-20261022:/tmp/synthetic-tables.json
docker cp "$base/kashmir-bcrypt.js" kantin-muzafarabad-qa-20261022:/tmp/kashmir-bcrypt.js
echo 'Isolated schema-only launch QA portal started; no production sales copied.'

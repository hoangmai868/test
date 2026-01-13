#!/bin/sh

set -e

echo "Waiting for database connection..."
until npx prisma migrate deploy; do
  >&2 echo "Postgres not ready yet; retrying in 3s..."
  sleep 3
done

echo "Seeding database..."
npx prisma db seed

exec npm run start


#!/bin/sh
# Writes a crontab that calls the prune-recordings route once per hour,
# then starts busybox crond in the foreground.
# CRON_SECRET is injected from .env via docker-compose env_file.
set -e

if [ -z "$CRON_SECRET" ]; then
  echo "[cron] CRON_SECRET is not set — prune route will return 401. Set it in .env." >&2
fi

# Write the crontab for the root user.
printf '0 * * * *\twget -q -O- --header="Authorization: Bearer %s" --post-data="" http://app:3000/api/cron/prune-recordings\n' \
  "$CRON_SECRET" > /etc/crontabs/root

echo "[cron] Prune job scheduled at :00 every hour. Starting crond..."
exec crond -f -l 2

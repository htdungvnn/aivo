# AIVO Maintenance Cron Jobs
# Add these to your crontab with: crontab -e
# Or integrate into Cloudflare Workers cron triggers (see wrangler.toml)

# Database backups - Daily at 2:00 AM
# (Runs the backup script, stores locally and in R2)
0 2 * * * /usr/bin/bash /path/to/aivo/scripts/db-backup.sh >> /path/to/aivo/logs/db-backup-cron.log 2>&1

# R2 cleanup - Daily at 3:00 AM (after backup)
0 3 * * * /usr/bin/bash /path/to/aivo/scripts/r2-cleanup.sh >> /path/to/aivo/logs/r2-cleanup-cron.log 2>&1

# Note: For Cloudflare Workers cron, you would add triggers in wrangler.toml:
# [triggers]
# crons = ["0 2 * * *", "0 3 * * *"]
#
# Then create a worker that calls these maintenance functions via internal API
# or schedule separate workers for each task.

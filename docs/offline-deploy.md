# Offline deployment

See the root README for the nine-step process.

Images required in the offline tarball:

- `food-reservation:0.1.0`
- `postgres:16-alpine`

The application container talks only to PostgreSQL on the compose network. Optional SMTP is unused unless `SMTP_HOST` is set.

Backup frequency recommendation: daily database dump plus weekly full dump retained for 30 days. Test restore quarterly on a spare host. A backup is not valid until restore has been tested.

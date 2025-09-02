# Bootah v8 🚀
**Boot smarter. Deploy faster.**

This is Bootah **v8** with the top-5 improvements:
- JWT (golang-jwt) + access/refresh tokens (15m/30d), refresh cookie, logout
- Audit trail for login, image ops, role changes, password resets
- Storage health (S3/local) admin endpoint
- WinPE Builder (stub jobs) + admin UI
- Driver Packs catalog + admin UI (attach/detach API)

## Quickstart (local Go)
```bash
cd src/server
go run .
# open http://localhost:8080
```

## Docker
```bash
docker compose up --build
```

## Configuration (env)
- `BOOTAH_HTTP_PORT=8080`
- `BOOTAH_WEB_ROOT=/app/webui`
- `BOOTAH_DB_PATH=/app/data/bootah.db`
- `BOOTAH_IMAGES_DIR=/app/data/images`
- `BOOTAH_JWT_SECRET=change-me`
- `BOOTAH_STORAGE=local|s3`

### S3 (if `BOOTAH_STORAGE=s3`)
- `BOOTAH_S3_ENDPOINT=play.min.io:9000`
- `BOOTAH_S3_BUCKET=bootah`
- `BOOTAH_S3_ACCESS_KEY=...`
- `BOOTAH_S3_SECRET_KEY=...`
- `BOOTAH_S3_REGION=us-east-1`
- `BOOTAH_S3_USE_SSL=true`

### OIDC (optional)
- `BOOTAH_OIDC_ISSUER=https://accounts.google.com`
- `BOOTAH_OIDC_CLIENT_ID=...`
- `BOOTAH_OIDC_CLIENT_SECRET=...`
- `BOOTAH_OIDC_REDIRECT_URL=http://localhost:8080/api/auth/oidc/callback`

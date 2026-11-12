# Session-Based Authentication

An Express API that authenticates users with signed, HTTP-only cookies and server-side sessions. Prisma stores user records in SQLite; an in-memory `Map` stores session identifiers and their expiration times.

## Technologies

- Node.js and Express 5
- Prisma ORM with SQLite
- `bcryptjs` for asynchronous password verification
- `cookie-parser` for signed-cookie verification
- Node.js `crypto` for unpredictable session identifiers

## Requirements and installation

Use Node.js 18 or newer and npm.

```powershell
cd "Module 4/Cookies, Sessions and Authentication"
Copy-Item .env.example .env
npm install
```

In `.env`, replace the `COOKIE_SECRET` placeholder with a private random value of at least 32 characters. The application rejects the example placeholder. Generate a value with:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The supplied SQLite `DATABASE_URL` is suitable for local development. Do not commit `.env`; it is ignored by Git.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Prisma connection string; defaults to the local SQLite database `file:./dev.db` |
| `COOKIE_SECRET` | Secret used by `cookie-parser` to sign and verify `sid`; at least 32 characters |
| `NODE_ENV` | Set to `production` for production cookie behavior |
| `COOKIE_SECURE` | Set `false` for local HTTP or `true` when using HTTPS |
| `SESSION_MAX_AGE_MS` | Session lifetime in milliseconds; defaults to 86400000 (24 hours) |
| `PORT` | HTTP port; defaults to 3000 |

`Secure` is always enabled when `NODE_ENV=production`. In local development, set `COOKIE_SECURE=false` if the server is accessed over plain HTTP.

## Database setup

The starter project uses SQLite and Prisma `db push` for its simple learning setup:

```powershell
npm run setup
```

This generates the Prisma client, creates/updates the database schema, and seeds a demo user (`sam@example.com` / `SessionDemo!48`). To run those operations separately:

```powershell
npx prisma generate
npm run db:push
npm run db:seed
```

To validate the schema:

```powershell
npx prisma validate
```

For a deployment that needs versioned database migrations, use Prisma migrations instead of `db push`, for example `npx prisma migrate dev --name init` during development and `npx prisma migrate deploy` when deploying.

## Start the server

```powershell
npm run dev
```

Or run it without watch mode:

```powershell
npm start
```

The API listens on `http://localhost:3000` unless `PORT` is changed.

## API

All responses use JSON except successful logout, which returns an empty `204 No Content` response.

### `POST /auth/login`

Request:

```json
{
  "email": "sam@example.com",
  "password": "SessionDemo!48"
}
```

The email is trimmed and lowercased before lookup. Invalid request fields return `400`; unknown emails and incorrect passwords return the same generic response:

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

Successful login returns `200`, sets a signed `sid` cookie, and returns only safe identity fields:

```json
{
  "user": {
    "id": 1,
    "name": "Sam",
    "email": "sam@example.com"
  }
}
```

### `GET /auth/me`

Requires the signed `sid` cookie. On success it returns:

```json
{
  "user": {
    "id": 1,
    "name": "Sam",
    "email": "sam@example.com"
  }
}
```

Missing, invalid, tampered, expired, or orphaned sessions return `401`:

```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Authentication required"
  }
}
```

### `POST /auth/logout`

Destroys the matching server-side session when the signed cookie is valid, clears `sid`, and returns `204`. Logout is safe to repeat.

## Cookie and session behavior

The cookie is named `sid`, is signed with `COOKIE_SECRET`, and has `Path=/`, `HttpOnly`, and `SameSite=Lax`. It contains only an opaque 256-bit random session identifier and its signature; user data and credentials remain server-side. The cookie expires after `SESSION_MAX_AGE_MS`, and the session store independently rejects expired sessions. `Secure` is enabled in production and can be enabled in development when using HTTPS.

The in-memory session store is only for learning and single-process local use. All sessions disappear on restart, and multiple application instances do not share sessions. Production deployments should use a shared store with expiration and cleanup, such as Redis, and should run behind HTTPS.

## Manual verification with curl

In a second terminal, preserve the login cookie in a cookie jar:

```powershell
curl.exe -i -c cookies.txt -H 'Content-Type: application/json' --data-raw '{"email":"sam@example.com","password":"SessionDemo!48"}' http://localhost:3000/auth/login
curl.exe -i -b cookies.txt http://localhost:3000/auth/me
curl.exe -i -b cookies.txt -X POST http://localhost:3000/auth/logout
curl.exe -i -b cookies.txt http://localhost:3000/auth/me
```

The first request should return `200` and a `Set-Cookie` header with `sid`, `HttpOnly`, and `SameSite=Lax`. The next request should return the user. Logout returns `204`; using the old cookie afterward returns `401`.

To verify missing-cookie and invalid-credential behavior:

```powershell
curl.exe -i http://localhost:3000/auth/me
curl.exe -i -H 'Content-Type: application/json' --data-raw '{"email":"missing@example.com","password":"wrong"}' http://localhost:3000/auth/login
```

Use Postman's cookie jar to retain the `sid` cookie between login, identity, and logout requests.

## Automated tests

After setting up the database, run:

```powershell
npm test
```

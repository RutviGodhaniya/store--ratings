# Store Ratings

A role-based store-rating application built with React, Express, and PostgreSQL.

## Features

- One login system with normal-user, system-administrator, and store-owner roles.
- Normal users can register, search stores by name or address, and submit or update a 1–5 rating.
- Administrators can review dashboard totals, create users and stores, and filter or sort directory listings.
- Administrators can link a store-owner account to a store when creating the store.
- Store owners can view their average rating and the users who rated their store.
- Signed-in users can change their password.
- Server-side validation, password hashing, and role-protected API routes.

## Requirements

- Node.js 22 or later
- PostgreSQL
- pgAdmin or another PostgreSQL client

## Local setup

1. Create a PostgreSQL database named `store_ratings`.
2. Open `server/db/schema.sql` in pgAdmin's Query Tool, select `store_ratings`, and execute the SQL once.
3. Copy `server/.env.example` to `server/.env` and set `DB_PASSWORD` and a private random `JWT_SECRET`.
4. Install backend dependencies from the `server` folder:

   ```powershell
   cd server
   npm install
   ```

5. Install frontend dependencies from the `client` folder in a second terminal:

   ```powershell
   cd client
   npm install
   ```

6. Start the API from the `server` folder:

   ```powershell
   npm run dev
   ```

7. Start the website from the `client` folder in another terminal:

   ```powershell
   npm run dev
   ```

8. Open the `Local` address printed by Vite, usually `http://localhost:5173`. The API health endpoint is `http://localhost:3000/api/health`.

## First administrator

Public signup always creates a normal user. After signing up, use this local development command from the `server` folder to promote the first account:

```powershell
npm run promote-admin -- your-email@example.com
```

Log out and back in to receive a token with the new role. Do not create a public endpoint that allows users to promote themselves.

## API routes

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register a normal user |
| `POST` | `/api/auth/login` | Log in |
| `PUT` | `/api/auth/password` | Change the signed-in user's password |
| `GET` | `/api/stores` | Search/sort stores for a normal user |
| `PUT` | `/api/stores/:storeId/rating` | Submit or update a rating |
| `GET` | `/api/admin/summary` | Admin dashboard totals |
| `GET`, `POST` | `/api/admin/stores` | List and add stores |
| `GET`, `POST` | `/api/admin/users` | List and add user accounts |
| `GET` | `/api/owner/dashboard` | Store-owner ratings and average |

## Notes

- Keep `server/.env` private; `.gitignore` excludes it and dependency/build folders.
- Store and portrait images are illustrative Unsplash photos and need an internet connection to load.
- The footer identifies the project author. A visible credit does not prevent copying of public source code.

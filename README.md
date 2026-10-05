# PadelVR

MERN starter workspace with a Vite/React client and an Express/Mongoose API.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- MongoDB (optional for starting the API; needed for database-backed features)

## Setup

```sh
npm install
cp server/.env.example server/.env
npm run dev
```

The client runs at http://localhost:5173 and the API at http://localhost:5001. The client proxies `/api` requests to the API. Configure `MONGODB_URI` in `server/.env` to connect MongoDB.

## Structure

```text
client/                 React app, Vite config, and UI source
server/                 Express API and Mongoose connection
  src/config/            Database setup
  src/routes/            API routes
```

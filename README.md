## Auth API (Node.js + Express + MongoDB)

### Setup

1. Copy `.env.example` to `.env` and fill values:

```
PORT=4000
MONGODB_URI=mongodb+srv://darshilthummar01_db_user:teuPJSOsBcoxxqg7@clarify.xyq2ezz.mongodb.net/
MONGODB_DB=clarify
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
SALT_ROUNDS=10
```

2. Install dependencies and start:

```
npm install
npm run dev
```

Server: http://localhost:4000

### Endpoints

- POST `/api/auth/register`
  - body: `{ username, email, password, firstName, lastName }`
  - response: `{ success, message, data: { user, token } }`

- POST `/api/auth/login`
  - body: `{ username or email, password }`
  - response: `{ success, message, data: { user, token } }`

- GET `/api/auth/me`
  - header: `Authorization: Bearer <token>`
  - response: `{ success, message, data: { user } }`

- POST `/api/auth/logout`
  - header: `Authorization: Bearer <token>`
  - response: `{ success, message, data: null }`



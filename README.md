# JWT Login API

## About the Project

This project is a Node.js REST API for user authentication and authorization using JWT (JSON Web Tokens) and Prisma ORM. It supports user registration, login, token refresh, logout, and role-based access control. The backend is built with Express.js and uses a MySQL (or other supported) database via Prisma.

**Logging:**

- The project uses `morgan` and `rotating-file-stream` to log all HTTP requests.
- Logs are written to the `logs/` directory, with daily rotation and compression (up to 90 days).
- This helps with monitoring, debugging, and auditing API usage.

## Setup Instructions

1. **Clone the repository**

   ```sh
   git clone https://github.com/janitha479/JWT_login.git
   cd JWT_login
   ```

2. **Install dependencies**

   ```sh
   npm install
   ```

3. **Configure environment variables**

   - Create a `.env` file in the root directory with the following variables:
     ```env
     DATABASE_URL=your_database_url
     JWT_ACCESS_SECRET=your_access_secret
     JWT_REFRESH_SECRET=your_refresh_secret
     JWT_EXPIRES_IN=15m
     JWT_REFRESH_EXPIRES_IN=7d
     PORT=5000
     ```

4. **Setup the database**

- Make sure to remove `output = "./prisma/generated"` from `schema.prisma` before running `npx prisma generate`.
- Edit `prisma/schema.prisma` as needed.
- Run Prisma migrations:
  ```sh
  npx prisma migrate dev --name init
  ```
- (Optional) Generate Prisma client:
  ```sh
  npx prisma generate
  ```

5. **Start the server**
   ```sh
   npm run dev
   # or
   node index.js
   ```

## Project Structure & File Explanation

- `index.js` - Main entry point, sets up Express app, middleware, and routes.
- `controllers/` - Contains logic for authentication and user actions:
  - `authController.js` - Handles register, login, refresh, and logout.
- `middleware/` - Custom Express middleware:
  - `authMiddleware.js` - Protects routes, checks JWTs.
- `routes/` - API route definitions:
  - `authRoutes.js` - Auth endpoints (register, login, refresh, logout).
  - `userRoutes.js`, `adminRoutes.js`, `workerRoutes.js` - Role-based endpoints.
- `prisma/` - Prisma ORM files:
  - `schema.prisma` - Database schema.
  - `migrations/` - Migration history.
- `generated/` - (If present) Generated Prisma client files.
- `API.rest` - Example HTTP requests for testing the API.

## API Endpoints

### Auth

- `POST /api/auth/register` - Register a new user
  - Body: `{ "email": "...", "phone": "...", "password": "...", "roleName": "..." }`
- `POST /api/auth/login` - Login and receive access/refresh tokens
  - Body: `{ "email": "...", "password": "..." }`
  - **Web:** The refresh token is set as an HTTP-only cookie (not accessible to JS).
  - **Mobile:** Send the header `X-Client-Type: mobile` to receive the refresh token in the response body.
- `POST /api/auth/refresh` - Get a new access token using a refresh token
  - **Web:** No body needed; the backend reads the refresh token from the HTTP-only cookie.
  - **Mobile:** Send `{ "refreshToken": "..." }` in the request body.
- `POST /api/auth/logout` - Logout and invalidate refresh token
  - **Web:** No body needed; the backend clears the HTTP-only cookie.
  - **Mobile:** Send `{ "refreshToken": "..." }` in the request body.

### User/Admin/Worker

- `GET /api/user/...` - User-specific endpoints (require user role)
- `GET /api/admin/...` - Admin-specific endpoints (require admin role)
- `GET /api/worker/...` - Worker-specific endpoints (require worker role)

## Notes

- Access tokens are required in the `Authorization: Bearer <token>` header for protected routes.
- Refresh tokens are used to obtain new access tokens without re-authenticating.
- For web clients, refresh tokens are managed via HTTP-only cookies for security.
- For mobile clients, refresh tokens are returned in the response body and must be stored securely (e.g., Keychain/SecureStore).
- Make sure to remove `output = "./prisma/generated"` from `schema.prisma` before running `npx prisma generate`.

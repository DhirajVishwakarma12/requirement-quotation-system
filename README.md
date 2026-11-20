# TXO Requirement & Quotation Management System

React + Node.js/Express + MongoDB + Nodemailer starter implementation.

## Roles
- `client`: registers, creates projects with a website type, selects suggested features, submits a budget offer, and discusses requirements.
- `admin`: manages features, views client offers, sends counter offers, creates immutable requirement snapshots, confirms versions, assigns developers through the API, and sends quotations.
- `developer`: sees assigned projects and confirmed requirement history; cannot edit requirements.

The frontend provides separate `/login` and `/register` pages. Project updates are handled in-app without a full page reload.

## Setup

### Backend
```bash
cd backend
npm install
copy .env.example .env
```
Edit `.env`:
- `MONGO_URI`: your MongoDB connection string
- `JWT_SECRET`: long random secret
- `EMAIL_USER`: Gmail address used to send verification codes and quotations
- `EMAIL_PASS`: Google App Password (not your normal Gmail password)

Enable 2-Step Verification on the Gmail account and create an App Password. Legacy `SMTP_USER`/`SMTP_PASS` and lowercase `email_user`/`email_pass` variables are also supported.

New client registrations require email verification. Password sign-ins also require a six-digit email code. Codes expire after 10 minutes, allow five attempts, and can be resent once per minute.

Run:
```bash
npm run dev
```
API runs at `http://localhost:5000`.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`.

Optional frontend `.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

## Important API endpoints
- `POST /api/auth/register` — creates an unverified client account and emails a verification code
- `POST /api/auth/login` — validates credentials and emails a sign-in code
- `POST /api/auth/verify-otp` — verifies `{ "email": "...", "otp": "123456", "challengeToken": "..." }` and creates the auth session
- `POST /api/auth/resend-otp` — resends a code using the active email and challenge token
- `POST /api/auth/logout` — invalidates the current token and clears the auth cookie
- `GET /api/projects` — role-filtered projects
- `GET /api/projects/suggestions/:level` — project feature suggestions by scope
- `GET /api/projects/:id/budget-suggestions` — client-only suggested budget messages, tailored to the project's negotiation status
- `POST /api/projects` — client creates a project with `websiteType`, `offerAmount`, `offerNotes`, and manually selected `selectedFeatures`
- `PATCH /api/projects/:id/counter-offer` — admin submits or updates a counter offer (`{ "amount": 5000, "notes": "..." }`)
- `PATCH /api/projects/:id/client-counter-offer` — client submits a re-counter offer
- `POST /api/projects/:id/budget/confirm` — client or admin confirms the current amount; the deal is marked agreed once both have confirmed
- `POST /api/projects/:id/features` — admin adds feature
- `PATCH /api/projects/:id/features/:featureId` — admin modifies feature
- `DELETE /api/projects/:id/features/:featureId` — admin marks feature removed (not physically deleted)
- `POST /api/projects/:id/versions` — admin saves a version snapshot and automatic change tags
- `POST /api/projects/:id/versions/:versionId/confirm` — admin confirms a version
- `POST /api/projects/:id/quotation` — admin creates and emails quotation to client + assigned developer
- `POST /api/projects/:id/developer` — admin assigns developer (`{ "developerId": "..." }`)

Logged-out tokens are stored as SHA-256 hashes in the `TokenBlacklist` collection until their expiry; MongoDB removes expired blacklist entries using a TTL index.

## Creating admin/developer accounts
Public registration intentionally always creates `client` accounts. Create trusted staff accounts manually in MongoDB or with a protected internal admin workflow. Example MongoDB document:
```js
{ name: "TXO Admin", email: "admin@example.com", password: "<bcrypt hash>", role: "admin" }
```
Never expose a public endpoint that lets users choose `admin` or `developer` roles.

## Notes before production
This is a runnable starter, not a production-hardened deployment. Add rate limiting, request validation, CSRF protection if using cookie auth cross-site, audit logging, pagination, transactional version creation, and tests. Configure secure cookies and HTTPS in production. The admin UI's developer assignment endpoint is available but a staff-management screen is not included yet. The UI uses a simple prompt for editing feature titles; replace with a proper modal for production.

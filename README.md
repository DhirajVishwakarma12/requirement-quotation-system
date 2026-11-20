# TXO Requirement & Quotation Management System

React + Node.js/Express + MongoDB + Nodemailer starter implementation.

## Contents

- [Roles and permissions](#roles-and-permissions)
- [Open and navigate the UI](#open-and-navigate-the-ui)
- [Client guide: create and refine an idea](#client-guide-create-and-refine-an-idea)
- [Admin guide: plan, agree, and assign](#admin-guide-plan-agree-and-assign)
- [Developer guide: review assigned work](#developer-guide-review-assigned-work)
- [End-to-end project workflow](#end-to-end-project-workflow)
- [Setup](#setup)
- [Important API endpoints](#important-api-endpoints)
- [Creating admin/developer accounts](#creating-admindeveloper-accounts)
- [Notes before production](#notes-before-production)

## Roles and permissions

- **Client** — registers through the public UI, creates ideas, selects suggested features, submits and discusses a budget offer, reviews requirement versions, and discusses the project with the TXO team.
- **Admin** — reviews all projects, negotiates budgets, edits project features, saves and confirms requirement versions, assigns a developer account, and sends a quotation to the client and assigned developer.
- **Developer** — sees only projects assigned to that developer, reviews the project brief and saved requirement versions, and can send team discussion messages. Developers cannot edit requirements, confirm versions, negotiate the budget, or send quotations.

Public registration creates client accounts only. Admin and developer accounts must be created through a trusted staff process; see [Creating admin/developer accounts](#creating-admindeveloper-accounts).

## Open and navigate the UI

Start the backend and frontend using the [setup instructions](#setup), then open the app:

- [Open the workspace](http://localhost:5173/) — after sign-in, this is the role-aware project dashboard.
- [Sign in](http://localhost:5173/login)
- [Create a client account](http://localhost:5173/register)
- [Verify an account or sign-in](http://localhost:5173/verify-otp) — enter the six-digit code emailed by the app.

After signing in, use the left **Ideas** list (clients) or **Your projects** list (admins and developers) to open a project. The available controls depend on the signed-in role; there are not separate dashboard URLs for each role. The profile menu links to [Services](http://localhost:5173/service), [Contact](http://localhost:5173/contact), and [About](http://localhost:5173/about); select **Back to workspace** to return.

The workspace adapts to phone, tablet, and desktop screens. On a phone, the project list and project details stack vertically; choose a project from the list to view its workspace.

## Client guide: create and refine an idea

1. Use [Create a client account](http://localhost:5173/register), enter your name, email, and password, and verify your email with the code sent to you. Sign in at [the login page](http://localhost:5173/login).
2. In **Ideas**, select **New idea**. Enter an idea name, choose a website type, and explain what you want to build. Examples of website types include a business website, online store, portfolio, booking service, or web application.
3. Choose a scope level — **Basic**, **Medium**, or **Advanced**. Review the suggested features and their descriptions, and select at least one feature. These suggestions are starting points: describe the specific behavior, users, and expected results in the idea description and team discussion.
4. Enter your budget offer and, optionally, a note explaining assumptions or priorities. Select **Create idea**. The idea appears in your list and is shared with the admin team.
5. Open the idea to review its project brief, active features, budget discussion, version area, and team messages. Use the discussion to clarify requirements or respond to the admin.
6. When the admin sends a counter offer, review the amount and notes. You can send a re-counter offer and discuss it. When you accept the current amount, select **Agree to this amount**. The budget is agreed only after both the client and admin confirm the same current offer.
7. Review the latest requirement version shown under **Current version**. Select **History** to expand older versions. Ask questions or request changes in the team discussion; the admin updates the active feature list and saves a new version.
8. The admin emails the quotation to you and the assigned developer after requirements are confirmed. If the email does not appear, check spam/junk and ask the TXO team to review the displayed delivery error/status. A mail server acceptance is not a guarantee of inbox delivery.

## Admin guide: plan, agree, and assign

1. Sign in with an admin account. The **Your projects** list includes projects from all clients; select a project to open its shared workspace.
2. Review the idea name, website type, scope level, description, client-selected features, offer amount, and offer note. The suggested feature descriptions explain the intended feature behavior; use the discussion to clarify anything that is underspecified.
3. To refine scope, use **Add a feature**, **Edit**, or **Remove**. Removed features are excluded from the active scope but retained in version history. After making requirement changes, select **Save new requirement version**. A version is a snapshot of the active features and includes tags for added, modified, and removed requirements. The UI shows the newest version first; older versions are tucked under **History**.
4. To negotiate the budget, review the client offer and use **Send counter offer** with an amount and note. The client can re-counter after an admin counter offer. Either party can confirm the current amount; the deal becomes agreed only when both the client and admin confirm that offer. Discuss scope or amount changes before confirming.
5. In **Assign developer**, choose a user with the `developer` role and select **Assign developer**. The API rejects users without that role. A developer must be assigned before sending a quotation.
6. Confirm the requirement version that the quotation should cover. In **Quotation**, select a confirmed version, enter **Developer cost** and **Other costs**, and add any quotation notes. The total must be below the agreed budget when an agreed budget exists; it cannot equal the agreed budget.
7. Select **Email quotation to client & developer**. The client email contains the project brief, client-submitted information, confirmed requirements, and costs. The developer receives a separate email with the same quotation details plus developer contact details; the client email does not disclose developer contact details. Review the inline error/status if delivery fails or is only partially accepted.

The current interface provides developer assignment but does not include staff account creation. See [Creating admin/developer accounts](#creating-admindeveloper-accounts).

## Developer guide: review assigned work

1. Sign in with the developer account provided by the TXO administrator. Developers are not able to create an account through public client registration.
2. Open a project from **Your projects**. Only projects assigned to your developer account are listed.
3. Review the project name, type, scope, description, active features, and **Current version**. The current version is visible by default; select **History** to expand older snapshots and their change tags.
4. Review the quotation email for the confirmed scope and cost breakdown. Developer contact details are included in the developer email, not in the client’s copy.
5. Use **Discussion** to message the admin about questions or proposed requirement changes. Requirement editing, budget negotiation, version confirmation, developer assignment, and quotation sending are admin/client workflows and are not available to the developer.

## End-to-end project workflow

```text
Client creates an idea and submits features + budget offer
        ↓
Admin reviews the brief, clarifies details, and updates the feature scope
        ↓
Admin saves a requirement snapshot; client and admin discuss/confirm the budget
        ↓
Admin confirms the requirement version and assigns a developer
        ↓
Admin prepares and emails the quotation to client and developer separately
        ↓
Client, admin, and assigned developer use the project discussion to coordinate
```

The main UI sections are **Current features** (the live scope), **Budget discussion** (offers and confirmations), **Current version / History** (saved requirement snapshots), **Assign developer** and **Quotation** (admin-only controls), and **Discussion** (shared project messages). Only the current requirement version is expanded by default; use **History** to show previous versions.

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
- Gmail: set `EMAIL_USER` and `EMAIL_PASS` to a Gmail address and Google App Password (not your normal Gmail password).
- Non-Gmail: remove `EMAIL_USER` / `EMAIL_PASS`, then set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, and `SMTP_PASS` to your provider's SMTP settings and credentials.

Enable 2-Step Verification on the Gmail account and create an App Password. Legacy `SMTP_USER`/`SMTP_PASS` and lowercase `email_user`/`email_pass` variables are also supported.

New client registrations require email verification. Verified users sign in directly; unverified accounts receive a six-digit verification code when they sign in. Codes expire after 10 minutes, allow five attempts, and can be resent once per minute.

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
- `POST /api/auth/login` — validates credentials; creates a session for verified users and emails a verification code to unverified users
- `POST /api/auth/verify-otp` — verifies `{ "email": "...", "otp": "123456", "challengeToken": "..." }` and creates the auth session
- `POST /api/auth/resend-otp` — resends a code using the active email and challenge token
- `POST /api/auth/logout` — invalidates the current token and clears the auth cookie
- `GET /api/projects` — role-filtered projects
- `GET /api/projects/suggestions/:level` — project feature suggestions with helper descriptions by scope
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
- `POST /api/projects/:id/quotation` — admin emails project details, client-submitted information, confirmed requirements, and developer/other cost line items to the client and assigned developer; total must be below the agreed budget when one exists. Optionally pass a confirmed `version` number to choose the requirement version.
- `POST /api/projects/:id/developer` — admin assigns developer (`{ "developerId": "..." }`)
- `GET /api/projects/developers` — admin lists users with the developer role for project assignment

Logged-out tokens are stored as SHA-256 hashes in the `TokenBlacklist` collection until their expiry; MongoDB removes expired blacklist entries using a TTL index.

## Creating admin/developer accounts
Public registration intentionally always creates `client` accounts. Create trusted staff accounts manually in MongoDB or with a protected internal admin workflow. Example MongoDB document:
```js
{ name: "TXO Admin", email: "admin@example.com", password: "<bcrypt hash>", role: "admin" }
```
Never expose a public endpoint that lets users choose `admin` or `developer` roles.

## Notes before production
This is a runnable starter, not a production-hardened deployment. Add rate limiting, request validation, CSRF protection if using cookie auth cross-site, audit logging, pagination, transactional version creation, and tests. Configure secure cookies and HTTPS in production. The admin UI's developer assignment endpoint is available but a staff-management screen is not included yet. The UI uses a simple prompt for editing feature titles; replace with a proper modal for production.

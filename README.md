# Devver Backend Service

Backend API for Devver — a deployment and application management platform on Kubernetes.

Built with **NestJS 11**, **MongoDB** (Mongoose), **MinIO** (S3-compatible storage), **Logto** (auth), **ArgoCD** (GitOps deploys).

## Prerequisites

| Tool    | Minimum version |
| ------- | --------------- |
| Node.js | 22              |
| npm     | 10+             |
| Docker  | 24+             |

For production deploys: access to a **Kubernetes** cluster with **ArgoCD** configured.

## Installation

```bash
# 1. Clone the repository
git clone <repo-url> && cd backend-service

# 2. Install dependencies
npm ci

# 3. Copy the environment variables file
cp .env.example .env
# Fill in the values — see the "Environment Variables" section below
```

## Local Infrastructure (Docker Compose)

The `docker-compose.yml` spins up **MongoDB** and **MinIO**:

```bash
docker compose up -d
```

| Service | Port  | Access                                   |
| ------- | ----- | ---------------------------------------- |
| MongoDB | 27018 | `mongodb://localhost:27018`              |
| MinIO   | 9000  | S3 API                                   |
| MinIO   | 8900  | Console (`minioadmin` / `minioadmin123`) |

## Environment Variables

| Variable                    | Group        | Description                         |
| --------------------------- | ------------ | ----------------------------------- |
| `DATABASE_URL`              | Database     | MongoDB connection string           |
| `DATABASE_NAME`             | Database     | Database name                       |
| `LOGTO_BASE_URL`            | Logto        | Logto instance base URL             |
| `LOGTO_CLIENT_ID`           | Logto        | M2M application Client ID in Logto  |
| `LOGTO_SECRET`              | Logto        | Logto Client Secret                 |
| `LOGTO_WEBHOOK_SIGNING_KEY` | Logto        | Logto webhook signing key           |
| `PORT`                      | Server       | API port (default: 3000)            |
| `NODE_ENV`                  | Server       | `development` / `production`        |
| `FRONTEND_URL`              | Server       | Frontend URL (for CORS and links)   |
| `MINIO_ENDPOINT`            | MinIO        | MinIO host                          |
| `MINIO_PORT`                | MinIO        | MinIO port (optional)               |
| `MINIO_ACCESS_KEY`          | MinIO        | Access key                          |
| `MINIO_SECRET_KEY`          | MinIO        | Secret key                          |
| `MINIO_BUCKET_NAME`         | MinIO        | Bucket name                         |
| `MINIO_USE_SSL`             | MinIO        | `true` / `false`                    |
| `CORS_ALLOWED_ORIGINS`      | CORS         | Allowed origins (comma-separated)   |
| `GITHUB_TOKEN`              | GitHub       | Personal access token               |
| `GITHUB_OWNER`              | GitHub       | Manifests repository owner          |
| `GITHUB_REPO`               | GitHub       | Manifests repository                |
| `GITHUB_BRANCH`             | GitHub       | Target branch                       |
| `DEPLOY_AGENT_SECRET`       | Deploy Agent | Shared secret with the deploy agent |
| `K8S_BASE_DOMAIN`           | Deploy Agent | Base domain for K8s ingress         |
| `ARGOCD_BASE_URL`           | ArgoCD       | ArgoCD API URL                      |
| `ARGOCD_API_KEY`            | ArgoCD       | ArgoCD API key                      |
| `ENCRYPTION_KEY`            | Encryption   | Symmetric encryption key            |

## Commands

```bash
# Development (watch mode)
npm run start:dev

# Development with debug
npm run start:debug

# Build
npm run build

# Production
npm run start:prod

# Lint
npm run lint

# Format code
npm run format
```

## API & Swagger

The API is served under the `/api/v1` prefix.

Swagger documentation is available at:

```
http://localhost:<PORT>/api/doc
```

## Docker Build (production)

```bash
docker build -t devver-backend .
docker run -p 3000:3000 --env-file .env devver-backend
```

## Project Structure

```
src/
├── main.ts                  # Application bootstrap
├── app.module.ts            # Root module
├── _utils/                  # Helpers, config, guards, pipes, DTOs
├── _migrations/             # Migration scripts
├── _shared/                 # Shared modules (GitHub)
├── argocd/                  # ArgoCD integration (SSE + API)
├── comments/                # Deployment comments
├── deploy-agent/            # Deploy agent communication
├── logto/                   # Authentication via Logto
├── minio/                   # File uploads (S3/MinIO)
├── organizations/           # Organization management
├── projects/                # Project management
├── users/                   # User management
└── webhooks/                # Webhooks (Logto, etc.)
```

## Testing the Main Flow

1. Start local infrastructure: `docker compose up -d`
2. Start the backend: `npm run start:dev`
3. Open Swagger: `http://localhost:3000/api/doc`
4. Authenticate via Logto and obtain a Bearer token
5. Create an organization → create a project → trigger a deploy
6. Monitor deploy status via SSE (`/argocd`)

## Git Hooks & Commit Convention

This project uses **Husky** to enforce commit standards and code quality.

### Commit Message Format

Every commit message **must** start with an emoji (or its shortcode). A `commit-msg` hook validates this automatically.

| Emoji | Code                 | Usage                      |
| ----- | -------------------- | -------------------------- |
| ✨    | `:sparkles:`         | New feature                |
| 🐛    | `:bug:`              | Bug fix                    |
| 📝    | `:memo:`             | Documentation              |
| 🎨    | `:art:`              | Code improvement/structure |
| ♻️    | `:recycle:`          | Refactoring                |
| ⚡    | `:zap:`              | Performance improvement    |
| 🔒    | `:lock:`             | Security                   |
| ✅    | `:white_check_mark:` | Tests                      |
| 🔧    | `:wrench:`           | Configuration              |
| 🚀    | `:rocket:`           | Deploy/CI/CD               |
| 🔥    | `:fire:`             | Remove code/files          |
| 💄    | `:lipstick:`         | UI/styling                 |
| 🏷️    | `:label:`            | Types/interfaces           |
| 📦    | `:package:`          | Dependencies               |
| 🚧    | `:construction:`     | Work in progress           |
| 🧹    | `:broom:`            | Lint/Format fixes          |

**Examples:**

```bash
git commit -m "✨ Add JWT authentication"
git commit -m "🐛 Fix email validation"
git commit -m "📦 Update dependencies"
```

### Git Hooks

| Hook                 | Trigger      | Action                                                                  |
| -------------------- | ------------ | ----------------------------------------------------------------------- |
| `prepare-commit-msg` | `git commit` | Shows an emoji template when no message is provided                     |
| `commit-msg`         | `git commit` | Validates that the message starts with an allowed emoji (blocks if not) |
| `pre-push`           | `git push`   | Runs **ESLint** + **Prettier** — blocks push on failure                 |

> See [COMMIT_GUIDE.md](COMMIT_GUIDE.md) for the full guide.

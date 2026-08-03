# Spotify — Indie Music Platform

A full-stack music streaming platform built with Next.js 14, TypeScript, MongoDB (Prisma ORM), and Tailwind CSS. Artists upload and share music; listeners discover, stream, and build playlists.

## Repository Layout

```
├── app/                  # Next.js App Router pages & API routes
├── prisma/               # Prisma schema & migrations
├── public/               # Static assets
├── src/                  # Shared libraries & utilities
│   ├── lib/              # Core utilities (storage, validation, pagination)
│   ├── services/         # Business logic services
│   └── middleware/       # Express/Next.js middleware
├── e2e/                  # Playwright E2E tests
├── tests/                # Unit & integration test suites
├── .github/workflows/    # CI/CD pipelines
└── scripts/              # Automation scripts
```

## Prerequisites

- **Node.js** 18.x or later
- **MongoDB** 6.x (local or Atlas)
- **AWS CLI** or Cloudflare R2 credentials (for storage)

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm test` | Run Vitest unit/integration tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npx prisma validate` | Validate Prisma schema |
| `npx prisma migrate dev` | Create and apply migration |

## Environment Variables

Required variables are listed in `.env.example`. At minimum you need:

- `DATABASE_URL` — MongoDB connection string
- `JWT_SECRET` — Secret for signing session tokens
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` — Storage provider credentials
- `S3_BUCKET_NAME`, `S3_ENDPOINT` — Object storage target

## Testing

```bash
# Unit + integration
npm test

# E2E (requires dev server running)
npm run test:e2e
```

## License

Proprietary — Iotasol Inc.

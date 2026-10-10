# OMEGA SPA POS — Backend

Production-grade backend API for the OMEGA SPA POS luxury day spa management system.

## Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Language | TypeScript (strict mode) |
| Database | MySQL |
| ORM | Prisma |
| Validation | Zod |
| Authentication | JWT (jsonwebtoken + bcrypt) |
| Security | Helmet, CORS |
| Logging | Morgan |

## Project Structure

```
backend/
├── src/
│   ├── config/         # Environment and constants
│   ├── middleware/      # Error handling, auth, RBAC (future)
│   ├── modules/        # Business modules (future phases)
│   ├── utils/          # Logger, response helpers
│   ├── uploads/        # File upload storage
│   ├── app.ts          # Express application setup
│   └── server.ts       # Server entry point
├── prisma/
│   └── schema.prisma   # Prisma ORM schema
├── .env                # Environment variables (not committed)
├── .env.example        # Environment variable template
├── .gitignore          # Git ignore rules
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── README.md           # This file
```

## Development Setup

### Prerequisites

- Node.js v20+ LTS
- MySQL 8.0+
- npm or yarn

### Installation

```bash
cd backend
npm install
```

### Environment Variables

Copy the example environment file and configure your values:

```bash
cp .env.example .env
```

| Variable | Description | Example |
|---|---|---|
| `PORT` | Server port | `5000` |
| `DATABASE_URL` | MySQL connection string | `mysql://user:pass@localhost:3306/omega_spa_pos` |
| `JWT_SECRET` | JWT signing secret | `your-secure-secret-key` |
| `NODE_ENV` | Environment mode | `development` / `production` |

## Available Scripts

| Script | Command | Description |
|---|---|---|
| Development | `npm run dev` | Start dev server with hot reload (nodemon + ts-node) |
| Build | `npm run build` | Compile TypeScript to `dist/` |
| Production | `npm start` | Run compiled production build from `dist/` |
| Prisma Generate | `npm run prisma:generate` | Generate Prisma client |
| Prisma Migrate | `npm run prisma:migrate` | Run database migrations |
| Prisma Studio | `npm run prisma:studio` | Open Prisma database GUI |

## Running the Development Server

```bash
npm run dev
```

The server starts at `http://localhost:5000`.

### Health Check

```
GET http://localhost:5000/
```

Response:

```json
{
  "message": "OMEGA SPA POS Backend Running"
}
```

## Building for Production

```bash
npm run build
npm start
```

## API Documentation

Refer to the project documentation files:

- `PROJECT_REQUIREMENTS.md` — Business requirements
- `DATABASE_SCHEMA.md` — Database design
- `API_SPECIFICATION.md` — API contracts
- `BACKEND_IMPLEMENTATION_GUIDE.md` — Implementation guide

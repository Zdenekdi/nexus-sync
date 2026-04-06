# Nexus Hub — Backend Server

Multi-tenant escort agency management API with real-time messaging, safety features, VoIP integration, and role-based access control.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your secrets (see comments in .env.example)

# 3. Initialize database
npx prisma migrate deploy
npx prisma db seed

# 4. Start server
npm start          # production
npm run dev        # development (nodemon)
```

## Docker

```bash
docker compose up -d
```

## Architecture

- **Runtime**: Node.js 20 + Express 5
- **Database**: SQLite (dev) / PostgreSQL (production recommended)
- **ORM**: Prisma 6
- **Real-time**: Socket.io
- **Auth**: JWT + bcrypt + device binding
- **Push**: Firebase Cloud Messaging
- **VoIP**: Asterisk + JsSIP (SIP over WebSocket)
- **Alerts**: Telegram Bot API
- **Validation**: Zod schemas on all critical endpoints
- **Logging**: Winston with daily rotation

## API Routes

| Path | Description |
|------|-------------|
| `/api/auth` | Login, register, logout |
| `/api/profiles` | Escort profile CRUD |
| `/api/chats` | Chat thread management |
| `/api/messages` | Messages + relay outbox |
| `/api/device` | Device binding, push tokens, relay |
| `/api/safety` | Safety sessions (check-in/out, panic) |
| `/api/blacklist` | Shared blacklist (cross-agency) |
| `/api/sos` | SOS alerts + location tracking |
| `/api/bookings` | Calendar bookings |
| `/api/inventory` | Location-based inventory |
| `/api/notes` | Client notes per profile |
| `/api/subscriptions` | Plans & billing |
| `/api/analytics` | Daily stats & KPIs |
| `/api/qa` | Quality assurance records |
| `/api/calls` | Call logs & metrics |
| `/api/emergencies` | Emergency events & receipts |
| `/api/agency` | Agency settings & users |
| `/api/admin` | Global feature toggles |
| `/api/sip` | SIP/VoIP configuration |
| `/api/vultr` | Infrastructure info |
| `/health` | Health check |

## Environment Variables

See `.env.example` for all required and optional variables.

**Required**: `JWT_SECRET` (min 32 chars), `DEVICE_SECRET` (min 16 chars), `DATABASE_URL`

## Background Services

- **Safety Escalation Worker** — Checks every 30s for expired grace periods → auto-escalates + creates SOS
- **Cron: Daily Stats** — Generates per-agency stats daily at 01:00
- **Cron: Subscription Expiry** — Marks expired subscriptions at 02:00

## Security

- Helmet security headers
- CORS whitelist (Firebase + Capacitor origins)
- Rate limiting: 500 req/15min (global), 20 req/15min (auth)
- JWT with 24h expiry
- bcrypt password hashing (10 rounds)
- Zod input validation on all write endpoints
- Agency-scoped data isolation (multi-tenancy)
- AES-256-GCM SIP credential encryption

## License

Proprietary — All rights reserved.

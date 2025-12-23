# WHOIS Tracker

Domain monitoring with automated email notifications. Track domain expiry dates and get alerts before they expire.

## Features

- JWT authentication
- Track multiple domains per user
- Automated WHOIS data fetching via cron jobs
- Email notifications (30, 7, 1 day before expiry)
- Alerts when expiry dates change
- PostgreSQL database
- Deployed on Vercel

## Tech Stack

- NestJS
- PostgreSQL (Vercel Postgres)
- Resend (Email)
- TypeScript

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run development server
npm run start:dev
```

## Environment Variables

```env
POSTGRES_URL="postgresql://username:password@host:5432/database"
JWT_SECRET="your-secret-key"
JWT_EXPIRATION="7d"
CRON_SECRET="your-cron-secret"
RESEND_API_KEY="re_your_api_key"
FROM_EMAIL="noreply@yourdomain.com"
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register user
- `POST /auth/login` - Login

### Domains
- `POST /domains` - Add domain (requires auth)
- `GET /domains` - List domains with pagination (requires auth)
- `GET /domains/:domain` - Get WHOIS data (requires auth)
- `DELETE /domains/:domain` - Remove domain (requires auth)

### Cron
- `GET /domains/cron/fetch-whois` - Trigger WHOIS fetch (protected)

## Deployment

Deploy to Vercel:

```bash
vercel --prod
```

Or push to GitHub and connect to Vercel dashboard.

## License

MIT

# WHOIS Tracker

A production-ready NestJS application for monitoring domain WHOIS information with automated email notifications. Track your domains, get timely expiry alerts, and never lose a domain again.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Email Notifications](#email-notifications)
- [Cron Jobs](#cron-jobs)
- [Deployment](#deployment)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Overview

WHOIS Tracker is a domain monitoring service that helps you keep track of your domain registrations and receive timely notifications before they expire. Built with NestJS and designed for Vercel deployment, it provides a robust API for domain management with automated WHOIS data synchronization.

## Features

### Core Functionality
- **User Authentication**: Secure JWT-based authentication with bcrypt password hashing
- **Domain Tracking**: Monitor unlimited domains per user account
- **Automated WHOIS Sync**: Daily scheduled jobs to fetch and update domain information
- **Smart Notifications**: Email alerts at 30, 7, and 1 day before expiry
- **Change Detection**: Automatic notifications when domain expiry dates change
- **Pagination Support**: Efficient data handling for large domain lists
- **Multi-User Support**: Multiple users can track the same domain independently

###Installation

### 1. Clone the Repository

```bash
git clone https://github.com/fahadwaseem8/whois-tracker.git
cd whois-tracker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database Configuration
POSTGRES_URL="postgresql://username:password@host:5432/database"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-min-32-characters"
JWT_EXPIRATION="7d"

# Cron Job Security
CRON_SECRET="your-cron-secret-key-min-32-characters"

# Email Service (Resend)
RESEND_API_KEY="re_your_resend_api_key_here"
FROM_EMAIL="noreply@yourdomain.com"
```

**Important Security Notes:**
- Generate strong random strings for `JWT_SECRET` and `CRON_SECRET` (32+ characters)
- Never commit `.env` file to version control
- Use different secrets for development and production

## Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret key for JWT token generation | Random 32+ character string |
| `JWT_EXPIRATION` | JWT token expiration time | `7d`, `24h`, `60m` |
| `CRON_SECRET` | Secret for cron endpoint protection | Random 32+ character string |
| `RESEND_API_KEY` | Resend API key for emails | `re_xxxxxxxxxxxxx` |
| `FROM_EMAIL` | Sender email address | `noreply@yourdomain.com` |

### Optional Configuration

You can customize notification thresholds in `src/domains/domains.service.ts`:

```typescript
// Default: [30, 7, 1] days before expiry
const alertThresholds = [30, 7, 1];
```

## Database Setup

### Option 1: Automatic Setup (Recommended)

The application will automatically create all required tables on first run:

```bash
npm run start:dev
```

### OptDocumentation

Base URL: `http://localhost:3000` (development) or `https://your-app.vercel.app` (production)

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
### Overview

The application sends professional, text-based email notifications to keep you informed about your domains.

### Notification Types

#### 1. Domain Expiry Alerts
Sent at three critical thresholds:
- **30 days before expiry** - MEDIUM priority
- **7 days before expiry** - HIGH priority
- **1 day before expiry** - CRITICAL priority

**Email Content:**
- Domain name
- Expiry date
- Days remaining
- Priority level
- Action required

#### 2. Expiry Date Change Notifications
Sent immediately when the system detects a change in domain expiry date:
- Shows old vs new expiry date
### Deploying to Vercel (Recommended)

#### 1. Prerequisites
- Vercel account ([sign up here](https://vercel.com/signup))
- GitHub repository with your code
- Vercel Postgres database

#### 2. Create Vercel Postgres Database

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Create a new Postgres database
vercel postgres create
```

Copy the `POSTGRES_URL` connection string.

#### 3. Connect GitHub Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure project settings:
   - Framework Preset: **Other**
   - Build Command: `npm run build`
   - Output Directory: `dist`

#### 4. Configure Environment Variables

In Vercel project settings, add:

```
POSTGRES_URL=your_vercel_postgres_url
JWT_SECRET=your-production-jwt-secret
JWT_EXPIRATION=7d
CRON_SECRET=your-production-cron-secret
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=notifications@yourdomain.com
```

#### 5. Deploy

```bash
# Deploy to production
vercel --prod
```

Or push to your main branch - Vercel will auto-deploy.

#### 6. Verify Deployment

```bash
# Test health endpoint
curl https://your-app.vercel.app/

# Test API
curl -X POST https://your-app.vercel.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

#### 7. Verify Cron Job

1. Go to Vercel Dashboard → Your Project → Settings
2. Click "Cron Jobs"
3. Verify `/domains/cron/fetch-whois` is listed and active

### Deploying to Other Platforms

#### Railway

1. Create account at [railway.app](https://railway.app)
2. Create new project from GitHub
3. Add Postgres database
4. Set environment variables
5. Deploy

#### Heroku

1. Create Heroku app: `heroku create whois-tracker`
2. Add Postgres: `heroku addons:create heroku-postgresql:mini`
3. Set env vars: `heroku config:set KEY=value`
4. Deploy: `git push heroku main`
5. Set up Heroku Scheduler for cron jobs

#### Docker

```dockerfile
# Dockerfile already configured in project
docker build -t whois-tracker .
docker run -p 3000:3000 --env-file .env whois-tracker
```

Deploy to any Docker-compatible platform (AWS ECS, Azure Container Instances, etc.)

### Post-Deployment Checklist

- [ ] Database tables created successfully
- [ ] Can register a new user
- [ ] Can login and get JWT token
- [Troubleshooting

### Common Issues

#### Database Connection Errors

```
Error: connect ECONNREFUSED
```

**Solution:**
- Verify `POSTGRES_URL` is correct
- Check database is running
- Ensure IP is whitelisted (for cloud databases)
- Test connection: `psql $POSTGRES_URL`

#### JWT Token Errors

```
401 Unauthorized
```

**Solution:**
- Verify `JWT_SECRET` matches between environments
- Check token hasn't expired
- Ensure `Authorization: Bearer <token>` header is included

#### Email Not Sending

**Solution:**
- Verify `RESEND_API_KEY` is valid
- Check domain is verified in Resend dashboard
- Review Resend logs for delivery issues
- Ensure `FROM_EMAIL` is authorized

#### Cron Job Not Running

**Solution:**
- Check Vercel Cron Jobs page shows job as active
- Verify `vercel.json` cron configuration is correct
- Check function logs in Vercel dashboard
- Test endpoint manually with cURL

#### WHOIS Data Not Fetching

**Solution:**
- Some domains may have rate limiting
- Verify domain format is correct (no www, http, etc.)
- Check if domain actually exists
- Review error logs for specific WHOIS server issues

### Getting Help

1. Check the [documentation](./docs/)
2. Search [existing issues](https://github.com/fahadwaseem8/whois-tracker/issues)
3. Create a new issue with:
   - Environment details (Node version, OS, etc.)
   - Steps to reproduce
   - Error messages and logs
   - Expected vs actual behavior

## Performance Considerations

### Optimization Tips

1. **Database Indexing**: Already optimized with indexes on frequently queried columns
2. **Pagination**: Always use pagination for domain lists
3. **Cron Timing**: Avoid running cron during peak hours
4. **Rate Limiting**: Consider implementing rate limiting for API endpoints
5. **Caching**: Consider caching WHOIS data for frequently checked domains

### Scaling

**Current Limits (Vercel Free Tier):**
- 100 cron executions/day
- 100GB-hours function runtime/month
- Suitable for ~50-100 domains with multiple users

**When to Upgrade:**
- Tracking 100+ domains
- 5000+ email notifications/month
- High API request volume
- Need for faster cron intervals

## Security Best Practices

1. **Environment Variables**: Never commit `.env` to version control
2. **Secrets**: Use strong, random secrets (32+ characters)
3. **Password Hashing**: Already implemented with bcrypt
4. **JWT Expiration**: Set reasonable expiration times
5. **Input Validation**: All DTOs have validation decorators
6. **SQL Injection**: Protected by parameterized queries
7. **Rate Limiting**: Consider implementing for production
8. **CORS**: Configure appropriately for your frontend

## Contributing

We welcome contributions! Here's how you can help:

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm run test`
5. Format code: `npm run format`
6. Commit changes: `git commit -m 'Add amazing feature'`
7. Push to branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Code Style

- Follow existing code patterns
- Use TypeScript strictly
- Add comments for complex logic
- Update documentation for new features
- Write tests for new functionality

### Commit Messages

Follow conventional commits:
- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `refactor: improve code structure`
- `test: add tests`
- `chore: maintenance tasks`

## Roadmap

### Planned Features

- [ ] Support for DNS monitoring
- [ ] SSL certificate expiry tracking
- [ ] Webhook notifications
- [ ] Dashboard UI
- [ ] Mobile app
- [ ] Multi-language support
- [ ] Advanced analytics
- [ ] Bulk domain import
- [ ] API rate limiting
- [ ] Domain transfer detection

### Version History

**v1.0.0** (Current)
- Initial release
- Basic domain tracking
- Email notifications
- WHOIS synchronization

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- WHOIS data powered by [whoiser](https://github.com/LayeredStudio/whoiser)
- Email service by [Resend](https://resend.com/)
- Database hosted on [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)

## Contact

- **Repository**: [github.com/fahadwaseem8/whois-tracker](https://github.com/fahadwaseem8/whois-tracker)
- **Issues**: [github.com/fahadwaseem8/whois-tracker/issues](https://github.com/fahadwaseem8/whois-tracker/issues)
- **Author**: Fahad Waseem

---

**Note:** This is a production-ready application. Please ensure you follow security best practices, especially when deploying to production environments

```bash
# Run E2E tests
npm run test:e2e
```

### Manual API Testing

#### Using cURL

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Login and save token
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' | jq -r '.access_token')

# Add domain
curl -X POST http://localhost:3000/domains \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain_name":"example.com"}'

# Get domains
curl -X GET http://localhost:3000/domains \
  -H "Authorization: Bearer $TOKEN"
```

#### Using Postman

Import the collection from `postman/WHOIS_Tracker.postman_collection.json` (create if needed)
#### 2. Domain Verification (Production)

For production use, verify your domain:
```bash
# Add DNS records provided by Resend
# Typically SPF, DKIM, and DMARC records
```

For testing, use Resend's sandbox: `onboarding@resend.dev`

#### 3. Configure Environment Variables
```env
RESEND_API_KEY="re_your_api_key_here"
FROM_EMAIL="notifications@yourdomain.com"
```

### Email Behavior

**Duplicate Prevention:**
- 12-hour cooldown between notifications
- Prevents spam if cron runs multiple times
- Each threshold gets ONE email

**Multi-User Support:**
- Each user tracking a domain gets their own notification
- Notifications are independent per user
- No shared notification state

**Failure Handling:**
- Email failures are logged but don't stop processing
- Failed sends are tracked in statistics
- System continues even if email service is down

### Customizing Email Templates

Edit `src/email/email.service.ts` to customize:
- Email styling
- Email content
- Notification thresholds
- From name and subject lines

### Testing Emails Locally

```bash
# Trigger cron manually
curl -X GET "http://localhost:3000/domains/cron/fetch-whois" \
  -H "Authorization: Bearer your-cron-secret"

# Check logs for email sending status
```

For detailed email setup, see [Email Notifications Guide](./docs/EMAIL_NOTIFICATIONS.md).

## Cron Jobs

### Overview

The application uses Vercel Cron Jobs to automatically fetch WHOIS data and send notifications.

### Schedule Configuration

Edit `vercel.json` to change the schedule:

```json
{
  "crons": [
    {
      "path": "/domains/cron/fetch-whois",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**Current Schedule:** Daily at 9:00 AM UTC

**Schedule Format:** Cron expression (minute hour day month weekday)

Common schedules:
- `0 9 * * *` - Daily at 9 AM UTC
- `0 */12 * * *` - Every 12 hours
- `0 0 * * 1` - Weekly on Monday at midnight

### Security

The cron endpoint is protected by two methods:

1. **Vercel Cron Header** (automatic)
   - Header: `x-vercel-cron: 1`
   - Automatically added by Vercel

2. **Secret Token** (manual triggers)
   - Header: `Authorization: Bearer YOUR_CRON_SECRET`
   - Set in environment variables

### Manual Triggering

```bash
# Using cURL
curl -X GET "https://your-app.vercel.app/domains/cron/fetch-whois" \
  -H "Authorization: Bearer your-cron-secret"

# Using Postman
GET https://your-app.vercel.app/domains/cron/fetch-whois
Headers:
  Authorization: Bearer your-cron-secret
```

### Monitoring

**View Logs in Vercel:**
1. Go to your project dashboard
2. Click "Deployments"
3. Select latest deployment
4. Click "Functions" tab
5. View logs for `/domains/cron/fetch-whois`

**Cron Response includes:**
- Number of domains processed successfully
- Number of failures
- Error messages for failed domains
- Number of emails sent/failed

For more details, see [Cron Configuration Guide](./docs/CRON_CONFIGURATION.md)
**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com"
  }
}
```

### Domain Management Endpoints

#### Add Domain to Watch List
```http
POST /domains
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "domain_name": "example.com"
}
```

**Response:**
```json
{
  "message": "Domain added to your watch list",
  "domain": {
    "id": 1,
    "domain_name": "example.com",
    "last_checked_at": null
  }
}
```

#### Get All Tracked Domains (Paginated)
```http
GET /domains?page=1&limit=10
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
{
  "data": [
    {
      "domain_name": "example.com",
      "last_checked_at": "2025-12-23T10:00:00Z",
      "whois": {
        "registrar": "Example Registrar",
        "expiry_date": "2026-12-23T00:00:00Z",
        "creation_date": "2020-01-01T00:00:00Z",
        "updated_at": "2025-12-23T10:00:00Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

#### Get Specific Domain WHOIS Data
```http
GET /domains/example.com
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
{
  "domain": "example.com",
  "whois": {
    "registrar": "Example Registrar",
    "expiry_date": "2026-12-23T00:00:00Z",
    "creation_date": "2020-01-01T00:00:00Z",
    "raw_text": "Domain Name: EXAMPLE.COM\n...",
    "updated_at": "2025-12-23T10:00:00Z"
  },
  "last_checked_at": "2025-12-23T10:00:00Z"
}
```

#### Remove Domain from Watch List
```http
DELETE /domains/example.com
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
{
  "message": "Domain removed from your watch list"
}
```

### Cron Job Endpoint

#### Trigger WHOIS Fetch
```http
GET /domains/cron/fetch-whois
Authorization: Bearer <your-cron-secret>
```

**Response:**
```json
{
  "message": "WHOIS fetch completed. Success: 10, Failed: 0, Emails sent: 3, Emails failed: 0",
  "success": 10,
  "failed": 0,
  "errors": [],
  "emailsSent": 3,
  "emailsFailed": 0
}
```

### Error Responses

All endpoints follow consistent error response format:

```json
{
  "statusCode": 400,
  "message": "Error description here",
  "error": "Bad Request"
}
```

Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

-- Should show: users, domains, user_domains, whois_records
```

## Running the Application

### Development Mode

```bash
# Start with hot-reload
npm run start:dev

# Application will be available at http://localhost:3000
```

### Production Mode

```bash
# Build the application
npm run build

# Start production server
npm run start:prod
```

### Docker (Optional)

```bash
# Build Docker image
docker build -t whois-tracker .

# Run container
docker run -p 3000:3000 --env-file .env whois-trackerY KEY,
  domain_id INTEGER UNIQUE REFERENCES domains(id),
  registrar VARCHAR(255),
  expiry_date TIMESTAMP,
  creation_date TIMESTAMP,
  raw_text TEXT,
  updated_at TIMESTAMP,
  last_notification_sent_at TIMESTAMP
)
```

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 18.x or higher
- **npm**: Version 9.x or higher (or yarn)
- **PostgreSQL**: Access to a PostgreSQL database
- **Resend Account**: For email notifications (free tier available)
- **Git**: For version control

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Vercel Postgres database
- Resend account for email notifications

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd whois-tracker

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables

```env
# Database
POSTGRES_URL="your_vercel_postgres_connection_string"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRATION="7d"

# Cron Job Security
CRON_SECRET="your-cron-secret"

# Email (Resend)
RESEND_API_KEY="re_your_resend_api_key"
FROM_EMAIL="noreply@yourdomain.com"
```

See [Email Notifications Setup Guide](./docs/EMAIL_NOTIFICATIONS.md) for detailed email configuration.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## API Endpoints

### Authentication

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and get JWT token

### Domains

- `POST /domains` - Add a domain to watch list (requires auth)
- `GET /domains` - Get all tracked domains with pagination (requires auth)
- `GET /domains/:domain` - Get WHOIS info for a specific domain (requires auth)
- `DELETE /domains/:domain` - Remove domain from watch list (requires auth)

### Cron Jobs

- `GET /domains/cron/fetch-whois` - Trigger WHOIS fetch for all domains (protected by cron secret)

## Email Notifications

The system automatically sends email notifications:

- ⚠️ **30 days before expiry** - Medium priority alert
- 🔶 **7 days before expiry** - High priority alert
- 🚨 **1 day before expiry** - Critical priority alert
- 🔄 **When expiry date changes** - Immediate notification

For detailed setup instructions, see [Email Notifications Guide](./docs/EMAIL_NOTIFICATIONS.md).

## Database Migration

If you have an existing database, run this migration to add email notification support:

```bash
# Connect to your database and run:
psql $POSTGRES_URL -f migrations/001_add_email_notification_columns.sql
```

Or the new columns will be created automatically when the app initializes.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

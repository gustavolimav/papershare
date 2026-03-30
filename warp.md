# Papershare Project Context

## Project Overview

**Papershare** is a TypeScript-based Next.js application designed as a platform for document upload, sharing, and analysis. The project focuses on creating configurable sharing links and providing detailed insights into how recipients interact with shared content.

## Architecture & Technical Stack

### Core Technologies

- **Framework**: Next.js 14.2.14 (Full-stack React framework)
- **Language**: TypeScript 5.9.2 (Strict typing)
- **Database**: PostgreSQL 16.0 (with pure SQL queries, no ORM)
- **Runtime**: Node.js (ES Modules)
- **Authentication**: Cookie-based sessions with bcrypt password hashing
- **Migration System**: Custom TypeScript implementation using `postgres-migrations` library
- **Testing**: Jest with integration tests
- **Containerization**: Docker & Docker Compose for development
- **Package Manager**: npm

### Architecture Pattern

The project follows a **Clean Architecture** approach with clear separation of concerns:

```
📦 papershare/
├── 📂 pages/              # Next.js routing & API endpoints (Delivery Layer)
│   ├── 📂 api/v1/         # RESTful API routes
│   └── 📜 *.tsx           # React pages
├── 📂 models/             # Business logic & domain entities
├── 📂 infra/              # Infrastructure & external integrations
│   ├── 📂 migrations/     # SQL schema migrations
│   └── 📜 database.ts     # Database connection & queries
├── 📂 types/              # TypeScript type definitions
└── 📂 tests/              # Integration tests
```

## Database Schema

### Tables

1. **users** table:

   - `id` (UUID, Primary Key)
   - `username` (VARCHAR(30), Unique)
   - `email` (VARCHAR(254), Unique)
   - `password` (VARCHAR(60), bcrypt hashed)
   - `created_at`, `updated_at` (TIMESTAMPTZ with UTC)

2. **sessions** table:

   - `id` (UUID, Primary Key)
   - `token` (VARCHAR(96), Unique)
   - `user_id` (UUID, Foreign Key)
   - `expires_at` (TIMESTAMPTZ)
   - `created_at`, `updated_at` (TIMESTAMPTZ)

3. **migrations** table (auto-created):
   - Tracks applied database migrations
   - Uses `postgres-migrations` library format

## API Endpoints

### REST API Structure (all under `/api/v1/`)

#### User Management

- `POST /users` - Create new user
- `GET /users/[username]` - Get user by username
- `PATCH /users/[username]` - Update user

#### Authentication

- `POST /sessions` - Create session (login)

#### System Management

- `GET /status` - System health check with database metrics
- `GET /migrations` - List pending migrations
- `POST /migrations` - Run pending migrations

### API Response Format

- Success responses return relevant data with appropriate HTTP status codes
- Error responses use custom error classes with structured format:
  ```typescript
  {
    name: string;
    message: string;
    action: string;
    status: number;
  }
  ```

## Models & Business Logic

### Core Models

1. **User Model** (`models/user.ts`)

   - CRUD operations with validation
   - Email and username uniqueness validation
   - Password hashing integration
   - Portuguese error messages

2. **Authentication Model** (`models/authentication.ts`)

   - Login verification
   - Password comparison

3. **Session Model** (`models/session.ts`)

   - Session creation and management
   - Token generation
   - Expiration handling

4. **Password Model** (`models/password.ts`)

   - bcrypt hashing and verification

5. **Migrator Model** (`models/migrator.ts`)
   - Database migration management
   - Pure SQL migration execution
   - Migration status tracking

## Infrastructure Components

### Database Layer (`infra/database.ts`)

- PostgreSQL connection management
- Query execution with proper error handling
- Environment-based configuration
- SSL support for production

### Error Handling (`infra/errors.ts`)

- Custom error classes:
  - `ValidationError` (400)
  - `NotFoundError` (404)
  - `UnathorizedError` (401)
  - `MethodNotAllowedError` (405)
  - `InternalServerError` (500)
  - `ServiceError` (500)

### Controller (`infra/controller.ts`)

- Centralized error handling for API routes
- HTTP method validation
- Error response formatting

## Migration System

The project uses a **custom pure SQL migration system**:

- Replaces node-pg-migrate with `postgres-migrations`
- Migration files are pure SQL (no JavaScript DSL)
- Files follow naming convention: `###-description.sql`
- Automatic migration tracking in database
- TypeScript migration runner with environment loading

### Current Migrations

1. `001-create-users.sql` - Creates users table
2. `002-update-users.sql` - Updates timestamp defaults and password length
3. `003-create-sessions.sql` - Creates sessions table

## Testing Strategy

### Test Structure

- **Integration Tests**: Located in `tests/integration/`
- **Test Orchestrator** (`tests/orchestrator.ts`): Provides utilities for:
  - Database cleanup
  - Service availability checking
  - User creation with faker data
  - Migration execution

### Test Coverage

- API endpoint testing for all routes
- HTTP method validation
- Error handling verification
- Database integration testing

## Development Environment

### Docker Setup

- PostgreSQL 16.0 in Alpine container
- Container name: `papershare-dev-db`
- Development environment variables in `.env.development`

### Scripts & Commands

```bash
# Development
npm run dev                    # Start dev server with migrations
npm run services:up           # Start Docker services
npm run migrations:up         # Run pending migrations

# Testing
npm test                      # Run all tests
npm run test:watch           # Watch mode testing

# Code Quality
npm run sf                   # Format code and lint
npm run lint:prettier:fix    # Fix formatting
npm run lint:eslint:check   # Run ESLint
```

### Environment Configuration

- Development: `.env.development`
- PostgreSQL connection via environment variables
- SSL disabled in development, enabled in production

## Code Quality & Standards

### TypeScript Configuration

- Strict mode enabled
- ES Modules throughout
- Comprehensive type definitions in `types/index.ts`

### Code Style

- Prettier for formatting
- ESLint with Next.js configuration
- Husky for git hooks
- Conventional commits with commitizen

### Error Handling Philosophy

- Comprehensive error types with user-friendly messages
- Portuguese language for user-facing messages
- Structured error responses with actionable guidance
- Proper HTTP status codes

## Key Features & Patterns

### Security

- Password hashing with bcrypt
- Session-based authentication
- Input validation at model layer
- SQL injection prevention with parameterized queries

### Database Design

- UUID primary keys for all entities
- Timestamp columns with UTC timezone
- Proper indexing on unique fields
- Foreign key relationships

### API Design

- RESTful conventions
- Versioned API (`/api/v1/`)
- Consistent response formats
- Proper HTTP status codes
- Error handling middleware

## Future Considerations

Based on the README content, planned features include:

- Advanced link permissions (password protection, expiration, download blocking)
- Analytics dashboard with insights (views, time per page, geolocation)
- Integrated electronic signatures
- AI-powered insights (automatic summaries, improvement suggestions)

## Development Notes

### Recent Changes

- Migrated from node-pg-migrate to postgres-migrations for pure SQL migrations
- Full TypeScript implementation completed
- All migration files converted to pure SQL format
- Project renamed from "linkpaper" to "papershare"

### Code Conventions

- Models export default objects implementing their respective interfaces
- Database queries use parameterized statements
- Error messages are in Portuguese for user-facing content
- File structure follows Next.js conventions with clear separation of concerns

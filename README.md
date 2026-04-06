# README.md - DataModeler.v1

## Project Overview

**DataModeler.v1** is a web-based DBML (Database Markup Language) data modeling tool with real-time collaboration, visual ER diagram editing, and SQL migration generation.

### Tech Stack
- **Backend**: .NET 8 (ASP.NET Core)
- **Frontend**: Next.js 14 + React + TypeScript
- **Database**: PostgreSQL 15
- **Real-time**: WebSocket + yjs (CRDT)
- **Diagrams**: ReactFlow + Cytoscape.js (open-source)
- **Deployment**: Docker Compose (self-hosted on-premises)

---

## Directory Structure

```
DataModeler.v1/
├── backend/                    # .NET 8 API
│   ├── Controllers/            # API endpoints
│   ├── Services/               # Business logic
│   ├── Models/                 # Entity classes
│   ├── Data/                   # Entity Framework DbContext & migrations
│   ├── DTOs/                   # Data transfer objects
│   ├── Hubs/                   # WebSocket hubs
│   ├── appsettings.json        # Configuration
│   ├── DataModeler.API.csproj  # Project file
│   └── Program.cs              # Entry point
│
├── frontend/                   # Next.js React App
│   ├── src/
│   │   ├── app/                # Next.js app directory
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # API services
│   │   ├── lib/                # Utilities and helpers
│   │   └── types/              # TypeScript types
│   ├── public/                 # Static assets
│   ├── package.json            # Dependencies
│   ├── next.config.js          # Next.js configuration
│   └── tsconfig.json           # TypeScript configuration
│
├── database/
│   └── schema.sql              # PostgreSQL schema
│
├── docker/
│   ├── Dockerfile.backend      # Backend container
│   ├── Dockerfile.frontend     # Frontend container
│   └── docker-compose.yml      # Multi-service orchestration
│
├── PROJECT_VERSION_CONFIG.md   # Release history & versioning
├── .env.example                # Environment variables template
├── .env.local                  # Local environment variables (DO NOT commit)
└── .gitignore                  # Git ignore rules
```

---

## Quick Start (Phase 1 Only)

### Prerequisites
- Docker & Docker Compose
- .NET 8 SDK (optional, for local development)
- Node.js 20+ (optional, for local development)
- PostgreSQL 15 (optional, Docker handles this)

### Setup & Run

1. **Clone or navigate to the project**
   ```bash
   cd c:\Users\celik\DataModeler.v1
   ```

2. **Start Docker Compose**
   ```bash
   docker-compose -f docker/docker-compose.yml up -d
   ```

3. **Wait for services to start**
   - PostgreSQL: `localhost:5432`
   - Backend API: `http://localhost:5000`
   - Frontend: `http://localhost:3000`

4. **Verify health**
   ```bash
   curl http://localhost:5000/health
   ```

5. **Access Application**
   - Frontend: http://localhost:3000
   - API Swagger Docs: http://localhost:5000/swagger

---

## Phase 1 Status: ✅ Infrastructure Setup Complete

### Completed
- ✅ PostgreSQL schema with all core tables
- ✅ .NET 8 backend project structure
- ✅ Entity Framework Core models
- ✅ Next.js frontend scaffolding
- ✅ Docker setup (Dockerfile + docker-compose)
- ✅ Configuration files (.env, appsettings.json)
- ✅ Health check endpoint
- ✅ Basic API controllers (Health, Models)
- ✅ Project version tracking config

### Next Phase (Phase 2)
- Authentication & Authorization
- LDAP & Azure AD integration
- JWT token management
- Super admin setup

---

## Configuration

### Environment Variables (`.env.local`)

```bash
DB_PASSWORD=secure_password_123
JWT_SECRET=your-256-bit-secret-key-minimum-32-characters-required-change-this-in-production
JWT_ISSUER=https://datamodeler.local
JWT_AUDIENCE=datamodeler-api
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
API_URL=http://localhost:5000
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## API Endpoints (Phase 1)

### Health Check
- `GET /health` — System health check and database connectivity

### Models (Protected)
- `GET /api/models` — List all models for current user
- `GET /api/models/{id}` — Get specific model
- `POST /api/models` — Create new model
- More endpoints come in Phase 4+

---

## Default Credentials (Initial Setup Only)

- **Username**: Administrator
- **Password**: ktdm123456

⚠️ **MUST be changed on first production login!**

---

## Development Notes

### Backend (.NET 8)
- Entity Framework Core for data access
- PostgreSQL provider configured
- JWT authentication ready
- CORS configured for frontend
- Swagger documentation available

### Frontend (Next.js 14)
- React 18 with TypeScript
- TailwindCSS for styling
- API client with axios
- Ready for phase 4 components

### Database
- PostgreSQL 15 Alpine
- All tables created on first run via schema.sql
- Triggers for auto-updating timestamps
- Indexes for performance optimization

---

## Docker Volumes & Data Persistence

PostgreSQL data is stored in Docker volume `postgres_data` and persists across container restarts.

---

## Troubleshooting

### Docker containers won't start
```bash
docker-compose -f docker/docker-compose.yml logs -f
```

### PostgreSQL connection failed
Verify container is running:
```bash
docker ps
```

### Frontend API errors
Check backend health: `curl http://localhost:5000/health`

---

## Next Steps

1. Verify Docker containers are running: `docker ps`
2. Check API health: http://localhost:5000/health
3. Access frontend: http://localhost:3000
4. Review `PROJECT_VERSION_CONFIG.md` for roadmap
5. Proceed to Phase 2 (Authentication) when ready

---

## Links

- **DBML Documentation**: https://www.dbml.org/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/15/
- **.NET 8**: https://learn.microsoft.com/dotnet/core/whats-new/dotnet-8
- **Next.js Docs**: https://nextjs.org/docs
- **ReactFlow**: https://reactflow.dev/
- **yjs**: https://github.com/yjs/yjs

---

## Status: 🟡 Development in Progress

**Current Phase**: Phase 1 - Infrastructure Setup ✅ COMPLETE  
**Next Phase**: Phase 2 - Authentication & Authorization  
**Target Release**: v1.0.0 (August 17, 2026)

For detailed version history, see [PROJECT_VERSION_CONFIG.md](./PROJECT_VERSION_CONFIG.md)

# DataModeler.v1

DataModeler.v1 is a governed data modeling platform with collaborative model editing, workflow-based change requests, and role-scoped approval inboxes.

This README is prepared for repository handoff so the project can be cloned to another machine and continued without context loss.

## 1) What the system does
- Model creation and management under OU-based logical groups
- Collaborative modeling and versioning
- Change request lifecycle with workflow stage routing
- Approval inbox for Pending_Business and Pending_Architect stages
- Approval/reject actions with audit trail and workflow snapshot history

## 2) High-level architecture
- Frontend: Next.js 14 + React + TypeScript
- Backend: ASP.NET Core (.NET 8)
- Database: PostgreSQL 15
- Cache: Redis 7
- Orchestration: Docker Compose

Related detail docs:
- docs/COMPONENT_INVENTORY.md
- docs/DEVELOPMENT_CONTEXT.md

## 3) Repository structure

```text
DataModeler.v1/
|- backend/                       # .NET API, services, DTOs, EF Core
|- frontend/                      # Next.js app
|- database/                      # schema and logical backup artifacts
|  |- schema.sql
|  \- logical-backup/
|- scripts/                       # operational scripts (backup/restore/test)
|- docker-compose.yml             # production-like local compose
|- docker-compose.dev.yml         # development compose
|- PROJECT_VERSION_CONFIG.md      # version and milestone history
|- PHASE_*_VERIFICATION.md        # incremental delivery verification notes
\- docs/                          # persistent technical context
```

## 4) Runtime components and purpose

### Frontend (`frontend/`)
Purpose:
- User interface for models, designer, change requests, admin
- Approval inbox visualization and interactions

Integration:
- Uses `NEXT_PUBLIC_API_URL`
- Sends bearer token to backend APIs

### Backend (`backend/`)
Purpose:
- Domain logic and REST APIs
- Role, OU, workflow, and approval enforcement

Integration:
- Connects PostgreSQL using `ConnectionStrings__DefaultConnection`
- Connects Redis using `Redis__*` settings

### PostgreSQL (`postgres` service)
Purpose:
- Persistent storage for users, models, versions, change requests, audit logs

Integration:
- Backend EF Core context and SQL operations
- Logical backup/export with `pg_dump`

### Redis (`redis` service)
Purpose:
- Cache support for backend

Integration:
- Configured by compose and backend settings

## 5) Local startup

### Prerequisites
- Docker + Docker Compose
- Optional local SDKs if you run outside containers:
  - .NET 8 SDK
  - Node.js 18+

### Production-like local stack
```powershell
docker compose up -d --build
docker compose ps
```

### Development stack
```powershell
docker compose -f docker-compose.dev.yml up -d --build
docker compose -f docker-compose.dev.yml ps
```

### Health checks
- Backend: http://localhost:8080/health
- Frontend: http://localhost:3000

## 6) Environment configuration
Use `.env.example` as baseline and create your own `.env` or environment-specific overrides.

Main variables:
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`
- `REDIS_PASSWORD`, `REDIS_PORT`
- `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`
- `BACKEND_PORT`, `FRONTEND_PORT`
- `NEXT_PUBLIC_API_URL`
- `ASPNETCORE_ENVIRONMENT`

Never commit real secrets.

## 7) Authorization and workflow policy snapshot
Current policy baseline:
- Developer and domain architect roles are OU-scoped by default
- Data architect is globally scoped across OUs
- Stage actions (approve/reject) are validated against workflow stage + effective model-scoped role

Recent alignment notes are in:
- docs/DEVELOPMENT_CONTEXT.md

## 8) Database backup and restore

### A) Physical/custom backup (existing)
- Backup: `scripts/db-backup.ps1`
- Restore: `scripts/db-restore.ps1`

### B) Logical backup for repository portability (new)
- Export script: `scripts/db-export-logical.ps1`
- Restore script: `scripts/db-restore-logical.ps1`
- Output folder: `database/logical-backup/`

Current committed logical artifacts:
- `database/logical-backup/latest-schema.sql`
- `database/logical-backup/latest-data.sql`
- Timestamped schema/data SQL pairs

Repository safety note:
- Sensitive credential-like values in logical data snapshots should be redacted before push.
- If you need exact production secrets, inject them post-restore through secure env/config channels.

Export logical backup:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\db-export-logical.ps1 -UpdateLatestAliases -UpdateRootSchema
```

Restore logical backup:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\db-restore-logical.ps1 -Force
```

## 9) Move project to another machine
1. Clone repository.
2. Prepare env values from `.env.example`.
3. Start stack with compose.
4. If needed, restore DB using logical backup scripts.
5. Verify health endpoints.
6. Open frontend and log in with environment-appropriate credentials.

## 10) GitHub update checklist before push
1. Ensure working tree contains intended files only.
2. Ensure no real credentials in tracked files.
3. Ensure `database/logical-backup/latest-*.sql` reflects current intended DB state.
4. Ensure README and docs reflect latest behavior.
5. Run smoke checks:
   - `docker compose ps`
   - frontend loads
   - backend health endpoint returns success

## 11) Key files for ongoing development
- Backend workflow/auth:
  - backend/Services/ChangeRequestService.cs
  - backend/Controllers/ModelsController.cs
  - backend/Controllers/ChangeRequestsController.cs
- Frontend approval UI:
  - frontend/src/app/change-requests/page.tsx
  - frontend/src/components/admin/AppShell.tsx
  - frontend/src/components/change-requests/WorkflowExplorer.tsx
- Context docs:
  - docs/DEVELOPMENT_CONTEXT.md
  - docs/COMPONENT_INVENTORY.md

## 12) Version and phase history
See:
- PROJECT_VERSION_CONFIG.md
- PHASE_1_VERIFICATION.md ... PHASE_11_VERIFICATION.md

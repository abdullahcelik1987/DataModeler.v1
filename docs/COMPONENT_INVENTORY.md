# Component Inventory and Integration Map

## Runtime components

## 1) Frontend (Next.js 14, React, TypeScript)
- Path: frontend/
- Purpose:
  - End-user interface for models, designer, approvals, admin areas
  - Authenticated API access with bearer token
  - Workflow visualization and inbox interaction
- Integration:
  - Calls backend REST API at NEXT_PUBLIC_API_URL
  - Uses AppShell for navigation and notification badges

## 2) Backend API (.NET 8 ASP.NET Core)
- Path: backend/
- Purpose:
  - Business logic, auth/authorization, workflow transitions, model operations
  - Exposes REST APIs under /api
  - Health endpoint for orchestration checks
- Integration:
  - PostgreSQL via EF Core DbContext
  - Redis for cache/session-like features
  - Docker health checks and compose networking

## 3) PostgreSQL 15
- Path references: database/, backups/, scripts/
- Purpose:
  - Primary persistent data store for users, models, versions, approvals, logs
- Integration:
  - Backend connection string via compose environment variables
  - Logical backups generated with pg_dump

## 4) Redis 7
- Purpose:
  - Caching/performance support for backend
- Integration:
  - Backend Redis config in compose and app settings

## 5) Optional dev tools
- pgAdmin in docker-compose.dev.yml
- Purpose: local DB inspection in development

## Domain component groups

## Authentication and authorization
- Backend controllers/services for token auth and role resolution
- OU extraction from LDAP distinguished name
- Model-scoped effective role resolution

## Model lifecycle
- Models, versions, collaborators
- DBML snapshots and SQL generation
- Ownership and collaborator permissions

## Change request lifecycle
- Workflow stages stored as snapshot JSON in each CR
- Pending_Business and Pending_Architect transitions
- Approve/reject action logs and inbox filters

## Workflow visualization
- Frontend workflow explorer based on stage snapshot and logs
- Reject path rendering and current stage highlighting

## Integration contracts
- Frontend -> Backend:
  - JSON over HTTP
  - Bearer token in Authorization header
- Backend -> PostgreSQL:
  - EF Core + SQL
- Backend -> Redis:
  - Cache integration

## Deployment components
- docker-compose.yml: production-like local stack
- docker-compose.dev.yml: development convenience stack
- backend/Dockerfile and frontend/Dockerfile: image builds

## Backup and restore components
- scripts/db-backup.ps1 and scripts/db-restore.ps1: custom-format backup/restore
- scripts/db-export-logical.ps1 and scripts/db-restore-logical.ps1: logical schema/data backup/restore
- database/logical-backup/latest-schema.sql + latest-data.sql: portable logical restore pair

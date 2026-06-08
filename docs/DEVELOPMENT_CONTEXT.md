# Development Context (Up To Date)

## What this file is
This document captures the practical development context required to continue the project on another machine with minimal knowledge loss.

## Current product state
- Product: DataModeler.v1
- Architecture: Next.js frontend + .NET 8 backend + PostgreSQL + Redis
- Deployment target: Docker Compose (development and production-like compose files)
- Core capability set currently in use:
  - Model management and grouping by Organization Unit (OU)
  - Change Request lifecycle with workflow stages
  - Approval inbox and role-scoped actions
  - Workflow visualization and approval logs

## Recent high-impact changes (latest sessions)
1. Workflow authorization hardening
- Stage action checks (approve/reject) use model-scoped effective role, not only raw app role.
- Domain architect is OU-scoped by default.
- Data architect is global across OUs.
- OU policy was aligned in both backend ChangeRequestService and ModelsController.

2. Pending inbox UX and navigation badges
- Pending approvals redesigned as inbox view.
- App shell nav badge now updates even outside Change Requests screen by internal polling.

3. Workflow explorer behavior fixes
- Rejected flows now render with explicit reject route behavior.
- Snapshot-driven stage transitions (approve/reject target stage indexes) are respected.

4. Change Requests tabs
- Tab order switched to put Onay Gelen Kutusu first.
- Default tab on page open set to pending inbox (when user has access).

## Role/OU policy baseline
- Developer: only effective within own OU by default.
- Domain architect/business domain architect: only effective within own OU by default.
- Multiple domain architects can exist in the same OU.
- Data architect: global across all OUs and models.
- Super admin: unrestricted.

## Key backend files to review first
- backend/Services/ChangeRequestService.cs
- backend/Controllers/ChangeRequestsController.cs
- backend/Controllers/ModelsController.cs
- backend/Models/WorkflowTemplate.cs
- backend/DTOs/ChangeRequestDtos.cs

## Key frontend files to review first
- frontend/src/app/change-requests/page.tsx
- frontend/src/components/admin/AppShell.tsx
- frontend/src/components/change-requests/WorkflowExplorer.tsx
- frontend/src/types/changeRequests.ts

## Database context
- Primary compose service name: postgres
- Default DB: datamodeler
- Default user: postgres
- Logical backup artifacts are maintained under database/logical-backup.

## Repeatable verification checklist (after clone on a new machine)
1. Start stack:
- docker compose up -d --build

2. Health checks:
- Backend: http://localhost:8080/health
- Frontend: http://localhost:3000

3. Role/inbox sanity checks:
- Domain architect in OU1 must not see OU2 Pending_Business requests.
- Data architect must not act on Pending_Business stage.
- Data architect must act on Pending_Architect stage.

4. Optional DB refresh from logical backup:
- scripts/db-restore-logical.ps1 -Force

## Notes for maintainers
- If you update workflow or role resolution logic, keep ModelsController and ChangeRequestService behavior aligned.
- If you change nav badges, verify behavior from non-Change-Requests screens.
- Keep database/logical-backup/latest-schema.sql and latest-data.sql refreshed before major handoffs.

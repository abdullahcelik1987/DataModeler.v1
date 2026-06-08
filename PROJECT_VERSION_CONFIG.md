# DataModeler.v1 - Project Version & Release History

## Current Version: 0.8.0-PHASE-8

**Release Date**: January 2025  
**Status**: Visual Enhancements & Scale (Complete)

---

## Version History & Milestones

### V0.1.0 - Phase 1: Project Setup & Core Infrastructure (TARGET: April 6, 2026)
- **Objective**: Initialize project structure, configure databases, and establish authentication foundation
- **Completed**:
  - ✅ Backend: .NET 8 ASP.NET Core Web API scaffolding with project structure
  - ✅ Frontend: Directory structure ready for Next.js initialization
  - ✅ Database: PostgreSQL schema with all core tables (users, models, versions, audit logs, settings)
  - ✅ Configuration: appsettings.json, environment variables, .env templates
  - ✅ Docker: Dockerfile for backend & frontend, docker-compose.yml for local dev
  
- **In Progress**:
  - Backend controllers and services scaffolding
  - Frontend Next.js + React setup
  - Entity Framework Core model classes

- **Next Steps**:
  - Verify Docker containers build and run successfully
  - Test PostgreSQL schema creation
  - Implement basic API health check endpoint

---

### V0.2.0 - Phase 2: Authentication & Authorization (TARGET: April 20, 2026)
- **Objective**: Implement AD integration, role-based access control, and super admin setup
- **Planned Features**:
  - LDAP authentication for on-premises Active Directory
  - Azure AD / Entra ID support
  - JWT token management with refresh tokens
  - Role-based access control (RBAC) middleware
  - Super admin "Administrator" user initialization
  - Encrypted password storage (bcrypt)

---

### V0.3.0 - Phase 3: Admin Panel (TARGET: April 27, 2026)
- **Objective**: Admin interface for managing AD settings, Azure DevOps, users/roles, and audit logs
- **Planned Features**:
  - Admin-only dashboard and navigation
  - AD settings management (LDAP/Azure AD configuration UI)
  - Azure DevOps connection configuration
  - User & role assignment interface
  - Audit logs viewer with filtering and export
  - Repository connection management

---

### V0.4.0 - Phase 4: Core Modeling Features (TARGET: May 18, 2026)
- **Objective**: Dual editor with bidirectional sync between DBML code and ER diagram
- **Planned Features**:
  - DBML parser service (.NET)
  - Monaco Editor for DBML text editing (Frontend)
  - ReactFlow-based ER diagram viewer
  - Bidirectional sync: text ↔ visual
  - Change highlighting in both editors
  - Real-time syntax validation

---

### V0.5.0 - Phase 5: Real-time Collaboration (TARGET: June 1, 2026)
- **Objective**: Multi-user simultaneous editing with CRDT conflict-free merging
- **Planned Features**:
  - WebSocket server for real-time sync
  - yjs CRDT integration for text and visual sync
  - Presence awareness (show active editors)
  - User cursor positions and avatar colors
  - Automatic conflict resolution (no manual merge dialogs)

---

### V0.6.0 - Phase 6: Visual Enhancements & Scale (TARGET: June 15, 2026)
- **Objective**: Support large diagrams (1000+ tables) with zoom, pan, focus features
- **Planned Features**:
  - Zoom & pan controls (keyboard + mouse)
  - Focus/spotlight mode (highlight connected entities)
  - Virtual rendering for performance optimization
  - Dynamic clustering for zoomed-out view
  - Search & filter functionality
  - Minimap navigation

---

### V0.7.0 - Phase 7: Visual Relationship Highlighting (TARGET: June 22, 2026)
- **Objective**: Enhanced visual feedback for relationships and table details
- **Planned Features**:
  - Relationship edge highlighting with glow effect
  - Table interaction (single/double click highlighting)
  - Table details panel (sidebar or modal)
  - Column display in ER diagram (name, type, constraints)
  - Relationship cardinality display (crow's foot notation)

---

### V0.7.0 - Phase 7: SQL Generation & Migration (TARGET: June 22, 2026)
- **Objective**: Generate migration SQL scripts based on model changes
- **Status**: ✅ COMPLETE
- **Completed Features**:
  - ✅ Change detection service (DBML comparison)
  - ✅ SQL migration plan generator with risk assessment
  - ✅ Multi-dialect SQL generators (PostgreSQL, MySQL, SQL Server, Oracle)
  - ✅ Statement ordering and dependency resolver
  - ✅ Circular dependency detection
  - ✅ Data loss warning system
  - ✅ Frontend migration preview UI
  - ✅ React hook for migration management
  - ✅ TypeScript type definitions
  - ✅ Rollback script generation

- **Next Steps**:
  - Frontend integration with models editor
  - Migration execution engine
  - Scheduled migration support

---

### V0.9.0 - Phase 9: Versioning & Azure DevOps Integration (TARGET: July 20, 2026)
- **Objective**: Git-like versioning with automatic Azure DevOps commits
- **Planned Features**:
  - Model version snapshots and history
  - Branching support (main + feature branches)
  - Rollback to previous versions
  - Version comparison (diff view)
  - Azure DevOps Server integration for auto-commits
  - Work item linking for model changes

---

### V0.10.0 - Phase 10: Admin Panel Polish (TARGET: July 27, 2026)
- **Objective**: Complete admin management features and UI refinement
- **Planned Features**:
  - Admin dashboard with statistics
  - Bulk operations (assign groups, change roles, export logs)
  - Settings validation and test connections
  - Compliance reports and log exports (CSV/PDF)

---

### V0.11.0 - Phase 11: Docker Deployment (TARGET: August 3, 2026)
- **Objective**: Production-ready Docker deployment with documentation
- **Planned Features**:
  - Finalized Docker configuration and health checks
  - Deployment documentation (DEPLOYMENT.md)
  - Architecture documentation (ARCHITECTURE.md)
  - API documentation auto-generation (Swagger)
  - Backup & recovery procedures
  - Monitoring & logging setup

---

### V1.0.0 - Phase 12: Testing & Release (TARGET: August 17, 2026)
- **Objective**: Comprehensive testing, bug fixes, and production release
- **Planned Features**:
  - Unit tests (XUnit, Jest)
  - Integration tests (end-to-end workflows)
  - Performance tests (1000 entity models, concurrent users)
  - Browser compatibility testing
  - Security audit
  - Bug fixes and polish

---

## Key Architecture Decisions (As of March 30, 2026)

### Technology Stack
- **Backend**: .NET 8 ASP.NET Core (C#)
- **Frontend**: Next.js 14 + React + TypeScript
- **Database**: PostgreSQL 15
- **Real-time**: WebSocket + yjs (CRDT)
- **Diagrams**: ReactFlow + Cytoscape.js (open-source)
- **Authentication**: JWT + LDAP + Azure AD integration
- **DevOps**: Azure DevOps Server integration
- **Deployment**: Docker Compose (self-hosted on-premises)

### Database Strategy
- Store DBML content as text snapshots (Git-like versioning)
- Separate model versions and change sets
- Audit logs for compliance and debugging
- Encrypted storage for sensitive settings (AD configs, DevOps PAT)

### Real-time Collaboration
- CRDT approach (yjs) for automatic conflict-free merging
- No manual merge resolution needed
- WebSocket sub-100ms latency target
- Presence awareness via editing sessions

### SQL Generation
- Strategy pattern for database dialects
- Supported: PostgreSQL, SQL Server, MySQL, Oracle
- Extensible for future database types

### Open-Source Commitment
- All libraries are open-source (no commercial licenses)
- ReactFlow for diagram UI (MIT license)
- Cytoscape.js for large graph handling (MIT license)
- yjs for real-time sync (MIT license)
- .NET 8 and PostgreSQL (OSS)

---

## Known Issues & Limitations (V0.1.0)

1. **Schema File**: Contains raw DBML2 implementation to be completed in Phase 2
2. **Docker Build**: Backend and frontend Dockerfiles require source code in place
3. **Database Connection**: Requires PostgreSQL server running (locally or via Docker)
4. **UI Templates**: Placeholder only; full UI implementation in Phase 4 onwards

---

## Configuration & Secrets

### Environment Variables (In `.env.local`)

---

## Current Operational Snapshot (June 2026)

### Effective Runtime Baseline
- Frontend and backend run via Docker Compose with healthy service checks.
- Approval inbox and workflow authorization logic are actively used in production-like flow.
- OU-based role scoping is enforced for developer/domain architect defaults.
- Data architect role is globally scoped across OUs.

### Recently Verified Behaviors
- Pending inbox visibility is role + OU scoped.
- Approve/reject actions are stage-sensitive and bound to effective role.
- Change Requests UI defaults to pending inbox tab and tab order prioritizes inbox.
- Shell-level change request badge is visible across module pages.

### Handoff Artifacts Added
- docs/DEVELOPMENT_CONTEXT.md
- docs/COMPONENT_INVENTORY.md
- scripts/db-export-logical.ps1
- scripts/db-restore-logical.ps1
- database/logical-backup/latest-schema.sql
- database/logical-backup/latest-data.sql

### Recommended Next Milestone Focus
- Harden test automation for role/OU authorization matrix.
- Add CI checks for workflow stage authorization regressions.
- Keep logical backup artifacts refreshed before each major handoff.
- `DB_PASSWORD` — PostgreSQL user password
- `JWT_SECRET` — 256-bit secret for JWT signing (change in production!)
- `JWT_ISSUER` — JWT token issuer (default: https://datamodeler.local)
- `JWT_AUDIENCE` — JWT audience claim
- `CORS_ALLOWED_ORIGINS` — Comma-separated CORS whitelist
- `API_URL` — Backend API endpoint for frontend
- `NEXT_PUBLIC_API_URL` — Public API URL for client-side calls

### Super Admin Credentials (Initial Only)
- **Username**: Administrator
- **Password**: ktdm123456 (bcrypt hash stored in DB seed)
- **Note**: Must be changed on first production login!

---

## Testing Checklist

- [ ] Docker containers build without errors
- [ ] PostgreSQL schema creates successfully
- [ ] .NET API starts on port 5000
- [ ] Next.js frontend loads on port 3000
- [ ] API health check endpoint responds
- [ ] JWT token generation and validation works
- [ ] Super admin user can login
- [ ] Audit logs table records events

---

## Links & References

- **DBML Official**: https://www.dbml.org/
- **React Flow**: https://reactflow.dev/
- **Cytoscape.js**: https://js.cytoscape.org/
- **yjs Documentation**: https://github.com/yjs/yjs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/15/
- **.NET 8 Docs**: https://learn.microsoft.com/dotnet/core/whats-new/dotnet-8

---

## Contact & Support

For questions or to report issues on Phase 1 setup, refer to the deployment documentation or contact the development team.

**Last Updated**: March 30, 2026  
**Project Status**: 🟡 In Progress (Phase 1 Infrastructure Setup)

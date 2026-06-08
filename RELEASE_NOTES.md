# Release Notes

## v0.11.1-handoff (2026-06-08)

This release prepares the repository for handoff and cross-machine continuation.

### Highlights
- Added comprehensive project handoff documentation.
- Added component inventory and development context guides.
- Added logical database backup and restore automation scripts.
- Added restorable logical SQL backup artifacts (schema + insert data).
- Updated environment template and repository hygiene rules.
- Synced current workflow authorization and UI behavior updates.

### Added
- docs/DEVELOPMENT_CONTEXT.md
- docs/COMPONENT_INVENTORY.md
- scripts/db-export-logical.ps1
- scripts/db-restore-logical.ps1
- database/logical-backup/latest-schema.sql
- database/logical-backup/latest-data.sql

### Updated
- README.md
- PROJECT_VERSION_CONFIG.md
- .env.example
- .gitignore
- database/schema.sql

### Behavior Updates Included
- OU-scoped role enforcement for developer/domain architect defaults.
- Data architect global scope alignment.
- Change Requests tab order and default tab behavior updates.
- Global nav badge visibility for pending approval inbox.

### Database Portability
- Logical backups are restorable using SQL schema + SQL inserts.
- Sensitive credential-like values in logical data snapshots are redacted before push.

### Notes
- This file is intentionally short and intended for manual commit workflows.

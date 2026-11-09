# Spec Delta

## REMOVED Requirements

### Requirement: Observability sources

**Reason**: The specified tgcloud metrics, runtime logs, and dependency-alert sources are not configured as an operational system.
**Migration**: Restore with an observability change that identifies actual providers and verifies access to each signal.

### Requirement: Backup assets

**Reason**: The specified private-draft, IPFS, and database backup assets do not match the current checkout.
**Migration**: Define backups only for data stores and deployment targets that are actually adopted.

### Requirement: Disaster recovery flow

**Reason**: Target-specific recovery paths and exercises are not established.
**Migration**: Restore after production targets and recovery procedures are implemented and tested.

### Requirement: Transport and domain security

**Reason**: HTTPS, HSTS, and DNSSEC are controlled by hosting and DNS configuration not present in the repository.
**Migration**: Document verified provider settings when a production domain and hosting target are selected.

### Requirement: Key rotation schedule

**Reason**: The listed deployment credentials and rotation schedules are not connected to the current application.
**Migration**: Add a rotation procedure for each credential only when the corresponding integration is in use.

### Requirement: Maintenance cadence

**Reason**: The prescribed recurring audits and exercises have no configured schedule or operational evidence.
**Migration**: Add a maintenance calendar after the relevant checks and ownership are established.

### Requirement: Incident handling entry points

**Reason**: The specified rollback commands and incident data sources depend on absent production services.
**Migration**: Restore with concrete, tested runbook steps when those services exist.

### Requirement: Known operational gaps

**Reason**: This requirement is a status-tracking mechanism rather than a user-visible capability contract.
**Migration**: Track operational gaps in an operations backlog or runbook, not as normative product behavior.

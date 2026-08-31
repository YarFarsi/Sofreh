# Security

Report vulnerabilities privately to the organization that maintains your deployment.

Do not log passwords, session cookies, or meal-ticket tokens.

Default demo passwords are for isolated labs only. Change `SESSION_SECRET` and database passwords before any production use.

Phase 1 authentication is local passwords. Enterprise SSO can be added later behind `AuthAdapter` without making it required.

# Detailed API Security Findings

### [API-001] index.js - Low Risk
CORS policy uses wildcard (*) for origins.

### [API-002] index.js - Low Risk
Missing global rate limiting on express routes.

### [API-003] index.js - Low Risk
Express "X-Powered-By" header is not disabled.

### [API-004] routes/auth.js - Low Risk
JWT signature secret is loaded from env without a fallback complexity check.

### [API-005] routes/user.js - Low Risk
Endpoint does not explicitly enforce HTTP methods (e.g., accepts both GET and POST).

### [API-006] package.json - Low Risk
Express version is slightly outdated (non-critical CVE).

### [API-007] index.js - Low Risk
Missing Helmet.js middleware for standard security headers.

### [API-008] routes/progress.js - Low Risk
Query parameters are not strictly type-cast before DB insertion.

### [API-009] routes/auth.js - Low Risk
Password hashing work factor (salt rounds) is low for modern CPUs.

### [API-010] index.js - Low Risk
Debug mode or verbose logging enabled in production config.

### [API-011] routes/dashboard.js - Low Risk
Missing explicit cache-control headers on sensitive data responses.

### [API-012] routes/user.js - Low Risk
User enumeration possible via password reset timing.

### [API-013] package.json - Low Risk
Dependency has a low-severity regex denial of service (ReDoS) vulnerability.

### [API-014] index.js - Low Risk
No request size payload limit configured on body-parser.


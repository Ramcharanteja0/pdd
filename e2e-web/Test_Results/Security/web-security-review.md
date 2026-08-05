# Detailed Web Security Findings

### [WEB-001] AuthContext.jsx - Low Risk
PII stored in localStorage instead of sessionStorage or secure cookies.

### [WEB-002] AuthContext.jsx - Low Risk
No explicit session TTL enforced on the client side.

### [WEB-003] index.html - Low Risk
Missing Content-Security-Policy (CSP) meta tag.

### [WEB-004] index.html - Low Risk
Missing X-Frame-Options to prevent Clickjacking.

### [WEB-005] App.jsx - Low Risk
Hardcoded base URLs found in API calls instead of env variables.

### [WEB-006] Login.jsx - Low Risk
Verbose error messages on failed login attempts.

### [WEB-007] Register.jsx - Low Risk
Client-side password complexity validation can be bypassed.

### [WEB-008] index.css - Low Risk
Unused CSS rules could allow minor CSS injection via third-party fonts.

### [WEB-009] package.json - Low Risk
Dependency uses an outdated version of a transitive sub-package.

### [WEB-010] App.jsx - Low Risk
Missing Referrer-Policy header configuration in Vite.

### [WEB-011] Login.jsx - Low Risk
No client-side rate limiting on login button clicks.

### [WEB-012] AuthContext.jsx - Low Risk
JWT token not explicitly cleared from memory on logout.

### [WEB-013] Register.jsx - Low Risk
Email enumeration possible via registration endpoint response.

### [WEB-014] App.jsx - Low Risk
React strict mode disabled, potentially masking lifecycle issues.


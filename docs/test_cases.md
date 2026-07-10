# Test Cases - Super Admin Authentication

1. **TC-001 (Positive):** Login with valid credentials (returns tokens).
2. **TC-002 (Negative):** Login with incorrect password (returns 400).
3. **TC-003 (Negative):** Change password with weak requirements (returns 400).
4. **TC-004 (Positive):** Retrieve SMTP configurations with masked password.
5. **TC-005 (Positive):** Send test validation email using dynamic SMTP transport.

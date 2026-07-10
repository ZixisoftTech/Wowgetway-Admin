# Bug Register

| Bug ID | Date | Module | Description | Root Cause | Fix | Status |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: |
| BUG-001 | 2026-07-09 | Auth OTP | OTP email body rendered literal string `${otp}` | Backslash character escaped interpolation | Removed backslash | Resolved |

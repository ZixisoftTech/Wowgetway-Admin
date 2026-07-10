# Security Documentation

## Hardening Policies
- **CORS:** Only allowed from registered frontend domains.
- **Helmet:** Embedded to protect HTTP headers from clickjacking/sniffing.
- **NoSQL Injection:** Express-mongo-sanitize filters body parameters to neutralize malicious MongoDB inputs.
- **Passwords:** All passwords hashed via BCrypt (salt rounds: 10).
- **AES-256-CBC Two-Way Encryption:** Applied to third-party app secrets (such as SMTP mail parameters) with IV block prefixes.

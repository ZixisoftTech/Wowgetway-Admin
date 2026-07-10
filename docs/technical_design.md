# Technical Design Document (TDD)

## Authentication Architecture
- **State Token:** Signed JWT token (expires in 15 minutes) sent in Authorization header.
- **Session Token:** Signed JWT refresh token (expires in 7 days) sent via secure HTTPOnly, SameSite=Lax cookie.
- **Encryption:** SMTP passwords stored via two-way AES-256-CBC algorithm. Password hashes stored via bcrypt one-way hashing.

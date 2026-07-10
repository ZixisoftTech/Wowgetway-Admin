# Functional Requirement Document (FRD) - Module 01: Super Admin Authentication

## Module Purpose
Provides secure access controls, dynamic roles permissions, security locking mechanisms, and OTP-based password recovery.

## User Flow
1. **Login Page:** Operator submits email and password.
2. **Forgot Password:** Enters email, receives a dynamic 6-digit OTP code.
3. **Verify OTP:** Submits 6-digit verification code, receives transient reset token.
4. **Change Password:** Enters new password under profile section.

## Validation Rules
- **Email:** Standard email regex format.
- **Passwords:** Minimum 8 characters long, must contain both letters and numbers.
- **OTP:** Exactly 6 digits, expires in 10 minutes.

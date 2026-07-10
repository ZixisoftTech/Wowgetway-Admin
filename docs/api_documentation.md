# API Documentation

## Auth Endpoints
- **POST /api/admin/auth/login**
  - Payload: `{ email, password }`
  - Response: `{ token, user }`
- **POST /api/admin/auth/forgot-password**
  - Payload: `{ email }`
  - Response: `{ message }`
- **POST /api/admin/auth/verify-otp**
  - Payload: `{ email, otp }`
  - Response: `{ resetToken }`
- **POST /api/admin/auth/reset-password**
  - Headers: `Authorization: Bearer <resetToken>`
  - Payload: `{ newPassword }`
  - Response: `{ message }`

## Profile Endpoints
- **GET /api/admin/profile**
  - Headers: `Authorization: Bearer <accessToken>`
  - Response: Profile details object
- **PUT /api/admin/profile**
  - Headers: `Authorization: Bearer <accessToken>`
  - Payload: `{ fullName, mobileNumber, profilePhoto }`
  - Response: Updated profile details

## SMTP Settings Endpoints
- **GET /api/admin/settings/smtp**
  - Headers: `Authorization: Bearer <accessToken>`
- **PUT /api/admin/settings/smtp**
  - Headers: `Authorization: Bearer <accessToken>`
  - Payload: `{ host, port, email, appPassword, secure, senderName, enabled }`
- **POST /api/admin/settings/smtp/test-email**
  - Headers: `Authorization: Bearer <accessToken>`
  - Payload: `{ recipientEmail }`

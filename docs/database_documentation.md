# Database Documentation

## Collection: admins
- **Purpose:** Stores system administrators and operators.
- **Schema:**
  - `fullName`: String (Required)
  - `email`: String (Unique, Required)
  - `passwordHash`: String (Required)
  - `role`: String (Default: 'Super Admin')
  - `status`: String (Default: 'Active')
  - `profilePhoto`: String
  - `mobileNumber`: String

## Collection: smtpsettings
- **Purpose:** Outgoing server parameters.
- **Schema:**
  - `host`: String
  - `port`: Number
  - `email`: String
  - `appPassword`: String (AES-256-CBC Encrypted)
  - `secure`: Boolean
  - `senderName`: String
  - `enabled`: Boolean

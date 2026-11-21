# API Reference — Authentication & Access Control (v1.0 MVP)

This document provides complete reference specifications for all implemented authentication, member onboarding, session, directory, and profile management endpoints in LMS v1.0.

All endpoints support both `/api/<path>` and `/<path>` routing prefixes.

---

## 1. Authentication Endpoints

### 1.1 Login

- **Method**: `POST`
- **URL**: `/api/auth/login`
- **Auth Required**: No (Public)
- **Rate Limit**: 5 attempts / 60 seconds
- **Request Body**:
  ```json
  {
    "type": "EMAIL", // "EMAIL" | "PHONE"
    "identifier": "patron@example.com", // email or Kenyan phone (e.g. 0712345678)
    "password": "UserSecretPassword123!"
  }
  ```
- **Validation**:
  - `type`: Must be `EMAIL` or `PHONE`.
  - `identifier`: String, required, max length 254.
  - `password`: String, required, max length 128.
- **Success Response (Single Library, 200 OK)**:
  ```json
  {
    "authenticated": true,
    "user": {
      "id": "22222222-2222-4222-8222-222222222222",
      "fullName": "Jane Member",
      "role": "MEMBER",
      "mustChangePassword": false
    },
    "library": {
      "id": "11111111-1111-4111-8111-111111111111",
      "name": "Nairobi Central Library"
    },
    "session": {
      "id": "33333333-3333-4333-8333-333333333333",
      "expiresAt": "2026-11-28T16:00:00.000Z"
    }
  }
  ```
  *Cookies Set*: `access_token` (HTTP-only, 15m), `refresh_token` (HTTP-only, 7d).
- **Success Response (Multiple Libraries, 200 OK)**:
  ```json
  {
    "requiresLibrarySelection": true,
    "memberships": [
      {
        "tenantId": "11111111-1111-4111-8111-111111111111",
        "tenantName": "Nairobi Central Library",
        "role": "MEMBER"
      },
      {
        "tenantId": "55555555-5555-4555-8555-555555555555",
        "tenantName": "Mombasa Community Library",
        "role": "TEACHER"
      }
    ]
  }
  ```
  *Cookie Set*: `library_selection_token` (HTTP-only, 5m).
- **Error Responses**:
  - `401 Unauthorized`: `{"message": "Invalid credentials"}`
  - `429 Too Many Requests`: Rate limit exceeded.
- **Curl Example**:
  ```bash
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"type":"EMAIL","identifier":"patron@example.com","password":"UserSecretPassword123!"}' \
    -c cookies.txt
  ```

---

### 1.2 Select Membership

- **Method**: `POST`
- **URL**: `/api/auth/select-membership`
- **Auth Required**: Valid `library_selection_token` cookie
- **Rate Limit**: 10 attempts / 60 seconds
- **Request Body**:
  ```json
  {
    "tenantId": "11111111-1111-4111-8111-111111111111"
  }
  ```
- **Success Response (200 OK)**: Same as single library login.
- **Error Responses**:
  - `400 Bad Request`: `{"message": "You do not have access to the selected library"}`
  - `401 Unauthorized`: Selection token missing or expired.
- **Curl Example**:
  ```bash
  curl -X POST http://localhost:3000/api/auth/select-membership \
    -H "Content-Type: application/json" \
    -b cookies.txt -c cookies.txt \
    -d '{"tenantId":"11111111-1111-4111-8111-111111111111"}'
  ```

---

### 1.3 Refresh Tokens

- **Method**: `POST`
- **URL**: `/api/auth/refresh`
- **Auth Required**: Valid `refresh_token` cookie
- **Rate Limit**: 20 requests / 60 seconds
- **Success Response (200 OK)**:
  ```json
  {
    "authenticated": true,
    "session": {
      "id": "66666666-6666-4666-8666-666666666666",
      "expiresAt": "2026-11-28T16:15:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Invalid, expired, replayed, or revoked token.
- **Curl Example**:
  ```bash
  curl -X POST http://localhost:3000/api/auth/refresh \
    -b cookies.txt -c cookies.txt
  ```

---

### 1.4 Logout

- **Method**: `POST`
- **URL**: `/api/auth/logout`
- **Auth Required**: `AccessTokenGuard`
- **Success Response (200 OK)**:
  ```json
  {
    "authenticated": false
  }
  ```
  *Clears `access_token`, `refresh_token`, and `library_selection_token` cookies.*
- **Curl Example**:
  ```bash
  curl -X POST http://localhost:3000/api/auth/logout \
    -b cookies.txt -c cookies.txt
  ```

---

### 1.5 List Sessions

- **Method**: `GET`
- **URL**: `/api/auth/sessions`
- **Auth Required**: `AccessTokenGuard`
- **Success Response (200 OK)**:
  ```json
  [
    {
      "id": "33333333-3333-4333-8333-333333333333",
      "deviceName": "Mozilla/5.0 (Android; Mobile)",
      "createdAt": "2026-11-21T10:00:00.000Z",
      "lastUsedAt": "2026-11-21T10:15:00.000Z",
      "expiresAt": "2026-11-28T10:00:00.000Z"
    }
  ]
  ```
- **Curl Example**:
  ```bash
  curl -X GET http://localhost:3000/api/auth/sessions -b cookies.txt
  ```

---

### 1.6 Revoke Session

- **Method**: `DELETE`
- **URL**: `/api/auth/sessions/:sessionId`
- **Auth Required**: `AccessTokenGuard`
- **Success Response (200 OK)**:
  ```json
  {
    "revoked": true
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `sessionId` must be a valid UUID.
  - `404 Not Found`: Session does not exist or does not belong to the user.
- **Curl Example**:
  ```bash
  curl -X DELETE http://localhost:3000/api/auth/sessions/33333333-3333-4333-8333-333333333333 \
    -b cookies.txt
  ```

---

### 1.7 Change Password

- **Method**: `POST`
- **URL**: `/api/auth/change-password`
- **Auth Required**: `AccessTokenGuard`
- **Rate Limit**: 5 attempts / 60 seconds
- **Request Body**:
  ```json
  {
    "currentPassword": "OldPassword123!",
    "newPassword": "BrandNewSecurePassword456!"
  }
  ```
- **Validation**:
  - `currentPassword`: Required string.
  - `newPassword`: Min 8 chars, max 128 chars, must differ from current password.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Password changed successfully"
  }
  ```
- **Security Action**: Revokes all other active sessions for this user.
- **Curl Example**:
  ```bash
  curl -X POST http://localhost:3000/api/auth/change-password \
    -H "Content-Type: application/json" \
    -b cookies.txt \
    -d '{"currentPassword":"OldPassword123!","newPassword":"BrandNewSecurePassword456!"}'
  ```

---

### 1.8 Request Password Reset (Forgot Password)

- **Method**: `POST`
- **URL**: `/api/auth/forgot-password`
- **Auth Required**: No (Public)
- **Rate Limit**: 3 attempts / 60 seconds
- **Request Body**:
  ```json
  {
    "type": "EMAIL", // "EMAIL" | "PHONE"
    "identifier": "patron@example.com"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "message": "If an account exists, a reset code has been sent."
  }
  ```
  *Note: Response is identical for registered and non-registered identities to protect privacy.*
- **Curl Example**:
  ```bash
  curl -X POST http://localhost:3000/api/auth/forgot-password \
    -H "Content-Type: application/json" \
    -d '{"type":"EMAIL","identifier":"patron@example.com"}'
  ```

---

### 1.9 Confirm Password Reset (Reset Password)

- **Method**: `POST`
- **URL**: `/api/auth/reset-password`
- **Auth Required**: No (Public)
- **Rate Limit**: 5 attempts / 60 seconds
- **Request Body**:
  ```json
  {
    "type": "EMAIL",
    "identifier": "patron@example.com",
    "code": "123456",
    "newPassword": "NewSecurePassword456!"
  }
  ```
- **Validation**:
  - `code`: Must be exactly 6 numeric digits.
  - `newPassword`: Min 8 characters.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Password has been reset successfully"
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{"message": "Invalid or expired reset code"}`
- **Security Action**: Atomically consumes OTP, updates Argon2id password hash, and revokes all active sessions for the user.
- **Curl Example**:
  ```bash
  curl -X POST http://localhost:3000/api/auth/reset-password \
    -H "Content-Type: application/json" \
    -d '{"type":"EMAIL","identifier":"patron@example.com","code":"123456","newPassword":"NewSecurePassword456!"}'
  ```

---

## 2. Staff Account Management Endpoints

### 2.1 Create Member Account

- **Method**: `POST`
- **URL**: `/api/members`
- **Auth Required**: `AccessTokenGuard`, `RolesGuard` (`ADMIN`, `LIBRARIAN`)
- **Request Body**:
  ```json
  {
    "fullName": "Kipchoge Keino",
    "email": "kipchoge@example.com",
    "phone": "+254712000000",
    "memberTypeId": "77777777-7777-4777-8777-777777777777",
    "admissionNumber": "ADM-2026-001",
    "groupId": "88888888-8888-4888-8888-888888888888",
    "identifierType": "NATIONAL_ID",
    "identifierValue": "12345678"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "userId": "99999999-9999-4999-8999-999999999999",
    "profileId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "fullName": "Kipchoge Keino",
    "email": "kipchoge@example.com",
    "phone": "+254712000000",
    "role": "MEMBER",
    "mustChangePassword": true,
    "temporaryPassword": "base64url_temporary_credential"
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Invalid member type, group, or missing contact method.
  - `403 Forbidden`: Caller lacks required role.
  - `409 Conflict`: Contact details or admission number already exists in this tenant.
- **Curl Example**:
  ```bash
  curl -X POST http://localhost:3000/api/members \
    -H "Content-Type: application/json" \
    -b cookies.txt \
    -d '{"fullName":"Kipchoge Keino","phone":"+254712000000","memberTypeId":"77777777-7777-4777-8777-777777777777"}'
  ```

---

### 2.2 Create Librarian Account

- **Method**: `POST`
- **URL**: `/api/users/librarians`
- **Auth Required**: `AccessTokenGuard`, `RolesGuard` (`ADMIN` only)
- **Request Body**:
  ```json
  {
    "fullName": "Grace Ogot",
    "email": "grace.ogot@library.ac.ke",
    "phone": "+254722000000"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "userId": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    "fullName": "Grace Ogot",
    "email": "grace.ogot@library.ac.ke",
    "phone": "+254722000000",
    "role": "LIBRARIAN",
    "mustChangePassword": true,
    "temporaryPassword": "base64url_temporary_credential"
  }
  ```
- **Curl Example**:
  ```bash
  curl -X POST http://localhost:3000/api/users/librarians \
    -H "Content-Type: application/json" \
    -b cookies.txt \
    -d '{"fullName":"Grace Ogot","email":"grace.ogot@library.ac.ke"}'
  ```

---

### 2.3 Staff User Directory

- **Method**: `GET`
- **URL**: `/api/users`
- **Auth Required**: `AccessTokenGuard`, `RolesGuard` (`ADMIN`, `LIBRARIAN`)
- **Query Parameters**:
  - `page`: Integer ≥ 1 (default: 1).
  - `limit`: Integer 1–100 (default: 20).
  - `search`: String (optional, matches name, email, phone, admissionNumber).
- **Success Response (200 OK)**:
  ```json
  {
    "users": [
      {
        "id": "99999999-9999-4999-8999-999999999999",
        "fullName": "Kipchoge Keino",
        "email": "kipchoge@example.com",
        "phone": "+254712000000",
        "role": "MEMBER",
        "status": "ACTIVE",
        "createdAt": "2026-11-21T08:00:00.000Z",
        "admissionNumber": "ADM-2026-001",
        "memberType": "Student",
        "group": "Form 3 North"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
  ```
  *Note: Never exposes password hashes, temporary passwords, tokens, or document values.*
- **Curl Example**:
  ```bash
  curl -X GET "http://localhost:3000/api/users?page=1&limit=20&search=Kipchoge" \
    -b cookies.txt
  ```

---

### 2.4 View Tenant User

- **Method**: `GET`
- **URL**: `/api/users/:userId`
- **Auth Required**: `AccessTokenGuard`, `RolesGuard` (`ADMIN`, `LIBRARIAN`)
- **Success Response (200 OK)**: Detailed user profile and member metadata.
- **Error Responses**:
  - `404 Not Found`: User not found in this library tenant.
- **Curl Example**:
  ```bash
  curl -X GET http://localhost:3000/api/users/99999999-9999-4999-8999-999999999999 \
    -b cookies.txt
  ```

---

### 2.5 Promote Librarian to Administrator

- **Method**: `POST`
- **URL**: `/api/users/:userId/promote`
- **Auth Required**: `AccessTokenGuard`, `RolesGuard` (`ADMIN` only)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Librarian successfully promoted to administrator",
    "user": {
      "id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "fullName": "Grace Ogot",
      "role": "ADMIN"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Cannot promote self, target is not a librarian, or target is inactive.
  - `403 Forbidden`: Caller is not an admin.
- **Curl Example**:
  ```bash
  curl -X POST http://localhost:3000/api/users/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/promote \
    -b cookies.txt
  ```

---

## 3. Self-Service Profile Endpoints

### 3.1 View Own Profile

- **Method**: `GET`
- **URL**: `/api/profile`
- **Auth Required**: `AccessTokenGuard` (all authenticated roles)
- **Success Response (200 OK)**: Current user's account details and membership metadata.
- **Curl Example**:
  ```bash
  curl -X GET http://localhost:3000/api/profile -b cookies.txt
  ```

---

### 3.2 Update Own Profile

- **Method**: `PATCH`
- **URL**: `/api/profile`
- **Auth Required**: `AccessTokenGuard` (all authenticated roles)
- **Request Body**:
  ```json
  {
    "fullName": "Updated Name",
    "phone": "+254733000000"
  }
  ```
- **Validation**:
  - Permitted fields only: `fullName`, `email`, `phone`.
  - Roles, tenantId, status, and password fields are strictly rejected.
- **Success Response (200 OK)**:
  ```json
  {
    "id": "22222222-2222-4222-8222-222222222222",
    "fullName": "Updated Name",
    "email": "patron@example.com",
    "phone": "+254733000000",
    "role": "MEMBER",
    "status": "ACTIVE"
  }
  ```
- **Curl Example**:
  ```bash
  curl -X PATCH http://localhost:3000/api/profile \
    -H "Content-Type: application/json" \
    -b cookies.txt \
    -d '{"fullName":"Updated Name"}'
  ```

---

### 3.3 Deactivate Own Account

- **Method**: `DELETE`
- **URL**: `/api/profile`
- **Auth Required**: `AccessTokenGuard` (all authenticated roles)
- **Success Response (200 OK)**:
  ```json
  {
    "deactivated": true,
    "message": "Account has been deactivated successfully"
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `Cannot deactivate the last active administrator` or `Cannot deactivate the last active librarian`.
- **Security Action**: Sets account status to `SUSPENDED`, revokes all active sessions, and preserves borrowing history and loans.
- **Curl Example**:
  ```bash
  curl -X DELETE http://localhost:3000/api/profile -b cookies.txt
  ```

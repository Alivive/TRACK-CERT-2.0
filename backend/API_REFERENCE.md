# CerTrack API Reference

## Base URL
```
http://localhost:3000/api
```

## Authentication
All endpoints (except `/auth/*`) require a valid JWT token in the `Authorization` header:
```
Authorization: Bearer <jwt-token>
```

---

## Authentication Endpoints

### Register with Passkey - Start
**POST** `/auth/register/start`

Initiates passkey registration process.

**Request:**
```json
{
  "email": "user@example.com",
  "accessCode": "INTERNS2026",
  "role": "intern"
}
```

**Response:**
```json
{
  "registrationId": "uuid",
  "options": {
    "challenge": "base64-string",
    "rp": { "name": "CerTrack", "id": "localhost" },
    "user": { "id": "uuid", "name": "user@example.com", "displayName": "user@example.com" },
    "pubKeyCredParams": [{ "type": "public-key", "alg": -7 }],
    "timeout": 60000,
    "attestation": "none",
    "authenticatorSelection": { ... }
  }
}
```

---

### Register with Passkey - Complete
**POST** `/auth/register/complete`

Completes passkey registration.

**Request:**
```json
{
  "registrationId": "uuid",
  "credential": {
    "id": "base64-string",
    "rawId": "base64-string",
    "response": {
      "clientDataJSON": "base64-string",
      "attestationObject": "base64-string",
      "transports": ["internal", "platform"]
    },
    "type": "public-key"
  }
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "user",
    "role": "intern",
    "created_at": "2026-04-30T10:00:00Z"
  },
  "token": "jwt-token",
  "message": "Registration successful"
}
```

---

### Login with Passkey - Start
**POST** `/auth/login/start`

Initiates passkey authentication.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "authId": "uuid",
  "options": {
    "challenge": "base64-string",
    "timeout": 60000,
    "rpId": "localhost",
    "allowCredentials": [
      {
        "type": "public-key",
        "id": "base64-string",
        "transports": ["internal", "platform"]
      }
    ],
    "userVerification": "preferred"
  }
}
```

---

### Login with Passkey - Complete
**POST** `/auth/login/complete`

Completes passkey authentication.

**Request:**
```json
{
  "authId": "uuid",
  "credential": {
    "id": "base64-string",
    "rawId": "base64-string",
    "response": {
      "clientDataJSON": "base64-string",
      "authenticatorData": "base64-string",
      "signature": "base64-string"
    },
    "type": "public-key"
  }
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "user",
    "role": "intern",
    "intern_id": "uuid"
  },
  "token": "jwt-token",
  "message": "Authentication successful"
}
```

---

### Logout
**POST** `/auth/logout`

Logs out the current user.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Interns Endpoints

### List All Interns
**GET** `/interns`

Returns all interns (admins see all, interns see all for directory).

**Query Parameters:**
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)
- `sort` (optional): Sort field (default: `first_name`)
- `order` (optional): `asc` or `desc` (default: `asc`)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "first_name": "Amara",
      "last_name": "Osei",
      "email": "amara@example.com",
      "start_date": "2025-01-15",
      "created_at": "2026-04-30T10:00:00Z",
      "updated_at": "2026-04-30T10:00:00Z"
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

---

### Get Intern Details
**GET** `/interns/:id`

Returns details for a specific intern.

**Response:**
```json
{
  "id": "uuid",
  "first_name": "Amara",
  "last_name": "Osei",
  "email": "amara@example.com",
  "start_date": "2025-01-15",
  "created_at": "2026-04-30T10:00:00Z",
  "updated_at": "2026-04-30T10:00:00Z",
  "certifications": [
    {
      "id": "uuid",
      "name": "Machine Learning Basics",
      "provider": "Coursera",
      "category": "AI",
      "hours": 40,
      "date": "2025-03-10"
    }
  ],
  "stats": {
    "total_certifications": 5,
    "total_hours": 150,
    "last_certification_date": "2025-03-20"
  }
}
```

---

### Create Intern
**POST** `/interns`

Creates a new intern (admin only).

**Request:**
```json
{
  "first_name": "Kofi",
  "last_name": "Mensah",
  "email": "kofi@example.com",
  "start_date": "2025-04-01"
}
```

**Response:**
```json
{
  "id": "uuid",
  "first_name": "Kofi",
  "last_name": "Mensah",
  "email": "kofi@example.com",
  "start_date": "2025-04-01",
  "created_at": "2026-04-30T10:00:00Z",
  "updated_at": "2026-04-30T10:00:00Z"
}
```

---

### Update Intern
**PUT** `/interns/:id`

Updates an intern (admin only, or self for limited fields).

**Request:**
```json
{
  "first_name": "Kofi",
  "last_name": "Mensah",
  "email": "kofi.new@example.com",
  "start_date": "2025-04-01"
}
```

**Response:**
```json
{
  "id": "uuid",
  "first_name": "Kofi",
  "last_name": "Mensah",
  "email": "kofi.new@example.com",
  "start_date": "2025-04-01",
  "updated_at": "2026-04-30T11:00:00Z"
}
```

---

### Delete Intern
**DELETE** `/interns/:id`

Deletes an intern and all associated certifications (admin only).

**Response:**
```json
{
  "success": true,
  "message": "Intern deleted successfully"
}
```

---

## Certifications Endpoints

### List Certifications
**GET** `/certifications`

Returns certifications (filtered by user role).

**Query Parameters:**
- `intern_id` (optional): Filter by intern
- `category` (optional): Filter by category (AI, FE, BE, API, CYBER, CLOUD, SOFT)
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)
- `sort` (optional): Sort field (default: `date`)
- `order` (optional): `asc` or `desc` (default: `desc`)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "intern_id": "uuid",
      "name": "Machine Learning Basics",
      "provider": "Coursera",
      "category": "AI",
      "hours": 40,
      "date": "2025-03-10",
      "created_at": "2026-04-30T10:00:00Z",
      "updated_at": "2026-04-30T10:00:00Z"
    }
  ],
  "total": 156,
  "limit": 50,
  "offset": 0
}
```

---

### Get Certification Details
**GET** `/certifications/:id`

Returns details for a specific certification.

**Response:**
```json
{
  "id": "uuid",
  "intern_id": "uuid",
  "name": "Machine Learning Basics",
  "provider": "Coursera",
  "category": "AI",
  "hours": 40,
  "date": "2025-03-10",
  "created_at": "2026-04-30T10:00:00Z",
  "updated_at": "2026-04-30T10:00:00Z"
}
```

---

### Add Certification
**POST** `/certifications`

Adds a new certification.

**Request:**
```json
{
  "intern_id": "uuid",
  "name": "React Advanced",
  "provider": "Udemy",
  "category": "FE",
  "hours": 25,
  "date": "2025-03-15"
}
```

**Response:**
```json
{
  "id": "uuid",
  "intern_id": "uuid",
  "name": "React Advanced",
  "provider": "Udemy",
  "category": "FE",
  "hours": 25,
  "date": "2025-03-15",
  "created_at": "2026-04-30T10:00:00Z",
  "updated_at": "2026-04-30T10:00:00Z"
}
```

---

### Update Certification
**PUT** `/certifications/:id`

Updates a certification.

**Request:**
```json
{
  "name": "React Advanced - Updated",
  "hours": 30
}
```

**Response:**
```json
{
  "id": "uuid",
  "intern_id": "uuid",
  "name": "React Advanced - Updated",
  "provider": "Udemy",
  "category": "FE",
  "hours": 30,
  "date": "2025-03-15",
  "updated_at": "2026-04-30T11:00:00Z"
}
```

---

### Delete Certification
**DELETE** `/certifications/:id`

Deletes a certification.

**Response:**
```json
{
  "success": true,
  "message": "Certification deleted successfully"
}
```

---

## Admin Endpoints

### Get System Settings
**GET** `/admin/settings`

Returns system configuration (admin only).

**Response:**
```json
{
  "id": 1,
  "project_name": "CerTrack Africa",
  "admin_code": "ADMIN2026",
  "intern_code": "INTERNS2026",
  "updated_at": "2026-04-30T10:00:00Z"
}
```

---

### Update System Settings
**PUT** `/admin/settings`

Updates system configuration (admin only).

**Request:**
```json
{
  "project_name": "CerTrack Africa",
  "admin_code": "NEW_ADMIN_CODE",
  "intern_code": "NEW_INTERN_CODE"
}
```

**Response:**
```json
{
  "id": 1,
  "project_name": "CerTrack Africa",
  "admin_code": "NEW_ADMIN_CODE",
  "intern_code": "NEW_INTERN_CODE",
  "updated_at": "2026-04-30T11:00:00Z"
}
```

---

### Get Audit Log
**GET** `/admin/audit-log`

Returns audit log entries (admin only).

**Query Parameters:**
- `user_id` (optional): Filter by user
- `action` (optional): Filter by action
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "action": "CREATE_CERTIFICATION",
      "table_name": "certifications",
      "record_id": "uuid",
      "old_values": null,
      "new_values": { "name": "Machine Learning Basics", "hours": 40 },
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "created_at": "2026-04-30T10:00:00Z"
    }
  ],
  "total": 1250,
  "limit": 50,
  "offset": 0
}
```

---

### List All Users
**GET** `/admin/users`

Returns all user accounts (admin only).

**Query Parameters:**
- `role` (optional): Filter by role (admin, intern)
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "User Name",
      "role": "intern",
      "intern_id": "uuid",
      "created_at": "2026-04-30T10:00:00Z",
      "updated_at": "2026-04-30T10:00:00Z"
    }
  ],
  "total": 45,
  "limit": 50,
  "offset": 0
}
```

---

### Update User Role
**PUT** `/admin/users/:id/role`

Updates a user's role (admin only).

**Request:**
```json
{
  "role": "admin"
}
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "User Name",
  "role": "admin",
  "updated_at": "2026-04-30T11:00:00Z"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request parameters",
  "details": "email is required"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to access this resource"
}
```

### 404 Not Found
```json
{
  "error": "Not found",
  "message": "Resource not found"
}
```

### 409 Conflict
```json
{
  "error": "Conflict",
  "message": "User already exists"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

---

## Rate Limiting

All endpoints are rate-limited:
- **Authentication endpoints**: 5 requests per minute per IP
- **Other endpoints**: 100 requests per minute per user
- **Admin endpoints**: 50 requests per minute per user

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1619865600
```

---

## Pagination

Endpoints that return lists support pagination:

**Query Parameters:**
- `limit`: Number of results (default: 50, max: 500)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "data": [...],
  "total": 156,
  "limit": 50,
  "offset": 0,
  "hasMore": true
}
```

---

## Sorting

Endpoints that return lists support sorting:

**Query Parameters:**
- `sort`: Field to sort by
- `order`: `asc` or `desc` (default: `asc`)

**Example:**
```
GET /api/certifications?sort=date&order=desc
```

---

## Filtering

Endpoints support filtering by query parameters:

**Example:**
```
GET /api/certifications?category=AI&intern_id=uuid
```

---

## Timestamps

All timestamps are in ISO 8601 format with timezone:
```
2026-04-30T10:00:00Z
```

---

## Categories

Valid certification categories:
- `AI` - Artificial Intelligence
- `FE` - Front End Web Dev
- `BE` - Back End Web Dev
- `API` - API Functionalities
- `CYBER` - Cybersecurity
- `CLOUD` - Cloud Computing
- `SOFT` - Soft Skills

---

## Roles

Valid user roles:
- `admin` - System administrator
- `intern` - Intern user

---

**Last Updated**: April 2026
**API Version**: 1.0

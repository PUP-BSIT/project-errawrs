

## Description

Authenticates a user (admin, teller, or user) based on provided credentials. Returns user details and, if applicable, account information.

---

## Request

- **Content-Type:** `application/json`
- **Method:** `POST`

### Required Fields

| Field       | Type    | Description                                            |
|-------------|---------|--------------------------------------------------------|
| login_type  | string  | Type of user logging in. Allowed values: `"admin"`, `"user"`, `"teller"` |
| password    | string  | User's password. Minimum length 8 characters           |

### Conditional Fields

- `username` is **required** if `login_type` is `"admin"` or `"user"`
- `teller_number` is **required** if `login_type` is `"teller"`

### Field Definitions

```json
{
  "login_type": {
    "type": "string",
    "allowed_values": ["admin", "user", "teller"],
    "required": true
  },
  "username": {
    "type": "string",
    "required_if": ["login_type=admin", "login_type=user"]
  },
  "teller_number": {
    "type": "string",
    "required_if": ["login_type=teller"]
  },
  "password": {
    "type": "string",
    "min_length": 8,
    "required": true
  }
}

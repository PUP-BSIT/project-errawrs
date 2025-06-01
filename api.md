

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
  "admin": {
    "login_type": "admin",
    "username": "your_admin_username",
    "password": "your_password_here"
  },
  "user": {
    "login_type": "user",
    "username": "your_user_username",
    "password": "your_password_here"
  },
  "teller": {
    "login_type": "teller",
    "teller_number": "your_teller_number",
    "password": "your_password_here"
  }
}


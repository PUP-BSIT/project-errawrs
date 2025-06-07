# External Transfer API Documentation

## 1. External Transfer Request

### Endpoint
```
POST /api/user/external_transfer.php
```

### Request Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| transaction_amount | number | Amount to be transferred (must be positive) |
| source_account_no | number | Source (internal) account number |
| recipient_bank_code | string | Bank code for recipient (e.g., 'Blinders', 'Dragon') |
| recipient_account_no | number | Recipient (external) account number |
| redirect_url | string | URL to redirect after transaction completion |

### Response (Success)
```json
{
    "success": true,
    "message": "Please verify the transfer with OTP",
    "data": {
        "phone_number": "1234567890",
        "name": "John Doe",
        "recipient_details": {
            "account_name": "Jane Smith",
            "bank_name": "Blinders Bank",
            "account_type": "Savings"
        }
    }
}
```

### Response (Error)
```json
{
    "success": false,
    "error": "Error message here"
}
```

## 2. External Bank API Integration

### Account Validation Endpoint
```
POST {BANK_API_URL}/validate_account
```

#### Request Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| account_number | number | Account number to validate |

#### Response (Success)
```json
{
    "success": true,
    "is_valid": true,
    "account_details": {
        "account_name": "Jane Smith",
        "bank_name": "Blinders Bank",
        "account_type": "Savings"
    }
}
```

#### Response (Error)
```json
{
    "success": false,
    "error": "Invalid account number"
}
```

### Transfer Processing Endpoint
```
POST {BANK_API_URL}/process_transfer
```

#### Request Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| transaction_amount | number | Amount to be transferred |
| source_account_no | number | Source account number |
| source_bank_code | string | Source bank code (StackOverCash) |
| recipient_account_no | number | Recipient account number |

#### Response (Success)
```json
{
    "success": true,
    "transaction_id": "TRX123456789",
    "status": "completed",
    "timestamp": "2024-03-14T12:00:00Z"
}
```

#### Response (Error)
```json
{
    "success": false,
    "error": "Transfer failed",
    "error_code": "INSUFFICIENT_FUNDS"
}
```

## Environment Variables Required
```
BLINDVAULT_API=https://api.blindvault.com/v1
DRAGONVAULT_API=https://api.dragonvault.com/v1
```

## Error Codes
- `INVALID_ACCOUNT`: Recipient account does not exist
- `INSUFFICIENT_FUNDS`: Source account has insufficient balance
- `INVALID_BANK_CODE`: Unsupported bank code
- `API_ERROR`: External bank API error
- `UNAUTHORIZED`: User not authenticated
- `INVALID_AMOUNT`: Invalid transaction amount
- `INVALID_REDIRECT_URL`: Invalid redirect URL format

## Notes
1. All amounts should be positive numbers
2. Account numbers must be numeric
3. Bank codes are case-sensitive
4. Redirect URL must be a valid URL format
5. API responses are always in JSON format
6. All timestamps are in UTC

## Testing with Postman
1. Open Postman
2. Create a new request
3. Set the request method to `POST`
4. Enter the URL: `https://dev.stackovercash.site/api/services/soc_transfer`
5. Set Headers:
   - `Content-Type: application/json`
6. In the Body tab:
   - Select `raw`
   - Select `JSON` from the dropdown
   - Enter the request JSON as shown in the example above
7. Click Send

## Nginx Configuration on EC2

### 1. SSH into your EC2 instance
```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
```

### 2. Navigate to Nginx configuration directory
```bash
cd /etc/nginx/conf.d/
```

### 3. Edit the configuration file
```bash
sudo nano dev.stackovercash.site.conf
```

### 4. Add or update the configuration
```nginx
server {
    listen 80;
    server_name dev.stackovercash.site;

    # SSL configuration (if using HTTPS)
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/dev.stackovercash.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dev.stackovercash.site/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Root directory
    root /var/www/html/project-errawrs;
    index index.php index.html;

    # API endpoint configuration
    location /api/services/soc_transfer {
        try_files $uri $uri/ /src/api/services/receive_external.php$is_args$args;

        # CORS configuration
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;

        # Handle OPTIONS method for CORS
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }

    # PHP handling
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.0-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Deny access to .htaccess files
    location ~ /\.ht {
        deny all;
    }
}
```

### 5. Test the Nginx configuration
```bash
sudo nginx -t
```

### 6. If the test is successful, reload Nginx
```bash
sudo systemctl reload nginx
```

## Error Handling
The API will return appropriate HTTP status codes:
- 200: Success
- 400: Bad Request (invalid parameters)
- 405: Method Not Allowed (non-POST requests)
- 415: Unsupported Media Type
- 500: Internal Server Error

## Security Considerations
1. The API endpoint is protected by SSL/TLS
2. CORS is configured to allow cross-origin requests
3. Security headers are in place
4. Input validation is performed on all parameters
5. Database transactions ensure data integrity

## Rate Limiting (Optional)
If you want to add rate limiting, add this to the location block:
```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
location /api/services/soc_transfer {
    limit_req zone=api_limit burst=20 nodelay;
    # ... rest of the configuration
}
```

This will limit requests to 10 per second with a burst of 20 requests. 
# External Transfer API Documentation

## API Endpoint
```
POST https://dev.stackovercash.site/api/services/soc_transfer
```

## Request Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| transaction_amount | number | The amount to be transferred |
| source_account_no | number | The source(external) account number |
| source_bank_code | string | The bank code for the source(external) account |
| recipient_account_no | number | The recipient(internal) account number |

## Request Example
```json
{
  "transaction_amount": 50000.00,
  "source_account_no": "123456789012",
  "source_bank_code": "Blinders",
  "recipient_account_no": "544250000109"
}
```

## Response Format
### Success Response
```json
{
  "success": true,
  "transaction_id": "123",
  "message": "External transfer received successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message here",
  "message": "Failed to process external transfer"
}
```

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
cd /etc/nginx/sites-available
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
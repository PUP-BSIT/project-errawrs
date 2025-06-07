# External Transfer API Documentation

## API Endpoint
```
POST https://dev.stackovercash.site/api/services/soc_transfer
```

## Request Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| transaction_amount | number | The amount to be transferred |
| source_account_no | number | The source (external) account number |
| source_bank_code | string | The bank code for the source (external) account |
| recipient_account_no | number | The recipient (internal) account number |

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
1. Open Postman and create a new request.
2. Set the method to `POST`.
3. Enter the URL: `https://dev.stackovercash.site/api/services/soc_transfer`
4. Go to the **Headers** tab and add: `Content-Type: application/json`
5. Go to the **Body** tab, select **raw**, and choose **JSON**.
6. Paste the example request body above.
7. Click **Send**.

## Server Configuration

### File Structure
```
/var/www/dev/
├── public/
│   └── user/          # Public assets
└── src/
    └── api/
        └── services/
            ├── receive_external.php    # Internal API file
            └── README.md              # This documentation
```

### Accessing and Editing Configuration Files

#### 1. SSH into EC2 Instance
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

#### 2. Navigate to Nginx Configuration Directory
```bash
cd /etc/nginx/sites-available/
```

#### 3. List Available Configurations
```bash
ls -l
# You should see: default  dev-admin.stackovercash.site  dev.stackovercash.site  stackovercash.site
```

#### 4. View Current Configuration
```bash
sudo cat dev.stackovercash.site
```

#### 5. Edit Configuration
```bash
sudo nano dev.stackovercash.site
```

#### 6. Test Configuration
```bash
sudo nginx -t
```

#### 7. If Test is Successful, Reload Nginx
```bash
sudo systemctl reload nginx
```

#### 8. Check Nginx Status
```bash
sudo systemctl status nginx
```

#### 9. View Nginx Error Logs (if needed)
```bash
sudo tail -f /var/log/nginx/error.log
```

### Nginx Configuration
The API endpoint is configured in `/etc/nginx/sites-available/dev.stackovercash.site`:

```nginx
server {
    listen 80;
    server_name dev.stackovercash.site;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name dev.stackovercash.site;
    root /var/www/dev/public/user; # Document root for public assets
    index index.html index.htm index.php;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/daniel.stackovercash.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/daniel.stackovercash.site/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Location block for serving static files and your main index
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # Location block for processing PHP files within the document root
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Location block for API files
    location /api/ {
        root /var/www/dev/src/; # Root path for API files

        # Process PHP files within the /api/ path
        location ~ \.php$ {
            include snippets/fastcgi-php.conf;
            fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
            fastcgi_param SCRIPT_FILENAME $request_filename;
            include fastcgi_params;
        }
    }

    # Location block to deny access to .ht files
    location ~ /\.ht {
        deny all;
    }

    # Log files
    access_log /var/log/nginx/dev.stackovercash.site.access.log;
    error_log /var/log/nginx/dev.stackovercash.site.error.log;
}
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
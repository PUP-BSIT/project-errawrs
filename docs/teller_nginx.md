ubuntu@ip-172-31-3-124:/etc/nginx/sites-available$ cat dev-teller.stackovercash.site
# Main server block for dev-teller.stackovercash.site
server {
    listen 80;
    server_name dev-teller.stackovercash.site;
    return 301 https://$server_name$request_uri;
}

# HTTPS server block for dev-teller.stackovercash.site
server {
    listen 443 ssl;
    server_name dev-teller.stackovercash.site;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/dev-teller.stackovercash.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dev-teller.stackovercash.site/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Add proper MIME types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Root directory for the teller interface
    root /var/www/dev/project-errawrs/public/teller;
    index bank_teller_login.html;

    # Handle static files (CSS, JS, images)
    location ~ \.(css|js|jpg|jpeg|png|gif|ico|svg|webp|ttf|otf|woff|woff2|eot)$ {
        try_files $uri =404;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
        add_header X-Debug-Static $uri always;
    }

    # Handle API requests
    location /api/ {
        alias /var/www/dev/project-errawrs/src/api/;

        # Enable CORS for the production domain
        add_header 'Access-Control-Allow-Origin' 'https://dev-teller.stackovercash.site' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,Accept' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;

        # Handle OPTIONS method for CORS preflight requests
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://dev-teller.stackovercash.site' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,Accept' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }

        # Process PHP files
        location ~ \.php$ {
            try_files $uri =404;
            fastcgi_split_path_info ^(.+\.php)(/.+)$;
            fastcgi_pass unix:/run/php/php-fpm.sock;
            fastcgi_param SCRIPT_FILENAME $request_filename;
            fastcgi_param PATH_INFO $fastcgi_path_info;
            include fastcgi_params;

            # Add CORS headers for PHP responses
            add_header 'Access-Control-Allow-Origin' 'https://dev-teller.stackovercash.site' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,Accept' always;
        }
    }

    # Main frontend - serve the teller interface
    location / {
        try_files $uri $uri/ /bank_teller_login.html;
    }

    # Deny access to .ht files
    location ~ /\.ht {
        deny all;
    }

    # Log files
    access_log /var/log/nginx/dev-teller.stackovercash.site.access.log;
    error_log /var/log/nginx/dev-teller.stackovercash.site.error.log debug;
}
ubuntu@ip-172-31-3-124:/etc/nginx/sites-available$
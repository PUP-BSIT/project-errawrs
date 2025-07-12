# Nginx Configuration for admin.stackovercash.site

## Full Configuration

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name admin.stackovercash.site;
    return 301 https://$server_name$request_uri;
}

# HTTPS server block
server {
    listen 443 ssl;
    server_name admin.stackovercash.site;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/admin.stackovercash.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.stackovercash.site/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers with proper CSP
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://code.jquery.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data:; connect-src 'self' https://admin.stackovercash.site;" always;

    # MIME types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Root directory
    root /var/www/html/project-errawrs/public;
    index admin/login.html;

    # Redirect root to admin login
    location = / {
        return 301 /admin/login.html;
    }

    # Handle admin static files
    location /admin/ {
        try_files $uri $uri/ =404;
        index login.html;
        autoindex off;
    }

    # Handle static assets (CSS, JS, images, fonts)
    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
        try_files $uri =404;
        access_log off;
    }

    # Handle favicon
    location = /favicon.ico {
        try_files /favicon.ico =404;
        access_log off;
        log_not_found off;
    }

    # API endpoints - handle both /api/ and /src/api/ paths
    location /api/ {
        alias /var/www/html/project-errawrs/src/api/;
        
        # CORS headers for admin domain
        add_header 'Access-Control-Allow-Origin' 'https://admin.stackovercash.site' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,Accept' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;

        # Handle OPTIONS method for CORS preflight requests
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://admin.stackovercash.site' always;
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

            # PHP-FPM optimizations
            fastcgi_read_timeout 300;
            fastcgi_buffers 16 16k;
            fastcgi_buffer_size 32k;

            # Add CORS headers for PHP responses
            add_header 'Access-Control-Allow-Origin' 'https://admin.stackovercash.site' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,Accept' always;
        }
    }

    # Legacy /src/api/ path support
    location /src/api/ {
        alias /var/www/html/project-errawrs/src/api/;
        
        # CORS headers for admin domain
        add_header 'Access-Control-Allow-Origin' 'https://admin.stackovercash.site' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,Accept' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;

        # Handle OPTIONS method for CORS preflight requests
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://admin.stackovercash.site' always;
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

            # PHP-FPM optimizations
            fastcgi_read_timeout 300;
            fastcgi_buffers 16 16k;
            fastcgi_buffer_size 32k;

            # Add CORS headers for PHP responses
            add_header 'Access-Control-Allow-Origin' 'https://admin.stackovercash.site' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,Accept' always;
        }
    }

    # Deny direct access to /src except /src/api
    location /src/ {
        deny all;
    }

    # Default location block
    location / {
        try_files $uri $uri/ =404;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Logging configuration
    access_log /var/log/nginx/admin.stackovercash.site.access.log;
    error_log /var/log/nginx/admin.stackovercash.site.error.log;
}
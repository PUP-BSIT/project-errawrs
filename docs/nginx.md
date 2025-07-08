server {
    listen 80;
    server_name dev.stackovercash.site;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name dev.stackovercash.site;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/daniel.stackovercash.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/daniel.stackovercash.site/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # MIME types
    include /etc/nginx/mime.types;

    # Root for static assets
    root /var/www/dev/project-errawrs/public;
    index user/index.html;

    # Serve static files directly
    location / {
        try_files $uri $uri/ =404;
    }

    # SPA fallback for /user/ (if using client-side routing)
    location /user/ {
        try_files $uri $uri/ /user/index.html;
    }

    # API endpoints (PHP backend)
    location /src/api/ {
        root /var/www/dev/project-errawrs;
        location ~ \.php$ {
            try_files $uri =404;
            fastcgi_split_path_info ^(.+\.php)(/.+)$;
            fastcgi_pass unix:/run/php/php-fpm.sock;
            fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
            include fastcgi_params;
            add_header 'Access-Control-Allow-Origin' 'https://dev.stackovercash.site' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
        }
    }

    # Deny direct access to /src except /src/api
    location /src/ {
        deny all;
    }

    # Example: External transfer API endpoint
    location /api/services/soc_transfer {
        try_files $uri $uri/ /src/api/services/receive_external.php$is_args$args;
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
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

    # PHP handling for other scripts (if needed)
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

    # Logs
    access_log /var/log/nginx/dev.stackovercash.site.access.log;
    error_log /var/log/nginx/dev.stackovercash.site.error.log;
}
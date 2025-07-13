# 🖥️ Local Development Setup

This guide shows you how to set up the ERRAWRS Banking System for local development without using `.htaccess`.

## 🚀 Quick Start

### Option 1: Using PHP Built-in Server (Recommended for Local Development)

1. **Navigate to the public directory:**
   ```bash
   cd public
   ```

2. **Start the PHP development server:**
   ```bash
   php -S localhost:8000
   ```

3. **Access your application:**
   - Open your browser and go to: `http://localhost:8000`
   - API endpoints will be available at: `http://localhost:8000/api/`

### Option 2: Using XAMPP/WAMP/MAMP

1. **Copy your project to the web server directory:**
   - **XAMPP:** `C:\xampp\htdocs\project-errawrs\`
   - **WAMP:** `C:\wamp\www\project-errawrs\`
   - **MAMP:** `/Applications/MAMP/htdocs/project-errawrs/`

2. **Access your application:**
   - Open your browser and go to: `http://localhost/project-errawrs/public/`
   - API endpoints will be available at: `http://localhost/project-errawrs/public/api/`

## 🔧 Configuration

### For PHP Built-in Server

The routing system automatically detects the project path and handles URLs correctly. No additional configuration needed.

### For XAMPP/WAMP/MAMP

If you're using a subdirectory setup, the routing system will automatically handle the project path. For example:

- **URL:** `http://localhost/project-errawrs/public/user/dashboard`
- **Route:** `/user/dashboard` (automatically detected)

## 📝 Testing the Routes

### Test API Routes

```bash
# Test login endpoint
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login_type":"user","username":"test","password":"test"}'

# Test user accounts endpoint
curl -X GET http://localhost:8000/api/user/accounts \
  -H "Content-Type: application/json"
```

### Test Web Routes

1. **Landing page:** `http://localhost:8000/`
2. **User dashboard:** `http://localhost:8000/user/dashboard`
3. **Teller dashboard:** `http://localhost:8000/teller/dashboard`
4. **Admin dashboard:** `http://localhost:8000/admin/dashboard`

## 🛠️ Development Workflow

### 1. Start Development Server
```bash
cd public
php -S localhost:8000
```

### 2. Make Changes
- Edit files in `src/api/` for backend changes
- Edit files in `public/` for frontend changes
- Update routes in `routes/api.php` or `routes/web.php`

### 3. Test Changes
- Refresh your browser to see frontend changes
- Use browser dev tools or Postman to test API endpoints

## 🔍 Debugging

### Enable Error Display (Local Development Only)

Edit `public/index.php` and change:
```php
// Change this line:
ini_set('display_errors', 0);

// To this:
ini_set('display_errors', 1);
```

### Check Route Registration

Add this to any PHP file to see registered routes:
```php
$router = new Router();
$routes = $router->getRoutes();
echo "<pre>";
print_r($routes);
echo "</pre>";
```

### Check Request URI

Add this to `public/index.php` for debugging:
```php
// Add after line 25
echo "Request URI: " . $requestUri . "<br>";
echo "Is API Request: " . ($isApiRequest ? 'Yes' : 'No') . "<br>";
```

## 🚀 Production Setup (Nginx)

For your EC2 server with nginx:

1. **Copy the nginx configuration:**
   ```bash
   sudo cp docs/nginx.conf /etc/nginx/sites-available/errawrs-banking
   ```

2. **Edit the configuration:**
   ```bash
   sudo nano /etc/nginx/sites-available/errawrs-banking
   ```
   - Change `your-domain.com` to your actual domain
   - Update the document root path if needed
   - Adjust PHP-FPM socket path if needed

3. **Enable the site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/errawrs-banking /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## 📋 Troubleshooting

### Common Issues

1. **404 Errors:**
   - Make sure you're accessing the correct URL
   - Check that the route is defined in `routes/api.php` or `routes/web.php`
   - Verify the handler file exists

2. **500 Errors:**
   - Check PHP error logs
   - Enable error display for debugging
   - Verify file permissions

3. **CORS Issues:**
   - CORS headers are automatically added for `/api/` routes
   - For local development, this should work fine

4. **Session Issues:**
   - Make sure sessions are enabled in PHP
   - Check session storage permissions

### File Permissions

For Linux/Mac development:
```bash
chmod -R 755 public/
chmod -R 644 public/*.php
```

## 🎯 Benefits of This Setup

1. **No .htaccess dependency** - Works with any web server
2. **Automatic path detection** - Handles subdirectories automatically
3. **Easy local development** - Simple PHP server setup
4. **Production ready** - Works with nginx, Apache, or any server
5. **Debug friendly** - Easy to enable error display and debugging

This setup gives you maximum flexibility for both local development and production deployment! 🚀 
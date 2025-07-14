<?php
/**
 * Main Entry Point for ERRAWRS Banking System
 * 
 * This file serves as the entry point for all requests and routes them
 * to the appropriate handlers based on the URL structure.
 * Works with both nginx (production) and local development.
 */

// Set error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/error.log');

// Load the Router class
require_once __DIR__ . '/../src/core/Router.php';

// Get the request URI
$requestUri = $_SERVER['REQUEST_URI'];

// Remove query string
$requestUri = parse_url($requestUri, PHP_URL_PATH);

// For local development: remove project folder from URI if present
// This handles cases where the project is in a subdirectory
$scriptName = $_SERVER['SCRIPT_NAME'];
$projectPath = dirname($scriptName);

if ($projectPath !== '/' && strpos($requestUri, $projectPath) === 0) {
    $requestUri = substr($requestUri, strlen($projectPath));
}

// Ensure URI starts with /
if (empty($requestUri) || $requestUri[0] !== '/') {
    $requestUri = '/' . $requestUri;
}

// Determine if this is an API request or web request
$isApiRequest = strpos($requestUri, '/api/') === 0;

if ($isApiRequest) {
    $router = require __DIR__ . '/../routes/api.php';
    $apiUri = substr($requestUri, 4); // removes '/api'
    $router->dispatch($_SERVER['REQUEST_METHOD'], $apiUri);
} else {
    $router = new Router();
    $webRoutes = require __DIR__ . '/../routes/web.php';
    $router->dispatch($_SERVER['REQUEST_METHOD'], $requestUri);
} 
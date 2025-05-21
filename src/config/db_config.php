<?php
/**
 * Database connection function
 * Returns a MySQL connection object
 */
function getDBConnection() {
    $host = 'localhost';
    $db_name = 'stackovercash_db';
    $username = 'root';
    $password = 'Qazplm891251';

    $conn = mysqli_connect($host, $username, $password, $db_name);

    if (!$conn) {
        die(json_encode(['error' => 'Connection failed: ' . mysqli_connect_error()]));
    }

    return $conn;
}
?>
<?php

session_start();

header('Content-Type: application/json');

require_once '../../config/db_config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
    exit();
}

$conn = getDBConnection();

$data = json_decode(file_get_contents('php://input'), true);
$username = isset($data['username']) ? trim($data['username']) : '';
$password = isset($data['password']) ? $data['password'] : '';

if (empty($username) || empty($password)) {
    http_response_code(400);
    echo json_encode(['error' => 'Username and password are required.']);
    exit();
}

$sql = "SELECT user_id, password_hash, first_name, last_name FROM user WHERE username = ? LIMIT 1";
$stmt = $conn->prepare($sql);

if (!$stmt) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $conn->error]);
    exit();
}

$stmt->bind_param('s', $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid username or password.']);
    $stmt->close();
    mysqli_close($conn);
    exit();
}

$user = $result->fetch_assoc();
$stored_password_hash = $user['password_hash'];

if (password_verify($password, $stored_password_hash)) {

    $_SESSION['user_id'] = $user['user_id'];
    $_SESSION['username'] = $username;
    $_SESSION['first_name'] = $user['first_name'];
    $_SESSION['last_name'] = $user['last_name'];

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Login successful.',
        'user_id' => $user['user_id'],
        'username' => $username,
        'first_name' => $user['first_name'],
        'last_name' => $user['last_name'],
    ]);

} else {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid username or password.']);
}

$stmt->close();
mysqli_close($conn);

?>
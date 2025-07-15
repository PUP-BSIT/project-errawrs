<?php
require_once __DIR__ . '/../../config/SessionManager.php';
require_once __DIR__ . '/../../config/database.php';

$session = SessionManager::getInstance();
$session->initSession();
header('Content-Type: application/json');

define('DEBUG', true);

function validateUserAuthentication() {
    $session = SessionManager::getInstance();
    if (!$session->isAuthenticated() || 
        !isset($_SESSION['auth']['type']) || 
        $_SESSION['auth']['type'] !== 'user') {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        exit();
    }
}

function validateHttpMethod() {
    $allowedMethods = ['GET', 'POST', 'PUT'];
    if (!in_array($_SERVER['REQUEST_METHOD'], $allowedMethods)) {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method Not Allowed']);
        exit();
    }
}

function getRequestData() {
    $isMultipart = strpos($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data') !== false;
    
    if ($isMultipart) {
        $data = $_POST;
        $idImage = $_FILES['id_image'] ?? null;
    } else {
        $data = json_decode(file_get_contents('php://input'), true);
        $idImage = null;
    }
    
    return [
        'data' => $data,
        'id_image' => $idImage
    ];
}

function validateRequiredFields($data) {
    if (empty($data['phone_number'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Phone number is required.']);
        exit();
    }

    if (empty($data['current_password'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'error' => 'Current password is required for confirmation.'
        ]);
        exit();
    }
}

function extractProfileData($data) {
    return [
        'email' => $data['email'] ?? null,
        'street' => $data['street'] ?? null,
        'city' => $data['city'] ?? null,
        'zip_code' => $data['zip_code'] ?? null,
        'country' => $data['country'] ?? null,
        'phone_number' => $data['phone_number'] ?? null,
        'password' => $data['password'] ?? null,
        'current_password' => $data['current_password'] ?? null,
        'id_type' => $data['id_type'] ?? null
    ];
}

function verifyCurrentPassword($db, $userId, $currentPassword) {
    $passwordQuery = $db->prepare('SELECT password_hash FROM user WHERE user_id = ?');
    $passwordQuery->bind_param('i', $userId);
    $passwordQuery->execute();
    $result = $passwordQuery->get_result();
    $passwordRow = $result->fetch_assoc();
    $passwordQuery->close();

    if (!$passwordRow || !password_verify($currentPassword, $passwordRow['password_hash'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Current password is incorrect.']);
        exit();
    }
}

function buildUpdateFields($profileData) {
    $fieldsToUpdate = [
        'email' => $profileData['email'],
        'phone_number' => $profileData['phone_number'],
        'street' => $profileData['street'],
        'city' => $profileData['city'],
        'zip_code' => $profileData['zip_code'],
        'country' => $profileData['country'],
        'id_type' => $profileData['id_type']
    ];
    
    $types = '';
    $params = [];
    
    foreach ($fieldsToUpdate as $field => $value) {
        if ($value !== null) {
            $types .= 's';
            $params[] = $value;
        } else {
            unset($fieldsToUpdate[$field]);
        }
    }

    if (!empty($profileData['password'])) {
        $passwordHash = password_hash($profileData['password'], PASSWORD_BCRYPT);
        $fieldsToUpdate['password_hash'] = $passwordHash;
        $types .= 's';
        $params[] = $passwordHash;
    }

    return [
        'fields' => $fieldsToUpdate,
        'types' => $types,
        'params' => $params
    ];
}

function processIdImageUpload($idImage, $userId) {
    if (!$idImage || $idImage['error'] !== UPLOAD_ERR_OK) {
        return null;
    }

    $uploadDir = __DIR__ . '/uploads/registration/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    
    $extension = pathinfo($idImage['name'], PATHINFO_EXTENSION);
    $filename = 'id_' . $userId . '_' . time() . '.' . $extension;
    $targetPath = $uploadDir . $filename;
    
    if (!move_uploaded_file($idImage['tmp_name'], $targetPath)) {
        throw new Exception('Failed to upload ID image.');
    }
    
    return $filename;
}

function buildUpdateQuery($fieldsToUpdate) {
    $queryParts = [];
    foreach ($fieldsToUpdate as $field => $value) {
        $queryParts[] = "{$field} = ?";
    }
    
    return "UPDATE user SET " . implode(', ', $queryParts) . " WHERE user_id = ?";
}

function updateUserProfile($db, $query, $params, $types, $userId) {
    $updateQuery = $db->prepare($query);
    $updateQuery->bind_param($types, ...$params);

    if (!$updateQuery->execute()) {
        throw new Exception("Failed to update profile: " . $updateQuery->error);
    }
}

function updateSessionData($phoneNumber) {
    $_SESSION['auth']['phone_number'] = $phoneNumber;
    if (isset($_SESSION['userInfo'])) {
        $_SESSION['userInfo']['phone_number'] = $phoneNumber;
    }
}

validateUserAuthentication();
validateHttpMethod();

$userId = $_SESSION['auth']['id'];

// Handle GET request for viewing profile
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $db = db_connect();
        
        $query = "SELECT user_id, username, first_name, last_name, email, phone_number, 
                         street, city, zip_code, country, id_type, id_image, created_at 
                  FROM user WHERE user_id = ?";
        $stmt = $db->prepare($query);
        $stmt->bind_param('i', $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        $user = $result->fetch_assoc();
        
        if ($user) {
            echo json_encode([
                'success' => true,
                'user' => $user
            ]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'User not found']);
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Server error']);
    } finally {
        if (isset($db)) $db->close();
    }
    exit();
}

// Handle POST/PUT requests for updating profile
$requestData = getRequestData();
$profileData = extractProfileData($requestData['data']);

validateRequiredFields($profileData);

try {
    $db = db_connect();

    verifyCurrentPassword($db, $userId, $profileData['current_password']);

    $updateData = buildUpdateFields($profileData);
    $fieldsToUpdate = $updateData['fields'];
    $types = $updateData['types'];
    $params = $updateData['params'];

    $idImageFilename = processIdImageUpload($requestData['id_image'], $userId);
    if ($idImageFilename) {
        $fieldsToUpdate['id_image'] = $idImageFilename;
        $types .= 's';
        $params[] = $idImageFilename;
    }

    if (empty($fieldsToUpdate)) {
        echo json_encode(['success' => false, 'error' => 'No fields to update.']);
        exit();
    }

    $query = buildUpdateQuery($fieldsToUpdate);
    $params[] = $userId;
    $types .= 'i';

    updateUserProfile($db, $query, $params, $types, $userId);
    updateSessionData($profileData['phone_number']);

    echo json_encode([
        'success' => true,
        'message' => 'Profile updated successfully'
    ]);

} catch (Exception $e) {
    if (DEBUG) {
        error_log("Error updating profile for user {$userId}: " . $e->getMessage());
    }
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'error' => 'An error occurred while updating your profile.'
    ]);
} finally {
    if (isset($db)) $db->close();
}
?> 
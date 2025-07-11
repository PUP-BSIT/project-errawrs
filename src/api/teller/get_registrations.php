<?php
require_once __DIR__ . '/../../../vendor/autoload.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/SessionManager.php';

// Prevent direct access
header('Content-Type: application/json');

// Initialize session
$sessionManager = SessionManager::getInstance();

try {
    // Check if teller is authenticated
    if (!$sessionManager->isAuthenticated() || $sessionManager->getSessionData()['type'] !== 'teller') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Unauthorized access']);
    exit();
}

    // Get filter parameters
    $status = $_GET['status'] ?? 'pending';
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $perPage = isset($_GET['per_page']) ? max(5, min(20, intval($_GET['per_page']))) : 10;
    $offset = ($page - 1) * $perPage;

    // Connect to database
    $db = db_connect();
    
    // Build query based on status filter
    $whereClause = $status !== 'all' ? "WHERE status = ?" : "";
    
    // Get total count
    $countQuery = "SELECT COUNT(*) as total FROM registration_request " . $whereClause;
    $countStmt = $db->prepare($countQuery);
    if ($status !== 'all') {
        $countStmt->bind_param('s', $status);
    }
    $countStmt->execute();
    $totalCount = $countStmt->get_result()->fetch_assoc()['total'];

    // Get registrations with pagination
    $query = "SELECT 
                registration_id,
                request_type,
                account_type,
                first_name,
                last_name,
                phone_number,
                email,
                date_of_birth,
                nationality,
                street,
                city,
                zip_code,
                country,
                id_type,
                id_image,
                status,
                created_at,
                updated_at
        FROM registration_request
              " . $whereClause . "
        ORDER BY created_at DESC
              LIMIT ? OFFSET ?";

    $stmt = $db->prepare($query);
    
    if ($status !== 'all') {
        $stmt->bind_param('sii', $status, $perPage, $offset);
    } else {
        $stmt->bind_param('ii', $perPage, $offset);
    }
    
    if (!$stmt->execute()) {
        throw new Exception("Query execution failed: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    if ($result === false) {
        throw new Exception("Failed to get result set: " . $db->error);
    }
    
    $registrations = [];
    while ($row = $result->fetch_assoc()) {
        // Convert dates to ISO format
        $row['created_at'] = date('c', strtotime($row['created_at']));
        $row['updated_at'] = date('c', strtotime($row['updated_at']));
        
        // Add image URL
        $row['id_image_url'] = '/project-errawrs/src/api/auth/uploads/registration/' . $row['id_image'];
        
        $registrations[] = $row;
    }

    // Calculate pagination info
    $totalPages = ceil($totalCount / $perPage);
    $hasNextPage = $page < $totalPages;
    $hasPrevPage = $page > 1;

    echo json_encode([
        'success' => true,
        'registrations' => $registrations,
        'pagination' => [
            'current_page' => $page,
            'per_page' => $perPage,
            'total_items' => $totalCount,
            'total_pages' => $totalPages,
            'has_next_page' => $hasNextPage,
            'has_prev_page' => $hasPrevPage
        ]
    ]);

} catch (Exception $e) {
    error_log("Error in get_registrations.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'An error occurred while fetching registrations: ' . $e->getMessage()
    ]);
} finally {
    if (isset($stmt)) $stmt->close();
    if (isset($db)) $db->close();
}
?> 
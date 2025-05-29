<?php
session_start();

if (!isset($_SESSION['admin_id'])) {
    header("Location: index.php");
    exit();
}

require_once '../../config/db_config.php';
$conn = getDBConnection();

$search_input = '';   // Raw user input (no %)
$search_results = [];
$delete_success = null;
$delete_error = null;

// Handle search
if (isset($_GET['search']) && !empty(trim($_GET['search']))) {
    $search_input = trim($_GET['search']);
    $like_search = "%" . $search_input . "%";

    $stmt = $conn->prepare("SELECT * FROM teller 
                            WHERE first_name LIKE ? 
                            OR last_name LIKE ? 
                            OR email LIKE ? 
                            OR CAST(teller_number AS CHAR) LIKE ? 
                            ORDER BY teller_number");
    $stmt->bind_param("ssss", $like_search, $like_search, $like_search, $like_search);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $search_results[] = $row;
        }
    }
} else {
    $sql = "SELECT * FROM teller ORDER BY teller_number";
    $result = mysqli_query($conn, $sql);

    if ($result) {
        while ($row = mysqli_fetch_assoc($result)) {
            $search_results[] = $row;
        }
    }
}

// Handle deletion
if (isset($_POST['delete_teller']) && !empty($_POST['teller_id'])) {
    $teller_id = intval($_POST['teller_id']);
    $admin_id = intval($_SESSION['admin_id']);

    // Log admin action
    $log_sql = "INSERT INTO admin_activity_log (admin_id, action_type, affected_teller, details) 
                VALUES (?, 'suspend_teller', ?, 'Teller deleted by admin')";
    $log_stmt = $conn->prepare($log_sql);
    $log_stmt->bind_param("ii", $admin_id, $teller_id);
    $log_stmt->execute();

    // Delete teller
    $delete_stmt = $conn->prepare("DELETE FROM teller WHERE teller_number = ?");
    $delete_stmt->bind_param("i", $teller_id);
    $delete_stmt->execute();

    if ($delete_stmt->affected_rows > 0) {
        $delete_success = "Teller #$teller_id has been deleted successfully.";
    } else {
        $delete_error = "Error deleting teller or teller not found.";
    }

    // Refresh search results after deletion
    if ($search_input !== '') {
        $like_search = "%" . $search_input . "%";
        $stmt = $conn->prepare("SELECT * FROM teller 
                                WHERE first_name LIKE ? 
                                OR last_name LIKE ? 
                                OR email LIKE ? 
                                OR CAST(teller_number AS CHAR) LIKE ? 
                                ORDER BY teller_number");
        $stmt->bind_param("ssss", $like_search, $like_search, $like_search, $like_search);
        $stmt->execute();
        $result = $stmt->get_result();

        $search_results = [];
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $search_results[] = $row;
            }
        }
    } else {
        $search_results = [];
        $sql = "SELECT * FROM teller ORDER BY teller_number";
        $result = mysqli_query($conn, $sql);
        if ($result) {
            while ($row = mysqli_fetch_assoc($result)) {
                $search_results[] = $row;
            }
        }
    }
}

mysqli_close($conn);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Admin Dashboard - StackOverCash Bank</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/css/all.min.css" />
</head>
<body>
    <div class="container-fluid">
        <div class="row">
            <!-- Sidebar omitted for brevity, same as before -->
            <div class="col-md-2 sidebar bg-light vh-100">
                <div class="text-center my-4">
                    <h4>StackOverCash</h4>
                    <p>Admin Portal</p>
                </div>
                <ul class="nav flex-column">
                    <li class="nav-item">
                        <a class="nav-link active" href="dashboard.php">
                            <i class="fas fa-tachometer-alt mr-2"></i> Dashboard
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="create_teller.php">
                            <i class="fas fa-user-plus mr-2"></i> Create Teller
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="logout.php">
                            <i class="fas fa-sign-out-alt mr-2"></i> Logout
                        </a>
                    </li>
                </ul>
            </div>

            <!-- Main Content -->
            <div class="col-md-10 content-area p-4">
                <h2 class="dashboard-title mb-4">Teller Management</h2>
                
                <?php if ($delete_success): ?>
                    <div class="alert alert-success"><?php echo htmlspecialchars($delete_success); ?></div>
                <?php endif; ?>
                
                <?php if ($delete_error): ?>
                    <div class="alert alert-danger"><?php echo htmlspecialchars($delete_error); ?></div>
                <?php endif; ?>
                
                <!-- Search Box -->
                <div class="search-box mb-3">
                    <form method="GET" action="" class="form-inline">
                        <div class="input-group w-100">
                            <input type="text" class="form-control" placeholder="Search tellers by name, ID, or email" 
                                   name="search" value="<?php echo htmlspecialchars($search_input); ?>">
                            <div class="input-group-append">
                                <button class="btn btn-primary" type="submit">Search</button>
                                <?php if ($search_input !== ''): ?>
                                    <a href="dashboard.php" class="btn btn-secondary">Clear</a>
                                <?php endif; ?>
                            </div>
                        </div>
                    </form>
                </div>
                
                <!-- Tellers Table -->
                <div class="table-responsive">
                    <table class="table table-striped table-bordered">
                        <thead class="thead-dark">
                            <tr>
                                <th>Teller Number</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Created At</th>
                                <th>Last Login</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($search_results)): ?>
                                <tr>
                                    <td colspan="7" class="text-center">No tellers found</td>
                                </tr>
                            <?php else: ?>
                                <?php foreach ($search_results as $teller): ?>
                                    <tr>
                                        <td><?php echo htmlspecialchars($teller['teller_number']); ?></td>
                                        <td><?php echo htmlspecialchars($teller['first_name'] . ' ' . $teller['last_name']); ?></td>
                                        <td><?php echo htmlspecialchars($teller['email'] ?: 'N/A'); ?></td>
                                        <td>
                                            <?php if ($teller['status'] === 'active'): ?>
                                                <span class="badge badge-success">Active</span>
                                            <?php elseif ($teller['status'] === 'inactive'): ?>
                                                <span class="badge badge-warning">Inactive</span>
                                            <?php else: ?>
                                                <span class="badge badge-danger">Suspended</span>
                                            <?php endif; ?>
                                        </td>
                                        <td><?php echo htmlspecialchars(date('M d, Y', strtotime($teller['created_at']))); ?></td>
                                        <td><?php echo $teller['last_login'] ? htmlspecialchars(date('M d, Y', strtotime($teller['last_login']))) : 'Never'; ?></td>
                                        <td class="action-btns">
                                            <a href="edit_teller.php?id=<?php echo urlencode($teller['teller_number']); ?>" class="btn btn-sm btn-info" title="Edit Teller">
                                                <i class="fas fa-edit"></i>
                                            </a>
                                            <button type="button" class="btn btn-sm btn-danger" 
                                                    data-toggle="modal" data-target="#deleteModal" 
                                                    data-teller-id="<?php echo htmlspecialchars($teller['teller_number']); ?>"
                                                    data-teller-name="<?php echo htmlspecialchars($teller['first_name'] . ' ' . $teller['last_name']); ?>"
                                                    title="Delete Teller">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- Delete Confirmation Modal (same as before) -->
    <div class="modal fade" id="deleteModal" tabindex="-1" role="dialog" aria-labelledby="deleteModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="deleteModalLabel">Confirm Delete</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    Are you sure you want to delete this teller? This action cannot be undone.
                    <p class="mt-2"><strong>Teller: <span id="tellerToDelete"></span></strong></p>
                </div>
                <div class="modal-footer">
                    <form method="POST" action="">
                        <input type="hidden" name="teller_id" id="tellerIdToDelete" required>
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                        <button type="submit" name="delete_teller" class="btn btn-danger">Delete</button>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <!-- Bootstrap & jQuery -->
    <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.5.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="./assets/scripts/dashboard.js"></script>
</body>
</html>

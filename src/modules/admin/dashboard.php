<?php
// Start session
session_start();

// Check if logged in
if (!isset($_SESSION['admin_id'])) {
    header("Location: index.php");
    exit();
}

require_once '../../config/db_config.php';
$conn = getDBConnection();

// Process search
$search_query = '';
$search_results = [];
if (isset($_GET['search']) && !empty($_GET['search'])) {
    $search_query = mysqli_real_escape_string($conn, $_GET['search']);
    $search_sql = "SELECT * FROM teller 
                  WHERE teller_number LIKE '%$search_query%' 
                  OR first_name LIKE '%$search_query%' 
                  OR last_name LIKE '%$search_query%' 
                  OR email LIKE '%$search_query%'
                  ORDER BY teller_number";
} else {
    // Default: get all tellers
    $search_sql = "SELECT * FROM teller ORDER BY teller_number";
}

$result = mysqli_query($conn, $search_sql);
if ($result) {
    while ($row = mysqli_fetch_assoc($result)) {
        $search_results[] = $row;
    }
}

// Process teller deletion
if (isset($_POST['delete_teller']) && !empty($_POST['teller_id'])) {
    $teller_id = mysqli_real_escape_string($conn, $_POST['teller_id']);
    
    // Log the action first
    $admin_id = $_SESSION['admin_id'];
    $log_sql = "INSERT INTO admin_activity_log (admin_id, action_type, affected_teller, details) 
                VALUES ($admin_id, 'suspend_teller', $teller_id, 'Teller deleted by admin')";
    mysqli_query($conn, $log_sql);
    
    // Delete the teller
    $delete_sql = "DELETE FROM teller WHERE teller_number = $teller_id";
    if (mysqli_query($conn, $delete_sql)) {
        $delete_success = "Teller #$teller_id has been deleted successfully.";
        
        // Refresh search results
        $result = mysqli_query($conn, $search_sql);
        $search_results = [];
        if ($result) {
            while ($row = mysqli_fetch_assoc($result)) {
                $search_results[] = $row;
            }
        }
    } else {
        $delete_error = "Error deleting teller: " . mysqli_error($conn);
    }
}

mysqli_close($conn);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - StackOverCash Bank</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/css/all.min.css">
</head>
<body>
    <div class="container-fluid">
        <div class="row">
            <!-- Sidebar -->
            <div class="col-md-2 sidebar">
                <div class="text-center mb-4">
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
            <div class="col-md-10 content-area">
                <h2 class="dashboard-title">Teller Management</h2>
                
                <?php if(isset($delete_success)): ?>
                    <div class="alert alert-success"><?php echo $delete_success; ?></div>
                <?php endif; ?>
                
                <?php if(isset($delete_error)): ?>
                    <div class="alert alert-danger"><?php echo $delete_error; ?></div>
                <?php endif; ?>
                
                <!-- Search Box -->
                <div class="search-box">
                    <form method="GET" action="" class="form-inline">
                        <div class="input-group w-100">
                            <input type="text" class="form-control" placeholder="Search tellers by name, ID, or email" 
                                   name="search" value="<?php echo htmlspecialchars($search_query); ?>">
                            <div class="input-group-append">
                                <button class="btn btn-primary" type="submit">Search</button>
                                <?php if(!empty($search_query)): ?>
                                    <a href="dashboard.php" class="btn btn-secondary">Clear</a>
                                <?php endif; ?>
                            </div>
                        </div>
                    </form>
                </div>
                
                <!-- Tellers Table -->
                <div class="table-responsive">
                    <table class="table table-striped">
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
                            <?php if(empty($search_results)): ?>
                                <tr>
                                    <td colspan="7" class="text-center">No tellers found</td>
                                </tr>
                            <?php else: ?>
                                <?php foreach($search_results as $teller): ?>
                                    <tr>
                                        <td><?php echo $teller['teller_number']; ?></td>
                                        <td><?php echo $teller['first_name'] . ' ' . $teller['last_name']; ?></td>
                                        <td><?php echo $teller['email'] ? $teller['email'] : 'N/A'; ?></td>
                                        <td>
                                            <?php if($teller['status'] == 'active'): ?>
                                                <span class="badge badge-success">Active</span>
                                            <?php elseif($teller['status'] == 'inactive'): ?>
                                                <span class="badge badge-warning">Inactive</span>
                                            <?php else: ?>
                                                <span class="badge badge-danger">Suspended</span>
                                            <?php endif; ?>
                                        </td>
                                        <td><?php echo date('M d, Y', strtotime($teller['created_at'])); ?></td>
                                        <td><?php echo $teller['last_login'] ? date('M d, Y', strtotime($teller['last_login'])) : 'Never'; ?></td>
                                        <td class="action-btns">
                                            <a href="edit_teller.php?id=<?php echo $teller['teller_number']; ?>" class="btn btn-sm btn-info">
                                                <i class="fas fa-edit"></i>
                                            </a>
                                            <button type="button" class="btn btn-sm btn-danger" 
                                                    data-toggle="modal" data-target="#deleteModal" 
                                                    data-teller-id="<?php echo $teller['teller_number']; ?>"
                                                    data-teller-name="<?php echo $teller['first_name'] . ' ' . $teller['last_name']; ?>">
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
    
    <!-- Delete Confirmation Modal -->
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
                        <input type="hidden" name="teller_id" id="tellerIdToDelete">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                        <button type="submit" name="delete_teller" class="btn btn-danger">Delete Teller</button>
                    </form>
                </div>
            </div>
        </div>
    </div>
    
    <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.5.3/dist/umd/popper.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
    <script>
        $(document).ready(function() {
            $('#deleteModal').on('show.bs.modal', function(event) {
                var button = $(event.relatedTarget);
                var tellerId = button.data('teller-id');
                var tellerName = button.data('teller-name');
                
                var modal = $(this);
                modal.find('#tellerIdToDelete').val(tellerId);
                modal.find('#tellerToDelete').text('#' + tellerId + ' - ' + tellerName);
            });
        });
    </script>
</body>
</html>
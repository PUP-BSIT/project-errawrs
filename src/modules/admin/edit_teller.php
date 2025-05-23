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

// Check if teller ID is provided
if (!isset($_GET['id']) || empty($_GET['id'])) {
    header("Location: dashboard.php");
    exit();
}

$teller_id = mysqli_real_escape_string($conn, $_GET['id']);

// Get teller details
$sql = "SELECT * FROM teller WHERE teller_number = $teller_id";
$result = mysqli_query($conn, $sql);

if (mysqli_num_rows($result) == 0) {
    // Teller not found
    header("Location: dashboard.php");
    exit();
}

$teller = mysqli_fetch_assoc($result);

// Process form submission
$success_message = '';
$error_message = '';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Validate and sanitize input
    $first_name = mysqli_real_escape_string($conn, $_POST['first_name']);
    $last_name = mysqli_real_escape_string($conn, $_POST['last_name']);
    $email = !empty($_POST['email']) ? mysqli_real_escape_string($conn, $_POST['email']) : null;
    $status = mysqli_real_escape_string($conn, $_POST['status']);
    
    // Check password update
    $password_update = '';
    if (!empty($_POST['password'])) {
        $password = mysqli_real_escape_string($conn, $_POST['password']);
        $confirm_password = $_POST['confirm_password'];
        
        if ($password !== $confirm_password) {
            $error_message = "Passwords do not match.";
        } else {
            $password_update = ", password = '$password'";
        }
    }
    
    // Validate inputs
    if (empty($first_name) || empty($last_name)) {
        $error_message = "First name and last name are required fields.";
    } elseif (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error_message = "Please enter a valid email address.";
    } else {
        // Check if email already exists (if provided and different from current)
        if (!empty($email) && $email !== $teller['email']) {
            $check_email = "SELECT teller_number FROM teller WHERE email = '$email' AND teller_number != $teller_id";
            $result = mysqli_query($conn, $check_email);
            
            if (mysqli_num_rows($result) > 0) {
                $error_message = "Email address is already in use by another teller.";
            }
        }
        
        // If no errors, proceed with update
        if (empty($error_message)) {
            $admin_id = $_SESSION['admin_id'];
            $email_value = !empty($email) ? "'$email'" : "NULL";
            
            // Update the teller
            $update_sql = "UPDATE teller 
                           SET first_name = '$first_name', 
                               last_name = '$last_name', 
                               email = $email_value, 
                               status = '$status'
                               $password_update
                           WHERE teller_number = $teller_id";
            
            if (mysqli_query($conn, $update_sql)) {
                // Log the action
                $log_sql = "INSERT INTO admin_activity_log (admin_id, action_type, affected_teller, details) 
                            VALUES ($admin_id, 'update_teller', $teller_id, 'Teller information updated')";
                mysqli_query($conn, $log_sql);
                
                $success_message = "Teller information updated successfully!";
                
                // Refresh teller data
                $result = mysqli_query($conn, "SELECT * FROM teller WHERE teller_number = $teller_id");
                $teller = mysqli_fetch_assoc($result);
            } else {
                $error_message = "Error updating teller: " . mysqli_error($conn);
            }
        }
    }
}

mysqli_close($conn);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Teller - StackOverCash Bank</title>
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
                        <a class="nav-link" href="dashboard.php">
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
                <h2 class="dashboard-title">
                    Edit Teller #<?php echo $teller_id; ?>
                    <a href="dashboard.php" class="btn btn-sm btn-secondary float-right">
                        <i class="fas fa-arrow-left mr-1"></i> Back to Dashboard
                    </a>
                </h2>
                
                <?php if(!empty($success_message)): ?>
                    <div class="alert alert-success"><?php echo $success_message; ?></div>
                <?php endif; ?>
                
                <?php if(!empty($error_message)): ?>
                    <div class="alert alert-danger"><?php echo $error_message; ?></div>
                <?php endif; ?>
                
                <div class="form-section">
                    <form method="POST" action="">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="first_name">First Name <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="first_name" name="first_name" 
                                           value="<?php echo htmlspecialchars($teller['first_name']); ?>" required>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="last_name">Last Name <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="last_name" name="last_name" 
                                           value="<?php echo htmlspecialchars($teller['last_name']); ?>" required>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="email">Email Address (Optional)</label>
                            <input type="email" class="form-control" id="email" name="email" 
                                   value="<?php echo htmlspecialchars($teller['email'] ?? ''); ?>">
                            <small class="form-text text-muted">Leave blank if not applicable</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="status">Status</label>
                            <select class="form-control" id="status" name="status">
                                <option value="active" <?php echo ($teller['status'] == 'active') ? 'selected' : ''; ?>>Active</option>
                                <option value="inactive" <?php echo ($teller['status'] == 'inactive') ? 'selected' : ''; ?>>Inactive</option>
                                <option value="suspended" <?php echo ($teller['status'] == 'suspended') ? 'selected' : ''; ?>>Suspended</option>
                            </select>
                        </div>
                        
                        <hr>
                        <h5>Change Password (Optional)</h5>
                        <p class="text-muted">Leave blank to keep the current password</p>
                        
                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="password">New Password</label>
                                    <input type="password" class="form-control" id="password" name="password">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="confirm_password">Confirm New Password</label>
                                    <input type="password" class="form-control" id="confirm_password" name="confirm_password">
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-group mt-4">
                            <button type="submit" class="btn btn-primary">Update Teller</button>
                            <a href="dashboard.php" class="btn btn-secondary ml-2">Cancel</a>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
    
    <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.5.3/dist/umd/popper.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
</body>
</html>
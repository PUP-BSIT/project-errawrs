<?php
session_start();
$_SESSION['error'] = '';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    require_once '../../config/db_config.php';
    $conn = getDBConnection();

    $username = mysqli_real_escape_string($conn, $_POST['username']);
    $password = $_POST['password'];

    $sql = "SELECT admin_id, username, password, first_name, last_name FROM admin WHERE username = '$username'";
    $result = mysqli_query($conn, $sql);

    if (mysqli_num_rows($result) == 1) {
        $row = mysqli_fetch_assoc($result);

        if ($password == $row['password']) {
            $_SESSION['admin_id'] = $row['admin_id'];
            $_SESSION['admin_username'] = $row['username'];
            $_SESSION['admin_name'] = $row['first_name'] . " " . $row['last_name'];

            $update_sql = "UPDATE admin SET last_login = NOW() WHERE admin_id = " . $row['admin_id'];
            mysqli_query($conn, $update_sql);

            mysqli_close($conn);
            header("Location: dashboard.php");
            exit();
        } else {
            $_SESSION['error'] = "Invalid password";
        }
    } else {
        $_SESSION['error'] = "Invalid username";
    }

    mysqli_close($conn);
    header("Location: login.php");
    exit();
}
?>

function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

function togglePasswordVisibility(inputId, toggleId) {
    const input = document.getElementById(inputId);
    const toggle = document.getElementById(toggleId);
    if (!input || !toggle) return;
    if (input.type === "password") {
        input.type = "text";
        toggle.classList.remove("fa-eye-slash");
        toggle.classList.add("fa-eye");
    } else {
        input.type = "password";
        toggle.classList.remove("fa-eye");
        toggle.classList.add("fa-eye-slash");
    }
    input.focus();
}

function showLoading() {
    document.getElementById("loadingOverlay").classList.remove("hidden");
}

function hideLoading() {
    document.getElementById("loadingOverlay").classList.add("hidden");
}

async function getTellerInfo(email) {
    try {
        const response = await fetch(
            "/api/teller/get_teller_info",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            }
        );
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching teller info:", error);
        return null;
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const teller_email = getQueryParam("teller_email");
    const messageDiv = document.getElementById("message");
    const form = document.getElementById("resetPasswordForm");
    const emailLabel = document.getElementById("email_label");
    const tellerNumberDisplay = document.getElementById("teller_number_display");

    // Set up password visibility toggles
    document
        .getElementById("password_toggle")
        .addEventListener("click", function () {
            togglePasswordVisibility("password", "password_toggle");
        });

    document
        .getElementById("confirm_password_toggle")
        .addEventListener("click", function () {
            togglePasswordVisibility(
                "confirm_password",
                "confirm_password_toggle"
            );
        });

    if (!teller_email) {
        messageDiv.innerHTML =
            '<div class="error">Invalid or missing reset link. Please check your email or contact support.</div>';
    } else {
        emailLabel.textContent = teller_email;
        // Fetch and display teller number
        getTellerInfo(teller_email)
            .then((data) => {
                if (data && data.success && data.teller_number) {
                    tellerNumberDisplay.textContent = data.teller_number;
                } else {
                    tellerNumberDisplay.textContent = "Loading...";
                }
            })
            .catch(() => {
                tellerNumberDisplay.textContent = "Unable to load";
            });
        form.classList.remove("hidden");
        form.classList.add("block");
        form.addEventListener("submit", async function (e) {
            e.preventDefault();
            const password = document.getElementById("password").value;
            const confirm = document.getElementById("confirm_password").value;
            if (password !== confirm) {
                messageDiv.innerHTML =
                    '<div class="error">Passwords do not match.</div>';
                return;
            }
            if (password.length < 8) {
                messageDiv.innerHTML =
                    '<div class="error">Password must be at least 8 characters.</div>';
                return;
            }
            showLoading();
            try {
                const res = await fetch(
                    "/api/teller/set-password",
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ teller_email, password }),
                    }
                );
                const data = await res.json();
                hideLoading();
                if (data.success) {
                    messageDiv.innerHTML =
                        '<div class="success">Your password has been reset! You can now <a href="/teller/bank_teller_login.html">log in</a>.</div>';
                    form.classList.remove("block");
                    form.classList.add("hidden");
                } else {
                    messageDiv.innerHTML = `<div class="error">${
                        data.message || "Failed to reset password."
                    }</div>`;
                }
            } catch (err) {
                hideLoading();
                messageDiv.innerHTML =
                    '<div class="error">Server error. Please try again later.</div>';
            }
        });
    }
});

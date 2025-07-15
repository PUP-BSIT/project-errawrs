function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

document.addEventListener("DOMContentLoaded", function () {
    const teller_email = getQueryParam("teller_email");
    const messageDiv = document.getElementById("message");
    const form = document.getElementById("resetPasswordForm");
    const emailInput = document.getElementById("teller_email");

    if (!teller_email) {
        messageDiv.innerHTML =
            '<div class="error">Invalid or missing reset link. Please check your email or contact support.</div>';
    } else {
        emailInput.value = teller_email;
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
            messageDiv.innerHTML = "Processing...";
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
                messageDiv.innerHTML =
                    '<div class="error">Server error. Please try again later.</div>';
            }
        });
    }
});

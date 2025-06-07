// Global state
let currentPage = 1;
const pageSize = 12;
let totalTellers = 0;
let searchTerm = "";
let searchTimeout = null;

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", init);

function init() {
    setupEventListeners();
    loadTellers();
}

function setupEventListeners() {
    // Search
    const searchInput = document.getElementById("search_teller");
    if (searchInput) {
        searchInput.addEventListener("input", handleSearch);
    }

    // Create teller button
    const createBtn = document.getElementById("create_teller_btn");
    if (createBtn) {
        createBtn.addEventListener("click", showCreateModal);
    }

    // Modal close buttons
    document.querySelectorAll(".close-btn").forEach((btn) => {
        btn.addEventListener("click", (e) =>
            closeModal(e.target.closest(".modal"))
        );
    });

    // Save teller
    const saveBtn = document.getElementById("save_btn");
    if (saveBtn) {
        saveBtn.addEventListener("click", saveTeller);
    }

    // Cancel button
    const cancelBtn = document.getElementById("cancel_btn");
    if (cancelBtn) {
        cancelBtn.addEventListener("click", () =>
            closeModal(document.getElementById("teller_modal"))
        );
    }

    // Success modal buttons
    const doneBtn = document.getElementById("done_btn");
    const createAnotherBtn = document.getElementById("create_another_btn");
    if (doneBtn) {
        doneBtn.addEventListener("click", () =>
            closeModal(document.getElementById("success_modal"))
        );
    }
    if (createAnotherBtn) {
        createAnotherBtn.addEventListener("click", () => {
            closeModal(document.getElementById("success_modal"));
            showCreateModal();
        });
    }

    // Password toggle buttons
    document.querySelectorAll(".password-toggle").forEach((btn) => {
        btn.addEventListener("click", togglePasswordVisibility);
    });

    // Logout
    const logoutBtn = document.getElementById("logout_btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", handleLogout);
    }

    // Form validation
    const form = document.getElementById("teller_form");
    if (form) {
        const inputs = form.querySelectorAll("input");
        inputs.forEach((input) => {
            input.addEventListener("input", (e) => {
                validateInput(e.target);
                updateCreateButtonState();
            });
            input.addEventListener("blur", (e) => {
                validateInput(e.target);
                updateCreateButtonState();
            });
        });

        // Email validation
        const emailInput = document.getElementById("email");
        if (emailInput) {
            emailInput.addEventListener("blur", async (e) => {
                await checkEmailUniqueness(e.target);
                updateCreateButtonState();
            });
        }

        // Password validation
        const passwordInput = document.getElementById("password");
        if (passwordInput) {
            passwordInput.addEventListener("input", (e) => {
                validatePassword(e.target);
                updateCreateButtonState();
            });
        }
    }
}

function handleSearch(e) {
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }

    searchTerm = e.target.value.trim();
    searchTimeout = setTimeout(() => {
        currentPage = 1;
        loadTellers();
    }, 300);
}

async function loadTellers() {
    try {
        const container = document.getElementById("teller_cards");
        if (!container) return;

        container.classList.add("loading");

        const params = new URLSearchParams({
            page: currentPage,
            limit: pageSize,
            search: searchTerm,
        });

        const response = await fetch(
            `/project-errawrs/src/api/admin/list_tellers.php?${params}`,
            {
                credentials: "include",
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch tellers: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            totalTellers = data.total || 0;
            displayTellers(data.tellers || []);
            updatePagination();
        } else {
            throw new Error(data.message || "Failed to load tellers");
        }
    } catch (error) {
        console.error("Error loading tellers:", error);
        showToast("Failed to load tellers. Please try again.", "error");
    } finally {
        const container = document.getElementById("teller_cards");
        if (container) {
            container.classList.remove("loading");
        }
    }
}

function displayTellers(tellers) {
    const container = document.getElementById("teller_cards");
    if (!container) return;

    if (tellers.length === 0) {
        container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>No tellers found</p>
                </div>`;
        return;
    }

    container.innerHTML = tellers
        .map(
            (teller) => `
            <div class="teller-card">
                <button class="action-btn edit" onclick="editTeller(${
                    teller.teller_id
                })" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn toggle-status ${
                    teller.status === "active" ? "warning" : "success"
                }" 
                        onclick="toggleTellerStatus(${teller.teller_id}, '${
                teller.status
            }')" 
                        title="${
                            teller.status === "active"
                                ? "Deactivate"
                                : "Activate"
                        }">
                    <i class="fas fa-power-off"></i>
                </button>
                <div class="teller-header">
                    <div class="teller-info">
                        <h3>${teller.first_name} ${teller.last_name}</h3>
                        <div class="teller-number">${
                            teller.teller_number || "No Number Assigned"
                        }</div>
                    </div>
                    <span class="status-badge ${
                        teller.status === "active"
                            ? "status-active"
                            : "status-inactive"
                    }">
                        ${teller.status}
                    </span>
                </div>
                <div class="teller-details">
                    <div class="detail-row">
                        <span class="detail-label">Email:</span>
                        <span class="detail-value">${teller.email}</span>
                    </div>
                </div>
            </div>
        `
        )
        .join("");
}

function updatePagination() {
    const container = document.getElementById("pagination");
    if (!container) return;

    const totalPages = Math.ceil(totalTellers / pageSize);

    let html = "";

    // Previous button
    html += `
        <button ${currentPage <= 1 ? "disabled" : ""} 
                onclick="changePage(${currentPage - 1})">
                Previous
            </button>`;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        html += `
            <button class="${i === currentPage ? "active" : ""}"
                    onclick="changePage(${i})">
                    ${i}
                </button>`;
    }

    // Next button
    html += `
        <button ${currentPage >= totalPages ? "disabled" : ""} 
                onclick="changePage(${currentPage + 1})">
                Next
            </button>`;

    container.innerHTML = html;
}

function showCreateModal() {
    const modal = document.getElementById("teller_modal");
    if (!modal) return;

    // Reset form
    const form = document.getElementById("teller_form");
    if (form) {
        form.reset();
        // Reset validation classes
        form.querySelectorAll("input").forEach((input) => {
            input.classList.remove("valid", "invalid");
        });
        // Clear teller ID
        document.getElementById("teller_id").value = "";
    }

    // Update modal title and button text
    const title = document.getElementById("modal_title");
    const saveBtn = document.getElementById("save_btn");
    if (title) {
        title.textContent = "Create New Teller";
    }
    if (saveBtn) {
        saveBtn.textContent = "Create Teller";
        saveBtn.disabled = true;
        saveBtn.classList.remove("valid-form");
    }

    // Show modal
    modal.classList.add("show");
}

async function editTeller(tellerId) {
    try {
        const response = await fetch(
            `/project-errawrs/src/api/admin/get_teller.php?id=${tellerId}`,
            {
                credentials: "include",
            }
        );

        if (!response.ok) {
            throw new Error("Failed to fetch teller details");
        }

        const data = await response.json();

        if (data.success) {
            const modal = document.getElementById("teller_modal");
            const form = document.getElementById("teller_form");
            const saveBtn = document.getElementById("save_btn");

            if (modal && form && saveBtn) {
                // Populate form
                document.getElementById("teller_id").value =
                    data.teller.teller_id;
                document.getElementById("first_name").value =
                    data.teller.first_name;
                document.getElementById("last_name").value =
                    data.teller.last_name;
                document.getElementById("email").value = data.teller.email;

                // Clear password field and mark it as valid since it's optional in edit mode
                const passwordInput = document.getElementById("password");
                passwordInput.value = "";
                passwordInput.classList.add("valid");

                // Mark all other fields as valid since they're populated
                form.querySelectorAll(
                    'input:not([type="hidden"]):not([type="password"])'
                ).forEach((input) => {
                    input.classList.add("valid");
                });

                // Update modal title and button text
                document.getElementById("modal_title").textContent =
                    "Edit Teller";
                saveBtn.textContent = "Update Teller";

                // Enable save button since all required fields are valid
                saveBtn.disabled = false;
                saveBtn.classList.add("valid-form");

                // Show modal
                modal.classList.add("show");
            }
        } else {
            throw new Error(data.message || "Failed to load teller details");
        }
    } catch (error) {
        console.error("Error loading teller details:", error);
        showToast(error.message, "error");
    }
}

async function saveTeller() {
    try {
        const form = document.getElementById("teller_form");
        if (!form) return;

        // Get form data
        const tellerId = document.getElementById("teller_id").value;
        const isEdit = !!tellerId;
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirm_password").value;

        // Validate passwords match in create mode or when password is provided in edit mode
        if (!isEdit || (isEdit && password)) {
            if (password !== confirmPassword) {
                showToast("Passwords do not match", "error");
                return;
            }
            
            // Validate password strength
            const hasUpperCase = /[A-Z]/.test(password);
            const hasLowerCase = /[a-z]/.test(password);
            const hasNumber = /[0-9]/.test(password);
            const isLongEnough = password.length >= 8;

            if (!hasUpperCase || !hasLowerCase || !hasNumber || !isLongEnough) {
                showToast("Password must be at least 8 characters with uppercase, lowercase, and number", "error");
                return;
            }
        }

        // In edit mode, only validate password if it's provided
        if (isEdit && !password) {
            document.getElementById("password").classList.add("valid");
            document.getElementById("confirm_password").classList.add("valid");
        }

        // Validate all inputs except password in edit mode
        const inputs = form.querySelectorAll('input:not([type="hidden"])');
        let isValid = true;
        inputs.forEach((input) => {
            if ((input.type === "password" && isEdit && !password) ||
                (input.id === "confirm_password" && isEdit && !password)) {
                // Skip password validation in edit mode if empty
                return;
            }
            if (!validateInput(input)) {
                isValid = false;
            }
        });

        if (!isValid) {
            showToast("Please fill all required fields correctly", "error");
            return;
        }

        const formData = {
            first_name: document.getElementById("first_name").value.trim(),
            last_name: document.getElementById("last_name").value.trim(),
            email: document.getElementById("email").value.trim(),
        };

        if (isEdit) {
            formData.teller_id = tellerId;
            if (password) {
                formData.password = password;
            }
        } else {
            formData.password = password;
        }

        const response = await fetch(
            `/project-errawrs/src/api/admin/${
                isEdit ? "update" : "create"
            }_teller.php`,
            {
                method: isEdit ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify(formData),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to ${isEdit ? "update" : "create"} teller`);
        }

        const data = await response.json();

        if (data.success) {
            // Close teller modal
            closeModal(document.getElementById("teller_modal"));

            // Show success message
            showSuccessModal(data.teller, isEdit);

            // Refresh teller list
            loadTellers();
        } else {
            throw new Error(
                data.message ||
                    `Failed to ${isEdit ? "update" : "create"} teller`
            );
        }
    } catch (error) {
        console.error("Error saving teller:", error);
        showToast(error.message, "error");
    }
}

async function toggleTellerStatus(tellerId, currentStatus) {
    try {
        const confirmMessage =
            currentStatus === "active"
                ? "Are you sure you want to deactivate this teller?"
                : "Are you sure you want to activate this teller?";

        if (!confirm(confirmMessage)) {
            return;
        }

        const response = await fetch(
            "/project-errawrs/src/api/admin/toggle_teller_status.php",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ teller_id: tellerId }),
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to update status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            showToast(
                `Teller ${
                    data.status === "active" ? "activated" : "deactivated"
                } successfully`,
                "success"
            );
            await loadTellers();
        } else {
            throw new Error(data.message || "Failed to update teller status");
        }
    } catch (error) {
        console.error("Error toggling teller status:", error);
        showToast(error.message, "error");
    }
}

function showSuccessModal(teller, isEdit) {
    const modal = document.getElementById("success_modal");
    if (!modal) return;

    // Update success message
    document.getElementById("success_message").textContent = isEdit
        ? "Teller updated successfully!"
        : "Teller created successfully!";

    // Update teller details
    document.getElementById("success_teller_number").textContent =
        teller.teller_number;
    document.getElementById(
        "success_teller_name"
    ).textContent = `${teller.first_name} ${teller.last_name}`;
    document.getElementById("success_teller_email").textContent = teller.email;

    // Show/hide create another button
    const createAnotherBtn = document.getElementById("create_another_btn");
    if (createAnotherBtn) {
        createAnotherBtn.style.display = isEdit ? "none" : "block";
    }

    // Show modal
    modal.classList.add("show");
}

function closeModal(modal) {
    if (modal) {
        modal.classList.remove("show");
    }
}

function togglePasswordVisibility(e) {
    const button = e.target.closest('.password-toggle');
    if (!button) return;
    
    const targetId = button.getAttribute('data-target');
    const input = document.getElementById(targetId);
    const icon = button.querySelector('i');

    if (input && icon) {
        if (input.type === "password") {
            input.type = "text";
            icon.classList.remove("fa-eye-slash");
            icon.classList.add("fa-eye");
        } else {
            input.type = "password";
            icon.classList.remove("fa-eye");
            icon.classList.add("fa-eye-slash");
        }
    }
}

function showToast(message, type = "info") {
    const container = document.querySelector(".toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    toast.innerHTML = `
        <i class="${getToastIcon(type)}"></i>
            <span>${message}</span>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;

    container.appendChild(toast);

    // Add close button functionality
    const closeBtn = toast.querySelector(".toast-close");
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            toast.remove();
        });
    }

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast && toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

function getToastIcon(type) {
    switch (type) {
        case "success":
            return "fas fa-check-circle";
        case "error":
            return "fas fa-exclamation-circle";
        case "warning":
            return "fas fa-exclamation-triangle";
        default:
            return "fas fa-info-circle";
    }
}

function validateInput(input) {
    input.classList.remove("valid", "invalid");

    if (input.value.trim() === "") {
        input.classList.add("invalid");
        return false;
    }

    if (input.type === "email") {
        if (!isValidEmail(input.value)) {
            input.classList.add("invalid");
            return false;
        }
    }

    if (input.type !== "password") {
        input.classList.add("valid");
    }
    return true;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

async function checkEmailUniqueness(input) {
    try {
        const email = input.value.trim();
        if (!email || !isValidEmail(email)) {
            input.classList.add("invalid");
            return;
        }

        const response = await fetch(
            `/project-errawrs/src/api/admin/check_email.php?email=${encodeURIComponent(
                email
            )}`,
            {
                credentials: "include",
            }
        );

        if (!response.ok) {
            throw new Error("Failed to check email");
        }

        const data = await response.json();

        if (data.exists) {
            input.classList.remove("valid");
            input.classList.add("invalid");
            const helpText = input.nextElementSibling;
            if (helpText) {
                helpText.textContent = "This email is already in use";
            }
        } else {
            input.classList.remove("invalid");
            input.classList.add("valid");
            const helpText = input.nextElementSibling;
            if (helpText) {
                helpText.textContent = "Please enter a valid email address";
            }
        }
    } catch (error) {
        console.error("Error checking email:", error);
    }
}

function validatePassword(input) {
    const password = input.value;
    const helpText = input.parentElement.nextElementSibling;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const isLongEnough = password.length >= 8;

    input.classList.remove("valid", "invalid");

    if (password) {
        if (hasUpperCase && hasLowerCase && hasNumber && isLongEnough) {
            input.classList.add("valid");
        } else {
            input.classList.add("invalid");
            let errorMessage = "Password must contain: ";
            const missing = [];
            if (!isLongEnough) missing.push("at least 8 characters");
            if (!hasUpperCase) missing.push("uppercase letter");
            if (!hasLowerCase) missing.push("lowercase letter");
            if (!hasNumber) missing.push("number");
            helpText.textContent = errorMessage + missing.join(", ");
        }
    } else {
        input.classList.add("invalid");
        helpText.textContent = "Password is required";
    }
}

function updateCreateButtonState() {
    const saveBtn = document.getElementById("save_btn");
    if (!saveBtn) return;

    const form = document.getElementById("teller_form");
    if (!form) return;

    const inputs = form.querySelectorAll('input:not([type="hidden"])');
    let allValid = true;

    // Check if all inputs are valid
    inputs.forEach((input) => {
        if (!input.classList.contains("valid")) {
            allValid = false;
        }
    });

    // Update button state
    saveBtn.disabled = !allValid;
    if (allValid) {
        saveBtn.classList.add("valid-form");
    } else {
        saveBtn.classList.remove("valid-form");
    }
}

function changePage(page) {
    currentPage = page;
    loadTellers();
}

function handleLogout(e) {
    e.preventDefault();

    // Clear session storage
    sessionStorage.clear();

    // Redirect to login page
    window.location.href = "/project-errawrs/public/admin/login.html";
}

// Make functions globally available
window.editTeller = editTeller;
window.toggleTellerStatus = toggleTellerStatus;
window.changePage = changePage;

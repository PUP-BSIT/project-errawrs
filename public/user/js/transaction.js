// DOM Elements
const transaction_table_body = document.getElementById(
    'transaction-table-body'
);
const previous_page_button = document.getElementById('previous-page-button');
const next_page_button = document.getElementById('next-page-button');
const page_numbers_container = document.getElementById('page-numbers');
const items_per_page_select = document.getElementById('items-per-page');
const showing_info_span = document.getElementById('showing-info');
const go_button = document.getElementById('go-button');

// DOM Elements for Profile Edit
const user_avatar_container = document.getElementById('user_avatar_container');
// DOM Elements for Sidebar Profile Info (assuming they exist in transaction.html)
const user_name_element = document.getElementById('user_name');
const welcome_user_name_element = document.getElementById('welcome_user_name'); // Assuming this element might be on transaction page for consistency

// State for Pagination
let currentPage = 1;
let itemsPerPage = parseInt(
    items_per_page_select ? items_per_page_select.value : 10,
    10
); // Default 10 if select not found
let totalTransactions = 0;
let totalPages = 0;

// State
let user_data = {}; // Add user_data state

// Function to show a notification (Assuming this is a shared function or needs to be added)
function showNotification(message, type) {
    if (!notification_container) return;

    const notification = document.createElement('div');
    notification.classList.add('notification', type);

    let icon = '';
    switch (type) {
        case 'success':
            icon = 'fas fa-check-circle';
            break;
        case 'error':
            icon = 'fas fa-times-circle';
            break;
        case 'info':
            icon = 'fas fa-info-circle';
            break;
        default:
            icon = 'fas fa-bell';
    }

    notification.innerHTML = `
         <i class="${icon}"></i>
         <span>${message}</span>
     `;

    notification_container.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Fetch user data from API
async function fetchUserData() {
    try {
        const response = await fetch(
            '/project-errawrs/src/api/user/profile.php'
        );
        const data = await response.json();

        if (data.success) {
            user_data = data.user; // Store user data in state
            // Update displayed name and initial if elements exist
            if (user_name_element)
                user_name_element.textContent =
                    `${user_data.first_name} ${user_data.last_name}`.trim();
            if (welcome_user_name_element)
                welcome_user_name_element.textContent = user_data.first_name;
            display_user_initial(); // Update the initial
        } else {
            showNotification(
                data.error || 'Failed to fetch user data',
                'error'
            );
        }
    } catch (error) {
        showNotification('Error fetching user data', 'error');
        console.error('Error:', error);
    }
}

// Fetch transaction data from API
async function fetchTransactions() {
    try {
        // Assuming API endpoint /api/user/transactions that supports pagination
        const response = await fetch(
            `/project-errawrs/src/api/user/transactions.php?page=${currentPage}&limit=${itemsPerPage}`
        );
        const data = await response.json();

        if (data.success) {
            totalTransactions = data.total || 0; // Assuming API returns total count
            totalPages = Math.ceil(totalTransactions / itemsPerPage);
            renderTransactions(data.transactions || []); // Assuming API returns 'transactions' array
            updatePaginationInfo();
            updatePaginationButtons();
            renderPageNumbers(); // Render page number links
        } else {
            showNotification(
                data.error || 'Failed to fetch transactions',
                'error'
            );
            renderTransactions([]); // Clear table on error
            totalTransactions = 0;
            totalPages = 0;
            updatePaginationInfo();
            updatePaginationButtons();
            renderPageNumbers();
        }
    } catch (error) {
        showNotification('Error fetching transactions', 'error');
        console.error('Error:', error);
        renderTransactions([]); // Clear table on error
        totalTransactions = 0;
        totalPages = 0;
        updatePaginationInfo();
        updatePaginationButtons();
        renderPageNumbers();
    }
}

// Render transactions in the table
function renderTransactions(transactions) {
    if (!transaction_table_body) return;

    transaction_table_body.innerHTML = ''; // Clear existing rows

    if (transactions.length === 0) {
        transaction_table_body.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px;">No transactions found.</td>
            </tr>
        `;
        return;
    }

    transactions.forEach((transaction) => {
        const row = document.createElement('tr');
        // Assuming transaction object has properties like date, account_number, amount, description, status
        const amount = parseFloat(transaction.amount);
        const amountClass = amount >= 0 ? 'positive' : 'negative';

        row.innerHTML = `
            <td>${transaction.date || 'N/A'}</td>
            <td>${transaction.account_number || 'N/A'}</td>
            <td class="${amountClass}">₱ ${amount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}</td>
            <td>${transaction.description || 'N/A'}</td>
            <td><span class="status-${(
                transaction.status || 'unknown'
            ).toLowerCase()}">${transaction.status || 'Unknown'}</span></td>
        `;
        transaction_table_body.appendChild(row);
    });
}

// Update pagination information text (e.g., "Showing 1 to 10 of 50")
function updatePaginationInfo() {
    if (!showing_info_span) return;

    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(start + itemsPerPage - 1, totalTransactions); // Correct calculation for end item

    if (totalTransactions === 0) {
        showing_info_span.textContent = 'Showing 0 of 0';
    } else {
        showing_info_span.textContent = `Showing ${start} to ${end} of ${totalTransactions}`;
    }
}

// Update state of pagination buttons (Previous/Next)
function updatePaginationButtons() {
    if (previous_page_button) {
        previous_page_button.disabled = currentPage === 1;
    }
    if (next_page_button) {
        next_page_button.disabled =
            currentPage === totalPages || totalPages === 0; // Disable next if on last page or no pages
    }
}

// Render clickable page numbers
function renderPageNumbers() {
    if (!page_numbers_container) return;

    page_numbers_container.innerHTML = ''; // Clear existing page numbers

    // Display a limited number of page links around the current page
    const maxPageLinks = 5; // Max number of page links to show
    let startPage = Math.max(1, currentPage - Math.floor(maxPageLinks / 2));
    let endPage = Math.min(totalPages, startPage + maxPageLinks - 1);

    // Adjust startPage if endPage is capped
    if (endPage - startPage + 1 < maxPageLinks && totalPages >= maxPageLinks) {
        startPage = Math.max(1, endPage - maxPageLinks + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageLink = document.createElement('span');
        pageLink.classList.add('page-number');
        if (i === currentPage) {
            pageLink.classList.add('active');
        }
        pageLink.textContent = i;
        pageLink.dataset.page = i; // Store page number in data attribute
        pageLink.addEventListener('click', handlePageClick); // Add click listener
        page_numbers_container.appendChild(pageLink);
    }
}

// Handle click on a page number
function handlePageClick(event) {
    const page = parseInt(event.target.dataset.page, 10);
    if (
        !isNaN(page) &&
        page >= 1 &&
        page <= totalPages &&
        page !== currentPage
    ) {
        currentPage = page;
        fetchTransactions(); // Fetch data for the new page
    }
}

// Event listeners for pagination buttons
if (previous_page_button) {
    previous_page_button.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchTransactions();
        }
    });
}

if (next_page_button) {
    next_page_button.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            fetchTransactions();
        }
    });
}

// Event listener for items per page select
if (items_per_page_select) {
    items_per_page_select.addEventListener('change', () => {
        itemsPerPage = parseInt(items_per_page_select.value, 10);
        currentPage = 1; // Reset to first page when items per page changes
        fetchTransactions();
    });
}

// Event listener for Go button (if implemented for jumping to a specific page)
// Assuming a text input for page number next to the Go button in HTML if this is used
// If not used, this listener can be removed or the button hidden
if (go_button) {
    const page_number_input = document.getElementById('page_number_input'); // Assuming this ID exists in HTML

    if (page_number_input) {
        go_button.addEventListener('click', () => {
            const pageToGo = parseInt(page_number_input.value, 10);
            if (!isNaN(pageToGo) && pageToGo >= 1 && pageToGo <= totalPages) {
                currentPage = pageToGo;
                fetchTransactions();
            } else {
                showNotification(
                    `Invalid page number. Please enter a number between 1 and ${totalPages}.`,
                    'error'
                );
            }
        });
    } else {
        // If no input field for GO, remove or disable GO button functionality
        go_button.style.display = 'none';
    }
}

// Function to display user initial in the avatar circle
    // Use user_data fetched from API
    const userName =
        user_data.first_name && user_data.last_name
            ? `${user_data.first_name} ${user_data.last_name}`.trim()
            : user_name_element
            ? user_name_element.textContent.trim()
            : 'User';
    const initial = userName.charAt(0).toUpperCase();
    if (user_avatar_container) {
        user_avatar_container.textContent = initial;
    }

// Removed setup_profile_edit and populate_profile_form functions as modal was removed from HTML

// Initial fetch on page load
document.addEventListener('DOMContentLoaded', () => {
    fetchUserData(); // Fetch user data on load
    fetchTransactions(); // Existing fetch for transactions
    console.log('StackOvercash Transaction Page Initialized Dynamically!');
});

// Function to handle logout
async function handleLogout() {
    try {
        // Clear relevant items from localStorage
        localStorage.removeItem('user');
        localStorage.removeItem('account'); // Assuming account data is also stored
        localStorage.removeItem('token'); // If you are using tokens

        // Optional: Call backend logout API
        // Assuming a logout endpoint exists at /project-errawrs/src/api/auth/logout.php
        // Note: This fetch is fire-and-forget as we are navigating away immediately
        fetch('/project-errawrs/src/api/auth/logout.php', {
            method: 'POST',
        }).catch((error) =>
            console.error('Error during logout API call:', error)
        );

        // Let the default link navigation to index.html happen
    } catch (error) {
        console.error('Error during logout:', error);
        // Optionally show a notification that logout might not have been clean
        showNotification(
            'Logout might not have been fully successful.',
            'warning'
        );
    }
}

// Event listener for logout button
const logout_btn = document.getElementById('logout_btn');
if (logout_btn) {
    logout_btn.addEventListener('click', (event) => {
        // Prevent default navigation immediately if you want to wait for API call
        // event.preventDefault();
        handleLogout();
        // If not preventing default, the browser will navigate after this function runs
    });
}

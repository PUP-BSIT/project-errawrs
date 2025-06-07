// Get teller info from session storage
const tellerInfo = JSON.parse(sessionStorage.getItem("tellerInfo"));
if (!tellerInfo || !tellerInfo.teller_number) {
    console.error("No teller info found in session storage");
    window.location.href = "./bank_teller_login.html";
}

// Global variables
let currentPage = 1;
let itemsPerPage = 5;
let totalItems = 0;
let totalPages = 0;
let lastFetchTime = null;
const REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const ITEMS_PER_VIEW = 5; // Fixed number of items to display per page

// Table data storage
let tableData = [];
let filteredData = [];
let selectedRows = new Set();

// Initialize application when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
    initializeApplication();
    // Update teller name in the UI
    const userNameElement = document.querySelector(".user-name");
    if (userNameElement && tellerInfo.name) {
        userNameElement.textContent = tellerInfo.name;
    }
});

async function initializeApplication() {
    console.log("Bank Teller History Application Initialized");
    await fetchTransactionHistory();
    updateTableDisplay();
    updatePaginationDisplay();
    setupAutoRefresh();
}

// Setup auto-refresh functionality
function setupAutoRefresh() {
    setInterval(async () => {
        const now = new Date().getTime();
        if (lastFetchTime && (now - lastFetchTime) >= REFRESH_INTERVAL) {
            await fetchTransactionHistory();
            updateTableDisplay();
            updatePaginationDisplay();
        }
    }, 60000); // Check every minute
}

// Fetch transaction history from the server
async function fetchTransactionHistory() {
    try {
        const response = await fetch(`/project-errawrs/src/api/teller/get_transaction_history.php?teller_number=${encodeURIComponent(tellerInfo.teller_number)}&page=${currentPage}&limit=${itemsPerPage}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to fetch transaction history");
        }

        if (data.success && data.transactions) {
            tableData = data.transactions.map(item => ({
                id: item.account_number,
                date: new Date(item.date),
                time: item.time,
                account_number: item.account_number,
                account_name: item.account_name,
                amount: item.amount,
                card_type: item.card_type,
                action: item.action,
                type: determineTransactionType(item.action, item.card_type)
            }));
            filteredData = [...tableData];
            totalItems = data.pagination.total_records;
            totalPages = data.pagination.total_pages;
            lastFetchTime = new Date().getTime();
        } else {
            tableData = [];
            filteredData = [];
            totalItems = 0;
            totalPages = 0;
            showNotification("No transaction history found", "info");
        }
    } catch (error) {
        console.error("Error fetching transaction history:", error);
        showNotification(error.message || "Error fetching transaction history", "error");
    }
}

// Helper function to determine transaction type for icon and styling
function determineTransactionType(action, cardType) {
    if (action.toLowerCase().includes('deposit')) {
        return 'deposit';
    } else if (action.toLowerCase().includes('withdraw')) {
        return 'withdraw';
    } else if (action.toLowerCase().includes('closed')) {
        return 'close';
    } else if (action.toLowerCase().includes('reopened')) {
        return 'reopen';
    } else {
        return cardType?.toLowerCase() || 'unknown';
    }
}

// Pagination functions
function goToPage(pageNum) {
    if (pageNum >= 1 && pageNum <= totalPages && pageNum !== currentPage) {
        currentPage = pageNum;
        fetchTransactionHistory().then(() => {
            updateTableDisplay();
            updatePaginationDisplay();
        });
    }
}

function goToPreviousPage() {
    if (currentPage > 1) {
        goToPage(currentPage - 1);
    }
}

function goToNextPage() {
    if (currentPage < totalPages) {
        goToPage(currentPage + 1);
    }
}

function changeItemsPerPage() {
    const selectElement = document.getElementById("per-page-select");
    const newItemsPerPage = parseInt(selectElement.value);
    
    if (newItemsPerPage !== itemsPerPage) {
        itemsPerPage = newItemsPerPage;
        currentPage = 1; // Reset to first page when changing items per page
        
        fetchTransactionHistory().then(() => {
            updateTableDisplay();
            updatePaginationDisplay();
        });
    }
}

function applyPaginationSettings() {
    updateTableDisplay();
    console.log("Pagination settings applied");
}

// Update pagination display
function updatePaginationDisplay() {
    const pageNumbersContainer = document.getElementById("page-numbers");
    pageNumbersContainer.innerHTML = "";

    const actualPages = Math.ceil(totalItems / ITEMS_PER_VIEW);
    const displayPages = Math.min(totalPages, actualPages);

    if (displayPages <= 0) {
        return; // No pages to display
    }

    // Adjust current page if it's beyond the actual data
    if (currentPage > displayPages) {
        currentPage = displayPages;
    }

    // Calculate the range of page numbers to show
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(displayPages, currentPage + 2);

    // Always show at least 5 pages if available
    if (endPage - startPage < 4 && displayPages > 4) {
        if (startPage === 1) {
            endPage = Math.min(5, displayPages);
        } else if (endPage === displayPages) {
            startPage = Math.max(1, displayPages - 4);
        }
    }

    // Add first page button if not in range
    if (startPage > 1) {
        addPageButton(1);
        if (startPage > 2) {
            addEllipsis();
        }
    }

    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
        addPageButton(i);
    }

    // Add last page button if not in range
    if (endPage < displayPages) {
        if (endPage < displayPages - 1) {
            addEllipsis();
        }
        addPageButton(displayPages);
    }

    // Update showing text with proper padding
    updateShowingText();

    // Enable/disable navigation buttons based on actual pages
    updateNavigationButtons(displayPages);
}

// Update navigation buttons state
function updateNavigationButtons(displayPages) {
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");

    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }
    if (nextBtn) {
        nextBtn.disabled = currentPage === displayPages;
    }
}

// Update showing text
function updateShowingText() {
    const showingText = document.getElementById("showing-text");
    if (showingText) {
        if (totalItems === 0) {
            showingText.textContent = "Showing 0 to 0 of 0 entries";
        } else {
            const startItem = ((currentPage - 1) * ITEMS_PER_VIEW) + 1;
            const endItem = Math.min(startItem + ITEMS_PER_VIEW - 1, totalItems);
            const totalPages = Math.ceil(totalItems / ITEMS_PER_VIEW);
            showingText.textContent = `Showing ${startItem} to ${String(endItem).padStart(2, "0")} of ${totalItems} entries (Page ${currentPage} of ${totalPages})`;
        }
    }
}

function addPageButton(pageNum) {
    const pageNumbersContainer = document.getElementById("page-numbers");
    const button = document.createElement("button");
    button.className = `pagination-btn${pageNum === currentPage ? " active" : ""}`;
    button.textContent = pageNum;
    button.onclick = () => goToPage(pageNum);
    pageNumbersContainer.appendChild(button);
}

function addEllipsis() {
    const pageNumbersContainer = document.getElementById("page-numbers");
    const ellipsis = document.createElement("span");
    ellipsis.className = "page-ellipsis";
    ellipsis.textContent = "...";
    pageNumbersContainer.appendChild(ellipsis);
}

// Get current page data
function getCurrentPageData() {
    const startIndex = (currentPage - 1) * ITEMS_PER_VIEW;
    const endIndex = startIndex + ITEMS_PER_VIEW;
    return filteredData.slice(startIndex, endIndex);
}

// Get status icon
function getStatusIcon(status) {
    switch (status.toLowerCase()) {
        case "success":
            return "✓";
        case "failed":
            return "✗";
        default:
            return "?";
    }
}

// Create table row
function createTableRow(item) {
    const row = document.createElement("div");
    row.className = "table-row";
    row.onclick = function (event) {
        handleRowClick(event, row, item.id);
    };

    const dateCell = document.createElement("div");
    dateCell.className = "table-cell date";
    dateCell.textContent = formatDate(item.date);

    const timeCell = document.createElement("div");
    timeCell.className = "table-cell time";
    timeCell.textContent = item.time || formatTime(item.date);

    const accountNumberCell = document.createElement("div");
    accountNumberCell.className = "table-cell";
    accountNumberCell.textContent = item.account_number;

    const accountNameCell = document.createElement("div");
    accountNameCell.className = "table-cell";
    accountNameCell.textContent = item.account_name;

    const accountTypeCell = document.createElement("div");
    accountTypeCell.className = "table-cell";
    accountTypeCell.textContent = item.card_type || "—";

    const amountCell = document.createElement("div");
    amountCell.className = "table-cell currency";
    amountCell.textContent = formatCurrency(item.amount);

    const detailsCell = document.createElement("div");
    detailsCell.className = "table-cell details-cell";
    
    // Set the details content based on transaction type and card type
    const detailsContent = getTransactionDetails(item.type, item.card_type, item.action);
    detailsCell.innerHTML = `
        <i class="${detailsContent.icon}"></i>
        <span class="${detailsContent.class}">${detailsContent.text}</span>
    `;

    row.appendChild(dateCell);
    row.appendChild(timeCell);
    row.appendChild(accountNumberCell);
    row.appendChild(accountNameCell);
    row.appendChild(accountTypeCell);
    row.appendChild(amountCell);
    row.appendChild(detailsCell);

    return row;
}

// Helper function to get transaction details
function getTransactionDetails(type, cardType, action) {
    // First check for specific transaction types
    switch (type?.toLowerCase()) {
        case 'deposit':
            return {
                icon: 'fas fa-plus-circle',
                text: action || 'Deposit',
                class: 'details-deposit'
            };
        case 'withdraw':
            return {
                icon: 'fas fa-minus-circle',
                text: action || 'Withdrawal',
                class: 'details-withdraw'
            };
        case 'close':
            return {
                icon: 'fas fa-times-circle',
                text: action || 'Close Account',
                class: 'details-close'
            };
        case 'reopen':
            return {
                icon: 'fas fa-redo-alt',
                text: action || 'Reopen Account',
                class: 'details-reopen'
            };
        default:
            // If no specific transaction type, show card type
            return {
                icon: 'fas fa-credit-card',
                text: cardType ? `${cardType} Account` : action || 'View Details',
                class: ''
            };
    }
}

// Update table display
function updateTableDisplay() {
    const tableBody = document.getElementById("table-body");
    const currentPageData = getCurrentPageData();

    // Clear existing rows
    tableBody.innerHTML = "";

    if (currentPageData.length === 0) {
        // Show empty state message
        const emptyRow = document.createElement("div");
        emptyRow.className = "table-row empty-state";
        emptyRow.innerHTML = `
            <div class="empty-state-container">
                <i class="fa-regular fa-folder-open empty-state-icon"></i>
                <div class="empty-state-title">No transactions found</div>
                <div class="empty-state-subtitle">Transaction history will appear here</div>
            </div>
        `;
        tableBody.appendChild(emptyRow);
        return;
    }

    // Create new rows (limited to ITEMS_PER_VIEW)
    currentPageData.forEach(function (item) {
        const row = createTableRow(item);
        tableBody.appendChild(row);
    });

    // Update total pages based on items per page selection
    totalPages = Math.ceil(totalItems / itemsPerPage);
}

// Row interaction functions
function handleRowClick(event, row, transactionId) {
    if (event.ctrlKey || event.metaKey) {
        toggleRowSelection(row, transactionId);
    } else {
        clearAllSelections();
        selectRow(row, transactionId);
    }
}

function selectRow(row, rowId) {
    row.classList.add("selected");
    selectedRows.add(rowId);
}

function toggleRowSelection(row, rowId) {
    if (selectedRows.has(rowId)) {
        deselectRow(row, rowId);
    } else {
        selectRow(row, rowId);
    }
}

function deselectRow(row, rowId) {
    row.classList.remove("selected");
    selectedRows.delete(rowId);
}

function clearAllSelections() {
    const selectedRowElements = document.querySelectorAll(".table-row.selected");
    selectedRowElements.forEach(function (row) {
        row.classList.remove("selected");
    });
    selectedRows.clear();
}

function showTransactionDetails(transaction) {
    if (transaction) {
        alert(
            `Transaction Details:\n\nDate: ${transaction.date}\nType: ${transaction.type}\nAmount: ${transaction.amount}\nAccount No.: ${transaction.accountNo}\nAccount Name: ${transaction.accountName}\nStatus: ${transaction.status}`
        );
    }
}

// Filter and sort functions
function filterData(filterFunction) {
    filteredData = tableData.filter(filterFunction);
    currentPage = 1; // Reset to first page
    updateTableDisplay();
    updatePaginationDisplay();
}

function sortData(sortKey, direction = "asc") {
    filteredData.sort(function (a, b) {
        let aValue = a[sortKey];
        let bValue = b[sortKey];

        // Handle amount sorting (remove currency symbol)
        if (sortKey === "amount") {
            aValue = parseFloat(aValue.replace(/[₱,]/g, ""));
            bValue = parseFloat(bValue.replace(/[₱,]/g, ""));
        }

        // Handle date sorting
        if (sortKey === "date") {
            aValue = new Date(aValue);
            bValue = new Date(bValue);
        }

        if (direction === "asc") {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });

    updateTableDisplay();
}

// Utility functions
function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;

    const container = document.getElementById("notification_container");
    container.appendChild(notification);

    setTimeout(function () {
        notification.classList.add("fade-out");
        setTimeout(function () {
            if (notification.parentNode) {
                container.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function formatCurrency(amount) {
    // Convert amount to a number if it's a string
    const numericAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^\d.-]/g, '')) : amount;
    
    // Check if it's a valid number
    if (isNaN(numericAmount)) {
        return "—";
    }

    // Format the number using Intl.NumberFormat
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(numericAmount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}

// Keyboard shortcuts
document.addEventListener("keydown", function (event) {
    // Ctrl/Cmd + A to select all visible rows
    if ((event.ctrlKey || event.metaKey) && event.key === "a") {
        event.preventDefault();
        selectAllVisibleRows();
    }

    // Escape to clear selections
    if (event.key === "Escape") {
        clearAllSelections();
    }

    // Arrow keys for pagination
    if (event.key === "ArrowLeft" && event.ctrlKey) {
        event.preventDefault();
        if (currentPage > 1) {
            goToPage(currentPage - 1);
        }
    }

    if (event.key === "ArrowRight" && event.ctrlKey) {
        event.preventDefault();
        if (currentPage < totalPages) {
            goToPage(currentPage + 1);
        }
    }
});

function selectAllVisibleRows() {
    const currentPageData = getCurrentPageData();
    currentPageData.forEach(function (transaction) {
        const rows = document.querySelectorAll(".table-row");
        rows.forEach(function (row, index) {
            if (
                currentPageData[index] &&
                currentPageData[index].id === transaction.id
            ) {
                selectRow(row, transaction.id);
            }
        });
    });
}
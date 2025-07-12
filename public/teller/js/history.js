// Get teller info from session storage
const tellerInfo = JSON.parse(sessionStorage.getItem("tellerInfo"));
if (!tellerInfo || !tellerInfo.teller_number) {
    console.error("No teller info found in session storage");
    window.location.href = "./bank_teller_login.html";
}

// Configuration - Dynamic base URL detection
function getBaseURL() {
    const host = window.location.hostname;
    if (host === 'dev-teller.stackovercash.site' || 
        host === 'teller.stackovercash.site') {
        return '/api';
    }
    return '/project-errawrs/src/api';
}

// Get the API base URL
const API_BASE_URL = getBaseURL();

// Global variables
let currentPage = 1;
let selectedItemCount = 5;
let totalItems = 0;
let totalPages = 0;
let lastFetchTime = null;
const REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const DISPLAY_ITEMS_PER_PAGE = 5; // Maximum items to display per page

// Table data storage
let tableData = [];
let filteredData = [];
let selectedRows = new Set();

// Initialize application when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
    updateTellerInfo();
    setupLogout();
    initializeApplication();
});

// Update teller information in the UI
function updateTellerInfo() {
    const userNameElement = document.querySelector(".user-name");
    const avatarElement = document.querySelector(".user-avatar.dynamic-avatar");
    let fullName = '';
    
    if (tellerInfo.first_name && tellerInfo.last_name) {
        fullName = `${tellerInfo.first_name} ${tellerInfo.last_name}`;
        userNameElement.textContent = fullName;
    } else if (tellerInfo.name) {
        fullName = tellerInfo.name;
        userNameElement.textContent = tellerInfo.name;
    }
    
    // Set avatar initial
    if (avatarElement && fullName) {
        const initial = fullName.trim().charAt(0).toUpperCase();
        avatarElement.textContent = initial;
    }
    
    // Set initial items per page in select
    const perPageSelect = document.getElementById("per-page-select");
    if (perPageSelect) {
        perPageSelect.value = selectedItemCount.toString();
    }
}

// Setup logout functionality
function setupLogout() {
    document.querySelector('.nav-logout a').addEventListener('click', 
        function(e) {
            e.preventDefault();
            sessionStorage.removeItem('tellerInfo');
            window.location.href = './bank_teller_login.html';
        });
}

// Initialize the application
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
        const url = `${API_BASE_URL}/teller/get_transaction_history.php?` +
                   `teller_number=${encodeURIComponent(tellerInfo.teller_number)}` +
                   `&page=${currentPage}&limit=${selectedItemCount}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to fetch transaction history");
        }

        if (data.success && data.transactions) {
            processTransactionData(data);
        } else {
            handleEmptyData();
        }
    } catch (error) {
        console.error("Error fetching transaction history:", error);
        showNotification(error.message || "Error fetching transaction history", 
                        "error");
    }
}

// Process transaction data
function processTransactionData(data) {
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
    
    // Calculate pages based on the fetched data and display limit
    totalPages = Math.ceil(filteredData.length / DISPLAY_ITEMS_PER_PAGE);
    
    // Only one page if selected count is 5 or less
    if (selectedItemCount <= DISPLAY_ITEMS_PER_PAGE) {
        totalPages = 1;
    }
    
    lastFetchTime = new Date().getTime();
    
    updateTableDisplay();
    updatePaginationDisplay();
}

// Handle empty data
function handleEmptyData() {
    tableData = [];
    filteredData = [];
    totalItems = 0;
    totalPages = 0;
    showNotification("No transaction history found", "info");
    
    updateTableDisplay();
    updatePaginationDisplay();
}

// Determine transaction type for icon and styling
function determineTransactionType(action, cardType) {
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes('deposit')) {
        return 'deposit';
    } else if (actionLower.includes('withdraw')) {
        return 'withdraw';
    } else if (actionLower.includes('closed')) {
        return 'close';
    } else if (actionLower.includes('reopened')) {
        return 'reopen';
    } else {
        return cardType?.toLowerCase() || 'unknown';
    }
}

// Pagination functions
function goToPage(pageNum) {
    if (pageNum >= 1 && pageNum <= totalPages && pageNum !== currentPage) {
        currentPage = pageNum;
        updateTableDisplay();
        updatePaginationDisplay();
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
    const newItemCount = parseInt(selectElement.value);
    
    if (newItemCount !== selectedItemCount) {
        selectedItemCount = newItemCount;
        currentPage = 1; // Reset to first page
        fetchTransactionHistory();
    }
}

// Update pagination display
function updatePaginationDisplay() {
    const pageNumbersContainer = document.getElementById("page-numbers");
    pageNumbersContainer.innerHTML = "";

    totalPages = Math.ceil(filteredData.length / DISPLAY_ITEMS_PER_PAGE);

    if (totalPages <= 0) {
        return;
    }

    // Adjust current page if it's beyond the actual data
    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    // Calculate the range of page numbers to show
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    // Always show at least 5 pages if available
    if (endPage - startPage < 4 && totalPages > 4) {
        if (startPage === 1) {
            endPage = Math.min(5, totalPages);
        } else if (endPage === totalPages) {
            startPage = Math.max(1, totalPages - 4);
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
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            addEllipsis();
        }
        addPageButton(totalPages);
    }

    updateShowingText();
    updateNavigationButtons(totalPages);
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
        if (filteredData.length === 0) {
            showingText.textContent = "Showing 0 to 0 of 0 entries";
        } else {
            const startItem = ((currentPage - 1) * DISPLAY_ITEMS_PER_PAGE) + 1;
            const endItem = Math.min(startItem + DISPLAY_ITEMS_PER_PAGE - 1, 
                                   filteredData.length);
            showingText.textContent = 
                `Showing ${startItem} to ${String(endItem).padStart(2, "0")} ` +
                `of ${totalItems} entries (Page ${currentPage} of ${totalPages})`;
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
    const startIndex = (currentPage - 1) * DISPLAY_ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + DISPLAY_ITEMS_PER_PAGE, 
                             filteredData.length);
    return filteredData.slice(startIndex, endIndex);
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
    
    const detailsContent = getTransactionDetails(item.type, item.card_type, 
                                                item.action);
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

// Get transaction details for display
function getTransactionDetails(type, cardType, action) {
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

    tableBody.innerHTML = "";

    if (currentPageData.length === 0) {
        showEmptyState(tableBody);
        return;
    }

    currentPageData.forEach(function (item) {
        const row = createTableRow(item);
        tableBody.appendChild(row);
    });
}

// Show empty state message
function showEmptyState(tableBody) {
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
    const numericAmount = typeof amount === 'string' ? 
        parseFloat(amount.replace(/[^\d.-]/g, '')) : amount;
    
    if (isNaN(numericAmount)) {
        return "—";
    }

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
            if (currentPageData[index] && 
                currentPageData[index].id === transaction.id) {
                selectRow(row, transaction.id);
            }
        });
    });
}
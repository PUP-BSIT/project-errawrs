// Global variables
let currentPage = 1;
let itemsPerPage = 5;
let totalItems = 15;
let totalPages = Math.ceil(totalItems / itemsPerPage);

// Table data storage
let tableData = [];
let filteredData = [];
let selectedRows = new Set();

// Initialize application when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
    initializeApplication();
});

function initializeApplication() {
    console.log("Bank Teller History Application Initialized");
    initializeTableData();
    filteredData = [...tableData];
    updateTableDisplay();
    updatePaginationDisplay();
}

// Initialize table data
function initializeTableData() {
    tableData = [
        {
            id: 1,
            date: "2025-05-02",
            type: "Deposit",
            amount: "₱5,000.00",
            reference: "Over-the-counter",
            status: "Success",
        },
        {
            id: 2,
            date: "2025-05-02",
            type: "Transfer",
            amount: "₱12,000.00",
            reference: "To Acc: #203567890",
            status: "Success",
        },
        {
            id: 3,
            date: "2025-05-01",
            type: "Transfer",
            amount: "₱3,500.00",
            reference: "To: BDO - #11733344",
            status: "Success",
        },
        {
            id: 4,
            date: "2025-04-30",
            type: "Deposit",
            amount: "₱1,000.00",
            reference: "Cheque Deposit",
            status: "Pending",
        },
        {
            id: 5,
            date: "2025-04-29",
            type: "Transfer",
            amount: "₱4,000.00",
            reference: "To Acc: #203344556",
            status: "Failed",
        },
        {
            id: 6,
            date: "2025-04-28",
            type: "Withdrawal",
            amount: "₱2,500.00",
            reference: "ATM Withdrawal",
            status: "Success",
        },
        {
            id: 7,
            date: "2025-04-27",
            type: "Deposit",
            amount: "₱8,000.00",
            reference: "Online Transfer",
            status: "Success",
        },
        {
            id: 8,
            date: "2025-04-26",
            type: "Transfer",
            amount: "₱1,500.00",
            reference: "To Acc: #445566778",
            status: "Success",
        },
        {
            id: 9,
            date: "2025-04-25",
            type: "Deposit",
            amount: "₱3,200.00",
            reference: "Cash Deposit",
            status: "Success",
        },
        {
            id: 10,
            date: "2025-04-24",
            type: "Transfer",
            amount: "₱6,700.00",
            reference: "To: Union Bank - #99887766",
            status: "Pending",
        },
        {
            id: 11,
            date: "2025-04-23",
            type: "Withdrawal",
            amount: "₱1,800.00",
            reference: "Over-the-counter",
            status: "Success",
        },
        {
            id: 12,
            date: "2025-04-22",
            type: "Transfer",
            amount: "₱9,500.00",
            reference: "To Acc: #112233445",
            status: "Failed",
        },
        {
            id: 13,
            date: "2025-04-21",
            type: "Deposit",
            amount: "₱4,400.00",
            reference: "Mobile Banking",
            status: "Success",
        },
        {
            id: 14,
            date: "2025-04-20",
            type: "Transfer",
            amount: "₱2,100.00",
            reference: "To Acc: #998877665",
            status: "Success",
        },
        {
            id: 15,
            date: "2025-04-19",
            type: "Deposit",
            amount: "₱5,800.00",
            reference: "Salary Deposit",
            status: "Success",
        },
    ];
}

// Pagination functions (called by onclick)
function goToPage(pageNum) {
    if (pageNum >= 1 && pageNum <= totalPages) {
        currentPage = pageNum;
        updatePaginationDisplay();
        updateTableDisplay();
    }
}

function goToPreviousPage() {
    if (currentPage > 1) {
        currentPage--;
        updatePaginationDisplay();
        updateTableDisplay();
    }
}

function goToNextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        updatePaginationDisplay();
        updateTableDisplay();
    }
}

function changeItemsPerPage() {
    const selectElement = document.getElementById("per-page-select");
    const newItemsPerPage = parseInt(selectElement.value);

    itemsPerPage = newItemsPerPage;
    totalPages = Math.ceil(totalItems / itemsPerPage);

    // Reset to page 1 if current page is now out of bounds
    if (currentPage > totalPages) {
        currentPage = 1;
    }

    updatePaginationDisplay();
    updateTableDisplay();
}

function applyPaginationSettings() {
    updateTableDisplay();
    console.log("Pagination settings applied");
}

// Update pagination display
function updatePaginationDisplay() {
    // Update active page button
    for (let i = 1; i <= 3; i++) {
        const pageBtn = document.getElementById("page-" + i);
        if (pageBtn) {
            pageBtn.classList.remove("active");
            if (i === currentPage) {
                pageBtn.classList.add("active");
            }
        }
    }

    // Update "Showing X to Y of Z" text
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const showingText = document.getElementById("showing-text");
    if (showingText) {
        showingText.textContent = `Showing ${startItem} to ${String(
            endItem
        ).padStart(2, "0")} of ${totalItems}`;
    }

    // Enable/disable navigation buttons
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");

    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }

    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages;
    }
}

// Get current page data
function getCurrentPageData() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
}

// Get status icon
function getStatusIcon(status) {
    switch (status.toLowerCase()) {
        case "success":
            return "✓";
        case "pending":
            return "⏳";
        case "failed":
            return "✗";
        default:
            return "?";
    }
}

// Create table row
function createTableRow(transaction) {
    const row = document.createElement("div");
    row.className = "table-row";
    row.onclick = function (event) {
        handleRowClick(event, row, transaction.id);
    };
    row.ondblclick = function () {
        showTransactionDetails(transaction);
    };

    const statusClass = `status-${transaction.status.toLowerCase()}`;
    const statusIcon = getStatusIcon(transaction.status);

    row.innerHTML = `
        <div class="table-cell">${transaction.date}</div>
        <div class="table-cell">${transaction.type}</div>
        <div class="table-cell">${transaction.amount}</div>
        <div class="table-cell">${transaction.reference}</div>
        <div class="${statusClass}">
            <div class="status-icon">${statusIcon}</div>
            ${transaction.status}
        </div>
    `;

    return row;
}

// Update table display
function updateTableDisplay() {
    const tableBody = document.getElementById("table-body");
    const currentPageData = getCurrentPageData();

    // Clear existing rows
    tableBody.innerHTML = "";

    // Create new rows
    currentPageData.forEach(function (transaction) {
        const row = createTableRow(transaction);
        tableBody.appendChild(row);
    });

    // Update total items
    totalItems = filteredData.length;
    totalPages = Math.ceil(totalItems / itemsPerPage);

    console.log(
        `Loading page ${currentPage} with ${itemsPerPage} items per page`
    );
}

// Row interaction functions
function handleRowClick(event, row, transactionId) {
    if (event.ctrlKey || event.metaKey) {
        // Multi-select with Ctrl/Cmd
        toggleRowSelection(row, transactionId);
    } else {
        // Single select
        clearAllSelections();
        selectRow(row, transactionId);
    }

    console.log("Selected rows:", Array.from(selectedRows));
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
    const selectedRowElements = document.querySelectorAll(
        ".table-row.selected"
    );
    selectedRowElements.forEach(function (row) {
        row.classList.remove("selected");
    });
    selectedRows.clear();
}

function showTransactionDetails(transaction) {
    if (transaction) {
        alert(
            `Transaction Details:\n\nDate: ${transaction.date}\nType: ${transaction.type}\nAmount: ${transaction.amount}\nReference: ${transaction.reference}\nStatus: ${transaction.status}`
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
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Inline styles for notification
    notification.style.position = "fixed";
    notification.style.top = "20px";
    notification.style.right = "20px";
    notification.style.padding = "12px 20px";
    notification.style.color = "white";
    notification.style.borderRadius = "4px";
    notification.style.zIndex = "1000";
    notification.style.transition = "all 0.3s ease";

    if (type === "success") {
        notification.style.background = "#4CAF50";
    } else if (type === "error") {
        notification.style.background = "#f44336";
    } else {
        notification.style.background = "#2196F3";
    }

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(function () {
        notification.style.opacity = "0";
        setTimeout(function () {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
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

// Error handling
window.addEventListener("error", function (event) {
    console.error("Application Error:", event.error);
    showNotification("An error occurred. Please refresh the page.", "error");
});

window.addEventListener("unhandledrejection", function (event) {
    console.error("Unhandled Promise Rejection:", event.reason);
    showNotification("An unexpected error occurred.", "error");
});

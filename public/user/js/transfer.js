// Extend the existing API object from session-manager.js
// Add transfer-specific endpoints
if (!API.USER) API.USER = {};
if (!API.AUTH) API.AUTH = {};

// Add or update USER endpoints
Object.assign(API.USER, {
    ACCOUNTS: '../../src/api/user/accounts.php',
    INTERNAL_TRANSFER: '../../src/api/user/fund_transfer.php',
    EXTERNAL_TRANSFER: '../../src/api/user/external_transfer.php'
});

// Add or update AUTH endpoints
Object.assign(API.AUTH, {
    SEND_OTP: '../../src/api/auth/send_otp.php',
    VERIFY_OTP: '../../src/api/auth/verify_otp.php',
    SESSION_CHECK: '../../src/api/auth/session_check.php',
    LOGOUT: '../../src/api/auth/logout.php'
});

// Extend Routes if needed
if (!ROUTES.TRANSFER_SUCCESS) {
    Object.assign(ROUTES, {
        TRANSFER_SUCCESS: './transfer_success.html',
        TRANSFER_FAILED: './transfer_failed.html'
    });
}

// Text Constants
const TEXT = {
    TRANSFER_SUCCESS: 'Transfer completed successfully!',
    TRANSFER_FAILED: 'Transfer failed. Please try again.',
    TRANSFER_ERROR: 'An error occurred during transfer. Please try again.',
    INVALID_AMOUNT: 'Please enter a valid amount',
    OTP_VERIFICATION_FAILED: 'OTP verification failed. Please try again.',
    OTP_ERROR: 'Error verifying OTP. Please try again.',
    LOGOUT_ERROR: 'Logout might not have been fully successful.'
};

// CSS Classes
const CLASS = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
    SHOW: 'show',
    INVALID: 'invalid',
    HIDDEN: 'hidden'
};

// Element IDs
const ELEMENT_ID = {
    OTP_MODAL: 'otp-verification-modal',
    OTP_INPUT: 'otp-input',
    VERIFY_OTP_BUTTON: 'verify-otp-button',
    CANCEL_OTP_BUTTON: 'cancel-otp-button'
};

// Account Status
const ACCOUNT_STATUS = {
    ACTIVE: 'active'
};

// Currency
const CURRENCY = {
    SYMBOL: '₱',
    LOCALE: 'en-US'
};

// DOM Elements
const select_bank_panel = document.getElementById('select-bank-panel');
const account_details_panel = document.getElementById('account-details-panel');
const bank_radio_buttons = document.querySelectorAll('input[name="bank"]');
const next_button = document.getElementById('next-button');
const send_money_button = document.getElementById('send-money-button');
const info_correct_checkbox = document.getElementById('info-correct');
const default_bank_label = document.getElementById('default-bank-label');
const stackovercash_bank_radio = document.getElementById('stackovercash_bank');
const your_account_select = document.getElementById('your-account');
const receiver_account_input = document.getElementById('receiver-account');
const amount_input = document.getElementById('amount');

// Add warning message element after amount input
const amountFormGroup = amount_input.closest('.form-group');
const balanceWarning = document.createElement('div');
balanceWarning.className = 'balance-warning';
balanceWarning.innerHTML = `<i class="fas fa-exclamation-circle"></i><span></span>`;
amountFormGroup.appendChild(balanceWarning);

// Debug logging of DOM elements
console.log('DOM Elements loaded:');
console.log('- select_bank_panel:', select_bank_panel ? 'found' : 'NOT FOUND');
console.log('- account_details_panel:', account_details_panel ? 'found' : 'NOT FOUND');
console.log('- bank_radio_buttons:', bank_radio_buttons.length, 'elements found');
console.log('- next_button:', next_button ? 'found' : 'NOT FOUND');
console.log('- send_money_button:', send_money_button ? 'found' : 'NOT FOUND');
console.log('- info_correct_checkbox:', info_correct_checkbox ? 'found' : 'NOT FOUND');
console.log('- your_account_select:', your_account_select ? 'found' : 'NOT FOUND');
console.log('- receiver_account_input:', receiver_account_input ? 'found' : 'NOT FOUND');
console.log('- amount_input:', amount_input ? 'found' : 'NOT FOUND');

// DOM Elements for Profile Edit
const user_avatar_container = document.getElementById('user_avatar_container');
const edit_profile_icon = document.getElementById('edit_profile_icon');
const edit_profile_modal = document.getElementById('edit_profile_modal');
const save_profile_button = document.getElementById('save_profile_button');
const exit_profile_button = document.getElementById('exit_profile_button');
const edit_first_name_input = document.getElementById('edit_first_name');
const edit_last_name_input = document.getElementById('edit_last_name');
const edit_username_input = document.getElementById('edit_username');
const edit_password_input = document.getElementById('edit_password');
const edit_confirm_password_input = document.getElementById('edit_confirm_password');
const edit_phone_number_input = document.getElementById('edit_phone_number');

// DOM Elements for Sidebar Profile Info (assuming they exist in transfer.html)
const user_name_element = document.getElementById('user_name');
const welcome_user_name_element = document.getElementById('welcome_user_name');

// State
let user_accounts = [];
let user_data = {};

// Function to show a notification (Assuming this is shared or implemented here)
function showNotification(message, type) {
    const notification_container = document.querySelector('.notification-container');
    if (!notification_container) return;

    const notification = document.createElement('div');
    notification.classList.add('notification', type);

    // Icons for different notification types
    const ICON = {
        success: 'fas fa-check-circle',
        error: 'fas fa-times-circle',
        info: 'fas fa-info-circle',
        warning: 'fas fa-exclamation-circle',
        default: 'fas fa-bell'
    };

    let icon = ICON[type] || ICON.default;

    notification.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
    `;

    notification_container.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000); // 3 seconds notification duration
}

// Fetch user data from API
async function fetchUserData() {
    try {
        const response = await fetch(API.AUTH.SESSION_CHECK);
        const data = await response.json();

        if (data.success && data.authenticated) {
            user_data = data.user;
            if (user_name_element)
                user_name_element.textContent =
                    `${user_data.first_name} ${user_data.last_name}`.trim();
            if (welcome_user_name_element)
                welcome_user_name_element.textContent = user_data.first_name;
            display_user_initial();
        } else {
            showNotification(
                data.error || 'Session expired or invalid',
                'error'
            );
            // Redirect to login page if not authenticated
            setTimeout(() => {
                window.location.href = ROUTES.LOGIN;
            }, 2000); // 2 seconds delay
        }
    } catch (error) {
        showNotification('Error fetching user data', 'error');
        console.error('Error:', error);
    }
}

// Fetch user accounts and populate the 'Your Account' dropdown
async function populateAccountsDropdown() {
    try {
        const response = await fetch(API.USER.ACCOUNTS);
        const data = await response.json();

        // Debug log to see what accounts data we have
        console.log('User accounts data:', data.accounts);

        if (data.success && data.accounts.length > 0) {
            user_accounts = data.accounts.filter(
                (account) => account.status === ACCOUNT_STATUS.ACTIVE
            );
            your_account_select.innerHTML =
                `<option value="">Select Account</option>`;
            user_accounts.forEach((account) => {
                const option = document.createElement('option');
                option.value = account.account_number;
                
                // Format account_type for display
                const accountType = account.account_type 
                    ? account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1) 
                    : 'Standard';
                
                option.textContent = `${accountType} Account No. ${
                    account.account_number
                } (${CURRENCY.SYMBOL} ${parseFloat(account.balance).toLocaleString(CURRENCY.LOCALE, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })})`;
                option.dataset.balance = account.balance;
                your_account_select.appendChild(option);
            });

            if (user_accounts.length > 0) {
                next_button.disabled = false;
            } else {
                showNotification('No active accounts found. Please add an account first.', 'info');
                next_button.disabled = true;
            }
        } else {
            user_accounts = [];
            your_account_select.innerHTML =
                `<option value="">No active accounts available</option>`;
            showNotification(data.error || 'Failed to fetch accounts', 'error');
            next_button.disabled = true;
        }
    } catch (error) {
        user_accounts = [];
        your_account_select.innerHTML =
            `<option value="">Error loading accounts</option>`;
        showNotification('Error fetching accounts', 'error');
        console.error('Error:', error);
        next_button.disabled = true;
    }
}

// Function to check if a bank is selected
function is_bank_selected() {
    const selectedBank = document.querySelector('input[name="bank"]:checked');
    return selectedBank !== null;
}

// Function to check if info is correct
function is_info_correct() {
    return info_correct_checkbox ? info_correct_checkbox.checked : false;
}

// Function to update default label visibility
function update_default_label() {
    if (stackovercash_bank_radio && default_bank_label) {
        if (stackovercash_bank_radio.checked) {
            default_bank_label.style.display = 'block';
        } else {
            default_bank_label.style.display = 'none';
        }
    }
}

// Function to display user initial in the avatar circle
function display_user_initial() {
    if (!user_avatar_container) return;
    
    // Use first_name and last_name directly from user_data
    const userName = user_data.first_name && user_data.last_name 
        ? `${user_data.first_name} ${user_data.last_name}`.trim() 
        : (user_name_element ? user_name_element.textContent.trim() : 'User');
    
    const initial = userName.charAt(0).toUpperCase();
    user_avatar_container.textContent = initial;
}

// Function to setup profile edit interactions
function setup_profile_edit() {
    if (
        !user_avatar_container ||
        !edit_profile_icon ||
        !edit_profile_modal ||
        !save_profile_button ||
        !exit_profile_button
    )
        return;

    // Show pen icon on hover
    user_avatar_container.addEventListener('mouseenter', () => {
        edit_profile_icon.classList.remove('hidden');
    });

    // Hide pen icon when not hovering over avatar or icon
    user_avatar_container.addEventListener('mouseleave', () => {
        setTimeout(() => {
            if (!edit_profile_icon.matches(':hover')) {
                edit_profile_icon.classList.add('hidden');
            }
        }, 50);
    });

    edit_profile_icon.addEventListener('mouseenter', () => {
        edit_profile_icon.classList.remove('hidden');
    });

    edit_profile_icon.addEventListener('mouseleave', () => {
        edit_profile_icon.classList.add('hidden');
    });

    // Show modal on pen icon click
    edit_profile_icon.addEventListener('click', () => {
        populate_profile_form();
        edit_profile_modal.classList.remove('hidden');
    });

    // Close modal on Exit button click
    exit_profile_button.addEventListener('click', () => {
        edit_profile_modal.classList.add('hidden');
    });

    // Simulate Save button click
    save_profile_button.addEventListener('click', () => {
        const updated_profile_data = {
            first_name: edit_first_name_input.value,
            last_name: edit_last_name_input.value,
            username: edit_username_input.value,
            password: edit_password_input.value,
            phone_number: edit_phone_number_input.value,
        };
        console.log('Saving profile data (simulated):', updated_profile_data);

        // Update the displayed name if first or last name changed (simulated)
        user_data.name =
            `${updated_profile_data.first_name} ${updated_profile_data.last_name}`.trim();
        const user_name_element = document.getElementById('user_name');
        if (user_name_element) user_name_element.textContent = user_data.name;
        display_user_initial();

        showNotification('Profile updated successfully!', 'success');

        edit_profile_modal.classList.add('hidden');
    });

    // Close modal when clicking outside
    edit_profile_modal.addEventListener('click', (event) => {
        if (event.target === edit_profile_modal) {
            edit_profile_modal.classList.add('hidden');
        }
    });
}

// Function to populate the profile edit form
function populate_profile_form() {
    if (
        !edit_first_name_input ||
        !edit_last_name_input ||
        !edit_username_input ||
        !edit_password_input ||
        !edit_confirm_password_input ||
        !edit_phone_number_input
    )
        return;

    edit_first_name_input.value = user_data.first_name || '';
    edit_last_name_input.value = user_data.last_name || '';
    edit_username_input.value = user_data.username || '';
    edit_password_input.value = user_data.password || '';
    edit_confirm_password_input.value = user_data.password || '';
    edit_phone_number_input.value = user_data.phone_number || '';
}

// Function to validate transfer amount
function validateTransferAmount() {
    if (!your_account_select.value || !amount_input.value) return;

    const selectedOption = your_account_select.options[your_account_select.selectedIndex];
    const accountBalance = parseFloat(selectedOption.dataset.balance || 0);
    const transferAmount = parseFloat(amount_input.value);

    if (isNaN(transferAmount)) return;

    const warningText = balanceWarning.querySelector('span');
    
    if (accountBalance === 0) {
        warningText.textContent = 'No balance on your account';
        balanceWarning.classList.add('show');
        amount_input.classList.add('invalid');
        send_money_button.disabled = true;
        info_correct_checkbox.checked = false;
    } else if (transferAmount > accountBalance) {
        warningText.textContent = 'Not enough balance';
        balanceWarning.classList.add('show');
        amount_input.classList.add('invalid');
        send_money_button.disabled = true;
        info_correct_checkbox.checked = false;
    } else {
        balanceWarning.classList.remove('show');
        amount_input.classList.remove('invalid');
        send_money_button.disabled = !is_info_correct();
    }
}

// Event listeners for real-time validation
amount_input.addEventListener('input', validateTransferAmount);
your_account_select.addEventListener('change', validateTransferAmount);

// Modify the info_correct_checkbox event listener
if (info_correct_checkbox) {
    info_correct_checkbox.addEventListener('change', () => {
        if (send_money_button) {
            // Only enable the button if the amount is valid
            const selectedOption = your_account_select.options[your_account_select.selectedIndex];
            const accountBalance = parseFloat(selectedOption.dataset.balance || 0);
            const transferAmount = parseFloat(amount_input.value || 0);
            const warningText = balanceWarning.querySelector('span');

            if (accountBalance === 0) {
                warningText.textContent = 'No balance on your account';
                send_money_button.disabled = true;
                info_correct_checkbox.checked = false;
                balanceWarning.classList.add('show');
                amount_input.classList.add('invalid');
            } else if (transferAmount > accountBalance) {
                warningText.textContent = 'Not enough balance';
                send_money_button.disabled = true;
                info_correct_checkbox.checked = false;
                balanceWarning.classList.add('show');
                amount_input.classList.add('invalid');
            } else {
                send_money_button.disabled = !is_info_correct();
            }
        }
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    fetchUserData();
    populateAccountsDropdown();
    setup_profile_edit();

    // Add event listeners for bank selection
    bank_radio_buttons.forEach((radio) => {
        radio.addEventListener('change', () => {
            next_button.disabled = !is_bank_selected();
            update_default_label();
        });
    });

    // Next button click
    if (next_button) {
        next_button.addEventListener('click', () => {
            if (is_bank_selected()) {
                // Animate transition
                select_bank_panel.style.opacity = '0';
                select_bank_panel.style.transform = 'translateX(-20px)';
                
                setTimeout(() => {
                    select_bank_panel.style.display = 'none';
                    account_details_panel.style.display = 'block';
                    
                    // Trigger reflow
                    account_details_panel.offsetHeight;
                    
                    // Reset and animate account details panel
                    account_details_panel.style.opacity = '1';
                    account_details_panel.style.transform = 'translateX(0)';
                }, 200);
            }
        });
    }

    // Info correct checkbox
    if (info_correct_checkbox) {
        info_correct_checkbox.addEventListener('change', () => {
            if (send_money_button) {
                send_money_button.disabled = !is_info_correct();
            }
        });
    }

    // Send money button
    if (send_money_button) {
        console.log('Send Money button found:', send_money_button);
        // Ensure the button has the correct styling
        send_money_button.className = 'send-btn';
        send_money_button.disabled = !is_info_correct();

        send_money_button.addEventListener('click', async (e) => {
            console.log('Send Money button clicked');
            e.preventDefault();
            if (!validateTransferForm()) {
                console.log('Form validation failed');
                return;
            }
            const selectedOption = your_account_select.options[your_account_select.selectedIndex];
            const accountBalance = parseFloat(selectedOption.dataset.balance || 0);
            const transferAmount = parseFloat(amount_input.value);
            const bankValue = document.querySelector('input[name="bank"]:checked').value;
            const isInternal = bankValue === 'StackOvercash Bank';
            const recipientBankCode = getBankCode(bankValue);
            const transferApi = isInternal ? API.USER.INTERNAL_TRANSFER : API.USER.EXTERNAL_TRANSFER;
            console.log('Transfer details:', {
                bankValue,
                isInternal,
                recipientBankCode,
                transferApi,
                transferType: isInternal ? 'Internal' : 'External'
            });
            const transferPayload = isInternal
                ? {
                    transaction_amount: transferAmount,
                    source_account_no: your_account_select.value,
                    recipient_account_no: receiver_account_input.value,
                    recipient_bank_code: recipientBankCode,
                    redirect_url: window.location.origin + window.location.pathname.replace('transfer.html', ROUTES.TRANSFER_SUCCESS)
                }
                : {
                    transaction_amount: transferAmount,
                    source_account_no: your_account_select.value,
                    recipient_bank_code: recipientBankCode,
                    recipient_account_no: receiver_account_input.value,
                    redirect_url: window.location.origin + window.location.pathname.replace('transfer.html', ROUTES.TRANSFER_SUCCESS)
                };
            send_money_button.disabled = true;
            try {
                // Step 1: Initiate transfer to store session and get phone number
                const transferResp = await fetch(transferApi, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(transferPayload)
                });
                const transferData = await transferResp.json();
                if (!transferData.success) {
                    showNotification(transferData.error || TEXT.TRANSFER_FAILED, 'error');
                    return;
                }
                // Step 2: Send OTP
                let phone_number = transferData.data?.phone_number;
                if (!phone_number && user_data.phone_number) phone_number = user_data.phone_number; // fallback
                if (!phone_number) {
                    showNotification('Could not determine phone number for OTP.', 'error');
                    return;
                }
                const otpResp = await fetch(API.AUTH.SEND_OTP, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        phone_number, 
                        purpose: isInternal ? 'fund_transfer' : 'external_transfer' 
                    })
                });
                const otpData = await otpResp.json();
                if (!otpData.success) {
                    showNotification(otpData.error || 'Failed to send OTP.', 'error');
                    return;
                }
                // Step 3: Show OTP modal
                showOTPVerificationModal({
                    transfer_details: {
                        amount: transferAmount,
                        source_account: your_account_select.value,
                        recipient_account: receiver_account_input.value
                    },
                    dev_otp: otpData.debug_otp,
                    phone_number,
                    transferApi,
                    transferPayload
                });
            } catch (error) {
                console.error('Error during transfer:', error);
                showNotification(TEXT.TRANSFER_ERROR, 'error');
            } finally {
                send_money_button.disabled = false;
            }
        });
    } else {
        console.log('Send Money button not found');
    }

    // Add back button handler
    const back_to_bank_button = document.getElementById('back-to-bank');

    if (back_to_bank_button) {
        back_to_bank_button.addEventListener('click', () => {
            // Reset account details form
            your_account_select.selectedIndex = 0;
            receiver_account_input.value = '';
            amount_input.value = '';
            info_correct_checkbox.checked = false;
            balanceWarning.classList.remove('show');
            amount_input.classList.remove('invalid');
            
            // Switch panels with animation
            account_details_panel.style.opacity = '0';
            account_details_panel.style.transform = 'translateX(20px)';
            
            setTimeout(() => {
                account_details_panel.style.display = 'none';
                select_bank_panel.style.display = 'block';
                
                // Trigger reflow
                select_bank_panel.offsetHeight;
                
                // Animate select bank panel
                select_bank_panel.style.opacity = '1';
                select_bank_panel.style.transform = 'translateX(0)';
            }, 200);
        });
    }

    // Add CSS transitions to panels
    const addTransitionStyle = (element) => {
        if (element) {
            element.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            element.style.opacity = '1';
            element.style.transform = 'translateX(0)';
        }
    };
    
    addTransitionStyle(select_bank_panel);
    addTransitionStyle(account_details_panel);
});

// Validate transfer form
function validateTransferForm() {
    // Check if source account is selected
    if (!your_account_select.value) {
        showNotification('Please select your account', 'error');
        return false;
    }
    
    // Check if recipient account is entered
    if (!receiver_account_input.value) {
        showNotification('Please enter recipient account number', 'error');
        return false;
    }
    
    // Check if amount is entered and valid
    if (!amount_input.value || isNaN(parseFloat(amount_input.value)) || parseFloat(amount_input.value) <= 0) {
        showNotification(TEXT.INVALID_AMOUNT, 'error');
        return false;
    }
    
    return true;
}

// Reset transfer form
function resetTransferForm() {
    your_account_select.selectedIndex = 0;
    receiver_account_input.value = '';
    amount_input.value = '';
    info_correct_checkbox.checked = false;
    send_money_button.disabled = true;
    
    // Go back to first panel
    account_details_panel.style.display = 'none';
    select_bank_panel.style.display = 'block';
}

// Show transfer receipt
function showTransferReceipt(data) {
    // Create modal for receipt
    const receiptModal = document.createElement('div');
    receiptModal.classList.add('modal');
    receiptModal.id = 'receipt-modal';
    
    // Format amount with 2 decimal places
    const formattedAmount = parseFloat(data.amount).toLocaleString(CURRENCY.LOCALE, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    // Format new balance with 2 decimal places
    const formattedBalance = parseFloat(data.new_balance).toLocaleString(CURRENCY.LOCALE, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    receiptModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Transfer Receipt</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <div class="receipt">
                    <div class="receipt-item">
                        <span class="label">Transaction ID:</span>
                        <span class="value">${data.transaction_id}</span>
                    </div>
                    <div class="receipt-item">
                        <span class="label">Date:</span>
                        <span class="value">${data.transaction_date}</span>
                    </div>
                    <div class="receipt-item">
                        <span class="label">From Account:</span>
                        <span class="value">${data.source_account}</span>
                    </div>
                    <div class="receipt-item">
                        <span class="label">To Account:</span>
                        <span class="value">${data.recipient_account}</span>
                    </div>
                    <div class="receipt-item">
                        <span class="label">Amount:</span>
                        <span class="value">${CURRENCY.SYMBOL} ${formattedAmount}</span>
                    </div>
                    <div class="receipt-item">
                        <span class="label">New Balance:</span>
                        <span class="value">${CURRENCY.SYMBOL} ${formattedBalance}</span>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button id="close-receipt">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(receiptModal);
    
    // Show modal
    receiptModal.style.display = 'block';
    
    // Close modal on X click
    const closeBtn = receiptModal.querySelector('.close');
    closeBtn.addEventListener('click', () => {
        receiptModal.remove();
    });
    
    // Close modal on button click
    const closeButton = receiptModal.querySelector('#close-receipt');
    closeButton.addEventListener('click', () => {
        receiptModal.remove();
    });
    
    // Close modal on outside click
    window.addEventListener('click', (event) => {
        if (event.target === receiptModal) {
            receiptModal.remove();
        }
    });
}

// Show OTP verification modal
function showOTPVerificationModal(data) {
    // Create modal for OTP verification
    const otpModal = document.createElement('div');
    otpModal.classList.add('modal');
    otpModal.id = 'otp-verification-modal';
    
    // Format amount with 2 decimal places
    const formattedAmount = parseFloat(data.transfer_details.amount).toLocaleString(CURRENCY.LOCALE, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    otpModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>OTP Verification</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <p>An OTP has been sent to your registered phone number. Please enter it below.</p>
                
                <div class="transfer-details">
                    <div class="detail-item">
                        <span class="label">Amount:</span>
                        <span class="value">${CURRENCY.SYMBOL} ${formattedAmount}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">From Account:</span>
                        <span class="value">${data.transfer_details.source_account}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">To Account:</span>
                        <span class="value">${data.transfer_details.recipient_account}</span>
                    </div>
                </div>
                
                <div class="otp-input-container">
                    <label for="otp-input">Enter 6-digit OTP:</label>
                    <input type="text" id="otp-input" maxlength="6" placeholder="123456">
                </div>
                
                <div class="error-message" id="otp-error" style="display: none; color: red;"></div>
                
                <!-- For development only - remove in production -->
                <div class="dev-otp">
                    <small>Development OTP: ${data.dev_otp || 'N/A'}</small>
                </div>
            </div>
            <div class="modal-footer">
                <button id="verify-otp-button">Verify OTP</button>
                <button id="cancel-otp-button">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(otpModal);
    
    // Explicitly set the modal to display as a block (floating window)
    otpModal.style.display = 'block';
    
    // Get elements
    const closeBtn = otpModal.querySelector('.close');
    const verifyButton = otpModal.querySelector('#verify-otp-button');
    const cancelButton = otpModal.querySelector('#cancel-otp-button');
    const otpInput = otpModal.querySelector('#otp-input');
    const otpError = otpModal.querySelector('#otp-error');
    
    // Close modal on X click
    closeBtn.addEventListener('click', () => {
        otpModal.remove();
    });
    
    // Close modal on Cancel button click
    cancelButton.addEventListener('click', () => {
        otpModal.remove();
    });
    
    // Verify OTP button click
    verifyButton.addEventListener('click', async () => {
        const otp = otpInput.value.trim();
        if (!otp || otp.length !== 6) {
            otpError.textContent = 'Please enter a valid 6-digit OTP';
            otpError.style.display = 'block';
            return;
        }
        try {
            verifyButton.disabled = true;
            verifyButton.textContent = 'Verifying...';
            
            // Step 4: Verify OTP
            const verifyResp = await fetch(API.AUTH.VERIFY_OTP, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ otp, phone_number: data.phone_number })
            });
            
            const verifyData = await verifyResp.json();
            
            if (!verifyData.success) {
                otpError.textContent = verifyData.error || TEXT.OTP_VERIFICATION_FAILED;
                otpError.style.display = 'block';
                verifyButton.disabled = false;
                verifyButton.textContent = 'Verify OTP';
                return;
            }
            
            // Step 5: Complete transfer (call fund_transfer/external_transfer again)
            const completeResp = await fetch(data.transferApi, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data.transferPayload)
            });
            
            const completeData = await completeResp.json();
            
            if (completeData.success) {
                otpModal.remove();
                showNotification(TEXT.TRANSFER_SUCCESS, 'success');
                if (completeData.redirect_url) {
                    window.location.href = completeData.redirect_url;
                    return;
                } else {
                    // If no redirect URL is provided, redirect to dashboard with success parameter
                    window.location.href = '../user/user_dashboard.html?transaction_success=true';
                    return;
                }
            } else {
                otpError.textContent = completeData.error || TEXT.TRANSFER_FAILED;
                otpError.style.display = 'block';
            }
        } catch (error) {
            console.error('Error verifying OTP:', error);
            otpError.textContent = TEXT.OTP_ERROR;
            otpError.style.display = 'block';
        } finally {
            verifyButton.disabled = false;
            verifyButton.textContent = 'Verify OTP';
        }
    });
    
    // Close modal on outside click
    window.addEventListener('click', (event) => {
        if (event.target === otpModal) {
            otpModal.remove();
        }
    });
    
    // Focus on OTP input
    otpInput.focus();
}

// Function to handle logout
async function handleLogout() {
    try {
        // Clear relevant items from localStorage
        localStorage.removeItem('user');
        localStorage.removeItem('account'); // Assuming account data is also stored
        localStorage.removeItem('token'); // If using tokens

        // Call backend logout API
        await fetch(API.AUTH.LOGOUT, { 
            method: 'POST',
            credentials: 'same-origin'
        });

        // Redirect to login page after successful logout
        window.location.href = './index.html';
    } catch (error) {
        console.error('Error during logout:', error);
        // Show a notification that logout might not have been clean
        showNotification(TEXT.LOGOUT_ERROR, CLASS.WARNING);
        // Redirect anyway after a short delay
        setTimeout(() => {
            window.location.href = './index.html';
        }, 1500);
    }
}

// Event listener for logout button
const logout_btn = document.getElementById('logout_btn');
if (logout_btn) {
    logout_btn.addEventListener('click', (event) => {
        // Prevent the default navigation to ensure our handleLogout function completes
        event.preventDefault(); 
        handleLogout();
    });
}

// Map the selected bank label to the required code for external transfers
function getBankCode(bankLabel) {
    if (bankLabel === 'Techy Blinders Bank') return 'Blinders';
    if (bankLabel === 'Dragon Fly Bank') return 'Dragon';
    if (bankLabel === 'StackOvercash Bank') return 'Stackovercash';
    return '';
}

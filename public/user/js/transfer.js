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
const edit_confirm_password_input = document.getElementById(
    'edit_confirm_password'
);
const edit_phone_number_input = document.getElementById('edit_phone_number');

// DOM Elements for Sidebar Profile Info (assuming they exist in transfer.html)
const user_name_element = document.getElementById('user_name');
const welcome_user_name_element = document.getElementById('welcome_user_name');

// State
let user_accounts = [];
let user_data = {};

// Function to show a notification (Assuming this is shared or implemented here)
function showNotification(message, type) {
    const notification_container = document.querySelector(
        '.notification-container'
    );
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
            '../../src/api/auth/session_check.php'
        );
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
                window.location.href = './login_account_holder.html';
            }, 2000);
        }
    } catch (error) {
        showNotification('Error fetching user data', 'error');
        console.error('Error:', error);
    }
}

// Fetch user accounts and populate the 'Your Account' dropdown
async function populateAccountsDropdown() {
    try {
        const response = await fetch(
            '../../src/api/user/accounts.php'
        );
        const data = await response.json();

        // Debug log to see what accounts data we have
        console.log('User accounts data:', data.accounts);

        if (data.success && data.accounts.length > 0) {
            user_accounts = data.accounts.filter(
                (account) => account.status === 'active'
            );
            your_account_select.innerHTML =
                '<option value="">Select Account</option>';
            user_accounts.forEach((account) => {
                const option = document.createElement('option');
                option.value = account.account_number;
                
                // Format account_type for display
                const accountType = account.account_type 
                    ? account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1) 
                    : 'Standard';
                
                option.textContent = `${accountType} Account No. ${
                    account.account_number
                } (₱ ${parseFloat(account.balance).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })})`;
                option.dataset.balance = account.balance;
                your_account_select.appendChild(option);
            });

            if (user_accounts.length > 0) {
                next_button.disabled = false;
            } else {
                showNotification(
                    'No active accounts found. Please add an account first.',
                    'info'
                );
                next_button.disabled = true;
            }
        } else {
            user_accounts = [];
            your_account_select.innerHTML =
                '<option value="">No active accounts available</option>';
            showNotification(data.error || 'Failed to fetch accounts', 'error');
            next_button.disabled = true;
        }
    } catch (error) {
        user_accounts = [];
        your_account_select.innerHTML =
            '<option value="">Error loading accounts</option>';
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
                select_bank_panel.style.display = 'none';
                account_details_panel.style.display = 'block';
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
            
            // Validate form fields
            if (!validateTransferForm()) {
                console.log('Form validation failed');
                return;
            }

            // Get selected account balance
            const selectedOption = your_account_select.options[your_account_select.selectedIndex];
            const accountBalance = parseFloat(selectedOption.dataset.balance || 0);
            const transferAmount = parseFloat(amount_input.value);
            
            console.log('Transfer details:', {
                sourceAccount: your_account_select.value,
                recipientAccount: receiver_account_input.value,
                amount: transferAmount,
                balance: accountBalance
            });
            
            // Check if sufficient balance
            if (transferAmount > accountBalance) {
                console.log('Insufficient balance');
                showNotification('Insufficient balance for this transfer', 'error');
                return;
            }

            // Disable button to prevent double submission
            send_money_button.disabled = true;
            
            try {
                console.log('Sending transfer request...');
                // Send transfer request with updated parameter names
                const response = await fetch('../../src/api/user/fund_transfer.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        transaction_amount: transferAmount,
                        source_account_no: your_account_select.value,
                        recipient_account_no: receiver_account_input.value,
                        redirect_url: window.location.origin + window.location.pathname.replace('transfer.html', 'transfer_success.html')
                    })
                });
                
                console.log('Transfer response received');
                
                // Check if response is JSON
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    // Handle non-JSON response
                    const text = await response.text();
                    console.error('Server returned non-JSON response:', text);
                    throw new Error('Server returned an invalid response. Please try again later.');
                }
                
                const data = await response.json();
                console.log('Transfer response data:', data);
                
                if (data.success) {
                    if (data.requires_verification) {
                        console.log('Transfer requires OTP verification');
                        showOTPVerificationModal(data);
                    } else {
                        console.log('Transfer successful');
                        showNotification('Transfer successful!', 'success');
                        
                        // Show transfer details
                        showTransferReceipt(data);
                        
                        // Reset form
                        resetTransferForm();
                    }
                } else {
                    console.log('Transfer failed:', data.error);
                    showNotification(data.error || 'Transfer failed. Please try again.', 'error');
                }
            } catch (error) {
                console.error('Error during transfer:', error);
                showNotification('An error occurred during the transfer. Please try again.', 'error');
            } finally {
                // Re-enable button
                send_money_button.disabled = false;
            }
        });
    } else {
        console.log('Send Money button not found');
    }
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
        showNotification('Please enter a valid amount', 'error');
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
    const formattedAmount = parseFloat(data.amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    // Format new balance with 2 decimal places
    const formattedBalance = parseFloat(data.new_balance).toLocaleString('en-US', {
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
                        <span class="value">₱ ${formattedAmount}</span>
                    </div>
                    <div class="receipt-item">
                        <span class="label">New Balance:</span>
                        <span class="value">₱ ${formattedBalance}</span>
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
    const formattedAmount = parseFloat(data.transfer_details.amount).toLocaleString('en-US', {
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
                        <span class="value">₱ ${formattedAmount}</span>
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
                    <small>Development OTP: ${data.dev_otp}</small>
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
            
            const response = await fetch('../../src/api/user/verify_transfer_otp.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ otp })
            });
            
            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                // Handle non-JSON response
                const text = await response.text();
                console.error('Server returned non-JSON response:', text);
                throw new Error('Server returned an invalid response. Please try again later.');
            }
            
            const result = await response.json();
            
            if (result.success) {
                otpModal.remove();
                showNotification('Transfer successful!', 'success');
                
                // If redirect is needed, go to the URL
                if (result.redirect && result.redirect_url) {
                    console.log('Redirecting to:', result.redirect_url);
                    window.location.href = result.redirect_url;
                    return;
                }
                
                // Otherwise show the receipt
                showTransferReceipt(result);
                resetTransferForm();
            } else {
                otpError.textContent = result.error || 'Invalid OTP. Please try again.';
                otpError.style.display = 'block';
            }
        } catch (error) {
            console.error('Error verifying OTP:', error);
            otpError.textContent = 'An error occurred. Please try again.';
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

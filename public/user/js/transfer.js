// Add transfer-specific API endpoints

// Text Constants
const TEXT = {
    TRANSFER_SUCCESS: 'Transfer completed successfully!',
    TRANSFER_FAILED: 'Transfer failed. Please try again.',
    TRANSFER_ERROR: 'An error occurred during transfer. Please try again.',
    INVALID_AMOUNT: 'Please enter a valid amount',
    OTP_VERIFICATION_FAILED: 'OTP verification failed. Please try again.',
    OTP_ERROR: 'Error verifying OTP. Please try again.',
    LOGOUT_ERROR: 'Logout might not have been fully successful.',
    SESSION_EXPIRED: 'Session expired. Please log in again.',
    USER_DATA_ERROR: 'Error fetching user data. Please try again later.'
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
const info_correct_checkbox = document.getElementById('info-correct');
const default_bank_label = document.getElementById('default-bank-label');
const stackovercash_bank_radio = document.getElementById('stackovercash_bank');
const dropdown_selected = document.getElementById('dropdown-selected');
const dropdown_options = document.getElementById('dropdown-options');
const receiver_account_input = document.getElementById('receiver-account');
const amount_input = document.getElementById('amount');

// Add warning message element after amount input
const amountFormGroup = amount_input.closest('.form-group');
const balanceWarning = document.createElement('div');
balanceWarning.className = 'balance-warning';
balanceWarning.innerHTML = `<i class="fas fa-exclamation-circle"></i><span></span>`;
amountFormGroup.appendChild(balanceWarning);

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
let user_data = null;
let current_transfer_payload = {}; // To hold transfer data during OTP verification

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
        const response = await fetch(API_ENDPOINTS.AUTH.SESSION_CHECK, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

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
                data.error || TEXT.SESSION_EXPIRED,
                CLASS.ERROR
            );
            // Redirect to login page if not authenticated
            setTimeout(() => {
                window.location.href = ROUTES.LOGIN;
            }, TIMING.REDIRECT_DELAY);
        }
    } catch (error) {
        showNotification(TEXT.USER_DATA_ERROR, CLASS.ERROR);
        console.error('Error:', error);
    }
}

// Fetch user accounts and populate the 'Your Account' dropdown
async function populateAccountsDropdown() {
    try {
        const response = await fetch(API_ENDPOINTS.USER.ACCOUNTS, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        console.log('API response for accounts:', data);

        if (data.success && data.accounts.length > 0) {
            const activeAccounts = data.accounts.filter(account => account.status === 'active');
            if (activeAccounts.length > 0) {
                user_accounts = activeAccounts;
                populateCustomAccountDropdown();
                if (next_button) next_button.disabled = false;
            } else {
                showNotification('No active accounts found. Please add or activate an account first.', 'info');
                if (next_button) next_button.disabled = true;
            }
        } else {
            user_accounts = [];
            if (dropdown_selected) {
                dropdown_selected.textContent = 'No active accounts available';
                dropdown_selected.dataset.value = '';
            }
            showNotification(data.error || 'Failed to fetch accounts', 'error');
            if (next_button) next_button.disabled = true;
        }
    } catch (error) {
        console.error('Error fetching accounts:', error);
        showNotification('Error loading accounts. Please try again.', CLASS.ERROR);
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
            default_bank_label.classList.remove('hidden');
            default_bank_label.classList.add('block');
        } else {
            default_bank_label.classList.remove('block');
            default_bank_label.classList.add('hidden');
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
    if (!dropdown_selected.dataset.value || !amount_input.value) return;

    const selectedOption = user_accounts.find(account => account.account_number === dropdown_selected.dataset.value);
    const accountBalance = parseFloat(selectedOption.balance || 0);
    const transferAmount = parseFloat(amount_input.value);

    if (isNaN(transferAmount)) return;

    const warningText = balanceWarning.querySelector('span');
    
    if (accountBalance === 0) {
        warningText.textContent = 'No balance on your account';
        balanceWarning.classList.add('show');
        amount_input.classList.add('invalid');
        // send_money_button.disabled = true; // This line was removed from global scope
        info_correct_checkbox.checked = false;
    } else if (transferAmount > accountBalance) {
        warningText.textContent = 'Not enough balance';
        balanceWarning.classList.add('show');
        amount_input.classList.add('invalid');
        // send_money_button.disabled = true; // This line was removed from global scope
        info_correct_checkbox.checked = false;
    } else {
        balanceWarning.classList.remove('show');
        amount_input.classList.remove('invalid');
        // send_money_button.disabled = !is_info_correct(); // This line was removed from global scope
    }
}

// Add after DOM Elements and before any event listeners
function updateSendMoneyButtonState() {
    const send_money_button = document.getElementById('send-money-button');
    if (!send_money_button) return;

    const selectedOption = user_accounts.find(account => account.account_number === dropdown_selected.dataset.value);
    const accountBalance = selectedOption ? parseFloat(selectedOption.balance || 0) : 0;
    const transferAmount = parseFloat(amount_input.value || 0);
    const isChecked = info_correct_checkbox && info_correct_checkbox.checked;
    const receiverFilled = receiver_account_input && receiver_account_input.value.length > 0;

    send_money_button.disabled = !(
        selectedOption &&
        accountBalance > 0 &&
        transferAmount > 0 &&
        transferAmount <= accountBalance &&
        isChecked &&
        receiverFilled
    );
}

// Event listeners for real-time validation
if (amount_input) amount_input.addEventListener('input', updateSendMoneyButtonState);
if (receiver_account_input) receiver_account_input.addEventListener('input', updateSendMoneyButtonState);
if (info_correct_checkbox) info_correct_checkbox.addEventListener('change', updateSendMoneyButtonState);
if (dropdown_selected) dropdown_selected.addEventListener('change', updateSendMoneyButtonState);

// Modify the info_correct_checkbox event listener
if (info_correct_checkbox) {
    info_correct_checkbox.addEventListener('change', () => {
        // Only enable the button if the amount is valid
        const selectedOption = user_accounts.find(account => account.account_number === dropdown_selected.dataset.value);
        const accountBalance = parseFloat(selectedOption.balance || 0);
        const transferAmount = parseFloat(amount_input.value || 0);
        const warningText = balanceWarning.querySelector('span');

        if (accountBalance === 0) {
            warningText.textContent = 'No balance on your account';
            // send_money_button.disabled = true; // This line was removed from global scope
            info_correct_checkbox.checked = false;
            balanceWarning.classList.add('show');
            amount_input.classList.add('invalid');
        } else if (transferAmount > accountBalance) {
            warningText.textContent = 'Not enough balance';
            // send_money_button.disabled = true; // This line was removed from global scope
            info_correct_checkbox.checked = false;
            balanceWarning.classList.add('show');
            amount_input.classList.add('invalid');
        } else {
            // send_money_button.disabled = !is_info_correct(); // This line was removed from global scope
        }
    });
}

function populateCustomAccountDropdown() {
  if (!dropdown_selected || !dropdown_options) return;
  dropdown_options.innerHTML = '';

  // If no account is selected, select the first one
  if (!dropdown_selected.dataset.value && user_accounts.length > 0) {
    const first = user_accounts[0];
    let label = `${first.account_type ? first.account_type.charAt(0).toUpperCase() + first.account_type.slice(1) : 'Account'} No. ${first.account_number}<br>(₱ ${parseFloat(first.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
    dropdown_selected.innerHTML = label;
    dropdown_selected.dataset.value = first.account_number;
    dropdown_selected.classList.add('has-value');
  }

  const selectedAccountNumber = dropdown_selected.dataset.value;

  if (user_accounts && user_accounts.length > 0) {
    user_accounts.forEach((account) => {
      if (account.account_number === selectedAccountNumber) return; // Skip selected
      let label = `${account.account_type ? account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1) : 'Account'} No. ${account.account_number}<br>(₱ ${parseFloat(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
      const li = document.createElement('li');
      li.innerHTML = label;
      li.dataset.value = account.account_number;
      li.dataset.balance = account.balance;
      li.addEventListener('click', () => {
        dropdown_selected.innerHTML = label;
        dropdown_selected.dataset.value = account.account_number;
        dropdown_selected.classList.add('has-value');
        dropdown_options.style.display = 'none';
        setTimeout(() => {
          validateTransferAmount();
          updateSendMoneyButtonState();
          populateCustomAccountDropdown(); // Repopulate to hide the newly selected account
        }, 100);
      });
      dropdown_options.appendChild(li);
    });
  } else {
    const li = document.createElement('li');
    li.textContent = 'No accounts available';
    li.style.color = '#aaa';
    dropdown_options.appendChild(li);
  }
  updateSendMoneyButtonState();
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
                select_bank_panel.classList.add('fade-out');
                select_bank_panel.classList.remove('fade-in');
                
                setTimeout(() => {
                    select_bank_panel.classList.remove('block');
                    select_bank_panel.classList.add('hidden');
                    account_details_panel.classList.remove('hidden');
                    account_details_panel.classList.add('block');
                    
                    // Trigger reflow
                    account_details_panel.offsetHeight;
                    
                    // Reset and animate account details panel
                    account_details_panel.classList.remove('fade-out');
                    account_details_panel.classList.add('fade-in');
                    account_details_panel.classList.remove('slide-left');
                    account_details_panel.classList.add('slide-right');
                }, 200);
            }
        });
    }

    // Info correct checkbox
    if (info_correct_checkbox) {
        info_correct_checkbox.addEventListener('change', () => {
            // Only enable the button if the amount is valid
            const selectedOption = user_accounts.find(account => account.account_number === dropdown_selected.dataset.value);
            const accountBalance = parseFloat(selectedOption.balance || 0);
            const transferAmount = parseFloat(amount_input.value || 0);
            const warningText = balanceWarning.querySelector('span');

            if (accountBalance === 0) {
                warningText.textContent = 'No balance on your account';
                // send_money_button.disabled = true; // This line was removed from global scope
                info_correct_checkbox.checked = false;
                balanceWarning.classList.add('show');
                amount_input.classList.add('invalid');
            } else if (transferAmount > accountBalance) {
                warningText.textContent = 'Not enough balance';
                // send_money_button.disabled = true; // This line was removed from global scope
                info_correct_checkbox.checked = false;
                balanceWarning.classList.add('show');
                amount_input.classList.add('invalid');
            } else {
                // send_money_button.disabled = !is_info_correct(); // This line was removed from global scope
            }
        });
    }

    // Send money button
    const send_money_button = document.getElementById('send-money-button');
    if (send_money_button) {
        console.log('Send Money button found:', send_money_button);
        // Ensure the button has the correct styling
        send_money_button.className = 'send-btn';
        // send_money_button.disabled = !is_info_correct(); // This line was removed from global scope

        send_money_button.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!validateTransferForm()) {
                return;
            }

            send_money_button.disabled = true;
            send_money_button.textContent = 'Processing...';

            const transferAmount = parseFloat(amount_input.value);
            const sourceAccount = dropdown_selected.dataset.value;
            const recipientAccount = receiver_account_input.value;
            const bankValue = document.querySelector('input[name="bank"]:checked').value;
            const isInternal = bankValue === 'StackOvercash Bank';

            current_transfer_payload = {
                transaction_amount: transferAmount,
                source_account_no: sourceAccount,
                recipient_account_no: recipientAccount,
                redirect_url: window.location.origin + '/user/transfer/success'
            };

            if (!isInternal) {
                current_transfer_payload.recipient_bank_code = getBankCode(bankValue);
            }

            try {
                // Ensure user data with phone number is available
                if (!user_data || !user_data.phone_number) {
                    throw new Error("User phone number is not available. Please ensure your profile is complete.");
                }

                // Step 1: Initiate transfer (store details in session, do NOT finalize)
                const transferResp = await fetch(
                    isInternal ? API_ENDPOINTS.INTERNAL_TRANSFER : API_ENDPOINTS.EXTERNAL_TRANSFER,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(current_transfer_payload)
                    }
                );
                const transferData = await transferResp.json();

                if (!transferResp.ok || !transferData.success) {
                    throw new Error(transferData.error || 'Failed to initiate transfer.');
                }

                // Step 2: Send OTP (frontend triggers, backend should check session)
                const otpResp = await fetch(API_ENDPOINTS.AUTH.SEND_OTP, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ 
                        phone_number: user_data.phone_number,
                        purpose: isInternal ? 'fund_transfer' : 'external_transfer' 
                    })
                });
                const otpData = await otpResp.json();
                if (!otpResp.ok || !otpData.success) {
                    throw new Error(otpData.error || 'Failed to send OTP.');
                }

                // Step 3: Show OTP modal
                showOTPVerificationModal({
                    transfer_details: {
                        amount: transferAmount,
                        source_account: sourceAccount,
                        recipient_account: recipientAccount
                    },
                    isInternal: isInternal,
                    phone_number: user_data.phone_number
                });

            } catch (error) {
                console.error('Error during transfer initiation or OTP:', error);
                showNotification(error.message, 'error');
            } finally {
                send_money_button.disabled = false;
                send_money_button.textContent = 'Send Money';
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
            dropdown_selected.textContent = 'Select Account';
            dropdown_selected.dataset.value = '';
            dropdown_selected.classList.remove('has-value');
            receiver_account_input.value = '';
            amount_input.value = '';
            info_correct_checkbox.checked = false;
            balanceWarning.classList.remove('show');
            amount_input.classList.remove('invalid');
            
            // Switch panels with animation
            account_details_panel.classList.remove('fade-in');
            account_details_panel.classList.add('fade-out');
            account_details_panel.classList.add('slide-left');
            account_details_panel.classList.remove('slide-right');
            
            setTimeout(() => {
                account_details_panel.classList.remove('block');
                account_details_panel.classList.add('hidden');
                select_bank_panel.classList.remove('hidden');
                select_bank_panel.classList.add('block');
                
                // Trigger reflow
                select_bank_panel.offsetHeight;
                
                // Animate select bank panel
                select_bank_panel.classList.remove('fade-out');
                select_bank_panel.classList.add('fade-in');
                select_bank_panel.classList.remove('slide-left');
                select_bank_panel.classList.add('slide-right');
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

    // --- MOBILE/TABLET TOPNAV DROPDOWN LOGIC (copied from dashboard) ---
    const hamburgerBtn = document.getElementById('hamburger_btn');
    const topnavDropdown = document.getElementById('topnav_dropdown');
    const logoutBtnMobile = document.getElementById('logout_btn_mobile');

    // Mobile/tablet nav logic
    if (hamburgerBtn && topnavDropdown) {
        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.innerWidth <= 1024) {
                topnavDropdown.classList.toggle('open');
            }
        });
        // Close dropdown when clicking a nav link or logout
        topnavDropdown.querySelectorAll('.nav-link, .logout-btn').forEach(el => {
            el.addEventListener('click', () => {
                topnavDropdown.classList.remove('open');
            });
        });
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (topnavDropdown.classList.contains('open') && !topnavDropdown.contains(e.target) && e.target !== hamburgerBtn) {
                topnavDropdown.classList.remove('open');
            }
        });
    }
    // Mobile logout button uses same handler
    if (logoutBtnMobile) {
        logoutBtnMobile.addEventListener('click', (event) => {
            event.preventDefault();
            handleLogout();
        });
    }

    if (dropdown_selected && dropdown_options) {
        dropdown_selected.addEventListener('click', function (e) {
            e.stopPropagation();
            // Toggle dropdown
            if (dropdown_options.style.display === 'block') {
                dropdown_options.style.display = 'none';
            } else {
                dropdown_options.style.display = 'block';
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function (e) {
            if (!dropdown_selected.contains(e.target) && !dropdown_options.contains(e.target)) {
                dropdown_options.style.display = 'none';
            }
        });
    }
    updateSendMoneyButtonState(); // <-- Add this line at the end
});

// Validate transfer form
function validateTransferForm() {
    // Check if source account is selected
    if (!dropdown_selected.dataset.value) {
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
    dropdown_selected.textContent = 'Select Account';
    dropdown_selected.dataset.value = '';
    dropdown_selected.classList.remove('has-value');
    receiver_account_input.value = '';
    amount_input.value = '';
    info_correct_checkbox.checked = false;
    // send_money_button.disabled = true; // This line was removed from global scope
    
    // Go back to first panel
    account_details_panel.classList.remove('block');
    account_details_panel.classList.add('hidden');
    select_bank_panel.classList.remove('hidden');
    select_bank_panel.classList.add('block');
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
                        <span class="value">${data.recipient_account || data.external_account_number || 'N/A'}</span>
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
    cancelButton.addEventListener('click', async () => {
        try {
            const resp = await fetch(API_ENDPOINTS.INTERNAL_TRANSFER.replace('fund_transfer.php', 'cancel_transfer.php'), {
                method: 'POST',
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });
            const data = await resp.json();
            if (data.success) {
                showNotification('Transfer cancelled.', 'info');
            } else {
                showNotification(data.error || 'Failed to cancel transfer.', 'error');
            }
        } catch (err) {
            showNotification('Failed to cancel transfer.', 'error');
        } finally {
            otpModal.remove();
        }
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

            // Step 1: Verify OTP
            const verifyResp = await fetch(API_ENDPOINTS.AUTH.VERIFY_OTP, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ 
                    otp, 
                    phone_number: data.phone_number,
                    purpose: data.isInternal ? 'fund_transfer' : 'external_transfer'
                })
            });

            const verifyData = await verifyResp.json();

            if (verifyData.success) {
                // Step 2: Finalize transfer (backend checks session for OTP and pending transfer)
                const finalizeResp = await fetch(
                    data.isInternal ? API_ENDPOINTS.INTERNAL_TRANSFER : API_ENDPOINTS.EXTERNAL_TRANSFER,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({}) // No need to send payload again; backend uses session
                    }
                );
                const finalizeData = await finalizeResp.json();

                if (finalizeData.success && finalizeData.transaction_id) {
                    otpModal.remove();
                    showNotification(finalizeData.message || TEXT.TRANSFER_SUCCESS, 'success');
                    // Use redirect_url from backend if provided, else from payload
                    const redirectUrl = finalizeData.redirect_url || current_transfer_payload.redirect_url;
                    const url = new URL(redirectUrl, window.location.origin);
                    url.searchParams.set('fund_transfer_success', 'true');
                    url.searchParams.set('transaction_id', finalizeData.transaction_id);
                    window.location.href = url.href;
                } else {
                    // On failure, redirect with error_message param
                    const redirectUrl = (finalizeData && finalizeData.redirect_url) || current_transfer_payload.redirect_url;
                    const url = new URL(redirectUrl, window.location.origin);
                    url.searchParams.set('error_message', (finalizeData && finalizeData.error) || TEXT.TRANSFER_FAILED);
                    window.location.href = url.href;
                }
            } else {
                otpError.textContent = verifyData.error || TEXT.OTP_VERIFICATION_FAILED;
                otpError.style.display = 'block';
            }

        } catch (error) {
            console.error('Error during verification or transfer:', error);
            otpError.textContent = error.message;
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
        const response = await fetch(API_ENDPOINTS.AUTH.LOGOUT, { 
            method: 'POST',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

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
    return 'StackOvercash'; // Default for internal
}

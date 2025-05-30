// DOM Elements
const select_bank_panel = document.getElementById('select-bank-panel');
const account_details_panel = document.getElementById('account-details-panel');
const bank_radio_buttons = document.querySelectorAll('input[name="bank"]');
const next_button = document.getElementById('next-button');
const send_money_button = document.getElementById('send-money-button');
const info_correct_checkbox = document.getElementById('info-correct');
const success_notification = document.createElement('div');
const default_bank_label = document.getElementById('default-bank-label');
const stackovercash_bank_radio = document.getElementById('stackovercash_bank');

// Add success notification element to the body
success_notification.classList.add('success-notification');
success_notification.innerHTML = '<i class="fas fa-check-circle"></i> <span>Money sent successfully!</span>';
document.body.appendChild(success_notification);

// Function to check if a bank is selected
function is_bank_selected() {
    for (const radio of bank_radio_buttons) {
        if (radio.checked) {
            return true;
        }
    }
    return false;
}

// Function to check if info is correct
function is_info_correct() {
    return info_correct_checkbox.checked;
}

// Function to update default label visibility
function update_default_label() {
    if (stackovercash_bank_radio.checked) {
        default_bank_label.style.display = 'block';
    } else {
        default_bank_label.style.display = 'none';
    }
}

// Event listener for radio buttons
bank_radio_buttons.forEach(radio => {
    radio.addEventListener('change', () => {
        next_button.disabled = !is_bank_selected();
        update_default_label();
    });
});

// Event listener for the Next button
next_button.addEventListener('click', () => {
    if (is_bank_selected()) {
        select_bank_panel.style.display = 'none';
        account_details_panel.style.display = 'block';
        // Also check checkbox state when showing this panel
        send_money_button.disabled = !is_info_correct();
    }
});

// Event listener for the Info Correct checkbox
info_correct_checkbox.addEventListener('change', () => {
    send_money_button.disabled = !is_info_correct();
});

// Event listener for the Send Money button
send_money_button.addEventListener('click', () => {
    // Check if button is not disabled (should be redundant due to event listener, but good practice)
    if (!send_money_button.disabled) {
        // In a real application, you would perform the transfer here
        console.log('Sending money...');

        // Show success notification
        success_notification.style.display = 'flex';

        // Hide notification after a few seconds
        setTimeout(() => {
            success_notification.style.display = 'none';
        }, 3000); // Hide after 3 seconds
    }
});

// Initial check on page load
document.addEventListener('DOMContentLoaded', () => {
    next_button.disabled = !is_bank_selected();
    send_money_button.disabled = !is_info_correct(); // Disable send button initially
    update_default_label(); // Set initial state of default label
}); 
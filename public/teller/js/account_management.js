// Account management functionality for closing and reopening accounts
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const tellerInfo = JSON.parse(sessionStorage.getItem('tellerInfo') || '{}');
    if (!tellerInfo.teller_number) {
        window.location.href = 'bank_teller_login.html';
        return;
    }

    // Get form elements
    const closeAccountForm = document.getElementById('closeAccountForm');
    const reopenAccountForm = document.getElementById('reopenAccountForm');
    
    // Handle close account form submission
    if (closeAccountForm) {
        closeAccountForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            try {
                // Show loading state
                document.getElementById('closeButton').disabled = true;
                document.getElementById('closeStatus').textContent = 'Processing request...';
                
                // Get form data
                const accountNumber = document.getElementById('closeAccountNumber').value;
                const reason = document.getElementById('closeReason').value || 'Account closed by teller';
                
                // Make API call
                const response = await fetch('../src/api/teller/close_account.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        account_number: accountNumber,
                        teller_number: tellerInfo.teller_number,
                        reason: reason
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Show success message
                    document.getElementById('closeStatus').textContent = 'Account closed successfully!';
                    document.getElementById('closeStatus').style.color = 'green';
                    
                    // Update status details
                    document.getElementById('statusDetails').innerHTML = `
                        <h3>Account Status Update</h3>
                        <p>Account Number: ${data.data.account_number}</p>
                        <p>Status: ${data.data.status}</p>
                        <p>Date: ${data.data.closure_date}</p>
                        <p>Reason: ${data.data.reason}</p>
                    `;
                    
                    // Reset form
                    closeAccountForm.reset();
                } else {
                    throw new Error(data.error || 'Failed to close account');
                }
                
            } catch (error) {
                // Show error message
                document.getElementById('closeStatus').textContent = error.message;
                document.getElementById('closeStatus').style.color = 'red';
            } finally {
                document.getElementById('closeButton').disabled = false;
            }
        });
    }
    
    // Handle reopen account form submission
    if (reopenAccountForm) {
        reopenAccountForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            try {
                // Show loading state
                document.getElementById('reopenButton').disabled = true;
                document.getElementById('reopenStatus').textContent = 'Processing request...';
                
                // Get form data
                const accountNumber = document.getElementById('reopenAccountNumber').value;
                const reason = document.getElementById('reopenReason').value || 'Account reopened by teller';
                
                // Make API call
                const response = await fetch('../src/api/teller/reopen_account.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        account_number: accountNumber,
                        teller_number: tellerInfo.teller_number,
                        reason: reason
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Show success message
                    document.getElementById('reopenStatus').textContent = 'Account reopened successfully!';
                    document.getElementById('reopenStatus').style.color = 'green';
                    
                    // Update status details
                    document.getElementById('statusDetails').innerHTML = `
                        <h3>Account Status Update</h3>
                        <p>Account Number: ${data.data.account_number}</p>
                        <p>Status: ${data.data.status}</p>
                        <p>Date: ${data.data.reopen_date}</p>
                        <p>Reason: ${data.data.reason}</p>
                    `;
                    
                    // Reset form
                    reopenAccountForm.reset();
                } else {
                    throw new Error(data.error || 'Failed to reopen account');
                }
                
            } catch (error) {
                // Show error message
                document.getElementById('reopenStatus').textContent = error.message;
                document.getElementById('reopenStatus').style.color = 'red';
            } finally {
                document.getElementById('reopenButton').disabled = false;
            }
        });
    }
    
    // Add account number validation
    const accountNumberInputs = document.querySelectorAll('input[type="text"][id$="AccountNumber"]');
    accountNumberInputs.forEach(input => {
        input.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    });
}); 
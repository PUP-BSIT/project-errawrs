document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const transactionId = urlParams.get('transaction_id');
    if (transactionId) {
        fetch('../../src/api/user/transfer_success.php?transaction_id=' + transactionId)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.transaction) {
                    const t = data.transaction;
                    document.getElementById('transaction_id').textContent = t.transaction_id;
                    document.getElementById('transaction_date').textContent = new Date(t.created_at).toLocaleString();
                    document.getElementById('transaction_amount').textContent = '₱ ' + parseFloat(t.amount).toLocaleString('en-US', {minimumFractionDigits: 2});
                    document.getElementById('from_account').textContent = t.sender_account_id || '';
                    document.getElementById('to_account').textContent = t.receiver_account_id || t.external_account_number || '';
                } else {
                    document.getElementById('transaction_amount').textContent = 'Error fetching transaction';
                }
            });
    }
}); 
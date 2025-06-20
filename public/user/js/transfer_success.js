// API Endpoints
const API = {
    TRANSFER_SUCCESS: '../../src/api/user/get_transaction_details.php'
};

// Element IDs
const ELEMENT_ID = {
    TRANSACTION_ID: 'transaction_id',
    TRANSACTION_DATE: 'transaction_date',
    TRANSACTION_AMOUNT: 'transaction_amount',
    FROM_ACCOUNT: 'from_account',
    TO_ACCOUNT: 'to_account'
};

// URL Parameters
const URL_PARAM = {
    TRANSACTION_ID: 'transaction_id'
};

// Currency
const CURRENCY = {
    SYMBOL: '₱',
    LOCALE: 'en-US'
};

// Error Messages
const ERROR_MESSAGE = {
    FETCH_ERROR: 'Error fetching transaction'
};

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const transactionId = urlParams.get(URL_PARAM.TRANSACTION_ID);
    
    if (transactionId) {
        fetch(`${API.TRANSFER_SUCCESS}?${URL_PARAM.TRANSACTION_ID}=${transactionId}`)
            .then(res => res.json())
            .then(data => {
                console.log('API Response:', data); // Debug log
                if (data.success && data.transaction) {
                    const t = data.transaction;
                    console.log('Transaction data:', t); // Debug log
                    console.log('Sender account number:', t.sender_account_number); // Debug sender
                    console.log('Receiver account number:', t.receiver_account_number); // Debug receiver
                    
                    document.getElementById(ELEMENT_ID.TRANSACTION_ID).textContent = t.transaction_id || 'N/A';
                    document.getElementById(ELEMENT_ID.TRANSACTION_DATE).textContent = t.created_at ? new Date(t.created_at).toLocaleString() : 'N/A';
                    document.getElementById(ELEMENT_ID.TRANSACTION_AMOUNT).textContent = 
                        `${CURRENCY.SYMBOL} ${parseFloat(t.amount || 0).toLocaleString(CURRENCY.LOCALE, {minimumFractionDigits: 2})}`;
                    document.getElementById(ELEMENT_ID.FROM_ACCOUNT).textContent = t.sender_account_number || 'N/A';
                    document.getElementById(ELEMENT_ID.TO_ACCOUNT).textContent = t.receiver_account_number || t.external_account_number || 'N/A';
                } else {
                    document.getElementById(ELEMENT_ID.TRANSACTION_ID).textContent = 'N/A';
                    document.getElementById(ELEMENT_ID.TRANSACTION_DATE).textContent = 'N/A';
                    document.getElementById(ELEMENT_ID.TRANSACTION_AMOUNT).textContent = ERROR_MESSAGE.FETCH_ERROR;
                    document.getElementById(ELEMENT_ID.FROM_ACCOUNT).textContent = 'N/A';
                    document.getElementById(ELEMENT_ID.TO_ACCOUNT).textContent = 'N/A';
                }
            })
            .catch(err => {
                console.error('Error fetching transaction details:', err);
                document.getElementById(ELEMENT_ID.TRANSACTION_ID).textContent = 'N/A';
                document.getElementById(ELEMENT_ID.TRANSACTION_DATE).textContent = 'N/A';
                document.getElementById(ELEMENT_ID.TRANSACTION_AMOUNT).textContent = ERROR_MESSAGE.FETCH_ERROR;
                document.getElementById(ELEMENT_ID.FROM_ACCOUNT).textContent = 'N/A';
                document.getElementById(ELEMENT_ID.TO_ACCOUNT).textContent = 'N/A';
            });
    } else {
        document.getElementById(ELEMENT_ID.TRANSACTION_ID).textContent = 'N/A';
        document.getElementById(ELEMENT_ID.TRANSACTION_DATE).textContent = 'N/A';
        document.getElementById(ELEMENT_ID.TRANSACTION_AMOUNT).textContent = ERROR_MESSAGE.FETCH_ERROR;
        document.getElementById(ELEMENT_ID.FROM_ACCOUNT).textContent = 'N/A';
        document.getElementById(ELEMENT_ID.TO_ACCOUNT).textContent = 'N/A';
    }
}); 
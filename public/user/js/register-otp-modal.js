// OTP modal logic for registration

let resendCountdown = 0;
let resendInterval = null;

function setResendCountdown(seconds) {
    resendCountdown = seconds;
    const resendBtn = document.getElementById('resend_otp');
    if (!resendBtn) return;
    resendBtn.textContent = `Resend code in ${resendCountdown}s`;
    resendBtn.classList.remove('pointer');
    resendBtn.classList.add('no-pointer');
    resendBtn.removeAttribute('href');
    resendBtn.style.pointerEvents = 'none';
    resendBtn.style.opacity = '0.6';
    if (resendInterval) clearInterval(resendInterval);
    resendInterval = setInterval(() => {
        resendCountdown--;
        if (resendCountdown <= 0) {
            clearInterval(resendInterval);
            resendBtn.textContent = 'Resend code';
            resendBtn.classList.add('pointer');
            resendBtn.classList.remove('no-pointer');
            resendBtn.setAttribute('href', '#');
            resendBtn.style.pointerEvents = 'auto';
            resendBtn.style.opacity = '1';
        } else {
            resendBtn.textContent = `Resend code in ${resendCountdown}s`;
        }
    }, 1000);
}

export function showOtpModal(phoneNumber, onVerified) {
    const otpModal = document.getElementById("otp_modal");
    const otpInput = document.getElementById("otp_code");
    if (!otpModal || !otpInput) return;
    otpModal.classList.remove("hidden");
    otpModal.classList.add("active");
    otpModal.style.display = "flex";
    otpInput.value = "";
    otpInput.focus();

    // Call send OTP API only if timer is not running
    if (resendCountdown <= 0) {
        fetch('/project-errawrs/src/api/auth/send_otp.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ phone_number: phoneNumber, purpose: 'registration' })
        }).then(res => res.json()).then(data => {
            if (!data.success) {
                alert(data.error || 'Failed to send OTP');
            }
        }).catch(() => {
            alert('Failed to send OTP. Please try again.');
        });
        setResendCountdown(60);
    }

    // Attach OTP verification handler
    const otpForm = document.getElementById('otp_verification_form');
    if (otpForm) {
        otpForm.onsubmit = (e) => {
            e.preventDefault();
            const otp = otpInput.value.trim();
            if (!/^\d{6}$/.test(otp)) {
                otpInput.classList.add('input-error');
                setTimeout(() => otpInput.classList.remove('input-error'), 1000);
                return;
            }
            // Call verify OTP API
            fetch('/project-errawrs/src/api/auth/verify_otp.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ phone_number: phoneNumber, otp, purpose: 'registration' })
            }).then(res => res.json()).then(data => {
                if (data.success) {
                    hideOtpModal();
                    if (typeof onVerified === 'function') onVerified();
                } else {
                    otpInput.classList.add('input-error');
                    alert(data.error || 'Invalid OTP');
                    setTimeout(() => otpInput.classList.remove('input-error'), 1000);
                }
            }).catch(() => {
                alert('Failed to verify OTP. Please try again.');
            });
        };
    }

    // Resend OTP logic
    const resendBtn = document.getElementById('resend_otp');
    if (resendBtn) {
        resendBtn.onclick = (e) => {
            e.preventDefault();
            if (resendCountdown > 0) return;
            fetch('/project-errawrs/src/api/auth/send_otp.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ phone_number: phoneNumber, purpose: 'registration' })
            }).then(res => res.json()).then(data => {
                if (!data.success) {
                    alert(data.error || 'Failed to send OTP');
                }
            }).catch(() => {
                alert('Failed to send OTP. Please try again.');
            });
            setResendCountdown(60);
        };
    }
}

export function hideOtpModal() {
    const otpModal = document.getElementById("otp_modal");
    if (!otpModal) return;
    otpModal.classList.remove("active");
    setTimeout(() => {
        otpModal.classList.add('hidden');
        otpModal.style.display = "none";
        const otpInput = document.getElementById("otp_code");
        if (otpInput) otpInput.value = "";
    }, 300);
} 
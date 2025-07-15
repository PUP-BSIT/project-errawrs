// OTP modal logic for registration

let resendCountdown = 0;
let resendInterval = null;
let failedAttempts = 0;
const MAX_ATTEMPTS = 3;

// Loading state management
let isLoading = false;

function showLoading() {
	isLoading = true;
	const verifyBtn = document.getElementById("verify_otp_btn");
	const otpInput = document.getElementById("otp_code");
	const resendBtn = document.getElementById("resend_otp");

	if (verifyBtn) {
		verifyBtn.disabled = true;
		verifyBtn.innerHTML =
			'<i class="fas fa-spinner fa-spin"></i> Verifying...';
	}

	if (otpInput) {
		otpInput.disabled = true;
	}

	if (resendBtn) {
		resendBtn.style.pointerEvents = "none";
		resendBtn.style.opacity = "0.5";
	}
}

function hideLoading() {
	isLoading = false;
	const verifyBtn = document.getElementById("verify_otp_btn");
	const otpInput = document.getElementById("otp_code");
	const resendBtn = document.getElementById("resend_otp");

	if (verifyBtn) {
		verifyBtn.disabled = false;
		verifyBtn.innerHTML = "Verify";
	}

	if (otpInput) {
		otpInput.disabled = false;
	}

	if (resendBtn) {
		resendBtn.style.pointerEvents = "auto";
		resendBtn.style.opacity = "1";
	}
}

function resetFailedAttempts() {
	failedAttempts = 0;
}

function setResendCountdown(seconds) {
	resendCountdown = seconds;
	const resendBtn = document.getElementById("resend_otp");
	if (!resendBtn) return;
	resendBtn.textContent = `Resend code in ${resendCountdown}s`;
	resendBtn.classList.remove("pointer");
	resendBtn.classList.add("no-pointer");
	resendBtn.removeAttribute("href");
	resendBtn.style.pointerEvents = "none";
	resendBtn.style.opacity = "0.6";
	if (resendInterval) clearInterval(resendInterval);
	resendInterval = setInterval(() => {
		resendCountdown--;
		if (resendCountdown <= 0) {
			clearInterval(resendInterval);
			resendBtn.textContent = "Resend code";
			resendBtn.classList.add("pointer");
			resendBtn.classList.remove("no-pointer");
			resendBtn.setAttribute("href", "#");
			resendBtn.style.pointerEvents = "auto";
			resendBtn.style.opacity = "1";
		} else {
			resendBtn.textContent = `Resend code in ${resendCountdown}s`;
		}
	}, 1000);
}

export function showOtpModal(phoneNumber, onVerified) {
	const otpModal = document.getElementById("otp_modal");
	const otpInput = document.getElementById("otp_code");
	if (!otpModal || !otpInput) return;

	// Reset failed attempts when modal opens
	resetFailedAttempts();

	otpModal.classList.remove("hidden");
	otpModal.classList.add("active");
	otpModal.style.display = "flex";
	otpInput.value = "";
	otpInput.focus();

	// Call send OTP API only if timer is not running
	if (resendCountdown <= 0) {
		fetch(API_ENDPOINTS.SEND_OTP, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({
				phone_number: phoneNumber,
				purpose: "registration",
			}),
		})
			.then((res) => res.json())
			.then((data) => {
				if (!data.success) {
					alert(data.error || "Failed to send OTP");
				}
			})
			.catch(() => {
				alert("Failed to send OTP. Please try again.");
			});
		setResendCountdown(60);
	}

	// Attach OTP verification handler
	const otpForm = document.getElementById("otp_verification_form");
	if (otpForm) {
		otpForm.onsubmit = (e) => {
			e.preventDefault();

			if (isLoading) return; // Prevent multiple submissions

			const otp = otpInput.value.trim();
			if (!/^\d{6}$/.test(otp)) {
				otpInput.classList.add("input-error");
				setTimeout(
					() => otpInput.classList.remove("input-error"),
					1000
				);
				return;
			}

			// Show loading animation
			showLoading();

			// Call verify OTP API
			fetch(API_ENDPOINTS.VERIFY_OTP, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					phone_number: phoneNumber,
					otp,
					purpose: "registration",
				}),
			})
				.then((res) => res.json())
				.then((data) => {
					if (data.success) {
						// OTP is valid - don't close modal yet, let registration complete
						resetFailedAttempts();
						if (typeof onVerified === "function") onVerified();
					} else {
						// OTP is invalid
						failedAttempts++;
						hideLoading();
						otpInput.classList.add("input-error");
						otpInput.value = ""; // Clear the input
						otpInput.focus();

						const remainingAttempts =
							MAX_ATTEMPTS - failedAttempts;
						if (remainingAttempts > 0) {
							alert(
								`Invalid OTP. You have ${remainingAttempts} attempt${
									remainingAttempts > 1 ? "s" : ""
								} remaining.`
							);
						} else {
							alert(
								"Maximum attempts reached. Please request a new OTP."
							);
							hideOtpModal();
						}

						setTimeout(
							() => otpInput.classList.remove("input-error"),
							1000
						);
					}
				})
				.catch(() => {
					hideLoading();
					alert("Failed to verify OTP. Please try again.");
				});
		};
	}

	// Resend OTP logic
	const resendBtn = document.getElementById("resend_otp");
	if (resendBtn) {
		resendBtn.onclick = (e) => {
			e.preventDefault();
			if (resendCountdown > 0 || isLoading) return;
			fetch(API_ENDPOINTS.SEND_OTP, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					phone_number: phoneNumber,
					purpose: "registration",
				}),
			})
				.then((res) => res.json())
				.then((data) => {
					if (!data.success) {
						alert(data.error || "Failed to send OTP");
					} else {
						// Reset failed attempts when new OTP is sent
						resetFailedAttempts();
					}
				})
				.catch(() => {
					alert("Failed to send OTP. Please try again.");
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
		otpModal.classList.add("hidden");
		otpModal.style.display = "none";
		const otpInput = document.getElementById("otp_code");
		if (otpInput) otpInput.value = "";
		// Reset failed attempts when modal closes
		resetFailedAttempts();
	}, 300);
}

// Export the hideLoading function so it can be called from other modules
export { hideLoading };

const FORM_VALIDATION = {
	ACCOUNT_NUMBER_MIN_LENGTH: 10,
	SMS_CODE_LENGTH: 6,
	PASSWORD_MIN_LENGTH: 8,
	USERNAME_MIN_LENGTH: 3,
	USERNAME_MAX_LENGTH: 20,
	FIRST_NAME_MIN_LENGTH: 2,
	LAST_NAME_MIN_LENGTH: 2,
};

const NOTIFICATION_TYPES = {
	SUCCESS: "success",
	ERROR: "error",
	WARNING: "warning",
	INFO: "info",
};

const STEPS = {
	ENROLLMENT: 1,
	VERIFICATION: 2,
	SUCCESS: 3,
};

const TIMER_SETTINGS = {
	RESEND_COUNTDOWN: 60,
	NOTIFICATION_AUTO_HIDE: 5000,
	NOTIFICATION_SHOW_DELAY: 100,
	NOTIFICATION_HIDE_DELAY: 300,
	API_SIMULATION_DELAY_SHORT: 1000,
	API_SIMULATION_DELAY_MEDIUM: 1500,
	API_SIMULATION_DELAY_LONG: 2000,
};

const INPUT_TYPES = {
	PASSWORD: "password",
	TEXT: "text",
};

const BUTTON_STATES = {
	CONTINUE: "CONTINUE",
	PROCESSING: '<i class="fas fa-spinner fa-spin"></i> Processing...',
	SEND: "Send",
	SENDING: "Sending...",
};

class RegistrationManager {
	constructor() {
		this.currentStep = STEPS.ENROLLMENT;
		this.maxStep = STEPS.SUCCESS;
		this.resendTimer = null;
		this.resendCountdown = TIMER_SETTINGS.RESEND_COUNTDOWN;
		this.formData = {};

		this.init();
	}

	init() {
		this.bindEvents();
		this.showStep(STEPS.ENROLLMENT);
	}

	bindEvents() {
		// Form submissions
		const detailsForm = document.getElementById("details_form");
		const otpForm = document.getElementById("otp_form");

		if (detailsForm) {
			detailsForm.addEventListener("submit", (e) => {
				this.handleDetailsSubmit(e);
			});
		}

		if (otpForm) {
			otpForm.addEventListener("submit", (e) => {
				this.handleOtpSubmit(e);
			});
		}

		// Navigation buttons
		const backToStepOneBtn = document.getElementById("back_to_step_one");
		if (backToStepOneBtn) {
			backToStepOneBtn.addEventListener("click", () => {
				this.goToStep(STEPS.ENROLLMENT);
			});
		}

		// Send OTP button
		const sendOtpBtn = document.getElementById("send_otp");
		if (sendOtpBtn) {
			sendOtpBtn.addEventListener("click", () => {
				this.sendSmsCode();
			});
		}

		// Resend OTP link
		const resendOtpLink = document.getElementById("resend_otp");
		if (resendOtpLink) {
			resendOtpLink.addEventListener("click", (e) => {
				e.preventDefault();
				if (!this.resendTimer) {
					this.sendSmsCode();
				}
			});
		}

		// Password toggle buttons
		const passwordToggleBtns =
			document.querySelectorAll(".password-toggle");
		passwordToggleBtns.forEach((button) => {
			button.addEventListener("click", (e) => {
				this.togglePassword(e.target.closest(".password-toggle"));
			});
		});

		// Dashboard button
		const dashboardBtn = document.querySelector(".btn-dashboard");
		if (dashboardBtn) {
			dashboardBtn.addEventListener("click", () => {
				this.goToDashboard();
			});
		}

		// Login button on success page
		const loginNowBtn = document.getElementById("login_now_btn");
		if (loginNowBtn) {
			loginNowBtn.addEventListener("click", () => {
				window.location.href = "./login_account_holder.html";
			});
		}

		// Real-time form validation
		this.setupFormValidation();
	}

	setupFormValidation() {
		// Account number validation
		const accountNumberInput = document.getElementById("account_number");
		if (accountNumberInput) {
			accountNumberInput.addEventListener("input", (e) => {
				this.validateAccountNumber(e.target);
			});
		}

		// SMS code validation
		const smsCodeInput = document.getElementById("sms_code");
		if (smsCodeInput) {
			smsCodeInput.addEventListener("input", (e) => {
				this.validateSmsCode(e.target);
			});
		}

		// Password validation
		const passwordInput = document.getElementById("password");
		const confirmPasswordInput =
			document.getElementById("confirm_password");

		if (passwordInput) {
			passwordInput.addEventListener("input", (e) => {
				this.validatePassword(e.target);
				if (confirmPasswordInput && confirmPasswordInput.value) {
					this.validatePasswordMatch(
						passwordInput,
						confirmPasswordInput
					);
				}
			});
		}

		if (confirmPasswordInput) {
			confirmPasswordInput.addEventListener("input", () => {
				if (passwordInput) {
					this.validatePasswordMatch(
						passwordInput,
						confirmPasswordInput
					);
				}
			});
		}

		// Username validation
		const usernameInput = document.getElementById("username");
		if (usernameInput) {
			usernameInput.addEventListener("input", (e) => {
				this.validateUsername(e.target);
			});
		}
	}

	validateAccountNumber(input) {
		const value = input.value;
		const digitOnlyRegex = /^\d+$/;
		const isValid =
			digitOnlyRegex.test(value) &&
			value.length >= FORM_VALIDATION.ACCOUNT_NUMBER_MIN_LENGTH;

		const errorMsg =
			`Account number must be at least ` +
			`${FORM_VALIDATION.ACCOUNT_NUMBER_MIN_LENGTH} digits`;
		this.setInputValidation(input, isValid, errorMsg);
		return isValid;
	}

	validateSmsCode(input) {
		const value = input.value;
		const smsCodeRegex = new RegExp(
			`^\\d{${FORM_VALIDATION.SMS_CODE_LENGTH}}$`
		);
		const isValid = smsCodeRegex.test(value);

		const errorMsg =
			`SMS code must be ` + `${FORM_VALIDATION.SMS_CODE_LENGTH} digits`;
		this.setInputValidation(input, isValid, errorMsg);
		return isValid;
	}

	validatePassword(input) {
		console.log("validatePassword called.");
		const value = input.value;
		const hasMinLength =
			value.length >= FORM_VALIDATION.PASSWORD_MIN_LENGTH;
		const hasUppercase = /[A-Z]/.test(value);
		const hasLowercase = /[a-z]/.test(value);
		const hasNumber = /\d/.test(value);
		const isValid =
			hasMinLength && hasUppercase && hasLowercase && hasNumber;

		const errorMsg =
			`Password must be at least ` +
			`${FORM_VALIDATION.PASSWORD_MIN_LENGTH} characters with ` +
			`uppercase, lowercase, and number`;
		this.setInputValidation(input, isValid, errorMsg);
		console.log("validatePassword result:", isValid);
		return isValid;
	}

	validatePasswordMatch(passwordInput, confirmPasswordInput) {
		console.log("validatePasswordMatch called.");
		const passwordValue = passwordInput.value;
		const confirmPasswordValue = confirmPasswordInput.value;
		const isValid =
			passwordValue === confirmPasswordValue && passwordValue.length > 0;

		this.setInputValidation(
			confirmPasswordInput,
			isValid,
			"Passwords do not match"
		);
		console.log("validatePasswordMatch result:", isValid);
		return isValid;
	}

	validateUsername(input) {
		console.log("validateUsername called.");
		const value = input.value;
		const usernameRegex = new RegExp(
			`^[a-zA-Z0-9_]{${FORM_VALIDATION.USERNAME_MIN_LENGTH},` +
				`${FORM_VALIDATION.USERNAME_MAX_LENGTH}}$`
		);
		const isValid = usernameRegex.test(value);

		const errorMsg =
			`Username must be ` +
			`${FORM_VALIDATION.USERNAME_MIN_LENGTH}-` +
			`${FORM_VALIDATION.USERNAME_MAX_LENGTH} characters ` +
			`(letters, numbers, underscore only)`;
		this.setInputValidation(input, isValid, errorMsg);
		console.log("validateUsername result:", isValid);
		return isValid;
	}

	validateName(input, minLength) {
		console.log("validateName called.");
		const value = input.value.trim();
		const isValid = value.length >= minLength;

		const errorMsg = `Name must be at least ${minLength} characters`;
		this.setInputValidation(input, isValid, errorMsg);
		console.log("validateName result:", isValid);
		return isValid;
	}

	setInputValidation(input, isValid, errorMessage) {
		const formGroup = input.closest(".form-group");

		if (!formGroup) return;

		// Remove existing validation classes
		formGroup.classList.remove("error", "success");

		// Remove existing error message
		const existingError = formGroup.querySelector(".error-message");
		if (existingError) {
			existingError.remove();
		}

		if (input.value.length > 0) {
			if (isValid) {
				formGroup.classList.add("success");
			} else {
				formGroup.classList.add("error");

				// Add error message
				const errorDiv = document.createElement("div");
				errorDiv.className = "error-message";
				errorDiv.textContent = errorMessage;
				formGroup.appendChild(errorDiv);
			}
		}
	}

	handleDetailsSubmit(e) {
		console.log("handleDetailsSubmit triggered.");
		e.preventDefault();

		const firstNameInput = document.getElementById("first_name");
		const lastNameInput = document.getElementById("last_name");
		const usernameInput = document.getElementById("username");
		const passwordInput = document.getElementById("password");
		const confirmPasswordInput =
			document.getElementById("confirm_password");
		const phoneNumberInput = document.getElementById("phone_number");

		if (
			!firstNameInput ||
			!lastNameInput ||
			!usernameInput ||
			!passwordInput ||
			!confirmPasswordInput ||
			!phoneNumberInput
		) {
			console.error(
				"One or more input elements not found in Details form."
			);
			this.showNotification(
				"An internal error occurred.",
				NOTIFICATION_TYPES.ERROR
			);
			return;
		}

		// Validate all fields
		const isFirstNameValid = this.validateName(
			firstNameInput,
			FORM_VALIDATION.FIRST_NAME_MIN_LENGTH
		);
		const isLastNameValid = this.validateName(
			lastNameInput,
			FORM_VALIDATION.LAST_NAME_MIN_LENGTH
		);
		const isUsernameValid = this.validateUsername(usernameInput);
		const isPasswordValid = this.validatePassword(passwordInput);
		const isPasswordMatchValid = this.validatePasswordMatch(
			passwordInput,
			confirmPasswordInput
		);
		const isPhoneNumberValid = this.validatePhoneNumber(phoneNumberInput);

		const allFieldsValid =
			isFirstNameValid &&
			isLastNameValid &&
			isUsernameValid &&
			isPasswordValid &&
			isPasswordMatchValid &&
			isPhoneNumberValid;

		if (allFieldsValid) {
			this.showLoadingState("details_form");

			// Store credentials using register.php
			fetch("../../src/api/user/register.php", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					first_name: firstNameInput.value.trim(),
					last_name: lastNameInput.value.trim(),
					username: usernameInput.value.trim(),
					password: passwordInput.value,
					phone_number: phoneNumberInput.value.trim(),
				}),
			})
				.then((response) => response.json())
				.then((data) => {
					this.hideLoadingState("details_form");
					if (data.success) {
						this.formData = {
							first_name: firstNameInput.value.trim(),
							last_name: lastNameInput.value.trim(),
							username: usernameInput.value.trim(),
							password: passwordInput.value,
							phone_number: phoneNumberInput.value.trim(),
						};
						this.goToStep(STEPS.VERIFICATION);
						this.showNotification(
							"Details saved. Please verify your phone number.",
							NOTIFICATION_TYPES.SUCCESS
						);
					} else {
						this.showNotification(
							data.error,
							NOTIFICATION_TYPES.ERROR
						);
					}
				})
				.catch((error) => {
					this.hideLoadingState("details_form");
					this.showNotification(
						"An error occurred. Please try again.",
						NOTIFICATION_TYPES.ERROR
					);
					console.error("Error:", error);
				});
		} else {
			this.showNotification(
				"Please fill in all fields correctly.",
				NOTIFICATION_TYPES.ERROR
			);
		}
	}

	handleOtpSubmit(e) {
		e.preventDefault();

		const otpCodeInput = document.getElementById("otp_code");
		const submitBtn = document.querySelector(
			'#otp_form button[type="submit"]'
		);

		if (!otpCodeInput || !submitBtn) {
			console.error("OTP input element or submit button not found.");
			this.showNotification(
				"An internal error occurred.",
				NOTIFICATION_TYPES.ERROR
			);
			return;
		}

		const otpCode = otpCodeInput.value.trim();
		if (!otpCode) {
			this.showNotification(
				"Please enter the OTP code.",
				NOTIFICATION_TYPES.ERROR
			);
			return;
		}

		const isOtpValid = otpCode.length === FORM_VALIDATION.SMS_CODE_LENGTH;
		if (isOtpValid) {
			this.showLoadingState("otp_form");
			submitBtn.style.opacity = "0.5";
			submitBtn.disabled = true;
			// Verify OTP and complete registration
			fetch("../../src/api/auth/verify_otp.php", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					otp: otpCode,
				}),
			})
				.then((response) => {
					if (!response.ok) {
						return response.json().then((data) => {
							throw new Error(
								data.error || "Failed to verify OTP"
							);
						});
					}
					return response.json();
				})
				.then((data) => {
					if (data.success) {
						this.goToStep(STEPS.SUCCESS);
						this.showNotification(
							"Registration completed successfully!",
							NOTIFICATION_TYPES.SUCCESS
						);
						this.registeredData = data;
						this.populateSuccessPage();
					} else {
						submitBtn.style.opacity = "1";
						submitBtn.disabled = false;
						otpCodeInput.value = ""; // Clear invalid OTP
						otpCodeInput.focus();
						this.showNotification(
							data.error,
							NOTIFICATION_TYPES.ERROR
						);
					}
					this.hideLoadingState("otp_form");
				})
				.catch((error) => {
					this.hideLoadingState("otp_form");
					submitBtn.style.opacity = "1";
					submitBtn.disabled = false;
					otpCodeInput.value = ""; // Clear invalid OTP
					otpCodeInput.focus();
					this.showNotification(
						error.message ||
							"Failed to verify OTP. Please try again.",
						NOTIFICATION_TYPES.ERROR
					);
					console.error("Error:", error);
				});
		} else {
			this.showNotification(
				`Please enter a valid ${FORM_VALIDATION.SMS_CODE_LENGTH}-digit OTP.`,
				NOTIFICATION_TYPES.ERROR
			);
			otpCodeInput.focus();
		}
	}

	goToStep(step) {
		console.log("goToStep called with step:", step);
		const isValidStep = step >= STEPS.ENROLLMENT && step <= this.maxStep;
		if (!isValidStep) return;

		this.currentStep = step;
		this.showStep(step);
		this.updateStepIndicators();

		// If moving to verification step, disable continue button initially
		if (step === STEPS.VERIFICATION) {
			const submitBtn = document.querySelector(
				'#otp_form button[type="submit"]'
			);
			const otpInput = document.getElementById("otp_code");
			if (submitBtn) {
				submitBtn.style.opacity = "0.5";
				submitBtn.disabled = true;
			}
			if (otpInput) {
				otpInput.value = ""; // Clear OTP input
			}
		}
	}

	showStep(step) {
		// Hide all steps
		const allSteps = document.querySelectorAll(".form-step");
		allSteps.forEach((stepEl) => {
			stepEl.classList.remove("active");
		});

		// Show current step
		const currentStepElement = document.getElementById(
			`step_${this.getStepName(step)}`
		);
		if (currentStepElement) {
			currentStepElement.classList.add("active");
		}
	}

	getStepName(step) {
		switch (step) {
			case STEPS.ENROLLMENT:
				return "one";
			case STEPS.VERIFICATION:
				return "two";
			case STEPS.SUCCESS:
				return "three";
			default:
				return "one";
		}
	}

	updateStepIndicators() {
		const stepIndicators = document.querySelectorAll(
			".step-indicators .step"
		);
		stepIndicators.forEach((indicator) => {
			const stepNumber = parseInt(indicator.dataset.step);
			indicator.classList.toggle(
				"active",
				stepNumber === this.currentStep
			);
		});
	}

	sendSmsCode() {
		const sendBtn = document.getElementById("send_otp");
		const submitBtn = document.querySelector(
			'#otp_form button[type="submit"]'
		);
		const otpInput = document.getElementById("otp_code");

		if (!sendBtn || !submitBtn || !otpInput) {
			console.error("Required elements not found");
			return;
		}

		// Check if we have the phone number
		if (!this.formData || !this.formData.phone_number) {
			this.showNotification(
				"Please complete the registration form first",
				NOTIFICATION_TYPES.ERROR
			);
			this.goToStep(STEPS.ENROLLMENT);
			return;
		}

		// Show loading state
		sendBtn.innerHTML = BUTTON_STATES.SENDING;
		sendBtn.disabled = true;
		otpInput.value = ""; // Clear any previous OTP
		submitBtn.style.opacity = "0.5";
		submitBtn.disabled = true;
		// Send OTP request
		fetch("../../src/api/auth/send_otp.php", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				phone_number: this.formData.phone_number,
			}),
		})
			.then((response) => {
				if (!response.ok) {
					return response.json().then((data) => {
						throw new Error(data.error || "Failed to send OTP");
					});
				}
				return response.json();
			})
			.then((data) => {
				if (data.success) {
					this.showNotification(
						"SMS code sent successfully! Please enter the code.",
						NOTIFICATION_TYPES.SUCCESS
					);
					this.startResendTimer();
					// Enable submit button after OTP is sent
					submitBtn.style.opacity = "1";
					submitBtn.disabled = false;
					otpInput.focus(); // Focus the OTP input field
				} else {
					sendBtn.innerHTML = BUTTON_STATES.SEND;
					sendBtn.disabled = false;
					this.showNotification(
						data.error,
						NOTIFICATION_TYPES.ERROR
					);
				}
			})
			.catch((error) => {
				sendBtn.innerHTML = BUTTON_STATES.SEND;
				sendBtn.disabled = false;
				this.showNotification(
					error.message ||
						"Failed to send SMS code. Please try again.",
					NOTIFICATION_TYPES.ERROR
				);
				console.error("Error:", error);
			});
	}

	startResendTimer() {
		const resendLink = document.getElementById("resend_otp");
		const sendBtn = document.getElementById("send_otp");
		const submitBtn = document.querySelector(
			'#otp_form button[type="submit"]'
		);

		if (!resendLink || !sendBtn || !submitBtn) return;

		this.resendCountdown = TIMER_SETTINGS.RESEND_COUNTDOWN;

		// Disable send button and resend link, but keep submit enabled
		resendLink.style.pointerEvents = "none";
		resendLink.style.opacity = "0.5";
		sendBtn.disabled = true;
		sendBtn.innerHTML = `Resend in ${this.resendCountdown}s`;
		this.resendTimer = setInterval(() => {
			this.resendCountdown--;
			resendLink.textContent = `Resend code in ${this.resendCountdown}s`;
			sendBtn.innerHTML = `Resend in ${this.resendCountdown}s`;
			if (this.resendCountdown <= 0) {
				clearInterval(this.resendTimer);
				this.resendTimer = null;
				resendLink.textContent = "Resend code";
				resendLink.style.pointerEvents = "auto";
				resendLink.style.opacity = "1";
				sendBtn.disabled = false;
				sendBtn.innerHTML = BUTTON_STATES.SEND;
			}
		}, 1000);
	}

	togglePassword(button) {
		if (!button) return;

		const targetId = button.dataset.target;
		const input = document.getElementById(targetId);
		const icon = button.querySelector("i");

		if (!input || !icon) return;

		const isPassword = input.type === INPUT_TYPES.PASSWORD;

		input.type = isPassword ? INPUT_TYPES.TEXT : INPUT_TYPES.PASSWORD;
		icon.className = isPassword ? "fas fa-eye" : "fas fa-eye-slash";
	}

	showLoadingState(formId) {
		const form = document.getElementById(formId);
		if (!form) return;

		const submitBtn = form.querySelector('button[type="submit"]');
		if (submitBtn) {
			submitBtn.innerHTML = BUTTON_STATES.PROCESSING;
			submitBtn.disabled = true;
		}

		// Disable all form inputs
		const inputs = form.querySelectorAll("input, button");
		inputs.forEach((input) => {
			if (input.type !== "submit") {
				input.disabled = true;
			}
		});
	}

	hideLoadingState(formId) {
		const form = document.getElementById(formId);
		if (!form) return;

		const submitBtn = form.querySelector('button[type="submit"]');
		if (submitBtn) {
			submitBtn.innerHTML = BUTTON_STATES.CONTINUE;
			submitBtn.disabled = false;
		}

		// Re-enable all form inputs
		const inputs = form.querySelectorAll("input, button");
		inputs.forEach((input) => {
			input.disabled = false;
		});
	}

	generateAccountNumber() {
		// Simple timestamp-based account number
		const timestamp = Date.now();
		const random = Math.floor(Math.random() * 1000);
		return `SAC${timestamp}${random}`.substring(0, 12); // Example format, adjust as needed
	}

	populateSuccessPage() {
		const usernameElement = document.getElementById("registered_username");
		const accountNumberElement = document.getElementById(
			"generated_account_number"
		);

		if (usernameElement && accountNumberElement && this.registeredData) {
			usernameElement.textContent = this.registeredData.user.username;
			accountNumberElement.textContent =
				this.registeredData.account.account_number;
		} else {
			console.error(
				"Success page elements not found or missing registration data."
			);
		}
	}

	startOtpTimer() {
		const resendLink = document.getElementById("resend_otp");
		if (!resendLink) return;

		this.resendCountdown = TIMER_SETTINGS.RESEND_COUNTDOWN;
		resendLink.style.pointerEvents = "none";
		resendLink.style.opacity = "0.5";

		resendLink.textContent = `Resend OTP in ${this.resendCountdown}s`;

		this.resendTimer = setInterval(() => {
			this.resendCountdown--;
			resendLink.textContent = `Resend OTP in ${this.resendCountdown}s`;

			if (this.resendCountdown <= 0) {
				clearInterval(this.resendTimer);
				this.resendTimer = null;
				resendLink.textContent = "Resend OTP";
				resendLink.style.pointerEvents = "auto";
				resendLink.style.opacity = "1";
			}
		}, 1000);
	}

	showNotification(message, type = NOTIFICATION_TYPES.INFO) {
		// Remove existing notification
		const existingNotification = document.querySelector(".notification");
		if (existingNotification) {
			existingNotification.remove();
		}

		// Create notification element
		const notification = document.createElement("div");
		notification.className = `notification notification-${type}`;
		notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
                <button class="notification-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>`;

		// Add to DOM
		document.body.appendChild(notification);

		// Show notification with animation
		setTimeout(() => {
			notification.classList.add("show");
		}, TIMER_SETTINGS.NOTIFICATION_SHOW_DELAY);

		// Auto-hide notification
		setTimeout(() => {
			this.hideNotification(notification);
		}, TIMER_SETTINGS.NOTIFICATION_AUTO_HIDE);

		// Close button event
		const closeBtn = notification.querySelector(".notification-close");
		if (closeBtn) {
			closeBtn.addEventListener("click", () => {
				this.hideNotification(notification);
			});
		}
	}

	getNotificationIcon(type) {
		switch (type) {
			case NOTIFICATION_TYPES.SUCCESS:
				return "fa-check-circle";
			case NOTIFICATION_TYPES.ERROR:
				return "fa-exclamation-circle";
			case NOTIFICATION_TYPES.WARNING:
				return "fa-exclamation-triangle";
			case NOTIFICATION_TYPES.INFO:
			default:
				return "fa-info-circle";
		}
	}

	hideNotification(notification) {
		if (!notification) return;

		notification.classList.remove("show");
		setTimeout(() => {
			if (notification.parentNode) {
				notification.parentNode.removeChild(notification);
			}
		}, TIMER_SETTINGS.NOTIFICATION_HIDE_DELAY);
	}

	goToDashboard() {
		this.showNotification(
			"Redirecting to dashboard...",
			NOTIFICATION_TYPES.INFO
		);

		// Simulate redirect
		setTimeout(() => {
			window.location.href = "./user_dashboard.html";
		}, 1000);
	}

	validatePhoneNumber(input) {
		console.log("validatePhoneNumber called.");
		const value = input.value.trim();
		// Basic validation: starts with +, contains only digits and spaces/hyphens
		// In a real app, use a more robust regex based on expected formats
		const phoneRegex = /^\+?\d[\d\s-]{7,}/;
		const isValid = phoneRegex.test(value);

		const errorMsg =
			"Please enter a valid phone number (e.g., +1 555 123 4567)";
		this.setInputValidation(input, isValid, errorMsg);
		console.log("validatePhoneNumber result:", isValid);
		return isValid;
	}
}

document.addEventListener("DOMContentLoaded", () => {
	new RegistrationManager();
});

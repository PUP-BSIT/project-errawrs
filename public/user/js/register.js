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
		this.formData = null;
		this.resendTimer = null;
		this.registeredData = null;
		this.idImage = null;
		this.isUnder18 = false;
		this.bindEvents();
	}

	bindEvents() {
		// Form submissions
		const detailsForm = document.getElementById("details_form");
		const otpForm = document.getElementById("otp_form");

		if (detailsForm) {
			detailsForm.addEventListener("submit", (e) => {
				this.handleDetailsSubmit(e);
			});

			// Add input event listeners to save data as user types
			const inputs = detailsForm.querySelectorAll('input');
			inputs.forEach(input => {
				input.addEventListener('input', () => {
					this.saveFormData();
				});
			});
		}

		if (otpForm) {
			otpForm.addEventListener("submit", (e) => {
				this.handleOtpSubmit(e);
			});
		}

		// Back button handlers
		const backToStepOneBtn = document.getElementById("back_to_step_one");
		const backToStepTwoBtn = document.getElementById("back_to_step_two");
		
		if (backToStepOneBtn) {
			backToStepOneBtn.addEventListener("click", () => {
				this.goToStep(STEPS.ENROLLMENT);
			});
		}

		if (backToStepTwoBtn) {
			backToStepTwoBtn.addEventListener("click", () => {
				this.goToStep(STEPS.VERIFICATION);
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

		// Date of birth validation
		const dobInput = document.getElementById('date_of_birth');
		if (dobInput) {
			dobInput.addEventListener('change', (e) => this.validateAge(e.target));
			// Set max date to 18 years ago
			const today = new Date();
			const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
			dobInput.max = maxDate.toISOString().split('T')[0];
		}

		// File upload handling
		const fileInput = document.getElementById('id_image');
		const uploadContainer = document.querySelector('.file-upload-container');

		if (fileInput && uploadContainer) {
			fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

			// Drag and drop events
			uploadContainer.addEventListener('dragover', (e) => {
				e.preventDefault();
				e.stopPropagation();
				if (!this.idImage) {
					uploadContainer.classList.add('drag-over');
				}
			});

			uploadContainer.addEventListener('dragleave', (e) => {
				e.preventDefault();
				e.stopPropagation();
				uploadContainer.classList.remove('drag-over');
			});

			uploadContainer.addEventListener('drop', (e) => {
				e.preventDefault();
				e.stopPropagation();
				uploadContainer.classList.remove('drag-over');
				
				if (!this.idImage) {
					const files = e.dataTransfer.files;
					if (files.length) {
						fileInput.files = files;
						this.handleFileSelect({ target: fileInput });
					}
				}
			});
		}
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

		// First name validation
		const firstNameInput = document.getElementById("first_name");
		if (firstNameInput) {
			// Remove any non-letter characters immediately
			firstNameInput.addEventListener("input", (e) => {
				e.target.value = e.target.value.replace(/[^A-Za-z\s-]/g, '');
				this.validateName(e.target, FORM_VALIDATION.FIRST_NAME_MIN_LENGTH);
			});
		}

		// Last name validation
		const lastNameInput = document.getElementById("last_name");
		if (lastNameInput) {
			// Remove any non-letter characters immediately
			lastNameInput.addEventListener("input", (e) => {
				e.target.value = e.target.value.replace(/[^A-Za-z\s-]/g, '');
				this.validateName(e.target, FORM_VALIDATION.LAST_NAME_MIN_LENGTH);
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
		const value = input.value;
		const requirements = {
			length: value.length >= FORM_VALIDATION.PASSWORD_MIN_LENGTH,
			uppercase: /[A-Z]/.test(value),
			lowercase: /[a-z]/.test(value),
			number: /\d/.test(value),
			symbol: /[!@#$%^&*(),.?":{}|<>]/.test(value)
		};

		// Update requirements display
		const requirementsDiv = input.parentElement.querySelector('.password-requirements');
		if (!requirementsDiv) {
			const newRequirementsDiv = document.createElement('div');
			newRequirementsDiv.className = 'password-requirements';
			newRequirementsDiv.innerHTML = `
				<span class="requirement ${requirements.length ? 'met' : ''}" data-requirement="length">
					<i class="fas ${requirements.length ? 'fa-check' : 'fa-times'}"></i> 8+ characters
				</span>
				<span class="requirement ${requirements.uppercase ? 'met' : ''}" data-requirement="uppercase">
					<i class="fas ${requirements.uppercase ? 'fa-check' : 'fa-times'}"></i> Uppercase
				</span>
				<span class="requirement ${requirements.lowercase ? 'met' : ''}" data-requirement="lowercase">
					<i class="fas ${requirements.lowercase ? 'fa-check' : 'fa-times'}"></i> Lowercase
				</span>
				<span class="requirement ${requirements.number ? 'met' : ''}" data-requirement="number">
					<i class="fas ${requirements.number ? 'fa-check' : 'fa-times'}"></i> Number
				</span>
				<span class="requirement ${requirements.symbol ? 'met' : ''}" data-requirement="symbol">
					<i class="fas ${requirements.symbol ? 'fa-check' : 'fa-times'}"></i> Symbol
				</span>
			`;
			input.parentElement.appendChild(newRequirementsDiv);
		} else {
			Object.keys(requirements).forEach(req => {
				const reqElement = requirementsDiv.querySelector(`[data-requirement="${req}"]`);
				if (reqElement) {
					reqElement.classList.toggle('met', requirements[req]);
					const icon = reqElement.querySelector('i');
					if (icon) {
						icon.className = `fas ${requirements[req] ? 'fa-check' : 'fa-times'}`;
					}
				}
			});
		}

		const isValid = Object.values(requirements).every(Boolean);
		this.setInputValidation(input, isValid, "Please meet all password requirements");
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
		const lettersOnlyRegex = /^[A-Za-z\s-]+$/;
		const isValidLength = value.length >= minLength;
		const isValidCharacters = lettersOnlyRegex.test(value);
		const isValid = isValidLength && isValidCharacters;

		let errorMsg = '';
		if (!isValidLength) {
			errorMsg = `Name must be at least ${minLength} characters`;
		} else if (!isValidCharacters) {
			errorMsg = 'Name can only contain letters, spaces, and hyphens';
		}

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
		e.preventDefault();

		// Check age first
		const dobInput = document.getElementById('date_of_birth');
		if (dobInput && !this.validateAge(dobInput)) {
			this.showNotification('You must be at least 18 years old to register.', NOTIFICATION_TYPES.ERROR);
			return;
		}

		// Get all form inputs
		const inputs = {
			firstNameInput: document.getElementById("first_name"),
			lastNameInput: document.getElementById("last_name"),
			dateOfBirthInput: document.getElementById("date_of_birth"),
			nationalityInput: document.getElementById("nationality"),
			streetInput: document.getElementById("street"),
			cityInput: document.getElementById("city"),
			zipCodeInput: document.getElementById("zip_code"),
			countryInput: document.getElementById("country"),
			emailInput: document.getElementById("email"),
			phoneNumberInput: document.getElementById("phone_number"),
			idTypeInput: document.getElementById("id_type"),
			idImageInput: document.getElementById("id_image"),
			usernameInput: document.getElementById("username"),
			passwordInput: document.getElementById("password"),
			confirmPasswordInput: document.getElementById("confirm_password"),
			securityQ1Input: document.getElementById("security_q1"),
			securityQ2Input: document.getElementById("security_q2"),
			securityQ3Input: document.getElementById("security_q3")
		};

		// Check if all inputs exist
		for (const [key, input] of Object.entries(inputs)) {
			if (!input) {
				console.error(`${key} not found in form.`);
				this.showNotification("An internal error occurred.", NOTIFICATION_TYPES.ERROR);
				return;
			}
		}

		// Validate all fields
		const validations = {
			isFirstNameValid: this.validateName(inputs.firstNameInput, FORM_VALIDATION.FIRST_NAME_MIN_LENGTH),
			isLastNameValid: this.validateName(inputs.lastNameInput, FORM_VALIDATION.LAST_NAME_MIN_LENGTH),
			isDateOfBirthValid: inputs.dateOfBirthInput.value.trim() !== "",
			isNationalityValid: inputs.nationalityInput.value.trim() !== "",
			isStreetValid: inputs.streetInput.value.trim() !== "",
			isCityValid: inputs.cityInput.value.trim() !== "",
			isZipCodeValid: inputs.zipCodeInput.value.trim() !== "",
			isCountryValid: inputs.countryInput.value.trim() !== "",
			isEmailValid: this.validateEmail(inputs.emailInput),
			isPhoneNumberValid: this.validatePhoneNumber(inputs.phoneNumberInput),
			isIdTypeValid: inputs.idTypeInput.value !== "",
			isIdImageValid: this.idImage !== null,
			isUsernameValid: this.validateUsername(inputs.usernameInput),
			isPasswordValid: this.validatePassword(inputs.passwordInput),
			isPasswordMatchValid: this.validatePasswordMatch(inputs.passwordInput, inputs.confirmPasswordInput),
			isSecurityQ1Valid: inputs.securityQ1Input.value.trim() !== "",
			isSecurityQ2Valid: inputs.securityQ2Input.value.trim() !== "",
			isSecurityQ3Valid: inputs.securityQ3Input.value.trim() !== ""
		};

		const allFieldsValid = Object.values(validations).every(isValid => isValid);

		if (!validations.isIdImageValid) {
			this.showNotification("Please upload your ID image.", NOTIFICATION_TYPES.ERROR);
			return;
		}

		if (allFieldsValid) {
			// Save form data before proceeding
			this.saveFormData();

			// Create FormData object for file upload
			const formData = new FormData();
			
			// Add all text fields
			const formFields = {
				first_name: inputs.firstNameInput.value.trim(),
				last_name: inputs.lastNameInput.value.trim(),
				date_of_birth: inputs.dateOfBirthInput.value,
				nationality: inputs.nationalityInput.value.trim(),
				street: inputs.streetInput.value.trim(),
				city: inputs.cityInput.value.trim(),
				zip_code: inputs.zipCodeInput.value.trim(),
				country: inputs.countryInput.value.trim(),
				email: inputs.emailInput.value.trim(),
				phone_number: inputs.phoneNumberInput.value.trim(),
				id_type: inputs.idTypeInput.value,
				username: inputs.usernameInput.value.trim(),
				password: inputs.passwordInput.value,
				security_questions: {
					first_school: inputs.securityQ1Input.value.trim(),
					childhood_friend: inputs.securityQ2Input.value.trim(),
					favorite_show: inputs.securityQ3Input.value.trim()
				}
			};

			// Add the form fields as a JSON string
			formData.append('data', JSON.stringify(formFields));
			
			// Add the ID image
			if (this.idImage) {
				// Convert base64 to blob
				const byteString = atob(this.idImage.data.split(',')[1]);
				const mimeString = this.idImage.data.split(',')[0].split(':')[1].split(';')[0];
				const ab = new ArrayBuffer(byteString.length);
				const ia = new Uint8Array(ab);
				for (let i = 0; i < byteString.length; i++) {
					ia[i] = byteString.charCodeAt(i);
				}
				const blob = new Blob([ab], { type: mimeString });
				formData.append('id_image', blob, this.idImage.name);
			}

			// Send registration data to API
			fetch('/project-errawrs/src/api/user/register.php', {
				method: 'POST',
				body: formData
			})
			.then(response => response.json())
			.then(data => {
				if (data.success) {
					this.goToStep(STEPS.VERIFICATION);
					this.showNotification("Please verify your phone number.", NOTIFICATION_TYPES.SUCCESS);
				} else {
					this.showNotification(data.error || "Registration failed. Please try again.", NOTIFICATION_TYPES.ERROR);
				}
			})
			.catch(error => {
				console.error('Error:', error);
				this.showNotification(
					"An error occurred during registration. Please try again.",
					NOTIFICATION_TYPES.ERROR
				);
			});
		} else {
			this.showNotification("Please fill in all fields correctly.", NOTIFICATION_TYPES.ERROR);
		}
	}

	handleOtpSubmit(e) {
		e.preventDefault();

		const otpCodeInput = document.getElementById("otp_code");
		const submitBtn = document.querySelector('#otp_form button[type="submit"]');

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
			
			// Make actual API call to verify OTP
			fetch('/project-errawrs/src/api/auth/verify_otp.php', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					otp: otpCode,
					phone_number: this.formData.phone_number
				})
			})
			.then(response => response.json())
			.then(data => {
				if (data.success) {
					// Store the registration data from the API response
					this.registeredData = {
						username: data.user.username,
						account_number: data.user.account_number,
						status: 'Active'
					};
					
					// Update success page elements
					const usernameElement = document.getElementById("registered_username");
					const accountNumberElement = document.getElementById("account_number");
					
					if (usernameElement) {
						usernameElement.textContent = this.registeredData.username;
					}
					if (accountNumberElement) {
						accountNumberElement.textContent = this.registeredData.account_number;
					}

					this.hideLoadingState("otp_form");
					this.goToStep(STEPS.SUCCESS);
					this.showNotification(
						"Registration completed successfully!",
						NOTIFICATION_TYPES.SUCCESS
					);
				} else {
					this.hideLoadingState("otp_form");
					submitBtn.style.opacity = "1";
					submitBtn.disabled = false;
					this.showNotification(
						data.error || "Failed to verify OTP. Please try again.",
						NOTIFICATION_TYPES.ERROR
					);
				}
			})
			.catch(error => {
				console.error('Error:', error);
				this.hideLoadingState("otp_form");
				submitBtn.style.opacity = "1";
				submitBtn.disabled = false;
				this.showNotification(
					"An error occurred while verifying OTP. Please try again.",
					NOTIFICATION_TYPES.ERROR
				);
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

		// Don't allow going back if registration is complete
		if (this.registeredData && step < STEPS.SUCCESS) {
			this.showNotification("Registration is already complete. Please log in.", NOTIFICATION_TYPES.INFO);
			return;
		}

		const currentStepElement = document.querySelector('.form-step.active');
		const newStepElement = document.getElementById(`step_${this.getStepName(step)}`);

		if (!newStepElement) {
			console.error(`Target step element not found: step_${this.getStepName(step)}`);
			return;
		}

		// If going back to step 1, prepare the data first
		if (step === STEPS.ENROLLMENT) {
			// Ensure form data exists
			if (!this.formData) {
				this.formData = this.collectFormData();
			}
		}

		// Hide current step with animation
		if (currentStepElement) {
			currentStepElement.style.opacity = '0';
			currentStepElement.style.transform = 'translateY(20px)';
			
			setTimeout(() => {
				currentStepElement.classList.remove('active');
				currentStepElement.style.display = 'none';
				
				// Show new step
				newStepElement.style.display = 'block';
				newStepElement.offsetHeight; // Trigger reflow
				newStepElement.classList.add('active');
				newStepElement.style.opacity = '1';
				newStepElement.style.transform = 'translateY(0)';

				// Handle step-specific logic
				if (step === STEPS.ENROLLMENT) {
					console.log("Restoring form data:", this.formData);
					this.restoreFormData();
				} else if (step === STEPS.VERIFICATION) {
					// Clear any existing OTP input
					const otpInput = document.getElementById('otp_code');
					if (otpInput) otpInput.value = '';
					
					// Reset the resend timer if it exists
					if (this.resendTimer) {
						clearInterval(this.resendTimer);
						this.startResendTimer();
					}
				}
			}, 300);
		} else {
			// If there's no current step, just show the new step immediately
			newStepElement.style.display = 'block';
			newStepElement.classList.add('active');
			if (step === STEPS.ENROLLMENT) {
				console.log("Restoring form data:", this.formData);
				this.restoreFormData();
			}
		}

		this.currentStep = step;
		this.updateStepIndicators();
	}

	showNewStep(step) {
		// Show new step with animation
		const stepId = step === STEPS.SUCCESS ? 'complete_step' : `step_${this.getStepName(step)}`;
		const newStepElement = document.getElementById(stepId);
		
		if (newStepElement) {
			newStepElement.style.display = 'block';
			// Trigger reflow
			newStepElement.offsetHeight;
			newStepElement.classList.add('active');
			newStepElement.style.opacity = '1';
			newStepElement.style.transform = 'translateY(0)';

			// If moving to verification step, disable continue button initially
			if (step === STEPS.VERIFICATION) {
				const submitBtn = document.querySelector('#otp_form button[type="submit"]');
				const otpInput = document.getElementById("otp_code");
				if (submitBtn) {
					submitBtn.style.opacity = "0.5";
					submitBtn.disabled = true;
				}
				if (otpInput) {
					otpInput.value = ""; // Clear OTP input
				}
			}
		} else {
			console.error(`Step element with id ${stepId} not found`);
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
		const steps = document.querySelectorAll('.step');
		steps.forEach((step, index) => {
			const stepNumber = index + 1;
			step.classList.remove('active', 'complete');
			
			if (stepNumber === this.currentStep) {
				step.classList.add('active');
			} else if (stepNumber < this.currentStep) {
				step.classList.add('complete');
			}
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
		// Format: 544250000XXX where XXX is a random number
		const prefix = "54425";  // Fixed prefix
		const middle = "0000";   // Fixed middle part
		const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // Random 3 digits
		return `${prefix}${middle}${random}`; // Will create format like 544250000105
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

	collectFormData() {
		const data = {
			first_name: document.getElementById('first_name')?.value || '',
			last_name: document.getElementById('last_name')?.value || '',
			date_of_birth: document.getElementById('date_of_birth')?.value || '',
			nationality: document.getElementById('nationality')?.value || '',
			street: document.getElementById('street')?.value || '',
			city: document.getElementById('city')?.value || '',
			zip_code: document.getElementById('zip_code')?.value || '',
			country: document.getElementById('country')?.value || '',
			email: document.getElementById('email')?.value || '',
			phone_number: document.getElementById('phone_number')?.value || '',
			id_type: document.getElementById('id_type')?.value || '',
			username: document.getElementById('username')?.value || '',
			password: document.getElementById('password')?.value || '',
			confirm_password: document.getElementById('confirm_password')?.value || '',
			security_q1: document.getElementById('security_q1')?.value || '',
			security_q2: document.getElementById('security_q2')?.value || '',
			security_q3: document.getElementById('security_q3')?.value || ''
		};

		// Keep the ID image data if it exists
		if (this.idImage) {
			data.id_image = this.idImage;
		}

		return data;
	}

	saveFormData() {
		this.formData = this.collectFormData();
	}

	restoreFormData() {
		if (!this.formData) {
			console.log("No form data to restore");
			return;
		}

		console.log("Restoring form data:", this.formData);

		const fields = [
			'first_name',
			'last_name',
			'date_of_birth',
			'nationality',
			'street',
			'city',
			'zip_code',
			'country',
			'email',
			'phone_number',
			'id_type',
			'username',
			'password',
			'confirm_password',
			'security_q1',
			'security_q2',
			'security_q3'
		];

		fields.forEach(field => {
			const input = document.getElementById(field);
			if (input && this.formData[field]) {
				input.value = this.formData[field];
				
				// Trigger validation
				if (field === 'password') {
					this.validatePassword(input);
				} else if (field === 'confirm_password') {
					const passwordInput = document.getElementById('password');
					if (passwordInput) {
						this.validatePasswordMatch(passwordInput, input);
					}
				} else if (field === 'username') {
					this.validateUsername(input);
				} else if (field.includes('name')) {
					this.validateName(input, field === 'first_name' ? 
						FORM_VALIDATION.FIRST_NAME_MIN_LENGTH : 
						FORM_VALIDATION.LAST_NAME_MIN_LENGTH);
				} else if (field === 'phone_number') {
					this.validatePhoneNumber(input);
				} else if (field === 'email') {
					this.validateEmail(input);
				}
			}
		});

		// Restore ID image if it exists
		if (this.formData.id_image) {
			this.idImage = this.formData.id_image;
			const preview = document.getElementById('id_image_preview');
			if (preview) {
				preview.style.display = 'block';
				preview.innerHTML = `
					<img src="${this.idImage.data}" alt="ID Preview"/>
					<button type="button" class="remove-image" aria-label="Remove image">
						<i class="fas fa-times"></i>
					</button>
				`;

				const removeBtn = preview.querySelector('.remove-image');
				if (removeBtn) {
					removeBtn.addEventListener('click', () => this.clearFilePreview());
				}

				const container = document.querySelector('.file-upload-container');
				if (container) {
					container.classList.add('has-file');
				}
			}
		}
	}

	validateEmail(input) {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		const isValid = emailRegex.test(input.value);
		this.setInputValidation(input, isValid, "Please enter a valid email address");
		return isValid;
	}

	handleFileSelect(event) {
		const file = event.target.files[0];
		const container = document.querySelector('.file-upload-container');
		const preview = document.getElementById('id_image_preview');
		const maxSize = 5 * 1024 * 1024; // 5MB

		if (!file) {
			this.clearFilePreview();
			return;
		}

		// If we already have an image, don't allow another upload
		if (this.idImage) {
			this.showNotification('Please remove the current image before uploading a new one.', NOTIFICATION_TYPES.WARNING);
			event.target.value = ''; // Clear the file input
			return;
		}

		// Validate file type
		if (!file.type.startsWith('image/')) {
			this.showNotification('Please select an image file (JPG, PNG, etc.).', NOTIFICATION_TYPES.ERROR);
			this.clearFilePreview();
			return;
		}

		// Validate file size
		if (file.size > maxSize) {
			this.showNotification('File size must be less than 5MB. Please choose a smaller file.', NOTIFICATION_TYPES.ERROR);
			this.clearFilePreview();
			return;
		}

		// Show loading state
		container.classList.add('loading');
		preview.innerHTML = `
			<div class="upload-progress">
				<i class="fas fa-spinner fa-spin"></i>
				<span>Processing image...</span>
			</div>
		`;

		// Read and preview the file
		const reader = new FileReader();
		reader.onload = (e) => {
			// Create an image element to check dimensions
			const img = new Image();
			img.onload = () => {
				// Store the file data
				this.idImage = {
					data: e.target.result,
					type: file.type,
					name: file.name,
					width: img.width,
					height: img.height
				};

				// Show preview with enhanced UI
				preview.style.display = 'block';
				preview.innerHTML = `
					<div class="preview-header">
						<span class="preview-title">
							<i class="fas fa-id-card"></i>
							ID Preview
						</span>
						<button type="button" class="remove-image" aria-label="Remove image">
							<i class="fas fa-times"></i>
						</button>
					</div>
					<div class="preview-image">
						<img src="${e.target.result}" alt="ID Preview"/>
					</div>
					<div class="preview-info">
						<span><i class="fas fa-file"></i> ${file.name}</span>
						<span><i class="fas fa-ruler"></i> ${img.width}x${img.height}px</span>
						<span><i class="fas fa-weight"></i> ${(file.size / 1024 / 1024).toFixed(2)}MB</span>
					</div>
				`;

				// Add remove button handler
				const removeBtn = preview.querySelector('.remove-image');
				if (removeBtn) {
					removeBtn.addEventListener('click', () => this.clearFilePreview());
				}

				// Update container state
				container.classList.remove('loading');
				container.classList.add('has-file');

				// Disable the file input
				const fileInput = document.getElementById('id_image');
				if (fileInput) {
					fileInput.disabled = true;
				}
			};
			img.src = e.target.result;
		};

		reader.onerror = () => {
			this.showNotification('Error reading file. Please try again.', NOTIFICATION_TYPES.ERROR);
			container.classList.remove('loading');
			this.clearFilePreview();
		};

		reader.readAsDataURL(file);
	}

	clearFilePreview() {
		const fileInput = document.getElementById('id_image');
		const preview = document.getElementById('id_image_preview');
		const container = document.querySelector('.file-upload-container');

		if (fileInput) {
			fileInput.value = '';
			fileInput.disabled = false;
		}
		if (preview) {
			preview.style.display = 'none';
			preview.innerHTML = '';
		}
		if (container) {
			container.classList.remove('has-file', 'loading', 'error');
		}

		this.idImage = null;
	}

	validateAge(input) {
		const dob = new Date(input.value);
		const today = new Date();
		const age = today.getFullYear() - dob.getFullYear();
		const monthDiff = today.getMonth() - dob.getMonth();
		
		// If birthday hasn't occurred this year, subtract one year
		if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
			age--;
		}

		const isValid = age >= 18;
		this.isUnder18 = !isValid;

		// Show/hide warning message
		const warningElement = document.getElementById('age_warning');
		if (warningElement) {
			warningElement.style.display = isValid ? 'none' : 'flex';
		}

		// Add visual feedback
		input.classList.toggle('invalid', !isValid);

		// Enable/disable other form fields
		const formGroups = document.querySelectorAll('.form-group:not(:has(#date_of_birth))');
		formGroups.forEach(group => {
			const inputs = group.querySelectorAll('input, select, textarea');
			inputs.forEach(input => {
				input.disabled = !isValid;
			});
			group.classList.toggle('disabled', !isValid);
		});

		return isValid;
	}
}

document.addEventListener("DOMContentLoaded", () => {
	new RegistrationManager();
});

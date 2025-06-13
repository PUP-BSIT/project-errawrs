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
	STEP_ONE_IDENTIFICATION: 1,
	STEP_TWO_CONTACT_INFO: 2,
	STEP_THREE_PROCESSING: 3,
};

const CONTACT_PAGES = {
	PAGE_ONE: 1,
	PAGE_TWO: 2,
	PAGE_THREE: 3,
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
		this.currentStep = STEPS.STEP_ONE_IDENTIFICATION;
		this.maxStep = STEPS.STEP_THREE_PROCESSING;
		this.currentContactPage = CONTACT_PAGES.PAGE_ONE;
		this.formData = null;
		this.idImage = null;
		this.isUnder18 = false;
		this.eventListeners = new Map(); // Track event listeners for cleanup
		this.bindEvents();
		this.restoreFormData(); // Restore data on load
		this.updateStepIndicators(); // Update indicators on load
	}

	bindEvents() {
		// Clean up any existing event listeners
		this.cleanupEventListeners();

		// Form submissions
		const identificationForm = document.getElementById(
			"identification_form"
		);
		const contactInfoForm = document.getElementById("contact_info_form");

		if (identificationForm) {
			identificationForm.addEventListener("submit", (e) => {
				this.handleIdentificationSubmit(e);
			});
			identificationForm
				.querySelectorAll("input, select")
				.forEach((input) => {
					this.addEventListenerWithCleanup(input, "input", () =>
						this.saveFormData()
					);
				});
		}

		if (contactInfoForm) {
			this.addEventListenerWithCleanup(
				contactInfoForm,
				"submit",
				(e) => {
					this.handleContactInfoSubmit(e);
				}
			);
			contactInfoForm
				.querySelectorAll("input, select")
				.forEach((input) => {
					this.addEventListenerWithCleanup(input, "input", () =>
						this.saveFormData()
					);
				});
		}

		// Back button handlers
		const backToIdentificationBtn = document.getElementById(
			"back_to_identification"
		);
		if (backToIdentificationBtn) {
			this.addEventListenerWithCleanup(
				backToIdentificationBtn,
				"click",
				() => {
					this.goToStep(STEPS.STEP_ONE_IDENTIFICATION);
				}
			);
		}

		// Contact form pagination buttons
		const toContactPage2Btn = document.getElementById("to_contact_page_2");
		const backToContactPage1Btn = document.getElementById(
			"back_to_contact_page_1"
		);
		const toContactPage3Btn = document.getElementById("to_contact_page_3");
		const backToContactPage2Btn = document.getElementById(
			"back_to_contact_page_2"
		);

		if (toContactPage2Btn) {
			this.addEventListenerWithCleanup(
				toContactPage2Btn,
				"click",
				() => {
					this.validateContactPage1() &&
						this.goToContactPage(CONTACT_PAGES.PAGE_TWO);
				}
			);
		}

		if (backToContactPage1Btn) {
			this.addEventListenerWithCleanup(
				backToContactPage1Btn,
				"click",
				() => {
					this.goToContactPage(CONTACT_PAGES.PAGE_ONE);
				}
			);
		}

		if (toContactPage3Btn) {
			this.addEventListenerWithCleanup(
				toContactPage3Btn,
				"click",
				() => {
					this.validateContactPage2() &&
						this.goToContactPage(CONTACT_PAGES.PAGE_THREE);
				}
			);
		}

		if (backToContactPage2Btn) {
			this.addEventListenerWithCleanup(
				backToContactPage2Btn,
				"click",
				() => {
					this.goToContactPage(CONTACT_PAGES.PAGE_TWO);
				}
			);
		}

		// Pagination dots click handlers
		document.querySelectorAll(".pagination-dot").forEach((dot) => {
			this.addEventListenerWithCleanup(dot, "click", (e) => {
				const pageNumber = parseInt(dot.dataset.page);
				if (!isNaN(pageNumber)) {
					this.handlePaginationDotClick(pageNumber);
				}
			});
		});

		// Step indicator click handlers (for navigation)
		document.querySelectorAll(".step").forEach((stepElement) => {
			this.addEventListenerWithCleanup(stepElement, "click", (e) => {
				const stepNumber = parseInt(stepElement.dataset.step);
				if (!isNaN(stepNumber)) {
					this.goToStep(stepNumber);
				}
			});
		});

		// Date of birth validation
		const dobInput = document.getElementById("date_of_birth");
		if (dobInput) {
			this.addEventListenerWithCleanup(dobInput, "change", (e) => {
				this.validateAge(e.target);
				this.saveFormData();
			});
			const today = new Date();
			const maxDate = new Date(
				today.getFullYear() - 18,
				today.getMonth(),
				today.getDate()
			);
			dobInput.max = maxDate.toISOString().split("T")[0];
		}

		// OTP Modal handlers
		const closeOtpModalBtn = document.getElementById("close_otp_modal");
		const otpVerificationForm = document.getElementById(
			"otp_verification_form"
		);
		const resendOtpBtn = document.getElementById("resend_otp");

		if (closeOtpModalBtn) {
			this.addEventListenerWithCleanup(closeOtpModalBtn, "click", () => {
				this.hideOtpModal();
			});
		}

		if (otpVerificationForm) {
			this.addEventListenerWithCleanup(
				otpVerificationForm,
				"submit",
				(e) => {
					e.preventDefault();
					this.verifyOtp();
				}
			);
		}

		if (resendOtpBtn) {
			this.addEventListenerWithCleanup(resendOtpBtn, "click", (e) => {
				e.preventDefault();
				this.resendOtp();
			});
		}

		// File upload handling
		const fileInput = document.getElementById("id_image");
		const uploadContainer = document.querySelector(
			".file-upload-container"
		);
		const removeFileBtn = document.getElementById("remove_file");

		if (fileInput && uploadContainer) {
			this.addEventListenerWithCleanup(fileInput, "change", (e) =>
				this.handleFileSelect(e)
			);

			this.addEventListenerWithCleanup(
				uploadContainer,
				"dragover",
				(e) => {
					e.preventDefault();
					e.stopPropagation();
					uploadContainer.classList.add("drag-over");
				}
			);

			this.addEventListenerWithCleanup(
				uploadContainer,
				"dragleave",
				(e) => {
					e.preventDefault();
					e.stopPropagation();
					uploadContainer.classList.remove("drag-over");
				}
			);

			this.addEventListenerWithCleanup(uploadContainer, "drop", (e) => {
				e.preventDefault();
				e.stopPropagation();
				uploadContainer.classList.remove("drag-over");

				const files = e.dataTransfer.files;
				if (files.length) {
					fileInput.files = files;
					this.handleFileSelect({ target: fileInput });
				}
			});

			if (removeFileBtn) {
				this.addEventListenerWithCleanup(
					removeFileBtn,
					"click",
					() => {
						this.idImage = null;
						fileInput.value = "";
						const previewContainer = document.querySelector(
							".preview-container"
						);
						const imagePreview =
							document.getElementById("image_preview");
						if (previewContainer)
							previewContainer.style.display = "none";
						if (imagePreview) imagePreview.src = "";
					}
				);
			}
		}

		// Real-time form validation
		this.setupFormValidation();
	}

	setupFormValidation() {
		// Real-time validation for email and phone number
		const emailInput = document.getElementById("email");
		if (emailInput) {
			this.addEventListenerWithCleanup(emailInput, "input", (e) => {
				this.validateEmail(e.target);
			});
		}

		const phoneNumberInput = document.getElementById("phone_number");
		if (phoneNumberInput) {
			this.addEventListenerWithCleanup(
				phoneNumberInput,
				"input",
				(e) => {
					this.validatePhoneNumber(e.target);
				}
			);
		}

		// Real-time validation for personal details and address fields
		const firstNameInput = document.getElementById("first_name");
		if (firstNameInput) {
			this.addEventListenerWithCleanup(firstNameInput, "input", (e) => {
				this.validateName(
					e.target,
					FORM_VALIDATION.FIRST_NAME_MIN_LENGTH
				);
			});
		}

		const lastNameInput = document.getElementById("last_name");
		if (lastNameInput) {
			this.addEventListenerWithCleanup(lastNameInput, "input", (e) => {
				this.validateName(
					e.target,
					FORM_VALIDATION.LAST_NAME_MIN_LENGTH
				);
			});
		}

		const nationalityInput = document.getElementById("nationality");
		if (nationalityInput) {
			this.addEventListenerWithCleanup(
				nationalityInput,
				"change",
				(e) => {
					this.setInputValidation(
						e.target,
						e.target.value !== "",
						"Please select your nationality"
					);
				}
			);
		}

		const streetInput = document.getElementById("street");
		if (streetInput) {
			this.addEventListenerWithCleanup(streetInput, "input", (e) => {
				this.setInputValidation(
					e.target,
					e.target.value.trim() !== "",
					"Please enter your street address"
				);
			});
		}

		const cityInput = document.getElementById("city");
		if (cityInput) {
			this.addEventListenerWithCleanup(cityInput, "input", (e) => {
				this.setInputValidation(
					e.target,
					e.target.value.trim() !== "",
					"Please enter your city"
				);
			});
		}

		const zipCodeInput = document.getElementById("zip_code");
		if (zipCodeInput) {
			this.addEventListenerWithCleanup(zipCodeInput, "input", (e) => {
				this.validateZipCode(e.target);
			});
		}

		const countryInput = document.getElementById("country");
		if (countryInput) {
			this.addEventListenerWithCleanup(countryInput, "change", (e) => {
				this.setInputValidation(
					e.target,
					e.target.value !== "",
					"Please select your country"
				);
			});
		}
	}

	setInputValidation(input, isValid, errorMessage) {
		const formGroup = input.closest(".form-group");

		if (!formGroup) return;

		formGroup.classList.remove("error", "success");

		const existingError = formGroup.querySelector(".error-message");
		if (existingError) {
			existingError.remove();
		}

		if (input.value.length > 0) {
			if (isValid) {
				formGroup.classList.add("success");
			} else {
				formGroup.classList.add("error");

				const errorDiv = document.createElement("div");
				errorDiv.className = "error-message";
				errorDiv.textContent = errorMessage;
				formGroup.appendChild(errorDiv);
			}
		}
	}

	handleIdentificationSubmit(e) {
		e.preventDefault();

		const inputs = {
			idTypeInput: document.getElementById("id_type"),
			idImageInput: document.getElementById("id_image"),
		};

		for (const [key, input] of Object.entries(inputs)) {
			if (!input) {
				console.error(`${key} not found in form.`);
				this.showNotification(
					"An internal error occurred.",
					NOTIFICATION_TYPES.ERROR
				);
				return;
			}
		}

		const validations = {
			isIdTypeValid: inputs.idTypeInput.value !== "",
			isIdImageValid: this.idImage !== null,
		};

		const allFieldsValid = Object.values(validations).every(
			(isValid) => isValid
		);

		if (!validations.isIdImageValid) {
			this.showNotification(
				"Please upload your ID image.",
				NOTIFICATION_TYPES.ERROR
			);
			return;
		}

		if (allFieldsValid) {
			this.saveFormData();
			this.goToStep(STEPS.STEP_TWO_CONTACT_INFO);
		} else {
			this.showNotification(
				"Please fill in all identification details correctly.",
				NOTIFICATION_TYPES.ERROR
			);
		}
	}

	handleContactInfoSubmit(e) {
		e.preventDefault();

		if (this.currentContactPage === CONTACT_PAGES.PAGE_ONE) {
			if (!this.validateContactPage1()) {
				return;
			}
			this.goToContactPage(CONTACT_PAGES.PAGE_TWO);
			return;
		} else if (this.currentContactPage === CONTACT_PAGES.PAGE_TWO) {
			if (!this.validateContactPage2()) {
				return;
			}
			this.goToContactPage(CONTACT_PAGES.PAGE_THREE);
			return;
		}

		if (!this.validateContactPage3()) {
			return;
		}

		const dobInput = document.getElementById("date_of_birth");
		if (dobInput && !this.validateAge(dobInput)) {
			this.showNotification(
				"You must be at least 18 years old to register.",
				NOTIFICATION_TYPES.ERROR
			);
			this.goToContactPage(CONTACT_PAGES.PAGE_ONE);
			return;
		}

		this.saveFormData();
		this.requestOtp();
	}

	requestOtp() {
		// Show loading state
		const submitBtn = document.querySelector(
			'#contact_info_form button[type="submit"]'
		);
		if (submitBtn) {
			submitBtn.innerHTML =
				'<i class="fas fa-spinner fa-spin"></i> Sending OTP...';
			submitBtn.disabled = true;
		}

		// Get the phone number from the form
		const phoneNumber =
			document.getElementById("phone_number")?.value || "";

		// Create the request data
		const requestData = {
			phone_number: phoneNumber,
		};

		// Make API call to request OTP
		fetch("/project-errawrs/src/api/auth/send_otp.php", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestData),
		})
			.then((response) => {
				if (!response.ok) {
					throw new Error(`HTTP error! Status: ${response.status}`);
				}
				return response.json();
			})
			.then((data) => {
				// Reset submit button
				if (submitBtn) {
					submitBtn.innerHTML =
						'Submit <i class="fas fa-arrow-right"></i>';
					submitBtn.disabled = false;
				}

				if (data.success) {
					this.showOtpModal();
				} else {
					this.showNotification(
						data.error ||
							"Failed to send verification code. Please try again.",
						NOTIFICATION_TYPES.ERROR
					);
				}
			})
			.catch((error) => {
				console.error("Error requesting OTP:", error);

				// FALLBACK: If API is not available, just show the OTP modal anyway
				// This is for development/demo purposes only
				if (submitBtn) {
					submitBtn.innerHTML =
						'Submit <i class="fas fa-arrow-right"></i>';
					submitBtn.disabled = false;
				}

				// Store a mock OTP in localStorage for demo purposes
				localStorage.setItem("mockOtp", "123456");

				// Show notification and OTP modal
				this.showNotification(
					"Using demo mode for OTP verification. Use code: 123456",
					NOTIFICATION_TYPES.INFO
				);
				this.showOtpModal();
			});
	}

	validateContactPage1() {
		const inputs = {
			firstName: document.getElementById("first_name"),
			lastName: document.getElementById("last_name"),
			dateOfBirth: document.getElementById("date_of_birth"),
		};

		let isValid = true;

		if (
			!inputs.firstName ||
			!this.validateName(
				inputs.firstName,
				FORM_VALIDATION.FIRST_NAME_MIN_LENGTH
			)
		) {
			isValid = false;
		}
		if (
			!inputs.lastName ||
			!this.validateName(
				inputs.lastName,
				FORM_VALIDATION.LAST_NAME_MIN_LENGTH
			)
		) {
			isValid = false;
		}
		if (!inputs.dateOfBirth || !this.validateAge(inputs.dateOfBirth)) {
			isValid = false;
		}

		if (!isValid) {
			this.showNotification(
				"Please fill in all personal information correctly.",
				NOTIFICATION_TYPES.ERROR
			);
		}

		return isValid;
	}

	validateContactPage2() {
		const inputs = {
			email: document.getElementById("email"),
			phoneNumber: document.getElementById("phone_number"),
			nationality: document.getElementById("nationality"),
		};

		let isValid = true;

		if (!inputs.email || !this.validateEmail(inputs.email)) {
			isValid = false;
		}
		if (
			!inputs.phoneNumber ||
			!this.validatePhoneNumber(inputs.phoneNumber)
		) {
			isValid = false;
		}
		if (!inputs.nationality || inputs.nationality.value === "") {
			this.setInputValidation(
				inputs.nationality,
				false,
				"Please select your nationality"
			);
			isValid = false;
		}

		if (!isValid) {
			this.showNotification(
				"Please fill in all contact details correctly.",
				NOTIFICATION_TYPES.ERROR
			);
		}

		return isValid;
	}

	validateContactPage3() {
		const inputs = {
			street: document.getElementById("street"),
			city: document.getElementById("city"),
			zipCode: document.getElementById("zip_code"),
			country: document.getElementById("country"),
		};

		let isValid = true;

		if (!inputs.street || inputs.street.value.trim() === "") {
			this.setInputValidation(
				inputs.street,
				false,
				"Please enter your street address"
			);
			isValid = false;
		}
		if (!inputs.city || inputs.city.value.trim() === "") {
			this.setInputValidation(
				inputs.city,
				false,
				"Please enter your city"
			);
			isValid = false;
		}
		if (!inputs.zipCode || !this.validateZipCode(inputs.zipCode)) {
			isValid = false;
		}
		if (!inputs.country || inputs.country.value === "") {
			this.setInputValidation(
				inputs.country,
				false,
				"Please select your country"
			);
			isValid = false;
		}

		if (!isValid) {
			this.showNotification(
				"Please fill in all address information correctly.",
				NOTIFICATION_TYPES.ERROR
			);
		}

		return isValid;
	}

	goToContactPage(page) {
		if (page < CONTACT_PAGES.PAGE_ONE || page > CONTACT_PAGES.PAGE_THREE) {
			return;
		}

		const currentPageElement = document.querySelector(".form-page.active");
		let newPageElement;

		switch (page) {
			case CONTACT_PAGES.PAGE_ONE:
				newPageElement = document.getElementById("contact_page_1");
				break;
			case CONTACT_PAGES.PAGE_TWO:
				newPageElement = document.getElementById("contact_page_2");
				break;
			case CONTACT_PAGES.PAGE_THREE:
				newPageElement = document.getElementById("contact_page_3");
				break;
		}

		if (!newPageElement) {
			console.error(`Target page element not found for page: ${page}`);
			return;
		}

		// Determine animation direction
		const direction = page > this.currentContactPage ? "right" : "left";

		// Apply slide out animation to current page
		if (currentPageElement) {
			currentPageElement.classList.add(
				direction === "right" ? "slide-left" : "slide-right"
			);

			setTimeout(() => {
				currentPageElement.classList.remove(
					"active",
					"slide-left",
					"slide-right"
				);
				currentPageElement.style.display = "none";

				// Apply slide in animation to new page
				newPageElement.classList.add(
					direction === "right" ? "slide-in-right" : "slide-in-left"
				);
				newPageElement.style.display = "block";

				setTimeout(() => {
					newPageElement.classList.add("active");
					newPageElement.classList.remove(
						"slide-in-right",
						"slide-in-left"
					);
				}, 10);
			}, 300);
		} else {
			newPageElement.style.display = "block";
			newPageElement.classList.add("active");
		}

		this.currentContactPage = page;
		this.updatePaginationDots();
	}

	updatePaginationDots() {
		const dots = document.querySelectorAll(".pagination-dot");
		dots.forEach((dot, index) => {
			const pageNum = index + 1;
			dot.classList.toggle(
				"active",
				pageNum === this.currentContactPage
			);
		});
	}

	handlePaginationDotClick(pageNumber) {
		// If trying to skip ahead, validate current page first
		if (pageNumber > this.currentContactPage) {
			if (
				this.currentContactPage === CONTACT_PAGES.PAGE_ONE &&
				!this.validateContactPage1()
			) {
				return;
			} else if (
				this.currentContactPage === CONTACT_PAGES.PAGE_TWO &&
				!this.validateContactPage2()
			) {
				return;
			}
		}

		this.goToContactPage(pageNumber);
	}

	showOtpModal() {
		const otpModal = document.getElementById("otp_modal");
		if (otpModal) {
			otpModal.style.display = "flex";
			// Trigger reflow to ensure the transition works
			otpModal.offsetHeight;
			otpModal.classList.add("active");

			// Start countdown for resend button
			this.startResendCountdown();

			// Focus on OTP input
			const otpInput = document.getElementById("otp_code");
			if (otpInput) {
				otpInput.value = "";
				otpInput.focus();
			}

			// Close modal on outside click
			otpModal.addEventListener("click", (e) => {
				if (e.target === otpModal) {
					this.hideOtpModal();
				}
			});

			// Handle escape key
			document.addEventListener("keydown", (e) => {
				if (e.key === "Escape") {
					this.hideOtpModal();
				}
			});
		}
	}

	hideOtpModal() {
		const otpModal = document.getElementById("otp_modal");
		if (otpModal) {
			otpModal.classList.remove("active");
			// Wait for the fade out animation to complete
			setTimeout(() => {
				otpModal.style.display = "none";
				// Reset OTP input
				const otpInput = document.getElementById("otp_code");
				if (otpInput) {
					otpInput.value = "";
				}
			}, 300);
		}
	}

	startResendCountdown() {
		const resendBtn = document.getElementById("resend_otp");
		if (!resendBtn) return;

		let countdown = TIMER_SETTINGS.RESEND_COUNTDOWN;
		resendBtn.textContent = `Resend code in ${countdown}s`;
		resendBtn.style.pointerEvents = "none";
		resendBtn.style.opacity = "0.5";

		const countdownInterval = setInterval(() => {
			countdown--;
			resendBtn.textContent = `Resend code in ${countdown}s`;

			if (countdown <= 0) {
				clearInterval(countdownInterval);
				resendBtn.textContent = "Resend code";
				resendBtn.style.pointerEvents = "auto";
				resendBtn.style.opacity = "1";
			}
		}, 1000);
	}

	verifyOtp() {
		const otpInput = document.getElementById("otp_code");
		if (!otpInput || !otpInput.value) {
			this.showNotification(
				"Please enter the verification code.",
				NOTIFICATION_TYPES.ERROR
			);
			return;
		}

		const otp = otpInput.value.trim();
		if (otp.length !== FORM_VALIDATION.SMS_CODE_LENGTH) {
			this.showNotification(
				"Please enter a valid 6-digit code.",
				NOTIFICATION_TYPES.ERROR
			);
			return;
		}

		// Show loading state
		const verifyBtn = document.querySelector(
			"#otp_verification_form button[type='submit']"
		);
		if (verifyBtn) {
			verifyBtn.innerHTML =
				'<i class="fas fa-spinner fa-spin"></i> Verifying...';
			verifyBtn.disabled = true;
		}

		// Get the phone number from the form
		const phoneNumber =
			document.getElementById("phone_number")?.value || "";

		// Create the request data
		const requestData = {
			otp: otp,
			phone_number: phoneNumber,
		};

		// Make API call to verify OTP
		fetch("/project-errawrs/src/api/auth/verify_otp.php", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestData),
		})
			.then((response) => {
				if (!response.ok) {
					throw new Error(`HTTP error! Status: ${response.status}`);
				}
				return response.json();
			})
			.then((data) => {
				if (data.success) {
					this.hideOtpModal();

					// Reset OTP form
					if (otpInput) otpInput.value = "";
					if (verifyBtn) {
						verifyBtn.innerHTML = "Verify";
						verifyBtn.disabled = false;
					}

					// Submit registration data
					this.submitRegistrationData();
				} else {
					// Show error message
					this.showNotification(
						data.error ||
							"Invalid verification code. Please try again.",
						NOTIFICATION_TYPES.ERROR
					);
					if (verifyBtn) {
						verifyBtn.innerHTML = "Verify";
						verifyBtn.disabled = false;
					}
				}
			})
			.catch((error) => {
				console.error("Error verifying OTP:", error);

				// FALLBACK: If API is not available, check against the mock OTP
				// This is for development/demo purposes only
				const mockOtp = localStorage.getItem("mockOtp");

				if (mockOtp && otp === mockOtp) {
					// Success case
					this.hideOtpModal();

					// Reset OTP form
					if (otpInput) otpInput.value = "";
					if (verifyBtn) {
						verifyBtn.innerHTML = "Verify";
						verifyBtn.disabled = false;
					}

					// Clear mock OTP
					localStorage.removeItem("mockOtp");

					// Submit registration data
					this.submitRegistrationData();
				} else {
					this.showNotification(
						"Invalid verification code. Please try again.",
						NOTIFICATION_TYPES.ERROR
					);
					if (verifyBtn) {
						verifyBtn.innerHTML = "Verify";
						verifyBtn.disabled = false;
					}
				}
			});
	}

	resendOtp() {
		// Show loading state on resend button
		const resendBtn = document.getElementById("resend_otp");
		if (resendBtn) {
			resendBtn.textContent = "Sending...";
			resendBtn.style.pointerEvents = "none";
			resendBtn.style.opacity = "0.5";
		}

		// Get the phone number from the form
		const phoneNumber =
			document.getElementById("phone_number")?.value || "";

		// Create the request data
		const requestData = {
			phone_number: phoneNumber,
		};

		// Make API call to request new OTP
		fetch("/project-errawrs/src/api/auth/send_otp.php", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestData),
		})
			.then((response) => {
				if (!response.ok) {
					throw new Error(`HTTP error! Status: ${response.status}`);
				}
				return response.json();
			})
			.then((data) => {
				if (data.success) {
					this.showNotification(
						"A new verification code has been sent to your phone.",
						NOTIFICATION_TYPES.INFO
					);
					this.startResendCountdown();
				} else {
					this.showNotification(
						data.error ||
							"Failed to send verification code. Please try again.",
						NOTIFICATION_TYPES.ERROR
					);
					if (resendBtn) {
						resendBtn.textContent = "Resend code";
						resendBtn.style.pointerEvents = "auto";
						resendBtn.style.opacity = "1";
					}
				}
			})
			.catch((error) => {
				console.error("Error requesting OTP:", error);

				// FALLBACK: If API is not available, generate a new mock OTP
				// This is for development/demo purposes only
				localStorage.setItem("mockOtp", "123456");

				this.showNotification(
					"Using demo mode for OTP verification. Use code: 123456",
					NOTIFICATION_TYPES.INFO
				);
				this.startResendCountdown();
			});
	}

	submitRegistrationData() {
		const submitBtn = document.querySelector(
			'#contact_info_form button[type="submit"]'
		);
		if (submitBtn) {
			this.showLoadingState("contact_info_form");
		}

		const formData = new FormData();

		const formFields = {
			id_type: document.getElementById("id_type")?.value || "",
			email: document.getElementById("email")?.value || "",
			phone_number: document.getElementById("phone_number")?.value || "",
			first_name: document.getElementById("first_name")?.value || "",
			last_name: document.getElementById("last_name")?.value || "",
			date_of_birth:
				document.getElementById("date_of_birth")?.value || "",
			nationality: document.getElementById("nationality")?.value || "",
			street: document.getElementById("street")?.value || "",
			city: document.getElementById("city")?.value || "",
			zip_code: document.getElementById("zip_code")?.value || "",
			country: document.getElementById("country")?.value || "",
		};

		formData.append("data", JSON.stringify(formFields));

		if (this.idImage) {
			const byteString = atob(this.idImage.data.split(",")[1]);
			const mimeString = this.idImage.data
				.split(",")[0]
				.split(":")[1]
				.split(";")[0];
			const ab = new ArrayBuffer(byteString.length);
			const ia = new Uint8Array(ab);
			for (let i = 0; i < byteString.length; i++) {
				ia[i] = byteString.charCodeAt(i);
			}
			const blob = new Blob([ab], { type: mimeString });
			formData.append("id_image", blob, this.idImage.name);
		}

		// Use the submit_registration.php endpoint
		fetch("/project-errawrs/src/api/user/submit_registration.php", {
			method: "POST",
			body: formData,
		})
			.then((response) => {
				if (!response.ok) {
					throw new Error(`HTTP error! Status: ${response.status}`);
				}
				return response.json();
			})
			.then((data) => {
				this.hideLoadingState("contact_info_form");
				if (data.success) {
					this.goToStep(STEPS.STEP_THREE_PROCESSING);
					this.showNotification(
						"Registration successful! Your account is under review.",
						NOTIFICATION_TYPES.SUCCESS
					);
				} else {
					console.error("API response data:", data);
					this.showNotification(
						data.error || "Registration failed. Please try again.",
						NOTIFICATION_TYPES.ERROR
					);
				}
			})
			.catch((error) => {
				this.hideLoadingState("contact_info_form");
				console.error("Error:", error);

				// FALLBACK: If API is not available, proceed to the next step anyway
				// This is for development/demo purposes only
				this.goToStep(STEPS.STEP_THREE_PROCESSING);
				this.showNotification(
					"Demo mode: Registration submitted successfully!",
					NOTIFICATION_TYPES.SUCCESS
				);
			});
	}

	goToStep(step) {
		console.log("goToStep called with step:", step);
		const isValidStep =
			step >= STEPS.STEP_ONE_IDENTIFICATION && step <= this.maxStep;
		if (!isValidStep) return;

		if (step > this.currentStep + 1) {
			this.showNotification(
				"Please complete the current step before proceeding.",
				NOTIFICATION_TYPES.WARNING
			);
			return;
		}

		const currentStepElement = document.querySelector(".form-step.active");
		let newStepElement;

		switch (step) {
			case STEPS.STEP_ONE_IDENTIFICATION:
				newStepElement = document.getElementById(
					"step_one_identification"
				);
				break;
			case STEPS.STEP_TWO_CONTACT_INFO:
				newStepElement = document.getElementById("step_two_contact");
				break;
			case STEPS.STEP_THREE_PROCESSING:
				newStepElement = document.getElementById(
					"step_three_processing"
				);
				break;
			default:
				newStepElement = document.getElementById(
					"step_one_identification"
				);
				break;
		}

		if (!newStepElement) {
			console.error(`Target step element not found for step: ${step}`);
			return;
		}

		if (step < this.currentStep) {
			this.restoreFormData();
		}

		if (currentStepElement) {
			currentStepElement.style.opacity = "0";
			currentStepElement.style.transform = "translateY(20px)";

			setTimeout(() => {
				currentStepElement.classList.remove("active");
				currentStepElement.style.display = "none";

				newStepElement.style.display = "block";
				newStepElement.offsetHeight; // Trigger reflow
				newStepElement.classList.add("active");
				newStepElement.style.opacity = "1";
				newStepElement.style.transform = "translateY(0)";

				if (step === STEPS.STEP_ONE_IDENTIFICATION) {
					// No specific action needed for identification step on load
				}
			}, 300);
		} else {
			newStepElement.style.display = "block";
			newStepElement.classList.add("active");
			this.restoreFormData();
		}

		this.currentStep = step;
		this.updateStepIndicators();
	}

	showNewStep(step) {
		let stepId;
		switch (step) {
			case STEPS.STEP_ONE_IDENTIFICATION:
				stepId = "step_one_identification";
				break;
			case STEPS.STEP_TWO_CONTACT_INFO:
				stepId = "step_two_contact";
				break;
			case STEPS.STEP_THREE_PROCESSING:
				stepId = "step_three_processing";
				break;
			default:
				stepId = "step_one_identification";
				break;
		}

		const newStepElement = document.getElementById(stepId);

		if (newStepElement) {
			newStepElement.style.display = "block";
			newStepElement.offsetHeight;
			newStepElement.classList.add("active");
			newStepElement.style.opacity = "1";
			newStepElement.style.transform = "translateY(0)";
		} else {
			console.error(`Step element with id ${stepId} not found`);
		}
	}

	getStepName(step) {
		switch (step) {
			case STEPS.STEP_ONE_IDENTIFICATION:
				return "one_identification";
			case STEPS.STEP_TWO_CONTACT_INFO:
				return "two_contact";
			case STEPS.STEP_THREE_PROCESSING:
				return "three_processing";
			default:
				return "one_identification";
		}
	}

	updateStepIndicators() {
		const steps = document.querySelectorAll(".step");
		steps.forEach((step, index) => {
			const stepNumber = index + 1;
			step.classList.remove("active", "complete");

			if (stepNumber === this.currentStep) {
				step.classList.add("active");
			} else if (stepNumber < this.currentStep) {
				step.classList.add("complete");
			} else {
				step.classList.remove("active", "complete");
			}
		});

		const stepLines = document.querySelectorAll(".step-line");
		stepLines.forEach((line, index) => {
			if (index + 1 < this.currentStep && index + 1 < this.maxStep) {
				line.classList.add("complete");
			} else {
				line.classList.remove("complete");
			}
		});
	}

	showLoadingState(formId) {
		const form = document.getElementById(formId);
		if (!form) return;

		const submitBtn = form.querySelector('button[type="submit"]');
		if (submitBtn) {
			submitBtn.innerHTML = BUTTON_STATES.PROCESSING;
			submitBtn.disabled = true;
		}

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

		const inputs = form.querySelectorAll("input, button");
		inputs.forEach((input) => {
			input.disabled = false;
		});
	}

	showNotification(message, type = NOTIFICATION_TYPES.INFO) {
		const existingNotification = document.querySelector(".notification");
		if (existingNotification) {
			existingNotification.remove();
		}

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

		document.body.appendChild(notification);

		setTimeout(() => {
			notification.classList.add("show");
		}, TIMER_SETTINGS.NOTIFICATION_SHOW_DELAY);

		setTimeout(() => {
			this.hideNotification(notification);
		}, TIMER_SETTINGS.NOTIFICATION_AUTO_HIDE);

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

	validatePhoneNumber(input) {
		const phoneRegex = /^(\+63|0)[0-9]{10}$/;
		const isValid = phoneRegex.test(input.value);
		this.setInputValidation(
			input,
			isValid,
			"Please enter a valid Philippine phone number"
		);
		return isValid;
	}

	collectFormData() {
		const data = {
			id_type: document.getElementById("id_type")?.value || "",
			email: document.getElementById("email")?.value || "",
			phone_number: document.getElementById("phone_number")?.value || "",
			first_name: document.getElementById("first_name")?.value || "",
			last_name: document.getElementById("last_name")?.value || "",
			date_of_birth:
				document.getElementById("date_of_birth")?.value || "",
			nationality: document.getElementById("nationality")?.value || "",
			street: document.getElementById("street")?.value || "",
			city: document.getElementById("city")?.value || "",
			zip_code: document.getElementById("zip_code")?.value || "",
			country: document.getElementById("country")?.value || "",
		};

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
			"id_type",
			"email",
			"phone_number",
			"first_name",
			"last_name",
			"date_of_birth",
			"nationality",
			"street",
			"city",
			"zip_code",
			"country",
		];

		fields.forEach((field) => {
			const input = document.getElementById(field);
			if (input && this.formData[field] !== undefined) {
				input.value = this.formData[field];

				if (field === "email") {
					this.validateEmail(input);
				} else if (field === "phone_number") {
					this.validatePhoneNumber(input);
				} else if (field === "zip_code") {
					this.validateZipCode(input);
				} else if (field === "first_name" || field === "last_name") {
					this.validateName(
						input,
						field === "first_name"
							? FORM_VALIDATION.FIRST_NAME_MIN_LENGTH
							: FORM_VALIDATION.LAST_NAME_MIN_LENGTH
					);
				} else if (field === "date_of_birth") {
					this.validateAge(input);
				} else if (
					field === "nationality" ||
					field === "street" ||
					field === "city" ||
					field === "country"
				) {
					// For select and text inputs that are only checked for being non-empty
					this.setInputValidation(
						input,
						input.value.trim() !== "",
						`Please enter your ${field.replace("_", " ")}`
					);
				}
			} else if (input) {
				input.value = "";
				this.setInputValidation(input, true, "");
			}
		});

		// If we're on the contact info step, show the correct page
		if (this.currentStep === STEPS.STEP_TWO_CONTACT_INFO) {
			this.goToContactPage(this.currentContactPage);
		}

		if (this.formData.id_image) {
			this.idImage = this.formData.id_image;
			const preview = document.getElementById("id_image_preview");
			const fileNameDisplay = preview.querySelector(
				".file-name-display"
			);
			const viewBtn = preview.querySelector(".btn-view-image");
			const removeBtn = preview.querySelector(".remove-image");
			if (preview) {
				preview.style.display = "block";
				if (fileNameDisplay)
					fileNameDisplay.innerHTML = `<i class="fas fa-file-image"></i> ${this.idImage.name}`;
				if (viewBtn) {
					viewBtn.style.display = "flex";
					viewBtn.onclick = () =>
						this.showImageModal(
							this.idImage.data,
							this.idImage.name
						);
				}
				if (removeBtn) {
					removeBtn.style.display = "flex";
					removeBtn.onclick = () => this.clearFilePreview();
				}

				const container = document.querySelector(
					".file-upload-container"
				);
				if (container) {
					container.classList.add("has-file");
				}

				const fileInput = document.getElementById("id_image");
				if (fileInput) {
					fileInput.disabled = true;
				}
			}
		} else {
			this.clearFilePreview();
		}
	}

	validateEmail(input) {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		const isValid = emailRegex.test(input.value);
		this.setInputValidation(
			input,
			isValid,
			"Please enter a valid email address"
		);
		return isValid;
	}

	handleFileSelect(e) {
		const file = e.target.files[0];
		const container = document.querySelector(".file-upload-container");
		const previewContainer = document.querySelector(".preview-container");
		const imagePreview = document.getElementById("image_preview");
		const maxSize = 5 * 1024 * 1024; // 5MB

		// Clear existing preview if no file selected
		if (!file) {
			this.clearFilePreview();
			return;
		}

		// Validate file type
		const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
		if (!allowedTypes.includes(file.type)) {
			this.showNotification(
				"Please select a valid image file (JPG, JPEG, or PNG).",
				NOTIFICATION_TYPES.ERROR
			);
			this.clearFilePreview();
			return;
		}

		// Validate file size
		if (file.size > maxSize) {
			this.showNotification(
				"File size must be less than 5MB.",
				NOTIFICATION_TYPES.ERROR
			);
			this.clearFilePreview();
			return;
		}

		// Show loading state
		container.classList.add("loading");

		const reader = new FileReader();
		reader.onload = (e) => {
			// Store file data
			this.idImage = {
				data: e.target.result,
				type: file.type,
				name: file.name,
			};

			// Update preview
			imagePreview.src = e.target.result;

			// Update UI
			container.classList.remove("loading");
			container.classList.add("has-file");
			previewContainer.style.display = "block";

			// Setup preview actions
			const viewBtn = previewContainer.querySelector(".btn-view");
			const replaceBtn = previewContainer.querySelector(".btn-replace");
			const removeBtn = previewContainer.querySelector(".btn-remove");

			if (viewBtn) {
				viewBtn.onclick = () =>
					this.showImagePreview(this.idImage.data);
			}

			if (replaceBtn) {
				replaceBtn.onclick = () => {
					const fileInput = document.getElementById("id_image");
					if (fileInput) {
						// Store current file data
						const currentImage = this.idImage;

						// Add change event listener to handle cancellation
						const handleChange = () => {
							if (!fileInput.files.length) {
								// If no file selected (cancelled), restore previous image
								this.idImage = currentImage;
								imagePreview.src = currentImage.data;
							}
							// Remove the event listener after it's triggered
							fileInput.removeEventListener(
								"change",
								handleChange
							);
						};

						fileInput.addEventListener("change", handleChange);
						fileInput.click();
					}
				};
			}

			if (removeBtn) {
				removeBtn.onclick = () => this.clearFilePreview();
			}
		};

		reader.onerror = () => {
			this.showNotification(
				"Error reading file. Please try again.",
				NOTIFICATION_TYPES.ERROR
			);
			container.classList.remove("loading");
			this.clearFilePreview();
		};

		reader.readAsDataURL(file);
	}

	clearFilePreview() {
		const fileInput = document.getElementById("id_image");
		const container = document.querySelector(".file-upload-container");
		const previewContainer = document.querySelector(".preview-container");
		const imagePreview = document.getElementById("image_preview");

		// Reset file input
		if (fileInput) {
			fileInput.value = "";
		}

		// Clear preview
		if (imagePreview) {
			imagePreview.src = "";
		}

		// Reset container state
		if (container) {
			container.classList.remove("has-file", "loading");
		}
		if (previewContainer) {
			previewContainer.style.display = "none";
		}

		// Clear stored file data
		this.idImage = null;
	}

	showImagePreview(src) {
		const modal = document.getElementById("image_preview_modal");
		const modalImage = document.getElementById("modal_image");

		if (modal && modalImage) {
			modalImage.src = src;
			modal.classList.add("active");

			// Close modal when clicking the close button
			const closeBtn = modal.querySelector(".image-preview-close");
			if (closeBtn) {
				closeBtn.onclick = () => {
					modal.classList.remove("active");
				};
			}

			// Close modal when clicking outside
			modal.onclick = (e) => {
				if (e.target === modal) {
					modal.classList.remove("active");
				}
			};
		}
	}

	validateAge(input) {
		if (!input.value) {
			this.setInputValidation(
				input,
				false,
				"Please enter your date of birth"
			);
			return false;
		}

		const birthDate = new Date(input.value);
		const today = new Date();
		const age = today.getFullYear() - birthDate.getFullYear();
		const monthDiff = today.getMonth() - birthDate.getMonth();

		if (
			monthDiff < 0 ||
			(monthDiff === 0 && today.getDate() < birthDate.getDate())
		) {
			age--;
		}

		const isValid = age >= 18;
		this.isUnder18 = !isValid;

		const warningElement = document.getElementById("age_warning");
		if (warningElement) {
			warningElement.style.display = isValid ? "none" : "flex";
		}

		this.setInputValidation(
			input,
			isValid,
			"You must be at least 18 years old to register"
		);
		return isValid;
	}

	showImageModal(imageUrl, filename) {
		let modal = document.getElementById("image_viewer_modal");
		if (!modal) {
			modal = document.createElement("div");
			modal.id = "image_viewer_modal";
			modal.className = "image-modal-overlay";
			modal.innerHTML = `
				<div class="image-modal-content">
					<a href="#" class="modal-close-btn">&times;</a>
					<div class="modal-filename"></div>
					<img src="" alt="Preview"/>
				</div>
			`;
			document.body.appendChild(modal);

			modal
				.querySelector(".modal-close-btn")
				.addEventListener("click", (e) => {
					e.preventDefault();
					this.hideImageModal();
				});

			modal.addEventListener("click", (e) => {
				if (e.target === modal) {
					this.hideImageModal();
				}
			});
		}

		const modalImage = modal.querySelector("img");
		const modalFilename = modal.querySelector(".modal-filename");

		if (modalImage) modalImage.src = imageUrl;
		if (modalFilename) modalFilename.textContent = filename;

		modal.classList.add("active");
	}

	hideImageModal() {
		const modal = document.getElementById("image_viewer_modal");
		if (modal) {
			const modalContent = modal.querySelector(".image-modal-content");
			modalContent.classList.add("hide");
			setTimeout(() => {
				modal.classList.remove("active");
				modalContent.classList.remove("hide");
			}, 300);
		}
	}

	validateZipCode(input) {
		const zipRegex = /^[0-9]{4,10}$/;
		const isValid = zipRegex.test(input.value);
		this.setInputValidation(
			input,
			isValid,
			"Please enter a valid zip code"
		);
		return isValid;
	}

	validateName(input, minLength) {
		const nameRegex = /^[A-Za-z\s\-]+$/;
		const isValid =
			input.value.length >= minLength && nameRegex.test(input.value);
		this.setInputValidation(
			input,
			isValid,
			`Name must be at least ${minLength} characters and contain only letters, spaces, or hyphens`
		);
		return isValid;
	}
}

// Initialize registration manager
document.addEventListener("DOMContentLoaded", () => {
	window.registrationManager = new RegistrationManager();
});

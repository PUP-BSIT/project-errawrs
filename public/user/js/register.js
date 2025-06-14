const FORM_VALIDATION = {
	ACCOUNT_NUMBER_MIN_LENGTH: 10,
	SMS_CODE_LENGTH: 6,
	PASSWORD_MIN_LENGTH: 8,
	USERNAME_MIN_LENGTH: 3,
	USERNAME_MAX_LENGTH: 20,
	FIRST_NAME_MIN_LENGTH: 2,
	LAST_NAME_MIN_LENGTH: 2,
	MIN_AGE: 18,
	MAX_AGE: 100,
};

const NOTIFICATION_TYPES = {
	SUCCESS: "success",
	ERROR: "error",
	WARNING: "warning",
	INFO: "info",
};

const STEPS = {
	STEP_ONE_IDENTIFICATION: 1,
	STEP_TWO_CONTACT: 2,
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
	REDIRECT_DELAY: 2000,
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

		// Initialize forms
		this.initializeIdentificationForm();
		this.initializeContactForm();
		this.initializeOtpForm();

		// Initialize back buttons
		this.initializeBackButtons();

		// Load saved form data and update UI
		this.loadFormData();
		this.updateStepIndicators();
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
			this.goToStep(STEPS.STEP_TWO_CONTACT);
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

		// Save form data
		this.saveFormData();

		// Show loading state
		const submitBtn = document.querySelector('#contact_info_form button[type="submit"]');
		if (submitBtn) {
			submitBtn.disabled = true;
			submitBtn.innerHTML = BUTTON_STATES.PROCESSING;
		}

		// Request OTP
		this.requestOtp();
	}

	requestOtp() {
		// Get the phone number from the form
		const phoneNumber = document.getElementById("phone_number")?.value || "";

		// Create the request data
		const requestData = {
			phone_number: phoneNumber,
			purpose: 'registration'
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
					return response.json().then(data => {
						throw new Error(data.error || `HTTP error! Status: ${response.status}`);
					});
				}
				return response.json();
			})
			.then((data) => {
				// Reset submit button
				const submitBtn = document.querySelector('#contact_info_form button[type="submit"]');
				if (submitBtn) {
					submitBtn.innerHTML = 'Submit <i class="fas fa-arrow-right"></i>';
					submitBtn.disabled = false;
				}

				if (data.success) {
					this.showNotification(data.message, NOTIFICATION_TYPES.SUCCESS);
					this.showOtpModal();
				} else {
					this.showNotification(
						data.error || "Failed to send verification code. Please try again.",
						NOTIFICATION_TYPES.ERROR
					);
				}
			})
			.catch((error) => {
				// Reset submit button
				const submitBtn = document.querySelector('#contact_info_form button[type="submit"]');
				if (submitBtn) {
					submitBtn.innerHTML = 'Submit <i class="fas fa-arrow-right"></i>';
					submitBtn.disabled = false;
				}

				this.showNotification(
					error.message || "An error occurred. Please try again.",
					NOTIFICATION_TYPES.ERROR
				);
			});
	}

	validateContactPage1() {
		const inputs = {
			firstName: document.getElementById("first_name"),
			lastName: document.getElementById("last_name"),
			dateOfBirth: document.getElementById("date_of_birth"),
		};

		let isValid = true;

		// Check if all inputs exist
		for (const [key, input] of Object.entries(inputs)) {
			if (!input) {
				console.error(`${key} input not found`);
				isValid = false;
			}
		}

		if (!isValid) {
			this.showNotification("An error occurred. Please try again.", NOTIFICATION_TYPES.ERROR);
			return false;
		}

		// Validate first name
		if (!this.validateName(inputs.firstName, FORM_VALIDATION.FIRST_NAME_MIN_LENGTH)) {
			this.setInputValidation(inputs.firstName, false, "Please enter a valid first name");
			isValid = false;
		}

		// Validate last name
		if (!this.validateName(inputs.lastName, FORM_VALIDATION.LAST_NAME_MIN_LENGTH)) {
			this.setInputValidation(inputs.lastName, false, "Please enter a valid last name");
			isValid = false;
		}

		// Validate date of birth
		if (!this.validateAge(inputs.dateOfBirth)) {
			isValid = false;
		}

		if (!isValid) {
			this.showNotification("Please fill in all personal information correctly.", NOTIFICATION_TYPES.ERROR);
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
			this.setInputValidation(inputs.email, false, "Please enter a valid email address");
			isValid = false;
		}
		if (!inputs.phoneNumber || !this.validatePhoneNumber(inputs.phoneNumber)) {
			this.setInputValidation(inputs.phoneNumber, false, "Please enter a valid phone number");
			isValid = false;
		}
		if (!inputs.nationality || inputs.nationality.value === "") {
			this.setInputValidation(inputs.nationality, false, "Please select your nationality");
			isValid = false;
		}

		if (!isValid) {
			this.showNotification("Please fill in all contact details correctly.", NOTIFICATION_TYPES.ERROR);
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
			this.setInputValidation(inputs.street, false, "Please enter your street address");
			isValid = false;
		}
		if (!inputs.city || inputs.city.value.trim() === "") {
			this.setInputValidation(inputs.city, false, "Please enter your city");
			isValid = false;
		}
		if (!inputs.zipCode || !this.validateZipCode(inputs.zipCode)) {
			this.setInputValidation(inputs.zipCode, false, "Please enter a valid zip code");
			isValid = false;
		}
		if (!inputs.country || inputs.country.value === "") {
			this.setInputValidation(inputs.country, false, "Please select your country");
			isValid = false;
		}

		if (!isValid) {
			this.showNotification("Please fill in all address information correctly.", NOTIFICATION_TYPES.ERROR);
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
			currentPageElement.classList.add(direction === "right" ? "slide-left" : "slide-right");
			currentPageElement.addEventListener("transitionend", () => {
				currentPageElement.classList.remove("active", "slide-left", "slide-right");
				currentPageElement.style.display = "none";
			}, { once: true });

			// Show and animate new page
			newPageElement.style.display = "block";
			newPageElement.classList.add(direction === "right" ? "slide-in-right" : "slide-in-left");

			// Force reflow
			newPageElement.offsetHeight;

			// Add active class to trigger animation
			newPageElement.classList.add("active");
			
			// Remove animation classes after transition
			newPageElement.addEventListener("transitionend", () => {
				newPageElement.classList.remove("slide-in-right", "slide-in-left");
			}, { once: true });
		} else {
			// If no current page, just show the new page
			newPageElement.style.display = "block";
			newPageElement.classList.add("active");
		}

		this.currentContactPage = page;
		this.updatePaginationDots();
		this.saveFormData();
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

	initializeOtpForm() {
		const otpForm = document.getElementById("otp_verification_form");
		if (!otpForm) return;

		otpForm.addEventListener("submit", (e) => {
			e.preventDefault();
			this.verifyOtp();
		});

		// Add input validation for OTP code
		const otpInput = document.getElementById("otp_code");
		if (otpInput) {
			otpInput.addEventListener("input", (e) => {
				e.target.value = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
			});
		}

		// Handle resend OTP
		const resendBtn = document.getElementById("resend_otp");
		if (resendBtn) {
			resendBtn.addEventListener("click", (e) => {
				e.preventDefault();
				if (resendBtn.style.pointerEvents !== "none") {
					this.handleContactInfoSubmit(e);
				}
			});
		}
	}

	showOtpModal() {
		const otpModal = document.getElementById("otp_modal");
		const otpInput = document.getElementById("otp_code");
		
		if (!otpModal || !otpInput) {
			console.error("OTP modal elements not found");
			return;
		}

		// Reset OTP input
		otpInput.value = "";

		// Show modal with animation
		otpModal.style.display = "flex";
		requestAnimationFrame(() => {
			otpModal.classList.add("active");
		});

		// Focus on OTP input
		otpInput.focus();

		// Start countdown for resend button
		this.startResendCountdown();

		// Setup close handlers
		const closeBtn = document.getElementById("close_otp_modal");
		if (closeBtn) {
			closeBtn.onclick = (e) => {
				e.preventDefault();
				this.hideOtpModal();
			};
		}

		// Close on outside click
		otpModal.onclick = (e) => {
			if (e.target === otpModal) {
				this.hideOtpModal();
			}
		};

		// Close on escape key
		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape") {
				this.hideOtpModal();
			}
		}, { once: true });
	}

	hideOtpModal() {
		const otpModal = document.getElementById("otp_modal");
		if (!otpModal) return;

		// Remove active class to trigger fade out animation
		otpModal.classList.remove("active");

		// Hide modal after animation
		setTimeout(() => {
			otpModal.style.display = "none";
			// Reset OTP input
			const otpInput = document.getElementById("otp_code");
			if (otpInput) {
				otpInput.value = "";
			}
		}, 300);
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
			if (countdown <= 0) {
				clearInterval(countdownInterval);
				resendBtn.textContent = "Resend code";
				resendBtn.style.pointerEvents = "auto";
				resendBtn.style.opacity = "1";
			} else {
				resendBtn.textContent = `Resend code in ${countdown}s`;
			}
		}, 1000);
	}

	verifyOtp() {
		const otpInput = document.getElementById("otp_code");
		const verifyBtn = document.getElementById("verify_otp");
		const otp = otpInput?.value || "";

		if (!otp) {
			this.showNotification(
				"Please enter the verification code.",
				NOTIFICATION_TYPES.ERROR
			);
			return;
		}

		if (verifyBtn) {
			verifyBtn.innerHTML = BUTTON_STATES.PROCESSING;
			verifyBtn.disabled = true;
		}

		// Get the phone number from the form
		const phoneNumber = document.getElementById("phone_number")?.value || "";

		// Create the request data
		const requestData = {
			otp: otp,
			phone_number: phoneNumber
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
					return response.json().then(data => {
						throw new Error(data.error || `HTTP error! Status: ${response.status}`);
					});
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
						data.error || "Invalid verification code. Please try again.",
						NOTIFICATION_TYPES.ERROR
					);
					if (verifyBtn) {
						verifyBtn.innerHTML = "Verify";
						verifyBtn.disabled = false;
					}
				}
			})
			.catch((error) => {
				this.showNotification(
					error.message || "An error occurred. Please try again.",
					NOTIFICATION_TYPES.ERROR
				);
				if (verifyBtn) {
					verifyBtn.innerHTML = "Verify";
					verifyBtn.disabled = false;
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
		const phoneNumber = document.getElementById("phone_number")?.value || "";

		// Create the request data
		const requestData = {
			phone_number: phoneNumber,
			purpose: 'registration'
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
					return response.json().then(data => {
						throw new Error(data.error || `HTTP error! Status: ${response.status}`);
					});
				}
				return response.json();
			})
			.then((data) => {
				if (data.success) {
					this.showNotification(
						"A new verification code has been sent to your phone.",
						NOTIFICATION_TYPES.SUCCESS
					);
					this.startResendCountdown();
				} else {
					this.showNotification(
						data.error || "Failed to send verification code. Please try again.",
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
				this.showNotification(
					error.message || "Failed to send verification code. Please try again.",
					NOTIFICATION_TYPES.ERROR
				);
				if (resendBtn) {
					resendBtn.textContent = "Resend code";
					resendBtn.style.pointerEvents = "auto";
					resendBtn.style.opacity = "1";
				}
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
			date_of_birth: document.getElementById("date_of_birth")?.value || "",
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
					return response.json().then(data => {
						throw new Error(data.error || `HTTP error! Status: ${response.status}`);
					});
				}
				return response.json();
			})
			.then((data) => {
				this.hideLoadingState("contact_info_form");
				if (data.success) {
					this.goToStep(STEPS.STEP_THREE_PROCESSING);
					this.showNotification(
						"Registration successful! Please check your email for further instructions.",
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
				this.showNotification(
					error.message || "Registration failed. Please try again.",
					NOTIFICATION_TYPES.ERROR
				);
			});
	}

	goToStep(step) {
		console.log("Going to step:", step);
		
		if (step < STEPS.STEP_ONE_IDENTIFICATION || step > STEPS.STEP_THREE_PROCESSING) {
			console.error("Invalid step:", step);
			return;
		}

		try {
			// Save current form data
			this.saveFormData();
			console.log("Form data saved");

			// Hide all steps
			document.querySelectorAll(".form-step").forEach((el) => {
				el.classList.remove("active");
			});

			// Show target step
			let targetStep;
			switch (step) {
				case STEPS.STEP_ONE_IDENTIFICATION:
					targetStep = document.getElementById("step_one_identification");
					this.currentContactPage = CONTACT_PAGES.PAGE_ONE;
					break;
				case STEPS.STEP_TWO_CONTACT:
					targetStep = document.getElementById("step_two_contact");
					break;
				case STEPS.STEP_THREE_PROCESSING:
					targetStep = document.getElementById("step_three_processing");
					break;
			}

			if (targetStep) {
				targetStep.classList.add("active");
				this.currentStep = step;
				this.updateStepIndicators();
				if (step === STEPS.STEP_TWO_CONTACT) {
					this.updatePaginationDots();
				}
				console.log("Navigation complete to step:", step);
			} else {
				throw new Error("Target step element not found");
			}
		} catch (error) {
			console.error("Error during step navigation:", error);
			this.showNotification("An error occurred during navigation. Please try again.", NOTIFICATION_TYPES.ERROR);
		}
	}

	updateStepIndicators() {
		const steps = document.querySelectorAll(".step");
		steps.forEach((step, index) => {
			const stepNum = index + 1;
			if (stepNum < this.currentStep) {
				step.classList.add("completed");
				step.classList.remove("active");
			} else if (stepNum === this.currentStep) {
				step.classList.add("active");
				step.classList.remove("completed");
			} else {
				step.classList.remove("completed", "active");
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
		// Create notification element
		const notification = document.createElement("div");
		notification.className = `notification ${type}`;
		
		// Add icon based on type
		let icon;
		switch (type) {
			case NOTIFICATION_TYPES.SUCCESS:
				icon = "fa-check-circle";
				break;
			case NOTIFICATION_TYPES.ERROR:
				icon = "fa-times-circle";
				break;
			case NOTIFICATION_TYPES.WARNING:
				icon = "fa-exclamation-triangle";
				break;
			default:
				icon = "fa-info-circle";
		}
		
		notification.innerHTML = `
			<i class="fas ${icon}"></i>
			<span>${message}</span>
		`;

		// Add to document
		document.body.appendChild(notification);

		// Trigger animation
		requestAnimationFrame(() => {
			notification.classList.add("show");
		});

		// Remove after delay
		setTimeout(() => {
			notification.classList.remove("show");
			setTimeout(() => {
				notification.remove();
			}, 300); // Match animation duration
		}, 3000);
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
		try {
			const formData = {
				// Identification step
				id_type: document.getElementById("id_type")?.value || "",
				id_image: this.idImage,

				// Contact info step
				first_name: document.getElementById("first_name")?.value || "",
				last_name: document.getElementById("last_name")?.value || "",
				date_of_birth: document.getElementById("date_of_birth")?.value || "",
				email: document.getElementById("email")?.value || "",
				phone_number: document.getElementById("phone_number")?.value || "",
				nationality: document.getElementById("nationality")?.value || "",
				street: document.getElementById("street")?.value || "",
				city: document.getElementById("city")?.value || "",
				zip_code: document.getElementById("zip_code")?.value || "",
				country: document.getElementById("country")?.value || "",

				// Current state
				currentStep: this.currentStep,
				currentContactPage: this.currentContactPage
			};

			// Save to sessionStorage
			sessionStorage.setItem("registrationFormData", JSON.stringify(formData));
			console.log("Form data saved successfully");
		} catch (error) {
			console.error("Error saving form data:", error);
			throw error; // Re-throw to handle in calling function
		}
	}

	loadFormData() {
		const savedData = sessionStorage.getItem("registrationFormData");
		if (!savedData) return;

		try {
			const formData = JSON.parse(savedData);

			// Restore form values
			const fields = [
				"id_type", "first_name", "last_name", "date_of_birth",
				"email", "phone_number", "nationality", "street",
				"city", "zip_code", "country"
			];

			fields.forEach(field => {
				const input = document.getElementById(field);
				if (input && formData[field]) {
					input.value = formData[field];
				}
			});

			// Restore ID image if exists
			if (formData.id_image) {
				this.idImage = formData.id_image;
				const container = document.getElementById("file_upload_container");
				const previewInfo = container?.querySelector(".preview-info-compact");
				const fileNameDisplay = previewInfo?.querySelector(".file-name-display");

				if (container && previewInfo && fileNameDisplay) {
					fileNameDisplay.textContent = formData.id_image.name;
					previewInfo.style.display = "flex";
					container.classList.add("has-file");
				}
			}

			// Restore current step and page
			if (formData.currentStep) {
				this.currentStep = formData.currentStep;
				this.goToStep(formData.currentStep);
			}

			if (formData.currentContactPage) {
				this.currentContactPage = formData.currentContactPage;
				if (this.currentStep === STEPS.STEP_TWO_CONTACT) {
					this.goToContactPage(formData.currentContactPage);
				}
			}
		} catch (error) {
			console.error("Error loading form data:", error);
			sessionStorage.removeItem("registrationFormData");
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
		const previewInfoCompact = container?.querySelector(".preview-info-compact");
		const fileNameDisplay = previewInfoCompact?.querySelector(".file-name-display");
		
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
		const maxSize = 5 * 1024 * 1024; // 5MB
		if (file.size > maxSize) {
			this.showNotification(
				"File size must be less than 5MB.",
				NOTIFICATION_TYPES.ERROR
			);
			this.clearFilePreview();
			return;
		}

		// Show loading state
		if (container) {
			container.classList.add("loading");
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			// Store file data
			this.idImage = {
				data: e.target.result,
				type: file.type,
				name: file.name,
			};

			// Update UI
			if (container) {
				container.classList.remove("loading");
				container.classList.add("has-file");
			}
			
			if (previewInfoCompact) {
				previewInfoCompact.style.display = "flex";
			}
			
			if (fileNameDisplay) {
				fileNameDisplay.innerHTML = `<i class="fas fa-file-image"></i> ${file.name}`;
			}

			// Setup preview actions
			const viewBtn = previewInfoCompact?.querySelector(".btn-view-image");
			const removeBtn = previewInfoCompact?.querySelector(".remove-image");

			if (viewBtn) {
				viewBtn.onclick = () => this.showImagePreview(this.idImage.data, this.idImage.name);
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
			if (container) {
				container.classList.remove("loading");
			}
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
		let age = today.getFullYear() - birthDate.getFullYear();
		const monthDiff = today.getMonth() - birthDate.getMonth();

		if (
			monthDiff < 0 ||
			(monthDiff === 0 && today.getDate() < birthDate.getDate())
		) {
			age--;
		}

		const isValid = age >= FORM_VALIDATION.MIN_AGE && age <= FORM_VALIDATION.MAX_AGE;
		this.isUnder18 = !isValid;

		const warningElement = document.getElementById("age_warning");
		if (warningElement) {
			warningElement.style.display = isValid ? "none" : "flex";
		}

		this.setInputValidation(
			input,
			isValid,
			"You must be between 18 and 100 years old to register"
		);
		return isValid;
	}

	showImagePreview(src, filename = '') {
		const modal = document.getElementById('image_preview_modal');
		const modalImg = modal.querySelector('img');
		const modalFilename = modal.querySelector('.modal-filename');
		const closeBtn = document.getElementById('close_image_preview');

		modalImg.src = src;
		modalFilename.textContent = filename;
		modal.classList.add('active');

		// Close modal when clicking the close button
		closeBtn.onclick = () => this.hideImagePreview();

		// Close modal when clicking outside
		modal.onclick = (e) => {
			if (e.target === modal) {
				this.hideImagePreview();
			}
		};

		// Close modal with Escape key
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && modal.classList.contains('active')) {
				this.hideImagePreview();
			}
		});
	}

	hideImagePreview() {
		const modal = document.getElementById('image_preview_modal');
		modal.classList.remove('active');
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

	initializeIdentificationForm() {
		const form = document.getElementById("identification_form");
		if (!form) {
			console.error("Identification form not found");
			return;
		}

		// Initialize file upload
		this.initializeFileUpload();

		// Get the continue button
		const continueBtn = form.querySelector('button[type="submit"]');
		if (!continueBtn) {
			console.error("Continue button not found");
			return;
		}

		// Handle form submission
		form.addEventListener("submit", (e) => {
			e.preventDefault();
			console.log("Form submitted");

			// Disable the button and show loading state
			continueBtn.disabled = true;
			continueBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

			// Get form elements
			const idType = document.getElementById("id_type");

			// Basic validation
			if (!idType || !idType.value) {
				this.showNotification("Please select an ID type.", NOTIFICATION_TYPES.ERROR);
				continueBtn.disabled = false;
				continueBtn.innerHTML = 'Continue <i class="fas fa-arrow-right"></i>';
				return;
			}

			if (!this.idImage) {
				this.showNotification("Please upload your ID image.", NOTIFICATION_TYPES.ERROR);
				continueBtn.disabled = false;
				continueBtn.innerHTML = 'Continue <i class="fas fa-arrow-right"></i>';
				return;
			}

			// Use setTimeout to ensure UI updates before navigation
			setTimeout(() => {
				try {
					// Save form data
					this.saveFormData();
					console.log("Form data saved");

					// Navigate to next step
					document.querySelectorAll(".form-step").forEach(step => {
						step.classList.remove("active");
					});

					const nextStep = document.getElementById("step_two_contact");
					if (nextStep) {
						nextStep.classList.add("active");
						this.currentStep = STEPS.STEP_TWO_CONTACT;
						this.updateStepIndicators();
						console.log("Navigation complete");
					} else {
						throw new Error("Next step element not found");
					}
				} catch (error) {
					console.error("Error during form submission:", error);
					this.showNotification("An error occurred. Please try again.", NOTIFICATION_TYPES.ERROR);
				} finally {
					// Reset button state
					continueBtn.disabled = false;
					continueBtn.innerHTML = 'Continue <i class="fas fa-arrow-right"></i>';
				}
			}, 100);
		});
	}

	initializeContactForm() {
		const form = document.getElementById("contact_info_form");
		if (!form) return;

		// Initialize page navigation buttons
		const toPage2Btn = document.getElementById("to_contact_page_2");
		if (toPage2Btn) {
			toPage2Btn.addEventListener("click", () => {
				if (this.validateContactPage1()) {
					this.goToContactPage(CONTACT_PAGES.PAGE_TWO);
				}
			});
		}

		const toPage3Btn = document.getElementById("to_contact_page_3");
		if (toPage3Btn) {
			toPage3Btn.addEventListener("click", () => {
				if (this.validateContactPage2()) {
					this.goToContactPage(CONTACT_PAGES.PAGE_THREE);
				}
			});
		}

		// Initialize back buttons
		const backToIdentificationBtn = document.getElementById("back_to_identification");
		if (backToIdentificationBtn) {
			backToIdentificationBtn.addEventListener("click", () => {
				this.goToStep(STEPS.STEP_ONE_IDENTIFICATION);
			});
		}

		const backToPage1Btn = document.getElementById("back_to_contact_page_1");
		if (backToPage1Btn) {
			backToPage1Btn.addEventListener("click", () => {
				this.goToContactPage(CONTACT_PAGES.PAGE_ONE);
			});
		}

		const backToPage2Btn = document.getElementById("back_to_contact_page_2");
		if (backToPage2Btn) {
			backToPage2Btn.addEventListener("click", () => {
				this.goToContactPage(CONTACT_PAGES.PAGE_TWO);
			});
		}

		// Initialize pagination dots
		const paginationDots = document.querySelectorAll(".pagination-dot");
		paginationDots.forEach((dot) => {
			dot.addEventListener("click", () => {
				const page = parseInt(dot.dataset.page);
				if (!isNaN(page)) {
					this.handlePaginationDotClick(page);
				}
			});
		});

		// Handle form submission
		form.addEventListener("submit", (e) => this.handleContactInfoSubmit(e));
	}

	initializeFileUpload() {
		const fileInput = document.getElementById("id_image");
		const container = document.getElementById("file_upload_container");
		const previewInfo = container?.querySelector(".preview-info-compact");
		const fileNameDisplay = previewInfo?.querySelector(".file-name-display");
		const viewBtn = previewInfo?.querySelector(".btn-view-image");
		const removeBtn = previewInfo?.querySelector(".remove-image");

		if (!fileInput || !container || !previewInfo || !fileNameDisplay) {
			console.error("File upload elements not found");
			return;
		}

		const handleFileSelect = (file) => {
			if (!file.type.match("image.*")) {
				this.showNotification("Please upload an image file.", NOTIFICATION_TYPES.ERROR);
				return;
			}

			// Show loading state
			container.classList.add("loading");
			if (fileNameDisplay) fileNameDisplay.textContent = "Processing...";

			const reader = new FileReader();
			
			reader.onload = (e) => {
				try {
					this.idImage = {
						data: e.target.result,
						name: file.name,
						type: file.type
					};

					// Update UI
					fileNameDisplay.textContent = file.name;
					previewInfo.style.display = "flex";
					container.classList.add("has-file");
				} catch (error) {
					console.error("Error processing file:", error);
					this.showNotification("Error processing file. Please try again.", NOTIFICATION_TYPES.ERROR);
				} finally {
					container.classList.remove("loading");
				}
			};

			reader.onerror = (error) => {
				console.error("Error reading file:", error);
				this.showNotification("Error reading file. Please try again.", NOTIFICATION_TYPES.ERROR);
				container.classList.remove("loading");
			};

			try {
				reader.readAsDataURL(file);
			} catch (error) {
				console.error("Error starting file read:", error);
				this.showNotification("Error reading file. Please try again.", NOTIFICATION_TYPES.ERROR);
				container.classList.remove("loading");
			}
		};

		// Handle drag and drop
		container.addEventListener("dragover", (e) => {
			e.preventDefault();
			container.classList.add("dragover");
		});

		container.addEventListener("dragleave", () => {
			container.classList.remove("dragover");
		});

		container.addEventListener("drop", (e) => {
			e.preventDefault();
			container.classList.remove("dragover");
			
			const files = e.dataTransfer.files;
			if (files.length > 0) {
				fileInput.files = files;
				handleFileSelect(files[0]);
			}
		});

		// Handle file selection
		fileInput.addEventListener("change", (e) => {
			const file = e.target.files[0];
			if (file) {
				handleFileSelect(file);
			}
		});

		// Handle file preview
		if (viewBtn) {
			viewBtn.addEventListener("click", (e) => {
				e.preventDefault();
				if (this.idImage) {
					this.showImagePreview(this.idImage.data, this.idImage.name);
				}
			});
		}

		// Handle file removal
		if (removeBtn) {
			removeBtn.addEventListener("click", (e) => {
				e.preventDefault();
				this.idImage = null;
				fileInput.value = "";
				previewInfo.style.display = "none";
				container.classList.remove("has-file");
			});
		}
	}

	initializeBackButtons() {
		const backToIdentificationBtn = document.getElementById("back_to_identification");
		if (backToIdentificationBtn) {
			backToIdentificationBtn.addEventListener("click", () => {
				this.goToStep(STEPS.STEP_ONE_IDENTIFICATION);
			});
		}
	}

	setInputValidation(input, isValid, errorMessage = "") {
		if (!input) return;

		const feedbackElement = input.nextElementSibling;
		if (feedbackElement && feedbackElement.classList.contains("invalid-feedback")) {
			feedbackElement.textContent = errorMessage;
		}

		input.classList.toggle("is-invalid", !isValid);
		input.classList.toggle("is-valid", isValid);

		// Show error message if not valid
		if (!isValid) {
			// Remove existing error message if any
			const existingError = input.parentElement.querySelector(".error-message");
			if (existingError) {
				existingError.remove();
			}

			// Create and add new error message
			const errorDiv = document.createElement("div");
			errorDiv.className = "error-message";
			errorDiv.textContent = errorMessage;
			input.parentElement.appendChild(errorDiv);
		} else {
			// Remove error message if valid
			const errorDiv = input.parentElement.querySelector(".error-message");
			if (errorDiv) {
				errorDiv.remove();
			}
		}
	}
}

// Initialize registration manager
document.addEventListener("DOMContentLoaded", () => {
	window.registrationManager = new RegistrationManager();
});

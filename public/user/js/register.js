// Main entry for registration flow
import * as validation from './register-validation.js';
import * as navigation from './register-navigation.js';
import * as otpModal from './register-otp-modal.js';
import * as fileUpload from './register-file-upload.js';
import * as formDataUtils from './register-form-data.js';
import * as notifications from './register-notifications.js';
import { submitRegistrationData } from './register-submit.js';
import { initFileUpload, setOnFileChangeCallback } from './register-file-upload.js';

const FORM_VALIDATION = {
	FIRST_NAME_MIN_LENGTH: 2,
	LAST_NAME_MIN_LENGTH: 2,
	MIN_AGE: 18,
	MAX_AGE: 100,
};

const API_ENDPOINT = '/project-errawrs/src/api/user/submit_registration.php';

document.addEventListener('DOMContentLoaded', () => {
    // Step navigation
    const steps = Array.from(document.querySelectorAll('.form-step'));
    let currentStep = 1;
    function setCurrentStep(step) { currentStep = step; }
    function updateStepIndicators() {
        steps.forEach((step, idx) => {
            step.classList.toggle('active', idx + 1 === currentStep);
        });
    }

    // Pagination dots
    const dots = Array.from(document.querySelectorAll('.pagination-dot'));
    const formPages = Array.from(document.querySelectorAll('.form-page'));
    let currentContactPage = 1;
    function setCurrentContactPage(page) { currentContactPage = page; }
    function updatePagination() {
        navigation.updatePaginationDots(dots, currentContactPage);
    }
    updatePagination();

    // Navigation dot click
    navigation.setupPaginationDots(dots, (page) => {
        navigation.goToContactPage(
            page,
            formPages,
            setCurrentContactPage,
            updatePagination,
            formDataUtils.saveFormData,
            collectFormData
        );
    });

    // Go to contact page
    function goToContactPage(page) {
        navigation.goToContactPage(
            page,
            formPages,
            setCurrentContactPage,
            updatePagination,
            formDataUtils.saveFormData,
            collectFormData
        );
    }

    // Back/next buttons for contact pages
    const toPage2Btn = document.getElementById('to_contact_page_2');
    if (toPage2Btn) toPage2Btn.addEventListener('click', () => {
        if (validateContactPage1()) goToContactPage(2);
    });
    const toPage3Btn = document.getElementById('to_contact_page_3');
    if (toPage3Btn) toPage3Btn.addEventListener('click', () => {
        if (validateContactPage2()) goToContactPage(3);
    });
    const backToPage1Btn = document.getElementById('back_to_contact_page_1');
    if (backToPage1Btn) backToPage1Btn.addEventListener('click', () => goToContactPage(1));
    const backToPage2Btn = document.getElementById('back_to_contact_page_2');
    if (backToPage2Btn) backToPage2Btn.addEventListener('click', () => goToContactPage(2));

    // Back button from Step 2 to Step 1
    const backToIdentificationBtn = document.getElementById('back_to_identification');
    if (backToIdentificationBtn) {
        backToIdentificationBtn.addEventListener('click', () => {
            navigation.goToMainStep(1, steps, setCurrentStep, updateStepIndicators);
        });
    }

    // Validation functions for contact pages
    function validateContactPage1() {
        const firstName = document.getElementById('first_name');
        const lastName = document.getElementById('last_name');
        const dob = document.getElementById('date_of_birth');
        
        if (!firstName || !lastName || !dob) return false;
        
        const firstNameValid = validation.validateName(firstName, FORM_VALIDATION.FIRST_NAME_MIN_LENGTH);
        const lastNameValid = validation.validateName(lastName, FORM_VALIDATION.LAST_NAME_MIN_LENGTH);
        const dobValid = validation.validateAge(dob, FORM_VALIDATION.MIN_AGE, FORM_VALIDATION.MAX_AGE);
        
        if (!firstNameValid) {
            notifications.showNotification('Please enter a valid first name', 'error');
            return false;
        }
        if (!lastNameValid) {
            notifications.showNotification('Please enter a valid last name', 'error');
            return false;
        }
        if (!dobValid) {
            notifications.showNotification('You must be between 18 and 100 years old to register', 'error');
			return false;
		}

        return true;
    }

    function validateContactPage2() {
        const email = document.getElementById('email');
        const phone = document.getElementById('phone_number');
        const nationality = document.getElementById('nationality');
        
        if (!email || !phone || !nationality) return false;
        
        const emailValid = validation.validateEmail(email);
        const phoneValid = validation.validatePhoneNumber(phone);
        const nationalityValid = nationality.value !== '';
        
        if (!emailValid) {
            notifications.showNotification('Please enter a valid email address', 'error');
            return false;
        }
        if (!phoneValid) {
            notifications.showNotification('Please enter a valid phone number', 'error');
            return false;
        }
        if (!nationalityValid) {
            notifications.showNotification('Please select your nationality', 'error');
            return false;
        }
        
        return true;
    }

    // File upload
    initFileUpload();
    setOnFileChangeCallback(updateStep1NextBtn);

    // Field validations
    const firstNameInput = document.getElementById('first_name');
    if (firstNameInput) {
        firstNameInput.addEventListener('blur', () => {
            if (!validation.validateName(firstNameInput, FORM_VALIDATION.FIRST_NAME_MIN_LENGTH)) {
                notifications.showNotification('Invalid first name', 'error');
            }
        });
    }
    const lastNameInput = document.getElementById('last_name');
    if (lastNameInput) {
        lastNameInput.addEventListener('blur', () => {
            if (!validation.validateName(lastNameInput, FORM_VALIDATION.LAST_NAME_MIN_LENGTH)) {
                notifications.showNotification('Invalid last name', 'error');
            }
        });
    }
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('blur', () => {
            if (!validation.validateEmail(emailInput)) {
                notifications.showNotification('Invalid email address', 'error');
				}
			});
		}
    const phoneInput = document.getElementById('phone_number');
    if (phoneInput) {
        phoneInput.addEventListener('blur', () => {
            if (!validation.validatePhoneNumber(phoneInput)) {
                notifications.showNotification('Invalid phone number', 'error');
            }
        });
    }
    const dobInput = document.getElementById('date_of_birth');
    if (dobInput) {
        dobInput.addEventListener('blur', () => {
            if (!validation.validateAge(dobInput, FORM_VALIDATION.MIN_AGE, FORM_VALIDATION.MAX_AGE)) {
                notifications.showNotification('You must be between 18 and 100 years old to register', 'error');
            }
        });
    }
    const zipInput = document.getElementById('zip_code');
    if (zipInput) {
        zipInput.addEventListener('blur', () => {
            if (!validation.validateZipCode(zipInput)) {
                notifications.showNotification('Invalid zip code', 'error');
				}
			});
	}

    // OTP modal logic
    const otpBtn = document.getElementById('resend_otp');
    if (otpBtn) {
        otpBtn.addEventListener('click', () => {
            otpModal.startResendCountdown(otpBtn);
        });
    }
    const closeOtpModalBtn = document.getElementById('close_otp_modal');
    if (closeOtpModalBtn) {
        closeOtpModalBtn.addEventListener('click', () => {
            otpModal.hideOtpModal();
        });
    }

    // Save/load/clear form data
    function collectFormData() {
        // Collect all form fields as needed
        let phone = phoneInput?.value || '';
        // Only format, do not show notification here
        if (/^9\d{9}$/.test(phone)) {
            phone = '+63' + phone;
			} else {
            phone = '';
        }
        
        const formData = {
            first_name: firstNameInput?.value || document.getElementById('first_name')?.value || '',
            last_name: lastNameInput?.value || document.getElementById('last_name')?.value || '',
            email: emailInput?.value || document.getElementById('email')?.value || '',
            phone_number: phone,
            date_of_birth: dobInput?.value || document.getElementById('date_of_birth')?.value || '',
            zip_code: zipInput?.value || document.getElementById('zip_code')?.value || '',
            nationality: document.getElementById('nationality')?.value || '',
            street: document.getElementById('street')?.value || '',
            city: document.getElementById('city')?.value || '',
            country: document.getElementById('country')?.value || '',
            id_type: document.getElementById('id_type')?.value || ''
        };
        
        return formData;
    }

    // Step 1: Identification - Next button enable/disable logic
    const idTypeInput = document.getElementById('id_type');
    const idImageInput = document.getElementById('id_image');
    const nextBtnStep1 = document.querySelector('#step_one_identification .btn-continue');
    function updateStep1NextBtn() {
        const idTypeValid = idTypeInput && idTypeInput.value !== '';
        const idImageValid = idImageInput && idImageInput.files && idImageInput.files.length > 0;
        if (idTypeValid && idImageValid) {
            nextBtnStep1.disabled = false;
            nextBtnStep1.classList.remove('btn-disabled');
					} else {
            nextBtnStep1.disabled = true;
            nextBtnStep1.classList.add('btn-disabled');
        }
    }
    if (idTypeInput && idImageInput && nextBtnStep1) {
        idTypeInput.addEventListener('change', updateStep1NextBtn);
        idImageInput.addEventListener('change', updateStep1NextBtn);
        updateStep1NextBtn();
    }

    // Step 1: Identification - Next button click handler
    if (nextBtnStep1) {
        nextBtnStep1.addEventListener('click', (e) => {
            if (!nextBtnStep1.disabled) {
                formDataUtils.saveFormData(collectFormData());
                navigation.goToMainStep(2, steps, setCurrentStep, updateStepIndicators);
				}
			});
		}

    // Registration submission
    const contactForm = document.getElementById('contact_info_form');
    let pendingFormData = null;
    if (contactForm) {
		contactForm.addEventListener("submit", async (e) => {
			e.preventDefault();
			const data = collectFormData();
			if (!data.phone_number) return; // Don't submit if phone is invalid

			// Build FormData from scratch to ensure all fields are included
			const formData = new FormData();

			// Append all required fields using the collected data
			formData.append("first_name", data.first_name);
			formData.append("last_name", data.last_name);
			formData.append("phone_number", data.phone_number);
			formData.append("date_of_birth", data.date_of_birth);
			formData.append("email", data.email);
			formData.append("zip_code", data.zip_code);
			formData.append("nationality", data.nationality);
			formData.append("street", data.street);
			formData.append("city", data.city);
			formData.append("country", data.country);
			formData.append("id_type", data.id_type);

			// Append the ID image file from Step 1
			const idImageInput = document.getElementById("id_image");
			if (
				idImageInput &&
				idImageInput.files &&
				idImageInput.files.length > 0
			) {
				formData.append("id_image", idImageInput.files[0]);
			}

			// Save formData for later submission after OTP
			pendingFormData = formData;
			otpModal.showOtpModal(
				data.phone_number,
				onOtpVerifiedSubmitRegistration
			);
		});
	}

    // Callback to submit registration after OTP is verified
    async function onOtpVerifiedSubmitRegistration() {
        if (pendingFormData) {
            await submitRegistrationData(pendingFormData, API_ENDPOINT, showSuccessStep);
            pendingFormData = null;
        }
    }

    // Show the success step/panel and display registration ID
    function showSuccessStep(registrationId) {
        // Hide all steps
        steps.forEach(step => step.classList.remove('active'));
        // Show the success step (step_three_processing)
        const successStep = document.getElementById('step_three_processing');
        if (successStep) {
            successStep.classList.add('active');
            // Optionally update the registration ID in the panel
            const regIdElem = successStep.querySelector('.registration-id-value');
            if (regIdElem) {
                regIdElem.textContent = '#' + registrationId;
            }
        }
    }
});

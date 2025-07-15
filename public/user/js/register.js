// Main entry for registration flow
import * as validation from './register-validation.js';
import * as navigation from './register-navigation.js';
import * as otpModal from './register-otp-modal.js';
import * as fileUpload from './register-file-upload.js';
import * as formDataUtils from './register-form-data.js';
import * as notifications from './register-notifications.js';
import { submitRegistrationData } from './register-submit.js';
import { initFileUpload, setOnFileChangeCallback } from './register-file-upload.js';
import { hideLoading, hideOtpModal } from './register-otp-modal.js';
// import { API_ENDPOINTS } from './config.js';
const API_ENDPOINTS = window.API_ENDPOINTS;

const FORM_VALIDATION = {
	FIRST_NAME_MIN_LENGTH: 2,
	LAST_NAME_MIN_LENGTH: 2,
	MIN_AGE: 18,
	MAX_AGE: 100,
};

const API_ENDPOINT = API_ENDPOINTS.SUBMIT_REGISTRATION;

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

    function setStepIndicator(step) {
        document.querySelectorAll('.step-indicators .step').forEach((el, idx) => {
            if (idx === step - 1) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
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
        setStepIndicator(2); // Always highlight step 2 when in any sub-page of Step 2
    }

    // Also update the step indicator when entering Step 2 from Step 1
    const toStep2Btn = document.querySelector('#step_one_identification .btn-continue');
    if (toStep2Btn) {
        toStep2Btn.addEventListener('click', () => {
            setStepIndicator(2);
        });
    }

    // On page load, if #step_two_contact is active, highlight step 2
    if (document.getElementById('step_two_contact')?.classList.contains('active')) {
        setStepIndicator(2);
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
        const idImageValid =
            idImageInput &&
            idImageInput.files &&
            idImageInput.files.length > 0 &&
            idImageInput.files[0].size <= 500 * 1024; // 500 KB
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
				const file = idImageInput.files[0];
				const maxSize = 500 * 1024; // 500 KB
				if (file.size >= maxSize) {
					notifications.showNotification('ID image file size must be less than 500 KB.', 'error');
					return; // Block submission
				}
				formData.append("id_image", file);
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
            const success = await submitRegistrationData(pendingFormData, API_ENDPOINT, showSuccessStep);
            if (success) {
                // Hide loading animation and close OTP modal after successful registration
                hideLoading();
                hideOtpModal();
            } else {
                // If registration failed, hide loading but keep modal open for retry
                hideLoading();
            }
            pendingFormData = null;
        }
    }

    // Show the success step/panel and display registration ID
    function showSuccessStep(registrationId) {
        setStepIndicator(3);
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

    // --- Country Searchable Dropdown Enhancement (Names Only, Static List) ---
    const countrySelect = document.getElementById('country');
    if (countrySelect) {
        // Static country list (ISO 3166 common names)
        const staticCountries = [
            'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia','Australia','Austria','Azerbaijan',
            'Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi',
            'Cabo Verde','Cambodia','Cameroon','Canada','Central African Republic','Chad','Chile','China','Colombia','Comoros','Congo','Costa Rica','Croatia','Cuba','Cyprus','Czechia',
            'Democratic Republic of the Congo','Denmark','Djibouti','Dominica','Dominican Republic',
            'Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia',
            'Fiji','Finland','France',
            'Gabon','Gambia','Georgia','Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana',
            'Haiti','Honduras','Hungary',
            'Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy',
            'Jamaica','Japan','Jordan',
            'Kazakhstan','Kenya','Kiribati','Kuwait','Kyrgyzstan',
            'Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg',
            'Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar',
            'Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea','North Macedonia','Norway',
            'Oman',
            'Pakistan','Palau','Palestine','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal',
            'Qatar',
            'Romania','Russia','Rwanda',
            'Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino','Sao Tome and Principe','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria',
            'Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu',
            'Uganda','Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan',
            'Vanuatu','Vatican City','Venezuela','Vietnam',
            'Yemen',
            'Zambia','Zimbabwe'
        ];
        // Create a wrapper and search input
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.width = '100%';
        countrySelect.parentNode.insertBefore(wrapper, countrySelect);
        wrapper.appendChild(countrySelect);
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Type to search country...';
        searchInput.style.width = '100%';
        searchInput.style.marginBottom = '8px';
        searchInput.style.padding = '8px';
        searchInput.style.borderRadius = '6px';
        searchInput.style.border = '1px solid #ccc';
        wrapper.insertBefore(searchInput, countrySelect);

        // Dropdown for search results
        const dropdown = document.createElement('div');
        dropdown.style.position = 'absolute';
        dropdown.style.top = '40px';
        dropdown.style.left = '0';
        dropdown.style.right = '0';
        dropdown.style.background = '#fff';
        dropdown.style.border = '1px solid #ccc';
        dropdown.style.borderRadius = '6px';
        dropdown.style.zIndex = '1001';
        dropdown.style.maxHeight = '200px';
        dropdown.style.overflowY = 'auto';
        dropdown.style.display = 'none';
        wrapper.appendChild(dropdown);

        // Populate select with static list
        wrapper._allCountries = staticCountries;
        countrySelect.innerHTML = '<option value="">Select Country</option>' +
            staticCountries.map(c => `<option value="${c}">${c}</option>`).join('');

        // Show dropdown with filtered results
        searchInput.addEventListener('input', function() {
            const filter = this.value.trim().toLowerCase();
            const allCountries = wrapper._allCountries || [];
            let filtered = allCountries;
            if (filter) {
                filtered = allCountries.filter(c =>
                    c.toLowerCase().includes(filter)
                );
            }
            dropdown.innerHTML = '';
            if (filtered.length > 0 && filter) {
                filtered.forEach(c => {
                    const item = document.createElement('div');
                    item.textContent = c;
                    item.style.padding = '8px 12px';
                    item.style.cursor = 'pointer';
                    item.onmouseover = () => item.style.background = '#f0f0f0';
                    item.onmouseout = () => item.style.background = '#fff';
                    item.onclick = () => {
                        searchInput.value = c;
                        countrySelect.value = c;
                        dropdown.style.display = 'none';
                    };
                    dropdown.appendChild(item);
                });
                dropdown.style.display = 'block';
            } else {
                dropdown.style.display = 'none';
            }
        });

        // Hide dropdown on blur
        searchInput.addEventListener('blur', function() {
            setTimeout(() => dropdown.style.display = 'none', 200);
        });

        // When user selects from dropdown, update search input
        countrySelect.addEventListener('change', function() {
            if (countrySelect.value) {
                searchInput.value = countrySelect.value;
            }
        });
    }

    let previousFile = null;
    let previousFileName = '';
    let previousFileURL = '';

    const viewBtn = document.querySelector('.btn-view-image');

    function updateViewButtonState() {
        if (viewBtn) {
            viewBtn.disabled = !previousFileURL;
        }
    }

    const fileInput = document.getElementById('id_image');
    const previewInfo = document.querySelector('.preview-info-compact');
    const removeBtn = document.querySelector('.btn-remove-image');

    if (fileInput && previewInfo) {
        fileInput.addEventListener('change', function(e) {
            const file = fileInput.files[0];
            const maxSize = 500 * 1024; // 500 KB
            const fileNameDisplay = document.querySelector('.file-name-display');
            if (file) {
                if (file.size >= maxSize) {
                    notifications.showNotification('ID image file size must be less than 500 KB.', 'error');
                    // Do NOT update preview or file name, just clear the file input
                    fileInput.value = '';
                    previewInfo.classList.remove('hidden');
                    if (fileNameDisplay) fileNameDisplay.textContent = previousFileName;
                    updateViewButtonState();
                    return;
                }
                // If valid, update previousFile, preview, and preview URL
                previousFile = file;
                previousFileName = file.name;
                previousFileURL = URL.createObjectURL(file);
                previewInfo.classList.remove('hidden');
                if (fileNameDisplay) fileNameDisplay.textContent = file.name;
                updateViewButtonState();
            } else {
                previewInfo.classList.add('hidden');
                previousFile = null;
                previousFileName = '';
                previousFileURL = '';
                if (fileNameDisplay) fileNameDisplay.textContent = '';
                updateViewButtonState();
            }
        });
    }

    if (removeBtn && previewInfo && fileInput) {
        removeBtn.addEventListener('click', function() {
            fileInput.value = '';
            previewInfo.classList.add('hidden');
            previousFile = null;
            previousFileName = '';
            previousFileURL = '';
            const fileNameDisplay = document.querySelector('.file-name-display');
            if (fileNameDisplay) fileNameDisplay.textContent = '';
            updateViewButtonState();
        });
    }

    // View button logic: show preview modal if previousFileURL exists
    if (viewBtn) {
        viewBtn.addEventListener('click', function() {
            if (!previousFileURL) return;
            // Show your preview modal and set the image src to previousFileURL
            const modal = document.getElementById('image_preview_modal');
            const modalImg = modal ? modal.querySelector('img') : null;
            if (modal && modalImg) {
                modalImg.src = previousFileURL;
                modal.classList.add('active');
            }
        });
    }
});

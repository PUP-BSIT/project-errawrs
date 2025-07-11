// Registration form data utilities

export function saveFormData(data) {
    sessionStorage.setItem("registrationFormData", JSON.stringify(data));
}

export function loadFormData() {
    const savedData = sessionStorage.getItem("registrationFormData");
    return savedData ? JSON.parse(savedData) : null;
}

export function clearFormData() {
    sessionStorage.removeItem("registrationFormData");
} 
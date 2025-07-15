export function validateName(input, minLength) {
    const nameRegex = /^[A-Za-z\s\-]+$/;
    return input.value.length >= minLength && nameRegex.test(input.value);
}

export function validateEmail(input) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input.value);
}

export function validatePhoneNumber(input) {
    const phoneRegex = /^9[0-9]{9}$/;
    return phoneRegex.test(input.value);
}

export function validateZipCode(input) {
    const zipRegex = /^[0-9]{4,10}$/;
    return zipRegex.test(input.value);
}

export function validateAge(input, minAge, maxAge) {
    if (!input.value) return false;
    const birthDate = new Date(input.value);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age >= minAge && age <= maxAge;
} 
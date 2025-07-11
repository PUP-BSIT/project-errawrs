// Registration submission logic

import { showNotification } from './register-notifications.js';

export async function submitRegistrationData(formData, apiEndpoint, onSuccess) {
    try {
        // Convert FormData to JSON object for the data field
        const jsonData = {};
        for (let [key, value] of formData.entries()) {
            if (key !== 'id_image') { // Exclude file from JSON
                jsonData[key] = value;
            }
        }
        
        // Create new FormData with JSON data and file
        const submitFormData = new FormData();
        submitFormData.append('data', JSON.stringify(jsonData));
        
        // Add the file separately
        const idImageFile = formData.get('id_image');
        if (idImageFile) {
            submitFormData.append('id_image', idImageFile);
        }
        
        const response = await fetch(apiEndpoint, {
            method: "POST",
            credentials: 'include',
            body: submitFormData,
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            showNotification(data.error || "Registration failed. Please try again.", 'error');
            return false;
        }
        
        // Show success notification
        showNotification("Registration successful!", 'success');
        
        // Call the onSuccess callback with registration ID
        if (typeof onSuccess === 'function') {
            onSuccess(data.registration_id);
        }
        
        return true;
    } catch (error) {
        showNotification(error.message || "Registration failed. Please try again.", 'error');
        return false;
    }
} 
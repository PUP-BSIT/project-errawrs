// File upload logic for registration

import { showNotification } from './register-notifications.js';

export function handleFileSelect(file, onPreview) {
    // File type check
    if (!file.type.match("image.*")) return false;
    // File size check: max 500 KB
    const maxSize = 500 * 1024; // 500 KB
    if (file.size > maxSize) {
        showNotification('ID image file size must not exceed 500 KB.', 'error');
        return false;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        onPreview({ data: e.target.result, name: file.name, type: file.type });
    };
    reader.readAsDataURL(file);
    return true;
}

export function clearFilePreview(fileInput, previewContainer) {
    if (fileInput) fileInput.value = "";
    if (previewContainer) previewContainer.classList.add('hidden');
}

let onFileChangeCallback = null;

export function setOnFileChangeCallback(cb) {
    onFileChangeCallback = cb;
}

export function initFileUpload() {
    const fileInput = document.getElementById('id_image');
    const container = document.getElementById('file_upload_container');
    const previewInfo = container?.querySelector('.preview-info-compact');
    const fileNameDisplay = previewInfo?.querySelector('.file-name-display');
    const viewBtn = previewInfo?.querySelector('.btn-view-image');
    const uploadAgainBtn = previewInfo?.querySelector('.btn-upload-again');
    const removeBtn = previewInfo?.querySelector('.btn-remove-image');
    let currentImage = null;

    if (!fileInput || !container || !previewInfo || !fileNameDisplay) return;

    // File select
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Only allow files up to 500 KB
            const maxSize = 500 * 1024; // 500 KB
            if (file.size > maxSize) {
                showNotification('ID image file size must not exceed 500 KB.', 'error');
                fileInput.value = "";
                previewInfo.classList.add('hidden');
                container.classList.remove('has-file');
                return;
            }
            const valid = handleFileSelect(file, (img) => {
                currentImage = img;
                fileNameDisplay.textContent = img.name;
                previewInfo.classList.remove('hidden');
                container.classList.add('has-file');
                if (onFileChangeCallback) onFileChangeCallback();
            });
            if (!valid) {
                fileInput.value = "";
                previewInfo.classList.add('hidden');
                container.classList.remove('has-file');
            }
        } else {
            if (onFileChangeCallback) onFileChangeCallback();
        }
    });

    // Preview button
    if (viewBtn) {
        viewBtn.onclick = () => {
            if (!currentImage) return;
            const modal = document.getElementById('image_preview_modal');
            const modalImg = modal.querySelector('img');
            const modalFilename = modal.querySelector('.modal-filename');
            modalImg.src = currentImage.data;
            modalFilename.textContent = currentImage.name;
            modal.classList.add('active');
            // Close modal logic
            const closeBtn = document.getElementById('close_image_preview');
            closeBtn.onclick = () => modal.classList.remove('active');
            modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };
        };
    }

    // Upload again button
    if (uploadAgainBtn) {
        uploadAgainBtn.onclick = () => {
            fileInput.value = "";
            fileInput.click();
        };
    }

    // Remove button
    if (removeBtn) {
        removeBtn.onclick = () => {
            currentImage = null;
            fileInput.value = "";
            previewInfo.classList.add('hidden');
            container.classList.remove('has-file');
            if (onFileChangeCallback) onFileChangeCallback();
        };
    }
} 
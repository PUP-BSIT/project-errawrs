// Registration navigation logic

export function goToStep(step, steps, currentStep, updateStepIndicators) {
    steps.forEach((el, idx) => {
        el.classList.remove('active');
        if (idx + 1 === step) {
            el.classList.add('active');
        }
    });
    currentStep = step;
    updateStepIndicators();
    return currentStep;
}

export function updatePaginationDots(dots, currentContactPage) {
    dots.forEach((dot, index) => {
        const pageNum = index + 1;
        dot.classList.toggle('active', pageNum === currentContactPage);
    });
}

// New: Contact page navigation logic
export function goToContactPage(
    page,
    formPages,
    setCurrentContactPage,
    updatePagination,
    saveFormData,
    collectFormData
) {
    if (page < 1 || page > formPages.length) return;
    formPages.forEach((el, idx) => {
        el.classList.toggle('active', idx + 1 === page);
    });
    setCurrentContactPage(page);
    updatePagination();
    if (saveFormData && collectFormData) {
        saveFormData(collectFormData());
    }
}

export function setupPaginationDots(dots, goToContactPageFn) {
    dots.forEach((dot, idx) => {
        dot.addEventListener('click', () => {
            goToContactPageFn(idx + 1);
        });
    });
}

// New: Main step navigation logic
export function goToMainStep(
    step,
    steps,
    setCurrentStep,
    updateStepIndicators
) {
    if (step < 1 || step > steps.length) return;
    steps.forEach((el, idx) => {
        el.classList.toggle('active', idx + 1 === step);
    });
    setCurrentStep(step);
    updateStepIndicators();
}

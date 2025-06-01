// Handle admin login
class AdminLogin {
	constructor() {
		this.form = document.getElementById('admin_login_form');
		this.init();
	}

	init() {
		this.bindEvents();
	}

	bindEvents() {
		// Form submission
		if (this.form) {
			this.form.addEventListener('submit', (e) => this.handleLogin(e));
		}

		// Password toggle
		const passwordToggle = document.querySelector('.password-toggle');
		if (passwordToggle) {
			passwordToggle.addEventListener('click', () => this.togglePasswordVisibility(passwordToggle));
		}
	}

	async handleLogin(e) {
		e.preventDefault();
		
		const username = document.getElementById('username').value.trim();
		const password = document.getElementById('password').value;

		if (!this.validateForm(username, password)) {
			return;
		}

		this.showLoadingState();

		try {
			console.log('Attempting admin login with:', { username }); // Don't log password
			
			const response = await fetch('/project-errawrs/src/api/auth/login.php', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				},
				body: JSON.stringify({ 
					username, 
					password,
					login_type: 'admin'
				}),
				credentials: 'include'
			});

			console.log('Response status:', response.status);
			
			let data;
			const responseText = await response.text();
			console.log('Raw response:', responseText);
			
			try {
				data = JSON.parse(responseText);
			} catch (parseError) {
				console.error('Failed to parse JSON response:', parseError);
				this.showNotification('Server returned invalid response format', 'error');
				return;
			}

			if (response.ok && data.success) {
				this.showNotification('Login successful! Redirecting...', 'success');
				// Store admin data in localStorage if needed
				localStorage.setItem('admin', JSON.stringify(data.user));
				setTimeout(() => {
					window.location.href = './dashboard.html';
				}, 1500);
			} else {
				const errorMessage = data.error || 'Login failed. Please check your credentials.';
				console.error('Login failed:', errorMessage);
				this.showNotification(errorMessage, 'error');
			}
		} catch (error) {
			console.error('Login error:', error);
			this.showNotification('An error occurred during login. Please try again.', 'error');
		} finally {
			this.hideLoadingState();
		}
	}

	validateForm(username, password) {
		if (!username) {
			this.showNotification('Username is required', 'error');
			return false;
		}

		if (!password) {
			this.showNotification('Password is required', 'error');
			return false;
		}

		return true;
	}

	togglePasswordVisibility(button) {
		const targetId = button.dataset.target;
		const passwordInput = document.getElementById(targetId);
		const icon = button.querySelector('i');

		if (passwordInput && icon) {
			const type = passwordInput.type === 'password' ? 'text' : 'password';
			passwordInput.type = type;
			icon.className = `fas fa-eye${type === 'password' ? '-slash' : ''}`;
		}
	}

	showLoadingState() {
		const submitBtn = this.form.querySelector('button[type="submit"]');
		if (submitBtn) {
			submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
			submitBtn.disabled = true;
		}

		// Disable form inputs
		this.form.querySelectorAll('input').forEach(input => {
			input.disabled = true;
		});
	}

	hideLoadingState() {
		const submitBtn = this.form.querySelector('button[type="submit"]');
		if (submitBtn) {
			submitBtn.innerHTML = 'Login';
			submitBtn.disabled = false;
		}

		// Re-enable form inputs
		this.form.querySelectorAll('input').forEach(input => {
			input.disabled = false;
		});
	}

	showNotification(message, type = 'info') {
		// Remove existing notification
		const existingNotification = document.querySelector('.notification');
		if (existingNotification) {
			existingNotification.remove();
		}

		// Create notification element
		const notification = document.createElement('div');
		notification.className = `notification notification-${type}`;
		notification.innerHTML = `
			<div class="notification-content">
				<i class="fas ${this.getNotificationIcon(type)}"></i>
				<span>${message}</span>
			</div>`;

		// Add to DOM
		document.body.appendChild(notification);

		// Show notification with animation
		setTimeout(() => {
			notification.classList.add('show');
		}, 100);

		// Auto-hide notification
		setTimeout(() => {
			notification.classList.remove('show');
			setTimeout(() => notification.remove(), 300);
		}, 5000);
	}

	getNotificationIcon(type) {
		switch (type) {
			case 'success':
				return 'fa-check-circle';
			case 'error':
				return 'fa-exclamation-circle';
			case 'warning':
				return 'fa-exclamation-triangle';
			default:
				return 'fa-info-circle';
		}
	}
}

// Initialize admin login when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
	new AdminLogin();
});

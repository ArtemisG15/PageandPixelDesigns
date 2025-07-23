// Authentication System JavaScript
// Save as: assets/js/auth-system.js

// User Database System (API-based)
class UserDatabase {
    static API_BASE = 'http://localhost:3001/api';
    //static API_BASE = 'http://localhost:3001/api'; for testing.
    //static API_BASE = '/api'; for live.
    
    static async createUser(userData) {
        try {
            const response = await fetch(`${this.API_BASE}/users/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to create user');
            }
            
            return result.user;
        } catch (error) {
            console.error('Create user error:', error);
            throw error;
        }
    }
    
    static async authenticateUser(email, password) {
        try {
            const response = await fetch(`${this.API_BASE}/users/authenticate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Authentication failed');
            }
            
            return result;
        } catch (error) {
            console.error('Authentication error:', error);
            throw error;
        }
    }
    
    static async getUser(email) {
        try {
            const response = await fetch(`${this.API_BASE}/users/${encodeURIComponent(email)}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                const result = await response.json();
                throw new Error(result.error || 'Failed to get user');
            }
            
            const result = await response.json();
            return result.user;
        } catch (error) {
            console.error('Get user error:', error);
            return null;
        }
    }
    
    static async updateUser(email, updates) {
        try {
            const response = await fetch(`${this.API_BASE}/users/${encodeURIComponent(email)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to update user');
            }
            
            return result.user;
        } catch (error) {
            console.error('Update user error:', error);
            throw error;
        }
    }
    
    static async createSession(user) {
        // Sessions are created by the authentication endpoint
        // Just store locally for client-side reference
        const sessionData = {
            user: user,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('pagePixelSession', JSON.stringify(sessionData));
        return sessionData;
    }
    
    static async validateSession(sessionId) {
        try {
            const response = await fetch(`${this.API_BASE}/sessions/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sessionId })
            });
            
            if (!response.ok) {
                return null;
            }
            
            const result = await response.json();
            return result.user;
        } catch (error) {
            console.error('Session validation error:', error);
            return null;
        }
    }
    
    static async destroySession(sessionId) {
        try {
            await fetch(`${this.API_BASE}/sessions/destroy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sessionId })
            });
        } catch (error) {
            console.error('Session destroy error:', error);
        }
        
        localStorage.removeItem('pagePixelSession');
        return true;
    }
}

// Main Authentication System
class AuthSystem {
    static currentUser = null;
    static isInitialized = false;
    
    static async initialize() {
        if (this.isInitialized) return;
        
        try {
            // Check for existing session
            const sessionData = localStorage.getItem('pagePixelSession');
            if (sessionData) {
                const { user } = JSON.parse(sessionData);
                
                // Validate session by getting fresh user data
                const freshUser = await UserDatabase.getUser(user.email);
                
                if (freshUser) {
                    this.currentUser = freshUser;
                    this.updateAuthUI();
                } else {
                    // User no longer exists or is inactive, clear session
                    localStorage.removeItem('pagePixelSession');
                }
            }
        } catch (error) {
            console.error('Auth initialization failed:', error);
            // Clear invalid session
            localStorage.removeItem('pagePixelSession');
        }
        
        this.isInitialized = true;
    }
    
    static async handleSignUp(event) {
        event.preventDefault();
        
        const form = event.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const errorDiv = document.getElementById('signUpError');
        
        try {
            this.setLoading(submitBtn, true);
            errorDiv.style.display = 'none';
            
            // Get form data
            const name = document.getElementById('signUpName').value.trim();
            const email = document.getElementById('signUpEmail').value.trim().toLowerCase();
            const password = document.getElementById('signUpPassword').value;
            const confirmPassword = document.getElementById('signUpConfirm').value;
            const agreeTerms = document.getElementById('signUpTerms').checked;
            
            // Validate inputs
            if (!name || name.length < 2) {
                throw new Error('Please enter a valid name');
            }
            
            if (!email || !this.isValidEmail(email)) {
                throw new Error('Please enter a valid email address');
            }
            
            if (!password || password.length < 8) {
                throw new Error('Password must be at least 8 characters long');
            }
            
            if (password !== confirmPassword) {
                throw new Error('Passwords do not match');
            }
            
            if (!agreeTerms) {
                throw new Error('Please agree to the terms and conditions');
            }
            
            // Create user via API
            const user = await UserDatabase.createUser({
                name: name,
                email: email,
                password: password
            });
            
            // Store user session
            await UserDatabase.createSession(user);
            this.currentUser = user;
            
            // Show success and redirect
            this.showNotification('Account created successfully! Welcome to Page & Pixel Designs.');
            this.closeAuthModal();
            this.updateAuthUI();
            
            // Redirect to admin if we're not already there
            setTimeout(() => {
                if (window.location.pathname !== '/admin/') {
                    window.location.href = '/admin/';
                }
            }, 1500);
            
        } catch (error) {
            console.error('Sign up error:', error);
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        } finally {
            this.setLoading(submitBtn, false);
        }
    }
    
    static async handleSignIn(event) {
        event.preventDefault();
        
        const form = event.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const errorDiv = document.getElementById('signInError');
        
        try {
            this.setLoading(submitBtn, true);
            errorDiv.style.display = 'none';
            
            // Get form data
            const email = document.getElementById('signInEmail').value.trim().toLowerCase();
            const password = document.getElementById('signInPassword').value;
            
            // Validate inputs
            if (!email || !this.isValidEmail(email)) {
                throw new Error('Please enter a valid email address');
            }
            
            if (!password) {
                throw new Error('Please enter your password');
            }
            
            // Authenticate user via API
            const result = await UserDatabase.authenticateUser(email, password);
            const user = result.user;
            
            // Store user session
            await UserDatabase.createSession(user);
            this.currentUser = user;
            
            // Show success and redirect
            this.showNotification('Welcome back! Redirecting to your dashboard...');
            this.closeAuthModal();
            this.updateAuthUI();
            
            // Redirect to admin if we're not already there
            setTimeout(() => {
                if (window.location.pathname !== '/admin/') {
                    window.location.href = '/admin/';
                }
            }, 1500);
            
        } catch (error) {
            console.error('Sign in error:', error);
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        } finally {
            this.setLoading(submitBtn, false);
        }
    }
    
    static async logout() {
        try {
            // Get current session
            const sessionData = localStorage.getItem('pagePixelSession');
            if (sessionData) {
                // Note: In this simplified version, we just clear localStorage
                // In a full implementation, you'd also invalidate the server session
                await UserDatabase.destroySession(null);
            }
            
            this.currentUser = null;
            this.updateAuthUI();
            this.showNotification('You have been signed out successfully.');
            
            // Redirect to home if on admin page
            if (window.location.pathname === '/admin/') {
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            }
            
        } catch (error) {
            console.error('Logout error:', error);
            // Force logout anyway
            localStorage.removeItem('pagePixelSession');
            this.currentUser = null;
            this.updateAuthUI();
        }
    }
    
    static getCurrentUser() {
        return this.currentUser;
    }
    
    static isAuthenticated() {
        return this.currentUser !== null;
    }
    
    // UI Management Methods
    static showAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.classList.add('active');
            this.switchToSignIn(); // Default to sign in
        }
    }
    
    static closeAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.classList.remove('active');
            this.clearForms();
        }
    }
    
    static switchToSignIn() {
        document.getElementById('signInForm').classList.add('active');
        document.getElementById('signUpForm').classList.remove('active');
        this.clearErrors();
    }
    
    static switchToSignUp() {
        document.getElementById('signUpForm').classList.add('active');
        document.getElementById('signInForm').classList.remove('active');
        this.clearErrors();
    }
    
    static clearForms() {
        document.querySelectorAll('.auth-form input').forEach(input => {
            input.value = '';
        });
        document.getElementById('signUpTerms').checked = false;
        this.clearErrors();
    }
    
    static clearErrors() {
        document.querySelectorAll('.auth-error').forEach(error => {
            error.style.display = 'none';
        });
    }
    
    static setLoading(button, isLoading) {
        const textSpan = button.querySelector('.btn-text');
        const spinnerSpan = button.querySelector('.btn-spinner');
        
        if (isLoading) {
            button.disabled = true;
            textSpan.style.display = 'none';
            spinnerSpan.style.display = 'inline';
        } else {
            button.disabled = false;
            textSpan.style.display = 'inline';
            spinnerSpan.style.display = 'none';
        }
    }
    
    static updateAuthUI() {
        // Update navigation auth link
        const authNavItem = document.getElementById('authNavItem');
        if (authNavItem) {
            if (this.currentUser) {
                authNavItem.innerHTML = `
                    <a href="/admin/" class="auth-nav-link">
                        <span class="auth-user-indicator">👤</span>
                        Dashboard
                    </a>
                `;
            } else {
                authNavItem.innerHTML = `
                    <a href="#" onclick="AuthSystem.showAuthModal(); return false;" class="auth-nav-link">
                        <span class="auth-user-indicator">🔑</span>
                        Sign In
                    </a>
                `;
            }
        }
    }
    
    static showNotification(message, type = 'success') {
        const notification = document.getElementById('authNotification');
        if (notification) {
            const messageSpan = notification.querySelector('.notification-message');
            messageSpan.textContent = message;
            
            notification.classList.add('show');
            
            setTimeout(() => {
                notification.classList.remove('show');
            }, 4000);
        }
    }
    
    // Utility Methods
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Session validation for protected pages
    static async requireAuth() {
        await this.initialize();
        
        if (!this.isAuthenticated()) {
            this.showAuthModal();
            return false;
        }
        
        return true;
    }
    
    // Redirect to admin after successful auth
    static redirectToAdmin() {
        if (window.location.pathname !== '/admin/') {
            window.location.href = '/admin/';
        }
    }
}

// Auto-initialize when script loads
document.addEventListener('DOMContentLoaded', function() {
    AuthSystem.initialize();
});

// Make AuthSystem globally available
window.AuthSystem = AuthSystem;
window.UserDatabase = UserDatabase;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthSystem, UserDatabase };
}
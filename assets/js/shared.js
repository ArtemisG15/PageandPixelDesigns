// Page and Pixel Designs - Shared JavaScript Functions

// Mobile menu toggle functionality
function toggleMobileMenu() {
    const navLinks = document.getElementById('navLinks');
    navLinks.classList.toggle('active');
}

// Set active navigation link based on current page
function setActiveNavLink() {
    const currentPage = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        
        // Check if the link href matches current page
        const linkPath = new URL(link.href).pathname;
        if (linkPath === currentPage || 
            (currentPage === '/' && link.href.includes('index.html')) ||
            (currentPage.includes('/index.html') && linkPath === currentPage.replace('/index.html', '/'))) {
            link.classList.add('active');
        }
    });
}

// Close mobile menu when clicking on a link
function closeMobileMenuOnClick() {
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            document.getElementById('navLinks').classList.remove('active');
        });
    });
}

// Initialize animations on scroll
function initializeScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    // Observe elements with animation classes
    document.querySelectorAll('.fade-in-element').forEach(el => {
        observer.observe(el);
    });
}

// Smooth scrolling for anchor links
function initializeSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Initialize all shared functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setActiveNavLink();
    closeMobileMenuOnClick();
    initializeScrollAnimations();
    initializeSmoothScrolling();
});

// Utility functions for forms
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? 'var(--secondary-blue)' : '#e74c3c'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
}

// Loading state utility
function setLoadingState(element, isLoading) {
    if (isLoading) {
        element.style.opacity = '0.7';
        element.style.pointerEvents = 'none';
        element.textContent = 'Loading...';
    } else {
        element.style.opacity = '1';
        element.style.pointerEvents = 'auto';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        const navLinks = document.getElementById('navLinks');
        if (navLinks && !document.getElementById('authNavItem')) {
            const authItem = document.createElement('li');
            authItem.id = 'authNavItem';
            
            const currentUser = AuthSystem.getCurrentUser();
            if (currentUser) {
                // User is signed in - show Dashboard link
                authItem.innerHTML = `
                    <a href="/admin/" class="auth-nav-link">
                        <span class="auth-user-indicator">👤</span>
                        Dashboard
                    </a>
                `;
            } else {
                // User not signed in - show subtle Author Login link
                authItem.innerHTML = `
                    <a href="#" onclick="AuthSystem.showAuthModal(); return false;" class="auth-nav-link">
                        Author Login
                    </a>
                `;
            }
            
            navLinks.appendChild(authItem);
        }
    }, 100);
});

// Fix for form field validation states
function initializeAuthFormHandling() {
    // Add touched class to inputs when user interacts
    document.querySelectorAll('.auth-form input').forEach(input => {
        input.addEventListener('blur', function() {
            this.classList.add('touched');
        });
        
        input.addEventListener('input', function() {
            this.classList.add('touched');
        });
    });
}

// Clear form states when modal opens
function clearAuthFormStates() {
    document.querySelectorAll('.auth-form input').forEach(input => {
        input.classList.remove('touched');
        input.value = '';
        // Clear any validation states
        input.setCustomValidity('');
    });
    
    // Clear any error messages
    document.querySelectorAll('.auth-error').forEach(error => {
        error.style.display = 'none';
    });
}

// Override the AuthSystem.showAuthModal to clear states
document.addEventListener('DOMContentLoaded', function() {
    // Initialize form handling
    initializeAuthFormHandling();
    
    // Hook into auth modal opening
    const originalShowModal = window.AuthSystem?.showAuthModal;
    if (originalShowModal) {
        window.AuthSystem.showAuthModal = function() {
            originalShowModal.call(this);
            setTimeout(clearAuthFormStates, 50);
        };
    }
});

function initializeAuthFormValidation() {
    document.addEventListener('input', function(e) {
        if (e.target.matches('.auth-form input')) {
            e.target.classList.add('touched');
        }
    });
    
    document.addEventListener('blur', function(e) {
        if (e.target.matches('.auth-form input')) {
            e.target.classList.add('touched');
        }
    }, true);
    
    // Handle form submission attempts
    document.addEventListener('submit', function(e) {
        if (e.target.closest('.auth-form')) {
            e.target.closest('.auth-form').classList.add('submitted');
        }
    });
    
    // Clear states when modal opens
    document.addEventListener('click', function(e) {
        if (e.target.matches('[onclick*="showAuthModal"]') || e.target.closest('[onclick*="showAuthModal"]')) {
            setTimeout(() => {
                // Clear all form states
                document.querySelectorAll('.auth-form').forEach(form => {
                    form.classList.remove('submitted');
                });
                
                document.querySelectorAll('.auth-form input').forEach(input => {
                    input.classList.remove('touched');
                    input.value = '';
                });
                
                document.querySelectorAll('.auth-error').forEach(error => {
                    error.style.display = 'none';
                });
            }, 100);
        }
    });
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', initializeAuthFormValidation);

// Handle redirect from admin page needing auth
document.addEventListener('DOMContentLoaded', function() {
    // Check if redirected from admin needing auth
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('needsAuth') === 'true') {
        setTimeout(() => {
            if (typeof AuthSystem !== 'undefined') {
                AuthSystem.showAuthModal();
            }
        }, 500);
        
        // Clean up URL
        if (window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
});
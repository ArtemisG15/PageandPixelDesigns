// Page and Pixel Designs - Contact Page with Spam Protection

// Spam protection variables
let pageLoadTime = Date.now();
let submissionAttempts = 0;
let captchaAnswer = 0;

// Initialize spam protection
function initializeSpamProtection() {
    // Set page load timestamp
    document.getElementById('formTimestamp').value = pageLoadTime;
    
    // Generate math captcha
    generateMathCaptcha();
    
    // Check submission rate limiting
    checkSubmissionLimits();
    
    // Monitor form interaction
    monitorFormInteraction();
}

// Generate simple math captcha
function generateMathCaptcha() {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    captchaAnswer = num1 + num2;
    
    document.getElementById('captchaQuestion').textContent = 
        `What is ${num1} + ${num2}? (This helps us prevent spam)`;
}

// Check submission rate limiting
function checkSubmissionLimits() {
    const submissions = JSON.parse(localStorage.getItem('contactSubmissions') || '[]');
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    // Filter submissions from last hour
    const recentSubmissions = submissions.filter(time => time > oneHourAgo);
    
    if (recentSubmissions.length >= 3) {
        showNotification('Too many submissions. Please wait before trying again.', 'error');
        document.getElementById('submitBtn').disabled = true;
        return false;
    }
    
    // Clean old submissions
    localStorage.setItem('contactSubmissions', JSON.stringify(recentSubmissions));
    return true;
}

// Monitor form interaction for behavioral analysis
function monitorFormInteraction() {
    let interactions = 0;
    const form = document.getElementById('contactForm');
    
    form.addEventListener('input', () => {
        interactions++;
    });
    
    form.addEventListener('focus', () => {
        interactions++;
    }, true);
    
    // Store interaction data
    form.dataset.interactions = interactions;
}

// Validate form with spam checks
function validateFormWithSpamChecks() {
    const form = document.getElementById('contactForm');
    let isValid = true;
    
    // Check honeypot
    if (form.querySelector('[name="_gotcha"]').value !== '') {
        console.log('Honeypot triggered');
        return false;
    }
    
    // Check time on page (minimum 3 seconds)
    const timeOnPage = Date.now() - pageLoadTime;
    if (timeOnPage < 3000) {
        showNotification('Please spend a moment reviewing the form before submitting.', 'error');
        return false;
    }
    
    // Validate captcha
    const userAnswer = parseInt(document.getElementById('captchaAnswer').value);
    if (userAnswer !== captchaAnswer) {
        showError('captchaAnswer', 'Please solve the math problem correctly');
        return false;
    }
    
    // Check message length and content
    const message = document.getElementById('message').value.trim();
    if (message.length < 20) {
        showError('message', 'Please provide more details about your project (minimum 20 characters)');
        return false;
    }
    
    // Check for excessive links (more than 2 URLs)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = message.match(urlRegex) || [];
    if (urls.length > 2) {
        showError('message', 'Too many links detected. Please limit links in your message.');
        return false;
    }
    
    // Check for spam keywords
    const spamKeywords = ['seo', 'marketing', 'crypto', 'bitcoin', 'loan', 'casino', 'viagra', 'casino'];
    const lowerMessage = message.toLowerCase();
    const hasSpamKeywords = spamKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (hasSpamKeywords) {
        showError('message', 'Your message contains flagged content. Please revise and try again.');
        return false;
    }
    
    // Validate required fields
    const requiredFields = form.querySelectorAll('[required]');
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            showError(field.id, 'This field is required');
            isValid = false;
        }
    });
    
    // Email validation
    const email = document.getElementById('email').value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
        showError('email', 'Please enter a valid email address');
        isValid = false;
    }
    
    return isValid;
}

// Show field error
function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const formGroup = field.closest('.form-group');
    const errorMessage = formGroup.querySelector('.error-message');
    
    formGroup.classList.add('error');
    if (errorMessage) {
        errorMessage.textContent = message;
    }
    
    // Remove error on input
    field.addEventListener('input', function() {
        formGroup.classList.remove('error');
    }, { once: true });
}

// Handle form submission
async function handleFormSubmission(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    // Clear any existing errors
    document.querySelectorAll('.form-group').forEach(group => {
        group.classList.remove('error');
    });
    
    // Validate form with spam checks
    if (!validateFormWithSpamChecks()) {
        return;
    }
    
    // Check rate limiting again
    if (!checkSubmissionLimits()) {
        return;
    }
    
    // Show loading state
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline-block';
    
    try {
        // Set time on page
        document.getElementById('timeOnPage').value = Date.now() - pageLoadTime;
        
        // Add package summary if present
        const packageData = sessionStorage.getItem('packageSummary');
        if (packageData) {
            document.getElementById('packageSummaryField').value = packageData;
        }
        
        // Submit to Formspree
        const response = await fetch(form.action, {
            method: 'POST',
            body: new FormData(form),
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            // Record successful submission
            const submissions = JSON.parse(localStorage.getItem('contactSubmissions') || '[]');
            submissions.push(Date.now());
            localStorage.setItem('contactSubmissions', JSON.stringify(submissions));
            
            // Clear form and show success
            form.reset();
            generateMathCaptcha(); // New captcha for next use
            showSuccessModal();
            
            // Hide package summary if shown
            const packageSummary = document.getElementById('packageSummary');
            if (packageSummary.style.display !== 'none') {
                packageSummary.style.opacity = '0';
                setTimeout(() => {
                    packageSummary.style.display = 'none';
                }, 300);
            }
        } else {
            throw new Error('Form submission failed');
        }
        
    } catch (error) {
        console.error('Form submission error:', error);
        showNotification('There was an error sending your inquiry. Please try again or contact us directly.', 'error');
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        btnText.style.display = 'inline-block';
        btnLoading.style.display = 'none';
    }
}

// Show success modal
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.classList.add('active');
    
    // Add click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeSuccessModal();
        }
    });
    
    // Add escape key listener
    document.addEventListener('keydown', handleSuccessModalEscape);
}

// Close success modal
function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.classList.remove('active');
    
    // Remove event listeners
    document.removeEventListener('keydown', handleSuccessModalEscape);
}

// Handle escape key for success modal
function handleSuccessModalEscape(e) {
    if (e.key === 'Escape') {
        closeSuccessModal();
    }
}

// Load package summary from services page
function loadPackageSummary() {
    const packageData = sessionStorage.getItem('packageSummary');
    const selectedTheme = sessionStorage.getItem('selectedTheme');
    
    if (packageData) {
        try {
            const data = JSON.parse(packageData);
            displayPackageSummary(data);
        } catch (e) {
            console.log('Error parsing package data:', e);
        }
    } else if (selectedTheme) {
        // Just theme selected, create minimal package
        const data = {
            total: 50,
            theme: selectedTheme,
            features: [],
            support: 'handover'
        };
        displayPackageSummary(data);
    }
}

// Display package summary
function displayPackageSummary(data) {
    const summarySection = document.getElementById('packageSummary');
    const themeElement = document.getElementById('selectedTheme');
    const featuresElement = document.getElementById('selectedFeatures');
    const supportElement = document.getElementById('selectedSupport');
    const totalElement = document.getElementById('packageTotal');
    
    // Theme names mapping
    const themeNames = {
        fantasy: 'High Fantasy',
        romance: 'Romance',
        apocalypse: 'Apocalypse',
        steampunk: 'Steampunk',
        drama: 'Contemporary Drama'
    };
    
    // Display theme
    themeElement.textContent = themeNames[data.theme] || 'Custom Theme';
    
    // Display features
    let featuresText = 'Base website';
    if (data.features && data.features.length > 0) {
        const featureNames = {
            blog: 'Blog System',
            newsletter: 'Newsletter Signup',
            gallery: 'Photo Gallery',
            ecommerce: 'Direct Book Sales',
            events: 'Events Calendar',
            testimonials: 'Reader Reviews'
        };
        
        const selectedFeatureNames = data.features.map(f => featureNames[f]).filter(Boolean);
        if (selectedFeatureNames.length > 0) {
            featuresText += ', ' + selectedFeatureNames.join(', ');
        }
    }
    featuresElement.textContent = featuresText;
    
    // Display support
    const supportText = data.support === 'maintenance' ? '$5/month support' : 'Complete handover';
    supportElement.textContent = supportText;
    
    // Display total
    totalElement.textContent = `$${data.total}`;
    
    // Show the summary section
    summarySection.style.display = 'block';
    
    // Add animation
    setTimeout(() => {
        summarySection.style.opacity = '0';
        summarySection.style.transform = 'translateY(20px)';
        summarySection.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        
        setTimeout(() => {
            summarySection.style.opacity = '1';
            summarySection.style.transform = 'translateY(0)';
        }, 100);
    }, 200);
}

// Utility function for notifications
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
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
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Mobile menu toggle (from shared.js)
function toggleMobileMenu() {
    const navLinks = document.getElementById('navLinks');
    navLinks.classList.toggle('active');
}

// Initialize everything
document.addEventListener('DOMContentLoaded', function() {
    // Load package summary if coming from services
    loadPackageSummary();
    
    // Initialize spam protection
    initializeSpamProtection();
    
    // Add form submit handler
    document.getElementById('contactForm').addEventListener('submit', handleFormSubmission);
    
    // Add loaded class to body
    document.body.classList.add('loaded');
});

// Make functions globally available
window.closeSuccessModal = closeSuccessModal;
window.toggleMobileMenu = toggleMobileMenu;
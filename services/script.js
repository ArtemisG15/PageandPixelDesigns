// Services Page JavaScript - Enhanced with Stripe Integration
console.log('🚀 Services script loaded successfully!');

// Initialize Stripe (replace with your actual publishable key)
const stripe = Stripe('pk_test_51RkEd8Q0JlKj0BQFMX77ZkDvBOXuXTqSpz8e7ez3Xo2JJ0AwFlgrRp4wCX3jFHlU7pCyU7KMAZoUnpbYvf08WsPE00kMMpGbkB');

// Stripe Price IDs
const stripePriceIds = {
    baseWebsite: 'prod_SfbGzApoyTSajl',           
    testimonials: 'prod_SfbGib05MKhaRL',          
    worldbuilding: 'prod_SfbHkitLJX42Aw',        
    events: 'prod_SfbIZ6SO5fBomD',                      
    blog: 'prod_SfbIe4re6rb1Px',                          
    gallery: 'prod_SfbJN4f0ndLgID',                   
    ecommerce: 'prod_SfbKPxYqkEucPN',                
    monthlySupport: 'prod_SfbKDxgj1KrAvA'      
};

let packageState = {
    total: 50,
    theme: null,
    features: [],
    support: 'handover',
    includeBase: true  // Base website included by default
};

// Save to localStorage instead of sessionStorage for persistence
function saveState() {
    localStorage.setItem('pagePixelPackage', JSON.stringify(packageState));
    console.log('💾 State saved:', packageState);
}

// Load from localStorage
function loadState() {
    const saved = localStorage.getItem('pagePixelPackage');
    if (saved) {
        try {
            const loadedState = JSON.parse(saved);
            packageState = {
                total: loadedState.total || 50,
                theme: loadedState.theme,
                features: loadedState.features || [],
                support: loadedState.support || 'handover',
                includeBase: loadedState.includeBase !== undefined ? loadedState.includeBase : true
            };
            console.log('📥 State loaded:', packageState);
            return true;
        } catch (e) {
            console.error('❌ Error loading state:', e);
        }
    }
    console.log('📭 No saved state found');
    return false;
}

// Check for pre-selected theme from themes page
function checkPreSelectedTheme() {
    // Check multiple possible storage locations
    const themeFromSession = sessionStorage.getItem('selectedTheme') || 
                             sessionStorage.getItem('pagePixelSelectedTheme') ||
                             localStorage.getItem('selectedTheme');
    
    if (themeFromSession) {
        console.log('🎨 Pre-selected theme found:', themeFromSession);
        
        // Clear session storage so it doesn't persist beyond this page load
        sessionStorage.removeItem('selectedTheme');
        sessionStorage.removeItem('pagePixelSelectedTheme');
        localStorage.removeItem('selectedTheme'); // Also clear from localStorage if set by demo
        
        return themeFromSession;
    }
    
    return null;
}

// Update price display
function updatePrice() {
    const maxPrice = 200;
    const displayTotal = Math.min(packageState.total, maxPrice);
    
    const priceElement = document.getElementById('totalPrice');
    const finalPayAmountElement = document.getElementById('finalPayAmount');
    
    if (priceElement) priceElement.textContent = `${displayTotal}`;
    if (finalPayAmountElement) finalPayAmountElement.textContent = `${displayTotal}`;
    
    // Enable/disable payment buttons in the final CTA section only
    const payButtons = document.querySelectorAll('.primary-btn');
    payButtons.forEach(btn => {
        btn.disabled = !packageState.includeBase || packageState.total === 0;
        if (btn.disabled) {
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        } else {
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }
    });
    
    console.log('💰 Price updated:', displayTotal, 'Base included:', packageState.includeBase);
    saveState();
}

// Theme selection
function selectTheme(themeElement) {
    // Remove all selected classes
    document.querySelectorAll('.theme-option').forEach(t => t.classList.remove('selected'));
    
    // Add selected to clicked theme
    themeElement.classList.add('selected');
    packageState.theme = themeElement.dataset.theme;
    
    console.log('🎨 Theme selected:', packageState.theme);
    saveState();
}

// Base website toggle
function toggleBaseWebsite(element) {
    const checkbox = element.querySelector('input[type="checkbox"]');
    
    if (checkbox.checked) {
        // Include base website
        element.classList.add('selected');
        packageState.includeBase = true;
        console.log('✅ Base website selected');
    } else {
        // Remove base website (for returning customers)
        element.classList.remove('selected');
        packageState.includeBase = false;
        console.log('❌ Base website unselected');
    }
    
    // Recalculate total from scratch
    recalculateTotal();
    
    console.log('🏠 Base website toggled:', packageState.includeBase, 'New total:', packageState.total);
    updatePrice();
}

// Recalculate total from base + features
function recalculateTotal() {
    // Start with base website price or 0
    packageState.total = packageState.includeBase ? 50 : 0;
    console.log('🧮 Starting total (base):', packageState.total);
    
    // Add all selected features
    packageState.features.forEach(featureName => {
        const featureEl = document.querySelector(`[data-feature="${featureName}"]`);
        if (featureEl) {
            const price = parseInt(featureEl.dataset.price) || 0;
            packageState.total += price;
            console.log(`➕ Added feature ${featureName}: $${price}, running total: $${packageState.total}`);
        }
    });
    
    console.log('🧮 Final total recalculated:', packageState.total);
}

// Feature toggle (updated to work with base website)
function toggleFeature(element) {
    const checkbox = element.querySelector('input[type="checkbox"]');
    const featureName = element.dataset.feature;
    
    if (checkbox.checked) {
        // Add feature
        element.classList.add('selected');
        if (!packageState.features.includes(featureName)) {
            packageState.features.push(featureName);
        }
    } else {
        // Remove feature
        element.classList.remove('selected');
        packageState.features = packageState.features.filter(f => f !== featureName);
    }
    
    // Recalculate total from scratch
    recalculateTotal();
    
    console.log('⚡ Feature toggled:', featureName, checkbox.checked);
    updatePrice();
}

// Support selection
function selectSupport(element) {
    document.querySelectorAll('.support-option').forEach(s => s.classList.remove('selected'));
    element.classList.add('selected');
    
    const radio = element.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
    
    packageState.support = element.dataset.support;
    console.log('🤝 Support selected:', packageState.support);
    saveState();
}

// Stripe Payment Integration
async function handlePayment() {
    if (!packageState.includeBase || packageState.total === 0) {
        showNotification('Please select the base website package to proceed with payment.', 'error');
        return;
    }
    
    console.log('💳 Processing payment for:', packageState);
    
    // Show payment modal
    showPaymentModal();
}

// Show payment modal with order summary
function showPaymentModal() {
    const modal = document.getElementById('paymentModal');
    const summaryDiv = document.getElementById('paymentSummary');
    
    // Build payment summary
    let summaryHTML = `
        <h4>Order Summary</h4>
        <div class="payment-items">
    `;
    
    if (packageState.includeBase) {
        summaryHTML += `
            <div class="payment-item">
                <span>Complete Author Website</span>
                <span>$50</span>
            </div>
        `;
    }
    
    // Add selected features
    packageState.features.forEach(feature => {
        const featureOption = document.querySelector(`[data-feature="${feature}"]`);
        if (featureOption) {
            const price = featureOption.dataset.price;
            const title = featureOption.querySelector('h4').textContent;
            
            summaryHTML += `
                <div class="payment-item">
                    <span>${title}</span>
                    <span>$${price}</span>
                </div>
            `;
        }
    });
    
    summaryHTML += `
        </div>
        <div class="payment-total">
            <strong>Total: $${Math.min(packageState.total, 200)}</strong>
        </div>
    `;
    
    if (packageState.support === 'maintenance') {
        summaryHTML += `
            <div class="support-note">
                <p><strong>Note:</strong> Monthly support ($5/month) will be set up as a separate subscription after your website is completed.</p>
            </div>
        `;
    }
    
    summaryDiv.innerHTML = summaryHTML;
    modal.classList.add('active');
    
    // Set up proceed button
    document.getElementById('proceedToStripe').onclick = () => proceedToStripeCheckout();
}

// Proceed to Stripe checkout
async function proceedToStripeCheckout() {
    try {
        console.log('🔄 Creating Stripe checkout session...');
        
        // Prepare line items for Stripe
        const lineItems = [];
        
        // Add base website if selected
        if (packageState.includeBase) {
            lineItems.push({
                price: stripePriceIds.baseWebsite,
                quantity: 1
            });
        }
        
        // Add selected features
        packageState.features.forEach(feature => {
            if (stripePriceIds[feature]) {
                lineItems.push({
                    price: stripePriceIds[feature],
                    quantity: 1
                });
            }
        });
        
        if (lineItems.length === 0) {
            throw new Error('No items selected for payment');
        }
        
        // Create Stripe Checkout Session
        const response = await fetch('/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                line_items: lineItems,
                mode: 'payment', // One-time payment
                success_url: `${window.location.origin}/services/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${window.location.origin}/services/`,
                metadata: {
                    package_data: JSON.stringify(packageState)
                }
            })
        });
        
        const session = await response.json();
        
        if (session.error) {
            throw new Error(session.error.message);
        }
        
        console.log('✅ Stripe session created, redirecting...');
        
        // Redirect to Stripe Checkout
        const { error } = await stripe.redirectToCheckout({
            sessionId: session.id
        });
        
        if (error) {
            throw error;
        }
        
    } catch (error) {
        console.error('❌ Payment error:', error);
        showNotification('There was an error processing your payment. Please try again.', 'error');
        closePaymentModal();
    }
}

// Close payment modal
function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
}

// Save order and go to consultation
function saveAndConsult() {
    console.log('💾 Saving order and redirecting to consultation...');
    
    // Save package data for contact form
    const summary = {
        total: Math.min(packageState.total, 200),
        theme: packageState.theme,
        features: packageState.features,
        support: packageState.support,
        includeBase: packageState.includeBase
    };
    
    sessionStorage.setItem('packageSummary', JSON.stringify(summary));
    if (packageState.theme) {
        sessionStorage.setItem('selectedTheme', packageState.theme);
    }
    
    console.log('📦 Package summary saved for contact:', summary);
    
    // Show confirmation message
    showNotification('Your order has been saved! Redirecting to consultation page...', 'success');
    
    // Navigate to contact page after short delay
    setTimeout(() => {
        window.location.href = '/contact/';
    }, 1500);
}

// Modal functions
function showStartOverModal() {
    const modal = document.getElementById('startOverModal');
    if (modal) {
        modal.classList.add('active');
        console.log('📋 Start over modal shown');
    }
}

function hideStartOverModal() {
    const modal = document.getElementById('startOverModal');
    if (modal) {
        modal.classList.remove('active');
        console.log('📋 Start over modal hidden');
    }
}

// Start over
function startOver() {
    console.log('🔄 Start over clicked');
    showStartOverModal();
}

// Confirm start over
function confirmStartOver() {
    console.log('✅ Start over confirmed');
    hideStartOverModal();
    
    // Reset state
    packageState = {
        total: 50,
        theme: null,
        features: [],
        support: 'handover',
        includeBase: true
    };
    
    // Clear UI
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
    
    // Clear storage
    localStorage.removeItem('pagePixelPackage');
    sessionStorage.removeItem('packageSummary');
    
    // Set defaults
    const firstTheme = document.querySelector('.theme-option');
    if (firstTheme) selectTheme(firstTheme);
    
    const handover = document.querySelector('[data-support="handover"]');
    if (handover) selectSupport(handover);
    
    // Select base website by default
    const baseElement = document.getElementById('baseWebsiteOption');
    const baseCheckbox = document.getElementById('baseWebsiteCheckbox');
    if (baseElement && baseCheckbox) {
        baseElement.classList.add('selected');
        baseCheckbox.checked = true;
        packageState.includeBase = true;
        console.log('✅ Base website selected by default after reset');
    }
    
    // Recalculate and update
    recalculateTotal();
    updatePrice();
    
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    console.log('✅ Reset complete');
}

// Cancel start over
function cancelStartOver() {
    console.log('❌ Start over cancelled');
    hideStartOverModal();
}

// Apply saved state to UI
function applyState() {
    console.log('🔧 Applying state to UI...');
    
    // Apply base website state
    const baseElement = document.getElementById('baseWebsiteOption');
    const baseCheckbox = document.getElementById('baseWebsiteCheckbox');
    if (baseElement && baseCheckbox) {
        if (packageState.includeBase) {
            baseElement.classList.add('selected');
            baseCheckbox.checked = true;
        } else {
            baseElement.classList.remove('selected');
            baseCheckbox.checked = false;
        }
        console.log('✅ Applied base website:', packageState.includeBase);
    }
    
    // Apply theme
    if (packageState.theme) {
        const themeEl = document.querySelector(`[data-theme="${packageState.theme}"]`);
        if (themeEl) {
            themeEl.classList.add('selected');
            console.log('✅ Applied theme:', packageState.theme);
        } else {
            console.warn('⚠️ Theme element not found:', packageState.theme);
        }
    }
    
    // Apply features
    packageState.features.forEach(feature => {
        const featureEl = document.querySelector(`[data-feature="${feature}"]`);
        if (featureEl) {
            const checkbox = featureEl.querySelector('input[type="checkbox"]');
            
            featureEl.classList.add('selected');
            if (checkbox) checkbox.checked = true;
            
            console.log('✅ Applied feature:', feature);
        }
    });
    
    // Apply support
    if (packageState.support) {
        const supportEl = document.querySelector(`[data-support="${packageState.support}"]`);
        if (supportEl) {
            supportEl.classList.add('selected');
            const radio = supportEl.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
            console.log('✅ Applied support:', packageState.support);
        }
    }
    
    // Recalculate total to make sure it's correct
    recalculateTotal();
    updatePrice();
}

// Initialize everything - FIXED VERSION
function init() {
    console.log('🎯 Initializing services page...');
    
    // STEP 1: Check for pre-selected theme from themes page or demo
    const preSelectedTheme = checkPreSelectedTheme();
    
    // STEP 2: Load any existing saved state
    const hasState = loadState();
    
    // STEP 3: If there's a pre-selected theme, override the loaded theme
    if (preSelectedTheme) {
        console.log('🎨 Applying pre-selected theme:', preSelectedTheme);
        packageState.theme = preSelectedTheme;
        
        // If no previous state existed, set up defaults
        if (!hasState) {
            packageState.includeBase = true;
            packageState.total = 50;
            console.log('🆕 New session with pre-selected theme');
        } else {
            console.log('🔄 Existing session with new theme selection');
        }
    } else if (!hasState) {
        // No pre-selected theme and no saved state - set up defaults
        console.log('🆕 Fresh start - setting defaults');
        packageState.includeBase = true;
        packageState.total = 50;
        
        // Select first available theme as default
        const firstTheme = document.querySelector('.theme-option');
        if (firstTheme) {
            packageState.theme = firstTheme.dataset.theme;
            console.log('🎨 Default theme selected:', packageState.theme);
        }
    }
    
    // STEP 4: Apply the final state to the UI
    applyState();
    
    // STEP 5: Set default support if not already set
    if (!packageState.support) {
        packageState.support = 'handover';
    }
    const handover = document.querySelector('[data-support="handover"]');
    if (handover && !handover.classList.contains('selected')) {
        selectSupport(handover);
    }
    
    // STEP 6: Final calculation and price update
    recalculateTotal();
    updatePrice();
    
    // STEP 7: Add event listeners
    addEventListeners();
    
    console.log('✅ Services page ready! Final state:', packageState);
}

// Add all event listeners
function addEventListeners() {
    // Base website toggle
    const baseWebsite = document.getElementById('baseWebsiteOption');
    if (baseWebsite) {
        baseWebsite.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox') {
                const checkbox = baseWebsite.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked;
            }
            toggleBaseWebsite(baseWebsite);
        });
        console.log('🏠 Base website toggle connected');
    }
    
    // Theme clicks
    document.querySelectorAll('.theme-option').forEach(theme => {
        theme.addEventListener('click', () => selectTheme(theme));
    });
    
    // Feature clicks
    document.querySelectorAll('.feature-option').forEach(feature => {
        feature.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox') {
                const checkbox = feature.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked;
            }
            toggleFeature(feature);
        });
    });
    
    // Support clicks
    document.querySelectorAll('.support-option').forEach(support => {
        support.addEventListener('click', (e) => {
            if (e.target.type !== 'radio') {
                const radio = support.querySelector('input[type="radio"]');
                radio.checked = true;
            }
            selectSupport(support);
        });
    });
    
    // Start over button
    const startBtn = document.getElementById('startOverBtn');
    if (startBtn) {
        startBtn.addEventListener('click', startOver);
        console.log('🔄 Start over button connected');
    } else {
        console.warn('⚠️ Start over button not found');
    }
    
    // Modal buttons
    const confirmBtn = document.getElementById('confirmStartOver');
    const cancelBtn = document.getElementById('cancelStartOver');
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmStartOver);
        console.log('✅ Confirm start over button connected');
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelStartOver);
        console.log('❌ Cancel start over button connected');
    }
    
    // Modal overlay click to close
    const modal = document.getElementById('startOverModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                cancelStartOver();
            }
        });
        console.log('📋 Modal overlay click listener connected');
    }
    
    // Payment modal overlay click to close
    const paymentModal = document.getElementById('paymentModal');
    if (paymentModal) {
        paymentModal.addEventListener('click', (e) => {
            if (e.target === paymentModal) {
                closePaymentModal();
            }
        });
    }
    
    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const startModal = document.getElementById('startOverModal');
            const payModal = document.getElementById('paymentModal');
            
            if (startModal && startModal.classList.contains('active')) {
                cancelStartOver();
            }
            if (payModal && payModal.classList.contains('active')) {
                closePaymentModal();
            }
        }
    });
    
    console.log('🔗 All event listeners added');
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

// Mobile menu toggle
function toggleMobileMenu() {
    const navLinks = document.getElementById('navLinks');
    navLinks.classList.toggle('active');
}

// Make functions globally available
window.handlePayment = handlePayment;
window.saveAndConsult = saveAndConsult;
window.closePaymentModal = closePaymentModal;
window.toggleMobileMenu = toggleMobileMenu;

// Start when page loads
document.addEventListener('DOMContentLoaded', init);

// Also start immediately if DOM is already loaded
if (document.readyState === 'loading') {
    console.log('⏳ Waiting for DOM...');
} else {
    console.log('⚡ DOM already ready, starting now');
    init();
}
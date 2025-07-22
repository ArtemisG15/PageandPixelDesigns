// Stripe Integration for Admin Panel
// Save as: assets/js/stripe-integration.js

class StripeIntegration {
    static stripe = null;
    static isInitialized = false;
    
    // Initialize Stripe with your publishable key
    static initialize() {
        if (this.isInitialized) return;
        
        // Replace with your actual Stripe publishable key
        const publishableKey = 'pk_test_51RkEd8Q0JlKj0BQFMX77ZkDvBOXuXTqSpz8e7ez3Xo2JJ0AwFlgrRp4wCX3jFHlU7pCyU7KMAZoUnpbYvf08WsPE00kMMpGbkB';
        
        if (typeof Stripe === 'undefined') {
            console.error('Stripe.js not loaded. Please include Stripe.js in your HTML.');
            return false;
        }
        
        this.stripe = Stripe(publishableKey);
        this.isInitialized = true;
        
        console.log('✅ Stripe initialized successfully');
        return true;
    }
    
    // Purchase a single feature
    static async purchaseFeature(priceId, metadata = {}) {
        if (!this.initialize()) {
            throw new Error('Stripe not initialized');
        }
        
        try {
            console.log('🛒 Initiating feature purchase:', priceId);
            
            const response = await fetch('/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mode: 'payment', // One-time payment for features
                    line_items: [{
                        price: priceId,
                        quantity: 1
                    }],
                    success_url: `${window.location.origin}/admin/?purchase=success&feature=${metadata.feature}`,
                    cancel_url: `${window.location.origin}/admin/?purchase=cancelled`,
                    customer_email: metadata.user_email,
                    metadata: {
                        type: 'feature_purchase',
                        feature: metadata.feature,
                        user_email: metadata.user_email
                    }
                })
            });
            
            const session = await response.json();
            
            if (session.error) {
                throw new Error(session.error.message);
            }
            
            console.log('✅ Checkout session created:', session.id);
            
            // Redirect to Stripe Checkout
            const { error } = await this.stripe.redirectToCheckout({
                sessionId: session.id
            });
            
            if (error) {
                throw error;
            }
            
            return { success: true, sessionId: session.id };
            
        } catch (error) {
            console.error('❌ Feature purchase error:', error);
            throw error;
        }
    }
    
    // Start support subscription
    static async startSupport(userEmail, trialDays = 0) {
        if (!this.initialize()) {
            throw new Error('Stripe not initialized');
        }
        
        try {
            console.log('🤝 Starting support subscription for:', userEmail);
            
            const response = await fetch('/create-subscription-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    lookup_key: 'monthly_support', // This should match your Stripe price lookup key
                    success_url: `${window.location.origin}/admin/?support=activated`,
                    cancel_url: `${window.location.origin}/admin/?support=cancelled`,
                    customer_email: userEmail,
                    trial_days: trialDays,
                    metadata: {
                        type: 'support_subscription',
                        user_email: userEmail
                    }
                })
            });
            
            const session = await response.json();
            
            if (session.error) {
                throw new Error(session.error.message);
            }
            
            console.log('✅ Subscription session created:', session.id);
            
            // Redirect to Stripe Checkout
            const { error } = await this.stripe.redirectToCheckout({
                sessionId: session.id
            });
            
            if (error) {
                throw error;
            }
            
            return { success: true, sessionId: session.id };
            
        } catch (error) {
            console.error('❌ Support subscription error:', error);
            throw error;
        }
    }
    
    // Open Stripe Customer Portal for billing management
    static async openCustomerPortal(returnUrl = null) {
        try {
            // Get the current user's Stripe customer ID
            const currentUser = AuthSystem.getCurrentUser();
            if (!currentUser || !currentUser.stripeCustomerId) {
                throw new Error('No customer ID found. Please contact support.');
            }
            
            console.log('🔐 Opening customer portal for:', currentUser.stripeCustomerId);
            
            const response = await fetch('/create-portal-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    customer_id: currentUser.stripeCustomerId,
                    return_url: returnUrl || `${window.location.origin}/admin/`
                })
            });
            
            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error.message);
            }
            
            console.log('✅ Customer portal session created');
            
            // Redirect to Stripe Customer Portal
            window.location.href = result.url;
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Customer portal error:', error);
            throw error;
        }
    }
    
    // Handle successful payments/subscriptions
    static async handlePaymentSuccess(sessionId, type) {
        try {
            console.log('🎉 Handling payment success:', sessionId, type);
            
            // Retrieve session details
            const response = await fetch(`/checkout-session/${sessionId}`);
            const session = await response.json();
            
            if (response.ok && session) {
                // Update local user data based on payment type
                if (type === 'feature') {
                    await this.activateFeature(session);
                } else if (type === 'support') {
                    await this.activateSupport(session);
                }
                
                return { success: true, session };
            } else {
                throw new Error('Failed to retrieve payment session');
            }
            
        } catch (error) {
            console.error('❌ Payment success handling error:', error);
            throw error;
        }
    }
    
    // Activate purchased feature
    static async activateFeature(session) {
        try {
            const metadata = session.metadata;
            const feature = metadata.feature;
            const userEmail = metadata.user_email;
            
            if (!feature || !userEmail) {
                console.warn('⚠️ Missing metadata for feature activation');
                return;
            }
            
            console.log('✅ Activating feature:', feature, 'for user:', userEmail);
            
            // Update user's features in database
            const currentUser = AuthSystem.getCurrentUser();
            if (currentUser && currentUser.email === userEmail) {
                const updates = {
                    features: {
                        ...currentUser.features,
                        [feature]: {
                            purchased: true,
                            enabled: true,
                            purchasedAt: new Date().toISOString(),
                            stripeSessionId: session.id
                        }
                    }
                };
                
                await UserDatabase.updateUser(userEmail, updates);
                
                // Update current user object
                currentUser.features[feature] = updates.features[feature];
                
                console.log('✅ Feature activated successfully');
            }
            
        } catch (error) {
            console.error('❌ Feature activation error:', error);
        }
    }
    
    // Activate support subscription
    static async activateSupport(session) {
        try {
            const userEmail = session.customer_details?.email || session.metadata?.user_email;
            
            if (!userEmail) {
                console.warn('⚠️ Missing user email for support activation');
                return;
            }
            
            console.log('✅ Activating support for user:', userEmail);
            
            // Update user's support status in database
            const currentUser = AuthSystem.getCurrentUser();
            if (currentUser && currentUser.email === userEmail) {
                const updates = {
                    hasSupport: true,
                    stripeCustomerId: session.customer,
                    supportActivatedAt: new Date().toISOString(),
                    supportSessionId: session.id
                };
                
                await UserDatabase.updateUser(userEmail, updates);
                
                // Update current user object
                currentUser.hasSupport = true;
                currentUser.stripeCustomerId = session.customer;
                
                console.log('✅ Support activated successfully');
            }
            
        } catch (error) {
            console.error('❌ Support activation error:', error);
        }
    }
    
    // Check for URL parameters indicating payment results
    static checkPaymentResult() {
        const urlParams = new URLSearchParams(window.location.search);
        const purchase = urlParams.get('purchase');
        const support = urlParams.get('support');
        const sessionId = urlParams.get('session_id');
        const feature = urlParams.get('feature');
        
        if (purchase === 'success' && feature) {
            this.showPaymentSuccess(`${feature.charAt(0).toUpperCase() + feature.slice(1)} feature activated successfully!`);
            this.cleanUpUrl();
        } else if (purchase === 'cancelled') {
            this.showPaymentCancelled('Feature purchase was cancelled.');
            this.cleanUpUrl();
        } else if (support === 'activated') {
            this.showPaymentSuccess('Support subscription activated! You now have access to priority support.');
            this.cleanUpUrl();
        } else if (support === 'cancelled') {
            this.showPaymentCancelled('Support subscription was cancelled.');
            this.cleanUpUrl();
        } else if (sessionId) {
            // Generic session success
            this.showPaymentSuccess('Payment completed successfully!');
            this.cleanUpUrl();
        }
    }
    
    // Show payment success message
    static showPaymentSuccess(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: #48BB78;
            color: white;
            padding: 1rem 2rem;
            border-radius: 10px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.style.transform = 'translateX(0)', 100);
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 5000);
    }
    
    // Show payment cancelled message
    static showPaymentCancelled(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: #ED8936;
            color: white;
            padding: 1rem 2rem;
            border-radius: 10px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.style.transform = 'translateX(0)', 100);
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }
    
    // Clean up URL parameters
    static cleanUpUrl() {
        if (window.history && window.history.replaceState) {
            const url = new URL(window.location);
            url.searchParams.delete('purchase');
            url.searchParams.delete('support');
            url.searchParams.delete('session_id');
            url.searchParams.delete('feature');
            window.history.replaceState({}, document.title, url.toString());
        }
    }
    
    // Initialize and check for payment results when DOM loads
    static init() {
        this.initialize();
        this.checkPaymentResult();
    }
}

// Auto-initialize when script loads
document.addEventListener('DOMContentLoaded', function() {
    StripeIntegration.init();
});

// Make globally available
window.StripeIntegration = StripeIntegration;
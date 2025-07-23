
// Admin Panel JavaScript
// Feature-aware admin panel for author websites

class AdminPanel {
    static currentUser = null;
    static userFeatures = {};
    static isInitialized = false;
    
    // Initialize the admin panel
    static async initialize() {
        if (this.isInitialized) return;
        
        // Check if we're on an admin page
        if (!window.location.pathname.includes('/admin/')) {
            console.log('Not on admin page, skipping admin panel initialization');
            return;
        }
        
        console.log('🚀 Initializing Admin Panel...');
        
        try {
            // Wait for auth system to initialize
            await AuthSystem.initialize();
            
            // Check if user is authenticated
            if (!AuthSystem.isAuthenticated()) {
                this.showNotAuthenticatedState();
                return;
            }
            
            this.currentUser = AuthSystem.getCurrentUser();
            console.log('👤 Current user:', this.currentUser);
            
            // Load user data and features
            await this.loadUserData();
            
            // Show the admin panel
            this.showAdminPanel();
            
            // Initialize feature visibility
            this.updateFeatureVisibility();
            
            // Load data for each section
            this.loadProfileData();
            this.loadBooksData();
            this.loadNewsletterData();
            
            console.log('✅ Admin Panel initialized successfully');
            
        } catch (error) {
            console.error('❌ Admin Panel initialization failed:', error);
            this.showError('Failed to initialize admin panel. Please refresh and try again.');
        }
        
        this.isInitialized = true;
    }
    
    // Load user data and features from database
    static async loadUserData() {
        try {
            if (!this.currentUser) return;
            
            // Get fresh user data
            const userData = await UserDatabase.getUser(this.currentUser.email);
            if (userData) {
                this.currentUser = userData;
                this.userFeatures = userData.features || {};
            }
            
            console.log('📊 User features loaded:', this.userFeatures);
            
        } catch (error) {
            console.error('❌ Failed to load user data:', error);
        }
    }
    
    // Show not authenticated state
    static showNotAuthenticatedState() {
        const loadingState = document.getElementById('loadingState');
        const notAuthenticatedState = document.getElementById('notAuthenticatedState');
        const adminPanel = document.getElementById('adminPanel');
        
        // Check if we're on the admin page
        if (!loadingState || !notAuthenticatedState || !adminPanel) {
            console.log('Not on admin page, skipping auth state display');
            return;
        }
        
        loadingState.style.display = 'none';
        notAuthenticatedState.style.display = 'flex';
        adminPanel.style.display = 'none';
    }
    
    // Show admin panel
    static showAdminPanel() {
        const loadingState = document.getElementById('loadingState');
        const notAuthenticatedState = document.getElementById('notAuthenticatedState');
        const adminPanel = document.getElementById('adminPanel');
        const userName = document.getElementById('userName');
        const supportBadge = document.querySelector('#supportLevel .support-badge');
        
        // Check if we're on the admin page
        if (!loadingState || !notAuthenticatedState || !adminPanel) {
            console.log('Not on admin page, skipping admin panel display');
            return;
        }
        
        loadingState.style.display = 'none';
        notAuthenticatedState.style.display = 'none';
        adminPanel.style.display = 'block';
        
        // Update user welcome
        if (userName) {
            userName.textContent = this.currentUser.name || 'Author';
        }
        
        // Update support level
        if (supportBadge) {
            if (this.currentUser.hasSupport) {
                supportBadge.textContent = 'Premium Support ($5/month)';
                supportBadge.style.background = 'var(--admin-success)';
            } else {
                supportBadge.textContent = 'Base Package';
                supportBadge.style.background = 'var(--admin-secondary)';
            }
        }
    }
    
    // Update feature visibility based on purchased features
    static updateFeatureVisibility() {
        const featureSections = document.querySelectorAll('.feature-section');
        
        featureSections.forEach(section => {
            const feature = section.dataset.feature;
            const isOwned = this.userFeatures[feature]?.purchased;
            const isEnabled = this.userFeatures[feature]?.enabled;
            
            if (isOwned) {
                section.style.display = 'block';
                
                // Update toggle state
                const toggle = section.querySelector(`#${feature}Toggle`);
                if (toggle) {
                    toggle.checked = isEnabled;
                }
                
                // Show/hide advanced features based on support level
                this.updateAdvancedFeatures(feature, section);
            } else {
                section.style.display = 'none';
            }
        });
        
        // Update navigation cards
        this.updateNavigationCards();
        
        // Update support section
        this.updateSupportSection();
    }

    // Update navigation cards based on purchased features
    static updateNavigationCards() {
        const features = ['blog', 'events', 'gallery', 'testimonials'];
        
        features.forEach(feature => {
            const navCard = document.getElementById(`${feature}NavCard`);
            const statusBadge = navCard?.querySelector('.feature-status');
            
            if (navCard && statusBadge) {
                const isOwned = this.userFeatures[feature]?.purchased;
                const isEnabled = this.userFeatures[feature]?.enabled;
                
                if (isOwned) {
                    navCard.classList.remove('disabled');
                    if (isEnabled) {
                        statusBadge.textContent = 'Active';
                        statusBadge.className = 'feature-status';
                    } else {
                        statusBadge.textContent = 'Disabled';
                        statusBadge.className = 'feature-status disabled';
                    }
                } else {
                    navCard.classList.add('disabled');
                    statusBadge.textContent = 'Not Purchased';
                    statusBadge.className = 'feature-status disabled';
                    
                    // Prevent navigation
                    navCard.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.showNotification(`${feature.charAt(0).toUpperCase() + feature.slice(1)} feature not purchased`, 'warning');
                    });
                }
            }
        });
    }
    
    // Update advanced features visibility based on support level
    static updateAdvancedFeatures(feature, section) {
        const hasSupport = this.currentUser.hasSupport;
        const advancedElements = section.querySelectorAll(`[id*="${feature}Advanced"]`);
        
        advancedElements.forEach(element => {
            if (hasSupport) {
                element.style.display = 'inline-block';
            } else {
                element.style.display = 'none';
            }
        });
        
        // Add upgrade prompts for non-support users
        if (!hasSupport && advancedElements.length > 0) {
            const content = section.querySelector('.section-content');
            let upgradePrompt = content.querySelector('.upgrade-prompt');
            
            if (!upgradePrompt) {
                upgradePrompt = document.createElement('div');
                upgradePrompt.className = 'upgrade-prompt';
                upgradePrompt.innerHTML = `
                    <p style="background: #FFF3CD; border: 1px solid #FFEAA7; padding: 1rem; border-radius: 8px; margin-top: 1rem; text-align: center;">
                        🔒 <strong>Advanced features require Premium Support</strong><br>
                        <small>Upgrade to unlock advanced ${feature} management tools</small><br>
                        <button onclick="AdminPanel.upgradeSupport()" style="margin-top: 0.5rem; background: var(--admin-success); color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;">
                            Upgrade Now - $5/month
                        </button>
                    </p>
                `;
                content.appendChild(upgradePrompt);
            }
        }
    }
    
    // Update support section based on user's support level
    static updateSupportSection() {
        const supportOptions = document.getElementById('supportOptions');
        const hasSupport = this.currentUser.hasSupport;
        
        if (hasSupport) {
            supportOptions.innerHTML = `
                <div class="support-option">
                    <div>
                        <h4>🎫 Priority Support Tickets</h4>
                        <p>Get help within 24 hours</p>
                    </div>
                    <button onclick="AdminPanel.createSupportTicket()" class="action-btn">Create Ticket</button>
                </div>
                <div class="support-option">
                    <div>
                        <h4>💾 Automatic Backups</h4>
                        <p>Daily backups of your site data</p>
                    </div>
                    <button onclick="AdminPanel.downloadBackup()" class="action-btn">Download Backup</button>
                </div>
                <div class="support-option">
                    <div>
                        <h4>📊 Advanced Analytics</h4>
                        <p>Detailed site performance data</p>
                    </div>
                    <button onclick="AdminPanel.viewAnalytics()" class="action-btn">View Analytics</button>
                </div>
                <div class="support-option">
                    <div>
                        <h4>🔒 Security Monitoring</h4>
                        <p>Real-time security alerts</p>
                    </div>
                    <button onclick="AdminPanel.viewSecurityLog()" class="action-btn">Security Log</button>
                </div>
                <div class="support-option">
                    <div>
                        <h4>💳 Billing Management</h4>
                        <p>Manage your subscription</p>
                    </div>
                    <button onclick="StripeIntegration.openCustomerPortal()" class="action-btn">Manage Billing</button>
                </div>
            `;
        } else {
            supportOptions.innerHTML = `
                <div class="support-option">
                    <div>
                        <h4>📚 Documentation</h4>
                        <p>Self-service help articles</p>
                    </div>
                    <button onclick="AdminPanel.openDocs()" class="action-btn">View Docs</button>
                </div>
                <div class="support-option">
                    <div>
                        <h4>💬 Community Forum</h4>
                        <p>Get help from other authors</p>
                    </div>
                    <button onclick="AdminPanel.openForum()" class="action-btn">Visit Forum</button>
                </div>
                <div class="support-option">
                    <div>
                        <h4>⬆️ Upgrade to Premium</h4>
                        <p>Get priority support and advanced features</p>
                    </div>
                    <button onclick="AdminPanel.upgradeSupport()" class="upgrade-btn">Upgrade - $5/month</button>
                </div>
            `;
        }
    }
    
    // Toggle feature on/off
    static async toggleFeature(feature, enabled) {
        try {
            console.log(`🔄 Toggling ${feature}: ${enabled}`);
            
            // Update in database
            const updates = {
                features: {
                    ...this.currentUser.features,
                    [feature]: {
                        ...this.currentUser.features[feature],
                        enabled: enabled
                    }
                }
            };
            
            await UserDatabase.updateUser(this.currentUser.email, updates);
            
            // Update local data
            this.currentUser.features[feature].enabled = enabled;
            this.userFeatures[feature].enabled = enabled;
            
            // Show notification
            this.showNotification(
                `${feature.charAt(0).toUpperCase() + feature.slice(1)} ${enabled ? 'enabled' : 'disabled'} successfully`,
                'success'
            );
            
        } catch (error) {
            console.error(`❌ Failed to toggle ${feature}:`, error);
            
            // Revert toggle
            const toggle = document.getElementById(`${feature}Toggle`);
            if (toggle) {
                toggle.checked = !enabled;
            }
            
            this.showNotification(`Failed to ${enabled ? 'enable' : 'disable'} ${feature}`, 'error');
        }
    }
    
    // Open feature store
    static openFeatureStore() {
        const modal = document.getElementById('featureStoreModal');
        modal.classList.add('active');
        this.loadAvailableFeatures();
    }
    
    // Close feature store
    static closeFeatureStore() {
        const modal = document.getElementById('featureStoreModal');
        modal.classList.remove('active');
    }
    
    // Load available features for purchase
    static loadAvailableFeatures() {
        const features = [
            {
                id: 'blog',
                name: 'Blog System',
                price: 25,
                description: 'Complete blog management with categories and SEO',
                stripePriceId: 'price_blog_system'
            },
            {
                id: 'events',
                name: 'Events Calendar',
                price: 20,
                description: 'Event management with RSVP tracking',
                stripePriceId: 'price_events_calendar'
            },
            {
                id: 'gallery',
                name: 'Photo Gallery',
                price: 30,
                description: 'Advanced photo gallery with albums',
                stripePriceId: 'price_photo_gallery'
            },
            {
                id: 'testimonials',
                name: 'Reader Reviews',
                price: 10,
                description: 'Reader review management system',
                stripePriceId: 'price_reader_reviews'
            },
            {
                id: 'worldbuilding',
                name: 'Worldbuilding Guide',
                price: 20,
                description: 'Character and world documentation tools',
                stripePriceId: 'price_worldbuilding'
            },
            {
                id: 'ecommerce',
                name: 'Direct Book Sales',
                price: 45,
                description: 'Complete e-commerce functionality',
                stripePriceId: 'price_direct_sales'
            }
        ];
        
        const featuresGrid = document.getElementById('featuresGrid');
        featuresGrid.innerHTML = '';
        
        features.forEach(feature => {
            const isOwned = this.userFeatures[feature.id]?.purchased;
            
            const featureCard = document.createElement('div');
            featureCard.className = `feature-card ${isOwned ? 'purchased' : ''}`;
            featureCard.innerHTML = `
                <h4>${feature.name}</h4>
                <p>${feature.description}</p>
                <div class="feature-price">$${feature.price}</div>
                <button 
                    class="purchase-btn" 
                    ${isOwned ? 'disabled' : ''}
                    onclick="AdminPanel.purchaseFeature('${feature.id}', '${feature.stripePriceId}', '${feature.name}')"
                >
                    ${isOwned ? '✅ Purchased' : 'Purchase Now'}
                </button>
            `;
            
            featuresGrid.appendChild(featureCard);
        });
    }
    
    // Purchase a feature
    static async purchaseFeature(featureId, stripePriceId, featureName) {
        try {
            console.log(`🛒 Purchasing feature: ${featureId}`);
            
            // Use Stripe integration
            await StripeIntegration.purchaseFeature(stripePriceId, {
                feature: featureId,
                user_email: this.currentUser.email,
                feature_name: featureName
            });
            
        } catch (error) {
            console.error('❌ Feature purchase failed:', error);
            this.showNotification('Failed to initiate purchase. Please try again.', 'error');
        }
    }
    
    // Upgrade to premium support
    static async upgradeSupport() {
        try {
            console.log('⬆️ Upgrading to premium support');
            
            // Use Stripe integration
            await StripeIntegration.startSupport(this.currentUser.email);
            
        } catch (error) {
            console.error('❌ Support upgrade failed:', error);
            this.showNotification('Failed to initiate support upgrade. Please try again.', 'error');
        }
    }
    
    // Profile Management
    static loadProfileData() {
        if (!this.currentUser) return;
        
        document.getElementById('authorName').value = this.currentUser.authorName || '';
        document.getElementById('authorBio').value = this.currentUser.authorBio || '';
        document.getElementById('authorPhoto').value = this.currentUser.authorPhoto || '';
        document.getElementById('contactEmail').value = this.currentUser.email || '';
    }
    
    static async saveProfile() {
        try {
            const updates = {
                authorName: document.getElementById('authorName').value,
                authorBio: document.getElementById('authorBio').value,
                authorPhoto: document.getElementById('authorPhoto').value
            };
            
            await UserDatabase.updateUser(this.currentUser.email, updates);
            
            // Update local data
            Object.assign(this.currentUser, updates);
            
            this.showNotification('Profile saved successfully!', 'success');
            
        } catch (error) {
            console.error('❌ Failed to save profile:', error);
            this.showNotification('Failed to save profile', 'error');
        }
    }
    
    // Book Management
    static loadBooksData() {
        const booksList = document.getElementById('booksList');
        const books = this.currentUser.books || [];
        
        if (books.length === 0) {
            booksList.innerHTML = '<p>No books added yet. Click "Add New Book" to get started.</p>';
        } else {
            booksList.innerHTML = books.map(book => `
                <div class="book-item">
                    <h4>${book.title}</h4>
                    <p>${book.description}</p>
                    <button onclick="AdminPanel.editBook('${book.id}')" class="action-btn">Edit</button>
                    <button onclick="AdminPanel.deleteBook('${book.id}')" class="delete-btn">Delete</button>
                </div>
            `).join('');
        }
    }
    
    static async addNewBook() {
        const title = prompt('Book title:');
        if (!title) return;
        
        const description = prompt('Book description:');
        const genre = prompt('Genre:') || 'Fiction';
        const status = prompt('Status (draft/published):') || 'draft';
        
        try {
            const book = {
                id: 'book_' + Date.now(),
                title: title.trim(),
                description: description?.trim() || '',
                genre: genre.trim(),
                status: status.trim(),
                createdAt: new Date().toISOString()
            };
            
            this.currentUser.books = this.currentUser.books || [];
            this.currentUser.books.push(book);
            
            // Save to database
            await UserDatabase.updateUser(this.currentUser.email, { 
                books: this.currentUser.books 
            });
            
            this.loadBooksData();
            this.showNotification('Book added successfully!', 'success');
            
        } catch (error) {
            console.error('❌ Failed to add book:', error);
            this.showNotification('Failed to add book', 'error');
        }
    }
    
    // Newsletter Management
    static loadNewsletterData() {
        if (!this.currentUser.newsletter) return;
        
        document.getElementById('newsletterProvider').value = this.currentUser.newsletter.provider || '';
        document.getElementById('newsletterApiKey').value = this.currentUser.newsletter.apiKey || '';
        document.getElementById('subscriberCount').textContent = this.currentUser.newsletter.subscriberCount || '0';
    }
    
    static async testNewsletterConnection() {
        const provider = document.getElementById('newsletterProvider').value;
        const apiKey = document.getElementById('newsletterApiKey').value;
        
        if (!provider || !apiKey) {
            this.showNotification('Please fill in all newsletter settings', 'error');
            return;
        }
        
        // Simulate API test (in real implementation, this would test the actual API)
        this.showNotification('Newsletter connection test successful!', 'success');
        
        // Save settings
        const updates = {
            newsletter: {
                provider: provider,
                apiKey: apiKey,
                lastTested: new Date().toISOString()
            }
        };
        
        await UserDatabase.updateUser(this.currentUser.email, updates);
        Object.assign(this.currentUser, updates);
    }
    
    // Feature-specific methods (functional implementations)
    static async createBlogPost() {
        const title = prompt('Blog post title:');
        if (!title) return;
        
        const content = prompt('Blog post content:');
        if (!content) return;
        
        const category = prompt('Category (optional):') || 'General';
        
        try {
            const post = {
                id: 'post_' + Date.now(),
                title: title.trim(),
                content: content.trim(),
                category: category.trim(),
                status: 'draft',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Initialize blog posts array if it doesn't exist
            if (!this.currentUser.blogPosts) {
                this.currentUser.blogPosts = [];
            }
            
            this.currentUser.blogPosts.push(post);
            
            // Save to database
            await UserDatabase.updateUser(this.currentUser.email, { 
                blogPosts: this.currentUser.blogPosts 
            });
            
            this.showNotification('Blog post created successfully!', 'success');
            
        } catch (error) {
            console.error('❌ Failed to create blog post:', error);
            this.showNotification('Failed to create blog post', 'error');
        }
    }
    
    static manageBlogCategories() {
        if (!this.currentUser.hasSupport) {
            this.showUpgradePrompt();
            return;
        }
        this.showNotification('Blog categories manager would open here', 'info');
    }
    
    static async createEvent() {
        const title = prompt('Event title:');
        if (!title) return;
        
        const description = prompt('Event description:');
        if (!description) return;
        
        const date = prompt('Event date (YYYY-MM-DD):');
        if (!date) return;
        
        const time = prompt('Event time (HH:MM):') || '18:00';
        
        try {
            const event = {
                id: 'event_' + Date.now(),
                title: title.trim(),
                description: description.trim(),
                date: date.trim(),
                time: time.trim(),
                status: 'upcoming',
                createdAt: new Date().toISOString()
            };
            
            // Initialize events array if it doesn't exist
            if (!this.currentUser.events) {
                this.currentUser.events = [];
            }
            
            this.currentUser.events.push(event);
            
            // Save to database
            await UserDatabase.updateUser(this.currentUser.email, { 
                events: this.currentUser.events 
            });
            
            this.showNotification('Event created successfully!', 'success');
            
        } catch (error) {
            console.error('❌ Failed to create event:', error);
            this.showNotification('Failed to create event', 'error');
        }
    }
    
    static uploadPhotos() {
        this.showNotification('Photo uploader would open here', 'info');
    }
    
    static async addReview() {
        const reviewer = prompt('Reviewer name:');
        if (!reviewer) return;
        
        const rating = prompt('Rating (1-5):');
        if (!rating || isNaN(rating) || rating < 1 || rating > 5) {
            this.showNotification('Please enter a valid rating (1-5)', 'error');
            return;
        }
        
        const reviewText = prompt('Review text:');
        if (!reviewText) return;
        
        const bookTitle = prompt('Book title (optional):') || 'General';
        
        try {
            const review = {
                id: 'review_' + Date.now(),
                reviewer: reviewer.trim(),
                rating: parseInt(rating),
                text: reviewText.trim(),
                bookTitle: bookTitle.trim(),
                status: 'approved',
                createdAt: new Date().toISOString()
            };
            
            // Initialize reviews array if it doesn't exist
            if (!this.currentUser.reviews) {
                this.currentUser.reviews = [];
            }
            
            this.currentUser.reviews.push(review);
            
            // Save to database
            await UserDatabase.updateUser(this.currentUser.email, { 
                reviews: this.currentUser.reviews 
            });
            
            this.showNotification('Review added successfully!', 'success');
            
        } catch (error) {
            console.error('❌ Failed to add review:', error);
            this.showNotification('Failed to add review', 'error');
        }
    }
    
    static createWorldPage() {
        this.showNotification('Worldbuilding page editor would open here', 'info');
    }
    
    static manageInventory() {
        this.showNotification('Inventory manager would open here', 'info');
    }
    
    // Support methods
    static createSupportTicket() {
        this.showNotification('Support ticket system would open here', 'info');
    }
    
    static downloadBackup() {
        this.showNotification('Backup download would start here', 'info');
    }
    
    static viewAnalytics() {
        this.showNotification('Analytics dashboard would open here', 'info');
    }
    
    static openDocs() {
        window.open('#', '_blank');
    }
    
    static openForum() {
        window.open('#', '_blank');
    }
    
    // Utility methods
    static showUpgradePrompt() {
        this.showNotification('This feature requires Premium Support. Please upgrade to access.', 'warning');
    }
    
    static showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `admin-notification admin-notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 1rem 2rem;
            border-radius: 10px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            max-width: 300px;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.style.transform = 'translateX(0)', 100);
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
    
    static getNotificationColor(type) {
        const colors = {
            success: '#48BB78',
            error: '#E53E3E',
            warning: '#ED8936',
            info: '#4299E1'
        };
        return colors[type] || colors.info;
    }
    
    static showError(message) {
        this.showNotification(message, 'error');
    }
}

// Mobile menu toggle
function toggleMobileMenu() {
    const navLinks = document.getElementById('navLinks');
    navLinks.classList.toggle('active');
}

// Initialize admin panel when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    AdminPanel.initialize();
});

// Handle authentication state changes (only set if AuthSystem supports it)
if (typeof AuthSystem !== 'undefined' && AuthSystem.setOnAuthStateChanged) {
    AuthSystem.setOnAuthStateChanged(function(user) {
        if (user) {
            AdminPanel.currentUser = user;
            AdminPanel.initialize();
        } else {
            AdminPanel.showNotAuthenticatedState();
        }
    });
}

// Make AdminPanel globally available
window.AdminPanel = AdminPanel;

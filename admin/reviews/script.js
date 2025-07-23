// Reviews Management JavaScript with Priority 3 enhancements

class ReviewsManager {
    static currentUser = null;
    static reviews = [];

    static async initialize() {
        console.log('⭐ Initializing Reviews Manager...');

        try {
            await AuthSystem.initialize();

            if (!AuthSystem.isAuthenticated()) {
                this.showNotAuthenticatedState();
                return;
            }

            this.currentUser = AuthSystem.getCurrentUser();

            if (!this.currentUser.features?.testimonials?.purchased) {
                this.showFeatureNotAvailable();
                return;
            }

            await this.loadUserData();
            this.showReviewsManagement();
            this.loadReviews();
            this.setupFormHandler();

            console.log('✅ Reviews Manager initialized successfully');

        } catch (error) {
            console.error('❌ Reviews Manager initialization failed:', error);
        }
    }

    static async loadUserData() {
        try {
            const userData = await UserDatabase.getUser(this.currentUser.email);
            if (userData) {
                this.currentUser = userData;
                this.reviews = userData.reviews || [];
            }
        } catch (error) {
            console.error('❌ Failed to load user data:', error);
        }
    }

    static showNotAuthenticatedState() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('notAuthenticatedState').style.display = 'flex';
        document.getElementById('reviewsManagement').style.display = 'none';
    }

    static showFeatureNotAvailable() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('featureNotAvailable').style.display = 'flex';
        document.getElementById('reviewsManagement').style.display = 'none';
    }

    static showReviewsManagement() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('notAuthenticatedState').style.display = 'none';
        document.getElementById('featureNotAvailable').style.display = 'none';
        document.getElementById('reviewsManagement').style.display = 'block';
    }

    static loadReviews() {
        this.renderReviews();
        this.updateDashboardStats();
    }

    static updateDashboardStats() {
        const totalReviews = this.reviews.length;
        const approvedReviews = this.reviews.filter(r => r.status === 'approved').length;
        const pendingReviews = this.reviews.filter(r => r.status === 'pending').length;
        const averageRating = totalReviews > 0 
            ? (this.reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
            : '0.0';

        const totalReviewsEl = document.getElementById('totalReviews');
        const approvedReviewsEl = document.getElementById('approvedReviews');
        const pendingReviewsEl = document.getElementById('pendingReviews');
        const averageRatingEl = document.getElementById('averageRating');

        if (totalReviewsEl) totalReviewsEl.textContent = totalReviews;
        if (approvedReviewsEl) approvedReviewsEl.textContent = approvedReviews;
        if (pendingReviewsEl) pendingReviewsEl.textContent = pendingReviews;
        if (averageRatingEl) averageRatingEl.textContent = averageRating;
    }

    static createReview() {
        this.showReviewEditor('Add New Review');
        this.clearReviewForm();
    }

    static showReviewEditor(title) {
        document.getElementById('reviewEditorModal').classList.add('active');
        document.getElementById('editorTitle').textContent = title;
    }

    static closeReviewEditor() {
        document.getElementById('reviewEditorModal').classList.remove('active');
    }

    static clearReviewForm() {
        document.getElementById('reviewForm').reset();
        document.getElementById('reviewId').value = '';
        this.updateStarRating(5); // Default to 5 stars
    }

    static updateStarRating(rating) {
        const stars = document.querySelectorAll('.star-rating .star');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
        document.getElementById('reviewRating').value = rating;
    }

    static async saveReview() {
        try {
            const form = document.getElementById('reviewForm');
            const formData = new FormData(form);

            const reviewData = {
                reviewerName: formData.get('reviewerName'),
                reviewerEmail: formData.get('reviewerEmail'),
                bookTitle: formData.get('bookTitle'),
                rating: parseInt(formData.get('reviewRating')),
                reviewText: formData.get('reviewText'),
                status: formData.get('reviewStatus'),
                source: formData.get('reviewSource'),
                verified: formData.get('verified') === 'on'
            };

            if (!reviewData.reviewerName) {
                this.showNotification('Please enter reviewer name', 'error');
                return;
            }

            if (!reviewData.reviewText) {
                this.showNotification('Please enter review text', 'error');
                return;
            }

            if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) {
                this.showNotification('Please select a valid rating', 'error');
                return;
            }

            const reviewId = formData.get('reviewId');

            if (reviewId) {
                // Edit existing review
                const reviewIndex = this.reviews.findIndex(r => r.id === reviewId);
                if (reviewIndex >= 0) {
                    this.reviews[reviewIndex] = {
                        ...this.reviews[reviewIndex],
                        ...reviewData,
                        updatedAt: new Date().toISOString()
                    };
                }
            } else {
                // Create new review
                const newReview = {
                    id: 'review_' + Date.now(),
                    ...reviewData,
                    createdAt: new Date().toISOString()
                };
                this.reviews.unshift(newReview);
            }

            // Update database
            await UserDatabase.updateUser(this.currentUser.email, { 
                reviews: this.reviews 
            });

            this.currentUser.reviews = this.reviews;
            this.loadReviews();
            this.closeReviewEditor();

            this.showNotification(
                reviewId ? 'Review updated successfully!' : 'Review added successfully!',
                'success'
            );

        } catch (error) {
            console.error('❌ Failed to save review:', error);
            this.showNotification('Failed to save review', 'error');
        }
    }

    static editReview(reviewId) {
        const review = this.reviews.find(r => r.id === reviewId);
        if (!review) return;

        this.showReviewEditor('Edit Review');

        // Populate form
        document.getElementById('reviewId').value = review.id;
        document.getElementById('reviewerName').value = review.reviewerName || '';
        document.getElementById('reviewerEmail').value = review.reviewerEmail || '';
        document.getElementById('bookTitle').value = review.bookTitle || '';
        document.getElementById('reviewText').value = review.reviewText || '';
        document.getElementById('reviewStatus').value = review.status || 'pending';
        document.getElementById('reviewSource').value = review.source || '';
        document.getElementById('verified').checked = review.verified || false;

        this.updateStarRating(review.rating || 5);
    }

    static renderReviews() {
        const reviewsContainer = document.getElementById('reviewsContainer');

        if (this.reviews.length === 0) {
            reviewsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No reviews yet</h3>
                    <p>Add your first review to get started</p>
                    <button onclick="ReviewsManager.createReview()" class="add-btn">Add Review</button>
                </div>
            `;
            return;
        }

        reviewsContainer.innerHTML = this.reviews.map(review => `
            <div class="review-item" data-review-id="${review.id}">
                <div class="review-header">
                    <div class="reviewer-info">
                        <h4 class="reviewer-name">${review.reviewerName}</h4>
                        <div class="review-meta">
                            <div class="star-display">
                                ${this.generateStarDisplay(review.rating)}
                            </div>
                            <span class="review-date">${new Date(review.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="review-status-container">
                        <span class="review-status ${review.status || 'pending'}">${review.status || 'pending'}</span>
                        ${review.verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
                    </div>
                </div>
                ${review.bookTitle ? `<div class="book-title">Book: ${review.bookTitle}</div>` : ''}
                <div class="review-text">${review.reviewText}</div>
                ${review.source ? `<div class="review-source">Source: ${review.source}</div>` : ''}
                <div class="review-actions">
                    <button class="approve-btn" onclick="ReviewsManager.toggleReviewStatus('${review.id}')" 
                            title="${review.status === 'approved' ? 'Unapprove' : 'Approve'}">
                        ${review.status === 'approved' ? '❌ Unapprove' : '✅ Approve'}
                    </button>
                    <button class="edit-btn" onclick="ReviewsManager.editReview('${review.id}')">Edit</button>
                    <button class="delete-btn" onclick="ReviewsManager.deleteReview('${review.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    static generateStarDisplay(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += `<span class="star ${i <= rating ? 'filled' : ''}">${i <= rating ? '★' : '☆'}</span>`;
        }
        return stars;
    }

    static async toggleReviewStatus(reviewId) {
        try {
            const review = this.reviews.find(r => r.id === reviewId);
            if (!review) return;

            review.status = review.status === 'approved' ? 'pending' : 'approved';
            review.updatedAt = new Date().toISOString();

            // Update database
            await UserDatabase.updateUser(this.currentUser.email, { 
                reviews: this.reviews 
            });

            this.currentUser.reviews = this.reviews;
            this.loadReviews();

            this.showNotification(
                `Review ${review.status === 'approved' ? 'approved' : 'set to pending'}!`,
                'success'
            );

        } catch (error) {
            console.error('❌ Failed to update review status:', error);
            this.showNotification('Failed to update review status', 'error');
        }
    }

    static async deleteReview(reviewId) {
        const review = this.reviews.find(r => r.id === reviewId);
        if (!review) return;

        if (!confirm(`Are you sure you want to delete the review by ${review.reviewerName}?`)) {
            return;
        }

        try {
            this.reviews = this.reviews.filter(r => r.id !== reviewId);

            // Update database
            await UserDatabase.updateUser(this.currentUser.email, { 
                reviews: this.reviews 
            });

            this.currentUser.reviews = this.reviews;
            this.loadReviews();

            this.showNotification('Review deleted successfully!', 'success');

        } catch (error) {
            console.error('❌ Failed to delete review:', error);
            this.showNotification('Failed to delete review', 'error');
        }
    }

    static filterReviews() {
        const statusFilter = document.getElementById('statusFilter').value;
        const ratingFilter = document.getElementById('ratingFilter').value;

        let filteredReviews = this.reviews;

        if (statusFilter) {
            filteredReviews = filteredReviews.filter(review => review.status === statusFilter);
        }

        if (ratingFilter) {
            filteredReviews = filteredReviews.filter(review => review.rating === parseInt(ratingFilter));
        }

        this.displayFilteredReviews(filteredReviews);
    }

    static displayFilteredReviews(reviews) {
        const reviewsContainer = document.getElementById('reviewsContainer');

        if (reviews.length === 0) {
            reviewsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No reviews found</h3>
                    <p>Try adjusting your filters or add new reviews.</p>
                </div>
            `;
            return;
        }

        reviewsContainer.innerHTML = reviews.map(review => `
            <div class="review-item" data-review-id="${review.id}">
                <div class="review-header">
                    <div class="reviewer-info">
                        <h4 class="reviewer-name">${review.reviewerName}</h4>
                        <div class="review-meta">
                            <div class="star-display">
                                ${this.generateStarDisplay(review.rating)}
                            </div>
                            <span class="review-date">${new Date(review.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="review-status-container">
                        <span class="review-status ${review.status || 'pending'}">${review.status || 'pending'}</span>
                        ${review.verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
                    </div>
                </div>
                ${review.bookTitle ? `<div class="book-title">Book: ${review.bookTitle}</div>` : ''}
                <div class="review-text">${review.reviewText}</div>
                ${review.source ? `<div class="review-source">Source: ${review.source}</div>` : ''}
                <div class="review-actions">
                    <button class="approve-btn" onclick="ReviewsManager.toggleReviewStatus('${review.id}')" 
                            title="${review.status === 'approved' ? 'Unapprove' : 'Approve'}">
                        ${review.status === 'approved' ? '❌ Unapprove' : '✅ Approve'}
                    </button>
                    <button class="edit-btn" onclick="ReviewsManager.editReview('${review.id}')">Edit</button>
                    <button class="delete-btn" onclick="ReviewsManager.deleteReview('${review.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    static setupFormHandler() {
        // Setup star rating interactive
        document.querySelectorAll('.star-rating .star').forEach((star, index) => {
            star.addEventListener('click', () => {
                this.updateStarRating(index + 1);
            });
        });

        // Setup filters
        document.getElementById('statusFilter').addEventListener('change', () => {
            this.filterReviews();
        });

        document.getElementById('ratingFilter').addEventListener('change', () => {
            this.filterReviews();
        });
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
}

function toggleMobileMenu() {
    const navLinks = document.getElementById('navLinks');
    navLinks.classList.toggle('active');
}

document.addEventListener('DOMContentLoaded', function() {
    ReviewsManager.initialize();
});

AuthSystem.onAuthStateChanged = function(user) {
    if (user) {
        ReviewsManager.currentUser = user;
        ReviewsManager.initialize();
    } else {
        ReviewsManager.showNotAuthenticatedState();
    }
};

window.ReviewsManager = ReviewsManager;
window.toggleMobileMenu = toggleMobileMenu;
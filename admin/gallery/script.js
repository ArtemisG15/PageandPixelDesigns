// Gallery Management JavaScript with Priority 3 enhancements

class GalleryManager {
    static currentUser = null;
    static images = [];
    static selectedImages = [];
    static categories = ['book-covers', 'author-photos', 'events', 'inspiration', 'fan-art', 'other'];

    static async initialize() {
        console.log('🖼️ Initializing Gallery Manager...');

        try {
            await AuthSystem.initialize();

            if (!AuthSystem.isAuthenticated()) {
                this.showNotAuthenticatedState();
                return;
            }

            this.currentUser = AuthSystem.getCurrentUser();

            if (!this.currentUser.features?.gallery?.purchased) {
                this.showFeatureNotAvailable();
                return;
            }

            await this.loadUserData();
            this.showGalleryManagement();
            this.loadImages();
            this.setupFormHandler();
            this.setupDropZone();

            console.log('✅ Gallery Manager initialized successfully');

        } catch (error) {
            console.error('❌ Gallery Manager initialization failed:', error);
        }
    }

    static async loadUserData() {
        try {
            const userData = await UserDatabase.getUser(this.currentUser.email);
            if (userData) {
                this.currentUser = userData;
                this.images = userData.gallery || [];
            }
        } catch (error) {
            console.error('❌ Failed to load user data:', error);
        }
    }

    static showNotAuthenticatedState() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('notAuthenticatedState').style.display = 'flex';
        document.getElementById('galleryManagement').style.display = 'none';
    }

    static showFeatureNotAvailable() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('featureNotAvailable').style.display = 'flex';
        document.getElementById('galleryManagement').style.display = 'none';
    }

    static showGalleryManagement() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('notAuthenticatedState').style.display = 'none';
        document.getElementById('featureNotAvailable').style.display = 'none';
        document.getElementById('galleryManagement').style.display = 'block';
    }

    static loadImages() {
        this.renderGallery();
        this.updateStats();
        this.populateFilters();
    }

    static updateStats() {
        const totalImages = this.images.length;
        const categories = [...new Set(this.images.map(img => img.category).filter(Boolean))];
        const recentImages = this.images.filter(img => {
            const uploadDate = new Date(img.createdAt);
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return uploadDate > weekAgo;
        }).length;

        document.getElementById('totalImages').textContent = totalImages;
        document.getElementById('imageCategories').textContent = categories.length;
        document.getElementById('recentUploads').textContent = recentImages;
    }

    static populateFilters() {
        const categoryFilter = document.getElementById('categoryFilter');

        // Clear existing options except first
        while (categoryFilter.children.length > 1) {
            categoryFilter.removeChild(categoryFilter.lastChild);
        }

        // Populate category filter
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = this.formatCategoryName(category);
            categoryFilter.appendChild(option);
        });
    }

    static formatCategoryName(category) {
        return category.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    static uploadImages() {
        document.getElementById('imageUpload').click();
    }

    static setupDropZone() {
        const dropZone = document.getElementById('galleryContainer');

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('drag-over');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('drag-over');
            }, false);
        });

        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            this.handleImageFiles(files);
        }, false);
    }

    static preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    static handleImageFiles(files) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                this.processImageFile(file);
            }
        });
    }

    static processImageFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = {
                id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                title: file.name.split('.')[0],
                description: '',
                category: '',
                url: e.target.result, // Base64 data URL
                filename: file.name,
                size: file.size,
                createdAt: new Date().toISOString()
            };

            this.showImageEditor(imageData);
        };
        reader.readAsDataURL(file);
    }

    static showImageEditor(imageData = null) {
        const modal = document.getElementById('imageEditorModal');
        const title = document.getElementById('editorTitle');

        if (imageData) {
            title.textContent = 'Add Image Details';
            this.populateImageForm(imageData);
        } else {
            title.textContent = 'Edit Image';
        }

        modal.classList.add('active');
    }

    static populateImageForm(imageData) {
        document.getElementById('imageId').value = imageData.id || '';
        document.getElementById('imageTitle').value = imageData.title || '';
        document.getElementById('imageDescription').value = imageData.description || '';
        document.getElementById('imageCategory').value = imageData.category || '';

        if (imageData.url) {
            const preview = document.getElementById('imagePreview');
            preview.innerHTML = `<img src="${imageData.url}" alt="Preview" style="max-width: 100%; height: auto; border-radius: 8px;">`;
            preview.style.display = 'block';
        }
    }

    static closeImageEditor() {
        document.getElementById('imageEditorModal').classList.remove('active');
        document.getElementById('imageForm').reset();
        document.getElementById('imagePreview').style.display = 'none';
    }

    static async saveImage() {
        try {
            const form = document.getElementById('imageForm');
            const formData = new FormData(form);

            const imageData = {
                title: formData.get('imageTitle'),
                description: formData.get('imageDescription'),
                category: formData.get('imageCategory'),
            };

            if (!imageData.title) {
                this.showNotification('Please enter an image title', 'error');
                return;
            }

            const imageId = formData.get('imageId');

            if (imageId) {
                // Check if this is a new image (has URL) or editing existing
                const preview = document.getElementById('imagePreview');
                const hasNewImage = preview.style.display !== 'none' && preview.querySelector('img');

                if (hasNewImage) {
                    // New image upload
                    const imgElement = preview.querySelector('img');
                    const newImage = {
                        id: imageId,
                        ...imageData,
                        url: imgElement.src,
                        filename: imageData.title + '.jpg',
                        size: 0, // Would be calculated from file
                        createdAt: new Date().toISOString()
                    };
                    this.images.unshift(newImage);
                } else {
                    // Edit existing image
                    const imageIndex = this.images.findIndex(img => img.id === imageId);
                    if (imageIndex >= 0) {
                        this.images[imageIndex] = {
                            ...this.images[imageIndex],
                            ...imageData,
                            updatedAt: new Date().toISOString()
                        };
                    }
                }
            }

            // Update database
            await UserDatabase.updateUser(this.currentUser.email, { 
                gallery: this.images 
            });

            this.currentUser.gallery = this.images;
            this.loadImages();
            this.closeImageEditor();

            this.showNotification('Image saved successfully!', 'success');

        } catch (error) {
            console.error('❌ Failed to save image:', error);
            this.showNotification('Failed to save image', 'error');
        }
    }

    static editImage(imageId) {
        const image = this.images.find(img => img.id === imageId);
        if (!image) return;

        this.showImageEditor();
        this.populateImageForm(image);
    }

    static renderGallery() {
        const galleryContainer = document.getElementById('galleryContainer');

        if (this.images.length === 0) {
            galleryContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No images in your gallery</h3>
                    <p>Upload your first images to get started</p>
                    <button onclick="GalleryManager.uploadImages()" class="add-btn">Upload Images</button>
                </div>
            `;
            return;
        }

        galleryContainer.innerHTML = this.images.map(image => `
            <div class="gallery-item" data-image-id="${image.id}">
                <div class="image-container">
                    <img src="${image.url}" alt="${image.title}" loading="lazy">
                    <div class="image-overlay">
                        <div class="image-actions">
                            <button class="action-btn preview-btn" onclick="GalleryManager.previewImage('${image.id}')" title="Preview">👁️</button>
                            <button class="action-btn edit-btn" onclick="GalleryManager.editImage('${image.id}')" title="Edit">✏️</button>
                            <button class="action-btn delete-btn" onclick="GalleryManager.deleteImage('${image.id}')" title="Delete">🗑️</button>
                        </div>
                    </div>
                </div>
                <div class="image-info">
                    <h4 class="image-title">${image.title}</h4>
                    ${image.category ? `<span class="image-category">${this.formatCategoryName(image.category)}</span>` : ''}
                    ${image.description ? `<p class="image-description">${image.description}</p>` : ''}
                </div>
            </div>
        `).join('');
    }

    static async deleteImage(imageId) {
        const image = this.images.find(img => img.id === imageId);
        if (!image) return;

        if (!confirm(`Are you sure you want to delete "${image.title}"?`)) {
            return;
        }

        try {
            this.images = this.images.filter(img => img.id !== imageId);

            await UserDatabase.updateUser(this.currentUser.email, { 
                gallery: this.images 
            });

            this.currentUser.gallery = this.images;
            this.loadImages();

            this.showNotification('Image deleted successfully!', 'success');

        } catch (error) {
            console.error('❌ Failed to delete image:', error);
            this.showNotification('Failed to delete image', 'error');
        }
    }

    static previewImage(imageId) {
        const image = this.images.find(img => img.id === imageId);
        if (!image) return;

        this.showImagePreview(image);
    }

    static showImagePreview(image) {
        let modal = document.getElementById('imagePreviewModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'imagePreviewModal';
            modal.className = 'preview-modal';
            modal.innerHTML = `
                <div class="preview-content image-preview-content">
                    <div class="preview-header">
                        <h2 id="previewImageTitle"></h2>
                        <button class="preview-close" onclick="GalleryManager.closeImagePreview()">&times;</button>
                    </div>
                    <div class="preview-body">
                        <div class="preview-image-container">
                            <img id="previewImage" src="" alt="">
                        </div>
                        <div class="preview-details" id="previewDetails"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        document.getElementById('previewImageTitle').textContent = image.title;
        document.getElementById('previewImage').src = image.url;
        document.getElementById('previewImage').alt = image.title;

        const details = `
            ${image.category ? `<div class="detail-item"><strong>Category:</strong> ${this.formatCategoryName(image.category)}</div>` : ''}
            ${image.description ? `<div class="detail-item"><strong>Description:</strong> ${image.description}</div>` : ''}
            <div class="detail-item"><strong>Uploaded:</strong> ${new Date(image.createdAt).toLocaleDateString()}</div>
            ${image.size ? `<div class="detail-item"><strong>Size:</strong> ${this.formatFileSize(image.size)}</div>` : ''}
        `;

        document.getElementById('previewDetails').innerHTML = details;
        modal.classList.add('active');
    }

    static closeImagePreview() {
        const modal = document.getElementById('imagePreviewModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static filterImages() {
        const categoryFilter = document.getElementById('categoryFilter').value;

        let filteredImages = this.images;

        if (categoryFilter) {
            filteredImages = filteredImages.filter(image => image.category === categoryFilter);
        }

        this.displayFilteredImages(filteredImages);
    }

    static displayFilteredImages(images) {
        const galleryContainer = document.getElementById('galleryContainer');

        if (images.length === 0) {
            galleryContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No images found</h3>
                    <p>Try adjusting your filters or upload new images.</p>
                </div>
            `;
            return;
        }

        galleryContainer.innerHTML = images.map(image => `
            <div class="gallery-item" data-image-id="${image.id}">
                <div class="image-container">
                    <img src="${image.url}" alt="${image.title}" loading="lazy">
                    <div class="image-overlay">
                        <div class="image-actions">
                            <button class="action-btn preview-btn" onclick="GalleryManager.previewImage('${image.id}')" title="Preview">👁️</button>
                            <button class="action-btn edit-btn" onclick="GalleryManager.editImage('${image.id}')" title="Edit">✏️</button>
                            <button class="action-btn delete-btn" onclick="GalleryManager.deleteImage('${image.id}')" title="Delete">🗑️</button>
                        </div>
                    </div>
                </div>
                <div class="image-info">
                    <h4 class="image-title">${image.title}</h4>
                    ${image.category ? `<span class="image-category">${this.formatCategoryName(image.category)}</span>` : ''}
                    ${image.description ? `<p class="image-description">${image.description}</p>` : ''}
                </div>
            </div>
        `).join('');
    }

    static setupFormHandler() {
        // Setup file input handler
        document.getElementById('imageUpload').addEventListener('change', (e) => {
            this.handleImageFiles(e.target.files);
        });

        // Setup filter
        document.getElementById('categoryFilter').addEventListener('change', () => {
            this.filterImages();
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
    GalleryManager.initialize();
});

AuthSystem.onAuthStateChanged = function(user) {
    if (user) {
        GalleryManager.currentUser = user;
        GalleryManager.initialize();
    } else {
        GalleryManager.showNotAuthenticatedState();
    }
};

window.GalleryManager = GalleryManager;
window.toggleMobileMenu = toggleMobileMenu;
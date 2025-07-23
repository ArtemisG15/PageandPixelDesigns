
// Books Management JavaScript

class BookManager {
    static currentUser = null;
    static books = [];
    static selectedBook = null;
    static isEditing = false;

    // Initialize the books manager
    static async initialize() {
        console.log('📚 Initializing Book Manager...');
        
        try {
            // Wait for auth system
            await AuthSystem.initialize();
            
            if (!AuthSystem.isAuthenticated()) {
                this.showNotAuthenticatedState();
                return;
            }
            
            this.currentUser = AuthSystem.getCurrentUser();
            console.log('👤 Current user:', this.currentUser);
            
            // Load user data
            await this.loadUserData();
            
            // Show the books management
            this.showBookManagement();
            
            // Load books
            this.loadBooks();
            
            // Setup form handler
            this.setupFormHandler();
            
            // Initialize drag and drop
            this.initializeDragDrop();
            
            console.log('✅ Book Manager initialized successfully');
            
        } catch (error) {
            console.error('❌ Book Manager initialization failed:', error);
            this.showError('Failed to initialize book management. Please refresh and try again.');
        }
    }

    // Load user data
    static async loadUserData() {
        try {
            const userData = await UserDatabase.getUser(this.currentUser.email);
            if (userData) {
                this.currentUser = userData;
                this.books = userData.books || [];
            }
        } catch (error) {
            console.error('❌ Failed to load user data:', error);
        }
    }

    // Show not authenticated state
    static showNotAuthenticatedState() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('notAuthenticatedState').style.display = 'flex';
        document.getElementById('bookManagement').style.display = 'none';
    }

    // Show book management
    static showBookManagement() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('notAuthenticatedState').style.display = 'none';
        document.getElementById('bookManagement').style.display = 'block';
    }

    // Load and display books
    static loadBooks() {
        const booksGrid = document.getElementById('booksGrid');
        const bookCount = document.getElementById('bookCount');
        
        bookCount.textContent = `${this.books.length} ${this.books.length === 1 ? 'book' : 'books'}`;
        
        if (this.books.length === 0) {
            booksGrid.innerHTML = `
                <div class="empty-state">
                    <h3>No books yet</h3>
                    <p>Start building your book showcase by adding your first book.</p>
                    <button onclick="BookManager.addNewBook()" class="add-btn" style="margin-top: 1rem;">+ Add Your First Book</button>
                </div>
            `;
            return;
        }

        booksGrid.innerHTML = this.books.map(book => `
            <div class="book-item" data-book-id="${book.id}" onclick="BookManager.selectBook('${book.id}')">
                <div class="book-header">
                    <h4 class="book-title">${book.title}</h4>
                    <span class="book-status ${book.status || 'draft'}">${book.status || 'draft'}</span>
                </div>
                <div class="book-meta">
                    ${book.genre ? `<span>📖 ${book.genre}</span>` : ''}
                    <span>📅 ${new Date(book.createdAt).toLocaleDateString()}</span>
                </div>
                ${book.description ? `<p class="book-description">${book.description}</p>` : ''}
                <div class="book-actions">
                    <button class="edit-book-btn" onclick="event.stopPropagation(); BookManager.editBook('${book.id}')">Edit</button>
                    <button class="delete-book-btn" onclick="event.stopPropagation(); BookManager.deleteBook('${book.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    // Select a book
    static selectBook(bookId) {
        // Remove previous selection
        document.querySelectorAll('.book-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Add selection to current book
        const bookElement = document.querySelector(`[data-book-id="${bookId}"]`);
        if (bookElement) {
            bookElement.classList.add('selected');
        }
        
        this.selectedBook = this.books.find(book => book.id === bookId);
    }

    // Add new book
    static addNewBook() {
        this.selectedBook = null;
        this.isEditing = false;
        this.showEditor('Add New Book');
        this.clearForm();
    }

    // Edit book
    static editBook(bookId) {
        this.selectedBook = this.books.find(book => book.id === bookId);
        this.isEditing = true;
        this.showEditor('Edit Book');
        this.populateForm();
    }

    // Delete book
    static async deleteBook(bookId) {
        const book = this.books.find(b => b.id === bookId);
        if (!book) return;

        if (!confirm(`Are you sure you want to delete "${book.title}"?`)) {
            return;
        }

        try {
            // Remove from array
            this.books = this.books.filter(b => b.id !== bookId);
            
            // Update database
            await UserDatabase.updateUser(this.currentUser.email, { books: this.books });
            
            // Update local user data
            this.currentUser.books = this.books;
            
            // Reload display
            this.loadBooks();
            
            // Close editor if this book was being edited
            if (this.selectedBook && this.selectedBook.id === bookId) {
                this.closeEditor();
            }
            
            this.showNotification('Book deleted successfully!', 'success');
            
        } catch (error) {
            console.error('❌ Failed to delete book:', error);
            this.showNotification('Failed to delete book', 'error');
        }
    }

    // Show editor
    static showEditor(title) {
        document.getElementById('editorTitle').textContent = title;
        document.getElementById('bookEditor').style.display = 'block';
        
        // Scroll to editor on mobile
        if (window.innerWidth <= 768) {
            document.getElementById('bookEditor').scrollIntoView({ behavior: 'smooth' });
        }
    }

    // Close editor
    static closeEditor() {
        document.getElementById('bookEditor').style.display = 'none';
        this.selectedBook = null;
        this.isEditing = false;
        
        // Remove selection
        document.querySelectorAll('.book-item').forEach(item => {
            item.classList.remove('selected');
        });
    }

    // Clear form
    static clearForm() {
        document.getElementById('bookForm').reset();
        this.clearCoverPreview();
    }

    // Populate form with selected book data
    static populateForm() {
        if (!this.selectedBook) return;

        const book = this.selectedBook;
        document.getElementById('bookTitle').value = book.title || '';
        document.getElementById('bookGenre').value = book.genre || '';
        document.getElementById('bookDescription').value = book.description || '';
        document.getElementById('bookStatus').value = book.status || 'draft';
        document.getElementById('bookISBN').value = book.isbn || '';
        document.getElementById('bookPages').value = book.pages || '';
        document.getElementById('bookPrice').value = book.price || '';
        document.getElementById('publishDate').value = book.publishDate || '';
        document.getElementById('seriesName').value = book.seriesName || '';
        document.getElementById('seriesOrder').value = book.seriesOrder || '';
        
        // Show current cover if exists
        if (book.coverImage) {
            this.showCoverPreview(book.coverImage);
        }
        
        // Populate retail links if they exist
        const links = book.retailLinks || {};
        document.getElementById('amazonLink').value = links.amazon || '';
        document.getElementById('goodreadsLink').value = links.goodreads || '';
        document.getElementById('appleLink').value = links.apple || '';
        document.getElementById('koboLink').value = links.kobo || '';
    }

    // Initialize drag and drop for cover upload
    static initializeDragDrop() {
        const dropZone = document.getElementById('coverDropZone');
        const fileInput = document.getElementById('coverUpload');
        
        if (!dropZone || !fileInput) return;

        dropZone.addEventListener('click', () => fileInput.click());
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleCoverUpload(files[0]);
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleCoverUpload(e.target.files[0]);
            }
        });
    }

    // Handle cover image upload
    static handleCoverUpload(file) {
        if (!file.type.startsWith('image/')) {
            this.showNotification('Please select an image file', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            this.showNotification('Image file too large. Please select a file under 5MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = e.target.result;
            this.showCoverPreview(imageData);
            // Store the image data for saving
            document.getElementById('coverImageData').value = imageData;
        };
        reader.readAsDataURL(file);
    }

    // Show cover preview
    static showCoverPreview(imageSrc) {
        const preview = document.getElementById('coverPreview');
        const placeholder = document.getElementById('coverPlaceholder');
        
        if (preview && placeholder) {
            preview.src = imageSrc;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        }
    }

    // Clear cover preview
    static clearCoverPreview() {
        const preview = document.getElementById('coverPreview');
        const placeholder = document.getElementById('coverPlaceholder');
        
        if (preview && placeholder) {
            preview.src = '';
            preview.style.display = 'none';
            placeholder.style.display = 'flex';
            document.getElementById('coverImageData').value = '';
        }
    }

    // Setup form handler
    static setupFormHandler() {
        document.getElementById('bookForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveBook();
        });
    }

    // Save book
    static async saveBook() {
        try {
            const bookData = {
                title: document.getElementById('bookTitle').value.trim(),
                genre: document.getElementById('bookGenre').value,
                description: document.getElementById('bookDescription').value.trim(),
                status: document.getElementById('bookStatus').value,
                isbn: document.getElementById('bookISBN').value.trim(),
                pages: parseInt(document.getElementById('bookPages').value) || null,
                price: parseFloat(document.getElementById('bookPrice').value) || null,
                publishDate: document.getElementById('publishDate').value,
                seriesName: document.getElementById('seriesName').value.trim(),
                seriesOrder: parseInt(document.getElementById('seriesOrder').value) || null,
                coverImage: document.getElementById('coverImageData').value || this.selectedBook?.coverImage || '',
                retailLinks: {
                    amazon: document.getElementById('amazonLink').value.trim(),
                    goodreads: document.getElementById('goodreadsLink').value.trim(),
                    apple: document.getElementById('appleLink').value.trim(),
                    kobo: document.getElementById('koboLink').value.trim()
                }
            };

            if (!bookData.title) {
                this.showNotification('Please enter a book title', 'error');
                return;
            }

            if (this.isEditing && this.selectedBook) {
                // Update existing book
                const bookIndex = this.books.findIndex(b => b.id === this.selectedBook.id);
                if (bookIndex >= 0) {
                    this.books[bookIndex] = {
                        ...this.books[bookIndex],
                        ...bookData,
                        updatedAt: new Date().toISOString()
                    };
                }
            } else {
                // Add new book
                const newBook = {
                    id: Date.now().toString(),
                    ...bookData,
                    createdAt: new Date().toISOString()
                };
                this.books.push(newBook);
            }

            // Update database
            await UserDatabase.updateUser(this.currentUser.email, { books: this.books });
            
            // Update local user data
            this.currentUser.books = this.books;
            
            // Reload display
            this.loadBooks();
            
            // Close editor
            this.closeEditor();
            
            this.showNotification(
                this.isEditing ? 'Book updated successfully!' : 'Book added successfully!',
                'success'
            );

        } catch (error) {
            console.error('❌ Failed to save book:', error);
            this.showNotification('Failed to save book', 'error');
        }
    }

    // Show notification
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    BookManager.initialize();
});

// Handle authentication state changes
AuthSystem.onAuthStateChanged = function(user) {
    if (user) {
        BookManager.currentUser = user;
        BookManager.initialize();
    } else {
        BookManager.showNotAuthenticatedState();
    }
};

// Make BookManager globally available
window.BookManager = BookManager;

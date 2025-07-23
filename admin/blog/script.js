// Blog Management JavaScript

class BlogManager {
    static currentUser = null;
    static posts = [];

    static async initialize() {
        console.log('✍️ Initializing Blog Manager...');

        try {
            await AuthSystem.initialize();

            if (!AuthSystem.isAuthenticated()) {
                this.showNotAuthenticatedState();
                return;
            }

            this.currentUser = AuthSystem.getCurrentUser();

            // Check if blog feature is available
            if (!this.currentUser.features?.blog?.purchased) {
                this.showFeatureNotAvailable();
                return;
            }

            await this.loadUserData();
            this.showBlogManagement();
            this.loadPosts();

            console.log('✅ Blog Manager initialized successfully');

        } catch (error) {
            console.error('❌ Blog Manager initialization failed:', error);
        }
    }

    static async loadUserData() {
        try {
            const userData = await UserDatabase.getUser(this.currentUser.email);
            if (userData) {
                this.currentUser = userData;
                this.posts = userData.blogPosts || [];
            }
        } catch (error) {
            console.error('❌ Failed to load user data:', error);
        }
    }

    static showNotAuthenticatedState() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('notAuthenticatedState').style.display = 'flex';
        document.getElementById('blogManagement').style.display = 'none';
    }

    static showFeatureNotAvailable() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('featureNotAvailable').style.display = 'flex';
        document.getElementById('blogManagement').style.display = 'none';
    }

    static showBlogManagement() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('notAuthenticatedState').style.display = 'none';
        document.getElementById('featureNotAvailable').style.display = 'none';
        document.getElementById('blogManagement').style.display = 'block';

        // Hide advanced features if no premium support
        if (!this.currentUser.hasSupport) {
            document.getElementById('categoriesBtn').style.display = 'none';
        }
    }

    // Load and display posts
    static loadPosts() {
        // Reset filters and display all posts
        document.getElementById('statusFilter').value = '';
        document.getElementById('categoryFilter').value = '';
        this.displayFilteredPosts(this.posts);

        // Hide bulk actions
        document.getElementById('bulkActions').style.display = 'none';
    }

    static createPost() {
        this.showPostEditor('Create New Post');
        this.clearPostForm();
    }

    static showPostEditor(title) {
        document.getElementById('postEditorModal').classList.add('active');
        document.getElementById('editorTitle').textContent = title;
    }

    static closePostEditor() {
        document.getElementById('postEditorModal').classList.remove('active');
    }

    // Clear form
    static clearPostForm() {
        document.getElementById('postForm').reset();
        document.getElementById('blogContent').innerHTML = '';
        document.getElementById('blogContentHidden').value = '';
        this.updateCharCount('seoTitle', 'seoTitleCount', 60);
        this.updateCharCount('seoDescription', 'seoDescCount', 160);
    }

    static async savePost() {
        try {
            const form = document.getElementById('postForm');
            const formData = new FormData(form);

            const postData = {
                title: formData.get('postTitle'),
                content: document.getElementById('blogContentHidden').value.trim(),
                excerpt: this.generateExcerpt(document.getElementById('blogContentHidden').value.trim()),
                status: formData.get('postStatus'),
                tags: formData.get('postTags').split(',').map(tag => tag.trim()).filter(tag => tag),
                category: formData.get('blogCategory'),
                seoTitle: formData.get('seoTitle'),
                seoDescription: formData.get('seoDescription'),
                seoKeywords: formData.get('seoKeywords'),
                publishDate: formData.get('publishDate') || null
            };

            if (!postData.title) {
                this.showNotification('Please enter a post title', 'error');
                return;
            }

             if (!postData.content) {
                this.showNotification('Please enter post content', 'error');
                return;
            }

            // Auto-generate SEO title if empty
            if (!postData.seoTitle) {
                postData.seoTitle = postData.title;
            }

            // Auto-generate meta description if empty
            if (!postData.seoDescription) {
                postData.seoDescription = postData.excerpt;
            }

            const postId = formData.get('postId');

            if (postId) {
                // Edit existing post
                const postIndex = this.posts.findIndex(p => p.id === postId);
                if (postIndex >= 0) {
                    this.posts[postIndex] = {
                        ...this.posts[postIndex],
                        ...postData,
                        updatedAt: new Date().toISOString()
                    };
                }
            } else {
                // Create new post
                const newPost = {
                    id: 'post_' + Date.now(),
                    ...postData,
                    createdAt: new Date().toISOString(),
                    author: this.currentUser.name
                };
                this.posts.unshift(newPost);
            }

            // Update database
            await UserDatabase.updateUser(this.currentUser.email, { 
                blogPosts: this.posts 
            });

            this.currentUser.blogPosts = this.posts;
            this.loadPosts();
            this.renderPosts();
            this.closePostEditor();

            this.showNotification(
                postId ? 'Post updated successfully!' : 'Post created successfully!',
                'success'
            );

        } catch (error) {
            console.error('❌ Failed to save post:', error);
            this.showNotification('Failed to save post', 'error');
        }
    }
    // Generate excerpt from content
    static generateExcerpt(content) {
        // Strip HTML tags and get first 150 characters
        const text = content.replace(/<[^>]*>/g, '');
        return text.length > 150 ? text.substring(0, 150) + '...' : text;
    }

    // Populate form with selected post data
    static editPost(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post) return;

        this.showPostEditor('Edit Post');

        // Populate form
        document.getElementById('postId').value = post.id;
        document.getElementById('postTitle').value = post.title || '';
        document.getElementById('blogContent').innerHTML = post.content || '';
        document.getElementById('blogContentHidden').value = post.content || '';
        document.getElementById('postExcerpt').value = post.excerpt || '';
        document.getElementById('postStatus').value = post.status || 'draft';
        document.getElementById('postTags').value = post.tags ? post.tags.join(', ') : '';
        document.getElementById('blogCategory').value = post.category || '';
                // SEO fields
        document.getElementById('seoTitle').value = post.seoTitle || '';
        document.getElementById('seoDescription').value = post.seoDescription || '';
        document.getElementById('seoKeywords').value = post.seoKeywords || '';

        if (post.publishDate) {
            document.getElementById('publishDate').value = post.publishDate;
        }

        this.toggleScheduleField();
        this.updateCharCount('seoTitle', 'seoTitleCount', 60);
        this.updateCharCount('seoDescription', 'seoDescCount', 160);
    }

    static renderPosts() {
        const postsContainer = document.getElementById('postsContainer');

        if (this.posts.length === 0) {
            postsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No blog posts yet</h3>
                    <p>Start sharing your thoughts with your readers</p>
                    <button onclick="BlogManager.createPost()" class="add-btn">Write Your First Post</button>
                </div>
            `;
            return;
        }

        postsContainer.innerHTML = this.posts.map(post => `
            <div class="post-item" data-post-id="${post.id}">
                <div class="post-header">
                    <h4 class="post-title">${post.title}</h4>
                    <span class="post-status ${post.status || 'draft'}">${post.status || 'draft'}</span>
                </div>
                <div class="post-meta">
                    <span>📅 ${new Date(post.createdAt).toLocaleDateString()}</span>
                    ${post.tags && post.tags.length > 0 ? `<span>🏷️ ${post.tags.join(', ')}</span>` : ''}
                </div>
                ${post.excerpt ? `<p class="post-excerpt">${post.excerpt}</p>` : ''}
                <div class="post-actions">
                    <button class="edit-btn" onclick="BlogManager.editPost('${post.id}')">Edit</button>
                    <button class="delete-btn" onclick="BlogManager.deletePost('${post.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    static async deletePost(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post) return;

        if (!confirm(`Are you sure you want to delete "${post.title}"?`)) {
            return;
        }

        try {
            this.posts = this.posts.filter(p => p.id !== postId);

            // Update database
            await UserDatabase.updateUser(this.currentUser.email, { 
                blogPosts: this.posts 
            });

            this.currentUser.blogPosts = this.posts;
            this.loadPosts();
            this.renderPosts();

            this.showNotification('Post deleted successfully!', 'success');

        } catch (error) {
            console.error('❌ Failed to delete post:', error);
            this.showNotification('Failed to delete post', 'error');
        }
    }

    static manageCategories() {
        if (!this.currentUser.hasSupport) {
            this.showNotification('Categories management requires Premium Support', 'warning');
            return;
        }
        this.showNotification('Categories manager would open here', 'info');
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
    // Setup form handler
    static setupFormHandler() {
        document.getElementById('postForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.savePost();
        });

        // Setup rich text editor
        this.setupRichTextEditor();

        // Setup character counters
        this.setupCharacterCounters();

        // Setup bulk selection
        this.setupBulkSelection();
    }

    // Setup rich text editor
    static setupRichTextEditor() {
        const editor = document.getElementById('blogContent');
        const hiddenTextarea = document.getElementById('blogContentHidden');

        // Sync content with hidden textarea
        editor.addEventListener('input', () => {
            hiddenTextarea.value = editor.innerHTML;
        });

        // Setup toolbar buttons
        document.querySelectorAll('.editor-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const command = btn.dataset.command;
                this.executeCommand(command);
            });
        });

        // Handle keyboard shortcuts
        editor.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'b':
                        e.preventDefault();
                        this.executeCommand('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        this.executeCommand('italic');
                        break;
                    case 'u':
                        e.preventDefault();
                        this.executeCommand('underline');
                        break;
                }
            }
        });
    }

    // Execute rich text command
    static executeCommand(command) {
        const editor = document.getElementById('blogContent');
        editor.focus();

        if (command === 'createLink') {
            const url = prompt('Enter the URL:');
            if (url) {
                document.execCommand(command, false, url);
            }
        } else if (command === 'insertImage') {
            const url = prompt('Enter the image URL:');
            if (url) {
                document.execCommand(command, false, url);
            }
        } else {
            document.execCommand(command, false, null);
        }

        // Update button states
        this.updateToolbarState();

        // Sync with hidden textarea
        document.getElementById('blogContentHidden').value = editor.innerHTML;
    }

    // Format block elements
    static formatBlock(tag) {
        if (tag) {
            document.execCommand('formatBlock', false, tag);
            this.updateToolbarState();

            // Sync with hidden textarea
            const editor = document.getElementById('blogContent');
            document.getElementById('blogContentHidden').value = editor.innerHTML;
        }
    }

    // Update toolbar button states
    static updateToolbarState() {
        document.querySelectorAll('.editor-btn').forEach(btn => {
            const command = btn.dataset.command;
            if (document.queryCommandState(command)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // Setup character counters
    static setupCharacterCounters() {
        const seoTitle = document.getElementById('seoTitle');
        const seoDesc = document.getElementById('seoDescription');

        seoTitle.addEventListener('input', () => {
            this.updateCharCount('seoTitle', 'seoTitleCount', 60);
        });

        seoDesc.addEventListener('input', () => {
            this.updateCharCount('seoDescription', 'seoDescCount', 160);
        });
    }

    // Update character count
    static updateCharCount(fieldId, countId, maxLength) {
        const field = document.getElementById(fieldId);
        const counter = document.getElementById(countId);
        const length = field.value.length;

        counter.textContent = `${length}/${maxLength}`;

        counter.classList.remove('warning', 'error');
        if (length > maxLength * 0.8) {
            counter.classList.add('warning');
        }
        if (length > maxLength) {
            counter.classList.add('error');
        }
    }

    // Toggle schedule field
    static toggleScheduleField() {
        const status = document.getElementById('postStatus').value;
        const scheduleGroup = document.getElementById('scheduleGroup');

        if (status === 'scheduled') {
            scheduleGroup.style.display = 'block';
        } else {
            scheduleGroup.style.display = 'none';
        }
    }

    // Setup bulk selection
    static setupBulkSelection() {
        // This will be set up when posts are loaded
    }

    // Filter posts
    static filterPosts() {
        const statusFilter = document.getElementById('statusFilter').value;
        const categoryFilter = document.getElementById('categoryFilter').value;

        let filteredPosts = this.posts;

        if (statusFilter) {
            filteredPosts = filteredPosts.filter(post => post.status === statusFilter);
        }

        if (categoryFilter) {
            filteredPosts = filteredPosts.filter(post => post.category === categoryFilter);
        }

        this.displayFilteredPosts(filteredPosts);
    }

    // Display filtered posts
    static displayFilteredPosts(posts) {
        const postsGrid = document.getElementById('postsContainer');
        const postCount = document.getElementById('postCount');

        postCount.textContent = `${posts.length} ${posts.length === 1 ? 'post' : 'posts'}`;

        if (posts.length === 0) {
            postsGrid.innerHTML = `
                <div class="empty-state">
                    <h3>No posts found</h3>
                    <p>Try adjusting your filters or create your first post.</p>
                </div>
            `;
            return;
        }

        postsGrid.innerHTML = posts.map(post => `
            <div class="post-item" data-post-id="${post.id}">
                <input type="checkbox" class="bulk-checkbox" onchange="BlogManager.toggleBulkActions()">
                <div class="post-header">
                    <h4 class="post-title">${post.title}</h4>
                    <span class="post-status ${post.status || 'draft'}">${post.status || 'draft'}</span>
                </div>
                <div class="post-meta">
                    ${post.category ? `<span class="post-category">${post.category}</span>` : ''}
                    <span>📅 ${new Date(post.createdAt).toLocaleDateString()}</span>
                    ${post.publishDate ? `<span>⏰ Scheduled: ${new Date(post.publishDate).toLocaleDateString()}</span>` : ''}
                    ${post.tags ? `<span>🏷️ ${post.tags.slice(0, 2).join(', ')}${post.tags.length > 2 ? '...' : ''}</span>` : ''}
                </div>
                ${post.excerpt ? `<p class="post-excerpt">${post.excerpt}</p>` : ''}
                <div class="post-actions">
                    <button class="preview-btn" onclick="BlogManager.previewPost('${post.id}')">👁️ Preview</button>
                    <button class="edit-post-btn" onclick="BlogManager.editPost('${post.id}')">Edit</button>
                    <button class="delete-post-btn" onclick="BlogManager.deletePost('${post.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    // Toggle bulk actions visibility
    static toggleBulkActions() {
        const checkboxes = document.querySelectorAll('.bulk-checkbox:checked');
        const bulkActions = document.getElementById('bulkActions');

        if (checkboxes.length > 0) {
            bulkActions.style.display = 'flex';
        } else {
            bulkActions.style.display = 'none';
        }
    }

    // Bulk publish posts
    static async bulkPublish() {
        const selectedIds = this.getSelectedPostIds();
        if (selectedIds.length === 0) return;

        if (!confirm(`Publish ${selectedIds.length} selected posts?`)) return;

        try {
            selectedIds.forEach(id => {
                const post = this.posts.find(p => p.id === id);
                if (post) {
                    post.status = 'published';
                    post.publishDate = new Date().toISOString();
                }
            });

            await UserDatabase.updateUser(this.currentUser.email, { 
                blogPosts: this.posts 
            });

            this.loadPosts();
            this.showNotification(`${selectedIds.length} posts published!`, 'success');

        } catch (error) {
            console.error('Bulk publish error:', error);
            this.showNotification('Failed to publish posts', 'error');
        }
    }

    // Bulk delete posts
    static async bulkDelete() {
        const selectedIds = this.getSelectedPostIds();
        if (selectedIds.length === 0) return;

        if (!confirm(`Delete ${selectedIds.length} selected posts? This cannot be undone.`)) return;

        try {
            this.posts = this.posts.filter(post => !selectedIds.includes(post.id));

            await UserDatabase.updateUser(this.currentUser.email, { 
                blogPosts: this.posts 
            });

            this.loadPosts();
            this.showNotification(`${selectedIds.length} posts deleted!`, 'success');

        } catch (error) {
            console.error('Bulk delete error:', error);
            this.showNotification('Failed to delete posts', 'error');
        }
    }

    // Get selected post IDs
    static getSelectedPostIds() {
        const checkboxes = document.querySelectorAll('.bulk-checkbox:checked');
        return Array.from(checkboxes).map(cb => {
            return cb.closest('.post-item').dataset.postId;
        });
    }

    // Preview post
    static previewPost(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post) return;

        this.showPreviewModal(post);
    }

    // Show preview modal
    static showPreviewModal(post) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('previewModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'previewModal';
            modal.className = 'preview-modal';
            modal.innerHTML = `
                <div class="preview-content">
                    <div class="preview-header">
                        <h2 id="previewTitle"></h2>
                        <button class="preview-close" onclick="BlogManager.closePreviewModal()">&times;</button>
                    </div>
                    <div class="preview-body" id="previewBody"></div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Populate with post data
        document.getElementById('previewTitle').textContent = post.title;
        document.getElementById('previewBody').innerHTML = post.content;

        modal.classList.add('active');

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closePreviewModal();
            }
        });
    }

    // Close preview modal
    static closePreviewModal() {
        const modal = document.getElementById('previewModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
}

function toggleMobileMenu() {
    const navLinks = document.getElementById('navLinks');
    navLinks.classList.toggle('active');
}

document.addEventListener('DOMContentLoaded', function() {
    BlogManager.initialize();
    BlogManager.setupFormHandler();
});

AuthSystem.onAuthStateChanged = function(user) {
    if (user) {
        BlogManager.currentUser = user;
        BlogManager.initialize();
    } else {
        BlogManager.showNotAuthenticatedState();
    }
};

// Make functions globally available
window.BlogManager = BlogManager;
window.toggleMobileMenu = toggleMobileMenu;

// Worldbuilding Manager - Priority 3 Enhanced
console.log('🌍 Initializing Worldbuilding Manager...');

class WorldbuildingManager {
    static entries = [];
    static currentEntry = null;
    static isInitialized = false;
    static selectedEntries = new Set();
    static currentView = 'grid';
    static currentUser = null;

    // Templates for different entry types
    static templates = {
        character: `**Appearance:**
• Age: 
• Height/Build: 
• Hair/Eyes: 
• Distinguishing features: 

**Personality:**
• Key traits: 
• Strengths: 
• Flaws: 
• Motivations: 

**Background:**
• Origin: 
• Family: 
• Occupation: 
• Important relationships: 

**Role in Story:**
• Primary function: 
• Character arc: 
• Key scenes: `,

        location: `**Physical Description:**
• Geography: 
• Climate: 
• Architecture: 
• Notable landmarks: 

**Culture & Society:**
• Population: 
• Government: 
• Economy: 
• Customs: 

**History:**
• Founded: 
• Important events: 
• Current status: 

**Story Significance:**
• Scenes set here: 
• Atmosphere/mood: 
• Plot relevance: `,

        magic: `**System Overview:**
• Type of magic: 
• Source of power: 
• Limitations: 
• Cost/consequences: 

**Rules & Mechanics:**
• How it works: 
• Who can use it: 
• Learning process: 
• Mastery levels: 

**Cultural Impact:**
• Social acceptance: 
• Regulation/laws: 
• Historical significance: 

**Story Integration:**
• Plot relevance: 
• Character abilities: 
• Conflicts created: `
    };

    static async initialize() {
        console.log('🌍 Starting worldbuilding manager initialization...');
        
        if (this.isInitialized) {
            console.log('✅ Worldbuilding manager already initialized');
            return;
        }

        try {
            // Get current user
            this.currentUser = AuthSystem.getCurrentUser();
            
            if (!this.currentUser) {
                console.log('❌ No authenticated user found');
                AuthSystem.showAuthModal();
                return;
            }

            console.log('👤 Current user:', this.currentUser);

            // Load existing entries
            await this.loadEntries();
            
            // Initialize UI
            this.initializeUI();
            
            // Update display
            this.updateStats();
            this.renderContent();
            
            this.isInitialized = true;
            console.log('✅ Worldbuilding Manager initialized successfully');

        } catch (error) {
            console.error('❌ Worldbuilding Manager initialization failed:', error);
        }
    }

    static async loadEntries() {
        try {
            // Load from localStorage for now
            const savedEntries = localStorage.getItem(`worldbuilding_${this.currentUser.email}`);
            if (savedEntries) {
                this.entries = JSON.parse(savedEntries);
                console.log('📚 Loaded entries:', this.entries);
            } else {
                this.entries = [];
                console.log('📭 No saved entries found');
            }
        } catch (error) {
            console.error('❌ Error loading entries:', error);
            this.entries = [];
        }
    }

    static async saveEntries() {
        try {
            localStorage.setItem(`worldbuilding_${this.currentUser.email}`, JSON.stringify(this.entries));
            console.log('💾 Entries saved successfully');
        } catch (error) {
            console.error('❌ Error saving entries:', error);
        }
    }

    static initializeUI() {
        // View toggle buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentView = e.target.dataset.view;
                this.renderContent();
            });
        });

        // Filter and search
        document.getElementById('categoryFilter').addEventListener('change', () => this.renderContent());
        document.getElementById('statusFilter').addEventListener('change', () => this.renderContent());
        document.getElementById('searchInput').addEventListener('input', () => this.renderContent());

        // Form submission
        document.getElementById('entryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEntry();
        });

        console.log('🎛️ UI initialized');
    }

    static showEditor(entry = null) {
        this.currentEntry = entry;
        const modal = document.getElementById('entryEditor');
        const title = document.getElementById('editorTitle');
        
        if (entry) {
            title.textContent = 'Edit Worldbuilding Entry';
            this.populateForm(entry);
        } else {
            title.textContent = 'Create Worldbuilding Entry';
            this.clearForm();
        }
        
        modal.classList.add('active');
    }

    static closeEditor() {
        document.getElementById('entryEditor').classList.remove('active');
        this.currentEntry = null;
        this.clearForm();
    }

    static populateForm(entry) {
        document.getElementById('entryTitle').value = entry.title || '';
        document.getElementById('entryCategory').value = entry.category || '';
        document.getElementById('entrySubtitle').value = entry.subtitle || '';
        document.getElementById('entryContent').value = entry.content || '';
        document.getElementById('entryTags').value = entry.tags ? entry.tags.join(', ') : '';
        document.getElementById('entryStatus').value = entry.status || 'draft';
        document.getElementById('relatedEntries').value = entry.relatedEntries || '';
        document.getElementById('importance').value = entry.importance || 'medium';
        document.getElementById('spoilerWarning').checked = entry.spoilerWarning || false;
        document.getElementById('fanFavorite').checked = entry.fanFavorite || false;
        document.getElementById('customSlug').value = entry.customSlug || '';
    }

    static clearForm() {
        document.getElementById('entryForm').reset();
        document.getElementById('entryStatus').value = 'draft';
        document.getElementById('importance').value = 'medium';
    }

    static async saveEntry() {
        try {
            const formData = {
                id: this.currentEntry?.id || 'entry_' + Date.now(),
                title: document.getElementById('entryTitle').value.trim(),
                category: document.getElementById('entryCategory').value,
                subtitle: document.getElementById('entrySubtitle').value.trim(),
                content: document.getElementById('entryContent').value.trim(),
                tags: document.getElementById('entryTags').value.split(',').map(t => t.trim()).filter(t => t),
                status: document.getElementById('entryStatus').value,
                relatedEntries: document.getElementById('relatedEntries').value.trim(),
                importance: document.getElementById('importance').value,
                spoilerWarning: document.getElementById('spoilerWarning').checked,
                fanFavorite: document.getElementById('fanFavorite').checked,
                customSlug: document.getElementById('customSlug').value.trim(),
                updatedAt: new Date().toISOString(),
                createdAt: this.currentEntry?.createdAt || new Date().toISOString()
            };

            // Validation
            if (!formData.title) {
                this.showNotification('Please enter a title', 'error');
                return;
            }

            if (!formData.category) {
                this.showNotification('Please select a category', 'error');
                return;
            }

            // Save or update entry
            if (this.currentEntry) {
                const index = this.entries.findIndex(e => e.id === this.currentEntry.id);
                if (index !== -1) {
                    this.entries[index] = formData;
                }
            } else {
                this.entries.push(formData);
            }

            await this.saveEntries();
            this.updateStats();
            this.renderContent();
            this.closeEditor();
            
            this.showNotification(`Entry ${this.currentEntry ? 'updated' : 'created'} successfully!`);

        } catch (error) {
            console.error('❌ Error saving entry:', error);
            this.showNotification('Error saving entry', 'error');
        }
    }

    static async saveAsDraft() {
        // Temporarily set status to draft
        const originalStatus = document.getElementById('entryStatus').value;
        document.getElementById('entryStatus').value = 'draft';
        
        await this.saveEntry();
        
        // Restore original status
        document.getElementById('entryStatus').value = originalStatus;
    }

    static deleteEntry(entryId) {
        if (confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
            this.entries = this.entries.filter(e => e.id !== entryId);
            this.saveEntries();
            this.updateStats();
            this.renderContent();
            this.showNotification('Entry deleted successfully');
        }
    }

    static duplicateEntry(entryId) {
        const entry = this.entries.find(e => e.id === entryId);
        if (entry) {
            const duplicate = {
                ...entry,
                id: 'entry_' + Date.now(),
                title: entry.title + ' (Copy)',
                status: 'draft',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            this.entries.push(duplicate);
            this.saveEntries();
            this.updateStats();
            this.renderContent();
            this.showNotification('Entry duplicated successfully');
        }
    }

    static previewEntry(entryId) {
        const entry = this.entries.find(e => e.id === entryId);
        if (entry) {
            const previewContent = document.getElementById('previewContent');
            previewContent.innerHTML = `
                <div class="preview-header">
                    <div class="preview-category">${this.getCategoryIcon(entry.category)} ${entry.category}</div>
                    <h1>${entry.title}</h1>
                    ${entry.subtitle ? `<p class="preview-subtitle">${entry.subtitle}</p>` : ''}
                    <div class="preview-meta">
                        <span class="status status-${entry.status}">${entry.status}</span>
                        <span class="importance importance-${entry.importance}">${entry.importance} importance</span>
                        ${entry.fanFavorite ? '<span class="fan-favorite">⭐ Fan Favorite</span>' : ''}
                        ${entry.spoilerWarning ? '<span class="spoiler-warning">⚠️ Contains Spoilers</span>' : ''}
                    </div>
                </div>
                <div class="preview-body">
                    <div class="content">${this.formatContent(entry.content)}</div>
                    ${entry.tags.length > 0 ? `
                        <div class="tags-section">
                            <h4>Tags:</h4>
                            <div class="tags">
                                ${entry.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    ${entry.relatedEntries ? `
                        <div class="related-section">
                            <h4>Related Entries:</h4>
                            <p>${entry.relatedEntries}</p>
                        </div>
                    ` : ''}
                </div>
            `;
            
            this.currentEntry = entry;
            document.getElementById('previewModal').classList.add('active');
        }
    }

    static closePreview() {
        document.getElementById('previewModal').classList.remove('active');
        this.currentEntry = null;
    }

    static editFromPreview() {
        this.closePreview();
        this.showEditor(this.currentEntry);
    }

    static formatContent(content) {
        if (!content) return '';
        
        // Simple markdown-like formatting
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    static getCategoryIcon(category) {
        const icons = {
            characters: '👤',
            locations: '🏰',
            cultures: '🏛️',
            magic: '✨',
            history: '📚',
            technology: '⚙️',
            religion: '⛪',
            politics: '👑'
        };
        return icons[category] || '📝';
    }

    static renderContent() {
        const entries = this.getFilteredEntries();
        
        if (entries.length === 0) {
            document.getElementById('emptyState').style.display = 'block';
            document.getElementById('contentGrid').style.display = 'none';
            document.getElementById('contentList').style.display = 'none';
            return;
        }

        document.getElementById('emptyState').style.display = 'none';

        if (this.currentView === 'grid') {
            this.renderGrid(entries);
            document.getElementById('contentGrid').style.display = 'grid';
            document.getElementById('contentList').style.display = 'none';
        } else {
            this.renderList(entries);
            document.getElementById('contentList').style.display = 'block';
            document.getElementById('contentGrid').style.display = 'none';
        }
    }

    static renderGrid(entries) {
        const container = document.getElementById('contentGrid');
        container.innerHTML = entries.map(entry => `
            <div class="entry-card" data-id="${entry.id}">
                <div class="card-header">
                    <div class="entry-category">
                        <span class="category-icon">${this.getCategoryIcon(entry.category)}</span>
                        <span class="category-name">${entry.category}</span>
                    </div>
                    <div class="card-actions">
                        <input type="checkbox" class="entry-select" data-id="${entry.id}" onchange="WorldbuildingManager.toggleSelection('${entry.id}', this.checked)">
                    </div>
                </div>
                
                <div class="card-content">
                    <h3 class="entry-title">${entry.title}</h3>
                    ${entry.subtitle ? `<p class="entry-subtitle">${entry.subtitle}</p>` : ''}
                    <div class="entry-preview">${this.truncateText(entry.content, 120)}</div>
                </div>
                
                <div class="card-footer">
                    <div class="entry-meta">
                        <span class="status status-${entry.status}">${entry.status}</span>
                        <span class="importance importance-${entry.importance}">${entry.importance}</span>
                        ${entry.fanFavorite ? '<span class="fan-favorite-badge">⭐</span>' : ''}
                        ${entry.spoilerWarning ? '<span class="spoiler-badge">⚠️</span>' : ''}
                    </div>
                    
                    <div class="card-actions">
                        <button class="action-btn" onclick="WorldbuildingManager.previewEntry('${entry.id}')" title="Preview">👁️</button>
                        <button class="action-btn" onclick="WorldbuildingManager.showEditor(${JSON.stringify(entry).replace(/"/g, '&quot;')})" title="Edit">✏️</button>
                        <button class="action-btn" onclick="WorldbuildingManager.duplicateEntry('${entry.id}')" title="Duplicate">📋</button>
                        <button class="action-btn danger" onclick="WorldbuildingManager.deleteEntry('${entry.id}')" title="Delete">🗑️</button>
                    </div>
                </div>
                
                ${entry.tags.length > 0 ? `
                    <div class="entry-tags">
                        ${entry.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
                        ${entry.tags.length > 3 ? `<span class="tag-more">+${entry.tags.length - 3}</span>` : ''}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    static renderList(entries) {
        const container = document.getElementById('contentList');
        container.innerHTML = `
            <div class="list-header">
                <div class="list-cell select-cell">
                    <input type="checkbox" id="selectAll" onchange="WorldbuildingManager.toggleSelectAll(this.checked)">
                </div>
                <div class="list-cell title-cell">Title</div>
                <div class="list-cell category-cell">Category</div>
                <div class="list-cell status-cell">Status</div>
                <div class="list-cell date-cell">Updated</div>
                <div class="list-cell actions-cell">Actions</div>
            </div>
            ${entries.map(entry => `
                <div class="list-row" data-id="${entry.id}">
                    <div class="list-cell select-cell">
                        <input type="checkbox" class="entry-select" data-id="${entry.id}" onchange="WorldbuildingManager.toggleSelection('${entry.id}', this.checked)">
                    </div>
                    <div class="list-cell title-cell">
                        <div class="entry-title-info">
                            <h4>${entry.title}</h4>
                            ${entry.subtitle ? `<p class="subtitle">${entry.subtitle}</p>` : ''}
                        </div>
                    </div>
                    <div class="list-cell category-cell">
                        <span class="category-badge">
                            ${this.getCategoryIcon(entry.category)} ${entry.category}
                        </span>
                    </div>
                    <div class="list-cell status-cell">
                        <span class="status status-${entry.status}">${entry.status}</span>
                    </div>
                    <div class="list-cell date-cell">
                        ${new Date(entry.updatedAt).toLocaleDateString()}
                    </div>
                    <div class="list-cell actions-cell">
                        <button class="action-btn small" onclick="WorldbuildingManager.previewEntry('${entry.id}')" title="Preview">👁️</button>
                        <button class="action-btn small" onclick="WorldbuildingManager.showEditor(${JSON.stringify(entry).replace(/"/g, '&quot;')})" title="Edit">✏️</button>
                        <button class="action-btn small" onclick="WorldbuildingManager.duplicateEntry('${entry.id}')" title="Duplicate">📋</button>
                        <button class="action-btn small danger" onclick="WorldbuildingManager.deleteEntry('${entry.id}')" title="Delete">🗑️</button>
                    </div>
                </div>
            `).join('')}
        `;
    }

    static getFilteredEntries() {
        let filtered = [...this.entries];
        
        // Category filter
        const categoryFilter = document.getElementById('categoryFilter').value;
        if (categoryFilter) {
            filtered = filtered.filter(entry => entry.category === categoryFilter);
        }
        
        // Status filter
        const statusFilter = document.getElementById('statusFilter').value;
        if (statusFilter) {
            filtered = filtered.filter(entry => entry.status === statusFilter);
        }
        
        // Search filter
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(entry => 
                entry.title.toLowerCase().includes(searchTerm) ||
                entry.content.toLowerCase().includes(searchTerm) ||
                entry.tags.some(tag => tag.toLowerCase().includes(searchTerm))
            );
        }
        
        // Sort by importance and then by updated date
        filtered.sort((a, b) => {
            const importanceOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            const importanceA = importanceOrder[a.importance] || 2;
            const importanceB = importanceOrder[b.importance] || 2;
            
            if (importanceA !== importanceB) {
                return importanceB - importanceA;
            }
            
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        });
        
        return filtered;
    }

    static updateStats() {
        const total = this.entries.length;
        const published = this.entries.filter(e => e.status === 'published').length;
        const drafts = this.entries.filter(e => e.status === 'draft').length;
        
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recentlyUpdated = this.entries.filter(e => new Date(e.updatedAt) > weekAgo).length;
        
        document.getElementById('totalEntries').textContent = total;
        document.getElementById('publishedCount').textContent = published;
        document.getElementById('draftCount').textContent = drafts;
        document.getElementById('recentlyUpdated').textContent = recentlyUpdated;
    }

    static truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // Template and formatting functions
    static insertTemplate(type) {
        const textarea = document.getElementById('entryContent');
        const template = this.templates[type];
        
        if (template) {
            const currentValue = textarea.value;
            const newValue = currentValue + (currentValue ? '\n\n' : '') + template;
            textarea.value = newValue;
            textarea.focus();
        }
    }

    static formatText(command) {
        const textarea = document.getElementById('entryContent');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        
        let formattedText = '';
        switch (command) {
            case 'bold':
                formattedText = `**${selectedText}**`;
                break;
            case 'italic':
                formattedText = `*${selectedText}*`;
                break;
            case 'underline':
                formattedText = `__${selectedText}__`;
                break;
        }
        
        textarea.value = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end);
        textarea.focus();
    }

    static createQuickEntry(category, title) {
        document.getElementById('entryCategory').value = category;
        document.getElementById('entryTitle').value = title;
        this.showEditor();
    }

    // Selection and bulk operations
    static toggleSelection(entryId, isSelected) {
        if (isSelected) {
            this.selectedEntries.add(entryId);
        } else {
            this.selectedEntries.delete(entryId);
        }
        this.updateBulkActions();
    }

    static toggleSelectAll(selectAll) {
        const checkboxes = document.querySelectorAll('.entry-select');
        checkboxes.forEach(cb => {
            cb.checked = selectAll;
            this.toggleSelection(cb.dataset.id, selectAll);
        });
    }

    static updateBulkActions() {
        const bulkActions = document.getElementById('bulkActions');
        const count = this.selectedEntries.size;
        
        if (count > 0) {
            bulkActions.style.display = 'flex';
            bulkActions.querySelector('.bulk-count').textContent = `${count} selected`;
        } else {
            bulkActions.style.display = 'none';
        }
    }

    static bulkPublish() {
        if (this.selectedEntries.size === 0) return;
        
        this.selectedEntries.forEach(entryId => {
            const entry = this.entries.find(e => e.id === entryId);
            if (entry) {
                entry.status = 'published';
                entry.updatedAt = new Date().toISOString();
            }
        });
        
        this.saveEntries();
        this.renderContent();
        this.updateStats();
        this.selectedEntries.clear();
        this.updateBulkActions();
        this.showNotification(`${this.selectedEntries.size} entries published`);
    }

    static bulkArchive() {
        if (this.selectedEntries.size === 0) return;
        
        this.selectedEntries.forEach(entryId => {
            const entry = this.entries.find(e => e.id === entryId);
            if (entry) {
                entry.status = 'draft';
                entry.updatedAt = new Date().toISOString();
            }
        });
        
        this.saveEntries();
        this.renderContent();
        this.updateStats();
        this.selectedEntries.clear();
        this.updateBulkActions();
        this.showNotification(`${this.selectedEntries.size} entries archived`);
    }

    static bulkDelete() {
        if (this.selectedEntries.size === 0) return;
        
        if (confirm(`Are you sure you want to delete ${this.selectedEntries.size} entries? This action cannot be undone.`)) {
            this.entries = this.entries.filter(e => !this.selectedEntries.has(e.id));
            this.saveEntries();
            this.renderContent();
            this.updateStats();
            this.selectedEntries.clear();
            this.updateBulkActions();
            this.showNotification(`${this.selectedEntries.size} entries deleted`);
        }
    }

    // Collapsible sections
    static toggleSection(header) {
        const content = header.nextElementSibling;
        const icon = header.querySelector('.toggle-icon');
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            icon.textContent = '▼';
        } else {
            content.style.display = 'none';
            icon.textContent = '▶';
        }
    }

    // Utility functions
    static showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            z-index: 10000;
            opacity: 0;
            transform: translateX(100px);
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100px)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if on admin page
    if (window.location.pathname.includes('/admin/worldbuilding/')) {
        WorldbuildingManager.initialize();
    } else {
        console.log('Not on worldbuilding page, skipping admin panel display');
    }
});

// Make globally available
window.WorldbuildingManager = WorldbuildingManager;

console.log('✅ Worldbuilding Manager script loaded');

// Events Management JavaScript with Priority 3 enhancements

class EventsManager {
    static currentUser = null;
    static events = [];
    static categories = ['book-signing', 'conference', 'workshop', 'virtual-event', 'release-party', 'interview', 'other'];

    static async initialize() {
        console.log('📅 Initializing Events Manager...');

        try {
            await AuthSystem.initialize();

            if (!AuthSystem.isAuthenticated()) {
                this.showNotAuthenticatedState();
                return;
            }

            this.currentUser = AuthSystem.getCurrentUser();

            if (!this.currentUser.features?.events?.purchased) {
                this.showFeatureNotAvailable();
                return;
            }

            await this.loadUserData();
            this.showEventsManagement();
            this.loadEvents();
            this.setupFormHandler();

            console.log('✅ Events Manager initialized successfully');

        } catch (error) {
            console.error('❌ Events Manager initialization failed:', error);
        }
    }

    static async loadUserData() {
        try {
            const userData = await UserDatabase.getUser(this.currentUser.email);
            if (userData) {
                this.currentUser = userData;
                this.events = userData.events || [];
            }
        } catch (error) {
            console.error('❌ Failed to load user data:', error);
        }
    }

    static showNotAuthenticatedState() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('notAuthenticatedState').style.display = 'flex';
        document.getElementById('eventsManagement').style.display = 'none';
    }

    static showFeatureNotAvailable() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('featureNotAvailable').style.display = 'flex';
        document.getElementById('eventsManagement').style.display = 'none';
    }

    static showEventsManagement() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('notAuthenticatedState').style.display = 'none';
        document.getElementById('featureNotAvailable').style.display = 'none';
        document.getElementById('eventsManagement').style.display = 'block';
    }

    static loadEvents() {
        this.renderEvents();
        this.updateStats();
        this.populateFilters();
    }

    static updateStats() {
        const totalEvents = this.events.length;
        const upcomingEvents = this.events.filter(event => new Date(event.date) > new Date()).length;
        const pastEvents = this.events.filter(event => new Date(event.date) <= new Date()).length;

        document.getElementById('totalEvents').textContent = totalEvents;
        document.getElementById('upcomingEvents').textContent = upcomingEvents;
        document.getElementById('pastEvents').textContent = pastEvents;
    }

    static populateFilters() {
        const categoryFilter = document.getElementById('categoryFilter');
        const statusFilter = document.getElementById('statusFilter');

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

    static createEvent() {
        this.showEventEditor('Create New Event');
        this.clearEventForm();
    }

    static showEventEditor(title) {
        document.getElementById('eventEditorModal').classList.add('active');
        document.getElementById('editorTitle').textContent = title;
    }

    static closeEventEditor() {
        document.getElementById('eventEditorModal').classList.remove('active');
    }

    static clearEventForm() {
        document.getElementById('eventForm').reset();
        document.getElementById('eventId').value = '';
    }

    static async saveEvent() {
        try {
            const form = document.getElementById('eventForm');
            const formData = new FormData(form);

            const eventData = {
                title: formData.get('eventTitle'),
                description: formData.get('eventDescription'),
                date: formData.get('eventDate'),
                time: formData.get('eventTime'),
                location: formData.get('eventLocation'),
                category: formData.get('eventCategory'),
                isVirtual: formData.get('isVirtual') === 'on',
                virtualLink: formData.get('virtualLink'),
                registrationLink: formData.get('registrationLink'),
                maxAttendees: parseInt(formData.get('maxAttendees')) || null,
                status: formData.get('eventStatus'),
                notes: formData.get('eventNotes')
            };

            if (!eventData.title) {
                this.showNotification('Please enter an event title', 'error');
                return;
            }

            if (!eventData.date) {
                this.showNotification('Please select an event date', 'error');
                return;
            }

            const eventId = formData.get('eventId');

            if (eventId) {
                // Edit existing event
                const eventIndex = this.events.findIndex(e => e.id === eventId);
                if (eventIndex >= 0) {
                    this.events[eventIndex] = {
                        ...this.events[eventIndex],
                        ...eventData,
                        updatedAt: new Date().toISOString()
                    };
                }
            } else {
                // Create new event
                const newEvent = {
                    id: 'event_' + Date.now(),
                    ...eventData,
                    createdAt: new Date().toISOString()
                };
                this.events.unshift(newEvent);
            }

            // Update database
            await UserDatabase.updateUser(this.currentUser.email, { 
                events: this.events 
            });

            this.currentUser.events = this.events;
            this.loadEvents();
            this.closeEventEditor();

            this.showNotification(
                eventId ? 'Event updated successfully!' : 'Event created successfully!',
                'success'
            );

        } catch (error) {
            console.error('❌ Failed to save event:', error);
            this.showNotification('Failed to save event', 'error');
        }
    }

    static editEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        this.showEventEditor('Edit Event');

        // Populate form
        document.getElementById('eventId').value = event.id;
        document.getElementById('eventTitle').value = event.title || '';
        document.getElementById('eventDescription').value = event.description || '';
        document.getElementById('eventDate').value = event.date || '';
        document.getElementById('eventTime').value = event.time || '';
        document.getElementById('eventLocation').value = event.location || '';
        document.getElementById('eventCategory').value = event.category || '';
        document.getElementById('isVirtual').checked = event.isVirtual || false;
        document.getElementById('virtualLink').value = event.virtualLink || '';
        document.getElementById('registrationLink').value = event.registrationLink || '';
        document.getElementById('maxAttendees').value = event.maxAttendees || '';
        document.getElementById('eventStatus').value = event.status || 'draft';
        document.getElementById('eventNotes').value = event.notes || '';

        this.toggleVirtualFields();
    }

    static toggleVirtualFields() {
        const isVirtual = document.getElementById('isVirtual').checked;
        const virtualFields = document.getElementById('virtualFields');

        if (isVirtual) {
            virtualFields.style.display = 'block';
        } else {
            virtualFields.style.display = 'none';
        }
    }

    static renderEvents() {
        const eventsContainer = document.getElementById('eventsContainer');

        if (this.events.length === 0) {
            eventsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No events scheduled</h3>
                    <p>Start planning your author events and book signings</p>
                    <button onclick="EventsManager.createEvent()" class="add-btn">Schedule Your First Event</button>
                </div>
            `;
            return;
        }

        eventsContainer.innerHTML = this.events.map(event => `
            <div class="event-item" data-event-id="${event.id}">
                <div class="event-header">
                    <h4 class="event-title">${event.title}</h4>
                    <span class="event-status ${event.status || 'draft'}">${event.status || 'draft'}</span>
                </div>
                <div class="event-meta">
                    <span>📅 ${new Date(event.date).toLocaleDateString()}</span>
                    ${event.time ? `<span>🕐 ${event.time}</span>` : ''}
                    <span>📍 ${event.isVirtual ? 'Virtual Event' : event.location || 'TBD'}</span>
                    ${event.category ? `<span>🏷️ ${this.formatCategoryName(event.category)}</span>` : ''}
                </div>
                ${event.description ? `<p class="event-description">${event.description}</p>` : ''}
                <div class="event-actions">
                    <button class="preview-btn" onclick="EventsManager.previewEvent('${event.id}')">👁️ Preview</button>
                    <button class="edit-btn" onclick="EventsManager.editEvent('${event.id}')">Edit</button>
                    <button class="delete-btn" onclick="EventsManager.deleteEvent('${event.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    static async deleteEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        if (!confirm(`Are you sure you want to delete "${event.title}"?`)) {
            return;
        }

        try {
            this.events = this.events.filter(e => e.id !== eventId);

            await UserDatabase.updateUser(this.currentUser.email, { 
                events: this.events 
            });

            this.currentUser.events = this.events;
            this.loadEvents();

            this.showNotification('Event deleted successfully!', 'success');

        } catch (error) {
            console.error('❌ Failed to delete event:', error);
            this.showNotification('Failed to delete event', 'error');
        }
    }

    static previewEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        this.showPreviewModal(event);
    }

    static showPreviewModal(event) {
        let modal = document.getElementById('previewModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'previewModal';
            modal.className = 'preview-modal';
            modal.innerHTML = `
                <div class="preview-content">
                    <div class="preview-header">
                        <h2 id="previewTitle"></h2>
                        <button class="preview-close" onclick="EventsManager.closePreviewModal()">&times;</button>
                    </div>
                    <div class="preview-body" id="previewBody"></div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        const eventDate = new Date(event.date);
        const previewContent = `
            <div class="event-preview">
                <div class="event-detail">
                    <strong>Date:</strong> ${eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                ${event.time ? `<div class="event-detail"><strong>Time:</strong> ${event.time}</div>` : ''}
                <div class="event-detail">
                    <strong>Location:</strong> ${event.isVirtual ? 'Virtual Event' : event.location || 'TBD'}
                </div>
                ${event.category ? `<div class="event-detail"><strong>Category:</strong> ${this.formatCategoryName(event.category)}</div>` : ''}
                ${event.description ? `<div class="event-detail"><strong>Description:</strong><br>${event.description}</div>` : ''}
                ${event.virtualLink ? `<div class="event-detail"><strong>Event Link:</strong> <a href="${event.virtualLink}" target="_blank">${event.virtualLink}</a></div>` : ''}
                ${event.registrationLink ? `<div class="event-detail"><strong>Registration:</strong> <a href="${event.registrationLink}" target="_blank">${event.registrationLink}</a></div>` : ''}
                ${event.maxAttendees ? `<div class="event-detail"><strong>Max Attendees:</strong> ${event.maxAttendees}</div>` : ''}
            </div>
        `;

        document.getElementById('previewTitle').textContent = event.title;
        document.getElementById('previewBody').innerHTML = previewContent;

        modal.classList.add('active');
    }

    static closePreviewModal() {
        const modal = document.getElementById('previewModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    static filterEvents() {
        const categoryFilter = document.getElementById('categoryFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;

        let filteredEvents = this.events;

        if (categoryFilter) {
            filteredEvents = filteredEvents.filter(event => event.category === categoryFilter);
        }

        if (statusFilter) {
            if (statusFilter === 'upcoming') {
                filteredEvents = filteredEvents.filter(event => new Date(event.date) > new Date());
            } else if (statusFilter === 'past') {
                filteredEvents = filteredEvents.filter(event => new Date(event.date) <= new Date());
            } else {
                filteredEvents = filteredEvents.filter(event => event.status === statusFilter);
            }
        }

        this.displayFilteredEvents(filteredEvents);
    }

    static displayFilteredEvents(events) {
        const eventsContainer = document.getElementById('eventsContainer');

        if (events.length === 0) {
            eventsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No events found</h3>
                    <p>Try adjusting your filters or create your first event.</p>
                </div>
            `;
            return;
        }

        eventsContainer.innerHTML = events.map(event => `
            <div class="event-item" data-event-id="${event.id}">
                <div class="event-header">
                    <h4 class="event-title">${event.title}</h4>
                    <span class="event-status ${event.status || 'draft'}">${event.status || 'draft'}</span>
                </div>
                <div class="event-meta">
                    <span>📅 ${new Date(event.date).toLocaleDateString()}</span>
                    ${event.time ? `<span>🕐 ${event.time}</span>` : ''}
                    <span>📍 ${event.isVirtual ? 'Virtual Event' : event.location || 'TBD'}</span>
                    ${event.category ? `<span>🏷️ ${this.formatCategoryName(event.category)}</span>` : ''}
                </div>
                ${event.description ? `<p class="event-description">${event.description}</p>` : ''}
                <div class="event-actions">
                    <button class="preview-btn" onclick="EventsManager.previewEvent('${event.id}')">👁️ Preview</button>
                    <button class="edit-btn" onclick="EventsManager.editEvent('${event.id}')">Edit</button>
                    <button class="delete-btn" onclick="EventsManager.deleteEvent('${event.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    static setupFormHandler() {
        document.getElementById('eventForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveEvent();
        });

        // Setup virtual event toggle
        document.getElementById('isVirtual').addEventListener('change', () => {
            this.toggleVirtualFields();
        });

        // Setup filters
        document.getElementById('categoryFilter').addEventListener('change', () => {
            this.filterEvents();
        });

        document.getElementById('statusFilter').addEventListener('change', () => {
            this.filterEvents();
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
    EventsManager.initialize();
});

AuthSystem.onAuthStateChanged = function(user) {
    if (user) {
        EventsManager.currentUser = user;
        EventsManager.initialize();
    } else {
        EventsManager.showNotAuthenticatedState();
    }
};

window.EventsManager = EventsManager;
window.toggleMobileMenu = toggleMobileMenu;
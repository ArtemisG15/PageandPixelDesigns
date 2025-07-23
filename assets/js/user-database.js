
<line_number>1</line_number>
// User Database API Interface
// Handles all user data operations with the backend

class UserDatabase {
    static baseUrl = window.location.origin;
    
    // Get user data by email
    static async getUser(email) {
        try {
            const response = await fetch(`${this.baseUrl}/api/users/${encodeURIComponent(email)}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    return null; // User not found
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data.user;
            
        } catch (error) {
            console.error('❌ Get user error:', error);
            throw error;
        }
    }
    
    // Create new user
    static async createUser(userData) {
        try {
            const response = await fetch(`${this.baseUrl}/api/users/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to create user');
            }
            
            return data.user;
            
        } catch (error) {
            console.error('❌ Create user error:', error);
            throw error;
        }
    }
    
    // Authenticate user
    static async authenticateUser(email, password) {
        try {
            const response = await fetch(`${this.baseUrl}/api/users/authenticate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Authentication failed');
            }
            
            return data.user;
            
        } catch (error) {
            console.error('❌ Authentication error:', error);
            throw error;
        }
    }
    
    // Update user data
    static async updateUser(email, updates) {
        try {
            const response = await fetch(`${this.baseUrl}/api/users/${encodeURIComponent(email)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to update user');
            }
            
            return data.user;
            
        } catch (error) {
            console.error('❌ Update user error:', error);
            throw error;
        }
    }
    
    // Health check
    static async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl}/api/health`);
            
            if (!response.ok) {
                throw new Error(`Health check failed: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
            
        } catch (error) {
            console.error('❌ Health check error:', error);
            throw error;
        }
    }
}

// Make globally available
window.UserDatabase = UserDatabase;

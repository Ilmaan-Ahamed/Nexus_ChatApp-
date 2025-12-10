// Chat Application Class
class NexusChat {
    constructor() {
        this.ws = null;
        this.username = '';
        this.currentRoom = '';
        this.isConnected = false;
        this.messageQueue = [];
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadTheme();
        this.updateConnectionStatus(false);
    }
    
    // Event Binding
    bindEvents() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        // Message sending
        document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Header buttons
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('menuToggle').addEventListener('click', () => this.toggleSidebar());
        
        // Settings button
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
        
        // Add room button
        document.getElementById('addRoomBtn').addEventListener('click', () => this.showAddRoomModal());
        
        // Sidebar overlay click (mobile)
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && !e.target.closest('.chat-sidebar') && !e.target.closest('.menu-toggle')) {
                this.closeSidebar();
            }
        });
        
        // Window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                this.closeSidebar();
            }
        });
    }
    
    // WebSocket Connection
    connectWebSocket() {
        try {
            this.ws = new WebSocket('ws://localhost:2024');
            
            this.ws.onopen = () => {
                console.log('Connected to chat server');
                this.updateConnectionStatus(true);
                this.isConnected = true;
                
                // Send login message
                this.sendWebSocketMessage({
                    type: 'login',
                    username: this.username
                });
                
                // Join room
                this.joinRoom(this.currentRoom);
                
                // Process queued messages
                this.processMessageQueue();
                
                this.showToast('Connected to server', 'success');
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.showToast('Connection error occurred', 'error');
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket connection closed');
                this.updateConnectionStatus(false);
                this.isConnected = false;
                this.showToast('Disconnected from server', 'error');
                
                // Attempt reconnection after 3 seconds
                setTimeout(() => {
                    if (!this.isConnected && this.username) {
                        this.connectWebSocket();
                    }
                }, 3000);
            };
            
        } catch (error) {
            console.error('Failed to connect:', error);
            this.showToast('Failed to connect to server', 'error');
        }
    }
    
    // Send WebSocket Message
    sendWebSocketMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            // Queue message if not connected
            this.messageQueue.push(message);
        }
    }
    
    // Process Queued Messages
    processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.sendWebSocketMessage(message);
        }
    }
    
    // Handle WebSocket Messages
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'system':
                this.displaySystemMessage(data.message);
                break;
            case 'message':
                this.displayChatMessage(data);
                break;
            case 'history':
                this.displayHistory(data.messages);
                break;
            case 'who':
                this.updateMembersList(data.members);
                break;
            case 'rooms':
                this.updateRoomsList(data.rooms);
                break;
            case 'error':
                this.showToast(data.message, 'error');
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }
    
    // Login Handler
    handleLogin() {
        const usernameInput = document.getElementById('usernameInput');
        const roomInput = document.getElementById('roomInput');
        
        const username = usernameInput.value.trim();
        const room = roomInput.value.trim();
        
        if (!username || !room) {
            this.showToast('Please enter both username and room name', 'error');
            return;
        }
        
        this.username = username;
        this.currentRoom = room;
        
        // Hide login modal and show chat interface
        this.hideLoginModal();
        this.showChatInterface();
        
        // Connect to WebSocket
        this.connectWebSocket();
        
        // Update room display
        this.updateCurrentRoomDisplay();
    }
    
    // Join Room
    joinRoom(roomName) {
        if (!roomName || roomName === this.currentRoom) return;
        
        const previousRoom = this.currentRoom;
        this.currentRoom = roomName;
        
        this.sendWebSocketMessage({
            type: 'join',
            room: roomName
        });
        
        this.updateCurrentRoomDisplay();
        this.clearMessages();
        
        // Request room members
        this.requestRoomMembers();
        
        if (previousRoom) {
            this.showToast(`Switched to room: ${roomName}`, 'info');
        }
    }
    
    // Send Message
    sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        
        if (!message || !this.currentRoom) return;
        
        this.sendWebSocketMessage({
            type: 'publish',
            room: this.currentRoom,
            message: message
        });
        
        input.value = '';
        this.updateSendButton();
    }
    
    // Display Messages
    displayChatMessage(data) {
        const messagesContainer = document.getElementById('messagesContainer');
        const isOwn = data.user === this.username;
        
        // Remove welcome message if it exists
        const welcomeMessage = messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isOwn ? 'own' : ''}`;
        
        const timestamp = new Date(data.timestamp || Date.now()).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        messageElement.innerHTML = `
            <div class="message-content">
                ${!isOwn ? `<div class="message-author">${this.escapeHtml(data.user)}</div>` : ''}
                <div class="message-text">${this.escapeHtml(data.message)}</div>
                <div class="message-meta">
                    <span class="message-time">${timestamp}</span>
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }
    
    displaySystemMessage(message) {
        const messagesContainer = document.getElementById('messagesContainer');
        
        const messageElement = document.createElement('div');
        messageElement.className = 'message system';
        messageElement.innerHTML = `
            <div class="message-content">
                ${this.escapeHtml(message)}
            </div>
        `;
        
        messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }
    
    displayHistory(messages) {
        messages.forEach(msg => {
            this.displayChatMessage(msg);
        });
    }
    
    // Update UI Elements
    updateRoomsList(rooms) {
        const roomsList = document.getElementById('roomsList');
        
        if (!rooms || rooms.length === 0) {
            roomsList.innerHTML = '<div class="room-item loading">No rooms available</div>';
            return;
        }
        
        roomsList.innerHTML = rooms.map(room => `
            <div class="room-item ${room === this.currentRoom ? 'active' : ''}" data-room="${room}">
                <i class="fas fa-hashtag"></i>
                ${this.escapeHtml(room)}
            </div>
        `).join('');
        
        // Add click listeners
        roomsList.querySelectorAll('.room-item').forEach(item => {
            if (!item.classList.contains('loading')) {
                item.addEventListener('click', () => {
                    const roomName = item.dataset.room;
                    if (roomName !== this.currentRoom) {
                        this.joinRoom(roomName);
                    }
                });
            }
        });
    }
    
    updateMembersList(members) {
        const membersList = document.getElementById('membersList');
        const onlineCount = document.getElementById('onlineCount');
        
        if (!members || members.length === 0) {
            membersList.innerHTML = '<div class="member-item loading">No members online</div>';
            onlineCount.textContent = '0 members online';
            return;
        }
        
        membersList.innerHTML = members.map(member => `
            <div class="member-item">
                ${this.escapeHtml(member)}
            </div>
        `).join('');
        
        onlineCount.textContent = `${members.length} member${members.length === 1 ? '' : 's'} online`;
    }
    
    updateCurrentRoomDisplay() {
        const roomNameElement = document.getElementById('currentRoomName');
        roomNameElement.textContent = this.currentRoom || 'No Room';
    }
    
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        const indicator = statusElement.querySelector('.status-indicator');
        
        indicator.className = `status-indicator ${connected ? 'online' : 'offline'}`;
        indicator.innerHTML = `
            <i class="fas fa-circle"></i>
            <span>${connected ? 'Connected' : 'Disconnected'}</span>
        `;
    }
    
    updateSendButton() {
        const sendBtn = document.getElementById('sendBtn');
        const messageInput = document.getElementById('messageInput');
        const hasMessage = messageInput.value.trim().length > 0;
        
        sendBtn.disabled = !hasMessage || !this.isConnected;
    }
    
    // UI Actions
    showChatInterface() {
        document.getElementById('chatInterface').classList.add('active');
    }
    
    hideLoginModal() {
        document.getElementById('loginModal').classList.remove('active');
    }
    
    showLoginModal() {
        document.getElementById('loginModal').classList.add('active');
        document.getElementById('chatInterface').classList.remove('active');
    }
    
    toggleSidebar() {
        const sidebar = document.getElementById('chatSidebar');
        sidebar.classList.toggle('open');
    }
    
    closeSidebar() {
        const sidebar = document.getElementById('chatSidebar');
        sidebar.classList.remove('open');
    }
    
    clearMessages() {
        const messagesContainer = document.getElementById('messagesContainer');
        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <i class="fas fa-rocket"></i>
                <h3>Welcome to ${this.currentRoom}!</h3>
                <p>Start chatting with your team</p>
            </div>
        `;
    }
    
    scrollToBottom() {
        const messagesContainer = document.getElementById('messagesContainer');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Theme Management
    toggleTheme() {
        const body = document.body;
        const isDark = body.classList.contains('dark');
        const themeIcon = document.querySelector('#themeToggle i');
        
        if (isDark) {
            body.classList.remove('dark');
            themeIcon.className = 'fas fa-moon';
            localStorage.setItem('theme', 'light');
        } else {
            body.classList.add('dark');
            themeIcon.className = 'fas fa-sun';
            localStorage.setItem('theme', 'dark');
        }
    }
    
    loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        const themeIcon = document.querySelector('#themeToggle i');
        
        if (savedTheme === 'dark') {
            document.body.classList.add('dark');
            themeIcon.className = 'fas fa-sun';
        } else {
            themeIcon.className = 'fas fa-moon';
        }
    }
    
    // Toast Notifications
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'check-circle' : 
                    type === 'error' ? 'exclamation-circle' : 'info-circle';
        
        toast.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${this.escapeHtml(message)}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOutToast 0.3s ease-out forwards';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toastContainer.removeChild(toast);
                    }
                }, 300);
            }
        }, 4000);
    }
    
    // Modal Functions
    showAddRoomModal() {
        const roomName = prompt('Enter room name:');
        if (roomName && roomName.trim()) {
            this.joinRoom(roomName.trim());
        }
    }
    
    showSettings() {
        alert('Settings panel coming soon!');
    }
    
    // Utility Functions
    requestRoomMembers() {
        if (this.currentRoom) {
            this.sendWebSocketMessage({
                type: 'who',
                room: this.currentRoom
            });
        }
    }
    
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    logout() {
        if (!confirm('Are you sure you want to logout?')) {
            return;
        }
        
        // Close WebSocket connection
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        // Reset state
        this.username = '';
        this.currentRoom = '';
        this.isConnected = false;
        this.messageQueue = [];
        
        // Reset UI
        this.showLoginModal();
        this.clearMessages();
        this.updateMembersList([]);
        this.updateRoomsList([]);
        this.updateConnectionStatus(false);
        
        // Clear form fields
        document.getElementById('usernameInput').value = '';
        document.getElementById('roomInput').value = '';
        document.getElementById('messageInput').value = '';
        
        this.showToast('Logged out successfully', 'info');
    }
}

// Initialize the chat application
document.addEventListener('DOMContentLoaded', () => {
    window.nexusChat = new NexusChat();
    
    // Add real-time message input monitoring
    const messageInput = document.getElementById('messageInput');
    messageInput.addEventListener('input', () => {
        window.nexusChat.updateSendButton();
    });
    
    // Periodically request room members
    setInterval(() => {
        if (window.nexusChat.isConnected && window.nexusChat.currentRoom) {
            window.nexusChat.requestRoomMembers();
        }
    }, 30000); // Every 30 seconds
});// Chat Application Class
class NexusChat {
    constructor() {
        this.ws = null;
        this.username = '';
        this.currentRoom = '';
        this.isConnected = false;
        this.messageQueue = [];
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadTheme();
        this.updateConnectionStatus(false);
    }
    
    // Event Binding
    bindEvents() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        // Message sending
        document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Header buttons
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('menuToggle').addEventListener('click', () => this.toggleSidebar());
        
        // Settings button

        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings)}}

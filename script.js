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
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings)}}
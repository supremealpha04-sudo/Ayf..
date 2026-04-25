import { supabase } from './config/supabase.js';
import { checkAuth, logout } from './modules/auth.js';

// Global state
window.app = {
    currentUser: null,
    supabase: supabase
};

// Initialize app
async function init() {
    // Check authentication
    const user = await checkAuth();
    
    if (!user) {
        // Redirect to login if on protected page
        const protectedPages = ['home.html', 'parish.html', 'plan.html', 'profile.html', 'admin-dashboard.html'];
        const currentPage = window.location.pathname.split('/').pop();
        
        if (protectedPages.includes(currentPage) && currentPage !== 'index.html') {
            window.location.href = '/index.html';
        }
        return;
    }
    
    window.app.currentUser = user;
    
    // Check if admin and on admin page
    const isAdmin = user.role === 'admin';
    const onAdminPage = window.location.pathname.includes('admin-dashboard');
    
    if (onAdminPage && !isAdmin) {
        window.location.href = '/home.html';
    }
}

// Handle logout globally
window.handleLogout = async function() {
    await logout();
    window.location.href = '/index.html';
};

// Setup tab switching
function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            if (!tabId) return;
            
            // Update active tab button
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update active content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            const targetContent = document.getElementById(`${tabId}Tab`);
            if (targetContent) targetContent.classList.add('active');
        });
    });
}

// Setup modals
function setupModals() {
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeBtn.closest('.modal').classList.remove('active');
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
}

// Show loading
window.showLoading = function(container) {
    container.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading...</p>
        </div>
    `;
};

// Show toast notification
window.showToast = function(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? '#ea4335' : '#34a853'};
        color: white;
        padding: 12px 20px;
        border-radius: 40px;
        z-index: 2000;
        font-size: 14px;
        animation: slideUp 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
};

// Format date
window.formatDate = function(date) {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const days = diff / (1000 * 60 * 60 * 24);
    
    if (days < 1) {
        const hours = diff / (1000 * 60 * 60);
        if (hours < 1) {
            const mins = diff / (1000 * 60);
            return `${Math.floor(mins)}m ago`;
        }
        return `${Math.floor(hours)}h ago`;
    } else if (days < 7) {
        return `${Math.floor(days)}d ago`;
    } else {
        return d.toLocaleDateString();
    }
};

// Format time for chat
window.formatChatTime = function(date) {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Run initialization
document.addEventListener('DOMContentLoaded', () => {
    init();
    setupTabs();
    setupModals();
});

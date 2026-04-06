// Supabase Configuration
const SUPABASE_URL = 'https://jvfdcuvinlimurlttiqy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2ZmRjdXZpbmxpbXVybHR0aXF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0Njk0MTAsImV4cCI6MjA5MTA0NTQxMH0.ipezUsKqsEAbHvRqBLZYhagZj57rFJKG36uQL_4rFSg';

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global state
window.appState = {
    currentUser: null,
    currentProfile: null,
    currentRole: 'public',
    isASquared: false,
    leadershipTag: null,
    parish: null,
    notifications: []
};

// Helper function to show toast notifications
window.showToast = function(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#667eea'};
        color: white;
        border-radius: 10px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        font-family: 'Inter', sans-serif;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
};

// Check if user is authenticated
window.checkAuth = async function(redirectOnFail = true) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        window.appState.currentUser = session.user;
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
        window.appState.currentProfile = profile;
        window.appState.isASquared = profile?.is_a_squared || false;
        window.appState.leadershipTag = profile?.leadership_tag;
        window.appState.parish = profile?.parish;
        window.appState.currentRole = profile?.role === 'admin' ? 'admin' : 
                                     profile?.is_a_squared ? 'a-squared' : 
                                     profile?.parish ? 'parish' : 'user';
        return true;
    }
    if (redirectOnFail && !window.location.pathname.includes('auth.html')) {
        window.location.href = 'auth.html';
    }
    return false;
};

// Get current user
window.getCurrentUser = () => window.appState.currentUser;
window.getCurrentProfile = () => window.appState.currentProfile;

// Logout
window.logout = async function() {
    await supabaseClient.auth.signOut();
    window.location.href = 'auth.html';
};

// Create the style for toast animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);
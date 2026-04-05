// Authentication and user management
let currentUser = null;
let currentUserRole = 'public';
let currentUserParish = null;

// Check authentication status
async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        await fetchUserProfile(session.user.id);
        return true;
    }
    
    currentUser = null;
    currentUserRole = 'public';
    return false;
}

// Fetch user profile
async function fetchUserProfile(userId) {
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (data) {
        currentUserRole = data.role;
        currentUserParish = data.parish;
        
        // Check if user is A-Squared
        if (data.is_a_squared) {
            currentUserRole = 'a-squared';
        }
    }
}

// Login function
async function login(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });
    
    if (error) throw error;
    await checkAuth();
    return data;
}

// Register function
async function register(email, password, parish, requestASquared = false) {
    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password
    });
    
    if (error) throw error;
    
    // Create profile
    const { error: profileError } = await supabaseClient
        .from('profiles')
        .insert([{
            id: data.user.id,
            email: email,
            parish: parish,
            role: 'user',
            a_squared_requested: requestASquared,
            is_a_squared: false
        }]);
    
    if (profileError) throw profileError;
    
    return data;
}

// Logout function
async function logout() {
    const { error } = await supabaseClient.auth.signOut();
    if (!error) {
        currentUser = null;
        currentUserRole = 'public';
        window.location.href = '/index.html';
    }
}

// Check if user can interact (like/comment)
function canInteract() {
    return ['user', 'parish', 'a-squared', 'admin'].includes(currentUserRole);
}

// Check if admin
function isAdmin() {
    return currentUserRole === 'admin';
}

// Request A-Squared membership
async function requestASquared() {
    if (!currentUser) return;
    
    const { error } = await supabaseClient
        .from('profiles')
        .update({ a_squared_requested: true })
        .eq('id', currentUser.id);
    
    if (error) throw error;
    alert('A-Squared membership request sent to admin');
}

// Make functions available globally
window.auth = {
    checkAuth,
    login,
    register,
    logout,
    canInteract,
    isAdmin,
    requestASquared,
    getCurrentUser: () => currentUser,
    getCurrentRole: () => currentUserRole
};

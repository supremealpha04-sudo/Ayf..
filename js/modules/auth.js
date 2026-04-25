import { supabase, getCurrentUser, uploadFile } from '../config/supabase.js';

// Check authentication
export async function checkAuth() {
    const user = await getCurrentUser();
    
    // Update UI based on auth state
    const isLoggedIn = !!user;
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (logoutBtn) {
        logoutBtn.onclick = () => logout();
    }
    
    return user;
}

// Login
export async function login(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        const user = await getCurrentUser();
        
        if (user.status === 'suspended') {
            await logout();
            throw new Error('Your account has been suspended');
        }
        
        window.location.href = '/home.html';
        return { success: true };
    } catch (error) {
        showToast(error.message, 'error');
        return { success: false, error: error.message };
    }
}

// Register
export async function register(userData, file) {
    try {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: userData.email,
            password: userData.password
        });
        
        if (authError) throw authError;
        
        let profileImageUrl = null;
        
        // Upload profile image if provided
        if (file) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${authData.user.id}.${fileExt}`;
            profileImageUrl = await uploadFile('avatars', fileName, file);
        }
        
        // Create user profile
        const { error: profileError } = await supabase
            .from('users')
            .insert({
                supabase_user_id: authData.user.id,
                email: userData.email,
                full_name: userData.fullName,
                parish_name: userData.parish,
                gender: userData.gender,
                profile_image: profileImageUrl,
                role: userData.role === 'user' ? 'user' : 'user',
                status: 'pending'
            });
        
        if (profileError) throw profileError;
        
        // Create role request if not regular user
        if (userData.role !== 'user') {
            const { error: requestError } = await supabase
                .from('role_requests')
                .insert({
                    user_id: authData.user.id,
                    requested_role: userData.role
                });
            
            if (requestError) throw requestError;
        }
        
        showToast('Registration successful! Waiting for admin approval.', 'success');
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 2000);
        
        return { success: true };
    } catch (error) {
        showToast(error.message, 'error');
        return { success: false, error: error.message };
    }
}

// Logout
export async function logout() {
    await supabase.auth.signOut();
    window.location.href = '/index.html';
}

// Setup login/register forms
document.addEventListener('DOMContentLoaded', () => {
    // Login form
    const loginForm = document.getElementById('login');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            await login(email, password);
        });
    }
    
    // Register form
    const registerForm = document.getElementById('register');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const file = document.getElementById('reg-profile-image').files[0];
            
            const userData = {
                fullName: document.getElementById('reg-fullname').value,
                parish: document.getElementById('reg-parish').value,
                gender: document.getElementById('reg-gender').value,
                email: document.getElementById('reg-email').value,
                password: document.getElementById('reg-password').value,
                role: document.getElementById('reg-role').value
            };
            
            await register(userData, file);
        });
    }
    
    // Auth tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.auth-form').forEach(form => {
                form.classList.remove('active');
            });
            document.getElementById(`${tab}-form`).classList.add('active');
            
            document.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.remove('active');
            });
            btn.classList.add('active');
        });
    });
});

// Helper
function showToast(message, type) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? '#ea4335' : '#34a853'};
        color: white;
        padding: 12px 20px;
        border-radius: 40px;
        z-index: 2000;
        font-size: 14px;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Initialize Supabase
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Replace with your Supabase URL
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your Supabase anon key

const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elements
const loginSection = document.getElementById('loginSection');
const registrationSection = document.getElementById('registrationSection');
const loginForm = document.getElementById('loginForm');
const registrationForm = document.getElementById('registrationForm');
const toggleRegister = document.getElementById('toggleRegister');
const toggleLogin = document.getElementById('toggleLogin');
const loadingSpinner = document.getElementById('loadingSpinner');
const profileImageInput = document.getElementById('profileImage');
const imagePreview = document.getElementById('imagePreview');
const imagePlaceholder = document.querySelector('.image-placeholder');

// Message Elements
const loginError = document.getElementById('loginError');
const loginSuccess = document.getElementById('loginSuccess');
const registrationError = document.getElementById('registrationError');
const registrationSuccess = document.getElementById('registrationSuccess');

// Toggle between login and registration
toggleRegister.addEventListener('click', () => {
    loginSection.classList.remove('active');
    registrationSection.classList.add('active');
});

toggleLogin.addEventListener('click', () => {
    registrationSection.classList.remove('active');
    loginSection.classList.add('active');
});

// Profile Image Preview
profileImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            imagePreview.src = event.target.result;
            imagePreview.style.display = 'block';
            imagePlaceholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
});

// Show/Hide Loading Spinner
function showLoading(show = true) {
    loadingSpinner.style.display = show ? 'flex' : 'none';
}

// Show Messages
function showMessage(element, message, isError = true) {
    element.textContent = message;
    element.classList.add('show');
    element.classList.toggle('error-message', isError);
    element.classList.toggle('success-message', !isError);

    setTimeout(() => {
        element.classList.remove('show');
    }, 5000);
}

// Upload Profile Image to Supabase Storage
async function uploadProfileImage(file, userId) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const filePath = `profile-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('ayf-profiles')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('ayf-profiles')
            .getPublicUrl(filePath);

        return data.publicUrl;
    } catch (error) {
        console.error('Image upload error:', error);
        throw error;
    }
}

// Validate Password Strength
function validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    return {
        isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers,
        message: password.length < minLength 
            ? 'Password must be at least 8 characters'
            : !hasUpperCase || !hasLowerCase || !hasNumbers
            ? 'Password must contain uppercase, lowercase, and numbers'
            : ''
    };
}

// Login Handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        showLoading(true);
        loginError.classList.remove('show');

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        showMessage(loginSuccess, '✓ Login successful! Redirecting...', false);
        
        setTimeout(() => {
            window.location.href = 'dashboard.html'; // Redirect to dashboard
        }, 1500);

    } catch (error) {
        showMessage(loginError, `❌ ${error.message}`, true);
    } finally {
        showLoading(false);
    }
});

// Registration Handler
registrationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value.trim();
    const age = parseInt(document.getElementById('age').value);
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const parish = document.getElementById('parish').value;
    const parishExco = document.getElementById('parishExco').checked;
    const archdeaconyExco = document.getElementById('archdeaconyExco').checked;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    const profileImageFile = profileImageInput.files[0];

    // Validation
    if (!fullName) {
        showMessage(registrationError, 'Please enter your full name', true);
        return;
    }

    if (age < 13) {
        showMessage(registrationError, 'You must be at least 13 years old', true);
        return;
    }

    if (!parish) {
        showMessage(registrationError, 'Please select your parish', true);
        return;
    }

    if (!parishExco && !archdeaconyExco) {
        showMessage(registrationError, 'Please select at least one role', true);
        return;
    }

    if (password !== confirmPassword) {
        showMessage(registrationError, 'Passwords do not match', true);
        return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
        showMessage(registrationError, passwordValidation.message, true);
        return;
    }

    if (!agreeTerms) {
        showMessage(registrationError, 'Please agree to the terms and conditions', true);
        return;
    }

    try {
        showLoading(true);
        registrationError.classList.remove('show');

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password
        });

        if (authError) throw authError;

        const userId = authData.user.id;
        let profileImageUrl = null;

        // Upload profile image if provided
        if (profileImageFile) {
            profileImageUrl = await uploadProfileImage(profileImageFile, userId);
        }

        // Create user profile
        const { error: profileError } = await supabase
            .from('users')
            .insert({
                id: userId,
                full_name: fullName,
                age,
                email,
                phone,
                parish,
                is_parish_exco: parishExco,
                is_archdeaconry_exco: archdeaconyExco,
                profile_image_url: profileImageUrl,
                created_at: new Date().toISOString()
            });

        if (profileError) throw profileError;

        showMessage(registrationSuccess, '✓ Account created successfully! Check your email to verify.', false);

        // Reset form
        registrationForm.reset();
        imagePreview.style.display = 'none';
        imagePlaceholder.style.display = 'flex';

        setTimeout(() => {
            loginSection.classList.add('active');
            registrationSection.classList.remove('active');
        }, 2000);

    } catch (error) {
        console.error('Registration error:', error);
        showMessage(registrationError, `❌ ${error.message}`, true);
    } finally {
        showLoading(false);
    }
});

// Forgot Password
document.getElementById('forgotPassword').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();

    if (!email) {
        showMessage(loginError, 'Please enter your email address', true);
        return;
    }

    try {
        showLoading(true);
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password.html`
        });

        if (error) throw error;

        showMessage(loginSuccess, '✓ Password reset link sent to your email', false);
    } catch (error) {
        showMessage(loginError, `❌ ${error.message}`, true);
    } finally {
        showLoading(false);
    }
});

// Check if user is already logged in
async function checkAuth() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }
}

// Check auth on page load
window.addEventListener('load', checkAuth);
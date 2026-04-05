// Main JavaScript file for front-end interactions

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication status
    await window.auth.checkAuth();
    
    // Setup theme toggle
    setupThemeToggle();
    
    // Setup registration modal
    setupRegistrationModal();
    
    // Setup profile page if on profile.html
    if (window.location.pathname.includes('profile.html')) {
        setupProfilePage();
    }
    
    // Setup event listeners for interactions
    setupEventListeners();
    
    // Update UI based on auth status
    updateUIForAuth();
});

// Theme toggle functionality
function setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        // Load saved theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark');
            themeToggle.textContent = '☀️';
        }
        
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark');
            const isDark = document.body.classList.contains('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            themeToggle.textContent = isDark ? '☀️' : '🌙';
        });
    }
}

// Setup registration modal
function setupRegistrationModal() {
    const joinBtn = document.getElementById('joinBtn');
    if (joinBtn) {
        joinBtn.addEventListener('click', showRegistrationModal);
    }
}

// Show registration modal
function showRegistrationModal() {
    const modal = document.createElement('div');
    modal.id = 'regModal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <span class="close" onclick="closeRegistrationModal()">&times;</span>
            <h3>Join Anglican Youth Fellowship</h3>
            <form id="registrationForm">
                <div style="margin-bottom: 1rem;">
                    <label>Full Name:</label>
                    <input type="text" id="regName" required style="width: 100%; margin-top: 0.5rem;">
                </div>
                <div style="margin-bottom: 1rem;">
                    <label>Email:</label>
                    <input type="email" id="regEmail" required style="width: 100%; margin-top: 0.5rem;">
                </div>
                <div style="margin-bottom: 1rem;">
                    <label>Password:</label>
                    <input type="password" id="regPassword" required style="width: 100%; margin-top: 0.5rem;">
                </div>
                <div style="margin-bottom: 1rem;">
                    <label>Select Parish:</label>
                    <select id="regParish" required style="width: 100%; margin-top: 0.5rem;">
                        <option value="">Select your parish</option>
                        <option value="St. Mathus Anglican Church">St. Mathus Anglican Church</option>
                        <option value="St. Philip Anglican Church">St. Philip Anglican Church</option>
                        <option value="St. Barnabas Jaiyuan">St. Barnabas Jaiyuan</option>
                    </select>
                </div>
                <div style="margin-bottom: 1rem;">
                    <label>
                        <input type="checkbox" id="regASquared">
                        Request A-Squared (Leadership Group) Membership
                    </label>
                    <small style="display: block; margin-top: 0.5rem; color: var(--text-secondary);">
                        A-Squared membership requires admin approval and provides access to leadership resources.
                    </small>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%;">Register</button>
            </form>
            <div style="margin-top: 1rem; text-align: center;">
                <p>Already have an account? <a href="#" onclick="showLoginModal(); return false;">Login here</a></p>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('registrationForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const parish = document.getElementById('regParish').value;
        const requestASquared = document.getElementById('regASquared').checked;
        
        try {
            await window.auth.register(email, password, parish, requestASquared);
            alert('Registration successful! Please check your email to verify your account.');
            closeRegistrationModal();
            showLoginModal();
        } catch (error) {
            alert('Registration failed: ' + error.message);
        }
    });
}

// Show login modal
function showLoginModal() {
    closeRegistrationModal();
    
    const modal = document.createElement('div');
    modal.id = 'loginModal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <span class="close" onclick="closeLoginModal()">&times;</span>
            <h3>Login to AYF Platform</h3>
            <form id="loginForm">
                <div style="margin-bottom: 1rem;">
                    <label>Email:</label>
                    <input type="email" id="loginEmail" required style="width: 100%; margin-top: 0.5rem;">
                </div>
                <div style="margin-bottom: 1rem;">
                    <label>Password:</label>
                    <input type="password" id="loginPassword" required style="width: 100%; margin-top: 0.5rem;">
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%;">Login</button>
            </form>
            <div style="margin-top: 1rem; text-align: center;">
                <p>Don't have an account? <a href="#" onclick="showRegistrationModal(); return false;">Register here</a></p>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            await window.auth.login(email, password);
            alert('Login successful!');
            closeLoginModal();
            window.location.reload();
        } catch (error) {
            alert('Login failed: ' + error.message);
        }
    });
}

// Close modals
function closeRegistrationModal() {
    const modal = document.getElementById('regModal');
    if (modal) modal.remove();
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.remove();
}

// Setup profile page
async function setupProfilePage() {
    const profileContent = document.getElementById('profileContent');
    const user = window.auth.getCurrentUser();
    
    if (!user) {
        profileContent.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <h2>Welcome to AYF Platform</h2>
                <p>Please login or register to access your profile.</p>
                <button onclick="showLoginModal()" class="btn btn-primary">Login</button>
                <button onclick="showRegistrationModal()" class="btn btn-secondary">Register</button>
            </div>
        `;
        return;
    }
    
    // Fetch user profile
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    
    profileContent.innerHTML = `
        <div style="max-width: 600px; margin: 0 auto;">
            <div class="card">
                <h2>My Profile</h2>
                <div style="margin: 1rem 0;">
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Parish:</strong> ${profile?.parish || 'Not assigned'}</p>
                    <p><strong>Role:</strong> ${profile?.role || 'User'}</p>
                    <p><strong>A-Squared Status:</strong> ${profile?.is_a_squared ? '✅ Approved Member' : (profile?.a_squared_requested ? '⏳ Pending Approval' : '❌ Not Requested')}</p>
                </div>
                ${!profile?.a_squared_requested && !profile?.is_a_squared && profile?.role !== 'admin' ? `
                    <button id="requestASquaredBtn" class="btn btn-primary">Request A-Squared Membership</button>
                ` : ''}
                <button id="logoutProfileBtn" class="btn btn-secondary">Logout</button>
            </div>
        </div>
    `;
    
    const requestBtn = document.getElementById('requestASquaredBtn');
    if (requestBtn) {
        requestBtn.addEventListener('click', async () => {
            try {
                await window.auth.requestASquared();
                alert('A-Squared request submitted! Admin will review your application.');
                setupProfilePage(); // Refresh
            } catch (error) {
                alert('Error: ' + error.message);
            }
        });
    }
    
    const logoutBtn = document.getElementById('logoutProfileBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await window.auth.logout();
        });
    }
}

// Setup event listeners for interactions
function setupEventListeners() {
    // Handle like buttons (delegation)
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('like-btn')) {
            if (!window.auth.canInteract()) {
                alert('Please login to like posts');
                showLoginModal();
                return;
            }
            
            const postId = e.target.dataset.postId;
            await handleLike(postId);
            e.target.style.color = 'red';
        }
        
        if (e.target.classList.contains('comment-btn')) {
            if (!window.auth.canInteract()) {
                alert('Please login to comment');
                showLoginModal();
                return;
            }
            
            const postId = e.target.dataset.postId;
            showCommentModal(postId);
        }
        
        if (e.target.classList.contains('share-btn')) {
            const postId = e.target.dataset.postId;
            sharePost(postId);
        }
    });
}

// Handle like functionality
async function handleLike(postId) {
    const user = window.auth.getCurrentUser();
    if (!user) return;
    
    // Check if already liked
    const { data: existing } = await supabaseClient
        .from('likes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();
    
    if (existing) {
        await supabaseClient
            .from('likes')
            .delete()
            .eq('id', existing.id);
    } else {
        await supabaseClient
            .from('likes')
            .insert([{
                post_id: postId,
                user_id: user.id
            }]);
    }
}

// Show comment modal
function showCommentModal(postId) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h3>Add Comment</h3>
            <textarea id="commentText" rows="4" style="width: 100%; margin: 1rem 0;" placeholder="Write your comment..."></textarea>
            <button onclick="submitComment(${postId})" class="btn btn-primary">Post Comment</button>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Submit comment
async function submitComment(postId) {
    const commentText = document.getElementById('commentText').value;
    const user = window.auth.getCurrentUser();
    
    if (!commentText.trim()) {
        alert('Please enter a comment');
        return;
    }
    
    const { error } = await supabaseClient
        .from('comments')
        .insert([{
            post_id: postId,
            user_id: user.id,
            content: commentText
        }]);
    
    if (!error) {
        alert('Comment posted!');
        document.querySelector('.modal').remove();
    } else {
        alert('Error posting comment: ' + error.message);
    }
}

// Share post
function sharePost(postId) {
    const url = `${window.location.origin}/post.html?id=${postId}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard! Share with your friends.');
}

// Update UI based on authentication
function updateUIForAuth() {
    const isLoggedIn = window.auth.getCurrentUser() !== null;
    const isAdminUser = window.auth.isAdmin();
    
    // Show/hide admin link in navigation
    const adminLink = document.querySelector('nav a[href="admin/dashboard.html"]');
    if (adminLink && isAdminUser) {
        adminLink.style.display = 'block';
    }
    
    // Update profile link text
    const profileLink = document.querySelector('nav a[href="profile.html"]');
    if (profileLink && isLoggedIn) {
        profileLink.textContent = 'My Profile';
    } else if (profileLink) {
        profileLink.textContent = 'Login';
    }
}

// Make functions available globally
window.showRegistrationModal = showRegistrationModal;
window.showLoginModal = showLoginModal;
window.closeRegistrationModal = closeRegistrationModal;
window.closeLoginModal = closeLoginModal;
window.submitComment = submitComment;

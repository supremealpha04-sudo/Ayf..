// Admin functions
let currentEditId = null;

// Load admin dashboard stats
async function loadAdminStats() {
    // Get total users
    const { data: users } = await supabaseClient
        .from('profiles')
        .select('*');
    
    const totalUsers = users?.length || 0;
    const aSquaredCount = users?.filter(u => u.is_a_squared).length || 0;
    
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('aSquaredCount').textContent = aSquaredCount;
    
    // Parish statistics
    const parishStats = {};
    users?.forEach(user => {
        if (user.parish) {
            parishStats[user.parish] = (parishStats[user.parish] || 0) + 1;
        }
    });
    
    const parishStatsDiv = document.getElementById('parishStats');
    if (parishStatsDiv) {
        parishStatsDiv.innerHTML = `
            <h3>Users per Parish</h3>
            ${Object.entries(parishStats).map(([parish, count]) => `
                <div class="stat-card">
                    <h4>${parish}</h4>
                    <p>${count} members</p>
                </div>
            `).join('')}
        `;
    }
}

// Load users management table
async function loadUsersTable(parishFilter = 'all') {
    let query = supabaseClient.from('profiles').select('*');
    
    if (parishFilter !== 'all') {
        query = query.eq('parish', parishFilter);
    }
    
    const { data: users, error } = await query;
    
    if (error) {
        console.error('Error loading users:', error);
        return;
    }
    
    const usersTable = document.getElementById('usersTable');
    if (usersTable) {
        usersTable.innerHTML = `
            <table class="users-table">
                <thead>
                    <tr><th>Email</th><th>Parish</th><th>Role</th><th>A-Squared</th><th>Actions</th></tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${user.email}</td>
                            <td>${user.parish || 'N/A'}</td>
                            <td>${user.role}</td>
                            <td>${user.is_a_squared ? '✓' : '✗'}</td>
                            <td>
                                <button onclick="editUser('${user.id}')" class="action-btn edit-btn">Edit</button>
                                <button onclick="blockUser('${user.id}')" class="action-btn block-btn">Block</button>
                                <button onclick="deleteUser('${user.id}')" class="action-btn delete-btn">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
}

// Load posts for management
async function loadPostsManagement() {
    const { data: posts, error } = await supabaseClient
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error loading posts:', error);
        return;
    }
    
    const postsDiv = document.getElementById('postsManagement');
    if (postsDiv) {
        postsDiv.innerHTML = posts.map(post => `
            <div class="card">
                <h3>${post.title}</h3>
                <p>${post.content.substring(0, 100)}...</p>
                <small>${post.type} | ${post.parish || 'General'}</small>
                <div>
                    <button onclick="editPost(${post.id})" class="action-btn edit-btn">Edit</button>
                    <button onclick="deletePost(${post.id})" class="action-btn delete-btn">Delete</button>
                </div>
            </div>
        `).join('');
    }
}

// Create or update post
async function savePost() {
    const title = document.getElementById('postTitle').value;
    const content = document.getElementById('postContent').value;
    const type = document.getElementById('postType').value;
    const parish = document.getElementById('postParish').value === 'all' ? null : document.getElementById('postParish').value;
    
    let media_url = null;
    const mediaFile = document.getElementById('postMedia').files[0];
    
    if (mediaFile) {
        const fileExt = mediaFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { data, error } = await supabaseClient.storage
            .from('media')
            .upload(fileName, mediaFile);
        
        if (data) {
            media_url = supabaseClient.storage.from('media').getPublicUrl(fileName).data.publicUrl;
        }
    }
    
    const postData = {
        title,
        content,
        type,
        parish,
        media_url,
        author_id: window.auth.getCurrentUser()?.id
    };
    
    let result;
    if (currentEditId) {
        result = await supabaseClient
            .from('posts')
            .update(postData)
            .eq('id', currentEditId);
    } else {
        result = await supabaseClient
            .from('posts')
            .insert([postData]);
    }
    
    if (!result.error) {
        alert('Post saved successfully!');
        closePostModal();
        loadPostsManagement();
    } else {
        alert('Error saving post: ' + result.error.message);
    }
}

// Set quota and calculate per parish
async function setQuota() {
    const totalQuota = document.getElementById('yearlyQuota').value;
    if (!totalQuota) {
        alert('Please enter total quota');
        return;
    }
    
    const parishes = ['St. Mathus Anglican Church', 'St. Philip Anglican Church', 'St. Barnabas Jaiyuan'];
    const perParishQuota = Math.floor(totalQuota / parishes.length);
    const remainder = totalQuota % parishes.length;
    
    const quotaResults = document.getElementById('quotaResults');
    quotaResults.innerHTML = `
        <h3>Quota Distribution</h3>
        <p>Total Quota: ${totalQuota}</p>
        ${parishes.map((parish, index) => `
            <div class="stat-card">
                <h4>${parish}</h4>
                <p>Quota: ${perParishQuota + (index < remainder ? 1 : 0)}</p>
            </div>
        `).join('')}
        <button onclick="saveQuota(${totalQuota})" class="btn btn-primary">Save Quota</button>
    `;
}

// Save quota to database
async function saveQuota(totalQuota) {
    const { error } = await supabaseClient
        .from('yearly_plans')
        .insert([{
            title: `${new Date().getFullYear()} Annual Quota`,
            year: new Date().getFullYear(),
            quota_info: `Total Quota: ${totalQuota}`,
            file_url: null
        }]);
    
    if (!error) {
        alert('Quota saved successfully!');
    } else {
        alert('Error saving quota: ' + error.message);
    }
}

// Load pending A-Squared requests
async function loadPendingRequests() {
    const { data: requests, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('a_squared_requested', true)
        .eq('is_a_squared', false);
    
    if (error) {
        console.error('Error loading requests:', error);
        return;
    }
    
    const requestsDiv = document.getElementById('pendingRequests');
    if (requestsDiv) {
        if (requests.length === 0) {
            requestsDiv.innerHTML = '<p>No pending requests</p>';
        } else {
            requestsDiv.innerHTML = requests.map(req => `
                <div class="approval-card">
                    <div>
                        <strong>${req.email}</strong><br>
                        Parish: ${req.parish}
                    </div>
                    <div>
                        <button onclick="approveASquared('${req.id}')" class="approve-btn">Approve</button>
                        <button onclick="rejectASquared('${req.id}')" class="reject-btn">Reject</button>
                    </div>
                </div>
            `).join('');
        }
    }
}

// Approve A-Squared member
async function approveASquared(userId) {
    const { error } = await supabaseClient
        .from('profiles')
        .update({ is_a_squared: true, a_squared_requested: false })
        .eq('id', userId);
    
    if (!error) {
        alert('Member approved as A-Squared!');
        loadPendingRequests();
    } else {
        alert('Error approving member: ' + error.message);
    }
}

// Reject A-Squared request
async function rejectASquared(userId) {
    const { error } = await supabaseClient
        .from('profiles')
        .update({ a_squared_requested: false })
        .eq('id', userId);
    
    if (!error) {
        alert('Request rejected');
        loadPendingRequests();
    } else {
        alert('Error rejecting request: ' + error.message);
    }
}

// Modal functions
function showPostModal(editMode = false, post = null) {
    const modal = document.getElementById('postModal');
    const modalTitle = document.getElementById('modalTitle');
    
    if (editMode && post) {
        modalTitle.textContent = 'Edit Post';
        document.getElementById('postTitle').value = post.title;
        document.getElementById('postContent').value = post.content;
        document.getElementById('postType').value = post.type;
        document.getElementById('postParish').value = post.parish || 'all';
        currentEditId = post.id;
    } else {
        modalTitle.textContent = 'Create Post';
        document.getElementById('postTitle').value = '';
        document.getElementById('postContent').value = '';
        document.getElementById('postType').value = 'event';
        document.getElementById('postParish').value = 'all';
        document.getElementById('postMedia').value = '';
        currentEditId = null;
    }
    
    modal.style.display = 'flex';
}

function closePostModal() {
    document.getElementById('postModal').style.display = 'none';
}

// Delete post
async function deletePost(postId) {
    if (confirm('Are you sure you want to delete this post?')) {
        const { error } = await supabaseClient
            .from('posts')
            .delete()
            .eq('id', postId);
        
        if (!error) {
            alert('Post deleted successfully');
            loadPostsManagement();
        } else {
            alert('Error deleting post: ' + error.message);
        }
    }
}

// Initialize admin functions based on current page
document.addEventListener('DOMContentLoaded', async () => {
    await window.auth.checkAuth();
    
    if (!window.auth.isAdmin()) {
        window.location.href = '/index.html';
        return;
    }
    
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('dashboard.html')) {
        loadAdminStats();
    } else if (currentPage.includes('users.html')) {
        loadUsersTable();
        const parishFilter = document.getElementById('parishFilterUsers');
        if (parishFilter) {
            parishFilter.addEventListener('change', () => {
                loadUsersTable(parishFilter.value);
            });
        }
    } else if (currentPage.includes('posts.html')) {
        loadPostsManagement();
        document.getElementById('createPostBtn').addEventListener('click', () => showPostModal(false));
        document.getElementById('savePost').addEventListener('click', savePost);
        document.querySelector('.close').addEventListener('click', closePostModal);
    } else if (currentPage.includes('quotas.html')) {
        document.getElementById('setQuotaBtn').addEventListener('click', setQuota);
    } else if (currentPage.includes('approvals.html')) {
        loadPendingRequests();
    }
});

// Make functions available globally
window.editUser = (userId) => alert('Edit user functionality - implement as needed');
window.blockUser = (userId) => alert('Block user functionality - implement as needed');
window.deleteUser = async (userId) => {
    if (confirm('Delete this user?')) {
        await supabaseClient.auth.admin.deleteUser(userId);
        loadUsersTable();
    }
};
window.editPost = (postId) => {
    // Fetch post and show edit modal
    alert('Edit post - implement full fetch');
};
window.deletePost = deletePost;
window.approveASquared = approveASquared;
window.rejectASquared = rejectASquared;
window.savePost = savePost;
window.closePostModal = closePostModal;

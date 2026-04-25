import { supabase, getCurrentUser, uploadFile } from '../../config/supabase.js';

let currentUser = null;

// Initialize admin dashboard
export async function initAdminDashboard() {
    currentUser = await getCurrentUser();
    
    if (currentUser.role !== 'admin') {
        window.location.href = '/home.html';
        return;
    }
    
    setupAdminTabs();
    await loadNotices();
    await loadEvents();
    await loadPosts();
    await loadMinutes();
    await loadPlans();
    await loadQuotas();
    await loadUsers();
    await loadRoleRequests();
    
    setupRealtime();
}

// Setup admin tab switching
function setupAdminTabs() {
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const panelId = tab.dataset.panel;
            
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.admin-panel').forEach(panel => panel.classList.remove('active'));
            document.getElementById(`${panelId}Panel`).classList.add('active');
        });
    });
}

// Load notices
async function loadNotices() {
    const { data: notices } = await supabase
        .from('posts')
        .select('*')
        .eq('type', 'notice')
        .order('created_at', { ascending: false });
    
    const container = document.getElementById('noticesList');
    if (!container) return;
    
    if (!notices || notices.length === 0) {
        container.innerHTML = '<p class="empty">No notices yet</p>';
        return;
    }
    
    container.innerHTML = notices.map(notice => `
        <div class="admin-item" data-id="${notice.id}">
            <div class="admin-item-info">
                <div class="admin-item-title">${escapeHtml(notice.title)}</div>
                <div class="admin-item-meta">${window.formatDate(notice.created_at)}</div>
            </div>
            <div class="admin-item-actions">
                <button class="edit" data-type="notice" data-id="${notice.id}">Edit</button>
                <button class="delete" data-type="notice" data-id="${notice.id}">Delete</button>
            </div>
        </div>
    `).join('');
    
    attachItemActions();
}

// Load events
async function loadEvents() {
    const { data: events } = await supabase
        .from('posts')
        .select('*')
        .eq('type', 'event')
        .order('created_at', { ascending: false });
    
    const container = document.getElementById('eventsList');
    if (!container) return;
    
    if (!events || events.length === 0) {
        container.innerHTML = '<p class="empty">No events yet</p>';
        return;
    }
    
    container.innerHTML = events.map(event => `
        <div class="admin-item" data-id="${event.id}">
            <div class="admin-item-info">
                <div class="admin-item-title">${escapeHtml(event.title)}</div>
                <div class="admin-item-meta">${event.event_date ? new Date(event.event_date).toLocaleDateString() : 'No date'} | ${window.formatDate(event.created_at)}</div>
            </div>
            <div class="admin-item-actions">
                <button class="edit" data-type="event" data-id="${event.id}">Edit</button>
                <button class="delete" data-type="event" data-id="${event.id}">Delete</button>
            </div>
        </div>
    `).join('');
    
    attachItemActions();
}

// Load posts
async function loadPosts() {
    const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .eq('type', 'general_post')
        .order('created_at', { ascending: false });
    
    const container = document.getElementById('postsList');
    if (!container) return;
    
    if (!posts || posts.length === 0) {
        container.innerHTML = '<p class="empty">No posts yet</p>';
        return;
    }
    
    container.innerHTML = posts.map(post => `
        <div class="admin-item" data-id="${post.id}">
            <div class="admin-item-info">
                <div class="admin-item-title">${escapeHtml(post.title)}</div>
                <div class="admin-item-meta">${window.formatDate(post.created_at)}</div>
            </div>
            <div class="admin-item-actions">
                <button class="edit" data-type="post" data-id="${post.id}">Edit</button>
                <button class="delete" data-type="post" data-id="${post.id}">Delete</button>
            </div>
        </div>
    `).join('');
    
    attachItemActions();
}

// Load minutes
async function loadMinutes() {
    const { data: minutes } = await supabase
        .from('meeting_minutes')
        .select('*')
        .order('created_at', { ascending: false });
    
    const container = document.getElementById('minutesList');
    if (!container) return;
    
    if (!minutes || minutes.length === 0) {
        container.innerHTML = '<p class="empty">No meeting minutes yet</p>';
        return;
    }
    
    container.innerHTML = minutes.map(minute => `
        <div class="admin-item" data-id="${minute.id}">
            <div class="admin-item-info">
                <div class="admin-item-title">${escapeHtml(minute.title)}</div>
                <div class="admin-item-meta">${new Date(minute.meeting_date).toLocaleDateString()}</div>
            </div>
            <div class="admin-item-actions">
                <button class="edit" data-type="minutes" data-id="${minute.id}">Edit</button>
                <button class="delete" data-type="minutes" data-id="${minute.id}">Delete</button>
            </div>
        </div>
    `).join('');
    
    attachItemActions();
}

// Load plans
async function loadPlans() {
    const { data: plans } = await supabase
        .from('yearly_plans')
        .select('*')
        .order('year', { ascending: false });
    
    const container = document.getElementById('plansList');
    if (!container) return;
    
    if (!plans || plans.length === 0) {
        container.innerHTML = '<p class="empty">No yearly plans yet</p>';
        return;
    }
    
    container.innerHTML = plans.map(plan => `
        <div class="admin-item" data-id="${plan.id}">
            <div class="admin-item-info">
                <div class="admin-item-title">${escapeHtml(plan.title)} (${plan.year})</div>
                <div class="admin-item-meta">${window.formatDate(plan.created_at)}</div>
            </div>
            <div class="admin-item-actions">
                <button class="edit" data-type="plan" data-id="${plan.id}">Edit</button>
                <button class="delete" data-type="plan" data-id="${plan.id}">Delete</button>
            </div>
        </div>
    `).join('');
    
    attachItemActions();
}

// Load quotas
async function loadQuotas() {
    const { data: quotas } = await supabase
        .from('quotas')
        .select(`
            *,
            parish_president:sent_to (full_name)
        `)
        .order('created_at', { ascending: false });
    
    const container = document.getElementById('quotasList');
    if (!container) return;
    
    if (!quotas || quotas.length === 0) {
        container.innerHTML = '<p class="empty">No quotas sent yet</p>';
        return;
    }
    
    container.innerHTML = quotas.map(quota => `
        <div class="admin-item" data-id="${quota.id}">
            <div class="admin-item-info">
                <div class="admin-item-title">${escapeHtml(quota.parish_name)} - ₦${quota.amount.toLocaleString()}</div>
                <div class="admin-item-meta">Due: ${new Date(quota.due_date).toLocaleDateString()} | To: ${quota.parish_president?.full_name || 'Unknown'}</div>
            </div>
            <div class="admin-item-actions">
                <button class="edit" data-type="quota" data-id="${quota.id}">Edit</button>
                <button class="delete" data-type="quota" data-id="${quota.id}">Delete</button>
            </div>
        </div>
    `).join('');
    
    attachItemActions();
}

// Load users
async function loadUsers() {
    const { data: users } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
    
    const container = document.getElementById('usersList');
    if (!container) return;
    
    if (!users || users.length === 0) {
        container.innerHTML = '<p class="empty">No users found</p>';
        return;
    }
    
    container.innerHTML = users.map(user => `
        <div class="user-item">
            <img class="user-avatar" src="${user.profile_image || '/assets/images/default-avatar.png'}" alt="">
            <div class="user-details">
                <div class="user-name">${escapeHtml(user.full_name)}</div>
                <div class="user-email">${escapeHtml(user.email)}</div>
            </div>
            <div class="user-role">${user.role}</div>
            <div class="user-status ${user.status}">${user.status}</div>
            <div class="admin-item-actions">
                <button class="edit-user" data-id="${user.id}">Edit</button>
                <button class="suspend-user" data-id="${user.id}" ${user.status === 'suspended' ? 'disabled' : ''}>Suspend</button>
            </div>
        </div>
    `).join('');
    
    // Attach user action handlers
    document.querySelectorAll('.edit-user').forEach(btn => {
        btn.addEventListener('click', () => editUser(btn.dataset.id));
    });
    
    document.querySelectorAll('.suspend-user').forEach(btn => {
        btn.addEventListener('click', () => suspendUser(btn.dataset.id));
    });
}

// Load role requests
async function loadRoleRequests() {
    const { data: requests } = await supabase
        .from('role_requests')
        .select(`
            *,
            user:user_id (full_name, email, parish_name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
    
    const container = document.getElementById('requestsList');
    if (!container) return;
    
    if (!requests || requests.length === 0) {
        container.innerHTML = '<p class="empty">No pending requests</p>';
        return;
    }
    
    container.innerHTML = requests.map(req => `
        <div class="request-item" data-id="${req.id}">
            <div><strong>${escapeHtml(req.user?.full_name)}</strong> (${req.user?.email})</div>
            <div>Parish: ${req.user?.parish_name}</div>
            <div>Requested Role: ${req.requested_role}</div>
            <div class="request-actions">
                <button class="approve-btn" data-id="${req.id}" data-user="${req.user_id}" data-role="${req.requested_role}">Approve</button>
                <button class="reject-btn" data-id="${req.id}">Reject</button>
            </div>
        </div>
    `).join('');
    
    // Attach request handlers
    document.querySelectorAll('.approve-btn').forEach(btn => {
        btn.addEventListener('click', () => approveRequest(btn.dataset.id, btn.dataset.user, btn.dataset.role));
    });
    
    document.querySelectorAll('.reject-btn').forEach(btn => {
        btn.addEventListener('click', () => rejectRequest(btn.dataset.id));
    });
}

// Attach edit/delete actions to items
function attachItemActions() {
    document.querySelectorAll('.admin-item .edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            const id = btn.dataset.id;
            openEditModal(type, id);
        });
    });
    
    document.querySelectorAll('.admin-item .delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const type = btn.dataset.type;
            const id = btn.dataset.id;
            if (confirm('Are you sure you want to delete this?')) {
                await deleteItem(type, id);
            }
        });
    });
}

// Open create/edit modal
function openEditModal(type, id = null) {
    const modal = document.getElementById('adminModal');
    const modalBody = document.getElementById('adminModalBody');
    
    let formHtml = '';
    
    switch(type) {
        case 'notice':
        case 'event':
        case 'post':
            formHtml = getPostForm(type, id);
            break;
        case 'minutes':
            formHtml = getMinutesForm(id);
            break;
        case 'plan':
            formHtml = getPlanForm(id);
            break;
        case 'quota':
            formHtml = getQuotaForm(id);
            break;
    }
    
    modalBody.innerHTML = formHtml;
    modal.classList.add('active');
    
    const form = modalBody.querySelector('form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveItem(type, id);
        });
    }
}

// Get post form HTML
function getPostForm(type, id) {
    return `
        <form class="admin-form">
            <h3>${id ? 'Edit' : 'Create'} ${type}</h3>
            <label>Title</label>
            <input type="text" id="post-title" required>
            <label>Description</label>
            <textarea id="post-description"></textarea>
            ${type === 'event' ? `
                <label>Event Date</label>
                <input type="datetime-local" id="post-event-date">
            ` : ''}
            <label>${type === 'video' ? 'Video URL' : 'Image'}</label>
            <input type="file" id="post-file" accept="image/*,video/*">
            <div class="form-actions">
                <button type="submit">Save</button>
                <button type="button" class="cancel-btn">Cancel</button>
            </div>
        </form>
    `;
}

// Get minutes form HTML
function getMinutesForm(id) {
    return `
        <form class="admin-form">
            <h3>${id ? 'Edit' : 'Upload'} Meeting Minutes</h3>
            <label>Title</label>
            <input type="text" id="minutes-title" required>
            <label>Meeting Date</label>
            <input type="date" id="minutes-date" required>
            <label>Document (PDF/DOCX)</label>
            <input type="file" id="minutes-file" accept=".pdf,.doc,.docx" ${id ? '' : 'required'}>
            <div class="form-actions">
                <button type="submit">Save</button>
                <button type="button" class="cancel-btn">Cancel</button>
            </div>
        </form>
    `;
}

// Get plan form HTML
function getPlanForm(id) {
    return `
        <form class="admin-form">
            <h3>${id ? 'Edit' : 'Add'} Yearly Plan</h3>
            <label>Title</label>
            <input type="text" id="plan-title" required>
            <label>Year</label>
            <input type="number" id="plan-year" min="2000" max="2030" required>
            <label>Description</label>
            <textarea id="plan-description"></textarea>
            <label>PDF File</label>
            <input type="file" id="plan-file" accept=".pdf" ${id ? '' : 'required'}>
            <div class="form-actions">
                <button type="submit">Save</button>
                <button type="button" class="cancel-btn">Cancel</button>
            </div>
        </form>
    `;
}

// Get quota form HTML
function getQuotaForm(id) {
    return `
        <form class="admin-form">
            <h3>${id ? 'Edit' : 'Send'} Quota</h3>
            <label>Parish</label>
            <select id="quota-parish" required>
                <option value="">Select Parish</option>
                <option>St. Peter's Catholic Church</option>
                <option>St. Paul's Catholic Church</option>
                <option>Our Lady of Fatima</option>
                <option>Holy Trinity Catholic Church</option>
                <option>St. Mary's Catholic Church</option>
            </select>
            <label>Amount (₦)</label>
            <input type="number" id="quota-amount" required>
            <label>Due Date</label>
            <input type="date" id="quota-due-date" required>
            <label>Description</label>
            <textarea id="quota-description"></textarea>
            <div class="form-actions">
                <button type="submit">Send</button>
                <button type="button" class="cancel-btn">Cancel</button>
            </div>
        </form>
    `;
}

// Save item
async function saveItem(type, id) {
    try {
        let result;
        
        switch(type) {
            case 'notice':
            case 'event':
            case 'post':
                result = await savePost(type, id);
                break;
            case 'minutes':
                result = await saveMinutes(id);
                break;
            case 'plan':
                result = await savePlan(id);
                break;
            case 'quota':
                result = await saveQuota(id);
                break;
        }
        
        if (result) {
            showToast(`${type} saved successfully!`, 'success');
            document.getElementById('adminModal').classList.remove('active');
            
            // Reload appropriate list
            switch(type) {
                case 'notice':
                    await loadNotices();
                    break;
                case 'event':
                    await loadEvents();
                    break;
                case 'post':
                    await loadPosts();
                    break;
                case 'minutes':
                    await loadMinutes();
                    break;
                case 'plan':
                    await loadPlans();
                    break;
                case 'quota':
                    await loadQuotas();
                    break;
            }
        }
    } catch (error) {
        console.error('Error saving:', error);
        showToast('Error saving item', 'error');
    }
}

// Save post
async function savePost(type, id) {
    const title = document.getElementById('post-title').value;
    const description = document.getElementById('post-description').value;
    let fileUrl = null;
    
    const fileInput = document.getElementById('post-file');
    if (fileInput && fileInput.files[0]) {
        const file = fileInput.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${type}.${fileExt}`;
        fileUrl = await uploadFile('post-files', fileName, file);
    }
    
    const postData = {
        title,
        description,
        type: type === 'post' ? 'general_post' : type,
        created_by: currentUser.id,
        ...(fileUrl && { file_url: fileUrl })
    };
    
    if (type === 'event') {
        postData.event_date = document.getElementById('post-event-date').value;
    }
    
    if (id) {
        const { error } = await supabase
            .from('posts')
            .update(postData)
            .eq('id', id);
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from('posts')
            .insert(postData);
        if (error) throw error;
    }
    
    return true;
}

// Save minutes
async function saveMinutes(id) {
    const title = document.getElementById('minutes-title').value;
    const meetingDate = document.getElementById('minutes-date').value;
    let fileUrl = null;
    
    const fileInput = document.getElementById('minutes-file');
    if (fileInput && fileInput.files[0]) {
        const file = fileInput.files[0];
        const fileName = `${Date.now()}_minutes_${title.replace(/\s/g, '_')}.${file.name.split('.').pop()}`;
        fileUrl = await uploadFile('minutes', fileName, file);
    }
    
    const minutesData = {
        title,
        meeting_date: meetingDate,
        file_url: fileUrl,
        created_by: currentUser.id
    };
    
    if (id) {
        const { error } = await supabase
            .from('meeting_minutes')
            .update(minutesData)
            .eq('id', id);
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from('meeting_minutes')
            .insert(minutesData);
        if (error) throw error;
    }
    
    return true;
}

// Save plan
async function savePlan(id) {
    const title = document.getElementById('plan-title').value;
    const year = parseInt(document.getElementById('plan-year').value);
    const description = document.getElementById('plan-description').value;
    let fileUrl = null;
    
    const fileInput = document.getElementById('plan-file');
    if (fileInput && fileInput.files[0]) {
        const file = fileInput.files[0];
        const fileName = `${year}_plan.pdf`;
        fileUrl = await uploadFile('plans', fileName, file);
    }
    
    const planData = {
        title,
        year,
        description,
        file_url: fileUrl,
        created_by: currentUser.id
    };
    
    if (id) {
        const { error } = await supabase
            .from('yearly_plans')
            .update(planData)
            .eq('id', id);
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from('yearly_plans')
            .insert(planData);
        if (error) throw error;
    }
    
    return true;
}

// Save quota
async function saveQuota(id) {
    const parishName = document.getElementById('quota-parish').value;
    const amount = parseFloat(document.getElementById('quota-amount').value);
    const dueDate = document.getElementById('quota-due-date').value;
    const description = document.getElementById('quota-description').value;
    
    // Get parish president
    const { data: president } = await supabase
        .from('users')
        .select('id')
        .eq('parish_name', parishName)
        .eq('role', 'parish_exco')
        .single();
    
    const quotaData = {
        parish_name: parishName,
        amount,
        due_date: dueDate,
        description,
        sent_to: president?.id || null,
        created_by: currentUser.id
    };
    
    if (id) {
        const { error } = await supabase
            .from('quotas')
            .update(quotaData)
            .eq('id', id);
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from('quotas')
            .insert(quotaData);
        if (error) throw error;
    }
    
    return true;
}

// Delete item
async function deleteItem(type, id) {
    let table;
    switch(type) {
        case 'notice':
        case 'event':
        case 'post':
            table = 'posts';
            break;
        case 'minutes':
            table = 'meeting_minutes';
            break;
        case 'plan':
            table = 'yearly_plans';
            break;
        case 'quota':
            table = 'quotas';
            break;
    }
    
    const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
    
    if (error) {
        showToast('Error deleting', 'error');
    } else {
        showToast('Deleted successfully', 'success');
        
        // Reload appropriate list
        switch(type) {
            case 'notice':
                await loadNotices();
                break;
            case 'event':
                await loadEvents();
                break;
            case 'post':
                await loadPosts();
                break;
            case 'minutes':
                await loadMinutes();
                break;
            case 'plan':
                await loadPlans();
                break;
            case 'quota':
                await loadQuotas();
                break;
        }
    }
}

// Approve role request
async function approveRequest(requestId, userId, role) {
    // Update user role
    const { error: userError } = await supabase
        .from('users')
        .update({ role: role, status: 'active' })
        .eq('id', userId);
    
    if (userError) {
        showToast('Error approving request', 'error');
        return;
    }
    
    // Update request status
    const { error: requestError } = await supabase
        .from('role_requests')
        .update({ status: 'approved', processed_at: new Date().toISOString() })
        .eq('id', requestId);
    
    if (requestError) {
        showToast('Error updating request', 'error');
    } else {
        showToast('Request approved!', 'success');
        await loadRoleRequests();
        await loadUsers();
    }
}

// Reject role request
async function rejectRequest(requestId) {
    const { error } = await supabase
        .from('role_requests')
        .update({ status: 'rejected', processed_at: new Date().toISOString() })
        .eq('id', requestId);
    
    if (error) {
        showToast('Error rejecting request', 'error');
    } else {
        showToast('Request rejected', 'success');
        await loadRoleRequests();
    }
}

// Edit user
async function editUser(userId) {
    const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
    
    const newRole = prompt('Enter new role (user, parish_exco, archdiocesan_exco, both, admin):', user.role);
    if (newRole && ['user', 'parish_exco', 'archdiocesan_exco', 'both', 'admin'].includes(newRole)) {
        const { error } = await supabase
            .from('users')
            .update({ role: newRole })
            .eq('id', userId);
        
        if (error) {
            showToast('Error updating user', 'error');
        } else {
            showToast('User updated!', 'success');
            await loadUsers();
        }
    }
}

// Suspend user
async function suspendUser(userId) {
    const duration = prompt('Suspend for (7, 15, 30, or 365 days):', '7');
    const days = parseInt(duration);
    
    if (![7, 15, 30, 365].includes(days)) {
        showToast('Invalid duration', 'error');
        return;
    }
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    
    const { error } = await supabase
        .from('suspensions')
        .insert({
            user_id: userId,
            duration_days: days,
            end_date: endDate.toISOString(),
            suspended_by: currentUser.id
        });
    
    if (error) {
        showToast('Error suspending user', 'error');
    } else {
        await supabase
            .from('users')
            .update({ status: 'suspended' })
            .eq('id', userId);
        
        showToast('User suspended', 'success');
        await loadUsers();
    }
}

// Setup realtime for admin
function setupRealtime() {
    supabase
        .channel('admin-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'role_requests' }, () => {
            loadRoleRequests();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
            loadUsers();
        })
        .subscribe();
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Cancel button in modal
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('cancel-btn')) {
        const modal = document.getElementById('adminModal');
        if (modal) modal.classList.remove('active');
    }
    
    if (e.target.classList.contains('create-btn')) {
        const type = e.target.dataset.type;
        openEditModal(type);
    }
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.admin-header')) {
        initAdminDashboard();
    }
});

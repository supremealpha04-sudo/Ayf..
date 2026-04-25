import { supabase, getCurrentUser, uploadFile } from '../config/supabase.js';

let currentUser = null;
let messageSubscription = null;

// Initialize profile
export async function initProfile() {
    currentUser = await getCurrentUser();
    await loadProfile();
    await loadConversations();
    setupEventListeners();
}

// Load profile data
async function loadProfile() {
    const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    
    if (!user) return;
    
    document.getElementById('profileName').textContent = user.full_name;
    document.getElementById('profileParish').textContent = user.parish_name;
    document.getElementById('profileAvatar').src = user.profile_image || '/assets/images/default-avatar.png';
    
    // Load user's posts
    await loadUserPosts();
    
    // Load member since
    const joinedDate = new Date(user.created_at);
    document.getElementById('memberSince').textContent = joinedDate.getFullYear();
}

// Load user's posts
async function loadUserPosts() {
    const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .eq('created_by', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(10);
    
    const container = document.getElementById('userPosts');
    if (!container) return;
    
    document.getElementById('postCount').textContent = posts?.length || 0;
    
    if (!posts || posts.length === 0) {
        container.innerHTML = '<p class="empty">No posts yet</p>';
        return;
    }
    
    container.innerHTML = posts.map(post => `
        <div class="user-post">
            <div class="user-post-title">${escapeHtml(post.title)}</div>
            <div class="user-post-preview">${escapeHtml(post.description?.substring(0, 100) || '')}</div>
            <div class="user-post-date">${window.formatDate(post.created_at)}</div>
        </div>
    `).join('');
}

// Load conversations for private messaging
async function loadConversations(searchTerm = '') {
    // Get all conversations where user is either sender or receiver
    let query = supabase
        .from('private_messages')
        .select(`
            *,
            sender:sender_id (id, full_name, profile_image),
            receiver:receiver_id (id, full_name, profile_image)
        `)
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false });
    
    const { data: messages } = await query;
    
    // Group by conversation partner
    const conversations = new Map();
    messages?.forEach(msg => {
        const partner = msg.sender_id === currentUser.id ? msg.receiver : msg.sender;
        if (!conversations.has(partner.id)) {
            conversations.set(partner.id, {
                partner,
                lastMessage: msg.message,
                lastMessageTime: msg.created_at
            });
        }
    });
    
    const container = document.getElementById('conversationsList');
    if (!container) return;
    
    if (conversations.size === 0) {
        container.innerHTML = '<p class="empty">No conversations yet</p>';
        return;
    }
    
    container.innerHTML = Array.from(conversations.values()).map(conv => `
        <div class="conversation-item" data-user-id="${conv.partner.id}">
            <img class="conversation-avatar" src="${conv.partner.profile_image || '/assets/images/default-avatar.png'}" alt="">
            <div class="conversation-info">
                <div class="conversation-name">${escapeHtml(conv.partner.full_name)}</div>
                <div class="conversation-last-message">${escapeHtml(conv.lastMessage?.substring(0, 50) || '')}</div>
            </div>
            <div class="conversation-time">${window.formatDate(conv.lastMessageTime)}</div>
        </div>
    `).join('');
    
    // Add click handlers
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.addEventListener('click', () => {
            const userId = item.dataset.userId;
            openPrivateChat(userId);
        });
    });
}

// Open private chat with a user
async function openPrivateChat(userId) {
    // Get user info
    const { data: user } = await supabase
        .from('users')
        .select('full_name, profile_image')
        .eq('id', userId)
        .single();
    
    if (!user) return;
    
    document.getElementById('chatWithName').textContent = user.full_name;
    document.getElementById('privateChatModal').classList.add('active');
    
    // Load messages
    await loadPrivateMessages(userId);
    
    // Setup realtime for private messages
    setupPrivateChatRealtime(userId);
}

// Load private messages
async function loadPrivateMessages(otherUserId) {
    const { data: messages } = await supabase
        .from('private_messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });
    
    const container = document.getElementById('privateChatMessages');
    if (!container) return;
    
    container.innerHTML = messages?.map(msg => {
        const isOwn = msg.sender_id === currentUser.id;
        return `
            <div class="message ${isOwn ? 'sent' : 'received'}">
                <div class="message-bubble">${escapeHtml(msg.message)}</div>
                <div class="message-time">${window.formatChatTime(msg.created_at)}</div>
            </div>
        `;
    }).join('') || '<p class="empty">No messages yet</p>';
    
    scrollPrivateChatToBottom();
}

// Send private message
async function sendPrivateMessage(receiverId, message) {
    if (!message.trim()) return;
    
    const { error } = await supabase
        .from('private_messages')
        .insert({
            sender_id: currentUser.id,
            receiver_id: receiverId,
            message: message
        });
    
    if (error) {
        console.error('Error sending message:', error);
        showToast('Error sending message', 'error');
    } else {
        const input = document.getElementById('privateMessageInput');
        if (input) input.value = '';
        await loadPrivateMessages(receiverId);
    }
}

// Setup realtime for private chat
function setupPrivateChatRealtime(otherUserId) {
    if (messageSubscription) {
        messageSubscription.unsubscribe();
    }
    
    messageSubscription = supabase
        .channel(`private-${currentUser.id}-${otherUserId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'private_messages',
            filter: `or(and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id}))`
        }, () => {
            loadPrivateMessages(otherUserId);
        })
        .subscribe();
}

// Scroll private chat to bottom
function scrollPrivateChatToBottom() {
    const container = document.getElementById('privateChatMessages');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search users
    const searchInput = document.getElementById('searchUsers');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            loadConversations(e.target.value);
        });
    }
    
    // Edit profile
    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            showEditProfileModal();
        });
    }
    
    // Change password
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', () => {
            showChangePasswordModal();
        });
    }
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.handleLogout();
        });
    }
    
    // Edit avatar
    const editAvatarBtn = document.getElementById('editAvatarBtn');
    if (editAvatarBtn) {
        editAvatarBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    await updateAvatar(file);
                }
            };
            input.click();
        });
    }
    
    // Private chat send button
    const sendPrivateBtn = document.getElementById('sendPrivateBtn');
    if (sendPrivateBtn) {
        sendPrivateBtn.addEventListener('click', () => {
            const chatModal = document.getElementById('privateChatModal');
            const chatWithName = document.getElementById('chatWithName');
            if (chatModal.classList.contains('active')) {
                // Get the user ID from the chat
                const userId = chatModal.dataset.userId;
                const input = document.getElementById('privateMessageInput');
                sendPrivateMessage(userId, input.value);
            }
        });
    }
    
    // Private message input enter key
    const privateMessageInput = document.getElementById('privateMessageInput');
    if (privateMessageInput) {
        privateMessageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const chatModal = document.getElementById('privateChatModal');
                if (chatModal.classList.contains('active')) {
                    const userId = chatModal.dataset.userId;
                    sendPrivateMessage(userId, e.target.value);
                }
            }
        });
    }
}

// Update avatar
async function updateAvatar(file) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUser.id}_avatar.${fileExt}`;
        const url = await uploadFile('avatars', fileName, file);
        
        const { error } = await supabase
            .from('users')
            .update({ profile_image: url })
            .eq('id', currentUser.id);
        
        if (error) throw error;
        
        document.getElementById('profileAvatar').src = url;
        showToast('Avatar updated!', 'success');
    } catch (error) {
        console.error('Error updating avatar:', error);
        showToast('Error updating avatar', 'error');
    }
}

// Show edit profile modal
function showEditProfileModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h3>Edit Profile</h3>
            <form id="editProfileForm" class="admin-form">
                <label>Full Name</label>
                <input type="text" id="edit-fullname" value="${escapeHtml(currentUser.full_name)}">
                <label>Parish</label>
                <input type="text" id="edit-parish" value="${escapeHtml(currentUser.parish_name)}" disabled>
                <div class="form-actions">
                    <button type="submit">Save Changes</button>
                    <button type="button" class="cancel-btn">Cancel</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.close').addEventListener('click', () => modal.remove());
    modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
    
    modal.querySelector('#editProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('edit-fullname').value;
        
        const { error } = await supabase
            .from('users')
            .update({ full_name: fullName })
            .eq('id', currentUser.id);
        
        if (error) {
            showToast('Error updating profile', 'error');
        } else {
            showToast('Profile updated!', 'success');
            modal.remove();
            loadProfile();
        }
    });
}

// Show change password modal
function showChangePasswordModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h3>Change Password</h3>
            <form id="changePasswordForm" class="admin-form">
                <label>Current Password</label>
                <input type="password" id="current-password" required>
                <label>New Password</label>
                <input type="password" id="new-password" required>
                <label>Confirm New Password</label>
                <input type="password" id="confirm-password" required>
                <div class="form-actions">
                    <button type="submit">Update Password</button>
                    <button type="button" class="cancel-btn">Cancel</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.close').addEventListener('click', () => modal.remove());
    modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
    
    modal.querySelector('#changePasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (newPassword !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }
        
        // Update password via Supabase
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });
        
        if (error) {
            showToast(error.message, 'error');
        } else {
            showToast('Password updated!', 'success');
            modal.remove();
        }
    });
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('profileName')) {
        initProfile();
    }
});

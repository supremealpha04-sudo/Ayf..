import { supabase, getCurrentUser, uploadFile } from '../config/supabase.js';

let currentUser = null;
let currentParish = null;
let messageSubscription = null;

// Initialize parish chat
export async function initParishChat() {
    currentUser = await getCurrentUser();
    currentParish = currentUser.parish_name;
    
    document.getElementById('parishName').textContent = currentParish;
    
    await loadMessages();
    await setupRealtime();
    setupEventListeners();
    await loadMemberCount();
}

// Load chat messages
async function loadMessages() {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    showLoading(container);
    
    const { data: messages, error } = await supabase
        .from('parish_messages')
        .select(`
            *,
            sender:sender_id (full_name, profile_image)
        `)
        .eq('parish_name', currentParish)
        .order('created_at', { ascending: true })
        .limit(100);
    
    if (error) {
        console.error('Error loading messages:', error);
        container.innerHTML = '<p class="error">Error loading messages</p>';
        return;
    }
    
    renderMessages(messages || []);
    scrollToBottom();
}

// Render messages
function renderMessages(messages) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    container.innerHTML = messages.map(msg => renderMessage(msg)).join('');
}

// Render single message
function renderMessage(msg) {
    const isOwn = msg.sender_id === currentUser.id;
    const messageClass = isOwn ? 'sent' : 'received';
    
    let mediaHtml = '';
    if (msg.file_url) {
        if (msg.file_type?.startsWith('image/')) {
            mediaHtml = `<img class="message-file" src="${msg.file_url}" alt="Image" onclick="window.open('${msg.file_url}', '_blank')">`;
        } else if (msg.file_type?.startsWith('video/')) {
            mediaHtml = `<video class="message-file video" controls src="${msg.file_url}"></video>`;
        } else {
            mediaHtml = `<a class="message-file" href="${msg.file_url}" target="_blank">📎 Download File</a>`;
        }
    }
    
    return `
        <div class="message ${messageClass}" data-message-id="${msg.id}">
            ${!isOwn ? `<div class="message-sender">${escapeHtml(msg.sender?.full_name || 'Unknown')}</div>` : ''}
            <div class="message-bubble">
                ${msg.message ? `<div>${escapeHtml(msg.message)}</div>` : ''}
                ${mediaHtml}
            </div>
            <div class="message-time">${window.formatChatTime(msg.created_at)}</div>
        </div>
    `;
}

// Send message
async function sendMessage(message, file = null) {
    if (!message && !file) return;
    
    let fileUrl = null;
    let fileType = null;
    
    if (file) {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            fileUrl = await uploadFile('chat-files', `parish/${currentParish}/${fileName}`, file);
            fileType = file.type;
        } catch (error) {
            console.error('Error uploading file:', error);
            showToast('Error uploading file', 'error');
            return;
        }
    }
    
    const { error } = await supabase
        .from('parish_messages')
        .insert({
            parish_name: currentParish,
            sender_id: currentUser.id,
            message: message || null,
            file_url: fileUrl,
            file_type: fileType
        });
    
    if (error) {
        console.error('Error sending message:', error);
        showToast('Error sending message', 'error');
    } else {
        const input = document.getElementById('messageInput');
        if (input) input.value = '';
    }
}

// Setup realtime for new messages
function setupRealtime() {
    if (messageSubscription) {
        messageSubscription.unsubscribe();
    }
    
    messageSubscription = supabase
        .channel(`parish-${currentParish}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'parish_messages',
            filter: `parish_name=eq.${currentParish}`
        }, payload => {
            const newMessage = payload.new;
            const container = document.getElementById('chatMessages');
            if (container) {
                container.insertAdjacentHTML('beforeend', renderMessage(newMessage));
                scrollToBottom();
            }
        })
        .subscribe();
}

// Setup event listeners
function setupEventListeners() {
    const sendBtn = document.getElementById('sendBtn');
    const messageInput = document.getElementById('messageInput');
    const attachBtn = document.getElementById('attachBtn');
    const fileInput = document.getElementById('fileInput');
    
    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            const message = messageInput?.value.trim();
            if (message) sendMessage(message);
        });
    }
    
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const message = messageInput.value.trim();
                if (message) sendMessage(message);
            }
        });
    }
    
    if (attachBtn && fileInput) {
        attachBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await sendMessage(null, file);
                fileInput.value = '';
            }
        });
    }
    
    const chatMenuBtn = document.getElementById('chatMenuBtn');
    if (chatMenuBtn) {
        chatMenuBtn.addEventListener('click', () => {
            document.getElementById('chatMenuModal').classList.add('active');
        });
    }
    
    const viewMembersBtn = document.getElementById('viewMembersBtn');
    if (viewMembersBtn) {
        viewMembersBtn.addEventListener('click', () => {
            loadMembers();
            document.getElementById('membersModal').classList.add('active');
        });
    }
}

// Load parish members
async function loadMembers() {
    const { data: members } = await supabase
        .from('users')
        .select('id, full_name, profile_image, role, status')
        .eq('parish_name', currentParish)
        .eq('status', 'active');
    
    const container = document.getElementById('membersList');
    if (!container) return;
    
    const isPresident = currentUser.role === 'parish_exco' || currentUser.role === 'admin';
    
    container.innerHTML = (members || []).map(member => `
        <div class="member-item" data-user-id="${member.id}">
            <img class="member-avatar" src="${member.profile_image || '/assets/images/default-avatar.png'}" alt="">
            <div class="member-info">
                <div class="member-name">${escapeHtml(member.full_name)}</div>
                <div class="member-role">${member.role}</div>
            </div>
            ${isPresident && member.id !== currentUser.id ? `
                <div class="member-actions">
                    <button class="suspend-btn" data-user-id="${member.id}">Suspend</button>
                </div>
            ` : ''}
        </div>
    `).join('');
    
    // Add suspend handlers
    document.querySelectorAll('.suspend-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.dataset.userId;
            await suspendMember(userId);
        });
    });
}

// Suspend a member
async function suspendMember(userId) {
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
            parish_name: currentParish,
            duration_days: days,
            end_date: endDate.toISOString(),
            suspended_by: currentUser.id
        });
    
    if (error) {
        console.error('Error suspending member:', error);
        showToast('Error suspending member', 'error');
    } else {
        // Update user status
        await supabase
            .from('users')
            .update({ status: 'suspended' })
            .eq('id', userId);
        
        showToast('Member suspended successfully', 'success');
        loadMembers();
    }
}

// Load member count
async function loadMemberCount() {
    const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('parish_name', currentParish)
        .eq('status', 'active');
    
    const memberCountSpan = document.getElementById('memberCount');
    if (memberCountSpan) {
        memberCountSpan.textContent = `${count || 0} members`;
    }
}

// Scroll to bottom of chat
function scrollToBottom() {
    const container = document.getElementById('chatMessages');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
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
    if (document.getElementById('chatMessages')) {
        initParishChat();
    }
});

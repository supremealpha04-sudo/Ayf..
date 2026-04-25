import { supabase, getCurrentUser } from '../config/supabase.js';

let currentUser = null;
let currentFilter = 'all';

// Initialize feed
export async function initFeed() {
    currentUser = await getCurrentUser();
    await loadFeed();
    setupFilters();
    setupRealtime();
}

// Load feed posts
async function loadFeed() {
    const container = document.getElementById('feedContainer');
    if (!container) return;
    
    showLoading(container);
    
    let query = supabase
        .from('posts')
        .select(`
            *,
            users:created_by (full_name, profile_image)
        `)
        .order('created_at', { ascending: false });
    
    if (currentFilter !== 'all') {
        query = query.eq('type', currentFilter);
    }
    
    const { data: posts, error } = await query;
    
    if (error) {
        console.error('Error loading feed:', error);
        container.innerHTML = '<p class="error">Error loading feed</p>';
        return;
    }
    
    if (posts.length === 0) {
        container.innerHTML = '<p class="empty">No posts yet</p>';
        return;
    }
    
    container.innerHTML = posts.map(post => renderPost(post)).join('');
    
    // Attach event listeners to new posts
    attachPostEventListeners();
}

// Render a single post
function renderPost(post) {
    const postTypeClass = post.type;
    const postTypeLabel = post.type.charAt(0).toUpperCase() + post.type.slice(1);
    
    let mediaHtml = '';
    if (post.file_url) {
        if (post.type === 'video') {
            mediaHtml = `<video class="post-media" controls src="${post.file_url}"></video>`;
        } else if (post.file_url.match(/\.(jpg|jpeg|png|gif)$/i)) {
            mediaHtml = `<img class="post-media" src="${post.file_url}" alt="${post.title}" onclick="window.openPostImage('${post.file_url}')">`;
        } else if (post.type === 'minutes') {
            mediaHtml = `<div class="post-file">
                <a href="${post.file_url}" target="_blank">📄 View Document</a>
            </div>`;
        }
    }
    
    let countdownHtml = '';
    if (post.type === 'event' && post.event_date) {
        const eventDate = new Date(post.event_date);
        const now = new Date();
        const diff = eventDate - now;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days > 0) {
            countdownHtml = `<div class="event-countdown">📅 ${days} days away</div>`;
        }
    }
    
    return `
        <div class="post-card" data-post-id="${post.id}">
            <div class="post-header">
                <img class="post-avatar" src="${post.users?.profile_image || '/assets/images/default-avatar.png'}" alt="">
                <div class="post-author">
                    <h4>${escapeHtml(post.users?.full_name || 'Unknown')}</h4>
                    <span class="post-date">${window.formatDate(post.created_at)}</span>
                </div>
                <span class="post-type-badge ${postTypeClass}">${postTypeLabel}</span>
            </div>
            
            ${mediaHtml}
            
            <div class="post-content">
                <h3 class="post-title">${escapeHtml(post.title)}</h3>
                <p class="post-description">${escapeHtml(post.description || '')}</p>
                ${countdownHtml}
            </div>
            
            <div class="post-actions">
                <button class="post-action like-btn" data-post-id="${post.id}">
                    ❤️ <span class="like-count">0</span>
                </button>
                <button class="post-action comment-btn" data-post-id="${post.id}">
                    💬 <span class="comment-count">0</span>
                </button>
                <button class="post-action share-btn" data-post-id="${post.id}">
                    📤 Share
                </button>
                ${post.file_url && post.type !== 'event' && post.type !== 'minutes' ? `
                    <button class="post-action download-btn" data-url="${post.file_url}">
                        📥 Download
                    </button>
                ` : ''}
            </div>
            
            <div class="comments-section" data-post-id="${post.id}">
                <div class="comments-list"></div>
                <div class="add-comment">
                    <input type="text" placeholder="Write a comment..." data-post-id="${post.id}">
                    <button class="submit-comment" data-post-id="${post.id}">Post</button>
                </div>
            </div>
        </div>
    `;
}

// Attach event listeners to posts
function attachPostEventListeners() {
    // Like buttons
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const postId = btn.dataset.postId;
            await toggleLike(postId);
        });
        loadLikeCount(btn.dataset.postId);
    });
    
    // Comment buttons
    document.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const postId = btn.dataset.postId;
            const commentsSection = document.querySelector(`.comments-section[data-post-id="${postId}"]`);
            commentsSection.classList.toggle('active');
            if (commentsSection.classList.contains('active')) {
                loadComments(postId);
            }
        });
    });
    
    // Share buttons
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const postId = btn.dataset.postId;
            await sharePost(postId);
        });
    });
    
    // Download buttons
    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const url = btn.dataset.url;
            window.open(url, '_blank');
        });
    });
    
    // Submit comments
    document.querySelectorAll('.submit-comment').forEach(btn => {
        btn.addEventListener('click', async () => {
            const postId = btn.dataset.postId;
            const input = document.querySelector(`.add-comment input[data-post-id="${postId}"]`);
            const content = input.value.trim();
            if (content) {
                await addComment(postId, content);
                input.value = '';
                await loadComments(postId);
            }
        });
    });
}

// Toggle like on a post
async function toggleLike(postId) {
    try {
        // Check if already liked
        const { data: existing } = await supabase
            .from('likes')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', currentUser.id)
            .single();
        
        if (existing) {
            // Unlike
            await supabase
                .from('likes')
                .delete()
                .eq('id', existing.id);
        } else {
            // Like
            await supabase
                .from('likes')
                .insert({
                    post_id: postId,
                    user_id: currentUser.id
                });
        }
        
        // Update count
        await loadLikeCount(postId);
    } catch (error) {
        console.error('Error toggling like:', error);
    }
}

// Load like count for a post
async function loadLikeCount(postId) {
    const { count } = await supabase
        .from('likes')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', postId);
    
    const likeBtn = document.querySelector(`.like-btn[data-post-id="${postId}"]`);
    if (likeBtn) {
        const countSpan = likeBtn.querySelector('.like-count');
        if (countSpan) countSpan.textContent = count || 0;
    }
}

// Load comments for a post
async function loadComments(postId) {
    const { data: comments } = await supabase
        .from('comments')
        .select(`
            *,
            users:user_id (full_name, profile_image)
        `)
        .eq('post_id', postId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: true });
    
    const commentsList = document.querySelector(`.comments-section[data-post-id="${postId}"] .comments-list`);
    if (!commentsList) return;
    
    if (!comments || comments.length === 0) {
        commentsList.innerHTML = '<p class="no-comments">No comments yet</p>';
        return;
    }
    
    commentsList.innerHTML = comments.map(comment => `
        <div class="comment" data-comment-id="${comment.id}">
            <img class="comment-avatar" src="${comment.users?.profile_image || '/assets/images/default-avatar.png'}" alt="">
            <div class="comment-content">
                <div class="comment-author">${escapeHtml(comment.users?.full_name || 'Unknown')}</div>
                <div class="comment-text">${escapeHtml(comment.content)}</div>
                <div class="comment-reply" data-comment-id="${comment.id}">Reply</div>
            </div>
        </div>
    `).join('');
    
    // Add reply handlers
    document.querySelectorAll('.comment-reply').forEach(replyBtn => {
        replyBtn.addEventListener('click', () => {
            const parentId = replyBtn.dataset.commentId;
            const input = document.querySelector(`.add-comment input[data-post-id="${postId}"]`);
            input.placeholder = `Reply to comment...`;
            input.dataset.parentId = parentId;
        });
    });
}

// Add comment to a post
async function addComment(postId, content) {
    try {
        await supabase
            .from('comments')
            .insert({
                post_id: postId,
                user_id: currentUser.id,
                content: content
            });
        
        showToast('Comment added!', 'success');
    } catch (error) {
        console.error('Error adding comment:', error);
        showToast('Error adding comment', 'error');
    }
}

// Share a post
async function sharePost(postId) {
    const postUrl = `${window.location.origin}/post/${postId}`;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'AYF GWARIMPA Post',
                url: postUrl
            });
        } catch (err) {
            copyToClipboard(postUrl);
        }
    } else {
        copyToClipboard(postUrl);
    }
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    showToast('Link copied to clipboard!', 'success');
}

// Setup filter buttons
function setupFilters() {
    const filterBtn = document.getElementById('filterBtn');
    const filterBar = document.getElementById('filterBar');
    
    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            filterBar.style.display = filterBar.style.display === 'none' ? 'flex' : 'none';
        });
    }
    
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.dataset.filter;
            loadFeed();
        });
    });
}

// Setup realtime updates
function setupRealtime() {
    supabase
        .channel('feed-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
            loadFeed();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => {
            // Refresh like counts
            document.querySelectorAll('.like-btn').forEach(btn => {
                loadLikeCount(btn.dataset.postId);
            });
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('feedContainer')) {
        initFeed();
    }
});

// Feed management functions

// Fetch and display featured content
async function loadFeaturedContent() {
    const { data, error } = await supabaseClient
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);
    
    if (error) {
        console.error('Error loading feeds:', error);
        return;
    }
    
    const feedContainer = document.getElementById('featuredFeed');
    if (feedContainer) {
        feedContainer.innerHTML = data.map(post => createPostCard(post)).join('');
    }
}

// Create post card HTML
function createPostCard(post) {
    const canInteract = window.auth.canInteract();
    
    return `
        <div class="card" data-post-id="${post.id}">
            <h3>${post.title}</h3>
            ${post.media_url ? `<img src="${post.media_url}" alt="${post.title}" style="width:100%; border-radius:8px;">` : ''}
            <p>${post.content.substring(0, 150)}${post.content.length > 150 ? '...' : ''}</p>
            <small>${post.type} | ${post.parish || 'General'} | ${new Date(post.created_at).toLocaleDateString()}</small>
            ${canInteract ? `
                <div class="interactions">
                    <button class="like-btn" data-post-id="${post.id}">❤️ Like</button>
                    <button class="comment-btn" data-post-id="${post.id}">💬 Comment</button>
                    <button class="share-btn" data-post-id="${post.id}">📤 Share</button>
                </div>
            ` : ''}
        </div>
    `;
}

// Load videos with filters
async function loadVideos(parish = 'all', category = 'all') {
    let query = supabaseClient
        .from('posts')
        .select('*')
        .eq('type', 'video')
        .order('created_at', { ascending: false });
    
    if (parish !== 'all') {
        query = query.eq('parish', parish);
    }
    
    if (category !== 'all') {
        query = query.eq('category', category);
    }
    
    const { data, error } = await query;
    
    if (error) {
        console.error('Error loading videos:', error);
        return;
    }
    
    const videosGrid = document.getElementById('videosGrid');
    if (videosGrid) {
        videosGrid.innerHTML = data.map(video => `
            <div class="card">
                <h3>${video.title}</h3>
                ${video.media_url ? `<video controls src="${video.media_url}" style="width:100%"></video>` : ''}
                <p>${video.content}</p>
                <small>${video.parish || 'General'}</small>
            </div>
        `).join('');
    }
}

// Load parish feed
async function loadParishFeed() {
    const user = window.auth.getCurrentUser();
    if (!user) {
        window.location.href = '/profile.html';
        return;
    }
    
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('parish')
        .eq('id', user.id)
        .single();
    
    const { data, error } = await supabaseClient
        .from('posts')
        .select('*')
        .eq('parish', profile.parish)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error loading parish feed:', error);
        return;
    }
    
    const parishFeed = document.getElementById('parishFeed');
    if (parishFeed) {
        parishFeed.innerHTML = data.map(post => createPostCard(post)).join('');
        document.getElementById('parishName').innerHTML = `${profile.parish} Feed`;
    }
}

// Load yearly plans
async function loadPlans() {
    const { data, error } = await supabaseClient
        .from('yearly_plans')
        .select('*')
        .order('year', { ascending: false });
    
    if (error) {
        console.error('Error loading plans:', error);
        return;
    }
    
    const plansList = document.getElementById('plansList');
    if (plansList) {
        plansList.innerHTML = data.map(plan => `
            <div class="card">
                <h3>${plan.title}</h3>
                <p>Year: ${plan.year}</p>
                ${plan.quota_info ? `<p>Quota: ${plan.quota_info}</p>` : ''}
                <button onclick="previewPDF('${plan.file_url}')" class="btn btn-primary">Preview PDF</button>
            </div>
        `).join('');
    }
}

// PDF Preview function
async function previewPDF(url) {
    const modal = document.getElementById('pdfModal');
    const canvas = document.getElementById('pdfCanvas');
    
    modal.style.display = 'flex';
    
    const pdf = await pdfjsLib.getDocument(url).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context, viewport: viewport }).promise;
}

// Initialize feeds based on current page
document.addEventListener('DOMContentLoaded', async () => {
    await window.auth.checkAuth();
    
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('index.html') || currentPage === '/') {
        loadFeaturedContent();
    } else if (currentPage.includes('videos.html')) {
        loadVideos();
        
        // Setup filters
        const parishFilter = document.getElementById('parishFilter');
        const categoryFilter = document.getElementById('categoryFilter');
        
        if (parishFilter) {
            parishFilter.addEventListener('change', () => {
                loadVideos(parishFilter.value, categoryFilter?.value || 'all');
            });
        }
        
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                loadVideos(parishFilter?.value || 'all', categoryFilter.value);
            });
        }
    } else if (currentPage.includes('parish.html')) {
        loadParishFeed();
    } else if (currentPage.includes('plan.html')) {
        loadPlans();
    }
});

// Make functions available globally
window.loadVideos = loadVideos;
window.previewPDF = previewPDF;

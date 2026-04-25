import { supabase, getCurrentUser } from '../config/supabase.js';

let currentUser = null;

// Initialize plan viewer
export async function initPlan() {
    currentUser = await getCurrentUser();
    await loadPlans();
    setupEventListeners();
}

// Load yearly plans
async function loadPlans() {
    const container = document.getElementById('planContainer');
    if (!container) return;
    
    showLoading(container);
    
    const { data: plans, error } = await supabase
        .from('yearly_plans')
        .select('*')
        .order('year', { ascending: false });
    
    if (error) {
        console.error('Error loading plans:', error);
        container.innerHTML = '<p class="error">Error loading plans</p>';
        return;
    }
    
    if (!plans || plans.length === 0) {
        container.innerHTML = '<p class="empty">No yearly plans available yet</p>';
        return;
    }
    
    container.innerHTML = plans.map(plan => renderPlan(plan)).join('');
    
    // Attach event listeners
    attachPlanEventListeners();
}

// Render a single plan
function renderPlan(plan) {
    // Sample monthly activities (you can fetch these from a separate table)
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    
    const monthlyHtml = months.map((month, index) => `
        <div class="month-card">
            <div class="month-header" data-month="${index}">
                <span>${month}</span>
                <span class="chevron">▼</span>
            </div>
            <div class="month-content" data-month-content="${index}">
                <div class="activity-item">
                    <div class="activity-date">Week ${Math.floor(index / 2) + 1}</div>
                    <div class="activity-title">Fellowship Meeting</div>
                    <div class="activity-description">Regular fellowship gathering</div>
                </div>
            </div>
        </div>
    `).join('');
    
    return `
        <div class="plan-card" data-plan-id="${plan.id}">
            <div class="plan-year">${plan.year}</div>
            <div class="plan-title">${escapeHtml(plan.title)}</div>
            <div class="plan-description">${escapeHtml(plan.description || '')}</div>
            <div class="plan-actions">
                <button class="view-pdf-btn" data-url="${plan.file_url}">📄 View PDF</button>
                <button class="download-plan-btn" data-url="${plan.file_url}">📥 Download</button>
                <button class="share-plan-btn">📤 Share</button>
            </div>
        </div>
        <div class="monthly-plan">
            <h3>${plan.year} Activities</h3>
            ${monthlyHtml}
        </div>
    `;
}

// Attach event listeners to plan elements
function attachPlanEventListeners() {
    // View PDF buttons
    document.querySelectorAll('.view-pdf-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const url = btn.dataset.url;
            openPdfViewer(url);
        });
    });
    
    // Download buttons
    document.querySelectorAll('.download-plan-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const url = btn.dataset.url;
            window.open(url, '_blank');
        });
    });
    
    // Share buttons
    document.querySelectorAll('.share-plan-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const planCard = btn.closest('.plan-card');
            const planId = planCard.dataset.planId;
            await sharePlan(planId);
        });
    });
    
    // Month header expand/collapse
    document.querySelectorAll('.month-header').forEach(header => {
        header.addEventListener('click', () => {
            const monthIndex = header.dataset.month;
            const content = document.querySelector(`.month-content[data-month-content="${monthIndex}"]`);
            header.classList.toggle('expanded');
            content.classList.toggle('active');
        });
    });
}

// Open PDF viewer
function openPdfViewer(url) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 90%; height: 90vh;">
            <span class="close">&times;</span>
            <div class="pdf-viewer">
                <embed src="${url}" width="100%" height="100%" type="application/pdf">
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.close').addEventListener('click', () => {
        modal.remove();
    });
}

// Share plan
async function sharePlan(planId) {
    const planUrl = `${window.location.origin}/plan/${planId}`;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'AYF GWARIMPA Yearly Plan',
                url: planUrl
            });
        } catch (err) {
            copyToClipboard(planUrl);
        }
    } else {
        copyToClipboard(planUrl);
    }
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    showToast('Link copied to clipboard!', 'success');
}

// Setup event listeners for share button
function setupEventListeners() {
    const shareBtn = document.getElementById('sharePlanBtn');
    if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
            const planCard = document.querySelector('.plan-card');
            if (planCard) {
                const planId = planCard.dataset.planId;
                await sharePlan(planId);
            }
        });
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
    if (document.getElementById('planContainer')) {
        initPlan();
    }
});

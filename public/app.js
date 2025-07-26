// API configuration
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001/api' 
    : '/api';
let authToken = null;
let currentUser = null;

// DOM elements
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const signinForm = document.getElementById('signin-form');
const signupForm = document.getElementById('signup-form');
const contentForm = document.getElementById('content-form');
const authMessage = document.getElementById('auth-message');
const userEmail = document.getElementById('user-email');
const contentList = document.getElementById('content-list');
const resultsSection = document.getElementById('results-section');
const amplifiedResults = document.getElementById('amplified-results');

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        if (tab === 'signin') {
            signinForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
        } else {
            signupForm.classList.remove('hidden');
            signinForm.classList.add('hidden');
        }
    });
});

// Auth functions
async function signIn(email, password) {
    try {
        const response = await fetch(`${API_URL}/auth/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('Sign in error:', data);
            throw new Error(data.error || 'Sign in failed');
        }
        
        if (data.session) {
            authToken = data.session.access_token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            showDashboard();
            showMessage('Signed in successfully! 🎉', 'success');
        }
    } catch (error) {
        console.error('Sign in error:', error);
        showMessage(error.message, 'error');
    }
}

async function signUp(email, password, fullName) {
    try {
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, fullName })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Sign up failed');
        }
        
        showMessage('Account created! Please check your email to verify your account.', 'success');
    } catch (error) {
        console.error('Sign up error:', error);
        showMessage(error.message, 'error');
    }
}

async function signOut() {
    try {
        await fetch(`${API_URL}/auth/signout`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json' 
            }
        });
        
        authToken = null;
        currentUser = null;
        localStorage.removeItem('authToken');
        showAuth();
        showMessage('Signed out successfully', 'success');
    } catch (error) {
        console.error('Sign out error:', error);
        authToken = null;
        currentUser = null;
        localStorage.removeItem('authToken');
        showAuth();
    }
}

// Message display
function showMessage(message, type = 'info') {
    const messageEl = authMessage;
    messageEl.textContent = message;
    messageEl.className = `auth-message ${type}`;
    messageEl.classList.remove('hidden');
    
    setTimeout(() => {
        messageEl.classList.add('hidden');
    }, 5000);
}

// UI display functions
function showAuth() {
    authSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
}

function showDashboard() {
    authSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    userEmail.textContent = currentUser.email;
    
    // Load user's content
    loadContent();
}

// Archive state
let allContent = [];
let expandedItems = new Set();

// Archive DOM elements
const archiveSearch = document.getElementById('archive-search');
const archiveFilter = document.getElementById('archive-filter');

// Enhanced content functions with backend integration
async function loadContent() {
    try {
        console.log('Loading content from server...');
        
        if (!authToken) {
            displayClientOnlyMode();
            return;
        }

        const response = await fetch(`${API_URL}/content`, {
            headers: { 
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json' 
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load content');
        }
        
        const data = await response.json();
        allContent = data.content || [];
        
        console.log('Loaded content:', allContent);
        
        if (allContent.length === 0) {
            displayEmptyState();
        } else {
            displayContent(allContent);
        }
        
    } catch (error) {
        console.error('Error loading content:', error);
        displayClientOnlyMode();
    }
}

// Client-only mode for when server is having issues
function displayClientOnlyMode() {
    console.log('Running in client-only mode');
    contentList.innerHTML = `
        <div class="client-mode-notice">
            <h3>🚀 Ready to Branch Out Content!</h3>
            <p>Create content above and it will be branched using smart templates optimized for each social platform.</p>
            <p><small>Note: Running in client-side mode. Your branched content won't be saved to the server archive.</small></p>
        </div>
    `;
}

function displayEmptyState() {
    contentList.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">🚀</div>
            <h3>Ready to Branch Out Content!</h3>
            <p>Create content above and it will be branched using smart templates optimized for each social platform.</p>
            <p>Your content will be saved and categorized for easy access later.</p>
        </div>
    `;
}

function filterAndDisplayContent() {
    const searchTerm = archiveSearch?.value?.toLowerCase() || '';
    const filterValue = archiveFilter?.value || 'all';
    
    let filtered = allContent;
    
    // Apply filter
    if (filterValue !== 'all') {
        if (filterValue === 'favorites') {
            filtered = filtered.filter(item => item.is_favorite);
        } else {
            filtered = filtered.filter(item => item.status === filterValue);
        }
    }
    
    // Apply search
    if (searchTerm) {
        filtered = filtered.filter(item => 
            (item.title?.toLowerCase().includes(searchTerm) ||
             item.original_content.toLowerCase().includes(searchTerm) ||
             item.subject_category?.toLowerCase().includes(searchTerm))
        );
    }
    
    displayContent(filtered);
}

function displayContent(content) {
    if (!content || content.length === 0) {
        contentList.innerHTML = '<p class="loading">No content found. Try adjusting your search or filter.</p>';
        return;
    }
    
    contentList.innerHTML = content.map(item => {
        const isExpanded = expandedItems.has(item.id);
        const hasBranchedContent = item.platform_posts && item.platform_posts.length > 0;
        const createdDate = new Date(item.created_at);
        
        return `
            <div class="content-item ${isExpanded ? 'expanded' : ''}" data-id="${item.id}">
                <div class="content-header" onclick="toggleContentItem('${item.id}')">
                    <div class="content-meta">
                        <h3>${item.title || 'Untitled'}</h3>
                        <div class="content-tags">
                            ${item.subject_category ? `<span class="category-tag">${item.subject_category}</span>` : ''}
                            ${item.is_favorite ? '<span class="favorite-indicator">⭐</span>' : ''}
                            <span class="date-tag">${createdDate.toLocaleDateString()}</span>
                            ${hasBranchedContent ? '<span class="platform-tag">📱 Branched</span>' : ''}
                        </div>
                    </div>
                    <div class="content-actions">
                        <button onclick="event.stopPropagation(); toggleFavorite('${item.id}', ${!item.is_favorite})" 
                                class="favorite-btn ${item.is_favorite ? 'active' : ''}" 
                                title="Toggle favorite">
                            ${item.is_favorite ? '⭐' : '☆'}
                        </button>
                        <span class="expand-icon">${isExpanded ? '▼' : '▶'}</span>
                    </div>
                </div>
                <div class="content-preview">${item.original_content.substring(0, 150)}${item.original_content.length > 150 ? '...' : ''}</div>
                ${isExpanded ? `
                    <div class="content-full">
                        <div class="original-content">
                            <h4>Original Content:</h4>
                            <p>${item.original_content}</p>
                        </div>
                        ${hasBranchedContent ? renderBranchedVersions(item.platform_posts) : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function renderBranchedVersions(platformPosts) {
    const groupedPosts = platformPosts.reduce((acc, post) => {
        if (!acc[post.platform]) acc[post.platform] = [];
        acc[post.platform].push(post);
        return acc;
    }, {});
    
    return `
        <div class="branched-content">
            <h4>Platform Versions:</h4>
            ${Object.entries(groupedPosts).map(([platform, posts]) => `
                <div class="platform-section">
                    <h5>${platform.charAt(0).toUpperCase() + platform.slice(1)}</h5>
                    ${posts.map(post => `
                        <div class="platform-post">
                            <p>${post.adapted_content}</p>
                            <div class="post-actions">
                                <button onclick="copyPlatformContent(event, '${post.id}', '${platform}')" class="copy-btn">Copy</button>
                                <span class="char-count">${post.character_count} chars</span>
                                ${post.status === 'posted' ? '<span class="status-posted">Posted</span>' : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `).join('')}
        </div>
    `;
}

// Enhanced content creation with backend integration
async function createContent(title, content, platforms, tone) {
    try {
        console.log('Creating content with backend integration...');
        
        // Show amplification animation
        showBranchingAnimation(platforms);
        
        // Determine subject category based on content
        const subjectCategory = await determineSubjectCategory(content);
        
        // Create content in database first
        let savedContent = null;
        if (authToken) {
            try {
                const contentResponse = await fetch(`${API_URL}/content`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({
                        title: title || generateTitleFromContent(content),
                        originalContent: content,
                        subjectCategory,
                        tags: extractTags(content, tone),
                        wordCount: content.split(/\s+/).length
                    })
                });
                
                if (contentResponse.ok) {
                    const contentData = await contentResponse.json();
                    savedContent = contentData.content;
                    console.log('Content saved to database:', savedContent);
                } else {
                    console.error('Failed to save content to database');
                }
            } catch (error) {
                console.error('Error saving content:', error);
            }
        }
        
        // Generate platform-specific content
        const results = await generatePlatformContent(content, platforms, tone);
        
        // Save platform posts to database if we have saved content
        if (savedContent && authToken) {
            await savePlatformPosts(savedContent.id, results);
        }
        
        // Hide animation and show results
        hideBranchingAnimation();
        displayBranchedResults(results);
        
        // Reset form
        contentForm.reset();
        
        // Reload content to show the new item
        if (authToken) {
            loadContent();
        }
        
        showMessage('Content branched successfully! 🚀', 'success');
        
    } catch (error) {
        console.error('Content creation error:', error);
        hideBranchingAnimation();
        alert('Failed to branch content: ' + error.message);
    }
}

// Helper functions for content processing
function determineSubjectCategory(content) {
    const keywords = {
        'Business': ['business', 'strategy', 'growth', 'revenue', 'profit', 'market', 'customer', 'sales'],
        'Technology': ['tech', 'software', 'AI', 'digital', 'innovation', 'app', 'platform', 'data'],
        'Marketing': ['marketing', 'brand', 'campaign', 'social media', 'content', 'advertising', 'promotion'],
        'Productivity': ['productivity', 'efficiency', 'workflow', 'time management', 'organization', 'planning'],
        'Personal': ['personal', 'life', 'experience', 'journey', 'story', 'reflection', 'thoughts'],
        'Education': ['learn', 'education', 'knowledge', 'skill', 'training', 'development', 'course'],
        'Health': ['health', 'wellness', 'fitness', 'mental health', 'wellbeing', 'exercise', 'nutrition']
    };
    
    const contentLower = content.toLowerCase();
    let bestMatch = 'General';
    let maxScore = 0;
    
    Object.entries(keywords).forEach(([category, terms]) => {
        const score = terms.reduce((sum, term) => {
            return sum + (contentLower.includes(term) ? 1 : 0);
        }, 0);
        
        if (score > maxScore) {
            maxScore = score;
            bestMatch = category;
        }
    });
    
    return bestMatch;
}

function generateTitleFromContent(content) {
    // Extract first sentence or first 50 characters as title
    const firstSentence = content.match(/^[^.!?]*[.!?]/);
    if (firstSentence) {
        return firstSentence[0].trim();
    }
    return content.substring(0, 50) + (content.length > 50 ? '...' : '');
}

function extractTags(content, tone) {
    const tags = [tone];
    const contentLower = content.toLowerCase();
    
    // Add relevant tags based on content
    if (contentLower.includes('announcement') || contentLower.includes('news')) tags.push('announcement');
    if (contentLower.includes('tip') || contentLower.includes('advice')) tags.push('tips');
    if (contentLower.includes('story') || contentLower.includes('experience')) tags.push('story');
    if (contentLower.includes('question') || contentLower.includes('what do you think')) tags.push('question');
    
    return [...new Set(tags)]; // Remove duplicates
}

async function generatePlatformContent(content, platforms, tone) {
    // Try server-side generation first, fallback to client-side templates
    if (authToken) {
        try {
            const response = await fetch(`${API_URL}/amplify`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({
                    content,
                    platforms,
                    tone
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Server-generated content:', data);
                return data.results;
            } else {
                console.log('Server generation failed, using fallback templates');
            }
        } catch (error) {
            console.error('Server generation error:', error);
        }
    }
    
    // Fallback to client-side templates
    return createFallbackBranching(content, platforms, tone);
}

async function savePlatformPosts(contentId, results) {
    try {
        const promises = Object.entries(results).map(async ([platform, result]) => {
            if (result.status === 'success') {
                return fetch(`${API_URL}/platforms`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({
                        contentId,
                        platform,
                        adaptedContent: Array.isArray(result.adaptedContent) 
                            ? result.adaptedContent.join('\n\n') 
                            : result.adaptedContent,
                        formatType: Array.isArray(result.adaptedContent) ? 'thread' : 'single',
                        characterCount: Array.isArray(result.adaptedContent) 
                            ? result.adaptedContent.reduce((sum, tweet) => sum + tweet.length, 0)
                            : result.adaptedContent.length
                    })
                });
            }
        });
        
        await Promise.all(promises);
        console.log('Platform posts saved successfully');
    } catch (error) {
        console.error('Error saving platform posts:', error);
    }
}

// Favorite toggle function
async function toggleFavorite(contentId, isFavorite) {
    try {
        if (!authToken) return;
        
        const response = await fetch(`${API_URL}/content/${contentId}/favorite`, {
            method: 'PATCH',
            headers: { 
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ is_favorite: isFavorite })
        });
        
        if (response.ok) {
            // Update local data
            const item = allContent.find(c => c.id === contentId);
            if (item) {
                item.is_favorite = isFavorite;
                displayContent(allContent);
            }
            
            showMessage(isFavorite ? 'Added to favorites ⭐' : 'Removed from favorites', 'success');
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
    }
}

// Store results globally for utility functions
let currentResults = {};

// File upload functionality
let uploadedFiles = [];
let isProcessingFiles = false;

// File upload event listeners
function initializeFileUpload() {
    const fileUploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('file-input');
    const filePreviewArea = document.getElementById('file-preview-area');
    const fileList = document.getElementById('file-list');
    const processingStatus = document.getElementById('processing-status');
    
    if (!fileUploadArea || !fileInput) return;
    
    // Click to upload
    fileUploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        handleFileSelection(e.target.files);
    });
    
    // Drag and drop
    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.classList.add('drag-over');
    });
    
    fileUploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        fileUploadArea.classList.remove('drag-over');
    });
    
    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.classList.remove('drag-over');
        handleFileSelection(e.dataTransfer.files);
    });
}

// Handle file selection
async function handleFileSelection(files) {
    if (files.length === 0) return;
    
    // Validate files
    const validFiles = [];
    const maxSize = 25 * 1024 * 1024; // 25MB
    const allowedTypes = [
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a',
        'video/mp4', 'video/mpeg', 'video/quicktime',
        'text/plain', 'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    for (let file of files) {
        if (file.size > maxSize) {
            showToast(`File ${file.name} is too large (max 25MB)`, 'error');
            continue;
        }
        
        const extension = file.name.toLowerCase().split('.').pop();
        const supportedExtensions = ['mp3', 'mp4', 'wav', 'm4a', 'txt', 'pdf', 'docx'];
        
        if (!allowedTypes.includes(file.type) && !supportedExtensions.includes(extension)) {
            showToast(`File type ${extension} not supported`, 'error');
            continue;
        }
        
        validFiles.push(file);
    }
    
    if (validFiles.length === 0) return;
    
    // Upload and process files
    await uploadFiles(validFiles);
}

// Upload files to server
async function uploadFiles(files) {
    const processingStatus = document.getElementById('processing-status');
    const filePreviewArea = document.getElementById('file-preview-area');
    const fileList = document.getElementById('file-list');
    
    // Show processing status
    processingStatus.style.display = 'flex';
    isProcessingFiles = true;
    
    try {
        const formData = new FormData();
        
        // Add files to FormData
        files.forEach(file => {
            formData.append('files', file);
        });
        
        // Add preview items immediately
        files.forEach(file => {
            const fileId = `temp-${Date.now()}-${Math.random()}`;
            addFilePreview(file, fileId, 'processing');
        });
        
        filePreviewArea.style.display = 'block';
        
        // Upload to server
        let response;
        if (authToken) {
            response = await fetch(`${API_URL}/files/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                },
                body: formData
            });
        } else {
            // Fallback for no auth - simulate processing
            await new Promise(resolve => setTimeout(resolve, 2000));
            response = {
                ok: true,
                json: () => Promise.resolve({
                    files: files.map(file => ({
                        id: `fallback-${Date.now()}`,
                        originalName: file.name,
                        size: file.size,
                        type: file.type,
                        status: 'completed',
                        content: '[File upload requires account - content will be processed when logged in]',
                        contentType: 'fallback'
                    }))
                })
            };
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Upload failed');
        }
        
        // Clear temporary previews
        fileList.innerHTML = '';
        
        // Add processed files
        data.files.forEach(file => {
            addFilePreview(file, file.id, file.status, file.content, file.error);
            if (file.status === 'completed' && file.content) {
                uploadedFiles.push({
                    id: file.id,
                    name: file.originalName,
                    content: file.content,
                    type: file.contentType
                });
            }
        });
        
        // Update textarea if we have content
        updateTextareaWithFileContent();
        
        showToast(`${data.files.length} file(s) processed successfully!`, 'success');
        
    } catch (error) {
        console.error('File upload error:', error);
        showToast('File upload failed: ' + error.message, 'error');
        
        // Update failed items
        const failedItems = fileList.querySelectorAll('.file-item');
        failedItems.forEach(item => {
            item.classList.remove('processing');
            item.classList.add('error');
            const status = item.querySelector('.file-status');
            if (status) {
                status.className = 'file-status error';
                status.textContent = 'Upload failed';
            }
        });
    } finally {
        processingStatus.style.display = 'none';
        isProcessingFiles = false;
    }
}

// Add file preview to UI
function addFilePreview(file, fileId, status, content = null, error = null) {
    const fileList = document.getElementById('file-list');
    
    const fileItem = document.createElement('div');
    fileItem.className = `file-item ${status}`;
    fileItem.dataset.fileId = fileId;
    
    const fileIcon = getFileIcon(file.type || file.originalName);
    const fileSize = formatFileSize(file.size);
    
    fileItem.innerHTML = `
        <div class="file-info">
            <div class="file-icon">${fileIcon}</div>
            <div class="file-details">
                <div class="file-name">${file.originalName || file.name}</div>
                <div class="file-meta">
                    <span>${fileSize}</span>
                    <span>${file.type}</span>
                </div>
            </div>
        </div>
        <div class="file-status ${status}">
            ${getStatusText(status, error)}
        </div>
        <div class="file-actions">
            ${status === 'completed' && content ? `<button class="file-action-btn" onclick="previewFileContent('${fileId}')">Preview</button>` : ''}
            <button class="file-action-btn danger" onclick="removeFile('${fileId}')">Remove</button>
        </div>
    `;
    
    fileList.appendChild(fileItem);
}

// Helper functions
function getFileIcon(typeOrName) {
    const type = typeOrName.toLowerCase();
    if (type.includes('audio') || type.includes('mp3') || type.includes('wav')) return '🎵';
    if (type.includes('video') || type.includes('mp4')) return '🎥';
    if (type.includes('text') || type.includes('txt')) return '📄';
    if (type.includes('pdf')) return '📕';
    if (type.includes('doc')) return '📘';
    return '📎';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getStatusText(status, error) {
    switch (status) {
        case 'processing': return 'Processing...';
        case 'completed': return 'Completed ✓';
        case 'error': return error || 'Error ✗';
        default: return status;
    }
}

// Update textarea with file content
function updateTextareaWithFileContent() {
    const textarea = document.getElementById('content-text');
    if (!textarea || uploadedFiles.length === 0) return;
    
    const existingContent = textarea.value.trim();
    const fileContents = uploadedFiles.map(file => {
        const header = `\n\n--- From ${file.name} ---\n`;
        return header + file.content;
    }).join('\n\n');
    
    if (existingContent) {
        textarea.value = existingContent + fileContents;
    } else {
        textarea.value = fileContents.trim();
    }
    
    // Auto-resize textarea
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(120, textarea.scrollHeight) + 'px';
}

// Global functions for UI interactions
window.previewFileContent = function(fileId) {
    const file = uploadedFiles.find(f => f.id === fileId);
    if (!file) return;
    
    // Create a simple modal for content preview
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;" onclick="this.remove()">
            <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 80%; max-height: 80%; overflow: auto;" onclick="event.stopPropagation()">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3>Preview: ${file.name}</h3>
                    <button onclick="this.closest('div').parentElement.remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
                </div>
                <div style="white-space: pre-wrap; font-family: monospace; background: #f5f5f5; padding: 1rem; border-radius: 4px; max-height: 400px; overflow: auto;">${file.content}</div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.removeFile = function(fileId) {
    // Remove from uploaded files array
    uploadedFiles = uploadedFiles.filter(f => f.id !== fileId);
    
    // Remove from UI
    const fileItem = document.querySelector(`[data-file-id="${fileId}"]`);
    if (fileItem) {
        fileItem.remove();
    }
    
    // Hide preview area if no files
    const fileList = document.getElementById('file-list');
    const filePreviewArea = document.getElementById('file-preview-area');
    if (fileList && fileList.children.length === 0) {
        filePreviewArea.style.display = 'none';
    }
    
    showToast('File removed', 'info');
};

window.clearAllFiles = function() {
    uploadedFiles = [];
    const fileList = document.getElementById('file-list');
    const filePreviewArea = document.getElementById('file-preview-area');
    
    if (fileList) fileList.innerHTML = '';
    if (filePreviewArea) filePreviewArea.style.display = 'none';
    
    showToast('All files cleared', 'info');
};

// Initialize file upload when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeFileUpload();
});

// Twitter character limit handler with thread support
function formatTwitterPost(text, suffix, tone) {
    const TWITTER_LIMIT = 280;
    const THREAD_NUMBERING = 4; // Space for " 1/X"
    
    // Handle different tones with prefixes
    let prefix = '';
    if (tone === 'urgent') {
        prefix = '🚨 ';
    } else if (tone === 'inspirational') {
        prefix = '✨ ';
    }
    
    // Check if we need to create a thread
    const fullContent = prefix + text + (suffix ? (tone === 'casual' || tone === 'friendly' ? ' ' + suffix : '\n\n' + suffix) : '');
    
    if (fullContent.length <= TWITTER_LIMIT) {
        // Single tweet is fine
        return fullContent;
    }
    
    // Create thread
    return createTwitterThread(text, suffix, tone, prefix);
}

function createTwitterThread(text, suffix, tone, prefix = '') {
    const TWITTER_LIMIT = 280;
    const THREAD_NUMBERING = 6; // Space for " (1/X)"
    
    // Split text into sentences for better thread breaks
    const sentences = text.match(/[^\.!?]+[\.!?]+/g) || [text];
    const threads = [];
    let currentThread = prefix;
    let threadNumber = 1;
    
    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i].trim();
        const potentialThread = currentThread + (currentThread === prefix ? '' : ' ') + sentence;
        
        // Check if adding this sentence would exceed limit (accounting for thread numbering)
        if (potentialThread.length + THREAD_NUMBERING > TWITTER_LIMIT && currentThread !== prefix) {
            // Start new thread
            threads.push(currentThread);
            currentThread = sentence;
            threadNumber++;
        } else {
            currentThread = potentialThread;
        }
    }
    
    // Add the last thread
    if (currentThread.trim()) {
        threads.push(currentThread);
    }
    
    // Add suffix to last thread if there's space
    if (suffix && threads.length > 0) {
        const lastThread = threads[threads.length - 1];
        const suffixToAdd = (tone === 'casual' || tone === 'friendly') ? ' ' + suffix : '\n\n' + suffix;
        
        if (lastThread.length + suffixToAdd.length + THREAD_NUMBERING <= TWITTER_LIMIT) {
            threads[threads.length - 1] = lastThread + suffixToAdd;
        } else {
            // Create separate thread for suffix
            threads.push(suffix);
        }
    }
    
    // Add thread numbering
    const totalThreads = threads.length;
    const numberedThreads = threads.map((thread, index) => {
        const threadNum = `(${index + 1}/${totalThreads})`;
        
        // Ensure the thread with numbering doesn't exceed limit
        if (thread.length + threadNum.length + 1 > TWITTER_LIMIT) {
            // Trim thread to fit numbering
            const availableSpace = TWITTER_LIMIT - threadNum.length - 4; // -4 for space and ellipsis
            const trimmed = thread.substring(0, availableSpace);
            const lastSpace = trimmed.lastIndexOf(' ');
            return (lastSpace > availableSpace * 0.7 ? trimmed.substring(0, lastSpace) : trimmed) + '... ' + threadNum;
        }
        
        return thread + ' ' + threadNum;
    });
    
    return numberedThreads;
}

// Client-side fallback branching when server is unavailable
function createFallbackBranching(content, platforms, tone) {
    const results = {};
    
    const templates = {
        instagram: {
            professional: (text) => `${text}\n\n📈 What are your thoughts on this? Share in the comments!\n\n#business #professional #growth #motivation #success`,
            casual: (text) => `${text} 😊\n\nWhat do you think? Let me know! 👇\n\n#daily #life #thoughts #community #share`,
            friendly: (text) => `Hey everyone! 👋\n\n${text}\n\nLove to hear your thoughts! 💭\n\n#friends #community #discussion #thoughts #share`,
            urgent: (text) => `🚨 IMPORTANT: ${text}\n\nPlease share this with others! 🔄\n\n#urgent #important #share #community #action`,
            inspirational: (text) => `✨ ${text} ✨\n\nBelieve in yourself and keep pushing forward! 💪\n\n#motivation #inspiration #success #growth #mindset`
        },
        linkedin: {
            professional: (text) => `${text}\n\nI'd love to hear your perspectives on this topic. What has been your experience?\n\n#business #professional #leadership #strategy #growth`,
            casual: (text) => `${text}\n\nWhat are your thoughts on this? I'm curious to hear different viewpoints from my network.\n\n#discussion #networking #thoughts #community`,
            friendly: (text) => `${text}\n\nI'd appreciate hearing from my network - what's been your experience with this?\n\n#networking #community #discussion #insights`,
            urgent: (text) => `Important update: ${text}\n\nThis is time-sensitive information that could impact our industry. Please share your thoughts.\n\n#urgent #industry #update #business`,
            inspirational: (text) => `${text}\n\nSuccess isn't just about the destination—it's about the journey and the lessons we learn along the way.\n\n#motivation #inspiration #leadership #success #growth`
        },
        twitter: {
            professional: (text) => formatTwitterPost(text, '#business #professional #growth', 'professional'),
            casual: (text) => formatTwitterPost(text, '😊', 'casual'),
            friendly: (text) => formatTwitterPost(text, '👋 What do you think?', 'friendly'),
            urgent: (text) => formatTwitterPost(text, 'Please RT! 🚨', 'urgent'),
            inspirational: (text) => formatTwitterPost(text, '#motivation #inspiration ✨', 'inspirational')
        },
        facebook: {
            professional: (text) => `${text}\n\nI'd love to start a discussion about this topic. What are your thoughts and experiences? Please share in the comments below.`,
            casual: (text) => `${text}\n\nWhat do you all think about this? I'm really curious to hear different perspectives! Drop your thoughts in the comments 😊`,
            friendly: (text) => `Hey friends! 👋\n\n${text}\n\nI'd love to hear what you think about this! Comment below and let's have a great discussion! 💬`,
            urgent: (text) => `IMPORTANT UPDATE: ${text}\n\nThis is time-sensitive information. Please share this post to help spread awareness! Thank you! 🙏`,
            inspirational: (text) => `${text}\n\nRemember, every challenge is an opportunity to grow stronger. Keep pushing forward and believe in yourself! What motivates you to keep going? Share below! 💪✨`
        },
        tiktok: {
            professional: (text) => `${text}\n\n💼 What's your take on this? Drop your thoughts below! \n\n#business #professional #entrepreneur #success #mindset`,
            casual: (text) => `${text} 😎\n\nWho else can relate? 😂\n\n#relatable #daily #life #vibes #fyp`,
            friendly: (text) => `Hey TikTok! 👋\n\n${text}\n\nLet me know what you think! 💭\n\n#community #friends #thoughts #discussion`,
            urgent: (text) => `🚨 IMPORTANT: ${text}\n\nPlease share this! 🙏\n\n#urgent #important #psa #awareness`,
            inspirational: (text) => `✨ ${text} ✨\n\nYou've got this! 💪 Keep pushing! \n\n#motivation #inspiration #mindset #success #growth`
        },
        youtube: {
            professional: (text) => `${text}\n\nWhat do you think about this topic? I'd love to hear your perspective in the comments below. Don't forget to like and subscribe if you found this valuable!\n\n🔔 Subscribe for more insights: [Your Channel]\n💬 Join the discussion in the comments\n👍 Like if you agree\n\n#business #professional #youtube`,
            casual: (text) => `${text}\n\nWhat's your take on this? Let me know in the comments! And hey, if you enjoyed this, smash that like button and subscribe for more content like this! 😊\n\n→ Subscribe: [Your Channel]\n→ Comment your thoughts below\n→ Like if you can relate\n\n#youtube #content #discussion`,
            friendly: (text) => `Hey everyone! 👋\n\n${text}\n\nI'd love to hear what you all think about this! Drop your thoughts in the comments, and if you're new here, consider subscribing - it really helps the channel grow! 🙏\n\n▶️ Subscribe: [Your Channel]\n💬 Comment below\n❤️ Like this video\n\n#community #youtube #discussion`,
            urgent: (text) => `🚨 IMPORTANT UPDATE: ${text}\n\nThis is crucial information that I needed to share with you all immediately. Please like and share this video to help spread awareness!\n\n⚠️ Please share this video\n🔔 Turn on notifications\n💬 Let me know your thoughts\n\n#urgent #important #update`,
            inspirational: (text) => `✨ ${text} ✨\n\nRemember, every expert was once a beginner. Keep pushing forward, stay consistent, and believe in yourself! You've got this! 💪\n\nIf this motivated you, please give it a thumbs up and subscribe for more inspiring content!\n\n🎆 Subscribe for motivation\n💪 Share your goals below\n❤️ Spread the positivity\n\n#motivation #inspiration #success #mindset`
        },
        pinterest: {
            professional: (text) => `💼 ${text}\n\nSave this pin for later reference! \n\n→ Follow for more business tips\n→ Save to your favorite board\n→ Share with fellow entrepreneurs\n\n#business #entrepreneur #professional #success #tips #productivity #businesstips`,
            casual: (text) => `${text} 😊\n\nDouble tap if you agree! Save this for later 📌\n\n🌸 Follow for daily inspiration\n📌 Save to your boards\n💕 Share the love\n\n#daily #life #inspiration #mood #vibes #relatable #lifestyle`,
            friendly: (text) => `${text}\n\nSave this pin and share it with friends who need to see this! 💕\n\n✨ Follow for more inspiration\n📌 Pin this to your boards\n👯 Tag a friend below\n\n#friends #community #inspiration #lifestyle #positivity #sharing`,
            urgent: (text) => `🚨 IMPORTANT: ${text}\n\nSave and share this important information!\n\n⚠️ Save this pin now\n🔄 Repin to spread awareness\n💬 Comment your thoughts\n\n#important #awareness #psa #save #share #community`,
            inspirational: (text) => `✨ ${text} ✨\n\nSave this for motivation when you need it most! 💪\n\n🎆 Follow for daily motivation\n📌 Save to your inspiration board\n❤️ Share the inspiration\n\n#motivation #inspiration #quotes #mindset #success #goals #positivity`
        },
        reddit: {
            professional: (text) => `${text}\n\nWhat are your thoughts on this? I'd love to hear different perspectives from the community. Has anyone else experienced something similar?\n\nEdit: Thanks for all the thoughtful responses!`,
            casual: (text) => `${text}\n\nAnyone else relate to this? Just me? 😅\n\nEdit: Wow, didn't expect this to blow up! Thanks for the awards kind strangers!`,
            friendly: (text) => `${text}\n\nHey Reddit! Just wanted to share this with you all. What do you think? Always love hearing from this community!\n\nThanks in advance for any insights! 😊`,
            urgent: (text) => `URGENT: ${text}\n\nThis is time-sensitive and I thought this community should know. Please upvote for visibility if you think others should see this.\n\nTL;DR: [Brief summary of the urgent matter]`,
            inspirational: (text) => `${text}\n\nJust wanted to share this with everyone here. Sometimes we all need a reminder that we're capable of more than we think.\n\nTo anyone going through tough times: you've got this! 💪\n\nEdit: Thank you all for the kind words and for sharing your own stories!`
        },
        discord: {
            professional: (text) => `**Professional Update** 💼\n\n${text}\n\nThoughts on this, everyone? Always interested in hearing different perspectives from the community!\n\n*Feel free to discuss in thread* 🧵`,
            casual: (text) => `${text} 😄\n\nWhat do you all think? Anyone else dealing with something similar?\n\n*React with 👍 if you agree, 👎 if you disagree!*`,
            friendly: (text) => `Hey everyone! 👋\n\n${text}\n\nWould love to hear your thoughts on this! This community always has such great insights 😊\n\n*Jump into voice chat if you want to discuss live!*`,
            urgent: (text) => `@everyone **URGENT** 🚨\n\n${text}\n\nThis is time-sensitive - please read and share your thoughts ASAP!\n\n*Pinging mods to pin this if necessary*`,
            inspirational: (text) => `✨ **Daily Inspiration** ✨\n\n${text}\n\nHope everyone's having a great day! Remember, this community is here to support each other 💪\n\n*React with ❤️ to spread the love!*`
        }
    };
    
    platforms.forEach(platform => {
        if (templates[platform] && templates[platform][tone]) {
            results[platform] = {
                adaptedContent: templates[platform][tone](content),
                platform: platform,
                status: 'success'
            };
        } else {
            // Generic fallback
            results[platform] = {
                adaptedContent: `${content}\n\n#${platform} #content #social`,
                platform: platform,
                status: 'success'
            };
        }
    });
    
    return results;
}

// Platform format suggestions
function getPlatformFormatSuggestions(platform) {
    const suggestions = {
        instagram: {
            formats: [
                { name: 'Single Post', desc: 'Perfect for quotes, tips, or announcements' },
                { name: 'Carousel', desc: 'Break content into 2-10 slides for tutorials' },
                { name: 'Stories', desc: 'Behind-the-scenes or quick updates' }
            ],
            images: [
                'High-quality, bright, eye-catching visuals',
                'Include text overlay for educational content',
                'Use consistent brand colors and fonts',
                'Create cohesive visual flow for carousels'
            ]
        },
        linkedin: {
            formats: [
                { name: 'Text Post', desc: 'Best for insights and professional updates' },
                { name: 'Document Post', desc: 'Upload PDFs, slides, or infographics' },
                { name: 'Poll', desc: 'Engage with industry-relevant questions' },
                { name: 'Newsletter', desc: 'Ongoing thought leadership content' }
            ],
            images: [
                'Professional, clean visuals',
                'Industry-relevant images or data visualizations',
                'Personal branding photos for authenticity',
                'Infographics for complex information'
            ]
        },
        twitter: {
            formats: [
                { name: 'Single Tweet', desc: 'Quick thoughts, news, or announcements' },
                { name: 'Thread', desc: 'Break longer content into connected tweets' },
                { name: 'Quote Tweet', desc: 'Comment on relevant industry content' },
                { name: 'Reply Thread', desc: 'Engage with community discussions' }
            ],
            images: [
                'Clear, readable graphics at small sizes',
                'Quote cards with striking typography',
                'Screenshots of relevant content',
                'GIFs for personality and engagement'
            ]
        },
        facebook: {
            formats: [
                { name: 'Standard Post', desc: 'Updates, stories, community engagement' },
                { name: 'Live Video', desc: 'Real-time engagement for Q&As' },
                { name: 'Event', desc: 'Webinars, workshops, gatherings' },
                { name: 'Photo Album', desc: 'Showcase multiple related images' }
            ],
            images: [
                'Warm, approachable visuals that encourage sharing',
                'Behind-the-scenes content for authenticity',
                'User-generated content when possible',
                'Event photos and community highlights'
            ]
        },
        tiktok: {
            formats: [
                { name: 'Short Video', desc: '15-60 second videos with trending audio' },
                { name: 'Tutorial', desc: 'Quick how-to or educational content' },
                { name: 'Trend', desc: 'Participate in viral challenges or memes' },
                { name: 'Behind-the-Scenes', desc: 'Show your process or daily life' }
            ],
            images: [
                'Vertical video format (9:16 aspect ratio)',
                'Bold, eye-catching thumbnails and text overlays',
                'Fast-paced editing with trending music',
                'Authentic, unpolished content performs well'
            ]
        },
        youtube: {
            formats: [
                { name: 'Video Description', desc: 'Detailed descriptions with timestamps' },
                { name: 'Community Post', desc: 'Text updates, polls, and images' },
                { name: 'YouTube Shorts', desc: 'Vertical short-form content' },
                { name: 'Video Title', desc: 'SEO-optimized titles under 60 characters' }
            ],
            images: [
                'Custom thumbnails with bold text and faces',
                '16:9 aspect ratio for standard videos',
                'Consistent branding and color scheme',
                'High contrast and readable at small sizes'
            ]
        },
        pinterest: {
            formats: [
                { name: 'Standard Pin', desc: 'Vertical image with descriptive text' },
                { name: 'Idea Pin', desc: 'Multi-page story format pins' },
                { name: 'Video Pin', desc: 'Short videos that auto-play' },
                { name: 'Shopping Pin', desc: 'Product pins with pricing info' }
            ],
            images: [
                'Vertical format (2:3 aspect ratio works best)',
                'Text overlay with clear, readable fonts',
                'Bright, high-quality images that stand out',
                'Lifestyle and inspirational imagery'
            ]
        },
        reddit: {
            formats: [
                { name: 'Text Post', desc: 'Discussion-focused posts with context' },
                { name: 'Link Post', desc: 'Share articles or external content' },
                { name: 'Image Post', desc: 'Memes, infographics, or visual content' },
                { name: 'AMA', desc: 'Ask Me Anything format for expertise sharing' }
            ],
            images: [
                'Memes and infographics perform well',
                'Screenshots with context and commentary',
                'Original content and personal photos',
                'Clear, easy-to-read text in images'
            ]
        },
        discord: {
            formats: [
                { name: 'Text Message', desc: 'Standard chat messages with formatting' },
                { name: 'Announcement', desc: 'Important updates with @everyone ping' },
                { name: 'Thread', desc: 'Organized discussions in message threads' },
                { name: 'Embed', desc: 'Rich embeds with links and media' }
            ],
            images: [
                'GIFs and reaction images for engagement',
                'Screenshots for context and examples',
                'Custom emojis and server-specific content',
                'Memes and community inside jokes'
            ]
        }
    };
    return suggestions[platform] || { formats: [], images: [] };
}

// Fallback results display function
function displayBasicResults(results) {
    if (!amplifiedResults) return;
    
    amplifiedResults.innerHTML = Object.entries(results).map(([platform, result]) => {
        if (result.status !== 'success') {
            return `
                <div class="platform-result">
                    <h3>${platform.charAt(0).toUpperCase() + platform.slice(1)}</h3>
                    <p class="error">Failed to generate content: ${result.error}</p>
                </div>
            `;
        }
        
        const suggestions = getPlatformFormatSuggestions(platform);
        
        return `
            <div class="platform-result">
                <h3>${platform.charAt(0).toUpperCase() + platform.slice(1)}</h3>
                <div class="content-display">
                    <p class="generated-content">${Array.isArray(result.adaptedContent) ? result.adaptedContent.join('\n\n') : result.adaptedContent}</p>
                    
                    <div class="format-suggestions">
                        <div class="suggestions-row">
                            <div class="format-options">
                                <h5>📋 Format Options:</h5>
                                ${suggestions.formats.slice(0, 2).map(format => `
                                    <div class="format-option">
                                        <strong>${format.name}:</strong> ${format.desc}
                                    </div>
                                `).join('')}
                            </div>
                            <div class="image-suggestions">
                                <h5>🎨 Image Ideas:</h5>
                                ${suggestions.images.slice(0, 2).map(suggestion => `
                                    <div class="image-suggestion">• ${suggestion}</div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="content-actions">
                    <button onclick="copyToClipboard('${platform}')" class="copy-btn">Copy Content</button>
                </div>
            </div>
        `;
    }).join('');
}

// Platform Cards Display Functions
function displayPlatformCards(results) {
    const platformCardsSection = document.getElementById('platform-cards-section');
    const platformCards = document.getElementById('platform-cards');
    
    if (!platformCardsSection || !platformCards) {
        console.error('Platform cards elements not found:', {
            platformCardsSection: !!platformCardsSection,
            platformCards: !!platformCards
        });
        // Fallback to old results display
        if (resultsSection) {
            resultsSection.classList.remove('hidden');
            displayBasicResults(results);
        }
        return;
    }
    
    platformCardsSection.classList.remove('hidden');
    
    // Hide old results section
    const oldResults = document.getElementById('results-section');
    if (oldResults) oldResults.classList.add('hidden');
    
    const platformOrder = ['twitter', 'linkedin', 'instagram', 'facebook'];
    const cards = platformOrder
        .filter(platform => results[platform])
        .map(platform => {
            const result = results[platform];
            const preview = getContentPreview(result.adaptedContent);
            const isThread = Array.isArray(result.adaptedContent);
            const suggestions = getPlatformFormatSuggestions(platform);
            
            return `
                <div class="platform-card glassmorphic-card" data-platform="${platform}" onclick="openContentModal('${platform}')">
                    <div class="platform-card-header">
                        <span class="platform-icon">${getPlatformIcon(platform)}</span>
                        <div class="platform-info">
                            <h3>${platform.charAt(0).toUpperCase() + platform.slice(1)}</h3>
                            ${isThread ? `<span class="thread-indicator">Thread (${result.adaptedContent.length} tweets)</span>` : ''}
                        </div>
                    </div>
                    <div class="platform-card-content">
                        <p class="content-preview">${preview}...</p>
                        
                        <div class="format-suggestions">
                            <div class="suggestions-row">
                                <div class="format-options">
                                    <h5>📋 Format Options:</h5>
                                    ${suggestions.formats.slice(0, 2).map(format => `
                                        <div class="format-option">
                                            <strong>${format.name}:</strong> ${format.desc}
                                        </div>
                                    `).join('')}
                                </div>
                                <div class="image-suggestions">
                                    <h5>🎨 Image Ideas:</h5>
                                    ${suggestions.images.slice(0, 2).map(suggestion => `
                                        <div class="image-suggestion">• ${suggestion}</div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="platform-card-footer">
                        <span class="char-count">${getCharacterCount(result.adaptedContent)} chars</span>
                        <button class="quick-copy-btn" onclick="event.stopPropagation(); quickCopyContent('${platform}')" title="Quick Copy">📋</button>
                    </div>
                    <div class="card-glow"></div>
                </div>
            `;
        });
    
    platformCards.innerHTML = cards.join('');
    
    // Animate cards in
    setTimeout(() => {
        const cardElements = platformCards.querySelectorAll('.platform-card');
        cardElements.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('animate-in');
            }, index * 150);
        });
    }, 100);
}

function getContentPreview(content) {
    if (Array.isArray(content)) {
        return content[0].substring(0, 60);
    }
    return content.substring(0, 60);
}

function getCharacterCount(content) {
    if (Array.isArray(content)) {
        return content.reduce((sum, tweet) => sum + tweet.length, 0);
    }
    return content.length;
}

// Modal Functions
let currentModalPlatform = null;
let currentModalContent = null;

function openContentModal(platform) {
    const modal = document.getElementById('content-modal');
    const title = document.getElementById('modal-platform-title');
    const contentDisplay = document.getElementById('modal-content-display');
    
    currentModalPlatform = platform;
    currentModalContent = currentResults[platform];
    
    title.textContent = platform.charAt(0).toUpperCase() + platform.slice(1);
    
    if (Array.isArray(currentModalContent.adaptedContent)) {
        // Twitter thread
        contentDisplay.innerHTML = `
            <div class="modal-twitter-thread">
                <div class="thread-info">Twitter Thread (${currentModalContent.adaptedContent.length} tweets)</div>
                ${currentModalContent.adaptedContent.map((tweet, index) => `
                    <div class="modal-thread-tweet">
                        <div class="tweet-number">Tweet ${index + 1}:</div>
                        <div class="tweet-content">${tweet}</div>
                        <div class="tweet-char-count">${tweet.length}/280 characters</div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        // Single content
        contentDisplay.innerHTML = `
            <div class="modal-content-text">${currentModalContent.adaptedContent}</div>
            <div class="modal-char-count">${currentModalContent.adaptedContent.length} characters</div>
        `;
    }
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeContentModal() {
    const modal = document.getElementById('content-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    currentModalPlatform = null;
    currentModalContent = null;
}

function quickCopyContent(platform) {
    const content = currentResults[platform]?.adaptedContent;
    if (content) {
        let textToCopy;
        if (Array.isArray(content)) {
            textToCopy = content.map((tweet, index) => `Tweet ${index + 1}:\n${tweet}`).join('\n\n---\n\n');
        } else {
            textToCopy = content;
        }
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            showToast(`${platform.charAt(0).toUpperCase() + platform.slice(1)} content copied!`);
        });
    }
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast glassmorphic-mini';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 2000);
}

// Update the main display function
function displayBranchedResults(results) {
    // Use new platform cards instead of old results
    displayPlatformCards(results);
    currentResults = results;
}

// Branching animation functions
function showBranchingAnimation(platforms) {
    // Hide results section and show loading animation
    resultsSection.classList.add('hidden');
    
    // Create animation container
    const animationContainer = document.createElement('div');
    animationContainer.id = 'amplification-animation';
    animationContainer.innerHTML = `
        <div class="amplification-loader">
            <div class="ai-brain">
                <div class="brain-pulse"></div>
                <div class="brain-icon">🧠</div>
            </div>
            <div class="amplification-text">
                <h3>✨ Branching Your Content</h3>
                <p id="amplification-status">Analyzing your content...</p>
                <div class="platform-progress">
                    ${platforms.map(platform => `
                        <div class="platform-item" data-platform="${platform}">
                            <div class="platform-icon">${getPlatformIcon(platform)}</div>
                            <div class="platform-name">${platform.charAt(0).toUpperCase() + platform.slice(1)}</div>
                            <div class="platform-spinner"></div>
                        </div>
                    `).join('')}
                </div>
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
            </div>
        </div>
    `;
    
    // Insert after the form
    const contentCreator = document.querySelector('.content-creator');
    contentCreator.appendChild(animationContainer);
    
    // Start the animation sequence
    startBranchingSequence(platforms);
}

function hideBranchingAnimation() {
    const animationContainer = document.getElementById('amplification-animation');
    if (animationContainer) {
        animationContainer.remove();
    }
}

function getPlatformIcon(platform) {
    const icons = {
        instagram: '📸',
        linkedin: '💼',
        twitter: '🐦',
        facebook: '👥',
        tiktok: '🎵',
        youtube: '🎬',
        pinterest: '📌',
        reddit: '🔴',
        discord: '💬'
    };
    return icons[platform] || '📱';
}

async function startBranchingSequence(platforms) {
    const statusElement = document.getElementById('amplification-status');
    const progressFill = document.querySelector('.progress-fill');
    
    const steps = [
        'Analyzing your content...',
        'Understanding tone and context...',
        'Optimizing for each platform...',
        'Adding engaging elements...',
        'Finalizing amplified versions...'
    ];
    
    for (let i = 0; i < steps.length; i++) {
        if (statusElement) {
            statusElement.textContent = steps[i];
        }
        
        if (progressFill) {
            progressFill.style.width = `${((i + 1) / steps.length) * 100}%`;
        }
        
        // Animate platform items progressively
        if (i >= 2) { // Start platform animation after step 2
            const platformIndex = i - 2;
            if (platformIndex < platforms.length) {
                const platformItem = document.querySelector(`[data-platform="${platforms[platformIndex]}"]`);
                if (platformItem) {
                    platformItem.classList.add('processing');
                    setTimeout(() => {
                        platformItem.classList.remove('processing');
                        platformItem.classList.add('completed');
                    }, 400);
                }
            }
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

// Utility functions
window.copyContent = function(platform) {
    const content = currentResults[platform]?.adaptedContent;
    if (content) {
        let textToCopy;
        if (Array.isArray(content)) {
            // Twitter thread - join with thread separators
            textToCopy = content.map((tweet, index) => `Tweet ${index + 1}:\n${tweet}`).join('\n\n---\n\n');
        } else {
            textToCopy = content;
        }
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            if (Array.isArray(content)) {
                alert(`Twitter thread (${content.length} tweets) copied to clipboard!`);
            } else {
                alert('Content copied to clipboard!');
            }
        });
    }
};

window.downloadContent = function(platform) {
    const content = currentResults[platform]?.adaptedContent;
    if (content) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${platform}-content.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }
};

// Archive utility functions
window.toggleContentItem = function(contentId) {
    if (expandedItems.has(contentId)) {
        expandedItems.delete(contentId);
    } else {
        expandedItems.add(contentId);
    }
    
    // Refresh the display with current filters
    filterAndDisplayContent();
};

window.copyPlatformContent = function(event, postId, platform) {
    event.stopPropagation();
    const post = allContent.flatMap(c => c.platform_posts || []).find(p => p.id === postId);
    if (post?.adapted_content) {
        navigator.clipboard.writeText(post.adapted_content).then(() => {
            showToast(`${platform} content copied!`);
        });
    }
};

window.downloadPlatformContent = function(event, postId, platform) {
    event.stopPropagation();
    const post = allContent.flatMap(c => c.platform_posts || []).find(p => p.id === postId);
    if (post?.adapted_content) {
        const blob = new Blob([post.adapted_content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${platform}-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }
};

// Scroll to creator function
window.scrollToCreator = function() {
    const creatorSection = document.getElementById('creator');
    if (creatorSection) {
        creatorSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
};

// Branch content function (called from HTML)
window.branchContent = function() {
    const title = document.getElementById('content-title').value;
    const content = document.getElementById('content-text').value;
    const tone = document.getElementById('tone').value;
    
    const platforms = Array.from(document.querySelectorAll('.platform-checkbox input:checked'))
        .map(input => input.value);
    
    if (!content.trim()) {
        alert('Please enter some content to branch');
        return;
    }
    
    if (platforms.length === 0) {
        alert('Please select at least one platform');
        return;
    }
    
    createContent(title, content, platforms, tone);
};

// Event listeners
signinForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target[0].value;
    const password = e.target[1].value;
    await signIn(email, password);
});

signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = e.target[0].value;
    const email = e.target[1].value;
    const password = e.target[2].value;
    await signUp(email, password, fullName);
});

contentForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    branchContent();
});

document.getElementById('signout-btn')?.addEventListener('click', signOut);

// Archive event listeners
if (archiveSearch) {
    archiveSearch.addEventListener('input', filterAndDisplayContent);
}

if (archiveFilter) {
    archiveFilter.addEventListener('change', filterAndDisplayContent);
}

// Modal event listeners (if elements exist)
document.getElementById('modal-close')?.addEventListener('click', closeContentModal);
document.getElementById('modal-copy-btn')?.addEventListener('click', () => {
    if (currentModalContent) {
        let textToCopy;
        if (Array.isArray(currentModalContent.adaptedContent)) {
            textToCopy = currentModalContent.adaptedContent.map((tweet, index) => `Tweet ${index + 1}:\n${tweet}`).join('\n\n---\n\n');
        } else {
            textToCopy = currentModalContent.adaptedContent;
        }
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            showToast(`${currentModalPlatform.charAt(0).toUpperCase() + currentModalPlatform.slice(1)} content copied!`);
            closeContentModal();
        });
    }
});

document.getElementById('modal-download-btn')?.addEventListener('click', () => {
    if (currentModalContent) {
        let content;
        if (Array.isArray(currentModalContent.adaptedContent)) {
            content = currentModalContent.adaptedContent.map((tweet, index) => `Tweet ${index + 1}:\n${tweet}`).join('\n\n---\n\n');
        } else {
            content = currentModalContent.adaptedContent;
        }
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentModalPlatform}-content-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        
        showToast('Content downloaded!');
        closeContentModal();
    }
});

// Close modal when clicking backdrop
document.querySelector('.modal-backdrop')?.addEventListener('click', closeContentModal);

// Google Auth - Client-side flow
async function signInWithGoogle() {
    try {
        console.log('Google sign-in button clicked');
        console.log('Current supabase client:', supabase);
        
        // Make sure supabase is initialized
        if (!supabase) {
            console.error('Supabase not initialized, attempting to reinitialize...');
            const initResult = initializeSupabase();
            console.log('Reinitialize result:', initResult);
            if (!initResult) {
                console.log('Client-side auth failed, trying server-side auth...');
                // Fallback to server-side auth
                try {
                    const response = await fetch(`${API_URL}/auth/google`);
                    const data = await response.json();
                    if (data.url) {
                        window.location.href = data.url;
                        return;
                    } else {
                        throw new Error(data.error || 'Server auth failed');
                    }
                } catch (serverError) {
                    console.error('Server-side auth also failed:', serverError);
                    showMessage('Authentication service unavailable. Please try again later.', 'error');
                }
                return;
            }
        }
        
        console.log('Supabase client available, attempting OAuth...');
        console.log('supabase.auth methods:', Object.keys(supabase.auth));
        
        // Direct client-side OAuth with Supabase
        const oauthOptions = {
            provider: 'google',
            options: {
                redirectTo: window.location.hostname === 'localhost' ? window.location.origin : 'https://branch-out.io',
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent'
                }
            }
        };
        
        console.log('OAuth options:', oauthOptions);
        
        const { data, error } = await supabase.auth.signInWithOAuth(oauthOptions);
        
        console.log('OAuth response data:', data);
        console.log('OAuth response error:', error);
        
        if (error) {
            console.error('Google auth error:', error);
            if (error.message.includes('provider is not enabled')) {
                showMessage('Google authentication is not configured. Please contact support.', 'error');
            } else if (error.message.includes('Invalid login credentials')) {
                showMessage('Google authentication failed. Please try again.', 'error');
            } else {
                showMessage('Failed to initiate Google sign in: ' + error.message, 'error');
            }
        } else {
            console.log('OAuth initiated successfully, should redirect soon...');
        }
        
        // No need to redirect manually - Supabase handles it
    } catch (error) {
        console.error('Google auth error:', error);
        console.error('Error details:', error.message, error.stack);
        showMessage('Failed to initiate Google sign in: ' + error.message, 'error');
    }
}

document.getElementById('google-auth-btn')?.addEventListener('click', signInWithGoogle);

// Handle OAuth callback
async function handleOAuthCallback() {
    console.log('handleOAuthCallback called');
    console.log('Current URL:', window.location.href);
    console.log('URL search params:', window.location.search);
    
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const access_token = urlParams.get('access_token');
    const refresh_token = urlParams.get('refresh_token');
    
    console.log('URL params:', { code, error, access_token, refresh_token });
    
    if (error) {
        console.error('OAuth error in URL:', error);
        showMessage('Authentication failed: ' + error, 'error');
        window.history.replaceState({}, document.title, '/');
        return;
    }
    
    // Check if we have tokens directly in URL (implicit flow)
    if (access_token) {
        console.log('Found access token in URL, using implicit flow');
        try {
            authToken = access_token;
            localStorage.setItem('authToken', authToken);
            
            // Get user info with the token
            const { data: { user }, error: userError } = await supabase.auth.getUser(access_token);
            if (userError) {
                console.error('Error getting user:', userError);
                throw userError;
            }
            
            currentUser = user;
            console.log('User authenticated via implicit flow:', currentUser);
            
            // Clean URL
            window.history.replaceState({}, document.title, '/');
            
            showDashboard();
            return;
        } catch (error) {
            console.error('Implicit flow error:', error);
            showMessage('Failed to complete authentication', 'error');
            window.history.replaceState({}, document.title, '/');
            return;
        }
    }
    
    // Handle authorization code flow
    if (code) {
        console.log('Found authorization code, exchanging for session');
        try {
            // Make sure supabase is initialized
            if (!supabase) {
                console.error('Supabase not initialized');
                showMessage('Authentication service not ready', 'error');
                return;
            }
            
            console.log('Exchanging code for session...');
            // Exchange code for session
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            
            console.log('Exchange result:', { data, error });
            
            if (error) {
                console.error('Exchange code error:', error);
                throw error;
            }
            
            if (data && data.session) {
                console.log('Session obtained:', data.session);
                authToken = data.session.access_token;
                currentUser = data.user;
                localStorage.setItem('authToken', authToken);
                localStorage.setItem('supabaseSession', JSON.stringify(data.session));
                
                console.log('User authenticated via code flow:', currentUser);
                
                // Clean URL
                window.history.replaceState({}, document.title, '/');
                
                showDashboard();
            } else {
                console.error('No session in exchange response');
                throw new Error('No session returned');
            }
        } catch (error) {
            console.error('OAuth callback error:', error);
            showMessage('Failed to complete authentication: ' + error.message, 'error');
            window.history.replaceState({}, document.title, '/');
        }
    } else {
        console.log('No code or tokens found in URL');
    }
}

// Initialize Supabase client directly
let supabase = null;
let tokenRefreshTimer = null;

// Token refresh management
function setupTokenRefreshTimer(expiresAt) {
    clearTokenRefreshTimer();
    
    // Refresh token 5 minutes before expiry
    const refreshTime = (expiresAt * 1000) - Date.now() - (5 * 60 * 1000);
    
    if (refreshTime > 0) {
        console.log('Setting up token refresh in', Math.round(refreshTime / 1000 / 60), 'minutes');
        tokenRefreshTimer = setTimeout(async () => {
            if (supabase) {
                console.log('Auto-refreshing token...');
                try {
                    await supabase.auth.refreshSession();
                } catch (error) {
                    console.error('Auto token refresh failed:', error);
                }
            }
        }, refreshTime);
    }
}

function clearTokenRefreshTimer() {
    if (tokenRefreshTimer) {
        clearTimeout(tokenRefreshTimer);
        tokenRefreshTimer = null;
    }
}

function initializeSupabase() {
    try {
        console.log('Attempting to initialize Supabase...');
        console.log('window.supabase available:', typeof window.supabase);
        console.log('window.supabase object:', window.supabase);
        
        // Check if Supabase library is loaded
        if (typeof window.supabase === 'undefined') {
            console.error('Supabase library not loaded - window.supabase is undefined');
            return false;
        }
        
        if (typeof window.supabase.createClient !== 'function') {
            console.error('Supabase createClient method not available');
            console.log('Available methods:', Object.keys(window.supabase));
            return false;
        }
        
        // Initialize with production credentials directly
        const supabaseUrl = 'https://dgihdtivvoqczspgxlil.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnaWhkdGl2dm9xY3pzcGd4bGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxOTM2MzAsImV4cCI6MjA2ODc2OTYzMH0.YBxjpZQGiUds-1V8jRQXzWD63OyJyY_kJfIX3NOeuYI';
        
        console.log('Creating client with URL:', supabaseUrl);
        console.log('Using key (first 20 chars):', supabaseKey.substring(0, 20) + '...');
        
        supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
        
        console.log('Supabase client created:', supabase);
        console.log('Supabase client type:', typeof supabase);
        console.log('Supabase auth available:', typeof supabase.auth);
        
        if (!supabase.auth) {
            console.error('Supabase auth object not available');
            return false;
        }
        
        console.log('Supabase client initialized successfully');
        
        // Set up auth state change listener
        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event, session);
            
            if (event === 'SIGNED_IN' && session) {
                console.log('User signed in via state change:', session.user);
                console.log('Session expires at:', new Date(session.expires_at * 1000));
                authToken = session.access_token;
                currentUser = session.user;
                localStorage.setItem('authToken', authToken);
                localStorage.setItem('supabaseSession', JSON.stringify(session));
                showDashboard();
                
                // Set up token refresh timer
                setupTokenRefreshTimer(session.expires_at);
            } else if (event === 'SIGNED_OUT') {
                console.log('User signed out via state change');
                authToken = null;
                currentUser = null;
                localStorage.removeItem('authToken');
                localStorage.removeItem('supabaseSession');
                clearTokenRefreshTimer();
                showAuth();
            } else if (event === 'TOKEN_REFRESHED' && session) {
                console.log('Token refreshed:', session);
                authToken = session.access_token;
                currentUser = session.user;
                localStorage.setItem('authToken', authToken);
                localStorage.setItem('supabaseSession', JSON.stringify(session));
                
                // Update refresh timer
                setupTokenRefreshTimer(session.expires_at);
            }
        });
        
        return true;
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        console.error('Error stack:', error.stack);
        return false;
    }
}

async function initializeApp() {
    try {
        console.log('Initializing app...');
        
        // Initialize Supabase first
        if (!initializeSupabase()) {
            console.error('Failed to initialize Supabase client');
            return;
        }
        
        // Check for existing Supabase session first
        console.log('Checking for existing Supabase session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.error('Error getting session:', sessionError);
        } else if (session) {
            console.log('Found existing Supabase session:', session);
            authToken = session.access_token;
            currentUser = session.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('supabaseSession', JSON.stringify(session));
            showDashboard();
            return;
        } else {
            console.log('No existing Supabase session found');
        }
        
        // Handle OAuth callback
        await handleOAuthCallback();
        
        // Skip server auth check to prevent logout issues
        console.log('Skipping server auth check to prevent automatic logout');
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, attempting to initialize app...');
    // Wait for Supabase library to load
    waitForSupabaseAndInit();
});

// Fallback initialization
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('Page already loaded, attempting to initialize app...');
    waitForSupabaseAndInit();
}

function waitForSupabaseAndInit() {
    const maxWait = 10000; // 10 seconds max
    const startTime = Date.now();
    let checkCount = 0;
    
    function checkSupabase() {
        checkCount++;
        console.log(`Checking for Supabase library... (attempt ${checkCount})`);
        console.log('window.supabase:', typeof window.supabase);
        console.log('document.readyState:', document.readyState);
        
        // Check if Supabase is available and ready
        if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            console.log('Supabase library found, initializing app...');
            initializeApp();
            return;
        }
        
        // Check if we've timed out
        if (Date.now() - startTime > maxWait) {
            console.error('Timeout waiting for Supabase library to load');
            console.log('Final check - window.supabase:', window.supabase);
            console.log('Available globals:', Object.keys(window).filter(k => k.toLowerCase().includes('supabase')));
            
            // Try to provide helpful error message
            showMessage('Authentication library failed to load. Please check your internet connection and refresh the page.', 'error');
            return;
        }
        
        // Continue waiting
        console.log('Supabase not ready, retrying in 200ms...');
        setTimeout(checkSupabase, 200);
    }
    
    // Start checking immediately
    checkSupabase();
}
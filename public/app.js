// API configuration
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001/api' 
    : `${window.location.protocol}//${window.location.host}/api`;
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
        
        if (!data.session || !data.session.access_token) {
            throw new Error('Invalid response from server');
        }
        
        authToken = data.session.access_token;
        currentUser = data.user;
        localStorage.setItem('authToken', authToken);
        
        showDashboard();
    } catch (error) {
        console.error('Sign in error:', error);
        showMessage(error.message, 'error');
    }
}

async function signUp(email, password, fullName) {
    try {
        console.log('Attempting signup with:', { email, fullName });
        
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, fullName })
        });
        
        const data = await response.json();
        console.log('Signup response:', data);
        
        if (!response.ok) {
            console.error('Signup error:', data);
            throw new Error(data.error || 'Sign up failed');
        }
        
        showMessage('Account created! Please check your email to verify your account.', 'success');
        
        // Switch to sign in tab
        document.querySelector('[data-tab="signin"]').click();
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
                'Authorization': `Bearer ${authToken}`
            }
        });
    } catch (error) {
        console.error('Sign out error:', error);
    }
    
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    showAuth();
}

async function checkAuth() {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            authToken = token;
            currentUser = data.user;
            showDashboard();
        } else {
            localStorage.removeItem('authToken');
        }
    } catch (error) {
        localStorage.removeItem('authToken');
    }
}

// UI functions
function showMessage(message, type) {
    authMessage.textContent = message;
    authMessage.className = `message ${type}`;
    setTimeout(() => {
        authMessage.textContent = '';
        authMessage.className = 'message';
    }, 5000);
}

function showAuth() {
    authSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
}

function showDashboard() {
    authSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    userEmail.textContent = currentUser.email;
    loadContent();
}

// Archive state
let allContent = [];
let expandedItems = new Set();

// Archive DOM elements
const archiveSearch = document.getElementById('archive-search');
const archiveFilter = document.getElementById('archive-filter');

// Content functions
async function loadContent() {
    try {
        const response = await fetch(`${API_URL}/content`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        allContent = data.content;
        filterAndDisplayContent();
    } catch (error) {
        contentList.innerHTML = '<p class="error">Failed to load content</p>';
    }
}

function filterAndDisplayContent() {
    const searchTerm = archiveSearch?.value?.toLowerCase() || '';
    const filterValue = archiveFilter?.value || 'all';
    
    let filtered = allContent;
    
    // Apply filter
    if (filterValue !== 'all') {
        filtered = filtered.filter(item => item.status === filterValue);
    }
    
    // Apply search
    if (searchTerm) {
        filtered = filtered.filter(item => 
            (item.title?.toLowerCase().includes(searchTerm) ||
             item.original_content.toLowerCase().includes(searchTerm))
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
        const hasAmplifiedContent = item.platform_posts && item.platform_posts.length > 0;
        
        return `
            <div class="content-item ${isExpanded ? 'expanded' : ''}" data-id="${item.id}" onclick="toggleContentItem('${item.id}')">
                <h3>${item.title || 'Untitled'}</h3>
                <div class="content-preview">${item.original_content}</div>
                <div class="content-meta">
                    <span>${new Date(item.created_at).toLocaleDateString()}</span>
                    <span>${item.status}</span>
                    ${hasAmplifiedContent ? '<span>📱 Amplified</span>' : ''}
                </div>
                ${isExpanded && hasAmplifiedContent ? renderAmplifiedVersions(item.platform_posts) : ''}
            </div>
        `;
    }).join('');
}

function renderAmplifiedVersions(platformPosts) {
    const groupedPosts = platformPosts.reduce((acc, post) => {
        if (!acc[post.platform]) acc[post.platform] = [];
        acc[post.platform].push(post);
        return acc;
    }, {});
    
    return `
        <div class="amplified-versions">
            <h4>Amplified Versions</h4>
            ${Object.entries(groupedPosts).map(([platform, posts]) => {
                const latestPost = posts[0]; // Assuming posts are ordered by date
                return `
                    <div class="platform-version">
                        <h5>${platform.charAt(0).toUpperCase() + platform.slice(1)}</h5>
                        <div class="platform-content">${latestPost.adapted_content}</div>
                        <div class="version-actions">
                            <button onclick="copyPlatformContent(event, '${latestPost.id}', '${platform}')">Copy</button>
                            <button onclick="downloadPlatformContent(event, '${latestPost.id}', '${platform}')">Download</button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

async function createContent(title, content, platforms, tone) {
    try {
        // First create the content
        const createResponse = await fetch(`${API_URL}/content`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ 
                title, 
                originalContent: content 
            })
        });
        
        const createData = await createResponse.json();
        
        if (!createResponse.ok) {
            throw new Error(createData.error || 'Failed to create content');
        }
        
        // Then amplify it
        const amplifyResponse = await fetch(`${API_URL}/amplify/${createData.content.id}/amplify`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ 
                platforms, 
                tone,
                style: 'engaging'
            })
        });
        
        const amplifyData = await amplifyResponse.json();
        
        if (!amplifyResponse.ok) {
            console.error('Amplify error:', amplifyData);
            throw new Error(amplifyData.details || amplifyData.error || 'Failed to amplify content');
        }
        
        displayAmplifiedResults(amplifyData.amplifiedContent);
        await loadContent(); // Reload content list to show new amplified content
        
        // Reset form
        contentForm.reset();
        
    } catch (error) {
        alert(error.message);
    }
}

function displayAmplifiedResults(results) {
    resultsSection.classList.remove('hidden');
    currentResults = results; // Store for utility functions
    
    amplifiedResults.innerHTML = Object.entries(results).map(([platform, result]) => {
        if (result.status !== 'success') {
            return `
                <div class="platform-result">
                    <h3>${platform.charAt(0).toUpperCase() + platform.slice(1)}</h3>
                    <p class="error">Failed to generate content: ${result.error}</p>
                </div>
            `;
        }
        
        return `
            <div class="platform-result">
                <h3>${platform.charAt(0).toUpperCase() + platform.slice(1)}</h3>
                <div class="adapted-content">${result.adaptedContent}</div>
                <div class="result-actions">
                    <button onclick="copyContent('${platform}')">Copy</button>
                    <button onclick="downloadContent('${platform}')">Download</button>
                </div>
            </div>
        `;
    }).join('');
}

// Store results globally for utility functions
let currentResults = {};

// Utility functions
window.copyContent = function(platform) {
    const content = currentResults[platform]?.adaptedContent;
    if (content) {
        navigator.clipboard.writeText(content).then(() => {
            alert('Content copied to clipboard!');
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
    displayContent(allContent.filter(item => {
        const searchTerm = archiveSearch?.value?.toLowerCase() || '';
        const filterValue = archiveFilter?.value || 'all';
        
        if (filterValue !== 'all' && item.status !== filterValue) return false;
        if (searchTerm && !item.title?.toLowerCase().includes(searchTerm) && 
            !item.original_content.toLowerCase().includes(searchTerm)) return false;
        
        return true;
    }));
};

window.copyPlatformContent = function(event, postId, platform) {
    event.stopPropagation();
    const post = allContent.flatMap(c => c.platform_posts || []).find(p => p.id === postId);
    if (post?.adapted_content) {
        navigator.clipboard.writeText(post.adapted_content).then(() => {
            alert(`${platform} content copied to clipboard!`);
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

// Event listeners
signinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target[0].value;
    const password = e.target[1].value;
    await signIn(email, password);
});

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = e.target[0].value;
    const email = e.target[1].value;
    const password = e.target[2].value;
    await signUp(email, password, fullName);
});

contentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('content-title').value;
    const content = document.getElementById('content-text').value;
    const tone = document.getElementById('tone').value;
    
    const platforms = Array.from(document.querySelectorAll('.platforms input:checked'))
        .map(input => input.value);
    
    if (platforms.length === 0) {
        alert('Please select at least one platform');
        return;
    }
    
    const submitBtn = document.getElementById('amplify-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Amplifying...';
    
    try {
        await createContent(title, content, platforms, tone);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Amplify Content';
    }
});

document.getElementById('signout-btn').addEventListener('click', signOut);

// Archive event listeners
if (archiveSearch) {
    archiveSearch.addEventListener('input', filterAndDisplayContent);
}

if (archiveFilter) {
    archiveFilter.addEventListener('change', filterAndDisplayContent);
}

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
                showMessage('Application not properly configured - Supabase client failed to initialize', 'error');
                return;
            }
        }
        
        console.log('Supabase client available, attempting OAuth...');
        console.log('supabase.auth methods:', Object.keys(supabase.auth));
        
        // Direct client-side OAuth with Supabase
        const oauthOptions = {
            provider: 'google',
            options: {
                redirectTo: window.location.origin
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

document.getElementById('google-auth-btn').addEventListener('click', signInWithGoogle);

// Handle OAuth callback
async function handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    
    if (error) {
        showMessage('Authentication failed', 'error');
        window.history.replaceState({}, document.title, '/');
        return;
    }
    
    if (code) {
        try {
            // Make sure supabase is initialized
            if (!supabase) {
                console.error('Supabase not initialized');
                return;
            }
            
            // Exchange code for session
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            
            if (error) {
                console.error('Exchange code error:', error);
                throw error;
            }
            
            if (data && data.session) {
                authToken = data.session.access_token;
                currentUser = data.user;
                localStorage.setItem('authToken', authToken);
                
                // Clean URL
                window.history.replaceState({}, document.title, '/');
                
                showDashboard();
            }
        } catch (error) {
            console.error('OAuth callback error:', error);
            showMessage('Failed to complete authentication', 'error');
            window.history.replaceState({}, document.title, '/');
        }
    }
}

// Initialize Supabase client directly
let supabase = null;

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
        return true;
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        console.error('Error stack:', error.stack);
        return false;
    }
}

async function initializeApp() {
    try {
        // Initialize Supabase first
        if (!initializeSupabase()) {
            console.error('Failed to initialize Supabase client');
            return;
        }
        
        // Handle OAuth callback first
        await handleOAuthCallback();
        
        // Then check auth if not already authenticated
        if (!authToken) {
            await checkAuth();
        }
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
    const maxWait = 5000; // 5 seconds max
    const startTime = Date.now();
    
    function checkSupabase() {
        console.log('Checking for Supabase library...');
        console.log('window.supabase:', typeof window.supabase);
        
        if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            console.log('Supabase library found, initializing app...');
            initializeApp();
        } else if (Date.now() - startTime < maxWait) {
            console.log('Supabase not ready, retrying in 100ms...');
            setTimeout(checkSupabase, 100);
        } else {
            console.error('Timeout waiting for Supabase library to load');
            showMessage('Failed to load authentication library. Please refresh the page.', 'error');
        }
    }
    
    checkSupabase();
}
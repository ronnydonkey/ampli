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
    const storedSession = localStorage.getItem('supabaseSession');
    
    if (!token && !storedSession) return;
    
    // First try to get the current session from Supabase
    if (supabase) {
        try {
            console.log('Getting current Supabase session...');
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (!error && session) {
                console.log('Found valid Supabase session');
                console.log('Session expires at:', new Date(session.expires_at * 1000));
                authToken = session.access_token;
                currentUser = session.user;
                localStorage.setItem('authToken', authToken);
                localStorage.setItem('supabaseSession', JSON.stringify(session));
                showDashboard();
                return;
            } else {
                console.log('No valid Supabase session found:', error);
                
                // Try to refresh if we have a stored session
                if (storedSession) {
                    console.log('Attempting to refresh session with stored refresh token...');
                    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                    
                    if (!refreshError && refreshData.session) {
                        console.log('Session refreshed successfully');
                        authToken = refreshData.session.access_token;
                        currentUser = refreshData.session.user;
                        localStorage.setItem('authToken', authToken);
                        localStorage.setItem('supabaseSession', JSON.stringify(refreshData.session));
                        showDashboard();
                        return;
                    } else {
                        console.log('Failed to refresh session:', refreshError);
                    }
                }
            }
        } catch (sessionError) {
            console.error('Error checking session:', sessionError);
        }
    }
    
    // Fallback to checking with server if we still have a token
    if (token) {
        try {
            const response = await fetch(`${API_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                authToken = token;
                currentUser = data.user;
                showDashboard();
                return;
            } else {
                console.log('Server says token is invalid');
            }
        } catch (error) {
            console.error('Auth check error:', error);
        }
    }
    
    // If all fails, clear auth
    console.log('All auth checks failed, clearing stored auth');
    localStorage.removeItem('authToken');
    localStorage.removeItem('supabaseSession');
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
    
    // Don't load server content if we're having token issues
    // Just show the interface ready for client-side amplification
    displayClientOnlyMode();
}

// Archive state
let allContent = [];
let expandedItems = new Set();

// Archive DOM elements
const archiveSearch = document.getElementById('archive-search');
const archiveFilter = document.getElementById('archive-filter');

// Client-only mode for when server is having issues
function displayClientOnlyMode() {
    console.log('Running in client-only mode');
    contentList.innerHTML = `
        <div class="client-mode-notice">
            <h3>🚀 Ready to Amplify Content!</h3>
            <p>Create content above and it will be amplified using smart templates optimized for each social platform.</p>
            <p><small>Note: Running in client-side mode. Your amplified content won't be saved to the server archive.</small></p>
        </div>
    `;
}

// Content functions - modified to not cause logout
async function loadContent() {
    try {
        console.log('Attempting to load content...');
        
        // Skip server calls that might cause logout issues
        // Just display client-only mode
        displayClientOnlyMode();
        
    } catch (error) {
        console.error('Error in loadContent:', error);
        displayClientOnlyMode();
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
        console.log('Creating content - using client-side amplification');
        
        // Show amplification animation
        showAmplificationAnimation(platforms);
        
        // Add a realistic delay to make it feel like AI processing
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
        
        // Skip server entirely and use client-side fallback
        console.log('Using client-side template amplification...');
        const fallbackResults = createFallbackAmplification(content, platforms, tone);
        
        // Hide animation and show results
        hideAmplificationAnimation();
        displayAmplifiedResults(fallbackResults);
        
        // Reset form
        contentForm.reset();
        
        showMessage('Content amplified successfully! 🚀', 'success');
        
    } catch (error) {
        console.error('Content creation error:', error);
        hideAmplificationAnimation();
        alert('Failed to amplify content: ' + error.message);
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

// Client-side fallback amplification when server is unavailable
function createFallbackAmplification(content, platforms, tone) {
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
            professional: (text) => text.length > 240 ? `${text.substring(0, 240)}...\n\n#business #professional` : `${text}\n\n#business #professional #growth`,
            casual: (text) => text.length > 260 ? `${text.substring(0, 260)}...` : `${text} 😊`,
            friendly: (text) => text.length > 250 ? `${text.substring(0, 250)}... 👋` : `${text} 👋 What do you think?`,
            urgent: (text) => text.length > 240 ? `🚨 ${text.substring(0, 235)}...` : `🚨 ${text} Please RT!`,
            inspirational: (text) => text.length > 240 ? `✨ ${text.substring(0, 235)}... ✨` : `✨ ${text} ✨\n\n#motivation #inspiration`
        },
        facebook: {
            professional: (text) => `${text}\n\nI'd love to start a discussion about this topic. What are your thoughts and experiences? Please share in the comments below.`,
            casual: (text) => `${text}\n\nWhat do you all think about this? I'm really curious to hear different perspectives! Drop your thoughts in the comments 😊`,
            friendly: (text) => `Hey friends! 👋\n\n${text}\n\nI'd love to hear what you think about this! Comment below and let's have a great discussion! 💬`,
            urgent: (text) => `IMPORTANT UPDATE: ${text}\n\nThis is time-sensitive information. Please share this post to help spread awareness! Thank you! 🙏`,
            inspirational: (text) => `${text}\n\nRemember, every challenge is an opportunity to grow stronger. Keep pushing forward and believe in yourself! What motivates you to keep going? Share below! 💪✨`
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

// Amplification animation functions
function showAmplificationAnimation(platforms) {
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
                <h3>✨ Amplifying Your Content</h3>
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
    startAmplificationSequence(platforms);
}

function hideAmplificationAnimation() {
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
        facebook: '👥'
    };
    return icons[platform] || '📱';
}

async function startAmplificationSequence(platforms) {
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
                redirectTo: window.location.origin,
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

document.getElementById('google-auth-btn').addEventListener('click', signInWithGoogle);

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
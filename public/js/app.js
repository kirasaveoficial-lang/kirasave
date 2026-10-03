// ===== App State =====
const state = {
    user: null,
    token: localStorage.getItem('token'),
    currentPage: 'home',
    saves: [],
    games: [],
    notifications: []
};

// Heartbeat interval to keep user online
let heartbeatInterval = null;

// ===== Utility Functions =====
function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'agora mesmo';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}min atrás`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d atrás`;
    return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

// ===== API Base URL =====
const API_BASE = '/api';

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // Hide loading screen immediately
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }

    // Check authentication
    if (state.token) {
        await fetchUserProfile();
        startHeartbeat();
    }

    // Setup navigation
    setupNavigation();

    // Setup mobile menu
    setupMobileMenu();

    // Setup click outside to close dropdowns
    setupClickOutside();

    // Load initial page
    router();

    // Load games for dropdowns
    await loadGames();

    // Start notification polling
    if (state.user) {
        startNotificationPolling();
    }
}

// ===== Navigation =====
function setupNavigation() {
    const nav = document.getElementById('auth-nav');
    const mobileNav = document.getElementById('mobile-auth-nav');

    if (state.user) {
        nav.innerHTML = `
            <div class="relative">
                <button onclick="toggleNotifications()" class="relative p-2 text-gray-300 hover:text-purple-400 transition-colors">
                    <i class="fas fa-bell text-xl"></i>
                    <span id="notification-badge" class="notification-badge hidden">0</span>
                </button>
                <div id="notifications-dropdown" class="hidden absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-xl border border-purple-500/30 max-h-96 overflow-y-auto">
                    <div class="p-4 border-b border-gray-700 flex justify-between items-center">
                        <h3 class="font-semibold">Notificações</h3>
                        <button onclick="markAllNotificationsAsRead()" class="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                            Marcar todas como lidas
                        </button>
                    </div>
                    <div id="notifications-list" class="p-2">
                        <p class="text-gray-400 text-sm text-center py-4">Nenhuma notificação</p>
                    </div>
                </div>
            </div>
            <div class="relative">
                <button onclick="toggleAvatarDropdown()" class="flex items-center space-x-2 text-gray-300 hover:text-purple-400 transition-colors group">
                    <img src="${state.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(state.user.username)}&background=8b5cf6&color=fff&size=200&bold=true`}" alt="Avatar" class="avatar group-hover:ring-2 transition-all" style="${state.user.tagColor ? `border-color: ${state.user.tagColor}; --hover-ring-color: ${state.user.tagColor};` : ''}" ${state.user.tagColor ? `onmouseover="this.style.boxShadow='0 0 0 2px var(--hover-ring-color)'" onmouseout="this.style.boxShadow=''"` : ''}>
                    <div class="username-glow-wrapper">
                        <div class="username-particles" id="header-username-particles"></div>
                        <span class="username-glow ${state.user.tagType ? `vip-${state.user.tagType}` : ''}" style="${state.user.tagColor ? `color: ${state.user.tagColor}; text-shadow: 0 0 10px ${state.user.tagColor}80, 0 0 20px ${state.user.tagColor}60, 0 0 30px ${state.user.tagColor}40;` : ''}">${state.user.username}</span>
                    </div>
                    <i class="fas fa-chevron-down text-xs transition-transform group-hover:rotate-180"></i>
                </button>
                <div id="avatar-dropdown" class="hidden absolute right-0 mt-2 w-56 bg-gray-800/95 backdrop-blur-md rounded-xl shadow-2xl border border-purple-500/30 overflow-hidden transform origin-top-right transition-all duration-200">
                    <div class="p-2">
                        <a href="/profile" class="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-purple-500/20 hover:text-purple-400 transition-all group">
                            <i class="fas fa-user w-5 text-center group-hover:scale-110 transition-transform"></i>
                            <span>Ver Perfil</span>
                        </a>
                        <a href="/settings" class="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-purple-500/20 hover:text-purple-400 transition-all group">
                            <i class="fas fa-cog w-5 text-center group-hover:rotate-90 transition-transform"></i>
                            <span>Configurações</span>
                        </a>
                        ${state.user.is_admin ? `
                        <a href="/admin" class="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-purple-500/20 hover:text-purple-400 transition-all group">
                            <i class="fas fa-shield-alt w-5 text-center group-hover:scale-110 transition-transform"></i>
                            <span>Painel Admin</span>
                        </a>
                        ` : ''}
                        <div class="border-t border-gray-700 my-2"></div>
                        <button onclick="logout()" class="flex items-center space-x-3 w-full px-4 py-3 rounded-lg text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-all group">
                            <i class="fas fa-sign-out-alt w-5 text-center group-hover:translate-x-1 transition-transform"></i>
                            <span>Sair</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        mobileNav.innerHTML = `
            <div class="flex items-center justify-between py-2 border-b border-gray-700 mb-2">
                <span class="text-gray-300">Notificações</span>
                <button onclick="markAllNotificationsAsRead()" class="text-xs text-purple-400 hover:text-purple-300">Marcar todas como lidas</button>
            </div>
            <a href="/profile" class="block py-2 text-gray-300 hover:text-purple-400">Perfil</a>
            <a href="/settings" class="block py-2 text-gray-300 hover:text-purple-400">Configurações</a>
            ${state.user.is_admin ? '<a href="/admin" class="block py-2 text-gray-300 hover:text-purple-400">Admin</a>' : ''}
            <button onclick="logout()" class="block w-full text-left py-2 text-gray-300 hover:text-red-400">Sair</button>
        `;

        // Create username particles for header with user's VIP type
        setTimeout(() => createUsernameParticles(state.user.tagType, state.user.tagColor), 100);
    } else {
        nav.innerHTML = `
            <a href="/login" class="text-gray-300 hover:text-purple-400 transition-colors">Entrar</a>
            <a href="/register" class="btn-primary">Cadastrar</a>
        `;

        mobileNav.innerHTML = `
            <a href="/login" class="block py-2 text-gray-300 hover:text-purple-400">Entrar</a>
            <a href="/register" class="block py-2 text-gray-300 hover:text-purple-400">Cadastrar</a>
        `;
    }
}

function setupMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');

    btn.addEventListener('click', () => {
        menu.classList.toggle('hidden');
    });
}

function setupClickOutside() {
    document.addEventListener('click', (e) => {
        // Close avatar dropdown if clicking outside
        const avatarDropdown = document.getElementById('avatar-dropdown');
        const avatarButton = e.target.closest('button[onclick="toggleAvatarDropdown()"]');
        
        if (avatarDropdown && !avatarDropdown.contains(e.target) && !avatarButton) {
            avatarDropdown.classList.add('hidden');
        }

        // Close notifications dropdown if clicking outside
        const notificationsDropdown = document.getElementById('notifications-dropdown');
        const notificationsButton = e.target.closest('button[onclick="toggleNotifications()"]');
        const markAllButton = e.target.closest('button[onclick="markAllNotificationsAsRead()"]');
        
        if (notificationsDropdown && !notificationsDropdown.contains(e.target) && !notificationsButton && !markAllButton) {
            notificationsDropdown.classList.add('hidden');
        }
    });
}

// ===== Router =====
function router() {
    const path = window.location.pathname;
    const app = document.getElementById('app');

    // Clear previous content
    app.innerHTML = '';

    switch (path) {
        case '/':
            renderHomePage();
            break;
        case '/saves':
            renderSavesPage();
            break;
        case '/upload':
            renderUploadPage();
            break;
        case '/login':
            renderLoginPage();
            break;
        case '/register':
            renderRegisterPage();
            break;
        case '/profile':
            renderProfilePage();
            break;
        case '/settings':
            renderSettingsPage();
            break;
        case '/admin':
            renderAdminPage();
            break;
        case '/admin/saves':
            renderAdminSavesPage();
            break;
        case '/admin/saves/all':
            renderAdminAllSavesPage();
            break;
        case '/admin/games':
            renderAdminGamesPage();
            break;
        case '/admin/tags':
            renderAdminTagsPage();
            break;
        case '/admin/users':
            renderAdminUsersPage();
            break;
        case '/admin/users/banned':
            renderAdminBannedUsersPage();
            break;
        default:
            // Check if it's a profile page with ID
            if (path.startsWith('/profile/')) {
                const userId = path.split('/')[2];
                renderProfilePage(userId);
            } else if (path.startsWith('/saves/')) {
                const saveId = path.split('/')[2];
                renderSaveDetailsPage(saveId);
            } else {
                renderHomePage();
            }
    }

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('text-purple-400');
        if (link.getAttribute('href') === path) {
            link.classList.add('text-purple-400');
        }
    });
}

// ===== API Functions =====
async function apiCall(endpoint, options = {}) {
    const headers = {
        ...options.headers
    };

    // Only set Content-Type for non-FormData requests
    if (!options.isFormData) {
        headers['Content-Type'] = 'application/json';
    }

    if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    } catch (error) {
        showToast(error.message, 'error');
        throw error;
    }
}

// ===== Auth Functions =====
async function fetchUserProfile() {
    try {
        const data = await apiCall('/auth/profile');
        state.user = data;

        // Extract tag color and type from tags
        if (data.tags && data.tags.length > 0) {
            const mainTag = data.tags[0];
            state.user.tagColor = mainTag.color;
            const tagName = mainTag.name.toLowerCase();
            state.user.tagType = tagName.includes('Gold') ? 'gold' :
                               tagName.includes('Diamond') ? 'diamond' :
                               tagName.includes('EXTREME') ? 'extreme' :
                               tagName.includes('Ruby') ? 'ruby' :
                               tagName.includes('Platinum') ? 'platinum' : 'standard';
        } else {
            state.user.tagColor = null;
            state.user.tagType = null;
        }

        setupNavigation();
    } catch (error) {
        logout();
    }
}

async function login(email, password) {
    try {
        const data = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        state.token = data.token;
        state.user = data.user;
        localStorage.setItem('token', data.token);

        // Fetch full profile to get tags and VIP status
        await fetchUserProfile();

        showToast('Login realizado com sucesso!', 'success');
        setupNavigation();
        startHeartbeat();
        window.location.href = '/';
    } catch (error) {
        // Error handled in apiCall
    }
}

async function register(username, email, password) {
    try {
        const data = await apiCall('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });

        state.token = data.token;
        state.user = data.user;
        localStorage.setItem('token', data.token);

        // Fetch full profile to get tags
        await fetchUserProfile();

        showToast('Cadastro realizado com sucesso!', 'success');
        setupNavigation();
        startHeartbeat();
        window.location.href = '/';
    } catch (error) {
        // Error handled in apiCall
    }
}

function logout() {
    stopHeartbeat();
    apiCall('/auth/logout', { method: 'POST' }).catch(() => {});
    state.user = null;
    state.token = null;
    localStorage.removeItem('token');
    setupNavigation();
    showToast('Você saiu da conta', 'success');
    window.location.href = '/';
}

// ===== Heartbeat Functions =====
function startHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    // Send heartbeat immediately
    sendHeartbeat();
    // Send heartbeat every 30 seconds
    heartbeatInterval = setInterval(sendHeartbeat, 30000); // 30 seconds
}

async function sendHeartbeat() {
    if (state.token) {
        try {
            await apiCall('/auth/heartbeat', { method: 'POST' });
            console.log('Heartbeat sent successfully');
            // Update user state to reflect online status
            if (state.user) {
                state.user.is_online = 1;
                state.user.last_seen = new Date().toISOString();
            }
        } catch (error) {
            console.error('Heartbeat failed:', error);
        }
    }
}

function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

// ===== Page Renderers =====
function renderHomePage() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <!-- Hero Section -->
        <section class="relative min-h-[60vh] flex items-center justify-center overflow-hidden gaming-grid">
            <div class="particles" id="particles"></div>
            <div class="relative z-10 text-center px-4">
                <h1 class="text-4xl md:text-6xl font-bold mb-4 font-['Space_Grotesk']">
                    <img src="/images/logo.png" alt="KIRA SAVE" class="h-16 md:h-24 mx-auto">
                </h1>
                <p class="text-lg md:text-xl text-gray-300 mb-6 max-w-2xl mx-auto">
                    Compartilhe e descubra saves de jogos da comunidade gamer
                </p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="/saves" class="btn-primary text-lg">
                        <i class="fas fa-search mr-2"></i> Explorar Saves
                    </a>
                    <a href="/upload" class="btn-secondary text-lg">
                        <i class="fas fa-upload mr-2"></i> Compartilhar Save
                    </a>
                </div>
            </div>
        </section>

        <!-- Stats Section -->
        <section class="py-8 bg-gray-800/50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="glass-card p-4 text-center">
                        <div class="text-2xl font-bold gradient-text counter" data-target="1000">0</div>
                        <div class="text-gray-400 mt-1 text-sm">Saves Compartilhados</div>
                    </div>
                    <div class="glass-card p-4 text-center">
                        <div class="text-2xl font-bold gradient-text counter" data-target="5000">0</div>
                        <div class="text-gray-400 mt-1 text-sm">Usuários Ativos</div>
                    </div>
                    <div class="glass-card p-4 text-center">
                        <div class="text-2xl font-bold gradient-text counter" data-target="50000">0</div>
                        <div class="text-gray-400 mt-1 text-sm">Downloads Realizados</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Featured Saves -->
        <section class="py-10 overflow-visible">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-visible">
                <h2 class="text-2xl font-bold mb-6 font-['Space_Grotesk']">
                    <span class="gradient-text">Saves em Destaque</span>
                </h2>
                <div id="featured-saves" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-visible">
                    <div class="text-center text-gray-400 col-span-full py-8">
                        <i class="fas fa-spinner fa-spin text-2xl mb-3"></i>
                        <p>Carregando saves...</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Popular Games -->
        <section class="py-10 bg-gray-800/50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 class="text-2xl font-bold mb-6 font-['Space_Grotesk']">
                    <span class="gradient-text">Jogos Populares</span>
                </h2>
                <div id="popular-games" class="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-3">
                    <div class="text-center text-gray-400 col-span-full py-8">
                        <i class="fas fa-spinner fa-spin text-2xl mb-3"></i>
                        <p>Carregando jogos...</p>
                    </div>
                </div>
            </div>
        </section>
    `;

    // Initialize particles
    createParticles();

    // Animate counters
    animateCounters();

    // Load featured saves
    loadFeaturedSaves();

    // Load popular games
    loadPopularGames();
}

function renderSavesPage() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <section class="py-6">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <!-- Search and Filters -->
                <div class="glass-card p-3 mb-6">
                    <div class="flex flex-col md:flex-row gap-2">
                        <div class="flex-2 relative" style="flex: 3;">
                            <input type="text" id="search-input" placeholder="Buscar saves..." class="input-field pl-10 text-xs py-2">
                            <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
                            <div id="search-autocomplete" class="autocomplete-dropdown hidden"></div>
                        </div>
                        <select id="game-filter" class="input-field text-xs py-2" style="flex: 1.5;">
                            <option value="">Todos os Jogos</option>
                        </select>
                        <select id="platform-filter" class="input-field text-xs py-2" style="flex: 0.8;">
                            <option value="">Todas as Plataformas</option>
                            <option value="PC">PC</option>
                            <option value="PlayStation">PlayStation</option>
                            <option value="Xbox">Xbox</option>
                            <option value="Nintendo">Nintendo</option>
                        </select>
                        <select id="sort-filter" class="input-field text-xs py-2" style="flex: 1.2;">
                            <option value="recent">Mais Recentes</option>
                            <option value="popular">Mais Baixados</option>
                            <option value="rated">Melhor Avaliados</option>
                        </select>
                    </div>
                </div>

                <!-- Saves Grid -->
                <div id="saves-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <div class="text-center text-gray-400 col-span-full py-8">
                        <i class="fas fa-spinner fa-spin text-2xl mb-3"></i>
                        <p>Carregando saves...</p>
                    </div>
                </div>

                <!-- Pagination -->
                <div id="pagination" class="flex justify-center mt-6 gap-2"></div>
            </div>
        </section>
    `;

    // Populate game filter
    if (state.games && state.games.length > 0) {
        populateGameFilter();
    } else {
        loadGames().then(() => {
            populateGameFilter();
        });
    }

    // Load saves
    loadSaves();

    // Setup search
    setupSearch();
}

function renderSaveDetailsPage(id) {
    const app = document.getElementById('app');
    app.innerHTML = `
        <section class="py-8">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div id="save-details" class="text-center text-gray-400 py-8">
                    <i class="fas fa-spinner fa-spin text-4xl mb-4"></i>
                    <p>Carregando detalhes...</p>
                </div>
            </div>
        </section>
    `;

    loadSaveDetails(id);
}

function renderUploadPage() {
    if (!state.user) {
        window.location.href = '/login';
        return;
    }

    console.log('Rendering upload page');
    console.log('Available games:', state.games);

    // Reload games to ensure we have the latest list
    loadGames().then(() => {
        console.log('Games reloaded:', state.games);
    });

    const app = document.getElementById('app');
    app.innerHTML = `
        <section class="py-6">
            <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="mb-6">
                    <h1 class="text-2xl font-bold font-['Space_Grotesk'] gradient-text">Compartilhar Save</h1>
                    <p class="text-gray-400 text-sm mt-1">Preencha os dados para compartilhar seu save</p>
                </div>

                <div class="glass-card p-5">
                    <form id="upload-form">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label class="block text-gray-300 text-xs mb-1.5">Título do Save</label>
                                <input type="text" id="save-title" required class="input-field text-sm" placeholder="Ex: Save 100% Completo">
                            </div>

                            <div>
                                <label class="block text-gray-300 text-xs mb-1.5">Plataforma</label>
                                <select id="save-platform" required class="input-field text-sm">
                                    <option value="">Selecione</option>
                                    <option value="PC">PC</option>
                                    <option value="PlayStation">PlayStation</option>
                                    <option value="Xbox">Xbox</option>
                                    <option value="Nintendo">Nintendo</option>
                                </select>
                            </div>
                        </div>

                        <div class="mb-4">
                            <label class="block text-gray-300 text-xs mb-1.5">Nome do Jogo</label>
                            <div class="relative">
                                <div class="relative">
                                    <input type="text" id="save-game" required class="input-field text-sm pr-10" placeholder="Digite o nome do jogo..." autocomplete="off">
                                    <div id="game-confirmed" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-400 hidden">
                                        <i class="fas fa-check-circle"></i>
                                    </div>
                                </div>
                                <div id="game-suggestions" class="absolute top-full left-0 right-0 bg-gray-800 rounded-lg shadow-xl border border-purple-500/30 mt-1 max-h-48 overflow-y-auto hidden z-50"></div>
                            </div>
                        </div>

                        <div class="mb-4">
                            <label class="block text-gray-300 text-xs mb-1.5">Categoria</label>
                            <select id="save-category" class="input-field text-sm">
                                <option value="">Selecione</option>
                                <option value="story">História</option>
                                <option value="100%">100% Completo</option>
                                <option value="new-game">New Game+</option>
                                <option value="specific">Ponto Específico</option>
                                <option value="cheat">Com Cheats</option>
                            </select>
                        </div>

                        <div class="mb-4">
                            <label class="block text-gray-300 text-xs mb-1.5">Descrição</label>
                            <textarea id="save-description" rows="3" class="input-field text-sm" placeholder="Descreva seu save..."></textarea>
                        </div>

                        <div class="mb-4">
                            <label class="block text-gray-300 text-xs mb-1.5">Link do Download (Mediafire, Mega, etc.)</label>
                            <input type="url" id="save-url" placeholder="https://..." required class="input-field w-full text-sm">
                            <p class="text-gray-500 text-xs mt-1">Cole o link do arquivo do Mediafire, Mega, Google Drive, etc.</p>
                        </div>

                        <div class="mb-4">
                            <div class="progress-bar">
                                <div id="upload-progress" class="progress-fill" style="width: 0%"></div>
                            </div>
                        </div>

                        <button type="submit" id="upload-btn" class="btn-primary w-full text-sm">
                            <i class="fas fa-upload mr-1.5"></i> Enviar Save
                        </button>
                    </form>
                </div>
            </div>
        </section>
    `;

    // Setup game autocomplete
    setupGameAutocomplete();
    // Setup form submission
    setTimeout(() => {
        setupUploadForm();
    }, 100);
}

function renderLoginPage() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <section class="min-h-screen flex items-center justify-center py-12 px-4">
            <div class="max-w-md w-full">
                <div class="glass-card p-8">
                    <h1 class="text-3xl font-bold mb-8 text-center font-['Space_Grotesk']">
                        <span class="gradient-text">Entrar</span>
                    </h1>

                    <form id="login-form">
                        <div class="mb-6">
                            <label class="block text-gray-300 mb-2">Email</label>
                            <input type="email" name="email" required class="input-field" placeholder="seu@email.com">
                        </div>

                        <div class="mb-6">
                            <label class="block text-gray-300 mb-2">Senha</label>
                            <input type="password" name="password" required class="input-field" placeholder="••••••••">
                        </div>

                        <button type="submit" class="btn-primary w-full mb-4">
                            <i class="fas fa-sign-in-alt mr-2"></i> Entrar
                        </button>

                        <p class="text-center text-gray-400">
                            Não tem uma conta? <a href="/register" class="text-purple-400 hover:text-purple-300">Cadastre-se</a>
                        </p>
                    </form>
                </div>
            </div>
        </section>
    `;

    // Setup form
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        login(formData.get('email'), formData.get('password'));
    });
}

function renderRegisterPage() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <section class="min-h-screen flex items-center justify-center py-12 px-4">
            <div class="max-w-md w-full">
                <div class="glass-card p-8">
                    <h1 class="text-3xl font-bold mb-8 text-center font-['Space_Grotesk']">
                        <span class="gradient-text">Cadastrar</span>
                    </h1>

                    <form id="register-form">
                        <div class="mb-6">
                            <label class="block text-gray-300 mb-2">Nome de Usuário</label>
                            <input type="text" name="username" required class="input-field" placeholder="seuusername">
                        </div>

                        <div class="mb-6">
                            <label class="block text-gray-300 mb-2">Email</label>
                            <input type="email" name="email" required class="input-field" placeholder="seu@email.com">
                        </div>

                        <div class="mb-6">
                            <label class="block text-gray-300 mb-2">Senha</label>
                            <input type="password" name="password" required class="input-field" placeholder="••••••••" minlength="6">
                        </div>

                        <div class="mb-6">
                            <label class="block text-gray-300 mb-2">Confirmar Senha</label>
                            <input type="password" name="confirm_password" required class="input-field" placeholder="••••••••" minlength="6">
                        </div>

                        <button type="submit" class="btn-primary w-full mb-4">
                            <i class="fas fa-user-plus mr-2"></i> Cadastrar
                        </button>

                        <p class="text-center text-gray-400">
                            Já tem uma conta? <a href="/login" class="text-purple-400 hover:text-purple-300">Entrar</a>
                        </p>
                    </form>
                </div>
            </div>
        </section>
    `;

    // Setup form
    document.getElementById('register-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const password = formData.get('password');
        const confirmPassword = formData.get('confirm_password');

        if (password !== confirmPassword) {
            showToast('As senhas não coincidem', 'error');
            return;
        }

        register(formData.get('username'), formData.get('email'), password);
    });
}

function renderProfilePage(userId = null) {
    if (!state.user && !userId) {
        window.location.href = '/login';
        return;
    }

    const app = document.getElementById('app');
    const containerId = userId ? 'user-profile-content' : 'profile-content';
    
    app.innerHTML = `
        <section class="py-8">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div id="${containerId}" class="text-center text-gray-400 py-8">
                    <i class="fas fa-spinner fa-spin text-4xl mb-4"></i>
                    <p>Carregando perfil...</p>
                </div>
            </div>
        </section>
    `;

    if (userId) {
        loadUserProfile(userId);
    } else {
        loadProfile();
    }
}

function renderSettingsPage() {
    if (!state.user) {
        window.location.href = '/login';
        return;
    }

    const app = document.getElementById('app');
    app.innerHTML = `
        <section class="py-8">
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 class="text-3xl font-bold mb-8 font-['Space_Grotesk']">
                    <span class="gradient-text">Configurações do Perfil</span>
                </h1>

                <div class="space-y-6">
                    <!-- Avatar Section -->
                    <div class="glass-card p-4">
                        <h2 class="text-lg font-semibold mb-3 flex items-center">
                            <i class="fas fa-user-circle mr-2 text-purple-400"></i>
                            Avatar
                        </h2>
                        <div class="flex items-center space-x-6">
                            <div class="relative">
                                <img id="settings-avatar-preview" src="${state.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(state.user.username)}&background=8b5cf6&color=fff&size=200&bold=true`}" alt="Avatar" class="w-24 h-24 rounded-full object-cover border-4 border-purple-500/30">
                                <label for="avatar-upload" class="absolute bottom-0 right-0 bg-purple-500 hover:bg-purple-600 rounded-full p-2 cursor-pointer transition-colors">
                                    <i class="fas fa-camera text-white text-sm"></i>
                                </label>
                                <input type="file" id="avatar-upload" accept="image/*" class="hidden" onchange="handleAvatarUpload(event)">
                            </div>
                            <div>
                                <p class="text-gray-400 text-sm mb-2">Formatos aceitos: JPG, PNG, GIF, WEBP</p>
                                <p class="text-gray-400 text-sm">Tamanho máximo: 20MB</p>
                            </div>
                        </div>
                    </div>

                    <!-- Profile Information -->
                    <div class="glass-card p-4">
                        <h2 class="text-lg font-semibold mb-3 flex items-center">
                            <i class="fas fa-user mr-2 text-purple-400"></i>
                            Informações do Perfil
                        </h2>
                        <form id="profile-settings-form" class="space-y-4">
                            <div>
                                <label class="block text-gray-300 mb-2">Nome de Usuário</label>
                                <input type="text" id="settings-username" value="${state.user.username}" class="input-field" placeholder="Seu nome de usuário">
                                <p id="username-change-info" class="text-gray-400 text-xs mt-1"></p>
                            </div>
                            <div>
                                <label class="block text-gray-300 mb-2">Bio</label>
                                <textarea id="settings-bio" rows="3" class="input-field" placeholder="Conte um pouco sobre você...">${state.user.bio || ''}</textarea>
                            </div>
                            <div>
                                <label class="block text-gray-300 mb-2">Data de Nascimento</label>
                                <input type="date" id="settings-birthdate" value="${state.user.birth_date || ''}" class="input-field">
                            </div>
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-save mr-2"></i> Salvar Informações
                            </button>
                        </form>
                    </div>

                    <!-- Email Settings -->
                    <div class="glass-card p-4">
                        <h2 class="text-lg font-semibold mb-3 flex items-center">
                            <i class="fas fa-envelope mr-2 text-purple-400"></i>
                            Email
                        </h2>
                        <form id="email-settings-form" class="space-y-4">
                            <div>
                                <label class="block text-gray-300 mb-2">Email Atual</label>
                                <input type="email" id="settings-current-email" value="${state.user.email}" class="input-field" disabled>
                            </div>
                            <div>
                                <label class="block text-gray-300 mb-2">Novo Email</label>
                                <input type="email" id="settings-new-email" class="input-field" placeholder="novo@email.com">
                            </div>
                            <div>
                                <label class="block text-gray-300 mb-2">Senha Atual</label>
                                <input type="password" id="settings-email-password" class="input-field" placeholder="Digite sua senha atual">
                            </div>
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-envelope mr-2"></i> Atualizar Email
                            </button>
                        </form>
                    </div>

                    <!-- Password Settings -->
                    <div class="glass-card p-4">
                        <h2 class="text-lg font-semibold mb-3 flex items-center">
                            <i class="fas fa-lock mr-2 text-purple-400"></i>
                            Senha
                        </h2>
                        <form id="password-settings-form" class="space-y-4">
                            <div>
                                <label class="block text-gray-300 mb-2">Senha Atual</label>
                                <input type="password" id="settings-current-password" class="input-field" placeholder="Digite sua senha atual">
                            </div>
                            <div>
                                <label class="block text-gray-300 mb-2">Nova Senha</label>
                                <input type="password" id="settings-new-password" class="input-field" placeholder="Mínimo 6 caracteres">
                            </div>
                            <div>
                                <label class="block text-gray-300 mb-2">Confirmar Nova Senha</label>
                                <input type="password" id="settings-confirm-password" class="input-field" placeholder="Confirme a nova senha">
                            </div>
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-key mr-2"></i> Alterar Senha
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    `;

    // Setup form event listeners
    setupSettingsForms();
}

function renderAdminPage() {
    if (!state.user || !state.user.is_admin) {
        window.location.href = '/';
        return;
    }

    const app = document.getElementById('app');
    app.innerHTML = `
        <section class="py-8">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 class="text-3xl font-bold mb-8 font-['Space_Grotesk']">
                    <span class="gradient-text">Painel Admin</span>
                </h1>

                <div id="admin-content" class="text-center text-gray-400 py-8">
                    <i class="fas fa-spinner fa-spin text-4xl mb-4"></i>
                    <p>Carregando painel...</p>
                </div>
            </div>
        </section>
    `;

    loadAdminDashboard();
}

function renderAdminSavesPage() {
    if (!state.user || !state.user.is_admin) {
        window.location.href = '/';
        return;
    }

    const app = document.getElementById('app');
    app.innerHTML = `
        <section class="py-6">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="mb-4">
                    <a href="/admin" class="text-gray-400 hover:text-purple-400 transition-colors text-sm">
                        <i class="fas fa-arrow-left mr-2"></i>Voltar ao Dashboard
                    </a>
                </div>
                <h1 class="text-2xl font-bold mb-6 font-['Space_Grotesk']">
                    <span class="gradient-text">Gerenciar Saves</span>
                </h1>

                <!-- Navigation Tabs -->
                <div class="glass-card p-3 mb-6">
                    <div class="flex gap-1 border-b border-gray-700/50 pb-2">
                        <a href="/admin" class="admin-nav-link text-xs px-3 py-1.5 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-home mr-1"></i>Dashboard
                        </a>
                        <a href="/admin/saves" class="admin-nav-link text-xs px-3 py-1.5 text-purple-400 border-b-2 border-purple-400">
                            <i class="fas fa-clock mr-1"></i>Pendentes
                        </a>
                        <a href="/admin/saves/all" class="admin-nav-link text-xs px-3 py-1.5 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-database mr-1"></i>Todos
                        </a>
                        <a href="/admin/games" class="admin-nav-link text-xs px-3 py-1.5 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-gamepad mr-1"></i>Jogos
                        </a>
                        <a href="/admin/tags" class="admin-nav-link text-xs px-3 py-1.5 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-tags mr-1"></i>Tags
                        </a>
                        <a href="/admin/users" class="admin-nav-link text-xs px-3 py-1.5 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-users mr-1"></i>Usuários
                        </a>
                    </div>
                </div>

                <div class="glass-card p-4">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="font-bold text-sm">
                            <i class="fas fa-clock text-yellow-400 mr-2"></i>Saves Pendentes
                        </h3>
                    </div>
                    <div id="pending-saves-list">
                        <p class="text-gray-400 text-xs text-center py-4">Carregando...</p>
                    </div>
                </div>
            </div>
        </section>
    `;

    loadPendingSaves();
}

function renderAdminAllSavesPage() {
    if (!state.user || !state.user.is_admin) {
        window.location.href = '/';
        return;
    }

    const app = document.getElementById('app');
    app.innerHTML = `
        <section class="py-6">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="mb-4">
                    <a href="/admin" class="text-gray-400 hover:text-purple-400 transition-colors text-sm">
                        <i class="fas fa-arrow-left mr-2"></i>Voltar ao Dashboard
                    </a>
                </div>
                <h1 class="text-2xl font-bold mb-6 font-['Space_Grotesk']">
                    <span class="gradient-text">Gerenciar Todos os Saves</span>
                </h1>

                <!-- Navigation Tabs -->
                <div class="glass-card p-3 mb-6">
                    <div class="flex gap-1 border-b border-gray-700/50 pb-2">
                        <a href="/admin" class="admin-nav-link text-xs px-3 py-1.5 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-home mr-1"></i>Dashboard
                        </a>
                        <a href="/admin/saves" class="admin-nav-link text-xs px-3 py-1.5 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-clock mr-1"></i>Pendentes
                        </a>
                        <a href="/admin/saves/all" class="admin-nav-link text-xs px-3 py-1.5 text-purple-400 border-b-2 border-purple-400">
                            <i class="fas fa-database mr-1"></i>Todos
                        </a>
                        <a href="/admin/games" class="admin-nav-link text-xs px-3 py-1.5 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-gamepad mr-1"></i>Jogos
                        </a>
                        <a href="/admin/tags" class="admin-nav-link text-xs px-3 py-1.5 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-tags mr-1"></i>Tags
                        </a>
                        <a href="/admin/users" class="admin-nav-link text-xs px-3 py-1.5 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-users mr-1"></i>Usuários
                        </a>
                    </div>
                </div>

                <!-- Filters -->
                <div class="glass-card p-4 mb-6">
                    <div class="flex flex-wrap gap-4 items-center">
                        <div class="flex-1 min-w-64">
                            <input type="text" id="saves-search" placeholder="Buscar por título ou usuário..." class="input-field text-sm w-full" oninput="filterAllSaves()">
                        </div>
                        <div>
                            <select id="saves-status-filter" class="input-field text-sm" onchange="filterAllSaves()">
                                <option value="">Todos os Status</option>
                                <option value="approved">Aprovados</option>
                                <option value="pending">Pendentes</option>
                                <option value="rejected">Rejeitados</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Saves List -->
                <div class="glass-card p-4">
                    <div id="all-saves-list" class="space-y-3">
                        <p class="text-gray-400 text-xs text-center py-4">Carregando...</p>
                    </div>
                    <div id="pagination" class="flex justify-center gap-2 mt-4"></div>
                </div>
            </div>
        </section>
    `;

    loadAllSaves();
}

function renderAdminGamesPage() {
    if (!state.user || !state.user.is_admin) {
        window.location.href = '/';
        return;
    }

    const app = document.getElementById('app');
    app.innerHTML = `
        <section class="py-6">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="mb-4">
                    <a href="/admin" class="text-gray-400 hover:text-purple-400 transition-colors text-sm">
                        <i class="fas fa-arrow-left mr-2"></i>Voltar ao Dashboard
                    </a>
                </div>
                <h1 class="text-2xl font-bold mb-6 font-['Space_Grotesk']">
                    <span class="gradient-text">Gerenciar Jogos</span>
                </h1>

                <!-- Navigation Tabs -->
                <div class="glass-card p-3 mb-6">
                    <div class="flex gap-1 border-b border-gray-700/50 pb-2">
                        <a href="/admin" class="admin-nav-link text-xs px-3 py-1.5 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-home mr-1"></i>Dashboard
                        </a>
                        <a href="/admin/saves" class="admin-nav-link text-xs px-3 py-1.5 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-clock mr-1"></i>Pendentes
                        </a>
                        <a href="/admin/saves/all" class="admin-nav-link text-xs px-3 py-1.5 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-database mr-1"></i>Todos
                        </a>
                        <a href="/admin/games" class="admin-nav-link text-xs px-3 py-1.5 text-purple-400 border-b-2 border-purple-400">
                            <i class="fas fa-gamepad mr-1"></i>Jogos
                        </a>
                        <a href="/admin/tags" class="admin-nav-link text-xs px-3 py-1.5 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-tags mr-1"></i>Tags
                        </a>
                        <a href="/admin/users" class="admin-nav-link text-xs px-3 py-1.5 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-users mr-1"></i>Usuários
                        </a>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Create/Edit Game Form -->
                    <div class="glass-card p-4">
                        <h3 class="font-bold text-sm mb-4">
                            <i class="fas fa-plus-circle text-purple-400 mr-2"></i>
                            <span id="game-form-title">Adicionar Novo Jogo</span>
                        </h3>
                        <form id="game-form" class="space-y-3">
                            <input type="hidden" id="game-id">
                            <div>
                                <label class="block text-gray-300 text-xs mb-1">Nome do Jogo *</label>
                                <input type="text" id="game-name" required class="input-field text-sm" placeholder="Ex: The Witcher 3">
                            </div>
                            <div>
                                <label class="block text-gray-300 text-xs mb-1">Plataforma</label>
                                <select id="game-platform" class="input-field text-sm">
                                    <option value="">Todas</option>
                                    <option value="PC">PC</option>
                                    <option value="PlayStation">PlayStation</option>
                                    <option value="Xbox">Xbox</option>
                                    <option value="Nintendo">Nintendo</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-gray-300 text-xs mb-1">URL da Capa</label>
                                <input type="url" id="game-cover" class="input-field text-sm" placeholder="https://...">
                            </div>
                            <div>
                                <label class="block text-gray-300 text-xs mb-1">Descrição</label>
                                <textarea id="game-description" rows="3" class="input-field text-sm" placeholder="Descrição do jogo..."></textarea>
                            </div>
                            <div class="flex gap-2">
                                <button type="submit" class="btn-primary flex-1 text-sm">
                                    <i class="fas fa-save mr-1"></i> Salvar
                                </button>
                                <button type="button" onclick="resetGameForm()" class="btn-secondary flex-1 text-sm">
                                    <i class="fas fa-times mr-1"></i> Cancelar
                                </button>
                            </div>
                        </form>
                    </div>

                    <!-- Games List -->
                    <div class="lg:col-span-2 glass-card p-4">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="font-bold text-sm">
                                <i class="fas fa-list text-purple-400 mr-2"></i>Jogos Cadastrados
                            </h3>
                            <input type="text" id="game-search" placeholder="Buscar..." class="input-field text-sm w-40" oninput="filterGames()">
                        </div>
                        <div id="games-list" class="space-y-2 max-h-96 overflow-y-auto">
                            <p class="text-gray-400 text-xs text-center py-4">Carregando...</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;

    // Setup form event listener
    const gameForm = document.getElementById('game-form');
    if (gameForm) {
        gameForm.addEventListener('submit', handleGameSubmit);
    }

    // Load games
    loadAdminGames();
}

function renderAdminTagsPage() {
    if (!state.user || !state.user.is_admin) {
        window.location.href = '/';
        return;
    }

    const app = document.getElementById('app');
    app.innerHTML = `
        <section class="py-8">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="mb-6">
                    <a href="/admin" class="text-gray-400 hover:text-purple-400 transition-colors">
                        <i class="fas fa-arrow-left mr-2"></i>Voltar ao Dashboard
                    </a>
                </div>
                <h1 class="text-3xl font-bold mb-8 font-['Space_Grotesk']">
                    <span class="gradient-text">Gerenciar Tags</span>
                </h1>

                <div class="mb-6">
                    <div class="flex gap-2 border-b border-gray-700">
                        <a href="/admin" class="admin-nav-link px-4 py-2 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-home mr-2"></i>Dashboard
                        </a>
                        <a href="/admin/saves" class="admin-nav-link px-4 py-2 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-clock mr-2"></i>Pendentes
                        </a>
                        <a href="/admin/saves/all" class="admin-nav-link px-4 py-2 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-database mr-2"></i>Todos
                        </a>
                        <a href="/admin/games" class="admin-nav-link px-4 py-2 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-gamepad mr-2"></i>Jogos
                        </a>
                        <a href="/admin/tags" class="admin-nav-link px-4 py-2 text-purple-400 border-b-2 border-purple-400">
                            <i class="fas fa-tags mr-2"></i>Tags
                        </a>
                        <a href="/admin/users" class="admin-nav-link px-4 py-2 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-users mr-2"></i>Usuários
                        </a>
                    </div>
                </div>

                <div class="glass-card p-6 mb-6">
                    <h3 class="font-bold mb-4">Criar Nova Tag</h3>
                    <form id="create-tag-form" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-gray-300 mb-2">Nome da Tag</label>
                            <input type="text" id="tag-name" required class="input-field" placeholder="Ex: VIP">
                        </div>
                        <div>
                            <label class="block text-gray-300 mb-2">Cor</label>
                            <input type="color" id="tag-color" value="#8b5cf6" class="input-field h-10">
                        </div>
                        <div>
                            <label class="block text-gray-300 mb-2">Ícone (FontAwesome)</label>
                            <input type="text" id="tag-icon" class="input-field" placeholder="Ex: crown">
                        </div>
                        <div>
                            <label class="block text-gray-300 mb-2">Descrição</label>
                            <input type="text" id="tag-description" class="input-field" placeholder="Descrição da tag">
                        </div>
                        <div class="md:col-span-2">
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-plus mr-2"></i>Criar Tag
                            </button>
                        </div>
                    </form>
                </div>

                <div class="glass-card p-6">
                    <h3 class="font-bold mb-4">Tags Existentes</h3>
                    <div id="tags-list">
                        <p class="text-gray-400">Carregando...</p>
                    </div>
                </div>
            </div>
        </section>
    `;

    // Setup form event listener
    const createTagForm = document.getElementById('create-tag-form');
    if (createTagForm) {
        createTagForm.addEventListener('submit', handleCreateTag);
    }

    // Load tags
    loadTags();
}

function renderAdminUsersPage() {
    if (!state.user || !state.user.is_admin) {
        window.location.href = '/';
        return;
    }

    const app = document.getElementById('app');
    app.innerHTML = `
        <section class="py-8">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="mb-6">
                    <a href="/admin" class="text-gray-400 hover:text-purple-400 transition-colors">
                        <i class="fas fa-arrow-left mr-2"></i>Voltar ao Dashboard
                    </a>
                </div>
                <h1 class="text-3xl font-bold mb-8 font-['Space_Grotesk']">
                    <span class="gradient-text">Gerenciar Usuários</span>
                </h1>

                <div class="mb-6">
                    <div class="flex gap-2 border-b border-gray-700">
                        <a href="/admin" class="admin-nav-link px-4 py-2 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-home mr-2"></i>Dashboard
                        </a>
                        <a href="/admin/saves" class="admin-nav-link px-4 py-2 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-clock mr-2"></i>Pendentes
                        </a>
                        <a href="/admin/saves/all" class="admin-nav-link px-4 py-2 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-database mr-2"></i>Todos
                        </a>
                        <a href="/admin/games" class="admin-nav-link px-4 py-2 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-gamepad mr-2"></i>Jogos
                        </a>
                        <a href="/admin/tags" class="admin-nav-link px-4 py-2 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-tags mr-2"></i>Tags
                        </a>
                        <a href="/admin/users" class="admin-nav-link px-4 py-2 text-purple-400 border-b-2 border-purple-400">
                            <i class="fas fa-users mr-2"></i>Usuários
                        </a>
                        <a href="/admin/users/banned" class="admin-nav-link px-4 py-2 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-ban mr-2"></i>Banidos
                        </a>
                    </div>
                </div>

                <div class="glass-card p-6">
                    <h3 class="font-bold mb-4">Gerenciar Tags de Usuários</h3>
                    <div class="mb-4">
                        <label class="block text-gray-300 mb-2">Selecionar Usuário</label>
                        <select id="user-select" class="input-field">
                            <option value="">Selecione um usuário</option>
                        </select>
                    </div>
                    <div id="user-tags-management" class="hidden">
                        <div class="mb-4">
                            <label class="block text-gray-300 mb-2">Tags Atuais</label>
                            <div id="current-user-tags" class="flex flex-wrap gap-2"></div>
                        </div>
                        <div class="mb-4">
                            <label class="block text-gray-300 mb-2">Adicionar Tag</label>
                            <select id="assign-tag-select" class="input-field">
                                <option value="">Selecione uma tag</option>
                            </select>
                            <button onclick="assignTagToUser()" class="btn-primary mt-2">
                                <i class="fas fa-plus mr-2"></i>Adicionar Tag
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;

    // Setup user select
    const userSelect = document.getElementById('user-select');
    if (userSelect) {
        userSelect.addEventListener('change', handleUserSelectChange);
    }

    // Load users and tags
    loadUsersForTagManagement();
    loadTags();
}

function renderAdminBannedUsersPage() {
    if (!state.user || !state.user.is_admin) {
        window.location.href = '/';
        return;
    }

    const app = document.getElementById('app');
    app.innerHTML = `
        <section class="py-6">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="mb-4">
                    <a href="/admin" class="text-gray-400 hover:text-purple-400 transition-colors text-sm">
                        <i class="fas fa-arrow-left mr-2"></i>Voltar ao Dashboard
                    </a>
                </div>
                <h1 class="text-2xl font-bold mb-6 font-['Space_Grotesk']">
                    <span class="gradient-text">Usuários Banidos</span>
                </h1>

                <!-- Navigation Tabs -->
                <div class="glass-card p-3 mb-6">
                    <div class="flex gap-1 border-b border-gray-700/50 pb-2">
                        <a href="/admin" class="admin-nav-link text-xs px-3 py-1.5 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-home mr-1"></i>Dashboard
                        </a>
                        <a href="/admin/saves" class="admin-nav-link text-xs px-3 py-1.5 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-clock mr-1"></i>Pendentes
                        </a>
                        <a href="/admin/saves/all" class="admin-nav-link text-xs px-3 py-1.5 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-database mr-1"></i>Todos
                        </a>
                        <a href="/admin/games" class="admin-nav-link text-xs px-3 py-1.5 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-gamepad mr-1"></i>Jogos
                        </a>
                        <a href="/admin/tags" class="admin-nav-link text-xs px-3 py-1.5 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-tags mr-1"></i>Tags
                        </a>
                        <a href="/admin/users" class="admin-nav-link text-xs px-3 py-1.5 text-gray-400 hover:text-purple-400 transition-colors">
                            <i class="fas fa-users mr-1"></i>Usuários
                        </a>
                        <a href="/admin/users/banned" class="admin-nav-link text-xs px-3 py-1.5 text-purple-400 border-b-2 border-purple-400">
                            <i class="fas fa-ban mr-1"></i>Banidos
                        </a>
                    </div>
                </div>

                <!-- Search -->
                <div class="glass-card p-4 mb-6">
                    <div class="flex gap-4 items-center">
                        <div class="flex-1 relative">
                            <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"></i>
                            <input type="text" id="banned-users-search" placeholder="Buscar por nome ou email..." class="input-field text-sm w-full pl-10" oninput="filterBannedUsers()">
                        </div>
                    </div>
                </div>

                <!-- Banned Users List -->
                <div class="glass-card p-4">
                    <div id="banned-users-list" class="space-y-3">
                        <p class="text-gray-400 text-xs text-center py-4">Carregando...</p>
                    </div>
                    <div id="banned-pagination" class="flex justify-center gap-2 mt-4"></div>
                </div>
            </div>
        </section>
    `;

    loadBannedUsers();
}

// ===== Data Loading Functions =====
let isLoadingGames = false;
async function loadGames() {
    if (isLoadingGames) return;
    isLoadingGames = true;
    try {
        console.log('Loading games...');
        const data = await apiCall('/saves/games');
        console.log('Games loaded:', data);
        state.games = data;
    } catch (error) {
        console.error('Failed to load games:', error);
    } finally {
        isLoadingGames = false;
    }
}

async function loadFeaturedSaves() {
    try {
        const data = await apiCall('/saves?limit=6&sort=popular');
        renderSaveCards(data.saves, 'featured-saves');
    } catch (error) {
        console.error('Failed to load featured saves:', error);
    }
}

async function loadPopularGames() {
    try {
        const data = await apiCall('/saves/games');
        renderGameCards(data.slice(0, 6), 'popular-games');
    } catch (error) {
        console.error('Failed to load popular games:', error);
    }
}

async function loadSaves(page = 1) {
    const search = document.getElementById('search-input')?.value || '';
    const game = document.getElementById('game-filter')?.value || '';
    const platform = document.getElementById('platform-filter')?.value || '';
    const sort = document.getElementById('sort-filter')?.value || 'recent';

    try {
        const data = await apiCall(`/saves?page=${page}&search=${encodeURIComponent(search)}&game=${game}&platform=${platform}&sort=${sort}`);
        renderSaveCards(data.saves, 'saves-grid');
        renderPagination(data.pagination);
    } catch (error) {
        console.error('Failed to load saves:', error);
        showToast('Erro ao carregar saves', 'error');
    }
}

async function loadSaveDetails(id) {
    try {
        const data = await apiCall(`/saves/${id}`);
        console.log('Save details loaded:', data);
        renderSaveDetails(data);
    } catch (error) {
        console.error('Failed to load save details:', error);
        showToast('Erro ao carregar detalhes do save', 'error');
    }
}

async function loadProfile() {
    try {
        const data = await apiCall('/auth/profile');
        renderProfile(data);
    } catch (error) {
        console.error('Failed to load profile:', error);
    }
}

async function loadUserProfile(userId) {
    try {
        const data = await apiCall(`/auth/profile/${userId}`);
        renderProfile(data);
    } catch (error) {
        console.error('Failed to load user profile:', error);
    }
}

function showLoginRequiredMessage() {
    showToast('⚠️ Faça login ou registre-se para baixar saves', 'warning');
}

// ===== Username Particles =====
function createUsernameParticles(userTagType = null, userTagColor = null) {
    const particleContainers = document.querySelectorAll('.username-particles');

    particleContainers.forEach(container => {
        // Clear existing particles first to prevent duplicates
        container.innerHTML = '';

        // Use provided tag type/color or detect from parent element
        let tagType = userTagType;
        let tagColor = userTagColor;

        if (!tagColor) {
            // Try to get color from parent element style
            const parentGlow = container.closest('.username-glow');
            if (parentGlow && parentGlow.style.color) {
                tagColor = parentGlow.style.color;
            }
        }

        if (!tagType) {
            const parent = container.closest('.vip-gold, .vip-platinum, .vip-diamond, .vip-extreme, .vip-ruby');
            if (parent) {
                if (parent.classList.contains('vip-gold')) tagType = 'gold';
                else if (parent.classList.contains('vip-platinum')) tagType = 'platinum';
                else if (parent.classList.contains('vip-diamond')) tagType = 'diamond';
                else if (parent.classList.contains('vip-extreme')) tagType = 'extreme';
                else if (parent.classList.contains('vip-ruby')) tagType = 'ruby';
            }
        }

        // Create 8 particles
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'username-particle';

            // Add VIP class if applicable
            if (tagType) {
                particle.classList.add(`vip-${tagType}`);
            }

            // Set color from tag if available
            if (tagColor) {
                particle.style.backgroundColor = tagColor;
                particle.style.boxShadow = `0 0 6px ${tagColor}`;
            }

            // Random position around the username (more concentrated)
            const angle = (i / 8) * Math.PI * 2;
            const radius = 8 + Math.random() * 6;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            particle.style.left = `calc(50% + ${x}px)`;
            particle.style.top = `calc(50% + ${y}px)`;
            particle.style.animationDelay = `${i * 0.5}s`;

            container.appendChild(particle);
        }
    });
}

// ===== Settings Functions =====
function setupSettingsForms() {
    // Display username change restriction info
    const usernameInput = document.getElementById('settings-username');
    const usernameInfo = document.getElementById('username-change-info');

    if (usernameInput && usernameInfo && state.user.usernameChangeInfo) {
        const { canChangeUsername, daysUntilChange } = state.user.usernameChangeInfo;
        const isAdmin = state.user.is_admin;

        // Admins can always change username
        if (isAdmin) {
            usernameInput.disabled = false;
            usernameInput.classList.remove('opacity-50', 'cursor-not-allowed');
            usernameInfo.innerHTML = `<span class="text-purple-400"><i class="fas fa-shield-alt mr-1"></i>Administrador - você pode alterar seu nome de usuário a qualquer momento</span>`;
        } else if (!canChangeUsername) {
            usernameInput.disabled = true;
            usernameInput.classList.add('opacity-50', 'cursor-not-allowed');
            usernameInfo.innerHTML = `<span class="text-yellow-400"><i class="fas fa-clock mr-1"></i>Você pode alterar seu nome de usuário em ${daysUntilChange} dia(s)</span>`;
        } else {
            // Check if user has never changed username (username_changed_at is null)
            if (!state.user.username_changed_at) {
                usernameInfo.innerHTML = `<span class="text-green-400"><i class="fas fa-check-circle mr-1"></i>Primeira alteração disponível (após isso: 7 dias de espera)</span>`;
            } else {
                usernameInfo.innerHTML = `<span class="text-green-400"><i class="fas fa-check-circle mr-1"></i>Você pode alterar seu nome de usuário</span>`;
            }
        }
    }

    // Profile settings form
    const profileForm = document.getElementById('profile-settings-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('settings-username').value;
            const bio = document.getElementById('settings-bio').value;
            const birth_date = document.getElementById('settings-birthdate').value;

            try {
                await apiCall('/auth/profile', {
                    method: 'PUT',
                    body: JSON.stringify({ username, bio, birth_date })
                });
                showToast('Perfil atualizado com sucesso!', 'success');
                await fetchUserProfile(); // Refresh user data
            } catch (error) {
                // Error handled in apiCall
            }
        });
    }

    // Email settings form
    const emailForm = document.getElementById('email-settings-form');
    if (emailForm) {
        emailForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const new_email = document.getElementById('settings-new-email').value;
            const password = document.getElementById('settings-email-password').value;

            if (!new_email || !password) {
                showToast('Preencha todos os campos', 'error');
                return;
            }

            try {
                await apiCall('/auth/email', {
                    method: 'PUT',
                    body: JSON.stringify({ new_email, password })
                });
                showToast('Email atualizado com sucesso!', 'success');
                document.getElementById('settings-new-email').value = '';
                document.getElementById('settings-email-password').value = '';
                await fetchUserProfile(); // Refresh user data
            } catch (error) {
                // Error handled in apiCall
            }
        });
    }

    // Password settings form
    const passwordForm = document.getElementById('password-settings-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const current_password = document.getElementById('settings-current-password').value;
            const new_password = document.getElementById('settings-new-password').value;
            const confirm_password = document.getElementById('settings-confirm-password').value;

            if (!current_password || !new_password || !confirm_password) {
                showToast('Preencha todos os campos', 'error');
                return;
            }

            if (new_password !== confirm_password) {
                showToast('As senhas não coincidem', 'error');
                return;
            }

            if (new_password.length < 6) {
                showToast('A senha deve ter no mínimo 6 caracteres', 'error');
                return;
            }

            try {
                await apiCall('/auth/password', {
                    method: 'PUT',
                    body: JSON.stringify({ current_password, new_password })
                });
                showToast('Senha alterada com sucesso!', 'success');
                document.getElementById('settings-current-password').value = '';
                document.getElementById('settings-new-password').value = '';
                document.getElementById('settings-confirm-password').value = '';
            } catch (error) {
                // Error handled in apiCall
            }
        });
    }
}

async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (20MB)
    if (file.size > 20 * 1024 * 1024) {
        showToast('O arquivo deve ter no máximo 20MB', 'error');
        return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        showToast('Formato de arquivo não suportado', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    try {
        const response = await fetch('/api/users/avatar', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${state.token}`
            },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Upload failed');
        }

        // Update avatar preview
        document.getElementById('settings-avatar-preview').src = data.avatar;
        
        // Update user state
        state.user.avatar = data.avatar;
        setupNavigation();

        showToast('Avatar atualizado com sucesso!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function loadAdminDashboard() {
    try {
        const data = await apiCall('/admin/dashboard');
        renderAdminDashboard(data);
    } catch (error) {
        console.error('Failed to load admin dashboard:', error);
    }
}

// ===== Render Functions =====
function renderSaveCards(saves, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (saves.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-400 py-8">
                <i class="fas fa-folder-open text-4xl mb-4"></i>
                <p>Nenhum save encontrado</p>
            </div>
        `;
        return;
    }

    container.innerHTML = saves.map(save => {
        const formattedDate = new Date(save.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'America/Sao_Paulo'
        });

        // Check if author has VIP tag
        const hasVipTag = save.user_tags && save.user_tags.some(tag => tag.name.toLowerCase().includes('vip'));
        const vipTag = hasVipTag ? save.user_tags.find(tag => tag.name.toLowerCase().includes('vip')) : null;
        const vipType = vipTag ? (vipTag.name.includes('Gold') ? 'gold' : vipTag.name.includes('Diamond') ? 'diamond' : vipTag.name.includes('EXTREME') ? 'extreme' : 'platinum') : '';

        return `
        <div class="save-card p-4 rounded-lg cursor-pointer" onclick="window.location.href='/saves/${save.id}'">
            <!-- Thumbnail -->
            <div class="w-full h-32 rounded-lg overflow-hidden mb-3 bg-gray-800">
                <img src="${save.thumbnail || save.game_cover || '/images/default-game-cover.jpg'}" alt="${save.title}" class="w-full h-full object-cover" onerror="this.src='/images/default-game-cover.jpg'">
            </div>

            <!-- Tags -->
            <div class="flex gap-2 mb-2">
                <span class="bg-green-500 text-white text-xs px-2 py-1 rounded font-semibold">${save.platform}</span>
            </div>

            <!-- Title -->
            <h3 class="font-bold text-white text-lg mb-1">${save.title}</h3>

            <!-- Game Name -->
            <p class="text-white/80 text-sm mb-2">${save.game_name}</p>

            <!-- Stats -->
            <div class="flex items-center gap-4 text-white/90 text-sm mb-2">
                <span class="flex items-center">
                    <i class="fas fa-star text-yellow-400 mr-1"></i>
                    ${typeof save.rating_avg === 'number' ? save.rating_avg.toFixed(1) : '0.0'}
                </span>
                <span class="flex items-center">
                    <i class="fas fa-download text-white mr-1"></i>
                    ${save.download_count || 0}
                </span>
                <span class="flex items-center">
                    <i class="fas fa-heart text-red-400 mr-1"></i>
                    ${save.favorites_count || 0}
                </span>
            </div>

            <!-- User Info -->
            <div class="flex items-center gap-2 text-white/70 text-sm">
                <span>By</span>
                <span class="font-semibold text-white username-glow ${hasVipTag ? `vip-${vipType}` : ''}">${save.username}</span>
            </div>
        </div>
    `}).join('');
}

function renderProfileSaveCards(saves, containerId, isOwnProfile = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (saves.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-400 py-12">
                <i class="fas fa-folder-open text-5xl mb-4 opacity-50"></i>
                <p class="text-lg">Nenhum save encontrado</p>
                ${isOwnProfile ? '<p class="text-sm mt-2">Comece compartilhando seus saves!</p>' : ''}
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            ${saves.map((save, index) => {
                const formattedDate = new Date(save.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    timeZone: 'America/Sao_Paulo'
                });

                return `
                <div class="profile-save-card-mini glass-card overflow-hidden group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:z-10" 
                     onclick="window.location.href='/saves/${save.id}'"
                     style="animation: fadeInUp 0.3s ease-out ${index * 0.05}s both;">
                    <!-- Thumbnail -->
                    <div class="relative aspect-square overflow-hidden">
                        <img src="${save.thumbnail || save.game_cover}" 
                             alt="${save.title}" 
                             class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110">
                        <div class="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-70"></div>
                        
                        <!-- Platform Badge -->
                        <div class="absolute top-2 right-2">
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold platform-badge ${getPlatformClass(save.platform)}">
                                ${save.platform}
                            </span>
                        </div>

                        <!-- Hover Overlay -->
                        <div class="absolute inset-0 bg-purple-600/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <i class="fas fa-eye text-white text-2xl"></i>
                        </div>
                    </div>

                    <!-- Content -->
                    <div class="p-2">
                        <!-- Title -->
                        <h3 class="font-bold text-white text-xs mb-1 truncate group-hover:text-purple-400 transition-colors">${save.title}</h3>
                        
                        <!-- Game Name -->
                        <p class="text-gray-400 text-[10px] mb-2 truncate">${save.game_name}</p>

                        <!-- Stats Row -->
                        <div class="flex items-center justify-between text-[10px]">
                            <div class="flex items-center gap-2">
                                <span class="flex items-center text-yellow-400">
                                    <i class="fas fa-star mr-0.5 text-[8px]"></i>
                                    ${typeof save.rating_avg === 'number' ? save.rating_avg.toFixed(1) : '0.0'}
                                </span>
                                <span class="flex items-center text-gray-400">
                                    <i class="fas fa-download mr-0.5 text-[8px]"></i>
                                    ${save.download_count || 0}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            `}).join('')}
        </div>
    `;
}

function getPlatformClass(platform) {
    const classes = {
        'PC': 'bg-blue-500/20 text-blue-400 border border-blue-500/40',
        'PlayStation': 'bg-blue-600/20 text-blue-500 border border-blue-600/40',
        'Xbox': 'bg-green-500/20 text-green-400 border border-green-500/40',
        'Nintendo': 'bg-red-500/20 text-red-400 border border-red-500/40'
    };
    return classes[platform] || 'bg-gray-500/20 text-gray-400 border border-gray-500/40';
}

function renderGameCards(games, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (games.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-400 col-span-full py-8">
                <p>Nenhum jogo encontrado</p>
            </div>
        `;
        return;
    }

    container.innerHTML = games.map(game => `
        <div class="glass-card p-3 text-center cursor-pointer hover:border-purple-500" onclick="filterByGame(${game.id})">
            <div class="aspect-square overflow-hidden rounded-lg mb-2">
                <img src="${game.cover_image || '/save.game_cover'}" alt="${game.name}" class="w-full h-full object-cover">
            </div>
            <h3 class="font-semibold text-xs truncate">${game.name}</h3>
        </div>
    `).join('');
}

function renderSaveDetails(save) {
    const container = document.getElementById('save-details');
    if (!container) {
        console.error('Container save-details not found');
        return;
    }

    console.log('Rendering save details:', save);
    console.log('Save images:', save.images);

    const isOnline = save.is_online === 1;
    const lastSeenText = isOnline ? 'Online agora' : getLastSeenText(save.last_seen);

    // Check if author has VIP tag
    const hasVipTag = save.user_tags && save.user_tags.some(tag => tag.name.toLowerCase().includes('vip'));
    const vipTag = hasVipTag ? save.user_tags.find(tag => tag.name.toLowerCase().includes('vip')) : null;
    const vipType = vipTag ? (vipTag.name.includes('Gold') ? 'gold' : vipTag.name.includes('Diamond') ? 'diamond' : vipTag.name.includes('EXTREME') ? 'extreme' : 'platinum') : '';

    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div class="lg:col-span-2">
                <div class="glass-card p-3 mb-4">
                    <div class="aspect-[16/9] overflow-hidden rounded-lg mb-3 relative" id="carousel-${save.id}">
                        ${save.images && save.images.length > 0 ? `
                        <div class="carousel-container relative w-full h-full" data-save-id="${save.id}" data-current-index="0" data-autoplay="true">
                            ${save.images.map((img, index) => `
                            <div class="carousel-slide absolute inset-0 transition-opacity duration-500 ${index === 0 ? 'opacity-100' : 'opacity-0'}" data-index="${index}">
                                <img src="${img.image_path}" alt="${save.title}" class="w-full h-full object-cover">
                            </div>
                            `).join('')}
                            <button class="carousel-nav-btn absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors z-10" onclick="carouselPrev(${save.id}, event)">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <button class="carousel-nav-btn absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors z-10" onclick="carouselNext(${save.id}, event)">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                            <div class="carousel-indicators absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                                ${save.images.map((_, index) => `
                                <button class="carousel-indicator w-2 h-2 rounded-full ${index === 0 ? 'bg-white' : 'bg-white/50'} transition-colors" onclick="carouselGoTo(${save.id}, ${index}, event)"></button>
                                `).join('')}
                            </div>
                        </div>
                        ` : `
                        <div class="w-full h-full">
                            <img src="${save.thumbnail ? '/' + save.thumbnail : save.game_cover || '/save.game_cover'}" alt="${save.title}" class="w-full h-full object-cover">
                        </div>
                        `}
                        ${state.user && state.user.id === save.user_id ? `
                        <button onclick="openEditImageModal(${save.id})" class="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white px-3 py-1.5 rounded-lg text-xs transition-colors z-20">
                            <i class="fas fa-edit mr-1"></i> Editar Imagens
                        </button>
                        ` : ''}
                    </div>

                    <h1 class="text-xl font-bold mb-2 font-['Space_Grotesk'] gradient-text">${save.title}</h1>

                    <div class="flex flex-wrap gap-2 mb-2">
                        <span class="badge badge-purple text-xs">${save.game_name}</span>
                        <span class="badge badge-cyan text-xs">${save.platform}</span>
                        ${save.category ? `<span class="badge badge-green text-xs">${save.category}</span>` : ''}
                    </div>

                    <p class="text-gray-300 text-sm mb-3">${save.description || 'Sem descrição'}</p>

                    <div class="flex items-center gap-3 mb-3 text-xs">
                        <span><i class="fas fa-download mr-1 text-purple-400"></i> ${save.download_count || 0}</span>
                        <span><i class="fas fa-eye mr-1 text-cyan-400"></i> ${save.view_count || 0}</span>
                        <span><i class="fas fa-star mr-1 text-yellow-400"></i> ${typeof save.rating_avg === 'number' ? save.rating_avg.toFixed(1) : '0.0'} (${save.rating_count || 0})</span>
                    </div>

                    ${state.user ? `
                        <button onclick="downloadSave(${save.id})" class="btn-primary w-full mb-3 text-sm">
                            <i class="fas fa-download mr-1.5"></i> Download
                        </button>
                    ` : `
                        <button onclick="showLoginRequiredMessage()" class="btn-primary w-full mb-3 text-sm opacity-75 cursor-not-allowed">
                            <i class="fas fa-lock mr-1.5"></i> Faça login para baixar
                        </button>
                    `}

                    ${state.user ? `
                        <div class="flex gap-2">
                            <button onclick="toggleFavorite(${save.id})" class="btn-secondary flex-1 text-xs">
                                <i class="fas fa-heart mr-1 ${save.isFavorited ? 'text-red-400' : ''}"></i>
                                ${save.isFavorited ? 'Favorito' : 'Favoritar'}
                            </button>
                            <button onclick="openRatingModal(${save.id})" class="btn-secondary flex-1 text-xs">
                                <i class="fas fa-star mr-1"></i> Avaliar
                            </button>
                        </div>
                    ` : `
                        <div class="flex gap-2">
                            <button onclick="showLoginRequiredMessage()" class="btn-secondary flex-1 text-xs opacity-50 cursor-not-allowed">
                                <i class="fas fa-heart mr-1"></i> Favoritar
                            </button>
                            <button onclick="showLoginRequiredMessage()" class="btn-secondary flex-1 text-xs opacity-50 cursor-not-allowed">
                                <i class="fas fa-star mr-1"></i> Avaliar
                            </button>
                        </div>
                    `}
                </div>

                <!-- Ad Space in Save Details -->
                <div class="my-4">
                    <div class="ad-placeholder bg-gray-700 rounded-lg flex items-center justify-center min-h-[250px]">
                        <span class="text-gray-400 text-sm">Espaço para anúncio - Google AdSense / Ads</span>
                    </div>
                </div>

                <!-- Comments -->
                <div class="glass-card p-4">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-sm font-bold">Comentários (${save.comments.length})</h2>
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-gray-400">Ordenar por:</span>
                            <select onchange="sortComments(this.value)" class="bg-gray-800 text-xs text-white px-2 py-1 rounded border border-gray-700">
                                <option value="recent">Mais recentes</option>
                                <option value="popular">Mais curtidos</option>
                            </select>
                        </div>
                    </div>

                    ${state.user ? `
                        <form onsubmit="addComment(event, ${save.id})" class="mb-4 comment-form">
                            <div class="flex gap-3">
                                <img src="${state.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(state.user.username)}&background=8b5cf6&color=fff&size=200&bold=true`}" alt="${state.user.username}" class="avatar w-10 h-10" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(state.user.username)}&background=8b5cf6&color=fff&size=200&bold=true'">
                                <div class="flex-1">
                                    <textarea name="content" rows="3" class="input-field mb-2 text-sm" placeholder="Escreva um comentário..." required></textarea>
                                    <div class="flex justify-end">
                                        <button type="submit" class="btn-primary text-sm">
                                            <i class="fas fa-paper-plane mr-2"></i>Enviar Comentário
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    ` : `
                        <div class="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                            <p class="text-center text-gray-400 text-sm">
                                <i class="fas fa-lock mr-2"></i>
                                <a href="/login" class="text-purple-400 hover:text-purple-300">Faça login</a> ou <a href="/register" class="text-purple-400 hover:text-purple-300">registre-se</a> para comentar
                            </p>
                        </div>
                    `}

                    <div id="comments-container" class="space-y-4">
                        ${save.comments.map(comment => renderComment(comment, state.user)).join('')}
                    </div>
                </div>
            </div>

            <!-- Sidebar -->
            <div>
                <div class="glass-card p-4 mb-4 ${hasVipTag ? `vip-${vipType}` : ''}">
                    <h3 class="font-bold mb-3 text-sm">Autor</h3>
                    <div class="flex items-center gap-3 mb-3">
                        <div class="relative">
                            <img src="${save.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(save.username)}&background=8b5cf6&color=fff&size=200&bold=true`}" alt="${save.username}"
                                 class="avatar w-12 h-12 ${hasVipTag ? `vip-${vipType}` : ''}"
                                 style="${hasVipTag ? `border: 2px solid ${vipTag.color}; box-shadow: 0 0 15px ${vipTag.color}80, 0 0 30px ${vipTag.color}40;` : ''}"
                                 onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(save.username)}&background=8b5cf6&color=fff&size=200&bold=true'">
                            <div class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${isOnline ? 'bg-green-500' : 'bg-gray-500'}"></div>
                        </div>
                        <div>
                            <div class="username-glow-wrapper">
                                <div class="username-particles" data-color="${hasVipTag ? vipTag.color : '#8b5cf6'}"></div>
                                <a href="/profile/${save.user_id}"
                                   class="font-semibold hover:text-purple-400 text-sm username-glow ${hasVipTag ? `vip-${vipType}` : ''}"
                                   style="${hasVipTag ? `color: ${vipTag.color}; text-shadow: 0 0 10px ${vipTag.color}80, 0 0 20px ${vipTag.color}60, 0 0 30px ${vipTag.color}40;` : ''}">${save.username}</a>
                            </div>
                            <p class="text-gray-400 text-xs">${lastSeenText}</p>
                        </div>
                    </div>
                    ${save.user_tags && save.user_tags.length > 0 ? `
                        <div class="flex flex-wrap gap-1 mt-2">
                            ${save.user_tags.map(tag => {
                                const isVip = tag.name.toLowerCase().includes('vip');
                                const tagVipType = isVip ? (tag.name.includes('Gold') ? 'gold' : tag.name.includes('Diamond') ? 'diamond' : tag.name.includes('EXTREME') ? 'extreme' : 'platinum') : '';
                                return `
                                <span class="text-xs px-2 py-1 rounded-full cursor-help tag-badge-animated ${isVip ? `vip-tag-${tagVipType}` : ''}"
                                      style="background: ${tag.color}; color: #fff; border: 1px solid ${tag.color}; box-shadow: 0 0 10px ${tag.color}60;"
                                      title="${tag.description || ''}">
                                    <i class="fas fa-${tag.icon || 'tag'} mr-1"></i>${tag.name}
                                </span>
                                `;
                            }).join('')}
                        </div>
                    ` : ''}
                </div>

                <div class="glass-card p-4">
                    <h3 class="font-bold mb-3 text-sm">Estatísticas</h3>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Downloads</span>
                            <span class="font-semibold">${save.download_count}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Visualizações</span>
                            <span class="font-semibold">${save.view_count}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Favoritos</span>
                            <span class="font-semibold">${save.favorites_count}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Avaliação</span>
                            <span class="font-semibold">${typeof save.rating_avg === 'number' ? save.rating_avg.toFixed(1) : '0.0'}/5</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Initialize carousels
    setTimeout(() => initCarousels(), 100);

    // Reinitialize username particles
    setTimeout(() => createUsernameParticles(state.user.tagType, state.user.tagColor), 200);

    // Create comment username particles
    setTimeout(() => createCommentUsernameParticles(), 300);

    // Initialize comment card mouse effect
    setTimeout(() => initCommentCardMouseEffect(), 400);
}

function getLastSeenText(lastSeen) {
    if (!lastSeen) return 'Nunca visto';
    const now = new Date();
    const last = new Date(lastSeen);
    const diffMs = now - last;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSeconds < 60) {
        if (diffSeconds < 10) return 'Online agora';
        return `Online há ${diffSeconds} segundo${diffSeconds !== 1 ? 's' : ''} atrás`;
    }
    if (diffMins < 60) {
        return `Online há ${diffMins} minuto${diffMins !== 1 ? 's' : ''} atrás`;
    }
    if (diffHours < 24) {
        return `Online há ${diffHours} hora${diffHours !== 1 ? 's' : ''} atrás`;
    }
    if (diffDays < 7) {
        return `Online há ${diffDays} dia${diffDays !== 1 ? 's' : ''} atrás`;
    }
    if (diffWeeks < 4) {
        return `Online há ${diffWeeks} semana${diffWeeks !== 1 ? 's' : ''} atrás`;
    }
    if (diffMonths < 12) {
        return `Online há ${diffMonths} mês${diffMonths !== 1 ? 'es' : ''} atrás`;
    }
    if (diffYears === 1) {
        return `Online há 1 ano atrás`;
    }
    return `Online há ${diffYears} anos atrás`;
}

function renderProfile(user) {
    // Try both container IDs
    let container = document.getElementById('profile-content');
    if (!container) {
        container = document.getElementById('user-profile-content');
    }
    if (!container) return;

    const isOnline = user.is_online === 1 || user.is_online === true;
    const lastSeenText = isOnline ? 'Online agora' : getLastSeenText(user.last_seen);

    // Check if user has any tag - use first tag for styling
    const userTags = user.tags || user.user_tags || [];
    const hasTag = userTags && userTags.length > 0;
    const mainTag = hasTag ? userTags[0] : null; // Use first tag for styling
    const tagColor = mainTag ? mainTag.color : null;
    const tagName = mainTag ? mainTag.name.toLowerCase() : '';
    const tagType = tagName.includes('Gold') ? 'gold' : tagName.includes('Diamond') ? 'diamond' : tagName.includes('EXTREME') ? 'extreme' : tagName.includes('Ruby') ? 'ruby' : tagName.includes('Platinum') ? 'platinum' : 'standard';

    container.innerHTML = `
        <div class="profile-container">
            <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <!-- Discord-style Profile Card (Left Sidebar) -->
                <div class="lg:col-span-1">
                    <div class="discord-profile-card glass-card overflow-hidden ${hasTag ? `vip-${tagType}` : ''}" id="profile-card" style="${hasTag ? `border-color: ${tagColor}; box-shadow: 0 10px 30px ${tagColor}30;` : ''}">
                        <!-- Banner -->
                        <div class="profile-banner h-24 relative ${hasTag ? `vip-${tagType}` : ''}">
                            <div class="particles-mini" id="profile-particles"></div>
                            <!-- Status Badge (Top Right) -->
                            <div class="absolute top-2 right-2">
                                <div class="inline-flex items-center px-2 py-1 rounded-full ${isOnline ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'} status-badge">
                                    <i class="fas fa-${isOnline ? 'circle' : 'clock'} mr-1 ${isOnline ? 'animate-pulse' : ''} text-xs"></i>
                                    <span class="text-xs">${lastSeenText}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Avatar Section -->
                        <div class="px-4 pb-4">
                            <div class="relative -mt-12 mb-3 flex justify-center">
                                <div class="relative">
                                    <div class="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full blur-xl opacity-50 profile-avatar-glow ${hasTag ? `vip-${tagType}` : ''}" style="${hasTag ? `background: linear-gradient(to right, ${tagColor}, ${tagColor});` : ''}"></div>
                                    <img src="${user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=8b5cf6&color=fff&size=200&bold=true`}" alt="${user.username}"
                                         class="relative w-24 h-24 rounded-full object-cover border-4 border-gray-900 profile-avatar cursor-pointer ${hasTag ? `vip-${tagType}` : ''}"
                                         style="${hasTag ? `border-color: ${tagColor}; box-shadow: 0 0 20px ${tagColor}60;` : ''}"
                                         onclick="window.location.href='/settings'">

                                    <!-- Online Status Indicator -->
                                    <div class="absolute bottom-0 right-0 -translate-x-1">
                                        <div class="relative">
                                            <div class="w-4 h-4 rounded-full border-2 border-gray-900 ${isOnline ? 'bg-green-500' : 'bg-gray-500'}"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Username -->
                            <div class="text-center mb-3 relative">
                                <div class="username-glow-wrapper">
                                    <div class="username-particles" id="profile-username-particles"></div>
                                    <h1 class="text-xl font-bold font-['Space_Grotesk'] mb-1 username-display ${hasTag ? `username-glow vip-${tagType}` : 'gradient-text username-glow'}" style="${hasTag ? `color: ${tagColor}; text-shadow: 0 0 10px ${tagColor}80, 0 0 20px ${tagColor}60, 0 0 30px ${tagColor}40;` : ''}">${user.username}</h1>
                                </div>
                            </div>

                            <!-- Bio -->
                            ${user.bio ? `
                            <div class="text-center mb-4">
                                <p class="text-sm italic profile-bio ${hasTag ? `vip-${tagType}` : ''}" style="${hasTag ? `color: ${tagColor}; text-shadow: 0 0 10px ${tagColor}80;` : 'color: #9ca3af;'}">"${user.bio}"</p>
                            </div>
                            ` : ''}

                            <!-- Birth Date -->
                            ${user.birth_date ? `
                            <div class="text-center mb-3 text-xs ${hasTag ? `vip-text-${tagType}` : ''}" style="${hasTag ? `color: ${tagColor};` : 'color: #6b7280;'}">
                                <i class="fas fa-birthday-cake mr-1 ${hasTag ? `vip-icon-${tagType}` : ''}" style="${hasTag ? `color: ${tagColor}; text-shadow: 0 0 10px ${tagColor}80;` : 'color: #a78bfa;'}"></i>
                                Nascido em ${new Date(user.birth_date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                            </div>
                            ` : ''}

                            <!-- Member Since -->
                            <div class="text-center mb-4 text-xs ${hasTag ? `vip-text-${tagType}` : ''}" style="${hasTag ? `color: ${tagColor};` : 'color: #6b7280;'}">
                                <i class="fas fa-calendar-alt mr-1 ${hasTag ? `vip-icon-${tagType}` : ''}" style="${hasTag ? `color: ${tagColor}; text-shadow: 0 0 10px ${tagColor}80;` : 'color: #a78bfa;'}"></i>
                                Membro desde ${new Date(user.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                            </div>

                            <!-- VIP Tags with Special Effects -->
                            ${userTags && userTags.length > 0 ? `
                            <div class="profile-tags">
                                <h3 class="text-xs font-semibold mb-2 uppercase tracking-wider ${hasTag ? `vip-text-${tagType}` : ''}" style="${hasTag ? `color: ${tagColor}; text-shadow: 0 0 10px ${tagColor}80;` : 'color: #9ca3af;'}">Tags</h3>
                                <div class="flex flex-wrap gap-2 justify-center">
                                    ${userTags.map((tag, index) => {
                                        const isVip = tag.name.toLowerCase().includes('vip');
                                        const tagVipType = isVip ? (tag.name.includes('Gold') ? 'gold' : tag.name.includes('Diamond') ? 'diamond' : tag.name.includes('EXTREME') ? 'extreme' : tag.name.includes('Ruby') ? 'ruby' : 'platinum') : '';
                                        return `
                                        <span class="tag-badge-animated px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer ${isVip ? `vip-tag-${tagVipType}` : ''}"
                                              style="background: ${tag.color}; color: #fff; border: 1px solid ${tag.color}; box-shadow: 0 0 10px ${tag.color}60; animation-delay: ${index * 0.1}s;"
                                              title="${tag.description || ''}"
                                              data-tag-id="${tag.id}"
                                              data-is-vip="${isVip}"
                                              data-vip-type="${tagVipType}"
                                              data-tag-name="${tag.name}"
                                              data-tag-color="${tag.color}"
                                              onclick="handleTagClick(this)">
                                            <i class="fas fa-${tag.icon || 'tag'} mr-1"></i>${tag.name}
                                        </span>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                            ` : ''}
                        </div>

                        <!-- Stats Section -->
                        <div class="px-4 pb-4 pt-3 border-t border-gray-700/50">
                            <div class="grid grid-cols-2 gap-2 text-center">
                                <div class="profile-stat-item">
                                    <div class="text-lg font-bold stat-number ${hasTag ? `vip-stat-${tagType}` : 'gradient-text'}" style="${hasTag ? `color: ${tagColor}; text-shadow: 0 0 15px ${tagColor}80, 0 0 30px ${tagColor}60;` : ''}">${user.saves_count || 0}</div>
                                    <div class="text-xs ${hasTag ? `vip-text-${tagType}` : ''}" style="${hasTag ? `color: ${tagColor}; text-shadow: 0 0 10px ${tagColor}60;` : 'color: #9ca3af;'}">Saves</div>
                                </div>
                                <div class="profile-stat-item">
                                    <div class="text-lg font-bold stat-number ${hasTag ? `vip-stat-${tagType}` : 'gradient-text'}" style="${hasTag ? `color: ${tagColor}; text-shadow: 0 0 15px ${tagColor}80, 0 0 30px ${tagColor}60;` : ''}">${user.favorites_count || 0}</div>
                                    <div class="text-xs ${hasTag ? `vip-text-${tagType}` : ''}" style="${hasTag ? `color: ${tagColor}; text-shadow: 0 0 10px ${tagColor}60;` : 'color: #9ca3af;'}">Favoritos</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Main Content Area (Right Side) -->
                <div class="lg:col-span-3">
                    <div class="glass-card p-4">
                        <!-- Tab Navigation -->
                        <div class="flex gap-2 mb-4 border-b border-gray-700/50 pb-3">
                            <button onclick="loadUserTab('saves')" class="profile-tab-btn active text-sm px-4 py-2" id="tab-saves">
                                <i class="fas fa-save mr-2"></i> Meus Saves
                            </button>
                            <button onclick="loadUserTab('favorites')" class="profile-tab-btn text-sm px-4 py-2" id="tab-favorites">
                                <i class="fas fa-heart mr-2"></i> Favoritos
                            </button>
                        </div>
                        
                        <!-- Tab Content -->
                        <div id="user-tab-content">
                            <div class="text-center text-gray-400 py-8">
                                <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                                <p>Carregando...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Create mini particles for profile card
    createProfileParticles();

    // Create username particles with user's tag type and color
    createUsernameParticles(tagType, tagColor);

    // Create comment username particles
    createCommentUsernameParticles();

    // Load user tab
    loadUserTab('saves');
}

function renderUserProfile(user) {
    const container = document.getElementById('user-profile-content');
    if (!container) return;

    const isOnline = user.is_online === 1 || user.is_online === true;
    const lastSeenText = isOnline ? 'Online agora' : getLastSeenText(user.last_seen);

    // Check if user has any tag - use first tag for styling
    const userTags = user.tags || user.user_tags || [];
    const hasTag = userTags && userTags.length > 0;
    const mainTag = hasTag ? userTags[0] : null; // Use first tag for styling
    const tagColor = mainTag ? mainTag.color : null;
    const tagName = mainTag ? mainTag.name.toLowerCase() : '';
    const tagType = tagName.includes('Gold') ? 'gold' : tagName.includes('Diamond') ? 'diamond' : tagName.includes('EXTREME') ? 'extreme' : tagName.includes('Ruby') ? 'ruby' : tagName.includes('Platinum') ? 'platinum' : 'standard';

    container.innerHTML = `
        <div class="profile-container">
            <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <!-- Discord-style Profile Card (Left Sidebar) -->
                <div class="lg:col-span-1">
                    <div class="discord-profile-card glass-card overflow-hidden ${hasTag ? `vip-${tagType}` : ''}" id="profile-card" style="${hasTag ? `border-color: ${tagColor}; box-shadow: 0 10px 30px ${tagColor}30;` : ''}">
                        <!-- Banner -->
                        <div class="profile-banner h-24 relative ${hasTag ? `vip-${tagType}` : ''}">
                            <div class="particles-mini" id="profile-particles"></div>
                            <!-- Status Badge (Top Right) -->
                            <div class="absolute top-2 right-2">
                                <div class="inline-flex items-center px-2 py-1 rounded-full ${isOnline ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'} status-badge">
                                    <i class="fas fa-${isOnline ? 'circle' : 'clock'} mr-1 ${isOnline ? 'animate-pulse' : ''} text-xs"></i>
                                    <span class="text-xs">${lastSeenText}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Avatar Section -->
                        <div class="px-4 pb-4 relative">
                            <div class="relative -mt-12 mb-3">
                                <div class="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full blur-xl opacity-50 profile-avatar-glow ${hasTag ? `vip-${tagType}` : ''}" style="${hasTag ? `background: linear-gradient(to right, ${tagColor}, ${tagColor});` : ''}"></div>
                                <img src="${user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=8b5cf6&color=fff&size=200&bold=true`}" alt="${user.username}"
                                     class="relative w-24 h-24 rounded-full object-cover border-4 border-gray-900 profile-avatar ${hasTag ? `vip-${tagType}` : ''}"
                                     style="${hasTag ? `border-color: ${tagColor}; box-shadow: 0 0 20px ${tagColor}60;` : ''}">

                                <!-- Online Status Indicator -->
                                <div class="absolute bottom-0 right-0">
                                    <div class="relative">
                                        <div class="w-4 h-4 rounded-full border-2 border-gray-900 ${isOnline ? 'bg-green-500' : 'bg-gray-500'}"></div>
                                    </div>
                                </div>
                            </div>

                            <!-- Username -->
                            <div class="text-center mb-3 relative">
                                <div class="username-glow-wrapper">
                                    <div class="username-particles" id="profile-username-particles"></div>
                                    <h1 class="text-xl font-bold font-['Space_Grotesk'] mb-1 username-display ${hasTag ? `username-glow vip-${tagType}` : 'gradient-text username-glow'}" style="${hasTag ? `color: ${tagColor}; text-shadow: 0 0 10px ${tagColor}80, 0 0 20px ${tagColor}60, 0 0 30px ${tagColor}40;` : ''}">${user.username}</h1>
                                </div>
                            </div>

                            <!-- Bio -->
                            ${user.bio ? `
                            <div class="text-center mb-4">
                                <p class="text-sm italic profile-bio ${hasTag ? `vip-${tagType}` : ''}" style="${hasTag ? `color: ${tagColor}; text-shadow: 0 0 10px ${tagColor}80;` : 'color: #9ca3af;'}">"${user.bio}"</p>
                            </div>
                            ` : ''}

                            <!-- Birth Date -->
                            ${user.birth_date ? `
                            <div class="text-center mb-3 text-xs ${hasTag ? `vip-text-${tagType}` : ''}" style="${hasTag ? `color: ${tagColor};` : 'color: #6b7280;'}">
                                <i class="fas fa-birthday-cake mr-1 ${hasTag ? `vip-icon-${tagType}` : ''}" style="${hasTag ? `color: ${tagColor}; text-shadow: 0 0 10px ${tagColor}80;` : 'color: #a78bfa;'}"></i>
                                Nascido em ${new Date(user.birth_date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                            </div>
                            ` : ''}

                            <!-- Member Since -->
                            <div class="text-center mb-4 text-xs ${hasTag ? `vip-text-${tagType}` : ''}" style="${hasTag ? `color: ${tagColor};` : 'color: #6b7280;'}">
                                <i class="fas fa-calendar-alt mr-1 ${hasTag ? `vip-icon-${tagType}` : ''}" style="${hasTag ? `color: ${tagColor}; text-shadow: 0 0 10px ${tagColor}80;` : 'color: #a78bfa;'}"></i>
                                Membro desde ${new Date(user.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                            </div>

                            <!-- VIP Tags with Special Effects -->
                            ${userTags && userTags.length > 0 ? `
                            <div class="profile-tags">
                                <h3 class="text-xs font-semibold mb-2 uppercase tracking-wider ${hasTag ? `vip-text-${tagType}` : ''}" style="${hasTag ? `color: ${tagColor}; text-shadow: 0 0 10px ${tagColor}80;` : 'color: #9ca3af;'}">Tags</h3>
                                <div class="flex flex-wrap gap-2 justify-center">
                                    ${userTags.map((tag, index) => {
                                        const isVip = tag.name.toLowerCase().includes('vip');
                                        const tagVipType = isVip ? (tag.name.includes('Gold') ? 'gold' : tag.name.includes('Diamond') ? 'diamond' : tag.name.includes('EXTREME') ? 'extreme' : tag.name.includes('Ruby') ? 'ruby' : 'platinum') : '';
                                        return `
                                        <span class="tag-badge-animated px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer ${isVip ? `vip-tag-${tagVipType}` : ''}"
                                              style="background: ${tag.color}; color: #fff; border: 1px solid ${tag.color}; box-shadow: 0 0 10px ${tag.color}60; animation-delay: ${index * 0.1}s;"
                                              title="${tag.description || ''}"
                                              data-tag-id="${tag.id}"
                                              data-is-vip="${isVip}"
                                              data-vip-type="${tagVipType}"
                                              data-tag-name="${tag.name}"
                                              data-tag-color="${tag.color}"
                                              onclick="handleTagClick(this)">
                                            <i class="fas fa-${tag.icon || 'tag'} mr-1"></i>${tag.name}
                                        </span>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                            ` : ''}
                        </div>

                        <!-- Stats Section -->
                        <div class="px-4 pb-4 pt-3 border-t border-gray-700/50">
                            <div class="grid grid-cols-2 gap-2 text-center">
                                <div class="profile-stat-item">
                                    <div class="text-lg font-bold stat-number ${hasTag ? `vip-stat-${tagType}` : 'gradient-text'}" style="${hasTag ? `color: ${tagColor}; text-shadow: 0 0 15px ${tagColor}80, 0 0 30px ${tagColor}60;` : ''}">${user.saves_count || 0}</div>
                                    <div class="text-xs ${hasTag ? `vip-text-${tagType}` : ''}" style="${hasTag ? `color: ${tagColor}; text-shadow: 0 0 10px ${tagColor}60;` : 'color: #9ca3af;'}">Saves</div>
                                </div>
                                <div class="profile-stat-item">
                                    <div class="text-lg font-bold stat-number ${hasTag ? `vip-stat-${tagType}` : 'gradient-text'}" style="${hasTag ? `color: ${tagColor}; text-shadow: 0 0 15px ${tagColor}80, 0 0 30px ${tagColor}60;` : ''}">${user.favorites_count || 0}</div>
                                    <div class="text-xs ${hasTag ? `vip-text-${tagType}` : ''}" style="${hasTag ? `color: ${tagColor}; text-shadow: 0 0 10px ${tagColor}60;` : 'color: #9ca3af;'}">Favoritos</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Main Content Area (Right Side) -->
                <div class="lg:col-span-3">
                    <div class="glass-card p-4">
                        <!-- Tab Navigation -->
                        <div class="flex gap-2 mb-4 border-b border-gray-700/50 pb-3">
                            <button onclick="loadUserTab('saves')" class="profile-tab-btn active text-sm px-4 py-2" id="tab-saves">
                                <i class="fas fa-save mr-2"></i> Saves
                            </button>
                            <button onclick="loadUserTab('favorites')" class="profile-tab-btn text-sm px-4 py-2" id="tab-favorites">
                                <i class="fas fa-heart mr-2"></i> Favoritos
                            </button>
                        </div>
                        
                        <!-- Tab Content -->
                        <div id="user-tab-content">
                            <div class="text-center text-gray-400 py-8">
                                <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                                <p>Carregando...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Create mini particles for profile card
    createProfileParticles();

    // Create username particles with user's tag type and color
    createUsernameParticles(tagType, tagColor);

    // Create comment username particles
    createCommentUsernameParticles();

    // Load user tab
    loadUserTab('saves');
}

function renderAdminDashboard(data) {
    const container = document.getElementById('admin-content');
    if (!container) return;

    container.innerHTML = `
        <!-- Compact Stats Row -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div class="glass-card p-4 cursor-pointer hover:border-purple-500 transition-all" onclick="window.location.href='/admin/saves/all'">
                <div class="text-2xl font-bold gradient-text">${data.stats.total_saves}</div>
                <div class="text-gray-400 text-xs">Total Saves</div>
            </div>
            <div class="glass-card p-4 cursor-pointer hover:border-purple-500 transition-all" onclick="window.location.href='/admin/saves'">
                <div class="text-2xl font-bold text-yellow-400">${data.stats.pending_saves}</div>
                <div class="text-gray-400 text-xs">Pendentes</div>
            </div>
            <div class="glass-card p-4 cursor-pointer hover:border-purple-500 transition-all" onclick="window.location.href='/admin/users'">
                <div class="text-2xl font-bold gradient-text">${data.stats.total_users}</div>
                <div class="text-gray-400 text-xs">Usuários</div>
            </div>
            <div class="glass-card p-4 cursor-pointer hover:border-purple-500 transition-all" onclick="window.location.href='/admin/users'">
                <div class="text-2xl font-bold gradient-text">${data.stats.total_downloads}</div>
                <div class="text-gray-400 text-xs">Downloads</div>
            </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="glass-card p-3 mb-6">
            <div class="flex gap-1 border-b border-gray-700/50 pb-2">
                <a href="/admin" class="admin-nav-link text-xs px-3 py-1.5 text-purple-400 border-b-2 border-purple-400">
                    <i class="fas fa-home mr-1"></i>Dashboard
                </a>
                <a href="/admin/saves" class="admin-nav-link text-xs px-3 py-1.5 text-gray-400 hover:text-purple-400 transition-colors">
                    <i class="fas fa-clock mr-1"></i>Pendentes
                </a>
                <a href="/admin/saves/all" class="admin-nav-link text-xs px-3 py-1.5 text-gray-400 hover:text-purple-400 transition-colors">
                    <i class="fas fa-database mr-1"></i>Todos
                </a>
                <a href="/admin/games" class="admin-nav-link text-xs px-3 py-1.5 text-gray-400 hover:text-purple-400 transition-colors">
                    <i class="fas fa-gamepad mr-1"></i>Jogos
                </a>
                <a href="/admin/tags" class="admin-nav-link text-xs px-3 py-1.5 text-gray-400 hover:text-purple-400 transition-colors">
                    <i class="fas fa-tags mr-1"></i>Tags
                </a>
                <a href="/admin/users" class="admin-nav-link text-xs px-3 py-1.5 text-gray-400 hover:text-purple-400 transition-colors">
                    <i class="fas fa-users mr-1"></i>Usuários
                </a>
            </div>
        </div>

        <!-- Main Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Pending Saves -->
            <div class="glass-card p-4">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="font-bold text-sm">
                        <i class="fas fa-clock text-yellow-400 mr-2"></i>Saves Pendentes
                    </h3>
                    <span class="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full">${data.stats.pending_saves}</span>
                </div>
                <div id="dashboard-pending-saves" class="space-y-2">
                    <p class="text-gray-400 text-xs text-center py-4">Carregando...</p>
                </div>
            </div>

            <!-- Recent Activity -->
            <div class="glass-card p-4">
                <h3 class="font-bold text-sm mb-4">
                    <i class="fas fa-history text-purple-400 mr-2"></i>Atividade Recente
                </h3>
                <div id="activity-list" class="space-y-2 max-h-80 overflow-y-auto">
                    ${data.activity.length === 0 ? `
                        <p class="text-gray-400 text-xs text-center py-4">Nenhuma atividade recente</p>
                    ` : data.activity.map(item => `
                        <div class="flex items-start gap-3 py-2 border-b border-gray-700/50 last:border-0 hover:bg-purple-500/10 transition-colors rounded-lg px-2 -mx-2 cursor-pointer"
                             onclick="${item.type === 'comment' ? `window.location.href='/saves/${item.save_id}#comment-${item.id}'` : item.type === 'save' ? `window.location.href='/admin/saves'` : item.type === 'username_change' ? `window.location.href='/profile/${item.save_id}'` : `window.location.href='/admin/reports'`}">
                            <div class="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <i class="fas fa-${item.type === 'comment' ? 'comment' : item.type === 'save' ? 'save' : item.type === 'username_change' ? 'user-edit' : 'flag'} text-purple-400 text-xs"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-xs font-medium ${item.type === 'comment' ? 'text-purple-300' : item.type === 'username_change' ? 'text-yellow-300' : ''}">${item.type === 'comment' ? 'Novo comentário' : item.type === 'save' ? 'Save pendente' : item.type === 'username_change' ? 'Alteração de nome' : 'Nova denúncia'}</p>
                                ${item.type === 'comment' ? `
                                    <p class="text-gray-300 text-xs truncate mt-1">"${item.title}"</p>
                                    <p class="text-gray-400 text-[10px] mt-1">em: ${item.save_title}</p>
                                ` : item.type === 'username_change' ? `
                                    <p class="text-gray-300 text-xs truncate mt-1">Mudou para: "${item.save_title}"</p>
                                ` : `
                                    <p class="text-gray-300 text-xs truncate mt-1">${item.title}</p>
                                `}
                                <p class="text-gray-400 text-[10px] mt-1">${item.username} • ${getTimeAgo(item.created_at)}</p>
                            </div>
                            <i class="fas fa-external-link-alt text-gray-500 text-xs flex-shrink-0 mt-1"></i>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    // Load pending saves for dashboard
    loadDashboardPendingSaves();
}



async function handleGameSubmit(e) {
    e.preventDefault();

    const gameId = document.getElementById('game-id').value;
    const name = document.getElementById('game-name').value;
    const platform = document.getElementById('game-platform').value;
    const cover_image = document.getElementById('game-cover').value;
    const description = document.getElementById('game-description').value;

    try {
        if (gameId) {
            // Update existing game
            await apiCall(`/api/admin/games/${gameId}`, {
                method: 'PUT',
                body: JSON.stringify({ name, platform, cover_image, description })
            });
            showToast('Jogo atualizado com sucesso!', 'success');
        } else {
            // Create new game
            await apiCall('/admin/games', {
                method: 'POST',
                body: JSON.stringify({ name, platform, cover_image, description })
            });
            showToast('Jogo criado com sucesso!', 'success');
        }

        resetGameForm();
        loadAdminGames();
    } catch (error) {
        showToast('Erro ao salvar jogo', 'error');
    }
}

function resetGameForm() {
    document.getElementById('game-form').reset();
    document.getElementById('game-id').value = '';
    document.getElementById('game-form-title').textContent = 'Adicionar Novo Jogo';
}

async function loadAdminGames() {
    try {
        console.log('Loading admin games...');
        const data = await apiCall('/admin/games');
        console.log('Games loaded:', data);
        state.adminGames = data.games;
        renderGamesList(data.games);
    } catch (error) {
        console.error('Failed to load games:', error);
        const container = document.getElementById('games-list');
        if (container) {
            container.innerHTML = '<p class="text-red-400 text-xs text-center py-4">Erro ao carregar jogos</p>';
        }
    }
}

function renderGamesList(games) {
    const container = document.getElementById('games-list');
    if (!container) return;

    if (games.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-xs text-center py-4">Nenhum jogo cadastrado</p>';
        return;
    }

    container.innerHTML = games.map(game => `
        <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-purple-500/20 transition-colors">
            <div class="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                ${game.cover_image ? `
                    <img src="${game.cover_image}" alt="" class="w-full h-full object-cover">
                ` : `
                    <i class="fas fa-gamepad text-purple-400"></i>
                `}
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">${game.name}</p>
                <p class="text-gray-400 text-xs">${game.platform || 'Todas'} • ${game.saves_count || 0} saves</p>
            </div>
            <div class="flex gap-1">
                <button onclick="editGame(${game.id})" class="text-purple-400 hover:text-purple-300 p-1.5 text-xs" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteGame(${game.id})" class="text-red-400 hover:text-red-300 p-1.5 text-xs" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function editGame(id) {
    const game = state.adminGames.find(g => g.id === id);
    if (!game) return;

    document.getElementById('game-id').value = game.id;
    document.getElementById('game-name').value = game.name;
    document.getElementById('game-platform').value = game.platform || '';
    document.getElementById('game-cover').value = game.cover_image || '';
    document.getElementById('game-description').value = game.description || '';
    document.getElementById('game-form-title').textContent = 'Editar Jogo';
}

async function deleteGame(id) {
    if (!confirm('Tem certeza que deseja excluir este jogo?')) return;

    try {
        await apiCall(`/api/admin/games/${id}`, { method: 'DELETE' });
        showToast('Jogo excluído com sucesso!', 'success');
        loadAdminGames();
    } catch (error) {
        showToast('Erro ao excluir jogo', 'error');
    }
}

function filterGames() {
    const searchTerm = document.getElementById('game-search').value.toLowerCase();
    const filtered = state.adminGames.filter(game =>
        game.name.toLowerCase().includes(searchTerm)
    );
    renderGamesList(filtered);
}

async function handleCreateTag(e) {
    e.preventDefault();

    const name = document.getElementById('tag-name').value;
    const color = document.getElementById('tag-color').value;
    const icon = document.getElementById('tag-icon').value;
    const description = document.getElementById('tag-description').value;

    try {
        await apiCall('/tags', {
            method: 'POST',
            body: JSON.stringify({ name, color, icon, description })
        });
        showToast('Tag criada com sucesso!', 'success');
        document.getElementById('create-tag-form').reset();
        loadTags();
    } catch (error) {
        showToast('Erro ao criar tag', 'error');
    }
}

async function loadTags() {
    try {
        const tags = await apiCall('/tags');
        const container = document.getElementById('tags-list');

        if (tags.length === 0) {
            if (container) {
                container.innerHTML = '<p class="text-gray-400">Nenhuma tag criada</p>';
            }
            return;
        }

        if (container) {
            container.innerHTML = tags.map(tag => `
                <div class="flex items-center justify-between p-3 bg-gray-800 rounded-lg mb-2">
                    <div class="flex items-center gap-3">
                        <span class="tag-badge" style="background-color: ${tag.color}; border: 1px solid ${tag.color}">
                            <i class="fas fa-${tag.icon || 'tag'} mr-1"></i>
                            ${tag.name}
                        </span>
                        <span class="text-gray-400 text-sm">${tag.description || ''}</span>
                    </div>
                    <button onclick="deleteTag(${tag.id})" class="text-red-400 hover:text-red-300">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');
        }

        // Update assign tag select (for user management page)
        const assignSelect = document.getElementById('assign-tag-select');
        if (assignSelect) {
            assignSelect.innerHTML = '<option value="">Selecione uma tag</option>' +
                tags.map(tag => `<option value="${tag.id}">${tag.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Failed to load tags:', error);
    }
}

async function deleteTag(id) {
    if (!confirm('Tem certeza que deseja deletar esta tag?')) return;

    try {
        await apiCall(`/tags/${id}`, { method: 'DELETE' });
        showToast('Tag deletada com sucesso!', 'success');
        loadTags();
    } catch (error) {
        showToast('Erro ao deletar tag', 'error');
    }
}

// ===== Games Management =====
async function loadGamesForAdmin() {
    try {
        const search = document.getElementById('search-games')?.value || '';
        const data = await apiCall(`/admin/games?search=${search}`);
        const container = document.getElementById('games-list');

        if (data.games.length === 0) {
            container.innerHTML = '<p class="text-gray-400">Nenhum jogo encontrado</p>';
            return;
        }

        container.innerHTML = data.games.map(game => `
            <div class="flex items-center justify-between p-3 bg-gray-800 rounded-lg mb-2">
                <div class="flex items-center gap-3">
                    ${game.cover_image ? `<img src="${game.cover_image}" class="w-12 h-12 rounded object-cover">` : '<div class="w-12 h-12 rounded bg-gray-700"></div>'}
                    <div>
                        <h4 class="font-semibold text-sm">${game.name}</h4>
                        <p class="text-gray-400 text-xs">${game.platform || 'Multi-plataforma'}</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="editGame(${game.id})" class="text-purple-400 hover:text-purple-300">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteGame(${game.id})" class="text-red-400 hover:text-red-300">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load games:', error);
    }
}

async function handleCreateGame(e) {
    e.preventDefault();

    const name = document.getElementById('game-name').value;
    const platform = document.getElementById('game-platform').value;
    const cover_image = document.getElementById('game-cover').value;
    const description = document.getElementById('game-description').value;

    try {
        await apiCall('/admin/games', {
            method: 'POST',
            body: JSON.stringify({ name, platform, cover_image, description })
        });
        showToast('Jogo adicionado com sucesso!', 'success');
        document.getElementById('create-game-form').reset();
        loadGamesForAdmin();
        // Also reload games for the main app state
        await loadGames();
    } catch (error) {
        showToast('Erro ao adicionar jogo', 'error');
    }
}

async function editGame(id) {
    try {
        const games = await apiCall('/admin/games');
        const game = games.games.find(g => g.id === id);
        
        if (!game) {
            showToast('Jogo não encontrado', 'error');
            return;
        }

        const newName = prompt('Nome do jogo:', game.name);
        if (newName === null) return;

        const newPlatform = prompt('Plataforma (PC, PlayStation, Xbox, Nintendo):', game.platform || '');
        const newCover = prompt('URL da capa:', game.cover_image || '');
        const newDescription = prompt('Descrição:', game.description || '');

        await apiCall(`/admin/games/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                name: newName || game.name,
                platform: newPlatform || game.platform,
                cover_image: newCover || game.cover_image,
                description: newDescription || game.description
            })
        });

        showToast('Jogo atualizado com sucesso!', 'success');
        loadGamesForAdmin();
        await loadGames();
    } catch (error) {
        showToast('Erro ao atualizar jogo', 'error');
    }
}

async function deleteGame(id) {
    if (!confirm('Tem certeza que deseja deletar este jogo? Isso não afetará saves existentes.')) return;

    try {
        await apiCall(`/admin/games/${id}`, { method: 'DELETE' });
        showToast('Jogo deletado com sucesso!', 'success');
        loadGamesForAdmin();
        await loadGames();
    } catch (error) {
        showToast(error.message || 'Erro ao deletar jogo', 'error');
    }
}

async function loadUsersForTagManagement() {
    try {
        const data = await apiCall('/admin/users');
        const userSelect = document.getElementById('user-select');

        if (data.users.length === 0) {
            userSelect.innerHTML = '<option value="">Nenhum usuário encontrado</option>';
            return;
        }

        userSelect.innerHTML = '<option value="">Selecione um usuário</option>' +
            data.users.map(user => `<option value="${user.id}">${user.username} (${user.email})</option>`).join('');
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

async function handleUserSelectChange(e) {
    const userId = e.target.value;
    const managementDiv = document.getElementById('user-tags-management');

    if (!userId) {
        managementDiv.classList.add('hidden');
        return;
    }

    managementDiv.classList.remove('hidden');
    await loadUserTags(userId);
}

async function loadUserTags(userId) {
    try {
        const tags = await apiCall(`/tags/user/${userId}`);
        const container = document.getElementById('current-user-tags');

        if (tags.length === 0) {
            container.innerHTML = '<p class="text-gray-400 text-sm">Nenhuma tag atribuída</p>';
            return;
        }

        container.innerHTML = tags.map(tag => `
            <span class="tag-badge" style="background-color: ${tag.color}; border: 1px solid ${tag.color}">
                <i class="fas fa-${tag.icon || 'tag'} mr-1"></i>
                ${tag.name}
                <button onclick="removeTagFromUser(${userId}, ${tag.id})" class="ml-2 text-white hover:text-red-300">
                    <i class="fas fa-times"></i>
                </button>
            </span>
        `).join('');
    } catch (error) {
        console.error('Failed to load user tags:', error);
    }
}

async function assignTagToUser() {
    const userId = document.getElementById('user-select').value;
    const tagId = document.getElementById('assign-tag-select').value;

    if (!userId || !tagId) {
        showToast('Selecione um usuário e uma tag', 'error');
        return;
    }

    try {
        await apiCall(`/admin/users/${userId}/tags`, {
            method: 'POST',
            body: JSON.stringify({ tagId: parseInt(tagId) })
        });
        showToast('Tag atribuída com sucesso!', 'success');
        loadUserTags(userId);
    } catch (error) {
        showToast('Erro ao atribuir tag', 'error');
    }
}

async function removeTagFromUser(userId, tagId) {
    try {
        await apiCall(`/admin/users/${userId}/tags/${tagId}`, { method: 'DELETE' });
        showToast('Tag removida com sucesso!', 'success');
        loadUserTags(userId);
    } catch (error) {
        showToast('Erro ao remover tag', 'error');
    }
}

// ===== Helper Functions =====
function populateGameFilter() {
    const select = document.getElementById('game-filter');
    if (!select) return;

    // Clear existing options except the first one
    while (select.options.length > 1) {
        select.remove(1);
    }

    if (state.games && state.games.length > 0) {
        state.games.forEach(game => {
            const option = document.createElement('option');
            option.value = game.id;
            option.textContent = game.name;
            select.appendChild(option);
        });
    } else {
        console.log('No games available to populate filter');
    }
}

function populateGameDropdown() {
    const select = document.getElementById('save-game');
    if (!select) return;

    state.games.forEach(game => {
        const option = document.createElement('option');
        option.value = game.id;
        option.textContent = game.name;
        select.appendChild(option);
    });
}

function setupFileUpload() {
    // File upload is no longer used - saves use external download links
    console.log('File upload setup skipped - using external download links');
}

function setupGameAutocomplete() {
    const input = document.getElementById('save-game');
    const suggestions = document.getElementById('game-suggestions');
    const confirmedIcon = document.getElementById('game-confirmed');

    if (!input || !suggestions) return;

    let debounceTimer;

    input.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();

        // Reset confirmation icon
        if (confirmedIcon) {
            confirmedIcon.classList.add('hidden');
        }
        delete input.dataset.gameId;

        if (query.length < 2) {
            suggestions.classList.add('hidden');
            return;
        }

        debounceTimer = setTimeout(() => {
            const filtered = state.games.filter(game =>
                game.name.toLowerCase().includes(query.toLowerCase())
            );

            if (filtered.length > 0) {
                suggestions.innerHTML = filtered.map(game => `
                    <div class="game-suggestion px-3 py-2 hover:bg-purple-500/20 cursor-pointer transition-colors" data-game-id="${game.id}" data-game-name="${game.name}">
                        <div class="flex items-center gap-2">
                            ${game.cover_image ? `<img src="${game.cover_image}" class="w-8 h-8 rounded object-cover">` : '<div class="w-8 h-8 rounded bg-gray-700"></div>'}
                            <span class="text-sm">${game.name}</span>
                        </div>
                    </div>
                `).join('');
                suggestions.classList.remove('hidden');
            } else {
                suggestions.innerHTML = `
                    <div class="px-3 py-2 text-red-400 text-sm">
                        <i class="fas fa-exclamation-circle mr-1"></i> Jogo não encontrado na base de dados
                    </div>
                `;
                suggestions.classList.remove('hidden');
            }
        }, 300);
    });

    // Handle suggestion click
    suggestions.addEventListener('click', (e) => {
        const suggestion = e.target.closest('.game-suggestion');
        if (suggestion) {
            input.value = suggestion.dataset.gameName;
            input.dataset.gameId = suggestion.dataset.gameId;
            suggestions.classList.add('hidden');

            // Show confirmation icon
            if (confirmedIcon) {
                confirmedIcon.classList.remove('hidden');
                confirmedIcon.classList.add('animate-pulse');
                setTimeout(() => {
                    confirmedIcon.classList.remove('animate-pulse');
                }, 500);
            }
        }
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.classList.add('hidden');
        }
    });
}

function setupUploadForm() {
    const form = document.getElementById('upload-form');
    const progressBar = document.getElementById('upload-progress');
    const uploadBtn = document.getElementById('upload-btn');

    if (!form) {
        console.error('Upload form not found');
        return;
    }

    console.log('Setup upload form');
    console.log('Available games:', state.games);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        console.log('Form submitted');

        const title = document.getElementById('save-title').value;
        const gameInput = document.getElementById('save-game');
        const platform = document.getElementById('save-platform').value;
        const category = document.getElementById('save-category').value;
        const description = document.getElementById('save-description').value;
        const downloadUrlInput = document.getElementById('save-url');

        if (!downloadUrlInput) {
            console.error('Download URL input not found');
            showToast('Erro no formulário. Recarregue a página.', 'error');
            return;
        }

        console.log('Form data:', { title, platform, category, description });
        console.log('Game input value:', gameInput.value);
        console.log('Game input dataset:', gameInput.dataset);

        // Validate game selection - check if game_id is set from selection
        let gameId = gameInput.dataset.gameId;

        // If not selected from dropdown, try to find by exact name match (case insensitive)
        if (!gameId && gameInput.value.trim()) {
            console.log('Trying to find game by name:', gameInput.value);
            console.log('Available games:', state.games);
            const matchedGame = state.games.find(game =>
                game.name.toLowerCase() === gameInput.value.trim().toLowerCase()
            );
            if (matchedGame) {
                gameId = matchedGame.id;
                gameInput.dataset.gameId = gameId;
                console.log('Game found by name:', matchedGame);
                // Show confirmation icon
                const confirmedIcon = document.getElementById('game-confirmed');
                if (confirmedIcon) {
                    confirmedIcon.classList.remove('hidden');
                    confirmedIcon.classList.add('animate-pulse');
                    setTimeout(() => {
                        confirmedIcon.classList.remove('animate-pulse');
                    }, 500);
                }
            } else {
                // Game not found, ask user if they want to create it
                const createGame = confirm(`O jogo "${gameInput.value}" não está na base de dados. Deseja criar este jogo?`);
                if (createGame) {
                    try {
                        uploadBtn.disabled = true;
                        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1.5"></i> Criando jogo...';
                        
                        const newGame = await apiCall('/saves/games', {
                            method: 'POST',
                            body: JSON.stringify({ name: gameInput.value.trim(), platform })
                        });
                        
                        gameId = newGame.id;
                        gameInput.dataset.gameId = gameId;
                        
                        // Add to state.games
                        state.games.push({ id: gameId, name: gameInput.value.trim() });
                        
                        console.log('Game created:', newGame);
                        
                        // Show confirmation icon
                        const confirmedIcon = document.getElementById('game-confirmed');
                        if (confirmedIcon) {
                            confirmedIcon.classList.remove('hidden');
                        }
                        
                        uploadBtn.disabled = false;
                        uploadBtn.innerHTML = '<i class="fas fa-upload mr-1.5"></i> Enviar Save';
                    } catch (error) {
                        console.error('Error creating game:', error);
                        showToast('Erro ao criar jogo. Verifique se você tem permissão.', 'error');
                        uploadBtn.disabled = false;
                        uploadBtn.innerHTML = '<i class="fas fa-upload mr-1.5"></i> Enviar Save';
                        return;
                    }
                } else {
                    console.error('Game not found in list');
                    showToast(`Selecione um jogo da lista de sugestões ou crie um novo.`, 'error');
                    gameInput.focus();
                    return;
                }
            }
        }

        if (!gameId) {
            console.error('No game selected');
            showToast('Selecione um jogo válido da lista de sugestões', 'error');
            gameInput.focus();
            return;
        }

        const downloadUrl = document.getElementById('save-url').value.trim();

        if (!downloadUrl) {
            console.error('No download URL provided');
            showToast('Por favor, forneça o link de download', 'error');
            return;
        }

        // Validate URL
        try {
            new URL(downloadUrl);
        } catch (e) {
            console.error('Invalid URL:', downloadUrl);
            showToast('Por favor, forneça um link válido (deve começar com http:// ou https://)', 'error');
            return;
        }

        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1.5"></i> Enviando...';

        try {
            console.log('Starting save creation...');
            // Create save with external link
            const response = await fetch('/api/saves', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${state.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title,
                    game_id: gameId,
                    platform,
                    category,
                    description,
                    download_url: downloadUrl
                })
            });

            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok) {
                showToast('Save enviado com sucesso!', 'success');
                setTimeout(() => {
                    window.location.href = '/saves';
                }, 1500);
            } else {
                throw new Error(data.error || 'Erro ao enviar save');
            }
        } catch (error) {
            console.error('Upload error:', error);
            showToast(error.message || 'Erro ao enviar save', 'error');
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload mr-1.5"></i> Enviar Save';
        }
    });
}

function setupSearch() {
    const input = document.getElementById('search-input');
    const autocomplete = document.getElementById('search-autocomplete');
    const gameFilter = document.getElementById('game-filter');
    const platformFilter = document.getElementById('platform-filter');
    const sortFilter = document.getElementById('sort-filter');

    if (!input) return;

    let debounceTimer;

    input.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const query = e.target.value;
            if (query.length >= 2) {
                showAutocomplete(query);
            } else {
                autocomplete.classList.add('hidden');
            }
        }, 300);
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadSaves();
            autocomplete.classList.add('hidden');
        }
    });

    // Add event listeners for filters
    if (gameFilter) {
        gameFilter.addEventListener('change', () => loadSaves());
    }
    if (platformFilter) {
        platformFilter.addEventListener('change', () => loadSaves());
    }
    if (sortFilter) {
        sortFilter.addEventListener('change', () => loadSaves());
    }
}

async function showAutocomplete(query) {
    try {
        const data = await apiCall(`/saves?search=${encodeURIComponent(query)}&limit=5`);
        const autocomplete = document.getElementById('search-autocomplete');

        if (data.saves.length === 0) {
            autocomplete.classList.add('hidden');
            return;
        }

        autocomplete.innerHTML = data.saves.map(save => `
            <div class="autocomplete-item" onclick="goToSave(${save.id})">
                <div class="font-semibold">${save.title}</div>
                <div class="text-gray-400 text-sm">${save.game_name}</div>
            </div>
        `).join('');

        autocomplete.classList.remove('hidden');
    } catch (error) {
        console.error('Autocomplete error:', error);
    }
}

function goToSave(id) {
    window.location.href = `/saves/${id}`;
}

function filterByGame(gameId) {
    window.location.href = `/saves?game=${gameId}`;
}

function renderPagination(pagination) {
    const container = document.getElementById('pagination');
    if (!container) return;

    const { page, pages } = pagination;

    let html = '';

    for (let i = 1; i <= pages; i++) {
        html += `
            <button onclick="loadSaves(${i})" class="px-4 py-2 rounded-lg ${i === page ? 'btn-primary' : 'bg-gray-700 hover:bg-purple-500/50'}">
                ${i}
            </button>
        `;
    }

    container.innerHTML = html;
}



async function downloadSave(id) {
    try {
        const saveId = parseInt(id);
        console.log('=== DOWNLOAD REQUEST START ===');
        console.log('Save ID (parsed):', saveId, '(original:', id, ')');

        if (isNaN(saveId)) {
            console.error('Invalid save ID:', id);
            showToast('ID de save inválido', 'error');
            return;
        }

        // Open the download endpoint directly - browser will follow the redirect
        const downloadUrl = `${API_BASE}/saves/${saveId}/download`;
        console.log('Opening download URL:', downloadUrl);
        window.open(downloadUrl, '_blank');

        console.log('Download initiated successfully');
        showToast('Redirecionando para download...', 'success');
    } catch (error) {
        console.error('Download error:', error);
        showToast(error.message || 'Erro ao baixar save', 'error');
    }
}

async function toggleFavorite(id) {
    try {
        const data = await apiCall(`/saves/${id}/favorite`, {
            method: 'POST'
        });
        showToast(data.message, 'success');
        loadSaveDetails(id);
        // Reinitialize header username particles
        setTimeout(() => createUsernameParticles(state.user.tagType, state.user.tagColor), 300);
    } catch (error) {
        // Error handled in apiCall
    }
}

function openRatingModal(id) {
    const modal = document.getElementById('modal');
    const content = document.getElementById('modal-content');

    content.innerHTML = `
        <div class="p-6">
            <h2 class="text-2xl font-bold mb-6">Avaliar Save</h2>
            <div class="star-rating justify-center mb-6">
                ${[1, 2, 3, 4, 5].map(i => `
                    <i class="fas fa-star text-3xl star" data-rating="${i}" onclick="setRating(${i})"></i>
                `).join('')}
            </div>
            <button onclick="submitRating(${id})" class="btn-primary w-full">Enviar Avaliação</button>
            <button onclick="closeModal()" class="btn-secondary w-full mt-4">Cancelar</button>
        </div>
    `;

    modal.classList.remove('hidden');
    content.classList.add('modal-enter');
}

let currentRating = 0;

function setRating(rating) {
    currentRating = rating;
    document.querySelectorAll('.star').forEach((star, index) => {
        star.classList.toggle('filled', index < rating);
    });
}

async function submitRating(id) {
    if (currentRating === 0) {
        showToast('Selecione uma avaliação', 'error');
        return;
    }

    try {
        await apiCall(`/saves/${id}/rate`, {
            method: 'POST',
            body: JSON.stringify({ rating: currentRating })
        });
        showToast('Avaliação enviada!', 'success');
        closeModal();
        loadSaveDetails(id);
    } catch (error) {
        // Error handled in apiCall
    }
}

async function addComment(e, id) {
    e.preventDefault();
    const form = e.target;
    const content = form.querySelector('textarea').value;

    try {
        await apiCall(`/saves/${id}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });
        showToast('Comentário adicionado!', 'success');
        form.reset();
        loadSaveDetails(id);
        // Reinitialize header username particles
        setTimeout(() => createUsernameParticles(state.user.tagType, state.user.tagColor), 300);
    } catch (error) {
        // Error handled in apiCall
    }
}

async function likeComment(commentId) {
    try {
        await apiCall(`/saves/comments/${commentId}/like`, {
            method: 'POST'
        });
        // Reload save details to update comment likes
        const currentPath = window.location.pathname;
        const id = currentPath.split('/')[2];
        loadSaveDetails(id);
        // Reinitialize header username particles
        setTimeout(() => createUsernameParticles(state.user.tagType, state.user.tagColor), 300);
    } catch (error) {
        // Error handled in apiCall
    }
}

// Render a single comment with nested replies
function renderComment(comment, currentUser) {
    const hasVipTag = comment.user_tags && comment.user_tags.some(tag => tag.name.toLowerCase().includes('vip'));
    const vipTag = hasVipTag ? comment.user_tags.find(tag => tag.name.toLowerCase().includes('vip')) : null;
    const vipType = vipTag ? (vipTag.name.includes('Gold') ? 'gold' : vipTag.name.includes('Diamond') ? 'diamond' : vipTag.name.includes('EXTREME') ? 'extreme' : 'platinum') : '';

    const isAuthor = currentUser && currentUser.id === comment.user_id;
    const isAdmin = currentUser && currentUser.is_admin;
    const canDelete = isAuthor || isAdmin;
    const canEdit = isAuthor || isAdmin;

    const formattedDate = formatCommentDate(comment.created_at);

    return `
        <div class="comment-item" id="comment-${comment.id}" data-comment-id="${comment.id}">
            <a href="/profile/${comment.user_id}" class="cursor-pointer">
                <img src="${comment.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.username)}&background=8b5cf6&color=fff&size=200&bold=true`}" alt="${comment.username}"
                     class="avatar"
                     style="${hasVipTag ? `border-color: ${vipTag.color}; box-shadow: 0 0 15px ${vipTag.color}40;` : ''}">
            </a>
            <div class="comment-card" style="--comment-border-color: ${hasVipTag ? vipTag.color : 'rgba(139, 92, 246, 0.6)'};">
                <div class="comment-header">
                    <div class="flex items-center gap-3 flex-wrap">
                        <a href="/profile/${comment.user_id}" class="cursor-pointer">
                            <div class="username-glow-wrapper">
                                <div class="username-particles" data-color="${hasVipTag ? vipTag.color : '#8b5cf6'}"></div>
                                <span class="font-semibold ${hasVipTag ? `username-glow vip-${vipType}` : 'username-glow'} hover:opacity-80 transition-opacity"
                                      style="${hasVipTag ? `color: ${vipTag.color}; text-shadow: 0 0 10px ${vipTag.color}80, 0 0 20px ${vipTag.color}60;` : ''}">${comment.username}</span>
                            </div>
                        </a>
                        ${hasVipTag ? `
                            <span class="text-xs px-2 py-0.5 rounded-full vip-tag-${vipType}"
                                  style="background: linear-gradient(135deg, ${vipTag.color}40, ${vipTag.color}20); color: ${vipTag.color}; border: 1px solid ${vipTag.color}60;">
                                <i class="fas fa-${vipTag.icon || 'star'} mr-1"></i>${vipTag.name}
                            </span>
                        ` : ''}
                        ${comment.is_edited ? `
                            <span class="edit-badge-header">
                                <i class="fas fa-edit mr-1"></i>Editado
                            </span>
                        ` : ''}
                        <span class="text-gray-500 text-xs ml-auto">${formattedDate}</span>
                    </div>
                    ${canDelete || canEdit ? `
                        <div class="comment-actions">
                            <button onclick="toggleCommentMenu(${comment.id})" class="text-gray-400 hover:text-white p-1">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div id="comment-menu-${comment.id}" class="comment-menu hidden">
                                ${canEdit ? `
                                    <button onclick="editComment(${comment.id})" class="text-gray-300 hover:text-purple-400 text-xs">
                                        <i class="fas fa-edit mr-1"></i>Editar
                                    </button>
                                ` : ''}
                                ${canDelete ? `
                                    <button onclick="deleteComment(${comment.id})" class="text-red-400 hover:text-red-300 text-xs">
                                        <i class="fas fa-trash mr-1"></i>Excluir
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="comment-content" id="comment-content-${comment.id}">
                    <p class="text-gray-300">${comment.content}</p>
                </div>
                <div class="comment-footer">
                    <div class="flex items-center gap-4">
                        ${currentUser ? `
                            <button onclick="likeComment(${comment.id})" class="comment-action-btn ${comment.user_liked ? 'liked' : ''}">
                                <i class="fas fa-heart"></i>
                                <span>${comment.likes_count || 0}</span>
                            </button>
                        ` : `
                            <button onclick="showLoginRequiredMessage()" class="comment-action-btn opacity-50">
                                <i class="fas fa-heart"></i>
                                <span>${comment.likes_count || 0}</span>
                            </button>
                        `}
                        ${currentUser ? `
                            <button onclick="showReplyForm(${comment.id})" class="comment-action-btn">
                                <i class="fas fa-reply"></i>
                                <span>Responder</span>
                            </button>
                        ` : `
                            <button onclick="showLoginRequiredMessage()" class="comment-action-btn opacity-50">
                                <i class="fas fa-lock"></i>
                                <span>Responder</span>
                            </button>
                        `}
                    </div>
                </div>
            </div>

            <!-- Reply Form -->
            ${currentUser ? `
            <div id="reply-form-${comment.id}" class="reply-form hidden">
                <form onsubmit="addReply(event, ${comment.id}, ${comment.save_id})" class="mt-3">
                    <div class="flex gap-3">
                        <img src="${currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.username)}&background=8b5cf6&color=fff&size=200&bold=true`}" alt="${currentUser.username}" class="avatar w-8 h-8">
                        <div class="flex-1">
                            <textarea name="content" rows="2" class="input-field mb-2 text-sm" placeholder="Escreva uma resposta..." required></textarea>
                            <div class="flex justify-end gap-2">
                                <button type="button" onclick="hideReplyForm(${comment.id})" class="text-gray-400 hover:text-white text-xs px-3 py-1">Cancelar</button>
                                <button type="submit" class="btn-primary text-xs">Responder</button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            ` : ''}

            <!-- Nested Replies -->
            ${comment.replies && comment.replies.length > 0 ? `
                <div class="replies-container">
                    ${comment.replies.map(reply => renderComment(reply, currentUser)).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

// Format comment date in a readable format
function formatCommentDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `${minutes} min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days}d atrás`;

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });
}

// Toggle comment menu
function toggleCommentMenu(commentId) {
    const menu = document.getElementById(`comment-menu-${commentId}`);
    menu.classList.toggle('hidden');

    // Close menu when clicking outside
    if (!menu.classList.contains('hidden')) {
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && !e.target.closest('.comment-actions')) {
                menu.classList.add('hidden');
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);
    }
}

// Show reply form
function showReplyForm(commentId) {
    const form = document.getElementById(`reply-form-${commentId}`);
    form.classList.remove('hidden');
    form.querySelector('textarea').focus();
}

// Hide reply form
function hideReplyForm(commentId) {
    const form = document.getElementById(`reply-form-${commentId}`);
    form.classList.add('hidden');
    form.querySelector('textarea').value = '';
}

// Add reply to comment
async function addReply(e, parentId, saveId) {
    e.preventDefault();
    const form = e.target;
    const content = form.querySelector('textarea').value;

    try {
        await apiCall(`/saves/${saveId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content, parent_id: parentId })
        });
        showToast('Resposta adicionada!', 'success');
        hideReplyForm(parentId);
        loadSaveDetails(saveId);
    } catch (error) {
        // Error handled in apiCall
    }
}

// Delete comment
async function deleteComment(commentId) {
    // Close menu
    const menu = document.getElementById(`comment-menu-${commentId}`);
    if (menu) menu.classList.add('hidden');

    try {
        // Add fade out animation
        const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
        commentElement.style.transition = 'all 0.3s ease';
        commentElement.style.opacity = '0';
        commentElement.style.transform = 'translateX(-20px)';

        setTimeout(async () => {
            await apiCall(`/saves/comments/${commentId}`, {
                method: 'DELETE'
            });
            showToast('Comentário excluído!', 'success');
            const currentPath = window.location.pathname;
            const id = currentPath.split('/')[2];
            loadSaveDetails(id);
        }, 300);
    } catch (error) {
        // Error handled in apiCall
    }
}

// Edit comment - inline editing
async function editComment(commentId) {
    // Close menu
    const menu = document.getElementById(`comment-menu-${commentId}`);
    if (menu) menu.classList.add('hidden');

    const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
    const contentElement = document.getElementById(`comment-content-${commentId}`);
    const currentContent = contentElement.querySelector('p').textContent;

    // Store original content in data attribute
    contentElement.dataset.originalContent = currentContent;

    // Replace paragraph with textarea
    contentElement.innerHTML = `
        <textarea id="edit-textarea-${commentId}" class="edit-textarea" rows="3">${currentContent}</textarea>
        <div class="edit-actions">
            <button onclick="saveEdit(${commentId})" class="btn-primary text-xs mr-2">
                <i class="fas fa-check mr-1"></i>Salvar
            </button>
            <button onclick="cancelEdit(${commentId})" class="text-gray-400 hover:text-white text-xs">
                <i class="fas fa-times mr-1"></i>Cancelar
            </button>
        </div>
    `;

    // Focus textarea
    const textarea = document.getElementById(`edit-textarea-${commentId}`);
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

// Save edited comment
async function saveEdit(commentId) {
    const textarea = document.getElementById(`edit-textarea-${commentId}`);
    const newContent = textarea.value.trim();

    if (!newContent) {
        showToast('O comentário não pode estar vazio', 'error');
        return;
    }

    try {
        await apiCall(`/saves/comments/${commentId}`, {
            method: 'PUT',
            body: JSON.stringify({ content: newContent })
        });
        showToast('Comentário editado!', 'success');
        const currentPath = window.location.pathname;
        const id = currentPath.split('/')[2];
        loadSaveDetails(id);
    } catch (error) {
        // Error handled in apiCall
    }
}

// Cancel edit
function cancelEdit(commentId) {
    const contentElement = document.getElementById(`comment-content-${commentId}`);
    const originalContent = contentElement.dataset.originalContent;
    contentElement.innerHTML = `<p class="text-gray-300 text-sm">${originalContent}</p>`;
}

// Edit save image
async function openEditImageModal(saveId) {
    const modal = document.getElementById('modal');
    const content = document.getElementById('modal-content');

    // Load save details to get current images
    try {
        const save = await apiCall(`/saves/${saveId}`);

        content.innerHTML = `
            <div class="p-6">
                <h2 class="text-xl font-bold mb-4">Gerenciar Imagens</h2>
                
                <!-- Current Images -->
                ${save.images && save.images.length > 0 ? `
                <div class="mb-6">
                    <h3 class="text-sm font-semibold mb-3 text-gray-300">Imagens Atuais</h3>
                    <div class="grid grid-cols-3 gap-3">
                        ${save.images.map(img => `
                        <div class="relative group">
                            <img src="${img.image_path}" alt="Imagem" class="w-full h-24 object-cover rounded-lg">
                            <button onclick="deleteSaveImage(${saveId}, ${img.id})" class="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <i class="fas fa-trash text-xs"></i>
                            </button>
                        </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <!-- Add New Images -->
                <form onsubmit="addSaveImage(event, ${saveId})">
                    <div class="mb-4">
                        <label class="block text-gray-300 mb-2">Adicionar Imagens (várias)</label>
                        <input type="file" id="edit-image-input" accept="image/*" multiple class="input-field" required>
                    </div>
                    <div class="flex gap-2">
                        <button type="submit" class="btn-primary flex-1">
                            <i class="fas fa-plus mr-2"></i> Adicionar
                        </button>
                        <button type="button" onclick="closeModal()" class="btn-secondary flex-1">
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        `;

        modal.classList.remove('hidden');
    } catch (error) {
        showToast('Erro ao carregar imagens', 'error');
    }
}

async function addSaveImage(e, saveId) {
    e.preventDefault();
    const fileInput = document.getElementById('edit-image-input');
    const files = fileInput.files;

    if (!files || files.length === 0) {
        showToast('Selecione pelo menos uma imagem', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('save_id', saveId);
    for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
    }

    try {
        await apiCall(`/saves/${saveId}/images`, {
            method: 'POST',
            body: formData,
            isFormData: true
        });
        showToast(`${files.length} imagem(ns) adicionada(s) com sucesso!`, 'success');
        closeModal();
        loadSaveDetails(saveId);
        // Reinitialize header username particles
        setTimeout(() => createUsernameParticles(state.user.tagType, state.user.tagColor), 300);
    } catch (error) {
        showToast(error.message || 'Erro ao adicionar imagens', 'error');
    }
}

async function deleteSaveImage(saveId, imageId) {
    try {
        await apiCall(`/saves/${saveId}/images/${imageId}`, {
            method: 'DELETE'
        });
        showToast('Imagem excluída com sucesso!', 'success');
        closeModal();
        loadSaveDetails(saveId);
        // Reinitialize header username particles
        setTimeout(() => createUsernameParticles(state.user.tagType, state.user.tagColor), 300);
    } catch (error) {
        showToast(error.message || 'Erro ao excluir imagem', 'error');
    }
}

// Carousel functions
let carouselIntervals = {};

function initCarousels() {
    document.querySelectorAll('.carousel-container').forEach(container => {
        const saveId = container.dataset.saveId;
        startCarouselAutoplay(saveId);

        container.addEventListener('mouseenter', () => {
            stopCarouselAutoplay(saveId);
        });

        container.addEventListener('mouseleave', () => {
            startCarouselAutoplay(saveId);
        });
    });
}

function startCarouselAutoplay(saveId) {
    stopCarouselAutoplay(saveId);
    carouselIntervals[saveId] = setInterval(() => {
        carouselNext(saveId);
    }, 3000);
}

function stopCarouselAutoplay(saveId) {
    if (carouselIntervals[saveId]) {
        clearInterval(carouselIntervals[saveId]);
        delete carouselIntervals[saveId];
    }
}

function carouselNext(saveId, event) {
    if (event) event.preventDefault();
    const container = document.querySelector(`.carousel-container[data-save-id="${saveId}"]`);
    if (!container) return;

    const slides = container.querySelectorAll('.carousel-slide');
    const indicators = container.querySelectorAll('.carousel-indicator');
    let currentIndex = parseInt(container.dataset.currentIndex);
    const totalSlides = slides.length;

    currentIndex = (currentIndex + 1) % totalSlides;
    updateCarousel(container, slides, indicators, currentIndex);
}

function carouselPrev(saveId, event) {
    if (event) event.preventDefault();
    const container = document.querySelector(`.carousel-container[data-save-id="${saveId}"]`);
    if (!container) return;

    const slides = container.querySelectorAll('.carousel-slide');
    const indicators = container.querySelectorAll('.carousel-indicator');
    let currentIndex = parseInt(container.dataset.currentIndex);
    const totalSlides = slides.length;

    currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
    updateCarousel(container, slides, indicators, currentIndex);
}

function carouselGoTo(saveId, index, event) {
    if (event) event.preventDefault();
    const container = document.querySelector(`.carousel-container[data-save-id="${saveId}"]`);
    if (!container) return;

    const slides = container.querySelectorAll('.carousel-slide');
    const indicators = container.querySelectorAll('.carousel-indicator');
    updateCarousel(container, slides, indicators, index);
}

function updateCarousel(container, slides, indicators, newIndex) {
    container.dataset.currentIndex = newIndex;

    slides.forEach((slide, index) => {
        slide.classList.toggle('opacity-100', index === newIndex);
        slide.classList.toggle('opacity-0', index !== newIndex);
    });

    indicators.forEach((indicator, index) => {
        indicator.classList.toggle('bg-white', index === newIndex);
        indicator.classList.toggle('bg-white/50', index !== newIndex);
    });
}

function createCommentUsernameParticles() {
    const particleContainers = document.querySelectorAll('.comment-card .username-particles');

    particleContainers.forEach(container => {
        // Get color from data-color attribute
        const color = container.dataset.color || '#8b5cf6';

        // Clear existing particles
        container.innerHTML = '';

        // Create 8 particles
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'username-particle';

            // Apply color to particle
            particle.style.background = color;
            particle.style.boxShadow = `0 0 6px ${color}80, 0 0 12px ${color}40`;

            // Random position around the username (more concentrated)
            const angle = (i / 8) * Math.PI * 2;
            const radius = 8 + Math.random() * 6;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            particle.style.left = `calc(50% + ${x}px)`;
            particle.style.top = `calc(50% + ${y}px)`;
            particle.style.animationDelay = `${i * 0.5}s`;

            container.appendChild(particle);
        }
    });
}

function initCommentCardMouseEffect() {
    const commentCards = document.querySelectorAll('.comment-card');

    commentCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty('--mouse-x', `${x}%`);
            card.style.setProperty('--mouse-y', `${y}%`);
        });
    });
}

// Sort comments
function sortComments(sortBy) {
    const container = document.getElementById('comments-container');
    const comments = Array.from(container.children);

    if (sortBy === 'popular') {
        comments.sort((a, b) => {
            const likesA = parseInt(a.querySelector('.comment-action-btn span')?.textContent || '0');
            const likesB = parseInt(b.querySelector('.comment-action-btn span')?.textContent || '0');
            return likesB - likesA;
        });
    } else {
        // Keep original order (recent)
        comments.sort((a, b) => {
            const idA = parseInt(a.dataset.commentId);
            const idB = parseInt(b.dataset.commentId);
            return idB - idA;
        });
    }

    comments.forEach(comment => container.appendChild(comment));
}

function closeModal() {
    const modal = document.getElementById('modal');
    const content = document.getElementById('modal-content');

    content.classList.remove('modal-enter');
    content.classList.add('modal-exit');

    setTimeout(() => {
        modal.classList.add('hidden');
        content.classList.remove('modal-exit');
    }, 300);
}

document.getElementById('modal-backdrop').addEventListener('click', closeModal);

async function loadUserTab(tab) {
    const content = document.getElementById('user-tab-content');

    // Get user ID from current URL or use current user's ID
    const currentPath = window.location.pathname;
    let userId;
    let isOwnProfile = false;

    if (currentPath.startsWith('/profile/') && currentPath !== '/profile') {
        // Viewing another user's profile
        userId = currentPath.split('/')[2];
        isOwnProfile = state.user && state.user.id === parseInt(userId);
    } else {
        // Viewing own profile, use current user's ID
        userId = state.user?.id;
        isOwnProfile = true;
    }

    if (!userId) {
        content.innerHTML = '<p class="text-gray-400">Usuário não encontrado</p>';
        return;
    }

    // Update tab buttons
    document.querySelectorAll('.profile-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const tabBtn = document.getElementById(`tab-${tab}`);
    if (tabBtn) tabBtn.classList.add('active');

    // Add fade-out animation
    content.style.opacity = '0';
    content.style.transform = 'translateY(10px)';
    content.style.transition = 'all 0.3s ease';

    try {
        let data;
        switch (tab) {
            case 'saves':
                data = await apiCall(`/users/${userId}/saves`);
                break;
            case 'favorites':
                data = await apiCall(`/users/${userId}/favorites`);
                break;
        }

        renderProfileSaveCards(data.saves, 'user-tab-content', isOwnProfile);
        
        // Add fade-in animation after content is loaded
        setTimeout(() => {
            content.style.opacity = '1';
            content.style.transform = 'translateY(0)';
        }, 50);
    } catch (error) {
        content.innerHTML = '<p class="text-gray-400">Erro ao carregar dados</p>';
        content.style.opacity = '1';
        content.style.transform = 'translateY(0)';
    }
}

async function loadPendingSaves() {
    try {
        const data = await apiCall('/admin/saves/pending');
        const container = document.getElementById('pending-saves-list');

        if (data.saves.length === 0) {
            container.innerHTML = '<p class="text-gray-400">Nenhum save pendente</p>';
            return;
        }

        container.innerHTML = data.saves.map(save => `
            <div class="glass-card p-4 mb-4">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex-1">
                        <h4 class="font-semibold text-lg">${save.title}</h4>
                        <p class="text-gray-400 text-sm">${save.game_name} (${save.platform})</p>
                        <p class="text-gray-500 text-xs">Por: ${save.username} (${save.email})</p>
                        <p class="text-gray-500 text-xs">Enviado em: ${new Date(save.created_at).toLocaleString()}</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="downloadPendingSave(${save.id})" class="text-purple-400 hover:text-purple-300" title="Baixar arquivo">
                            <i class="fas fa-download"></i>
                        </button>
                        <button onclick="approveSave(${save.id})" class="text-green-400 hover:text-green-300" title="Aprovar">
                            <i class="fas fa-check"></i>
                        </button>
                        <button onclick="rejectSave(${save.id})" class="text-red-400 hover:text-red-300" title="Rejeitar">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                ${save.images && save.images.length > 0 ? `
                    <div class="mb-3 flex gap-2 overflow-x-auto">
                        ${save.images.map(img => `
                            <img src="${img.image_path}" alt="Screenshot" class="h-20 w-20 object-cover rounded border border-gray-600">
                        `).join('')}
                    </div>
                ` : ''}

                ${save.description ? `
                    <div class="mb-3">
                        <p class="text-gray-300 text-sm">${save.description}</p>
                    </div>
                ` : ''}

                <div class="flex items-center gap-4 text-sm text-gray-400">
                    <span><i class="fas fa-tag mr-1"></i> ${save.category || 'Sem categoria'}</span>
                    <span><i class="fas fa-file mr-1"></i> ${save.file_path}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load pending saves:', error);
        container.innerHTML = '<p class="text-red-400">Erro ao carregar saves pendentes</p>';
    }
}

async function downloadPendingSave(id) {
    try {
        const headers = {};
        if (state.token) {
            headers['Authorization'] = `Bearer ${state.token}`;
        }

        const saveId = parseInt(id);
        console.log('=== ADMIN DOWNLOAD REQUEST ===');
        console.log('Save ID (parsed):', saveId, '(original:', id, ')');

        if (isNaN(saveId)) {
            console.error('Invalid save ID:', id);
            showToast('ID de save inválido', 'error');
            return;
        }

        const response = await fetch(`${API_BASE}/admin/saves/${saveId}/download`, {
            method: 'GET',
            headers,
            redirect: 'follow' // Follow redirects automatically
        });

        console.log('Admin download response status:', response.status);
        console.log('Admin download response URL:', response.url);

        if (!response.ok) {
            const error = await response.json();
            console.error('Admin download error:', error);
            throw new Error(error.error || 'Download failed');
        }

        // Open the final redirected URL in new tab
        window.open(response.url, '_blank');

        console.log('Admin download initiated successfully');
        showToast('Redirecionando para download...', 'success');
    } catch (error) {
        console.error('Admin download error:', error);
        showToast('Erro ao baixar arquivo', 'error');
    }
}

async function loadDashboardPendingSaves() {
    try {
        const data = await apiCall('/admin/saves/pending');
        const container = document.getElementById('dashboard-pending-saves');

        if (!container) return;

        if (data.saves.length === 0) {
            container.innerHTML = '<p class="text-gray-400 text-xs text-center py-4">Nenhum save pendente</p>';
            return;
        }

        container.innerHTML = data.saves.slice(0, 5).map(save => `
            <div class="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50 hover:bg-purple-500/20 transition-colors">
                <div class="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    ${save.images && save.images.length > 0 ? `
                        <img src="${save.images[0].image_path}" alt="" class="w-full h-full object-cover">
                    ` : `
                        <i class="fas fa-save text-purple-400 text-sm"></i>
                    `}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-xs font-medium truncate">${save.title}</p>
                    <p class="text-gray-400 text-[10px]">${save.game_name} • ${save.username}</p>
                </div>
                <div class="flex gap-1">
                    <button onclick="downloadPendingSave(${save.id})" class="text-purple-400 hover:text-purple-300 p-1.5 text-xs" title="Baixar">
                        <i class="fas fa-download"></i>
                    </button>
                    <button onclick="approveSave(${save.id})" class="text-green-400 hover:text-green-300 p-1.5 text-xs" title="Aprovar">
                        <i class="fas fa-check"></i>
                    </button>
                    <button onclick="rejectSave(${save.id})" class="text-red-400 hover:text-red-300 p-1.5 text-xs" title="Rejeitar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');

        if (data.saves.length > 5) {
            container.innerHTML += `
                <div class="text-center pt-2">
                    <a href="/admin/saves" class="text-xs text-purple-400 hover:text-purple-300">
                        Ver todos (${data.saves.length}) <i class="fas fa-arrow-right ml-1"></i>
                    </a>
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to load dashboard pending saves:', error);
    }
}

async function approveSave(id) {
    try {
        await apiCall(`/admin/saves/${id}/approve`, { method: 'PUT' });
        showToast('Save aprovado!', 'success');
        loadPendingSaves();
    } catch (error) {
        // Error handled in apiCall
    }
}

async function rejectSave(id) {
    const reason = prompt('Motivo da rejeição:');
    if (!reason) return;

    try {
        await apiCall(`/admin/saves/${id}/reject`, {
            method: 'PUT',
            body: JSON.stringify({ reason })
        });
        showToast('Save rejeitado!', 'success');
        loadPendingSaves();
    } catch (error) {
        // Error handled in apiCall
    }
}

// All Saves Management
let allSavesData = [];

async function loadAllSaves(page = 1) {
    try {
        const search = document.getElementById('saves-search')?.value || '';
        const status = document.getElementById('saves-status-filter')?.value || '';

        const data = await apiCall(`/admin/saves/all?page=${page}&search=${search}&status=${status}`);
        allSavesData = data.saves;
        renderAllSavesList(data.saves);
        renderPagination(data.pagination, 'filterAllSaves');
    } catch (error) {
        console.error('Failed to load all saves:', error);
        const container = document.getElementById('all-saves-list');
        if (container) container.innerHTML = '<p class="text-red-400">Erro ao carregar saves</p>';
    }
}

function renderAllSavesList(saves) {
    const container = document.getElementById('all-saves-list');
    if (!container) return;

    if (saves.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-xs text-center py-4">Nenhum save encontrado</p>';
        return;
    }

    container.innerHTML = saves.map(save => `
        <div class="flex items-center gap-4 p-4 rounded-lg bg-gray-800/50 hover:bg-purple-500/20 transition-colors border border-gray-700/50">
            <div class="w-16 h-16 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                ${save.images && save.images.length > 0 ? `
                    <img src="${save.images[0].image_path}" alt="" class="w-full h-full object-cover">
                ` : `
                    <i class="fas fa-save text-purple-400 text-xl"></i>
                `}
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                    <p class="text-sm font-medium truncate">${save.title}</p>
                    <span class="text-xs px-2 py-0.5 rounded-full ${
                        save.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        save.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                    }">${save.status === 'approved' ? 'Aprovado' : save.status === 'pending' ? 'Pendente' : 'Rejeitado'}</span>
                </div>
                <p class="text-gray-400 text-xs mb-1">${save.game_name} • ${save.game_platform}</p>
                <p class="text-gray-500 text-xs">Por: ${save.username} • ${new Date(save.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
            </div>
            <div class="flex items-center gap-3 text-xs text-gray-400">
                <span><i class="fas fa-download mr-1"></i>${save.download_count || 0}</span>
                <span><i class="fas fa-comment mr-1"></i>${save.comments_count || 0}</span>
            </div>
            <div class="flex gap-2">
                <button onclick="window.open('/saves/${save.id}', '_blank')" class="text-purple-400 hover:text-purple-300 p-2 text-xs" title="Ver Save">
                    <i class="fas fa-eye"></i>
                </button>
                <button onclick="window.open('/profile/${save.user_id}', '_blank')" class="text-blue-400 hover:text-blue-300 p-2 text-xs" title="Ver Perfil">
                    <i class="fas fa-user"></i>
                </button>
                <button onclick="showWarningModal(${save.id}, ${save.user_id}, '${save.username.replace(/'/g, "\\'")}')" class="text-yellow-400 hover:text-yellow-300 p-2 text-xs" title="Dar Advertência">
                    <i class="fas fa-exclamation-triangle"></i>
                </button>
                <button onclick="banUserFromSave(${save.user_id}, '${save.username.replace(/'/g, "\\'")}')" class="text-red-400 hover:text-red-300 p-2 text-xs" title="Banir Usuário">
                    <i class="fas fa-ban"></i>
                </button>
                <button onclick="deleteSaveAdmin(${save.id})" class="text-red-400 hover:text-red-300 p-2 text-xs" title="Excluir Save">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function filterAllSaves(page = 1) {
    loadAllSaves(page);
}

async function deleteSaveAdmin(id) {
    try {
        await apiCall(`/admin/saves/${id}`, { method: 'DELETE' });
        showToast('Save excluído!', 'success');
        loadAllSaves();
    } catch (error) {
        // Error handled in apiCall
    }
}

async function banUserFromSave(userId, username) {
    const reason = prompt('Digite o motivo do banimento:');
    if (!reason) return;

    try {
        await apiCall(`/admin/users/${userId}/ban`, {
            method: 'PUT',
            body: JSON.stringify({ reason })
        });
        showToast(`Usuário ${username} banido!`, 'success');
        loadAllSaves();
    } catch (error) {
        // Error handled in apiCall
    }
}

function showWarningModal(saveId, userId, username) {
    const modal = document.getElementById('modal');
    const content = document.getElementById('modal-content');

    content.innerHTML = `
        <div class="p-6">
            <h2 class="text-xl font-bold mb-4 gradient-text">Dar Advertência</h2>
            <p class="text-gray-400 text-sm mb-4">Dar advertência para: <span class="text-purple-400">${username}</span></p>
            <div class="space-y-4">
                <div>
                    <label class="block text-gray-300 text-xs mb-1">Tipo de Advertência</label>
                    <select id="warning-type" class="input-field text-sm">
                        <option value="general">Geral</option>
                        <option value="severe">Grave</option>
                    </select>
                </div>
                <div>
                    <label class="block text-gray-300 text-xs mb-1">Motivo *</label>
                    <textarea id="warning-reason" rows="3" class="input-field text-sm" placeholder="Descreva o motivo da advertência..." required></textarea>
                </div>
                <div class="flex gap-2 justify-end">
                    <button onclick="closeModal()" class="btn-secondary text-sm">Cancelar</button>
                    <button onclick="submitWarning(${saveId}, ${userId})" class="btn-primary text-sm">
                        <i class="fas fa-exclamation-triangle mr-1"></i>Enviar Advertência
                    </button>
                </div>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    content.classList.add('modal-enter');
}

async function submitWarning(saveId, userId) {
    const reason = document.getElementById('warning-reason').value;
    const warningType = document.getElementById('warning-type').value;

    if (!reason.trim()) {
        showToast('Digite o motivo da advertência', 'error');
        return;
    }

    try {
        await apiCall('/admin/warnings', {
            method: 'POST',
            body: JSON.stringify({
                user_id: userId,
                save_id: saveId,
                reason,
                warning_type: warningType
            })
        });
        showToast('Advertência enviada com sucesso!', 'success');
        closeModal();
    } catch (error) {
        // Error handled in apiCall
    }
}

function renderPagination(pagination, callbackName) {
    const container = document.getElementById('pagination');
    if (!container || !pagination) return;

    if (pagination.pages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    for (let i = 1; i <= pagination.pages; i++) {
        const activeClass = i === pagination.page ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-purple-500/50';
        html += `<button onclick="${callbackName}(${i})" class="px-3 py-1 rounded text-xs ${activeClass}">${i}</button>`;
    }
    container.innerHTML = html;
}

async function loadAdminActivity() {
    try {
        const data = await apiCall('/admin/dashboard');
        const container = document.getElementById('activity-list');

        if (!data.activity || data.activity.length === 0) {
            container.innerHTML = '<p class="text-gray-400">Nenhuma atividade recente</p>';
            return;
        }

        container.innerHTML = data.activity.map(item => `
            <div class="flex items-center gap-3 py-2 border-b border-gray-700">
                <i class="fas fa-${item.type === 'save' ? 'save' : 'flag'} text-purple-400"></i>
                <div class="flex-1">
                    <p class="text-sm">${item.type === 'save' ? item.title : item.reason}</p>
                    <p class="text-gray-400 text-xs">${item.username}</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load activity:', error);
    }
}

async function loadBannedUsers(page = 1) {
    try {
        const search = document.getElementById('banned-users-search')?.value || '';
        const url = search ? `/admin/users/banned?page=${page}&search=${encodeURIComponent(search)}` : `/admin/users/banned?page=${page}`;
        const data = await apiCall(url);
        state.bannedUsers = data.users;
        renderBannedUsersList(data.users);
        renderBannedPagination(data.pagination);
    } catch (error) {
        console.error('Failed to load banned users:', error);
        const container = document.getElementById('banned-users-list');
        if (container) {
            container.innerHTML = '<p class="text-red-400 text-xs text-center py-4">Erro ao carregar usuários banidos</p>';
        }
    }
}

function renderBannedUsersList(users) {
    const container = document.getElementById('banned-users-list');
    if (!container) return;

    if (users.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-400 py-8">
                <i class="fas fa-user-slash text-4xl mb-4"></i>
                <p>Nenhum usuário banido encontrado</p>
            </div>
        `;
        return;
    }

    container.innerHTML = users.map(user => `
        <div class="glass-card p-4 border-l-4 border-red-500">
            <div class="flex items-start gap-4">
                <img src="${user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=8b5cf6&color=fff&size=200&bold=true`}"
                     alt="Avatar" class="w-12 h-12 rounded-lg object-cover">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                        <h3 class="font-semibold text-sm">${user.username}</h3>
                        <span class="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">Banido</span>
                        ${user.is_admin ? '<span class="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">Admin</span>' : ''}
                    </div>
                    <p class="text-gray-400 text-xs mb-2">${user.email}</p>
                    <div class="flex flex-wrap gap-2 text-xs">
                        <span class="text-gray-500"><i class="fas fa-file-alt mr-1"></i>${user.saves_count || 0} saves</span>
                        <span class="text-gray-500"><i class="fas fa-calendar mr-1"></i>${new Date(user.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    ${user.ban_reason ? `
                        <div class="mt-2 p-2 bg-red-500/10 rounded border border-red-500/20">
                            <p class="text-red-400 text-xs"><i class="fas fa-exclamation-circle mr-1"></i><strong>Motivo:</strong> ${user.ban_reason}</p>
                        </div>
                    ` : ''}
                </div>
                <div class="flex flex-col gap-2">
                    <button onclick="showBanDetails(${user.id}, '${user.username.replace(/'/g, "\\'")}')" class="text-blue-400 hover:text-blue-300 p-2 text-xs" title="Ver Detalhes">
                        <i class="fas fa-info-circle"></i>
                    </button>
                    <button onclick="unbanUser(${user.id}, '${user.username.replace(/'/g, "\\'")}')" class="text-green-400 hover:text-green-300 p-2 text-xs" title="Desbanir">
                        <i class="fas fa-user-check"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderBannedPagination(pagination) {
    const container = document.getElementById('banned-pagination');
    if (!container || !pagination) return;

    if (pagination.pages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    for (let i = 1; i <= pagination.pages; i++) {
        const activeClass = i === pagination.page ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-purple-500/50';
        html += `<button onclick="loadBannedUsers(${i})" class="px-3 py-1 rounded text-xs ${activeClass}">${i}</button>`;
    }
    container.innerHTML = html;
}

function filterBannedUsers() {
    loadBannedUsers(1);
}

async function showBanDetails(userId, username) {
    try {
        const data = await apiCall(`/admin/users/${userId}/ban-details`);
        const modal = document.getElementById('modal');
        const content = document.getElementById('modal-content');

        if (!data.bans || data.bans.length === 0) {
            showToast('Nenhum detalhe de banimento encontrado', 'error');
            return;
        }

        const ban = data.bans[0]; // Show most recent ban

        content.innerHTML = `
            <div class="p-6 max-h-[80vh] overflow-y-auto">
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                        <i class="fas fa-ban text-red-400 text-xl"></i>
                    </div>
                    <div>
                        <h2 class="text-xl font-bold gradient-text">Detalhes do Banimento</h2>
                        <p class="text-gray-400 text-sm">${username}</p>
                    </div>
                </div>

                <div class="space-y-4">
                    <!-- Motivo -->
                    <div class="glass-card p-4 border-l-4 border-red-500">
                        <h3 class="text-sm font-semibold text-red-400 mb-2"><i class="fas fa-exclamation-triangle mr-2"></i>Motivo do Banimento</h3>
                        <p class="text-gray-300">${ban.reason}</p>
                    </div>

                    <!-- Informações de Conexão -->
                    <div class="glass-card p-4">
                        <h3 class="text-sm font-semibold text-purple-400 mb-3"><i class="fas fa-globe mr-2"></i>Informações de Conexão</h3>
                        <div class="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p class="text-gray-500 text-xs">Endereço IP</p>
                                <p class="text-gray-300 font-mono">${ban.ip_address || 'N/A'}</p>
                            </div>
                            <div>
                                <p class="text-gray-500 text-xs">País</p>
                                <p class="text-gray-300">${ban.country || 'N/A'}</p>
                            </div>
                            <div>
                                <p class="text-gray-500 text-xs">Cidade</p>
                                <p class="text-gray-300">${ban.city || 'N/A'}</p>
                            </div>
                            <div>
                                <p class="text-gray-500 text-xs">Região</p>
                                <p class="text-gray-300">${ban.region || 'N/A'}</p>
                            </div>
                            <div>
                                <p class="text-gray-500 text-xs">ISP</p>
                                <p class="text-gray-300">${ban.isp || 'N/A'}</p>
                            </div>
                            <div>
                                <p class="text-gray-500 text-xs">Coordenadas</p>
                                <p class="text-gray-300">${ban.latitude && ban.longitude ? `${ban.latitude}, ${ban.longitude}` : 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Informações do Banimento -->
                    <div class="glass-card p-4">
                        <h3 class="text-sm font-semibold text-cyan-400 mb-3"><i class="fas fa-info-circle mr-2"></i>Informações do Banimento</h3>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-500">Banido por:</span>
                                <span class="text-gray-300">${ban.banned_by_username || 'Admin'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-500">Data do banimento:</span>
                                <span class="text-gray-300">${new Date(ban.created_at).toLocaleString('pt-BR')}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Mapa (simp placeholder) -->
                    ${ban.latitude && ban.longitude ? `
                    <div class="glass-card p-4">
                        <h3 class="text-sm font-semibold text-green-400 mb-3"><i class="fas fa-map-marker-alt mr-2"></i>Localização Aproximada</h3>
                        <div class="bg-gray-800 rounded-lg h-40 flex items-center justify-center">
                            <a href="https://www.google.com/maps?q=${ban.latitude},${ban.longitude}" target="_blank" class="text-purple-400 hover:text-purple-300 text-sm">
                                <i class="fas fa-external-link-alt mr-2"></i>Ver no Google Maps
                            </a>
                        </div>
                    </div>
                    ` : ''}
                </div>

                <div class="flex gap-2 justify-end mt-6">
                    <button onclick="closeModal()" class="btn-secondary text-sm">Fechar</button>
                    <button onclick="unbanUser(${userId}, '${username.replace(/'/g, "\\'")}'); closeModal();" class="btn-primary text-sm bg-green-600 hover:bg-green-700">
                        <i class="fas fa-user-check mr-1"></i>Desbanir Usuário
                    </button>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
        content.classList.add('modal-enter');
    } catch (error) {
        console.error('Failed to load ban details:', error);
        showToast('Erro ao carregar detalhes do banimento', 'error');
    }
}

async function unbanUser(userId, username) {
    if (!confirm(`Tem certeza que deseja desbanir o usuário ${username}?`)) return;

    try {
        await apiCall(`/admin/users/${userId}/unban`, { method: 'PUT' });
        showToast(`Usuário ${username} desbanido com sucesso!`, 'success');
        loadBannedUsers();
    } catch (error) {
        showToast('Erro ao desbanir usuário', 'error');
    }
}

// ===== Notifications =====
function toggleNotifications() {
    const dropdown = document.getElementById('notifications-dropdown');
    dropdown.classList.toggle('hidden');
}

function toggleAvatarDropdown() {
    const dropdown = document.getElementById('avatar-dropdown');
    dropdown.classList.toggle('hidden');
    
    // Animate the dropdown
    if (!dropdown.classList.contains('hidden')) {
        gsap.fromTo(dropdown, 
            { opacity: 0, scale: 0.95, y: -10 },
            { opacity: 1, scale: 1, y: 0, duration: 0.2, ease: 'power2.out' }
        );
    }
}

async function startNotificationPolling() {
    await loadNotifications();
    setInterval(loadNotifications, 30000); // Poll every 30 seconds
}

async function loadNotifications() {
    try {
        const data = await apiCall('/users/me/notifications');
        state.notifications = data.notifications;

        // Update badge
        const badge = document.getElementById('notification-badge');
        if (data.unread_count > 0) {
            badge.textContent = data.unread_count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }

        // Update dropdown
        const list = document.getElementById('notifications-list');
        if (data.notifications.length === 0) {
            list.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">Nenhuma notificação</p>';
        } else {
            list.innerHTML = data.notifications.map(notif => `
                <div class="p-3 hover:bg-purple-500/20 rounded cursor-pointer ${notif.is_read ? 'opacity-60' : ''}" onclick="handleNotificationClick(${notif.id}, '${notif.link}')">
                    <p class="font-semibold text-sm">${notif.title}</p>
                    <p class="text-gray-400 text-xs">${notif.message || ''}</p>
                    <p class="text-gray-500 text-xs mt-1">${new Date(notif.created_at).toLocaleString()}</p>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Failed to load notifications:', error);
    }
}

async function handleNotificationClick(id, link) {
    try {
        await apiCall(`/users/notifications/${id}/read`, { method: 'PUT' });
        if (link) {
            window.location.href = link;
        }
        toggleNotifications();
    } catch (error) {
        console.error('Failed to mark notification as read:', error);
    }
}

async function markAllNotificationsAsRead() {
    try {
        await apiCall('/users/notifications/read-all', { method: 'PUT' });
        await loadNotifications();
        showToast('Todas as notificações marcadas como lidas', 'success');
    } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
        showToast('Erro ao marcar notificações como lidas', 'error');
    }
}

// ===== Toast Notifications =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== Animations =====
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        container.appendChild(particle);
    }
}

function createProfileParticles() {
    const container = document.getElementById('profile-particles');
    if (!container) return;

    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle-mini';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 10 + 's';
        particle.style.animationDuration = (Math.random() * 8 + 8) + 's';
        container.appendChild(particle);
    }
}

function animateCounters() {
    const counters = document.querySelectorAll('.counter');
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target'));
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;

        const updateCounter = () => {
            current += step;
            if (current < target) {
                counter.textContent = Math.floor(current).toLocaleString();
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target.toLocaleString();
            }
        };

        updateCounter();
    });
}

function animateProfileElements() {
    // Animate stat numbers
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target'));
        const duration = 1500;
        const step = target / (duration / 16);
        let current = 0;

        const updateCounter = () => {
            current += step;
            if (current < target) {
                counter.textContent = Math.floor(current);
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target;
            }
        };
        updateCounter();
    });

    // Create mini particles for profile banner
    const particlesContainer = document.getElementById('profile-particles') || document.getElementById('user-profile-particles');
    if (particlesContainer) {
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle-mini';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 5 + 's';
            particle.style.animationDuration = (Math.random() * 5 + 5) + 's';
            particlesContainer.appendChild(particle);
        }
    }
}

// ===== Hacker Effect Functions =====
function initHackerEffect(tagName) {
    const hackerEffect = document.querySelector('.hacker-name-effect');
    if (!hackerEffect) return;

    // Create matrix rain container
    const matrixContainer = document.createElement('div');
    matrixContainer.className = 'hacker-matrix-container';
    hackerEffect.appendChild(matrixContainer);

    // Create falling characters
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    
    for (let i = 0; i < 15; i++) {
        const char = document.createElement('div');
        char.className = 'hacker-matrix-char';
        char.textContent = chars[Math.floor(Math.random() * chars.length)];
        char.style.left = Math.random() * 100 + '%';
        char.style.animationDelay = Math.random() * 3 + 's';
        char.style.animationDuration = (Math.random() * 2 + 2) + 's';
        matrixContainer.appendChild(char);
    }

    // Add glitch effect to username
    const username = hackerEffect.querySelector('.hacker-glow');
    if (username) {
        username.classList.add('hacker-glitch');
    }
}

function removeHackerEffect() {
    const hackerEffect = document.querySelector('.hacker-name-effect');
    if (!hackerEffect) return;

    const matrixContainer = hackerEffect.querySelector('.hacker-matrix-container');
    if (matrixContainer) {
        matrixContainer.remove();
    }

    const username = hackerEffect.querySelector('.hacker-glow');
    if (username) {
        username.classList.remove('hacker-glitch');
    }
}

// ===== Tag Click Handler =====
function handleTagClick(tagElement) {
    const isVip = tagElement.dataset.isVip === 'true';
    const vipType = tagElement.dataset.vipType;
    const tagName = tagElement.dataset.tagName;
    
    if (!isVip) return;

    // Check if this tag is currently selected
    const isSelected = tagElement.classList.contains('selected-vip-tag');
    
    // Remove selection from all VIP tags
    document.querySelectorAll('.tag-badge-animated[data-is-vip="true"]').forEach(tag => {
        tag.classList.remove('selected-vip-tag');
    });

    // Remove all VIP effects from card
    removeVipCardEffects();

    // If this tag wasn't selected before, select it and apply effect
    if (!isSelected) {
        tagElement.classList.add('selected-vip-tag');
        
        // Apply VIP effects to entire card
        applyVipCardEffects(vipType);
    }
}

// ===== Apply VIP Effects to Card =====
function applyVipCardEffects(vipType) {
    const profileCard = document.getElementById('profile-card');
    const profileBanner = document.querySelector('.profile-banner');
    const profileAvatar = document.querySelector('.profile-avatar');
    const avatarGlow = document.querySelector('.profile-avatar-glow');
    const usernameDisplay = document.querySelector('.username-display');
    const particlesContainer = document.getElementById('profile-particles');

    if (profileCard) {
        profileCard.classList.add(`vip-${vipType}`);
    }

    if (profileBanner) {
        profileBanner.classList.add(`vip-${vipType}`);
    }

    if (profileAvatar) {
        profileAvatar.classList.add(`vip-${vipType}`);
    }

    if (avatarGlow) {
        avatarGlow.classList.add(`vip-${vipType}`);
    }

    if (usernameDisplay) {
        usernameDisplay.classList.add(`vip-username-${vipType}`);
    }

    if (particlesContainer) {
        particlesContainer.classList.add(`vip-${vipType}`);
    }
}

// ===== Remove VIP Effects from Card =====
function removeVipCardEffects() {
    const profileCard = document.getElementById('profile-card');
    const profileBanner = document.querySelector('.profile-banner');
    const profileAvatar = document.querySelector('.profile-avatar');
    const avatarGlow = document.querySelector('.profile-avatar-glow');
    const usernameDisplay = document.querySelector('.username-display');
    const particlesContainer = document.getElementById('profile-particles');

    const vipTypes = ['gold', 'platinum', 'diamond', 'extreme'];

    if (profileCard) {
        vipTypes.forEach(type => profileCard.classList.remove(`vip-${type}`));
    }

    if (profileBanner) {
        vipTypes.forEach(type => profileBanner.classList.remove(`vip-${type}`));
    }

    if (profileAvatar) {
        vipTypes.forEach(type => profileAvatar.classList.remove(`vip-${type}`));
    }

    if (avatarGlow) {
        vipTypes.forEach(type => avatarGlow.classList.remove(`vip-${type}`));
    }

    if (usernameDisplay) {
        vipTypes.forEach(type => usernameDisplay.classList.remove(`vip-username-${type}`));
    }

    if (particlesContainer) {
        vipTypes.forEach(type => particlesContainer.classList.remove(`vip-${type}`));
    }
}

// ===== Handle browser navigation =====
window.addEventListener('popstate', router);

// ===== Intercept link clicks for SPA routing =====
document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.getAttribute('href')?.startsWith('/')) {
        e.preventDefault();
        const href = link.getAttribute('href');
        window.history.pushState({}, '', href);
        router();
    }
});

class NavigationMenu extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        // Calculate base URL by removing the current page from the path
        const currentPath = window.location.pathname;
        const pathSegments = currentPath.split('/');
        
        // Remove the HTML file from the path if it exists
        if (pathSegments[pathSegments.length - 1].endsWith('.html')) {
            pathSegments.pop();
        }
        
        // For articles directory, also remove 'articles'
        if (pathSegments[pathSegments.length - 1] === 'articles') {
            pathSegments.pop();
        }
        
        // For GitHub Pages, keep the repo name in the path
        let siteRoot = '';
        if (window.location.hostname.endsWith('github.io')) {
            siteRoot = pathSegments.slice(0, 2).join('/') + '/';
        } else if (window.location.protocol === 'file:') {
            // For file:// protocol, use the full path up to the repo root
            const repoIndex = pathSegments.findIndex(segment => segment === 'chrriedel.github.io');
            if (repoIndex !== -1) {
                siteRoot = pathSegments.slice(0, repoIndex + 1).join('/') + '/';
            }
        } else {
            siteRoot = '/';
        }

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background-color: var(--primary-color, #2c3e50);
                    padding: 1rem 0;
                    position: fixed;
                    width: 100%;
                    top: 0;
                    z-index: 1000;
                }

                .nav-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0 2rem;
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .logo {
                    color: var(--white, #ffffff);
                    text-decoration: none;
                    font-size: 1.5rem;
                    font-weight: bold;
                    border: 2px solid var(--white, #ffffff);
                    padding: 0.2rem 0.5rem;
                    transition: all 0.3s ease;
                }

                .logo:hover {
                    background-color: var(--white, #ffffff);
                    color: var(--primary-color, #2c3e50);
                }

                .nav-links {
                    list-style: none;
                    display: flex;
                    gap: 2rem;
                    margin: 0;
                    padding: 0;
                }

                .nav-links a {
                    color: var(--white, #ffffff);
                    text-decoration: none;
                    transition: color 0.3s;
                }

                .nav-links a:hover,
                .nav-links a.active {
                    color: var(--secondary-color, #3498db);
                }

                @media (max-width: 768px) {
                    .nav-content {
                        flex-direction: column;
                        gap: 1rem;
                    }

                    .nav-links {
                        flex-direction: column;
                        align-items: center;
                        gap: 1rem;
                    }
                }
            </style>
            <nav>
                <div class="nav-content">
                    <a href="${siteRoot}index.html" class="logo">CR</a>
                    <ul class="nav-links">
                        <li><a href="${siteRoot}index.html" class="${this.isActive('index.html')}">Profile</a></li>
                        <li><a href="${siteRoot}repositories.html" class="${this.isActive('repositories.html')}">Repositories</a></li>
                        <li><a href="${siteRoot}articles.html" class="${this.isActive('articles')}">Articles</a></li>
                        <li><a href="${siteRoot}about.html" class="${this.isActive('about.html')}">About</a></li>
                    </ul>
                </div>
            </nav>
        `;
    }

    isActive(path) {
        const currentPath = window.location.pathname;
        let pathSegments = currentPath.split('/').filter(Boolean);
        // For GitHub Pages, ignore the repo name in the path
        if (window.location.hostname.endsWith('github.io')) {
            pathSegments = pathSegments.slice(1);
        }
        // Handle articles directory separately
        if (path === 'articles' && (pathSegments.includes('articles') || currentPath.endsWith('articles.html'))) {
            return 'active';
        }
        // For other pages
        const currentPage = pathSegments[pathSegments.length - 1] || '';
        if (currentPage === path || (!currentPage && path === 'index.html')) {
            return 'active';
        }
        return '';
    }
}

customElements.define('navigation-menu', NavigationMenu);

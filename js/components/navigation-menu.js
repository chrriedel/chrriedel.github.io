class NavigationMenu extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        // Get the current path and split it into segments
        const currentPath = window.location.pathname;
        const pathSegments = currentPath.split('/').filter(Boolean);
        
        // Calculate the base path
        let basePath = '/';
        
        // If this is a GitHub Pages site, include the repository name in the base path
        if (window.location.hostname.endsWith('github.io')) {
            const repoName = pathSegments[0];
            basePath = `/${repoName}/`;
        }

        // Add relative path for subdirectories
        if (pathSegments.length > 1) {
            const subDirCount = pathSegments.length - 1;
            basePath = '../'.repeat(subDirCount) + (basePath !== '/' ? '' : '');
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
                    <a href="${basePath}index.html" class="logo">CR</a>
                    <ul class="nav-links">
                        <li><a href="${basePath}index.html" class="${this.isActive('index.html')}">Profile</a></li>
                        <li><a href="${basePath}repositories.html" class="${this.isActive('repositories.html')}">Repositories</a></li>
                        <li><a href="${basePath}articles.html" class="${this.isActive('articles')}">Articles</a></li>
                        <li><a href="${basePath}about.html" class="${this.isActive('about.html')}">About</a></li>
                    </ul>
                </div>
            </nav>
        `;
    }

    isActive(path) {
        const currentPath = window.location.pathname;
        const pathSegments = currentPath.split('/').filter(Boolean);
        
        // For GitHub Pages, ignore the repository name in the path
        const relevantSegments = window.location.hostname.endsWith('github.io') 
            ? pathSegments.slice(1) 
            : pathSegments;
        
        // Handle articles directory separately
        if (path === 'articles' && (relevantSegments.includes('articles') || currentPath.endsWith('articles.html'))) {
            return 'active';
        }
        
        // For other pages
        const currentPage = relevantSegments[relevantSegments.length - 1] || '';
        if (currentPage === path || (!currentPage && path === 'index.html')) {
            return 'active';
        }
        
        return '';
    }
}

customElements.define('navigation-menu', NavigationMenu);

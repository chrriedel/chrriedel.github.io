// Fetch GitHub Repositories
async function fetchRepositories() {
    try {
        const response = await fetch('https://api.github.com/users/chrriedel/repos');
        const repos = await response.json();
        displayRepositories(repos);
    } catch (error) {
        console.error('Error fetching repositories:', error);
        document.getElementById('repos-container').innerHTML = '<p>Error loading repositories</p>';
    }
}

// Display Repositories
function displayRepositories(repos) {
    const container = document.getElementById('repos-container');
    const reposHTML = repos.map(repo => `
        <div class="repo-card">
            <h3>${repo.name}</h3>
            <p>${repo.description || 'No description available'}</p>
            <p>
                <span><i class="fas fa-star"></i> ${repo.stargazers_count}</span>
                <span><i class="fas fa-code-branch"></i> ${repo.forks_count}</span>
            </p>
            <a href="${repo.html_url}" target="_blank">View on GitHub</a>
        </div>
    `).join('');
    
    container.innerHTML = reposHTML;
}

// Handle Comments
class CommentSystem {
    constructor() {
        this.comments = JSON.parse(localStorage.getItem('comments')) || [];
        this.form = document.getElementById('comment-form');
        this.container = document.getElementById('comments-container');
        
        if (this.form) {
            this.form.addEventListener('submit', this.handleSubmit.bind(this));
        }
        
        this.displayComments();
    }

    handleSubmit(event) {
        event.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;
        
        const comment = {
            id: Date.now(),
            name,
            email,
            message,
            date: new Date().toISOString()
        };
        
        this.comments.unshift(comment);
        localStorage.setItem('comments', JSON.stringify(this.comments));
        
        this.form.reset();
        this.displayComments();
    }

    displayComments() {
        if (!this.container) return;

        const commentsHTML = this.comments.map(comment => `
            <div class="comment">
                <div class="comment-header">
                    <strong>${comment.name}</strong>
                    <span>${new Date(comment.date).toLocaleDateString()}</span>
                </div>
                <p>${comment.message}</p>
            </div>
        `).join('');
        
        this.container.innerHTML = commentsHTML || '<p>No comments yet. Be the first to comment!</p>';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('repos-container')) {
        fetchRepositories();
    }
    
    new CommentSystem();
});

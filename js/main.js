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
        this.db = firebase.firestore();
        this.commentsRef = this.db.collection('comments');
        this.form = document.getElementById('comment-form');
        this.container = document.getElementById('comments-container');
        this.template = document.getElementById('comment-template');
        
        if (this.form) {
            this.form.addEventListener('submit', this.handleSubmit.bind(this));
        }
        
        this.loadComments();
    }

    async handleSubmit(event) {
        event.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;
        
        const comment = {
            name,
            email,
            message,
            date: firebase.firestore.FieldValue.serverTimestamp(),
            upvotes: 0,
            isAnswer: false,
            parentId: null,
            replies: []
        };
        
        try {
            await this.commentsRef.add(comment);
            this.form.reset();
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    }

    async loadComments() {
        if (!this.container) return;

        // Real-time updates
        this.commentsRef.orderBy('date', 'desc').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                const comment = { id: change.doc.id, ...change.doc.data() };
                
                if (change.type === 'added') {
                    this.displayComment(comment);
                } else if (change.type === 'modified') {
                    this.updateComment(comment);
                } else if (change.type === 'removed') {
                    this.removeComment(comment.id);
                }
            });
        });
    }

    displayComment(comment) {
        const commentNode = this.template.content.cloneNode(true).firstElementChild;
        commentNode.id = `comment-${comment.id}`;
        commentNode.setAttribute('data-parent-id', comment.parentId || '');
        
        // Set comment content
        commentNode.querySelector('.comment-author').textContent = comment.name;
        commentNode.querySelector('.comment-date').textContent = comment.date && typeof comment.date.toDate === 'function' ? 
            comment.date.toDate().toLocaleDateString() : 'Just now';
        commentNode.querySelector('.comment-message').textContent = comment.message;
        commentNode.querySelector('.upvote-count').textContent = comment.upvotes;
        
        // Show "Reply" button only on main comments (not replies)
        const replyBtn = commentNode.querySelector('.reply-btn');
        if (!comment.parentId) {
            replyBtn.style.display = 'flex';
            replyBtn.addEventListener('click', () => this.toggleReplyForm(comment.id));
        }

                // Show "Mark as Solution" button only on replies, and only if no solution exists yet
        const markAnswerBtn = commentNode.querySelector('.mark-answer-btn');
        if (comment.parentId) {
            // Check if there's already a solution for this parent
            this.commentsRef.where('parentId', '==', comment.parentId)
                .get()
                .then(snapshot => {
                    let hasSolution = false;
                    snapshot.docs.forEach(doc => {
                        if (doc.data().isAnswer) {
                            hasSolution = true;
                        }
                    });
                    if (!hasSolution) {
                        markAnswerBtn.style.display = 'flex';
                        markAnswerBtn.addEventListener('click', () => this.markAsAnswer(comment.id, comment.parentId));
                    }
                });

            // Show solution badge if it's an answer
            if (comment.isAnswer) {
                commentNode.querySelector('.solution-badge').style.display = 'flex';
                
                // Hide all "Mark as Solution" buttons for this thread
                if (comment.parentId) {
                    const parentComment = document.getElementById(`comment-${comment.parentId}`);
                    if (parentComment) {
                        parentComment.querySelectorAll('.mark-answer-btn').forEach(btn => {
                            btn.style.display = 'none';
                        });
                    }
                }
            }
        }

        // Add upvote event listener
        commentNode.querySelector('.upvote-btn').addEventListener('click', () => this.handleUpvote(comment.id));
        
        // Handle reply form submission (only for main comments)
        if (!comment.parentId) {
            const replyForm = commentNode.querySelector('.comment-reply-form');
            replyForm.addEventListener('submit', (e) => this.handleReply(e, comment.id));
        }
        
        // Position comments
        if (comment.isAnswer) {
            const parentComment = document.getElementById(`comment-${comment.parentId}`);
            if (parentComment) {
                // Move the parent comment to the top
                this.container.insertBefore(parentComment, this.container.firstChild);
                // And ensure the answer is the first reply
                const repliesContainer = parentComment.querySelector('.replies');
                repliesContainer.insertBefore(commentNode, repliesContainer.firstChild);
            }
        } else if (comment.parentId) {
            const parentComment = document.getElementById(`comment-${comment.parentId}`);
            if (parentComment) {
                parentComment.querySelector('.replies').appendChild(commentNode);
            }
        } else {
            this.container.appendChild(commentNode);
        }
    }

    async handleUpvote(commentId) {
        try {
            await this.commentsRef.doc(commentId).update({
                upvotes: firebase.firestore.FieldValue.increment(1)
            });
        } catch (error) {
            console.error('Error upvoting comment:', error);
        }
    }

    async markAsAnswer(commentId, parentId) {
        try {
            // First, get all comments for this parent
            const snapshot = await this.commentsRef.where('parentId', '==', parentId).get();
            const batch = this.db.batch();
            
            // Unmark any existing answers
            snapshot.docs.forEach(doc => {
                if (doc.data().isAnswer) {
                    batch.update(doc.ref, { isAnswer: false });
                }
            });
            
            // Mark the new answer
            batch.update(this.commentsRef.doc(commentId), { isAnswer: true });
            
            // Apply the changes
            await batch.commit();

            // Update UI immediately (in case Firestore listener is delayed)
            const commentNodes = document.querySelectorAll(`[data-parent-id="${parentId}"]`);
            commentNodes.forEach(node => {
                // Update solution badge
                const solutionBadge = node.querySelector('.solution-badge');
                if (solutionBadge) {
                    solutionBadge.style.display = node.id === `comment-${commentId}` ? 'flex' : 'none';
                }
                
                // Hide all "Mark as Solution" buttons in this comment thread
                const markSolutionBtn = node.querySelector('.mark-answer-btn');
                if (markSolutionBtn) {
                    markSolutionBtn.style.display = 'none';
                }
            });
            
            // Move the parent comment and the answer to the top
            const parentComment = document.getElementById(`comment-${parentId}`);
            if (parentComment) {
                this.container.insertBefore(parentComment, this.container.firstChild);
                const repliesContainer = parentComment.querySelector('.replies');
                const answerComment = document.getElementById(`comment-${commentId}`);
                if (answerComment && repliesContainer) {
                    repliesContainer.insertBefore(answerComment, repliesContainer.firstChild);
                }
            }
        } catch (error) {
            console.error('Error marking answer:', error);
        }
    }

    toggleReplyForm(commentId) {
        const comment = document.getElementById(`comment-${commentId}`);
        const replyForm = comment.querySelector('.reply-form');
        replyForm.style.display = replyForm.style.display === 'none' ? 'block' : 'none';
    }

    async handleReply(event, parentId) {
        event.preventDefault();
        const form = event.target;
        
        const reply = {
            name: form.querySelector('.reply-name').value,
            email: form.querySelector('.reply-email').value,
            message: form.querySelector('.reply-message').value,
            date: firebase.firestore.FieldValue.serverTimestamp(),
            upvotes: 0,
            isAnswer: false,
            parentId: parentId,
            replies: []
        };
        
        try {
            await this.commentsRef.add(reply);
            form.reset();
            this.toggleReplyForm(parentId);
        } catch (error) {
            console.error('Error adding reply:', error);
        }
    }

    updateComment(comment) {
        const commentNode = document.getElementById(`comment-${comment.id}`);
        if (commentNode) {
            commentNode.querySelector('.upvote-count').textContent = comment.upvotes;
            
            // Update solution badge visibility
            const solutionBadge = commentNode.querySelector('.solution-badge');
            solutionBadge.style.display = comment.isAnswer ? 'flex' : 'none';
            
            if (comment.isAnswer) {
                // Find the parent comment
                const parentComment = document.getElementById(`comment-${comment.parentId}`);
                if (parentComment) {
                    // Move parent to the top
                    this.container.insertBefore(parentComment, this.container.firstChild);
                    // Move answer to top of replies
                    const repliesContainer = parentComment.querySelector('.replies');
                    repliesContainer.insertBefore(commentNode, repliesContainer.firstChild);
                }
            }
        }
    }

    removeComment(commentId) {
        const commentNode = document.getElementById(`comment-${commentId}`);
        if (commentNode) {
            commentNode.remove();
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('repos-container')) {
        fetchRepositories();
    }
    
    new CommentSystem();
});

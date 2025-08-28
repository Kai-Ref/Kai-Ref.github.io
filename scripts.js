// Rotating text below name
const rotatingTexts = ["Problem Solver", "Leader", "Innovator", "Developer"];
let index = 0;
const rotatingElement = document.querySelector('.rotating-text');

if (rotatingElement) {
    setInterval(() => {
        index = (index + 1) % rotatingTexts.length;
        rotatingElement.textContent = rotatingTexts[index];
    }, 2000);
}

// Contact form handling
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const name = this.name.value;
        const email = this.email.value;
        const message = this.message.value;

        console.log({ name, email, message });
        document.getElementById('form-response').textContent = "Thank you! Your message has been sent.";
        this.reset();
    });
}

// === DYNAMIC BLOG LIST ===
async function loadBlogPosts() {
    const blogList = document.getElementById('blog-list');
    if (!blogList) return; // stop if no container

    try {
        const response = await fetch('posts/posts.json'); // path relative to blog.html
        if (!response.ok) throw new Error('Failed to fetch posts.json');
        const posts = await response.json();

        // Sort by date descending (newest first)
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));

        posts.forEach(post => {
            const card = document.createElement('div');
            card.className = 'blog-card';

            const title = document.createElement('h3');
            const link = document.createElement('a');
            link.href = `posts/${post.link}`;
            link.textContent = post.title;
            title.appendChild(link);

            const meta = document.createElement('p');
            meta.className = 'meta';
            meta.innerHTML = `
        <span class="date">${post.date}</span> |
        <span class="author">${post.author}</span> |
        <span class="tags">${post.tags.join(', ')}</span>
      `;

            const summary = document.createElement('p');
            summary.textContent = post.summary;

            card.appendChild(title);
            card.appendChild(meta);
            card.appendChild(summary);

            blogList.appendChild(card);
        });
    } catch (err) {
        console.error('Error loading blog posts:', err);
        blogList.innerHTML = '<p>Failed to load blog posts.</p>';
    }
}

// Only run if blog list exists
if (document.getElementById('blog-list')) {
    window.addEventListener('DOMContentLoaded', loadBlogPosts);
}

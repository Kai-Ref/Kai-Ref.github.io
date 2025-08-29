// -------------------- Rotating Text --------------------
const rotatingTexts = ["Problem Solver", "Leader", "Innovator", "Developer", "Data Scientist"];
let index = 0;
const rotatingElement = document.querySelector('.rotating-text');

if (rotatingElement) {
    setInterval(() => {
        index = (index + 1) % rotatingTexts.length;
        rotatingElement.textContent = rotatingTexts[index];
    }, 3000);
}

// -------------------- Contact Form --------------------
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const name = this.name.value;
        const email = this.email.value;
        const message = this.message.value;

        console.log({ name, email, message });
        const responseEl = document.getElementById('form-response');
        if (responseEl) responseEl.textContent = "Thank you! Your message has been sent.";
        this.reset();
    });
}

// -------------------- Dynamic Blog List --------------------
async function loadBlogPosts() {
    const blogList = document.getElementById('blog-list');
    if (!blogList) return;

    try {
        const response = await fetch('posts/posts.json');
        if (!response.ok) throw new Error('Failed to fetch posts.json');
        const posts = await response.json();

        // Sort by date descending
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));

        posts.forEach(post => {
            const card = document.createElement('div');
            card.className = 'blog-card';

            card.innerHTML = `
                <h3><a href="posts/${post.link}">${post.title}</a></h3>
                <p class="meta">
                    <span class="date">${post.date}</span> |
                    <span class="author">${post.author}</span> |
                    <span class="tags">${post.tags.join(', ')}</span>
                </p>
                <p>${post.summary}</p>
            `;
            blogList.appendChild(card);
        });
    } catch (err) {
        console.error('Error loading blog posts:', err);
        blogList.innerHTML = '<p>Failed to load blog posts.</p>';
    }
}

if (document.getElementById('blog-list')) {
    window.addEventListener('DOMContentLoaded', loadBlogPosts);
}

// -------------------- UPDATED Timeline Generation --------------------
document.addEventListener('DOMContentLoaded', async () => {
    const timelineGrid = document.querySelector(".timeline-grid");
    if (!timelineGrid) return;

    try {
        const response = await fetch("timeline.json");
        if (!response.ok) throw new Error('Failed to fetch timeline.json');
        const data = await response.json();

        // Sort by start date (NEWEST FIRST - REVERSED)
        const sortedData = [...data].sort((a, b) => parseInt(b.start) - parseInt(a.start));

        // Calculate timeline dimensions
        const minYear = Math.min(...sortedData.map(item => parseInt(item.start)));
        const currentYear = new Date().getFullYear();
        const maxYear = Math.max(...sortedData.map(item =>
            parseInt(item.end || currentYear.toString())
        ));

        const totalYears = Math.max(1, maxYear - minYear);
        const yearHeight = 200; // pixels per year
        const totalHeight = totalYears * yearHeight;

        // Set timeline height
        const timeline = document.querySelector('.timeline');
        if (timeline) {
            timeline.style.minHeight = `${totalHeight + 400}px`;
        }

        // Create year markers on the timeline
        const yearMarkers = new Set();

        sortedData.forEach((entry, index) => {
            const startYear = parseInt(entry.start);
            const endYear = parseInt(entry.end || currentYear.toString());

            // For reversed timeline: items should start at END position and extend to START
            const endPosition = ((maxYear - endYear) / totalYears) * totalHeight;
            const startPosition = ((maxYear - startYear) / totalYears) * totalHeight;
            const duration = Math.max(1, endYear - startYear);
            const itemHeight = startPosition - endPosition;

            // Position the item at its END date (where it should first appear)
            const topPosition = endPosition;

            const sideClass = entry.type === "education" ? "left" : "right";

            // Create timeline item
            const item = document.createElement("div");
            item.className = "timeline-item " + sideClass;
            item.style.position = "absolute";
            item.style.top = topPosition + "px";
            item.style.height = itemHeight + "px";

            const endText = entry.end ? entry.end : 'Present';
            const companyOrInstitution = entry.company || entry.institution || '';

            item.innerHTML = `
                <div class="timeline-content ${sideClass}">
                    ${entry.logo ? `<img src="${entry.logo}" class="timeline-logo">` : ''}
                    <h3>${entry.title}</h3>
                    <div class="company">${companyOrInstitution}</div>
                    <div class="description">${entry.description || ''}</div>
                    <div class="duration">${entry.start} - ${endText}</div>
                </div>
            `;

            timelineGrid.appendChild(item);

            // Add year markers to the set
            yearMarkers.add(startYear);
            if (entry.end && endYear !== startYear) {
                yearMarkers.add(endYear);
            }
        });

        // Create year markers on the timeline line (REVERSED)
        yearMarkers.forEach(year => {
            const yearPosition = ((maxYear - year) / totalYears) * totalHeight;
            const yearMarker = document.createElement("div");
            yearMarker.className = "timeline-year-marker";
            yearMarker.style.top = `${yearPosition}px`;
            yearMarker.textContent = year.toString();
            timelineGrid.appendChild(yearMarker);
        });

        // Fade-in effect for timeline items
        const timelineContents = timelineGrid.querySelectorAll('.timeline-content');
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.1 });

        timelineContents.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });

    } catch (err) {
        console.error("Failed to load timeline:", err);
        timelineGrid.innerHTML = '<p style="text-align: center; color: #666;">Failed to load timeline data.</p>';
    }
});

// -------------------- Timeline Scroll Progress --------------------
document.addEventListener("scroll", () => {
    const progress = document.getElementById("timeline-progress");
    const wrapper = document.querySelector(".main-wrapper");
    const timeline = document.querySelector(".timeline");

    if (!progress || !timeline) return;

    const timelineRect = timeline.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Calculate how much of the timeline has been scrolled
    let scrollProgress = 0;
    if (timelineRect.top < 0) {
        const timelineHeight = timeline.offsetHeight;
        const scrolled = Math.abs(timelineRect.top);
        const totalScrollable = timelineHeight - viewportHeight + 200;
        scrollProgress = Math.min(scrolled / totalScrollable, 1);
    }

    const maxHeight = timeline.offsetHeight - 200;
    progress.style.height = `${scrollProgress * maxHeight}px`;
}, { passive: true });
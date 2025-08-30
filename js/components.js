// Background animation for home page
function createTimeSeriesBackground() {
    const canvas = document.createElement('canvas');
    canvas.className = 'time-series-bg';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const ctx = canvas.getContext('2d');
    const points = [];
    const numLines = 3;
    
    // Generate time series data
    for (let line = 0; line < numLines; line++) {
        const linePoints = [];
        for (let i = 0; i <= 100; i++) {
            const x = (i / 100) * canvas.width;
            const baseY = canvas.height * (0.3 + line * 0.2);
            const noise = Math.sin(i * 0.1 + line * 2) * 50 + Math.random() * 20;
            linePoints.push({ x, y: baseY + noise });
        }
        points.push(linePoints);
    }
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid
        ctx.strokeStyle = 'rgba(0, 188, 212, 0.1)';
        ctx.lineWidth = 1;
        
        // Vertical lines
        for (let i = 0; i < canvas.width; i += 50) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let i = 0; i < canvas.height; i += 50) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }
        
        // Draw time series lines
        points.forEach((linePoints, lineIndex) => {
            ctx.strokeStyle = `rgba(0, 188, 212, ${0.3 + lineIndex * 0.2})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            linePoints.forEach((point, i) => {
                if (i === 0) {
                    ctx.moveTo(point.x, point.y);
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            });
            ctx.stroke();
            
            // Animate points
            linePoints.forEach(point => {
                point.y += Math.sin(Date.now() * 0.001 + point.x * 0.01) * 0.5;
            });
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
    return canvas;
}

// Company logos carousel
function createLogosCarousel() {
    const logos = [
        { name: 'KIT', src: 'img/logos/kit.svg' },
        { name: 'University of Mannheim', src: 'img/logos/uom.webp' },
        { name: 'University of Adelaide', src: 'img/logos/uoa.png' },
        { name: 'ICIS', src: 'img/logos/icis.jpg' },
        { name: 'Fraunhofer SIT', src: 'img/logos/sit.webp' }
    ];
    
    const carousel = document.createElement('div');
    carousel.className = 'logos-carousel';
    
    const track = document.createElement('div');
    track.className = 'logos-track';
    
    // Create two sets for infinite scroll
    [...logos, ...logos].forEach(logo => {
        const logoItem = document.createElement('div');
        logoItem.className = 'logo-item';
        logoItem.innerHTML = `
            <img src="${logo.src}" alt="${logo.name}" title="${logo.name}">
        `;
        track.appendChild(logoItem);
    });
    
    carousel.appendChild(track);
    return carousel;
}

// Blog card component
function createBlogCard(post) {
    const card = document.createElement('div');
    card.className = 'content-card blog-card';
    
    card.innerHTML = `
        <div class="card-image">
            <img src="${post.image || 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&fit=crop'}" alt="${post.title}">
            <div class="card-overlay">
                <span class="read-time">${post.readTime || '5 min read'}</span>
            </div>
        </div>
        <div class="card-content">
            <div class="card-meta">
                <span class="date">${post.date}</span>
                <div class="tags">
                    ${post.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>
            <h3><a href="posts/${post.link}">${post.title}</a></h3>
            <p class="summary">${post.summary}</p>
            <a href="posts/${post.link}" class="read-more">Read More →</a>
        </div>
    `;
    
    return card;
}

// Project card component
function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'content-card project-card';
    
    card.innerHTML = `
        <div class="card-image">
            <img src="${project.image}" alt="${project.title}">
            <div class="card-overlay">
                <div class="project-links">
                    ${project.github ? `<a href="${project.github}" target="_blank" title="GitHub"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg></a>` : ''}
                    ${project.demo ? `<a href="${project.demo}" target="_blank" title="Live Demo"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/></svg></a>` : ''}
                </div>
            </div>
        </div>
        <div class="card-content">
            <div class="card-meta">
                <span class="date">${project.date}</span>
                <div class="tech-stack">
                    ${project.technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
                </div>
            </div>
            <h3>${project.title}</h3>
            <p class="summary">${project.description}</p>
            <div class="project-status">
                <span class="status ${project.status}">${project.status}</span>
            </div>
        </div>
    `;
    
    return card;
}

// Initialize components based on page
function initializeComponents() {
    const currentPage = document.body.dataset.page;
    
    if (currentPage === 'home') {
        const heroSection = document.querySelector('.hero-section');
        if (heroSection) {
            // Add background animation
            const bgCanvas = createTimeSeriesBackground();
            heroSection.appendChild(bgCanvas);
            
            // Add logos carousel
            const logosContainer = document.querySelector('.logos-container');
            if (logosContainer) {
                const carousel = createLogosCarousel();
                logosContainer.appendChild(carousel);
            }
        }
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initializeComponents);
</parameter>
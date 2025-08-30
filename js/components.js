// // Background animation for home page
// function createTimeSeriesBackground() {
//     const canvas = document.createElement('canvas');
//     canvas.className = 'time-series-bg';
//     canvas.width = window.innerWidth;
//     canvas.height = window.innerHeight;

//     const ctx = canvas.getContext('2d');
//     const points = [];
//     const numLines = 3;

//     // Generate time series data
//     for (let line = 0; line < numLines; line++) {
//         const linePoints = [];
//         for (let i = 0; i <= 100; i++) {
//             const x = (i / 100) * canvas.width;
//             const baseY = canvas.height * (0.3 + line * 0.2);
//             const noise = Math.sin(i * 0.1 + line * 2) * 50 + Math.random() * 20;
//             linePoints.push({ x, y: baseY + noise });
//         }
//         points.push(linePoints);
//     }

//     function animate() {
//         ctx.clearRect(0, 0, canvas.width, canvas.height);

//         // Draw grid
//         ctx.strokeStyle = 'rgba(0, 188, 212, 0.1)';
//         // ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
//         ctx.lineWidth = 1;

//         // Vertical lines
//         for (let i = 0; i < canvas.width; i += 50) {
//             ctx.beginPath();
//             ctx.moveTo(i, 0);
//             ctx.lineTo(i, canvas.height);
//             ctx.stroke();
//         }

//         // Horizontal lines
//         for (let i = 0; i < canvas.height; i += 50) {
//             ctx.beginPath();
//             ctx.moveTo(0, i);
//             ctx.lineTo(canvas.width, i);
//             ctx.stroke();
//         }

//         // Draw time series lines
//         points.forEach((linePoints, lineIndex) => {
//             ctx.strokeStyle = `rgba(0, 188, 212, ${0.3 + lineIndex * 0.2})`;
//             ctx.lineWidth = 2;
//             ctx.beginPath();

//             linePoints.forEach((point, i) => {
//                 if (i === 0) {
//                     ctx.moveTo(point.x, point.y);
//                 } else {
//                     ctx.lineTo(point.x, point.y);
//                 }
//             });
//             ctx.stroke();

//             // Animate points
//             linePoints.forEach(point => {
//                 point.y += Math.sin(Date.now() * 0.001 + point.x * 0.01) * 0.5;
//             });
//         });

//         requestAnimationFrame(animate);
//     }

//     animate();
//     return canvas;
// }

// Enhanced Background animation for home page with realistic time series data
function createTimeSeriesBackground() {
    const canvas = document.createElement('canvas');
    canvas.className = 'time-series-bg';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d');
    const points = [];
    const numLines = 3; // More lines for richer visualization

    // Navy color variations - increased opacity for visibility
    const navyColors = [
        'rgba(25, 42, 86, 0.4)',    // Main navy
        'rgba(31, 58, 147, 0.35)',  // Lighter navy
        'rgba(13, 27, 62, 0.45)',   // Darker navy
        'rgba(40, 53, 147, 0.3)',   // Blue-navy
        'rgba(21, 39, 108, 0.4)'    // Mid navy
    ];

    // Generate highly fluctuant time series with pronounced cyclical trends
    function generateTimeSeriesData(lineIndex, points) {
        const data = [];
        let value = Math.random() * 60 + 40; // Starting value

        // Enhanced parameters for more dramatic fluctuations
        const primaryTrend = (Math.random() - 0.5) * 0.3; // Stronger linear trend
        const volatility = 1.2 + Math.random() * 1.8; // Much higher volatility

        // Cyclical components - multiple cycles for complex patterns
        const longCycle = {
            period: 40 + Math.random() * 60,  // 40-100 point cycles
            amplitude: 15 + Math.random() * 25, // Strong cyclical effect
            phase: Math.random() * Math.PI * 2
        };

        const shortCycle = {
            period: 8 + Math.random() * 15,   // 8-23 point cycles
            amplitude: 8 + Math.random() * 12, // Medium cyclical effect
            phase: Math.random() * Math.PI * 2
        };

        // Trend changes - sudden shifts in direction
        const trendChangePoints = [];
        for (let tcp = 0; tcp < 3; tcp++) {
            trendChangePoints.push({
                point: Math.random() * points,
                newTrend: (Math.random() - 0.5) * 0.6,
                strength: 0.3 + Math.random() * 0.4
            });
        }

        let currentTrend = primaryTrend;

        for (let i = 0; i <= points; i++) {
            const x = (i / points) * canvas.width;

            // Check for trend changes
            trendChangePoints.forEach(tcp => {
                if (Math.abs(i - tcp.point) < 2) {
                    currentTrend = currentTrend * (1 - tcp.strength) + tcp.newTrend * tcp.strength;
                }
            });

            // Apply primary trend with acceleration/deceleration
            const trendAcceleration = Math.sin(i * 0.02) * 0.1;
            value += currentTrend + trendAcceleration;

            // Strong cyclical components
            const longCycleValue = Math.sin((i / longCycle.period) * Math.PI * 2 + longCycle.phase) * longCycle.amplitude;
            const shortCycleValue = Math.sin((i / shortCycle.period) * Math.PI * 2 + shortCycle.phase) * shortCycle.amplitude;

            // Add cycles with some interaction
            const cycleInteraction = (longCycleValue * shortCycleValue) * 0.02;
            value += longCycleValue + shortCycleValue + cycleInteraction;

            // Enhanced volatility with clustering (periods of high/low volatility)
            const volatilityCycle = Math.sin(i * 0.05) * 0.5 + 0.5; // 0 to 1
            const currentVolatility = volatility * (0.3 + volatilityCycle * 0.7);

            // Random shocks with occasional large movements
            const randomShock = Math.random() < 0.95 ?
                (Math.random() - 0.5) * currentVolatility * 8 :
                (Math.random() - 0.5) * currentVolatility * 25; // 5% chance of large shock

            value += randomShock;

            // Momentum effect - strong moves tend to continue
            if (i > 0) {
                const momentum = (value - data[i - 1].rawValue) * 0.3;
                value += momentum;
            }

            // Weaker mean reversion to allow for more dramatic moves
            const meanTarget = 50 + Math.sin(i * 0.01) * 20; // Moving mean target
            const meanReversion = (meanTarget - value) * 0.005;
            value += meanReversion;

            // Less smoothing for more jagged, volatile appearance
            if (i > 0) {
                const prevValue = data[i - 1].rawValue;
                value = value * 0.6 + prevValue * 0.4; // Less smoothing
            }

            // Convert to screen coordinates with wider range
            const baseY = canvas.height * (0.15 + lineIndex * 0.16);
            const normalizedValue = (value - 50) / 100; // Wider normalization range
            const y = baseY + normalizedValue * 120; // Larger vertical range

            data.push({
                x,
                y: Math.max(10, Math.min(canvas.height - 10, y)),
                rawValue: value,
                time: i,
                trend: currentTrend,
                cycle: longCycleValue + shortCycleValue
            });
        }
        return data;
    }

    // Generate time series data for each line
    for (let line = 0; line < numLines; line++) {
        const lineData = generateTimeSeriesData(line, 50); // More data points
        points.push({
            data: lineData,
            color: navyColors[line % navyColors.length],
            lastUpdate: Date.now(),
            updateInterval: 50 + Math.random() * 100 // Different update speeds
        });
    }

    function drawGrid() {
        // More visible grid with navy colors
        ctx.strokeStyle = 'rgba(25, 42, 86, 0.15)'; // More visible navy
        ctx.lineWidth = 0.5;

        // Vertical lines (time axis)
        const gridSpacing = 60;
        for (let i = 0; i < canvas.width; i += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }

        // Horizontal lines (value axis)
        for (let i = 0; i < canvas.height; i += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }

        // Add subtle axis labels feel
        ctx.strokeStyle = 'rgba(25, 42, 86, 0.2)';
        ctx.lineWidth = 1;

        // Main horizontal axis
        const midY = canvas.height / 2;
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(canvas.width, midY);
        ctx.stroke();
    }

    function drawTimeSeries() {
        points.forEach((series, seriesIndex) => {
            const { data, color } = series;

            // Draw the main line
            ctx.strokeStyle = color;
            ctx.lineWidth = 2; // Slightly thicker lines
            ctx.beginPath();

            data.forEach((point, i) => {
                if (i === 0) {
                    ctx.moveTo(point.x, point.y);
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            });
            ctx.stroke();

            // Add data points (dots) occasionally for more time series feel
            if (seriesIndex < 2) { // Only on first two series to avoid clutter
                ctx.fillStyle = color.replace('0.15', '0.25').replace('0.12', '0.22').replace('0.18', '0.28').replace('0.10', '0.20').replace('0.14', '0.24');

                for (let i = 0; i < data.length; i += 15) { // Every 15th point
                    const point = data[i];
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Add subtle fill area under some lines
            if (seriesIndex % 2 === 0) {
                ctx.fillStyle = color.replace(/[\d.]+\)$/, '0.08)'); // More visible fill
                ctx.beginPath();
                ctx.moveTo(data[0].x, canvas.height);
                data.forEach((point, i) => {
                    if (i === 0) {
                        ctx.lineTo(point.x, point.y);
                    } else {
                        ctx.lineTo(point.x, point.y);
                    }
                });
                ctx.lineTo(data[data.length - 1].x, canvas.height);
                ctx.closePath();
                ctx.fill();
            }
        });
    }

    function updateTimeSeries() {
        const now = Date.now();

        points.forEach((series, seriesIndex) => {
            if (now - series.lastUpdate > series.updateInterval) {
                // Shift data left and add new point
                series.data.shift();

                const lastPoint = series.data[series.data.length - 1];
                const secondLastPoint = series.data[series.data.length - 2];

                // Enhanced continuation logic for more dramatic moves
                const momentum = (lastPoint.rawValue - secondLastPoint.rawValue) * 0.4;
                const cycleComponent = Math.sin(Date.now() * 0.001 + seriesIndex) * 8;
                const volatilityComponent = (Math.random() - 0.5) * 12;

                // Occasional large shocks
                const shock = Math.random() < 0.97 ? 0 : (Math.random() - 0.5) * 30;

                const newValue = lastPoint.rawValue + momentum + cycleComponent + volatilityComponent + shock;

                // Convert to screen coordinates with enhanced range
                const baseY = canvas.height * (0.15 + seriesIndex * 0.16);
                const normalizedValue = (newValue - 50) / 100;
                const y = baseY + normalizedValue * 120;

                series.data.push({
                    x: canvas.width,
                    y: Math.max(10, Math.min(canvas.height - 10, y)),
                    rawValue: newValue,
                    time: lastPoint.time + 1
                });

                // Update x coordinates
                series.data.forEach((point, i) => {
                    point.x = (i / (series.data.length - 1)) * canvas.width;
                });

                series.lastUpdate = now;
            }
        });
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        drawGrid();
        updateTimeSeries();
        drawTimeSeries();

        requestAnimationFrame(animate);
    }

    // Handle window resize
    function handleResize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Regenerate data for new dimensions
        points.length = 0;
        for (let line = 0; line < numLines; line++) {
            const lineData = generateTimeSeriesData(line, 150);
            points.push({
                data: lineData,
                color: navyColors[line % navyColors.length],
                lastUpdate: Date.now(),
                updateInterval: 50 + Math.random() * 100
            });
        }
    }

    window.addEventListener('resize', handleResize);

    animate();
    return canvas;
}

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

    // Create THREE sets for seamless infinite scroll
    const tripleLogos = [...logos, ...logos, ...logos];

    tripleLogos.forEach(logo => {
        const logoItem = document.createElement('div');
        logoItem.className = 'logo-item';
        logoItem.innerHTML = `
            <img src="${logo.src}" alt="${logo.name}" title="${logo.name}">
        `;
        track.appendChild(logoItem);
    });

    carousel.appendChild(track);

    // Infinite scroll implementation
    let translateX = 0;
    const scrollSpeed = 0.5; // Pixels per frame (adjust for speed)
    const logoWidth = 120; // Approximate width of each logo + gap
    const resetPoint = -(logoWidth * logos.length); // When to reset position

    function animate() {
        translateX -= scrollSpeed;

        // Reset position when first set of logos is completely off-screen
        if (translateX <= resetPoint) {
            translateX = 0;
        }

        track.style.transform = `translateX(${translateX}px)`;
        requestAnimationFrame(animate);
    }

    // Start animation when carousel is added to DOM
    setTimeout(() => {
        animate();
    }, 100);

    // Pause on hover (optional)
    let isPaused = false;

    carousel.addEventListener('mouseenter', () => {
        isPaused = true;
    });

    carousel.addEventListener('mouseleave', () => {
        isPaused = false;
    });

    // Modified animation function with pause capability
    function animateWithPause() {
        if (!isPaused) {
            translateX -= scrollSpeed;

            if (translateX <= resetPoint) {
                translateX = 0;
            }

            track.style.transform = `translateX(${translateX}px)`;
        }
        requestAnimationFrame(animateWithPause);
    }

    // Use the pause-capable animation
    setTimeout(() => {
        animateWithPause();
    }, 100);

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
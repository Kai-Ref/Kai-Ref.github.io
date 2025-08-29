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

// -------------------- UPDATED Timeline Generation with Configurable Overlap Prevention --------------------
document.addEventListener('DOMContentLoaded', async () => {
    const timelineGrid = document.querySelector(".timeline-grid");
    if (!timelineGrid) return;

    try {
        const response = await fetch("timeline.json");
        if (!response.ok) throw new Error('Failed to fetch timeline.json');
        const data = await response.json();

        // ===== CONFIGURABLE PARAMETERS =====
        const CONFIG = {
            minSpacing: 50,           // Minimum space between boxes (increase to 40-60 if still overlapping)
            minBoxHeight: 80,         // Minimum height for each box
            monthHeight: 35,          // Height per month (increase to 35-40 for more space)
            maxCompressionRatio: 0.7, // Don't compress boxes below 70% of their ideal height
            forceSpacing: true,       // Set to true to prioritize spacing over exact positioning
            extraTimelinePadding: 300 // Extra space at bottom of timeline
        };
        // ===================================

        // Function to convert YYYY-MM to a numeric value for sorting and positioning
        function dateToNumeric(dateStr) {
            const [year, month] = dateStr.split('-').map(Number);
            return year + (month - 1) / 12; // Convert to decimal years
        }

        // Sort by start date (NEWEST FIRST - REVERSED)
        const sortedData = [...data].sort((a, b) => dateToNumeric(b.start) - dateToNumeric(a.start));

        // Calculate timeline dimensions with monthly precision
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const currentDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;

        // Set timeline end to March 2026 or the latest end date, whichever is later
        const march2026 = dateToNumeric("2026-03");

        const allDates = [];
        sortedData.forEach(item => {
            allDates.push(dateToNumeric(item.start));
            allDates.push(dateToNumeric(item.end || currentDate));
        });

        const minDate = Math.min(...allDates);
        const latestDataDate = Math.max(...allDates);
        const maxDate = Math.max(march2026, latestDataDate);
        const totalTimeSpan = Math.max(0.5, maxDate - minDate);

        const totalHeight = totalTimeSpan * 12 * CONFIG.monthHeight; // Use configurable month height

        // Set timeline height
        const timeline = document.querySelector('.timeline');
        if (timeline) {
            timeline.style.minHeight = `${totalHeight + CONFIG.extraTimelinePadding + 400}px`;
        }

        // Create year and month markers
        const yearMarkers = new Set();
        const monthMarkers = [];

        // Function to format dates for display
        function formatDate(dateStr) {
            if (!dateStr) return 'Present';
            const [year, month] = dateStr.split('-');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${monthNames[parseInt(month) - 1]} ${year}`;
        }

        // First pass: calculate initial positions for all items
        const itemData = [];

        sortedData.forEach((entry, index) => {
            const startDate = dateToNumeric(entry.start);
            const endDate = dateToNumeric(entry.end || currentDate);

            // For reversed timeline: calculate positions from the top (newest first)
            const endPosition = ((maxDate - endDate) / totalTimeSpan) * totalHeight;
            const startPosition = ((maxDate - startDate) / totalTimeSpan) * totalHeight;
            const itemHeight = Math.max(CONFIG.minBoxHeight, startPosition - endPosition);

            const sideClass = entry.type === "education" ? "left" : "right";

            itemData.push({
                entry,
                startDate,
                endDate,
                idealTop: endPosition,
                idealBottom: startPosition,
                idealHeight: itemHeight,
                sideClass,
                index
            });

            // Add year markers
            const startYear = Math.floor(startDate);
            const endYear = Math.floor(endDate);
            yearMarkers.add(startYear);
            if (endYear !== startYear) {
                yearMarkers.add(endYear);
            }

            // Add start and end month markers
            monthMarkers.push({ date: startDate, label: formatDate(entry.start) });
            if (entry.end) {
                monthMarkers.push({ date: endDate, label: formatDate(entry.end) });
            }
        });

        // Second pass: adjust positions to prevent overlaps within each side
        const leftItems = itemData.filter(item => item.sideClass === "left").sort((a, b) => a.idealTop - b.idealTop);
        const rightItems = itemData.filter(item => item.sideClass === "right").sort((a, b) => a.idealTop - b.idealTop);

        function adjustPositions(items) {
            const adjustedItems = [];

            items.forEach((item, i) => {
                let adjustedTop = item.idealTop;
                let adjustedHeight = item.idealHeight;

                // Check for overlaps with previously placed items
                for (let j = 0; j < adjustedItems.length; j++) {
                    const prevItem = adjustedItems[j];
                    const prevBottom = prevItem.finalTop + prevItem.finalHeight;

                    // If current item overlaps with previous item
                    if (adjustedTop < prevBottom + CONFIG.minSpacing) {
                        // Move current item down
                        adjustedTop = prevBottom + CONFIG.minSpacing;

                        if (CONFIG.forceSpacing) {
                            // Prioritize spacing - allow items to extend beyond their ideal time boundaries
                            adjustedHeight = Math.max(CONFIG.minBoxHeight, item.idealHeight);
                        } else {
                            // Try to stay within time boundaries
                            const maxAllowedBottom = item.idealBottom;
                            if (adjustedTop + item.idealHeight > maxAllowedBottom) {
                                const availableHeight = maxAllowedBottom - adjustedTop;
                                const minAllowedHeight = Math.max(CONFIG.minBoxHeight, item.idealHeight * CONFIG.maxCompressionRatio);
                                adjustedHeight = Math.max(minAllowedHeight, availableHeight);
                            } else {
                                adjustedHeight = item.idealHeight;
                            }
                        }
                    }
                }

                adjustedItems.push({
                    ...item,
                    finalTop: adjustedTop,
                    finalHeight: adjustedHeight,
                    finalBottom: adjustedTop + adjustedHeight
                });
            });

            return adjustedItems;
        }

        // Adjust positions for both sides
        const adjustedLeftItems = adjustPositions(leftItems);
        const adjustedRightItems = adjustPositions(rightItems);
        const allAdjustedItems = [...adjustedLeftItems, ...adjustedRightItems];

        // Check if timeline height needs to be extended due to adjustments
        const maxUsedHeight = Math.max(...allAdjustedItems.map(item => item.finalBottom));
        const originalTotalHeight = totalHeight;
        if (maxUsedHeight > originalTotalHeight) {
            const newTotalHeight = maxUsedHeight + CONFIG.extraTimelinePadding;
            const timeline = document.querySelector('.timeline');
            if (timeline) {
                timeline.style.minHeight = `${newTotalHeight + 400}px`;
            }
        }

        // Third pass: create the actual timeline items with adjusted positions
        allAdjustedItems.forEach(({ entry, finalTop, finalHeight, sideClass }) => {
            // Create timeline item
            const item = document.createElement("div");
            item.className = "timeline-item " + sideClass;
            item.style.position = "absolute";
            item.style.top = finalTop + "px";
            item.style.height = finalHeight + "px";

            const endText = entry.end ? formatDate(entry.end) : 'Present';
            const startText = formatDate(entry.start);
            const companyOrInstitution = entry.company || entry.institution || '';

            item.innerHTML = `
                <div class="timeline-content ${sideClass}">
                    ${entry.logo ? `<img src="${entry.logo}" class="timeline-logo">` : ''}
                    <h3>${entry.title}</h3>
                    <div class="company">${companyOrInstitution}</div>
                    <div class="description">${entry.description || ''}</div>
                    <div class="duration">${startText} - ${endText}</div>
                </div>
            `;

            timelineGrid.appendChild(item);
        });

        // Create year markers on the timeline line
        yearMarkers.forEach(year => {
            const yearPosition = ((maxDate - year) / totalTimeSpan) * totalHeight;
            const yearMarker = document.createElement("div");
            yearMarker.className = "timeline-year-marker";
            yearMarker.style.top = `${yearPosition}px`;
            yearMarker.textContent = year.toString();
            yearMarker.style.backgroundColor = '#00bcd4';
            yearMarker.style.fontSize = '0.9rem';
            yearMarker.style.fontWeight = '700';
            timelineGrid.appendChild(yearMarker);
        });

        // Add March 2026 marker if it extends beyond the data
        if (maxDate === march2026 && march2026 > latestDataDate) {
            const march2026Position = ((maxDate - march2026) / totalTimeSpan) * totalHeight;
            const futureMarker = document.createElement("div");
            futureMarker.className = "timeline-year-marker";
            futureMarker.style.top = `${march2026Position}px`;
            futureMarker.textContent = "Mar 2026";
            futureMarker.style.backgroundColor = '#ff6b6b';
            futureMarker.style.color = 'white';
            futureMarker.style.fontSize = '0.8rem';
            futureMarker.style.fontWeight = '600';
            timelineGrid.appendChild(futureMarker);
        }

        // Create month markers (smaller, less prominent)
        const uniqueMonths = [...new Set(monthMarkers.map(m => m.date))].sort((a, b) => b - a);
        uniqueMonths.forEach(monthDate => {
            const monthPosition = ((maxDate - monthDate) / totalTimeSpan) * totalHeight;
            const monthMarker = document.createElement("div");
            monthMarker.className = "timeline-month-marker";
            monthMarker.style.position = 'absolute';
            monthMarker.style.left = '50%';
            monthMarker.style.transform = 'translateX(-50%)';
            monthMarker.style.top = `${monthPosition}px`;
            monthMarker.style.backgroundColor = '#e0e0e0';
            monthMarker.style.color = '#666';
            monthMarker.style.padding = '0.15rem 0.5rem';
            monthMarker.style.borderRadius = '8px';
            monthMarker.style.fontSize = '0.7rem';
            monthMarker.style.fontWeight = '500';
            monthMarker.style.zIndex = '15';
            monthMarker.style.whiteSpace = 'nowrap';

            const [year, month] = monthDate.toString().split('.');
            const monthNum = Math.round((monthDate - Math.floor(monthDate)) * 12) + 1;
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            monthMarker.textContent = monthNames[monthNum - 1] || '';

            // Only show month markers that don't overlap with year markers
            const nearestYear = Math.round(monthDate);
            if (Math.abs(monthDate - nearestYear) > 0.08) { // More than ~1 month from year boundary
                timelineGrid.appendChild(monthMarker);
            }
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
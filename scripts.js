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

// -------------------- UPDATED Timeline Generation with Interactive Popup --------------------
document.addEventListener('DOMContentLoaded', async () => {
    const timelineGrid = document.querySelector(".timeline-grid");
    if (!timelineGrid) return;

    try {
        const response = await fetch("timeline.json");
        if (!response.ok) throw new Error('Failed to fetch timeline.json');
        const data = await response.json();

        // ===== CONFIGURABLE PARAMETERS =====
        const CONFIG = {
            minSpacing: 50,
            minBoxHeight: 80,
            monthHeight: 35,
            maxCompressionRatio: 0.7,
            forceSpacing: true,
            extraTimelinePadding: 300
        };

        // Global state for popup system
        let allItems = [];
        let currentActiveIndex = -1;
        let popupElement = null;

        // Function to convert YYYY-MM to a numeric value for sorting and positioning
        function dateToNumeric(dateStr) {
            const [year, month] = dateStr.split('-').map(Number);
            return year + (month - 1) / 12;
        }

        // Sort by start date (NEWEST FIRST - REVERSED)
        const sortedData = [...data].sort((a, b) => dateToNumeric(b.start) - dateToNumeric(a.start));

        // Calculate timeline dimensions
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const currentDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;

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
        const totalHeight = totalTimeSpan * 12 * CONFIG.monthHeight;

        const timeline = document.querySelector('.timeline');
        if (timeline) {
            timeline.style.minHeight = `${totalHeight + CONFIG.extraTimelinePadding + 400}px`;
        }

        const yearMarkers = new Set();
        const monthMarkers = [];

        function formatDate(dateStr) {
            if (!dateStr) return 'Present';
            const [year, month] = dateStr.split('-');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${monthNames[parseInt(month) - 1]} ${year}`;
        }

        // Create popup element
        function createPopup() {
            const popup = document.createElement('div');
            popup.className = 'timeline-popup';
            popup.innerHTML = `
                <div class="timeline-popup-header">
                    <div class="timeline-popup-nav">
                        <button id="popup-prev" title="Previous">←</button>
                        <button id="popup-next" title="Next">→</button>
                    </div>
                    <button class="timeline-popup-close" id="popup-close">×</button>
                </div>
                <div class="timeline-popup-content" id="popup-content">
                    <!-- Content will be populated here -->
                </div>
            `;
            document.body.appendChild(popup);
            return popup;
        }

        // Update popup content
        function updatePopupContent(entry, index) {
            const content = document.getElementById('popup-content');
            const prevBtn = document.getElementById('popup-prev');
            const nextBtn = document.getElementById('popup-next');

            const endText = entry.end ? formatDate(entry.end) : 'Present';
            const startText = formatDate(entry.start);
            const companyOrInstitution = entry.company || entry.institution || '';

            // Handle rich HTML description or fallback to plain text
            const description = entry.descriptionHtml || entry.description || 'No description available.';

            // Add sample skills if not present
            const skills = entry.skills || [];

            content.innerHTML = `
                ${entry.logo ? `<img src="${entry.logo}" class="logo" alt="${companyOrInstitution} logo">` : ''}
                <h3>${entry.title}</h3>
                <div class="company">${companyOrInstitution}</div>
                <div class="duration">${startText} - ${endText}</div>
                <div class="description">${description}</div>
                ${skills.length > 0 ? `
                    <div class="skills">
                        <h4>Skills & Technologies</h4>
                        <div class="skills-list">
                            ${skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
            `;

            // Update navigation buttons
            prevBtn.disabled = index === 0;
            nextBtn.disabled = index === allItems.length - 1;

            currentActiveIndex = index;
        }
        // Show popup
        function showPopup(entry, index, shouldStick = false) {
            if (!popupElement) {
                popupElement = createPopup();

                // Add event listeners
                document.getElementById('popup-close').addEventListener('click', hidePopup);
                document.getElementById('popup-prev').addEventListener('click', () => {
                    if (currentActiveIndex > 0) {
                        navigateToItem(currentActiveIndex - 1);
                    }
                });
                document.getElementById('popup-next').addEventListener('click', () => {
                    if (currentActiveIndex < allItems.length - 1) {
                        navigateToItem(currentActiveIndex + 1);
                    }
                });
            }

            updatePopupContent(entry, index);
            popupElement.classList.add('visible');
            popupElement.dataset.sticky = shouldStick;

            // Highlight active timeline item
            document.querySelectorAll('.timeline-content').forEach(el => el.classList.remove('active'));
            const activeElement = document.querySelector(`[data-timeline-index="${index}"]`);
            if (activeElement) {
                activeElement.classList.add('active');
            }
        }

        // Hide popup
        function hidePopup() {
            if (popupElement) {
                popupElement.classList.remove('visible');
                popupElement.dataset.sticky = 'false';
                document.querySelectorAll('.timeline-content').forEach(el => el.classList.remove('active'));
                currentActiveIndex = -1;
            }
        }

        // Navigate to specific item
        function navigateToItem(index) {
            if (index >= 0 && index < allItems.length) {
                showPopup(allItems[index].entry, index, true);
            }
        }

        // Process timeline items
        const itemData = [];

        sortedData.forEach((entry, index) => {
            const startDate = dateToNumeric(entry.start);
            const endDate = dateToNumeric(entry.end || currentDate);
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

            const startYear = Math.floor(startDate);
            const endYear = Math.floor(endDate);
            yearMarkers.add(startYear);
            if (endYear !== startYear) {
                yearMarkers.add(endYear);
            }

            monthMarkers.push({ date: startDate, label: formatDate(entry.start) });
            if (entry.end) {
                monthMarkers.push({ date: endDate, label: formatDate(entry.end) });
            }
        });

        // Adjust positions to prevent overlaps
        const leftItems = itemData.filter(item => item.sideClass === "left").sort((a, b) => a.idealTop - b.idealTop);
        const rightItems = itemData.filter(item => item.sideClass === "right").sort((a, b) => a.idealTop - b.idealTop);

        function adjustPositions(items) {
            const adjustedItems = [];

            items.forEach((item, i) => {
                let adjustedTop = item.idealTop;
                let adjustedHeight = item.idealHeight;

                for (let j = 0; j < adjustedItems.length; j++) {
                    const prevItem = adjustedItems[j];
                    const prevBottom = prevItem.finalTop + prevItem.finalHeight;

                    if (adjustedTop < prevBottom + CONFIG.minSpacing) {
                        adjustedTop = prevBottom + CONFIG.minSpacing;

                        if (CONFIG.forceSpacing) {
                            adjustedHeight = Math.max(CONFIG.minBoxHeight, item.idealHeight);
                        } else {
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

        const adjustedLeftItems = adjustPositions(leftItems);
        const adjustedRightItems = adjustPositions(rightItems);
        const allAdjustedItems = [...adjustedLeftItems, ...adjustedRightItems];

        // Store all items for navigation
        allItems = allAdjustedItems.sort((a, b) => dateToNumeric(b.entry.start) - dateToNumeric(a.entry.start));

        // Check if timeline height needs extension
        const maxUsedHeight = Math.max(...allAdjustedItems.map(item => item.finalBottom));
        if (maxUsedHeight > totalHeight) {
            const newTotalHeight = maxUsedHeight + CONFIG.extraTimelinePadding;
            timeline.style.minHeight = `${newTotalHeight + 400}px`;
        }

        // Create timeline items with interaction
        allAdjustedItems.forEach(({ entry, finalTop, finalHeight, sideClass }, adjustedIndex) => {
            const item = document.createElement("div");
            item.className = "timeline-item " + sideClass;
            item.style.position = "absolute";
            item.style.top = finalTop + "px";
            item.style.height = finalHeight + "px";

            const endText = entry.end ? formatDate(entry.end) : 'Present';
            const startText = formatDate(entry.start);
            const companyOrInstitution = entry.company || entry.institution || '';

            // Find the correct index in the sorted allItems array
            const globalIndex = allItems.findIndex(item => item.entry === entry);

            // Timeline box content - NO DESCRIPTION HERE
            item.innerHTML = `
                <div class="timeline-content ${sideClass}" data-timeline-index="${globalIndex}">
                    ${entry.logo ? `<img src="${entry.logo}" class="timeline-logo">` : ''}
                    <h3>${entry.title}</h3>
                    <div class="company">${companyOrInstitution}</div>
                    <div class="duration">${startText} - ${endText}</div>
                </div>
            `;

            // Add event listeners for hover and click
            const contentEl = item.querySelector('.timeline-content');

            contentEl.addEventListener('mouseenter', () => {
                if (!popupElement || popupElement.dataset.sticky !== 'true') {
                    showPopup(entry, globalIndex, false);
                }
            });

            contentEl.addEventListener('mouseleave', () => {
                if (popupElement && popupElement.dataset.sticky !== 'true') {
                    setTimeout(() => {
                        if (popupElement && popupElement.dataset.sticky !== 'true') {
                            hidePopup();
                        }
                    }, 200);
                }
            });

            contentEl.addEventListener('click', () => {
                showPopup(entry, globalIndex, true);
            });

            timelineGrid.appendChild(item);
        });

        // Create year markers
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

        // Add March 2026 marker
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

        // Create month markers
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

            const nearestYear = Math.round(monthDate);
            if (Math.abs(monthDate - nearestYear) > 0.08) {
                timelineGrid.appendChild(monthMarker);
            }
        });

        // Fade-in effect
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

        // Close popup when clicking outside
        document.addEventListener('click', (e) => {
            if (popupElement &&
                !popupElement.contains(e.target) &&
                !e.target.closest('.timeline-content')) {
                hidePopup();
            }
        });

    } catch (err) {
        console.error("Failed to load timeline:", err);
        timelineGrid.innerHTML = '<p style="text-align: center; color: #666;">Failed to load timeline data.</p>';
    }
});
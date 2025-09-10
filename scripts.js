// -------------------- Contact Form --------------------
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const responseEl = document.getElementById('form-response');
        const formData = new FormData(this);

        try {
            const response = await fetch(this.action, {
                method: 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                responseEl.textContent = "Thank you! Your message has been sent.";
                responseEl.classList.add('show');   // Add class to fade in
                this.reset();
            } else {
                responseEl.textContent = "Oops! Something went wrong.";
                responseEl.classList.add('show');
            }
        } catch (err) {
            responseEl.textContent = "Network error!";
            responseEl.classList.add('show');
        }
    });
}

// -------------------- Dynamic Blog List --------------------
async function loadBlogPosts() {
    const blogGrid = document.getElementById('blog-grid');
    if (!blogGrid) return;

    try {
        const response = await fetch('posts/posts.json');
        if (!response.ok) throw new Error('Failed to fetch posts.json');
        const posts = await response.json();

        // Sort by date descending
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));

        posts.forEach(post => {
            const card = createBlogCard(post);
            blogGrid.appendChild(card);
        });
    } catch (err) {
        console.error('Error loading blog posts:', err);
        blogGrid.innerHTML = '<p>Failed to load blog posts.</p>';
    }
}

// -------------------- Dynamic Projects List --------------------
async function loadProjects() {
    const projectsGrid = document.getElementById('projects-grid');
    if (!projectsGrid) return;

    try {
        const response = await fetch('data/projects.json');
        if (!response.ok) throw new Error('Failed to fetch projects.json');
        const projects = await response.json();

        // Sort by date descending
        projects.sort((a, b) => new Date(b.date) - new Date(a.date));

        projects.forEach(project => {
            const card = createProjectCard(project);
            projectsGrid.appendChild(card);
        });
    } catch (err) {
        console.error('Error loading projects:', err);
        projectsGrid.innerHTML = '<p>Failed to load projects.</p>';
    }
}

// Initialize content based on page
if (document.getElementById('blog-grid')) {
    window.addEventListener('DOMContentLoaded', loadBlogPosts);
}

if (document.getElementById('projects-grid')) {
    window.addEventListener('DOMContentLoaded', loadProjects);
}

// -------------------- Enhanced Contact Form --------------------
// const contactForm = document.getElementById('contact-form');
// if (contactForm) {
//     contactForm.addEventListener('submit', function (e) {
//         e.preventDefault();
//         const name = this.name.value;
//         const email = this.email.value;
//         const subject = this.subject.value;
//         const message = this.message.value;

//         console.log({ name, email, subject, message });
//         const responseEl = document.getElementById('form-response');
//         if (responseEl) {
//             responseEl.textContent = "Thank you! Your message has been sent.";
//             responseEl.classList.add('show');
//         }
//         this.reset();
//     });
// }

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

            // Build company/institution section with optional links
            let companySection = companyOrInstitution;
            if (entry.website || entry.linkedin) {
                const links = [];
                if (entry.website) {
                    links.push(`<a href="${entry.website}" target="_blank" title="Visit website" class="company-link website-link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                    </a>`);
                }
                if (entry.linkedin) {
                    links.push(`<a href="${entry.linkedin}" target="_blank" title="View LinkedIn" class="company-link linkedin-link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                    </a>`);
                }
                companySection = `${companyOrInstitution} ${links.join(' ')}`;
            }

            content.innerHTML = `
                ${entry.logo ? `<img src="${entry.logo}" class="logo" alt="${companyOrInstitution} logo">` : ''}
                <h3>${entry.title}</h3>
                <div class="company">${companySection}</div>
                ${entry.location ? `<div class="location">📍 ${entry.location}</div>` : ''}
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
                <div class="timeline-content-text">
                    <h3>${entry.title}</h3>
                    <div class="company">${companyOrInstitution}</div>
                    <div class="duration">${startText} - ${endText}</div>
                </div>
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

document.addEventListener('DOMContentLoaded', function () {
    const toc = document.getElementById('toc');
    if (!toc) return;

    // Select all h4 and h5 headings inside main content
    const headings = document.querySelectorAll('.main-content h2, .main-content h4, .main-content h5');

    headings.forEach(heading => {
        // Ensure the heading has an ID
        if (!heading.id) {
            heading.id = heading.textContent.trim().replace(/\s+/g, '-').toLowerCase();
        }

        const li = document.createElement('li');
        const a = document.createElement('a');

        a.href = `#${heading.id}`;
        a.textContent = heading.textContent;

        // Optional: indent h5 entries
        if (heading.tagName === 'H5') {
            li.style.marginLeft = '1.5rem';
        }

        li.appendChild(a);
        toc.appendChild(li);
    });
});

const slides = document.querySelectorAll('.photo-slide');

slides.forEach(slide => {
    const images = slide.querySelectorAll('img');
    let current = 0;

    if (images.length > 1) {
        images[current].classList.add('active');

        setInterval(() => {
            images[current].classList.remove('active');
            current = (current + 1) % images.length;
            images[current].classList.add('active');
        }, 4000); // 5000ms = 5s
    } else {
        images[0].classList.add('active'); // single image stays visible
    }
});

document.querySelectorAll('.photo-slide img').forEach(img => {
    img.addEventListener('load', () => {
        if (img.naturalHeight > img.naturalWidth) {
            img.classList.add('portrait');
        } else {
            img.classList.add('landscape');
        }
    });
});

// List of profile pictures
const profilePics = [
    "img/profile_pics/1.jpg",
    "img/profile_pics/2.jpg",
    "img/profile_pics/3.jpg",
    "img/profile_pics/4.jpeg",
    "img/profile_pics/5.jpeg",
    "img/profile_pics/6.jpeg",
    "img/profile_pics/7.jpeg",
    "img/profile_pics/8.jpeg",
    "img/profile_pics/9.jpeg"
];

let currentPic = 0;
const profileImg = document.getElementById("profile-pic");

// Change picture every 5 seconds
setInterval(() => {
    currentPic = (currentPic + 1) % profilePics.length;
    profileImg.src = profilePics[currentPic];
}, 5000);


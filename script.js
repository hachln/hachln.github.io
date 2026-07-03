// Typewriter Effect for the Hero Section
const textArray = ["~ Hello, I'm Melvin!", "I build Websites & WebApps.", "I love learning new things.", "I solve hard problems."];
const typingDelay = 90;
const erasingDelay = 40;
const newTextDelay = 2200; 
let textArrayIndex = 0;
let charIndex = 0;

const typewriterElement = document.getElementById("typewriter");

function type() {
    if (charIndex < textArray[textArrayIndex].length) {
        typewriterElement.textContent += textArray[textArrayIndex].charAt(charIndex);
        charIndex++;
        setTimeout(type, typingDelay);
    } else {
        setTimeout(erase, newTextDelay);
    }
}

function erase() {
    if (charIndex > 0) {
        typewriterElement.textContent = textArray[textArrayIndex].substring(0, charIndex - 1);
        charIndex--;
        setTimeout(erase, erasingDelay);
    } else {
        textArrayIndex++;
        if (textArrayIndex >= textArray.length) textArrayIndex = 0;
        setTimeout(type, typingDelay + 1100);
    }
}

document.addEventListener("DOMContentLoaded", function() {
    // Start typing effect with a small initial delay
    if(textArray.length) setTimeout(type, 1000);

    // Smooth Scrolling for navigation links
    document.querySelectorAll('.navbar a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
});

/* =========================================
   CAROUSEL LOGIC (For Project Pages)
   ========================================= */
const track = document.querySelector('.carousel-track');
const slides = Array.from(track ? track.children : []);
const nextButton = document.querySelector('.next-btn');
const prevButton = document.querySelector('.prev-btn');
const dotsNav = document.querySelector('.carousel-nav');

if (track && slides.length > 0) {
    // 1. Auto-generate the correct number of dots
    dotsNav.innerHTML = ''; 
    slides.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.className = 'carousel-indicator';
        if (index === 0) dot.classList.add('current-indicator');
        dotsNav.appendChild(dot);
    });
    const dots = Array.from(dotsNav.children);

    // 2. Position the slides (and update on window resize so it doesn't break)
    const setPositions = () => {
        const slideWidth = slides[0].getBoundingClientRect().width;
        slides.forEach((slide, index) => {
            slide.style.left = slideWidth * index + 'px';
        });
        // Snap back to current slide to prevent visual bugs on resize
        const currentSlide = track.querySelector('.current-slide') || slides[0];
        track.style.transform = 'translateX(-' + currentSlide.style.left + ')';
    };
    
    setPositions();
    window.addEventListener('resize', setPositions);

    // 3. Main movement function
    const moveToSlide = (currentSlide, targetSlide, currentDot, targetDot) => {
        track.style.transform = 'translateX(-' + targetSlide.style.left + ')';
        currentSlide.classList.remove('current-slide');
        targetSlide.classList.add('current-slide');
        
        currentDot.classList.remove('current-indicator');
        targetDot.classList.add('current-indicator');
    };

    // 4. Click Right (With perfect looping)
    nextButton.addEventListener('click', () => {
        const currentSlide = track.querySelector('.current-slide');
        const currentIndex = slides.indexOf(currentSlide);
        // This math guarantees it loops back to 0 when it hits the end
        const nextIndex = (currentIndex + 1) % slides.length; 
        
        moveToSlide(currentSlide, slides[nextIndex], dots[currentIndex], dots[nextIndex]);
    });

    // 5. Click Left (With perfect looping)
    prevButton.addEventListener('click', () => {
        const currentSlide = track.querySelector('.current-slide');
        const currentIndex = slides.indexOf(currentSlide);
        // This math guarantees it loops to the end when clicking left on the first image
        const prevIndex = (currentIndex - 1 + slides.length) % slides.length; 
        
        moveToSlide(currentSlide, slides[prevIndex], dots[currentIndex], dots[prevIndex]);
    });

    // 6. Click on a specific dot
    dotsNav.addEventListener('click', e => {
        const targetDot = e.target.closest('button');
        if (!targetDot) return;

        const currentSlide = track.querySelector('.current-slide');
        const currentDot = dotsNav.querySelector('.current-indicator');
        const targetIndex = dots.findIndex(dot => dot === targetDot);

        moveToSlide(currentSlide, slides[targetIndex], currentDot, targetDot);
    });
}

document.addEventListener("DOMContentLoaded", function() {
    const latestGrid = document.getElementById('latest-projects-grid');
    
    if (latestGrid) {
        // Fetch the HTML from your projects page
        fetch('projectsp.html')
            .then(response => response.text())
            .then(html => {
                // Parse the fetched string into a readable DOM object
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // Select all project cards from the fetched page
                const allProjects = doc.querySelectorAll('.project-card');
                
                // Loop through and append only the first 3
                for (let i = 0; i < 3 && i < allProjects.length; i++) {
                    latestGrid.appendChild(allProjects[i]);
                }
            })
            .catch(error => {
                console.error('Error loading projects:', error);
                latestGrid.innerHTML = '<p style="color: var(--color-red);">Failed to load projects. Please try again.</p>';
            });
    }
});
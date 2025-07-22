// Themes Page JavaScript (Updated)

let selectedTheme = null;

// Theme data
const themeData = {
    fantasy: {
        name: 'High Fantasy',
        description: 'Mystical designs with rich purples and gold accents'
    },
    romance: {
        name: 'Romance',
        description: 'Elegant layouts with soft, romantic colors'
    },
    apocalypse: {
        name: 'Apocalypse',
        description: 'Dark, gritty atmosphere for dystopian stories'
    },
    steampunk: {
        name: 'Steampunk',
        description: 'Victorian elements with brass and copper tones'
    },
    drama: {
        name: 'Contemporary Drama',
        description: 'Clean, sophisticated design for literary works'
    }
};

// Initialize theme interactions
function initializeThemeInteractions() {
    const viewDemoButtons = document.querySelectorAll('.view-demo-btn');
    const selectThemeButtons = document.querySelectorAll('.select-theme-btn');
    const buildPackageButtons = document.querySelectorAll('.build-package-btn'); // New: Build Package buttons
    
    // Handle view demo buttons
    viewDemoButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const theme = button.getAttribute('data-theme');
            viewThemeDemo(theme);
        });
    });
    
    // Handle select theme buttons
    selectThemeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const theme = button.getAttribute('data-theme');
            selectTheme(theme);
        });
    });
    
    // NEW: Handle build package buttons
    buildPackageButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const theme = button.getAttribute('data-theme');
            buildPackageWithTheme(theme);
        });
    });
    
    // Also allow clicking on the entire theme section to view demo
    const themeSections = document.querySelectorAll('.theme-section');
    
    themeSections.forEach(section => {
        section.addEventListener('click', (e) => {
            // Don't trigger if clicking on buttons
            if (e.target.closest('.theme-actions')) return;
            
            const theme = section.getAttribute('data-theme');
            const viewButton = section.querySelector('.view-demo-btn');
            
            // Add visual feedback
            if (viewButton) {
                viewButton.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    viewButton.style.transform = 'scale(1)';
                    viewThemeDemo(theme);
                }, 150);
            }
        });
    });
}

// NEW: Handle building package with pre-selected theme
function buildPackageWithTheme(themeName) {
    selectedTheme = themeName;
    const themeInfo = themeData[themeName];
    
    // Store the selected theme for the services page
    sessionStorage.setItem('selectedTheme', themeName);
    
    // Add visual feedback to the button
    const button = document.querySelector(`[data-theme="${themeName}"].build-package-btn`);
    if (button) {
        button.style.transform = 'scale(0.95)';
        button.textContent = 'Loading...';
        
        setTimeout(() => {
            // Navigate to services page
            window.location.href = '/services/';
        }, 300);
    } else {
        // Fallback if button not found
        window.location.href = '/services/';
    }
    
    // Add analytics or tracking if needed
    console.log(`Building package with theme: ${themeInfo.name}`);
}

// Handle theme demo viewing
function viewThemeDemo(themeName) {
    selectedTheme = themeName;
    
    // Store the current scroll position and viewed theme
    sessionStorage.setItem('viewedTheme', themeName);
    sessionStorage.setItem('themesPageScrollPosition', window.pageYOffset);
    
    // Redirect to demo page
    window.location.href = `/demos/${themeName}/`;
    
    // Add analytics or tracking if needed
    console.log(`Viewing demo: ${themeData[themeName].name}`);
}

// Handle theme selection (shows modal)
function selectTheme(themeName) {
    selectedTheme = themeName;
    const themeInfo = themeData[themeName];
    
    // Update modal content
    const modalThemeName = document.getElementById('selectedThemeName');
    if (modalThemeName) {
        modalThemeName.textContent = themeInfo.name;
    }
    
    // Store selection for services page
    sessionStorage.setItem('selectedTheme', themeName);
    
    // Show modal
    showThemeModal();
    
    // Add analytics or tracking if needed
    console.log(`Theme selected: ${themeInfo.name}`);
}

// Show theme selection modal
function showThemeModal() {
    const modal = document.getElementById('themeModal');
    if (modal) {
        modal.classList.add('active');
        
        // Add event listener for clicking outside modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeThemeModal();
            }
        });
        
        // Add escape key listener
        document.addEventListener('keydown', handleModalEscape);
    }
}

// Close theme modal
function closeThemeModal() {
    const modal = document.getElementById('themeModal');
    if (modal) {
        modal.classList.remove('active');
        
        // Remove event listeners
        document.removeEventListener('keydown', handleModalEscape);
    }
}

// Handle escape key for modal
function handleModalEscape(e) {
    if (e.key === 'Escape') {
        closeThemeModal();
    }
}

// Check for returning from demo and scroll to viewed theme
function handleReturnFromDemo() {
    const urlParams = new URLSearchParams(window.location.search);
    const returnedTheme = urlParams.get('viewed');
    
    if (returnedTheme && themeData[returnedTheme]) {
        // Scroll to the viewed theme
        setTimeout(() => {
            scrollToTheme(returnedTheme);
            
            // Highlight the theme briefly
            const themeSection = document.querySelector(`[data-theme="${returnedTheme}"]`);
            if (themeSection) {
                themeSection.style.boxShadow = '0 20px 40px rgba(255, 171, 2, 0.3)';
                themeSection.style.transform = 'translateY(-5px)';
                
                setTimeout(() => {
                    themeSection.style.boxShadow = '';
                    themeSection.style.transform = '';
                }, 2000);
            }
        }, 500);
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Scroll to specific theme
function scrollToTheme(themeName) {
    const themeSection = document.querySelector(`[data-theme="${themeName}"]`);
    if (themeSection) {
        themeSection.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
}

// Initialize scroll animations
function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                
                // Stagger animations for custom examples
                if (entry.target.classList.contains('custom-example')) {
                    const siblings = Array.from(entry.target.parentElement.children);
                    const index = siblings.indexOf(entry.target);
                    entry.target.style.animationDelay = `${index * 0.1}s`;
                }
                
                // Special handling for theme sections
                if (entry.target.classList.contains('theme-section')) {
                    const preview = entry.target.querySelector('.preview-browser');
                    const details = entry.target.querySelector('.theme-details');
                    
                    if (preview) {
                        setTimeout(() => {
                            preview.style.opacity = '1';
                            preview.style.transform = 'perspective(800px) rotateY(-5deg) rotateX(5deg)';
                        }, 200);
                    }
                    
                    if (details) {
                        setTimeout(() => {
                            details.style.opacity = '1';
                            details.style.transform = 'translateX(0)';
                        }, 400);
                    }
                }
            }
        });
    }, observerOptions);
    
    // Observe theme sections
    document.querySelectorAll('.theme-section').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(50px)';
        section.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        
        const preview = section.querySelector('.preview-browser');
        const details = section.querySelector('.theme-details');
        
        if (preview) {
            preview.style.opacity = '0';
            preview.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        }
        
        if (details) {
            details.style.opacity = '0';
            details.style.transform = 'translateX(30px)';
            details.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        }
        
        observer.observe(section);
    });
    
    // Observe custom examples
    document.querySelectorAll('.custom-example').forEach(example => {
        example.style.opacity = '0';
        example.style.transform = 'translateY(30px)';
        example.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(example);
    });
}

// Enhanced preview interactions
function initializePreviewEffects() {
    const previews = document.querySelectorAll('.preview-browser');
    
    previews.forEach(preview => {
        const section = preview.closest('.theme-section');
        
        if (section) {
            // Mouse move effect
            section.addEventListener('mousemove', (e) => {
                const rect = section.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                
                const rotateX = (y - 0.5) * 10;
                const rotateY = (x - 0.5) * -10;
                
                preview.style.transform = `perspective(800px) rotateY(${rotateY}deg) rotateX(${rotateX}deg) scale(1.02)`;
            });
            
            section.addEventListener('mouseleave', () => {
                preview.style.transform = 'perspective(800px) rotateY(-5deg) rotateX(5deg) scale(1)';
            });
        }
    });
}

// Animated elements control
function initializeAnimatedElements() {
    const animatedSections = document.querySelectorAll('.theme-section');
    
    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const particles = entry.target.querySelectorAll('.particle, .heart, .ash, .gear, .line');
            const lightning = entry.target.querySelector('.lightning');
            
            if (entry.isIntersecting) {
                // Start animations
                particles.forEach(element => {
                    element.style.animationPlayState = 'running';
                });
                if (lightning) lightning.style.animationPlayState = 'running';
            } else {
                // Pause animations for performance
                particles.forEach(element => {
                    element.style.animationPlayState = 'paused';
                });
                if (lightning) lightning.style.animationPlayState = 'paused';
            }
        });
    }, { threshold: 0.2 });
    
    animatedSections.forEach(section => {
        animationObserver.observe(section);
    });
}

// Theme section hover effects
function initializeThemeHoverEffects() {
    const themeSections = document.querySelectorAll('.theme-section');
    
    themeSections.forEach(section => {
        const buttons = section.querySelectorAll('.view-demo-btn, .select-theme-btn, .build-package-btn');
        
        section.addEventListener('mouseenter', () => {
            // Enhance buttons on section hover
            buttons.forEach(button => {
                if (button) {
                    button.style.transform = 'translateY(-2px) scale(1.05)';
                    button.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
                }
            });
            
            // Add glow effect to the section
            section.style.boxShadow = '0 20px 40px rgba(0,0,0,0.15), inset 0 0 0 2px rgba(255,255,255,0.1)';
        });
        
        section.addEventListener('mouseleave', () => {
            buttons.forEach(button => {
                if (button) {
                    button.style.transform = 'translateY(0) scale(1)';
                    button.style.boxShadow = '';
                }
            });
            section.style.boxShadow = '';
        });
    });
}

// Custom examples interaction
function initializeCustomExamples() {
    const examples = document.querySelectorAll('.custom-example');
    
    examples.forEach(example => {
        example.addEventListener('click', () => {
            // Visual feedback
            const preview = example.querySelector('.example-preview');
            if (preview) {
                preview.style.transform = 'scale(0.95)';
                
                setTimeout(() => {
                    preview.style.transform = 'scale(1)';
                    
                    // Show custom theme contact info
                    const genreSpan = example.querySelector('span');
                    if (genreSpan) {
                        showCustomThemeInfo(genreSpan.textContent);
                    }
                }, 150);
            }
        });
    });
}

// Show custom theme information
function showCustomThemeInfo(genreName) {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: var(--secondary-blue);
        color: white;
        padding: 1.5rem 2rem;
        border-radius: 15px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        max-width: 300px;
    `;
    
    notification.innerHTML = `
        <h4 style="margin: 0 0 0.5rem 0; font-size: 1.1rem;">Interested in ${genreName}?</h4>
        <p style="margin: 0 0 1rem 0; font-size: 0.9rem; opacity: 0.9;">Let's create a custom theme that perfectly captures your ${genreName.toLowerCase()} stories!</p>
        <a href="/contact/" style="color: #ffab02; text-decoration: none; font-weight: bold;">Get Started →</a>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
}

// Smooth section navigation
function initializeSectionNavigation() {
    const themeSections = document.querySelectorAll('.theme-section');
    let currentSection = 0;
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' && currentSection < themeSections.length - 1) {
            currentSection++;
            themeSections[currentSection].scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        } else if (e.key === 'ArrowUp' && currentSection > 0) {
            currentSection--;
            themeSections[currentSection].scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }
    });
    
    // Update current section on scroll
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const index = Array.from(themeSections).indexOf(entry.target);
                if (index !== -1) currentSection = index;
            }
        });
    }, { threshold: 0.5 });
    
    themeSections.forEach(section => {
        sectionObserver.observe(section);
    });
}

// Performance optimization
function optimizeAnimations() {
    // Reduce animations on slower devices
    const isSlowDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
    
    if (isSlowDevice) {
        const style = document.createElement('style');
        style.textContent = `
            .particle, .heart, .ash, .gear, .line, .lightning {
                animation-duration: 8s !important;
            }
            .preview-browser {
                transition-duration: 0.2s !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Pause animations when tab is not visible
    document.addEventListener('visibilitychange', () => {
        const animatedElements = document.querySelectorAll('[style*="animation"]');
        
        animatedElements.forEach(el => {
            if (document.hidden) {
                el.style.animationPlayState = 'paused';
            } else {
                el.style.animationPlayState = 'running';
            }
        });
    });
}

// Hero animation
function initializeHeroAnimation() {
    const heroContent = document.querySelector('.hero-content');
    if (!heroContent) return;
    
    const title = heroContent.querySelector('h1');
    const subtitle = heroContent.querySelector('.hero-subtitle');
    const badges = heroContent.querySelectorAll('.feature-badge');
    
    // Set initial states
    if (title) {
        title.style.opacity = '0';
        title.style.transform = 'translateY(30px)';
    }
    
    if (subtitle) {
        subtitle.style.opacity = '0';
        subtitle.style.transform = 'translateY(30px)';
    }
    
    badges.forEach(badge => {
        badge.style.opacity = '0';
        badge.style.transform = 'translateY(30px)';
    });
    
    // Animate in sequence
    if (title) {
        setTimeout(() => {
            title.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
            title.style.opacity = '1';
            title.style.transform = 'translateY(0)';
        }, 200);
    }
    
    if (subtitle) {
        setTimeout(() => {
            subtitle.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
            subtitle.style.opacity = '1';
            subtitle.style.transform = 'translateY(0)';
        }, 400);
    }
    
    badges.forEach((badge, index) => {
        setTimeout(() => {
            badge.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            badge.style.opacity = '1';
            badge.style.transform = 'translateY(0)';
        }, 600 + (index * 100));
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeHeroAnimation();
    initializeThemeInteractions();
    initializeScrollAnimations();
    initializePreviewEffects();
    initializeAnimatedElements();
    initializeThemeHoverEffects();
    initializeCustomExamples();
    initializeSectionNavigation();
    optimizeAnimations();
    
    // Handle returning from demo pages (only scroll if coming from demo)
    handleReturnFromDemo();
    
    // Add loaded class to body
    document.body.classList.add('loaded');
});

// Export functions for use in other scripts
window.themesPage = {
    viewThemeDemo,
    selectTheme,
    buildPackageWithTheme, // NEW: Export the new function
    scrollToTheme,
    handleReturnFromDemo,
    showThemeModal,
    closeThemeModal
};
// About Page Specific JavaScript

// Animate the savings counter
function animateSavingsCounter() {
    const savingsElement = document.querySelector('.savings-content h3');
    if (!savingsElement) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Extract numbers from the text
                const text = savingsElement.textContent;
                const numbers = text.match(/\$[\d,]+ - \$[\d,]+/);
                if (numbers) {
                    const [minSavings, maxSavings] = numbers[0].split(' - ').map(n => 
                        parseInt(n.replace(/[$,]/g, ''))
                    );
                    
                    // Animate the counter
                    let currentMin = 0;
                    let currentMax = 0;
                    const duration = 2000; // 2 seconds
                    const steps = 60;
                    const stepTime = duration / steps;
                    const minIncrement = minSavings / steps;
                    const maxIncrement = maxSavings / steps;
                    
                    const counter = setInterval(() => {
                        currentMin += minIncrement;
                        currentMax += maxIncrement;
                        
                        if (currentMin >= minSavings) {
                            currentMin = minSavings;
                            currentMax = maxSavings;
                            clearInterval(counter);
                        }
                        
                        savingsElement.textContent = `You Save $${Math.floor(currentMin).toLocaleString()} - $${Math.floor(currentMax).toLocaleString()}`;
                    }, stepTime);
                }
                
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    observer.observe(savingsElement);
}

// Comparison card hover effects
function initializeComparisonEffects() {
    const comparisonCards = document.querySelectorAll('.comparison-card');
    
    comparisonCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            if (this.classList.contains('ours')) {
                this.style.transform = 'scale(1.08)';
                this.style.boxShadow = '0 20px 50px rgba(255, 171, 2, 0.3)';
            } else {
                this.style.transform = 'translateY(-5px)';
                this.style.boxShadow = '0 15px 40px rgba(0,0,0,0.15)';
            }
        });
        
        card.addEventListener('mouseleave', function() {
            if (this.classList.contains('ours')) {
                this.style.transform = 'scale(1.05)';
                this.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
            } else {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
            }
        });
    });
}

// Transparency section animations
function initializeTransparencyAnimations() {
    const transparencyItems = document.querySelectorAll('.transparency-item');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0) scale(1)';
                }, index * 100); // Stagger the animations
            }
        });
    }, { threshold: 0.2 });
    
    transparencyItems.forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px) scale(0.95)';
        item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(item);
    });
}

// Values section animations
function initializeValuesAnimations() {
    const valueItems = document.querySelectorAll('.value-item');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    
                    // Animate the icon
                    const icon = entry.target.querySelector('.value-icon');
                    if (icon) {
                        icon.style.transform = 'scale(1.1)';
                        setTimeout(() => {
                            icon.style.transform = 'scale(1)';
                        }, 200);
                    }
                }, index * 150); // Stagger the animations
            }
        });
    }, { threshold: 0.3 });
    
    valueItems.forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(40px)';
        item.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
        
        const icon = item.querySelector('.value-icon');
        if (icon) {
            icon.style.transition = 'transform 0.3s ease';
        }
        
        observer.observe(item);
    });
}

// Story text typing effect (subtle)
function initializeStoryAnimation() {
    const storyParagraphs = document.querySelectorAll('.story-text p');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 200);
            }
        });
    }, { threshold: 0.4 });
    
    storyParagraphs.forEach(p => {
        p.style.opacity = '0';
        p.style.transform = 'translateY(20px)';
        p.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        observer.observe(p);
    });
}

// Price highlight animation
function initializePriceHighlights() {
    const priceElements = document.querySelectorAll('.price');
    
    priceElements.forEach(price => {
        price.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1)';
            this.style.color = 'var(--primary-orange)';
        });
        
        price.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
            this.style.color = 'var(--secondary-blue)';
        });
        
        price.style.transition = 'transform 0.3s ease, color 0.3s ease';
    });
}

// Hero text animation
function initializeHeroAnimation() {
    const heroTitle = document.querySelector('.about-hero h1');
    const heroSubtitle = document.querySelector('.hero-subtitle');
    
    if (heroTitle && heroSubtitle) {
        // Set initial state
        heroTitle.style.opacity = '0';
        heroTitle.style.transform = 'translateY(30px)';
        heroSubtitle.style.opacity = '0';
        heroSubtitle.style.transform = 'translateY(30px)';
        
        // Animate in
        setTimeout(() => {
            heroTitle.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
            heroTitle.style.opacity = '1';
            heroTitle.style.transform = 'translateY(0)';
        }, 200);
        
        setTimeout(() => {
            heroSubtitle.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
            heroSubtitle.style.opacity = '1';
            heroSubtitle.style.transform = 'translateY(0)';
        }, 400);
    }
}

// Pricing comparison entrance animation
function initializePricingAnimation() {
    const comparisonSection = document.querySelector('.pricing-comparison');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const cards = entry.target.querySelectorAll('.comparison-card');
                cards.forEach((card, index) => {
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = card.classList.contains('ours') 
                            ? 'translateY(0) scale(1.05)' 
                            : 'translateY(0) scale(1)';
                    }, index * 300);
                });
                
                // Animate savings highlight
                const savings = entry.target.querySelector('.savings-highlight');
                if (savings) {
                    setTimeout(() => {
                        savings.style.opacity = '1';
                        savings.style.transform = 'translateY(0)';
                    }, 800);
                }
                
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });
    
    if (comparisonSection) {
        const cards = comparisonSection.querySelectorAll('.comparison-card');
        const savings = comparisonSection.querySelector('.savings-highlight');
        
        cards.forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(50px) scale(0.9)';
            card.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        });
        
        if (savings) {
            savings.style.opacity = '0';
            savings.style.transform = 'translateY(30px)';
            savings.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        }
        
        observer.observe(comparisonSection);
    }
}

// Initialize all about page functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeHeroAnimation();
    initializeStoryAnimation();
    initializeTransparencyAnimations();
    initializePricingAnimation();
    initializeValuesAnimations();
    initializeComparisonEffects();
    initializePriceHighlights();
    animateSavingsCounter();
    
    // Add loaded class to body
    document.body.classList.add('loaded');
});

// Performance optimization: Pause animations when tab is not visible
document.addEventListener('visibilitychange', function() {
    const isHidden = document.hidden;
    const animatedElements = document.querySelectorAll('[style*="transition"]');
    
    animatedElements.forEach(el => {
        if (isHidden) {
            el.style.animationPlayState = 'paused';
        } else {
            el.style.animationPlayState = 'running';
        }
    });
});
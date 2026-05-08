/**
 * Nezzo App - Main JavaScript
 * Complete interactive functionality for the Nezzo ecosystem website
 */

// ============================================
// 1. DOM READY & INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeScrollEffects();
    initializeSmoothScroll();
    initializeContactForm();
    initializeAnimations();
    initializeMobileMenu();
});

// ============================================
// 2. NAVIGATION FUNCTIONALITY
// ============================================
function initializeNavigation() {
    const navbar = document.getElementById('navbar');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Scroll-based navbar styling
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        // Update active nav link based on scroll position
        updateActiveNavLink();
    });
    
    // Click handlers for nav links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
}

function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    const scrollPosition = window.scrollY + 100;
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

// ============================================
// 3. SCROLL EFFECTS
// ============================================
function initializeScrollEffects() {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-visible');
                
                // Trigger counter animation for stat numbers
                if (entry.target.classList.contains('stat-number') || 
                    entry.target.closest('.stat-card')) {
                    const statNumber = entry.target.classList.contains('stat-number') 
                        ? entry.target 
                        : entry.target.querySelector('.stat-number');
                    if (statNumber && !statNumber.classList.contains('animated-count')) {
                        animateCounter(statNumber);
                        statNumber.classList.add('animated-count');
                    }
                }
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animatedElements = document.querySelectorAll(
        '.product-card, .feature-card, .leader-card, .contact-card, .stat-card'
    );
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
    
    // Add fade-in-visible styles dynamically
    const style = document.createElement('style');
    style.textContent = `
        .fade-in-visible {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);
}

// ============================================
// 4. COUNTER ANIMATION
// ============================================
function animateCounter(element) {
    const targetText = element.getAttribute('data-target') || element.textContent;
    const isNumber = /^[\d]+$/.test(targetText.replace(/[+,]/g, ''));
    
    if (!isNumber) return;
    
    const target = parseInt(targetText.replace(/[+,]/g, ''));
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;
    
    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            element.textContent = targetText;
            clearInterval(timer);
        } else {
            const formatted = Math.floor(current).toLocaleString();
            // Preserve suffixes like + or M+
            if (targetText.includes('M+')) {
                element.textContent = formatted + 'M+';
            } else if (targetText.includes('+')) {
                element.textContent = formatted + '+';
            } else {
                element.textContent = formatted;
            }
        }
    }, 16);
}

// ============================================
// 5. SMOOTH SCROLL
// ============================================
function initializeSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Skip if it's just "#"
            if (href === '#') return;
            
            e.preventDefault();
            const target = document.querySelector(href);
            
            if (target) {
                const offsetTop = target.offsetTop - 80; // Account for fixed navbar
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
                
                // Close mobile menu if open
                const navMenu = document.getElementById('nav-menu');
                const navToggle = document.getElementById('nav-toggle');
                if (navMenu && !navMenu.classList.contains('active')) {
                    navMenu.classList.remove('active');
                    navToggle?.classList.remove('active');
                }
            }
        });
    });
}

// ============================================
// 6. CONTACT FORM HANDLING
// ============================================
function initializeContactForm() {
    const contactForm = document.getElementById('contact-form');
    
    if (!contactForm) return;
    
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(contactForm);
        const data = Object.fromEntries(formData.entries());
        
        // Validate form
        if (!validateForm(data)) {
            return;
        }
        
        // Show loading state
        const submitButton = contactForm.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        submitButton.innerHTML = `
            <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
            </svg>
            Wird gesendet...
        `;
        submitButton.disabled = true;
        
        // Simulate API call (replace with actual endpoint)
        try {
            await simulateAPICall(data);
            
            // Show success message
            showNotification('success', 'Vielen Dank! Ihre Nachricht wurde erfolgreich gesendet.');
            contactForm.reset();
            
        } catch (error) {
            showNotification('error', 'Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.');
        } finally {
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }
    });
}

function validateForm(data) {
    const errors = [];
    
    if (!data.firstName || data.firstName.trim().length < 2) {
        errors.push('Bitte geben Sie einen gültigen Vornamen ein.');
    }
    
    if (!data.lastName || data.lastName.trim().length < 2) {
        errors.push('Bitte geben Sie einen gültigen Nachnamen ein.');
    }
    
    if (!data.email || !isValidEmail(data.email)) {
        errors.push('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
    }
    
    if (!data.subject) {
        errors.push('Bitte wählen Sie einen Betreff aus.');
    }
    
    if (!data.message || data.message.trim().length < 10) {
        errors.push('Bitte geben Sie eine Nachricht mit mindestens 10 Zeichen ein.');
    }
    
    if (!data.privacy) {
        errors.push('Sie müssen der Datenschutzerklärung zustimmen.');
    }
    
    if (errors.length > 0) {
        showNotification('error', errors[0]);
        return false;
    }
    
    return true;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

async function simulateAPICall(data) {
    // Simulate network delay
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Simulate 90% success rate
            if (Math.random() > 0.1) {
                resolve({ success: true });
            } else {
                reject(new Error('Network error'));
            }
        }, 1500);
    });
}

// ============================================
// 7. NOTIFICATION SYSTEM
// ============================================
function showNotification(type, message) {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${type === 'success' ? '✓' : '!'}</span>
            <span class="notification-message">${message}</span>
        </div>
        <button class="notification-close" aria-label="Schließen">&times;</button>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 400px;
        border-left: 4px solid ${type === 'success' ? '#10b981' : '#ef4444'};
    `;
    
    // Add animation keyframes
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 12px;
                flex: 1;
            }
            .notification-icon {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                color: white;
                background: ${type === 'success' ? '#10b981' : '#ef4444'};
            }
            .notification-message {
                font-size: 14px;
                color: #374151;
                line-height: 1.5;
            }
            .notification-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #9ca3af;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .notification-close:hover {
                color: #374151;
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
    
    // Close button handler
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    });
}

// ============================================
// 8. MOBILE MENU
// ============================================
function initializeMobileMenu() {
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (!navToggle || !navMenu) return;
    
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        navToggle.classList.toggle('active');
        
        // Add mobile menu styles if not present
        if (!document.querySelector('#mobile-menu-styles')) {
            const style = document.createElement('style');
            style.id = 'mobile-menu-styles';
            style.textContent = `
                @media (max-width: 768px) {
                    #nav-menu.active {
                        display: flex;
                        flex-direction: column;
                        position: absolute;
                        top: 80px;
                        left: 0;
                        right: 0;
                        background: white;
                        padding: 20px;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                        border-top: 1px solid #e5e7eb;
                    }
                    #nav-toggle.active .hamburger {
                        background: transparent;
                    }
                    #nav-toggle.active .hamburger::before {
                        transform: rotate(45deg);
                        top: 0;
                    }
                    #nav-toggle.active .hamburger::after {
                        transform: rotate(-45deg);
                        top: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        }
    });
}

// ============================================
// 9. GENERAL ANIMATIONS
// ============================================
function initializeAnimations() {
    // Parallax effect for hero orbs
    const orbs = document.querySelectorAll('.gradient-orb');
    
    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;
        
        orbs.forEach((orb, index) => {
            const speed = 0.1 + (index * 0.05);
            orb.style.transform = `translateY(${scrolled * speed}px)`;
        });
    });
    
    // Hover effect for product cards
    const productCards = document.querySelectorAll('.product-card');
    
    productCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
        });
    });
}

// ============================================
// 10. UTILITY FUNCTIONS
// ============================================

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for performance
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Format date
function formatDate(date) {
    return new Intl.DateTimeFormat('de-DE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

// Local storage helpers
const storage = {
    get: (key) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
        }
    },
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error writing to localStorage:', error);
            return false;
        }
    },
    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }
};

// ============================================
// 11. PERFORMANCE MONITORING
// ============================================
if ('PerformanceObserver' in window) {
    try {
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                console.log('Performance metric:', entry.name, entry.value);
            });
        });
        
        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
    } catch (error) {
        console.warn('Performance Observer not fully supported');
    }
}

// ============================================
// 12. ERROR HANDLING
// ============================================
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    // In production, you might want to send this to an error tracking service
    // Example: sendToErrorTrackingService(event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // In production, you might want to send this to an error tracking service
    // Example: sendToErrorTrackingService(event.reason);
});

// ============================================
// 13. ANALYTICS (Placeholder)
// ============================================
const analytics = {
    track: (eventName, properties = {}) => {
        console.log('Analytics event:', eventName, properties);
        
        // Replace with actual analytics implementation
        // Examples: Google Analytics, Mixpanel, Amplitude, etc.
        
        // Example for Google Analytics 4:
        // if (typeof gtag !== 'undefined') {
        //     gtag('event', eventName, properties);
        // }
    },
    
    trackPageView: (pagePath) => {
        analytics.track('page_view', { page_path: pagePath });
    },
    
    trackClick: (elementName) => {
        analytics.track('click', { element: elementName });
    }
};

// Track initial page view
analytics.trackPageView(window.location.pathname);

// ============================================
// 14. SERVICE WORKER REGISTRATION (Optional PWA Support)
// ============================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Uncomment to enable service worker
        // navigator.serviceWorker.register('/sw.js')
        //     .then(registration => {
        //         console.log('SW registered:', registration);
        //     })
        //     .catch(error => {
        //         console.log('SW registration failed:', error);
        //     });
    });
}

console.log('Nezzo App JavaScript initialized successfully! 🚀');

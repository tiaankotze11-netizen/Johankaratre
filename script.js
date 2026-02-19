// ============================================
// KARATE CLUB 1976 - NETLIFY OPTIMIZED
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🥋 Karate Club 1976 - Netlify Version');
    
    // ============================================
    // ADMIN CONFIGURATION
    // ============================================
    const ADMIN_CONFIG = {
        password: 'karate1976', // CHANGE THIS
        maxStorageMB: 10,
        maxImageSizeKB: 500
    };
    
    // ============================================
    // NAVIGATION
    // ============================================
    
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    const header = document.getElementById('header');
    
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }
    
    // Smooth scrolling
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
            
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                const headerHeight = header.offsetHeight;
                const targetPosition = targetSection.offsetTop - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Sticky header
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
    
    // ============================================
    // INDEXEDDB SETUP (BETTER THAN LOCALSTORAGE)
    // ============================================
    
    let db = null;
    const DB_NAME = 'KarateClubDB';
    const DB_VERSION = 1;
    
    function initDatabase() {
        return new Promise((resolve, reject) => {
            if (db) {
                resolve(db);
                return;
            }
            
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = () => reject('Database failed');
            request.onsuccess = (event) => {
                db = event.target.result;
                resolve(db);
            };
            
            request.onupgradeneeded = (event) => {
                const database = event.target.result;
                
                if (!database.objectStoreNames.contains('teamPhotos')) {
                    database.createObjectStore('teamPhotos', { keyPath: 'id' });
                }
                
                if (!database.objectStoreNames.contains('galleryImages')) {
                    database.createObjectStore('galleryImages', { keyPath: 'id' });
                }
            };
        });
    }
    
    // Save function
    function saveToDB(storeName, id, data) {
        return new Promise(async (resolve, reject) => {
            try {
                const database = await initDatabase();
                const transaction = database.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                
                const request = store.put({ id: id, data: data, timestamp: Date.now() });
                
                request.onsuccess = () => resolve(true);
                request.onerror = (e) => reject(e);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // Load function
    function loadFromDB(storeName, id) {
        return new Promise(async (resolve, reject) => {
            try {
                const database = await initDatabase();
                const transaction = database.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                
                const request = store.get(id);
                
                request.onsuccess = () => resolve(request.result ? request.result.data : null);
                request.onerror = (e) => reject(e);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // Load all function
    function loadAllFromDB(storeName) {
        return new Promise(async (resolve, reject) => {
            try {
                const database = await initDatabase();
                const transaction = database.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                
                const request = store.getAll();
                
                request.onsuccess = () => {
                    const result = {};
                    request.result.forEach(item => {
                        result[item.id] = item.data;
                    });
                    resolve(result);
                };
                request.onerror = (e) => reject(e);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // Delete function
    function deleteFromDB(storeName, id) {
        return new Promise(async (resolve, reject) => {
            try {
                const database = await initDatabase();
                const transaction = database.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                
                const request = store.delete(id);
                
                request.onsuccess = () => resolve(true);
                request.onerror = (e) => reject(e);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // ============================================
    // IMAGE HANDLING
    // ============================================
    
    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    function compressImage(dataUrl, targetSizeKB = ADMIN_CONFIG.maxImageSizeKB) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                const maxDimension = 1200;
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height / width) * maxDimension);
                        width = maxDimension;
                    } else {
                        width = Math.round((width / height) * maxDimension);
                        height = maxDimension;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                let quality = 0.8;
                let compressed = canvas.toDataURL('image/jpeg', quality);
                
                resolve(compressed);
            };
            img.src = dataUrl;
        });
    }
    
    // ============================================
    // TEAM PHOTOS
    // ============================================
    
    let teamPhotos = {};
    let isAdminMode = false;
    
    async function loadTeamPhotos() {
        try {
            teamPhotos = await loadAllFromDB('teamPhotos') || {};
            displayTeamPhotos();
        } catch (error) {
            teamPhotos = {};
        }
    }
    
    function displayTeamPhotos() {
        Object.keys(teamPhotos).forEach(memberId => {
            const container = document.querySelector(`[data-member="${memberId}"]`);
            if (container) {
                const img = container.querySelector('img');
                const placeholder = container.querySelector('.photo-placeholder, .photo-placeholder-team');
                
                if (img && teamPhotos[memberId]) {
                    img.src = teamPhotos[memberId];
                    img.style.display = 'block';
                    if (placeholder) placeholder.style.display = 'none';
                }
            }
        });
    }
    
    // ============================================
    // GALLERY
    // ============================================
    
    const GALLERY_IDS = ['gallery-0', 'gallery-1', 'gallery-2', 'gallery-3', 'gallery-4', 'gallery-5', 'gallery-6', 'gallery-7'];
    let galleryImages = {};
    let currentLightboxIndex = 0;
    
    const adminToggle = document.getElementById('admin-toggle');
    const adminPanel = document.querySelector('.admin-section-fixed');
    const uploadGalleryBtns = document.querySelectorAll('.upload-gallery-btn');
    const uploadTeamBtns = document.querySelectorAll('.upload-photo-btn, .upload-photo-btn-team');
    
    // Lightbox elements
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');
    
    // Initially hide admin panel and upload buttons
    if (adminPanel) adminPanel.style.display = 'none';
    uploadGalleryBtns.forEach(btn => btn.style.display = 'none');
    uploadTeamBtns.forEach(btn => btn.style.display = 'none');
    
    // ============================================
    // KEYBIND ADMIN ACCESS
    // ============================================
    
    // Track key sequence
    let keySequence = [];
    const SECRET_CODE = ['k', 'a', 'r', 'a', 't', 'e']; // Type "karate" to trigger admin login
    
    document.addEventListener('keydown', (e) => {
        // Add the key to sequence
        keySequence.push(e.key.toLowerCase());
        
        // Keep only last 6 keys
        if (keySequence.length > SECRET_CODE.length) {
            keySequence.shift();
        }
        
        // Check if sequence matches secret code
        if (keySequence.length === SECRET_CODE.length) {
            let match = true;
            for (let i = 0; i < SECRET_CODE.length; i++) {
                if (keySequence[i] !== SECRET_CODE[i]) {
                    match = false;
                    break;
                }
            }
            
            if (match) {
                // Trigger admin login prompt
                const password = prompt('🔐 Enter admin password:');
                
                if (password === ADMIN_CONFIG.password) {
                    enableAdminMode();
                } else if (password !== null) {
                    alert('❌ Incorrect password.');
                }
                
                // Clear sequence
                keySequence = [];
            }
        }
    });
    
    // Also add Ctrl+Shift+A as alternative quick access
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'A') {
            e.preventDefault();
            
            const password = prompt('🔐 Quick admin access - Enter password:');
            
            if (password === ADMIN_CONFIG.password) {
                enableAdminMode();
            } else if (password !== null) {
                alert('❌ Incorrect password.');
            }
        }
    });
    
    // Add Ctrl+Shift+Q to disable admin mode (instead of D which conflicts with bookmark all tabs)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'Q') {
            e.preventDefault();
            
            if (isAdminMode) {
                if (confirm('Are you sure you want to disable admin mode?')) {
                    disableAdminMode();
                    alert('🔒 Admin mode disabled.');
                }
            } else {
                alert('Admin mode is not active.');
            }
        }
    });
    
    // Also add Alt+K as an alternative disable method (less likely to conflict)
    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key === 'k') {
            e.preventDefault();
            
            if (isAdminMode) {
                if (confirm('Are you sure you want to disable admin mode?')) {
                    disableAdminMode();
                    alert('🔒 Admin mode disabled.');
                }
            } else {
                alert('Admin mode is not active.');
            }
        }
    });
    
    // Function to enable admin mode
    function enableAdminMode() {
        isAdminMode = true;
        
        // Show admin panel
        if (adminPanel) adminPanel.style.display = 'block';
        
        // Show upload buttons
        uploadGalleryBtns.forEach(btn => btn.style.display = 'flex');
        uploadTeamBtns.forEach(btn => btn.style.display = 'flex');
        
        alert('✅ Admin mode activated! (Press Ctrl+Shift+Q or Alt+K to disable)');
        
        // Visual feedback - flash the screen
        document.body.style.backgroundColor = 'rgba(212, 175, 55, 0.1)';
        setTimeout(() => {
            document.body.style.backgroundColor = '';
        }, 200);
    }
    
    // Function to disable admin mode
    function disableAdminMode() {
        isAdminMode = false;
        
        // Hide admin panel
        if (adminPanel) adminPanel.style.display = 'none';
        
        // Hide upload buttons
        uploadGalleryBtns.forEach(btn => btn.style.display = 'none');
        uploadTeamBtns.forEach(btn => btn.style.display = 'none');
        
        // Visual feedback
        document.body.style.backgroundColor = 'rgba(255, 0, 0, 0.05)';
        setTimeout(() => {
            document.body.style.backgroundColor = '';
        }, 200);
    }
    
    async function loadGallery() {
        try {
            galleryImages = await loadAllFromDB('galleryImages') || {};
            displayGallery();
        } catch (error) {
            galleryImages = {};
        }
    }
    
    function displayGallery() {
        GALLERY_IDS.forEach((slotId, index) => {
            const box = document.querySelector(`.gallery-box[data-index="${index}"]`);
            if (!box) return;
            
            const img = box.querySelector('.gallery-img');
            const placeholder = box.querySelector('.gallery-placeholder-box');
            const uploadBtn = box.querySelector('.upload-gallery-btn');
            
            if (galleryImages[slotId]) {
                img.src = galleryImages[slotId];
                img.classList.add('active');
                img.style.display = 'block';
                placeholder.style.display = 'none';
                img.onclick = () => openLightbox(index);
            } else {
                img.classList.remove('active');
                img.src = '';
                img.style.display = 'none';
                placeholder.style.display = 'flex';
            }
            
            if (uploadBtn) {
                uploadBtn.style.display = isAdminMode ? 'flex' : 'none';
            }
        });
    }
    
    // Gallery upload buttons
    uploadGalleryBtns.forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            
            if (!isAdminMode) {
                alert('Admin mode required!');
                return;
            }
            
            const slotIndex = parseInt(this.getAttribute('data-slot'));
            const slotId = GALLERY_IDS[slotIndex];
            
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            
            input.onchange = async function(e) {
                const file = e.target.files[0];
                if (!file) return;
                
                try {
                    const originalHTML = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    btn.disabled = true;
                    
                    const imageData = await readFileAsDataURL(file);
                    const compressed = await compressImage(imageData);
                    
                    await saveToDB('galleryImages', slotId, compressed);
                    galleryImages[slotId] = compressed;
                    displayGallery();
                    
                    alert(`✅ Image uploaded to slot ${slotIndex + 1}`);
                } catch (error) {
                    alert('❌ Upload failed');
                } finally {
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                }
            };
            
            input.click();
        });
    });
    
    // Team upload buttons
    uploadTeamBtns.forEach(button => {
        button.addEventListener('click', async function(e) {
            e.stopPropagation();
            
            if (!isAdminMode) {
                alert('Admin mode required!');
                return;
            }
            
            const targetId = this.getAttribute('data-target');
            
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            
            input.onchange = async function(e) {
                const file = e.target.files[0];
                if (!file) return;
                
                try {
                    const originalHTML = button.innerHTML;
                    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    button.disabled = true;
                    
                    const imageData = await readFileAsDataURL(file);
                    const compressed = await compressImage(imageData);
                    
                    const container = document.querySelector(`[data-member="${targetId}"]`);
                    if (container) {
                        const img = container.querySelector('img');
                        const placeholder = container.querySelector('.photo-placeholder, .photo-placeholder-team');
                        
                        if (img) {
                            img.src = compressed;
                            img.style.display = 'block';
                            if (placeholder) placeholder.style.display = 'none';
                        }
                    }
                    
                    await saveToDB('teamPhotos', targetId, compressed);
                    teamPhotos[targetId] = compressed;
                    
                    alert('✅ Photo uploaded!');
                } catch (error) {
                    alert('❌ Upload failed');
                } finally {
                    button.innerHTML = originalHTML;
                    button.disabled = false;
                }
            };
            
            input.click();
        });
    });
    
    // Lightbox functions
    function openLightbox(index) {
        const slotId = GALLERY_IDS[index];
        if (!galleryImages[slotId]) return;
        
        currentLightboxIndex = index;
        updateLightbox();
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
    
    function updateLightbox() {
        const slotId = GALLERY_IDS[currentLightboxIndex];
        lightboxImg.src = galleryImages[slotId];
        lightboxCaption.textContent = `Image ${currentLightboxIndex + 1} of 8`;
    }
    
    function nextImage() {
        let nextIndex = (currentLightboxIndex + 1) % 8;
        while (!galleryImages[GALLERY_IDS[nextIndex]] && nextIndex !== currentLightboxIndex) {
            nextIndex = (nextIndex + 1) % 8;
        }
        if (galleryImages[GALLERY_IDS[nextIndex]]) {
            currentLightboxIndex = nextIndex;
            updateLightbox();
        }
    }
    
    function prevImage() {
        let prevIndex = (currentLightboxIndex - 1 + 8) % 8;
        while (!galleryImages[GALLERY_IDS[prevIndex]] && prevIndex !== currentLightboxIndex) {
            prevIndex = (prevIndex - 1 + 8) % 8;
        }
        if (galleryImages[GALLERY_IDS[prevIndex]]) {
            currentLightboxIndex = prevIndex;
            updateLightbox();
        }
    }
    
    // Lightbox event listeners
    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxNext) lightboxNext.addEventListener('click', nextImage);
    if (lightboxPrev) lightboxPrev.addEventListener('click', prevImage);
    
    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
    }
    
    document.addEventListener('keydown', (e) => {
        if (!lightbox?.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') nextImage();
        if (e.key === 'ArrowLeft') prevImage();
    });
    
    // ============================================
    // INITIALIZE
    // ============================================
    
    // Update year
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    
    // Initialize database and load data
    initDatabase().then(async () => {
        await loadTeamPhotos();
        await loadGallery();
        console.log('✅ Website ready');
    }).catch(error => {
        console.error('Database error:', error);
    });
    
    // Close mobile menu
    document.addEventListener('click', (e) => {
        if (hamburger && navMenu && !hamburger.contains(e.target) && !navMenu.contains(e.target)) {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        }
    });
});
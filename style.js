// --- Firebase Configuration ---
// User: Replace this with your actual Firebase config from the Firebase Console
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    loadData(db);
} else {
    console.warn("Firebase not configured. Using static fallback data.");
}

// --- Connectivity Check System ---
const toast = document.getElementById('connectivity-toast');
const toastMsg = document.getElementById('toast-message');

function updateOnlineStatus() {
    const isOnline = navigator.onLine;

    toast.classList.remove('hidden', 'online', 'offline');
    toast.classList.add(isOnline ? 'online' : 'offline');
    toastMsg.textContent = isOnline ? 'Back Online' : 'No Internet Connection';

    const icon = toast.querySelector('i');
    icon.className = isOnline ? 'fas fa-wifi' : 'fas fa-wifi-slash';

    setTimeout(() => {
        if (isOnline) toast.classList.add('hidden');
    }, 3000);
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// --- Scroll Animations ---
const observerOptions = {
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// --- Data Fetching logic ---
async function loadData(db) {
    try {
        // --- Shared Fetch Function ---
        async function fetchCollection(name) {
            if (db) {
                const snapshot = await db.collection(name).get();
                return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            } else {
                return JSON.parse(localStorage.getItem(`local_${name}`) || '[]');
            }
        }

        // Load Settings
        let settings = null;
        if (db) {
            const settingsDoc = await db.collection('profile').doc('settings').get();
            if (settingsDoc.exists) settings = settingsDoc.data();
        } else {
            settings = JSON.parse(localStorage.getItem('local_settings') || '{}');
        }

        if (settings) {
            // Visibility Toggles
            if (settings.showAbout === false) document.getElementById('about').style.display = 'none';
            if (settings.showSkills === false) document.getElementById('skills').style.display = 'none';
            if (settings.showProjects === false) document.getElementById('projects').style.display = 'none';
            if (settings.showCerts === false) document.getElementById('certifications').style.display = 'none';
            if (settings.showGoals === false) document.getElementById('future-goals').style.display = 'none';

            // social Links Update (Update all matching links in footer/nav)
            if (settings.githubUrl) {
                document.querySelectorAll('a[href*="github.com"]').forEach(a => a.href = settings.githubUrl);
            }
            if (settings.linkedinUrl) {
                document.querySelectorAll('a[href*="linkedin.com"]').forEach(a => a.href = settings.linkedinUrl);
            }
        }

        // Load Profile (About/Hero)
        let aboutData = null;
        if (db) {
            const aboutDoc = await db.collection('profile').doc('about').get();
            if (aboutDoc.exists) aboutData = aboutDoc.data();
        } else {
            aboutData = JSON.parse(localStorage.getItem('local_profile_about') || 'null');
        }

        if (aboutData) {
            if (aboutData.heroDesc) document.getElementById('hero-desc-display').textContent = aboutData.heroDesc;
            if (aboutData.fullBio) document.getElementById('about-bio-display').innerHTML = aboutData.fullBio.replace(/\n/g, '<br>');
        }

        // Load Skills
        const skills = await fetchCollection('skills');
        if (skills.length > 0) {
            const container = document.getElementById('skills-container');
            container.innerHTML = '';
            const categories = ['Frontend', 'Backend', 'Tools'];
            categories.forEach(cat => {
                const filteredSkills = skills.filter(s => (s.category || 'Frontend') === cat);
                if (filteredSkills.length > 0) {
                    container.innerHTML += `
                        <div class="skill-category-header" style="grid-column: 1/-1; margin-top: 2rem; color: var(--primary); font-weight: 700;">
                            ${cat} Expertise
                        </div>
                    `;
                    filteredSkills.forEach(data => {
                        container.innerHTML += `
                            <div class="skill-card">
                                <i class="${data.icon || 'fas fa-code'}"></i>
                                <h3>${data.name}</h3>
                                ${data.date ? `<p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem;">Since ${data.date}</p>` : ''}
                            </div>
                        `;
                    });
                }
            });
        }

        // Load Projects
        const projects = await fetchCollection('projects');
        if (projects.length > 0) {
            const container = document.getElementById('projects-container');
            container.innerHTML = '';
            const categories = ['Web', 'Mobile', 'AI/ML'];
            categories.forEach(cat => {
                const filteredProjects = projects.filter(p => (p.category || 'Web') === cat);
                if (filteredProjects.length > 0) {
                    container.innerHTML += `
                        <div class="project-category-header" style="grid-column: 1/-1; margin-top: 3rem; margin-bottom: 2rem;">
                            <h3 style="color: var(--primary); font-size: 1.8rem; display: flex; align-items: center; gap: 15px;">
                                <span style="width: 40px; height: 2px; background: var(--primary);"></span>
                                ${cat} Solutions
                            </h3>
                        </div>
                    `;
                    filteredProjects.forEach(data => {
                        container.innerHTML += `
                            <div class="project-card">
                                ${data.imageUrl ? `<img src="${data.imageUrl}" alt="${data.title}" class="project-img">` : ''}
                                <div class="project-info">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                        <h3>${data.title}</h3>
                                        ${data.date ? `<span style="font-size: 0.8rem; color: var(--primary); font-weight: 600;">${data.date}</span>` : ''}
                                    </div>
                                    <p>${data.description}</p>
                                    <div class="tags">
                                        ${data.tags ? data.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                }
            });
        }

        // Load Academic
        const academic = await fetchCollection('academic');
        const academicContainer = document.getElementById('academic-container');
        if (academic.length > 0) {
            academicContainer.innerHTML = '';
            const categories = ['Core CS', 'Development', 'AI & Math'];
            categories.forEach(cat => {
                const filtered = academic.filter(i => (i.category || 'Core CS') === cat);
                if (filtered.length > 0) {
                    academicContainer.innerHTML += `<li style="list-style:none; margin-top:1.5rem; color:var(--primary); font-weight:700; border-bottom:1px solid rgba(56,189,248,0.2); padding-bottom:5px; margin-bottom:10px;">${cat} Part</li>`;
                    filtered.forEach(data => {
                        academicContainer.innerHTML += `<li><i class="fas fa-check-circle"></i>${data.text}</li>`;
                    });
                }
            });
        }

        // Load Achievements
        const achievements = await fetchCollection('achievements');
        const achievementsContainer = document.getElementById('achievements-container');
        if (achievements.length > 0) {
            achievementsContainer.innerHTML = '';
            const categories = ['Competition', 'Leadership', 'Academic'];
            categories.forEach(cat => {
                const filtered = achievements.filter(i => (i.category || 'Competition') === cat);
                if (filtered.length > 0) {
                    achievementsContainer.innerHTML += `<li style="list-style:none; margin-top:1.5rem; color:var(--primary); font-weight:700; border-bottom:1px solid rgba(56,189,248,0.2); padding-bottom:5px; margin-bottom:10px;">${cat} Part</li>`;
                    filtered.forEach(data => {
                        achievementsContainer.innerHTML += `<li><i class="fas fa-trophy"></i>${data.text}</li>`;
                    });
                }
            });
        }

        // Load Goals
        const goals = await fetchCollection('goals');
        const goalsContainer = document.getElementById('goals-container');
        if (goals.length > 0) {
            goalsContainer.innerHTML = '';
            const categories = ['Short Term', 'Mid Term', 'Long Term'];
            categories.forEach(cat => {
                const filtered = goals.filter(i => (i.category || 'Short Term') === cat);
                if (filtered.length > 0) {
                    goalsContainer.innerHTML += `<li style="list-style:none; margin-top:1.5rem; color:var(--primary); font-weight:700; border-bottom:1px solid rgba(56,189,248,0.2); padding-bottom:5px; margin-bottom:10px;">${cat} Part</li>`;
                    filtered.forEach(data => {
                        goalsContainer.innerHTML += `<li><i class="fas fa-rocket"></i>${data.text}</li>`;
                    });
                }
            });
        }

        // Load SQL Systems
        const sqlSystems = await fetchCollection('sql_systems');
        if (sqlSystems.length > 0) {
            const container = document.getElementById('sql-container');
            container.innerHTML = '';
            const types = ['Relational', 'NoSQL', 'Embedded'];
            types.forEach(type => {
                const filtered = sqlSystems.filter(s => (s.type || 'Relational') === type);
                if (filtered.length > 0) {
                    container.innerHTML += `
                        <div class="sql-type-header" style="grid-column: 1/-1; margin-top: 2rem; color: var(--primary); font-weight: 700; font-size: 1.5rem; display: flex; align-items: center; gap: 10px;">
                            <i class="fas fa-database"></i> ${type} Architecture
                        </div>
                    `;
                    filtered.forEach(data => {
                        container.innerHTML += `
                            <div class="sql-card" style="background: var(--card-bg); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--glass-border); transition: 0.3s; margin-top: 1rem;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                    <h3 style="margin: 0; color: #fff;">${data.title}</h3>
                                    <span class="status-badge" style="background: rgba(16,185,129,0.1); color: #10b981; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">${data.status || 'Active'}</span>
                                </div>
                                <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.5;">${data.description}</p>
                            </div>
                        `;
                    });
                }
            });
        }

        // Load Certifications
        const fetchedCerts = await fetchCollection('certifications');
        if (fetchedCerts.length > 0) {
            const container = document.getElementById('certifications-container');

            function renderCerts() {
                container.innerHTML = '';
                const categories = ['Technical', 'Academic', 'Soft Skills', 'Other'];
                
                categories.forEach(cat => {
                    const filteredCerts = fetchedCerts.filter(c => (c.category || 'Technical') === cat);
                    if (filteredCerts.length > 0) {
                        container.innerHTML += `
                            <div class="cert-category-section" style="grid-column: 1/-1; margin-top: 2rem;">
                                <h3 style="color: var(--primary); margin-bottom: 1.5rem; font-size: 1.5rem; border-left: 4px solid var(--primary); padding-left: 15px;">${cat} Certifications</h3>
                            </div>
                        `;
                        filteredCerts.forEach(data => {
                            container.innerHTML += `
                                <div class="cert-card">
                                    ${data.imageUrl ? `<img src="${data.imageUrl}" alt="${data.name}" class="cert-img">` : '<div class="cert-img" style="display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.2);"><i class="fas fa-certificate" style="font-size:3rem; color:#fbbf24;"></i></div>'}
                                    <div class="cert-info">
                                        <h3>${data.name}</h3>
                                        <p>${data.issuer} • Issued: ${data.date}</p>
                                    </div>
                                </div>
                            `;
                        });
                    }
                });
            }

            renderCerts();
        }
    } catch (error) {
        console.error("Error loading data from Firebase:", error);
    }
}

// Smooth scroll for nav links (already in index.html, but moved here for cleanliness)
// Smooth scroll for all anchor links starting with '#'
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId.length > 1) {
            e.preventDefault();
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        }
    });
});

// --- Image Modal Logic ---
const imageModal = document.getElementById('image-modal');
const modalImg = document.getElementById('full-image');
const closeModal = document.querySelector('.close-modal');

if (imageModal && modalImg && closeModal) {
    // Event listener for opening the modal
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('cert-img') || e.target.closest('.cert-img')) {
            imageModal.classList.add('show');
            const targetImg = e.target.tagName === 'IMG' ? e.target : e.target.querySelector('img');
            if (targetImg) {
                modalImg.src = targetImg.src;
            }
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }
    });

    // Event listeners for closing the modal
    closeModal.addEventListener('click', function() {
        imageModal.classList.remove('show');
        document.body.style.overflow = 'auto';
    });

    imageModal.addEventListener('click', function(e) {
        if (e.target === imageModal) {
            imageModal.classList.remove('show');
            document.body.style.overflow = 'auto';
        }
    });
}


// --- Firebase Configuration (Same as style.js) ---
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
let db;
if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
} else {
    console.warn("Firebase not configured in admin.js. Please provide your config.");
}

// --- State Management ---
let currentType = ''; // 'skill', 'project', 'cert', 'academic', 'achievement', 'goal', 'sql'
let editId = null;

// --- DOM Elements ---
const navItems = document.querySelectorAll('.nav-links li');
const sections = document.querySelectorAll('.admin-section');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const formFields = document.getElementById('form-fields');
const adminForm = document.getElementById('admin-form');
const logoutBtn = document.getElementById('logout-btn');
const aboutForm = document.getElementById('about-form');

// --- Navigation ---
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const sectionId = item.getAttribute('data-section');
        switchSection(sectionId);
    });
});

const settingsForm = document.getElementById('settings-form');

function switchSection(sectionId) {
    navItems.forEach(i => i.classList.remove('active'));
    sections.forEach(s => s.classList.remove('active'));

    document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');
    document.getElementById(sectionId).classList.add('active');
    
    // Load data for that section
    if (sectionId === 'overview') {
        updateStats();
    } else if (sectionId === 'about') {
        loadAboutData();
    } else if (sectionId === 'settings') {
        loadSettings();
    } else {
        loadSectionData(sectionId);
    }
}

const exportBtn = document.getElementById('export-btn');

// --- Settings Logic ---
async function loadSettings() {
    let settings = null;
    if (db) {
        const doc = await db.collection('profile').doc('settings').get();
        if (doc.exists) settings = doc.data();
    } else {
        settings = JSON.parse(localStorage.getItem('local_settings') || '{}');
    }

    if (settings) {
        if (settings.githubUrl) document.getElementById('githubUrl').value = settings.githubUrl;
        if (settings.linkedinUrl) document.getElementById('linkedinUrl').value = settings.linkedinUrl;
        if (settings.emailContact) document.getElementById('emailContact').value = settings.emailContact;
        if (settings.driveUrl) document.getElementById('driveUrl').value = settings.driveUrl;
        document.getElementById('showAbout').checked = settings.showAbout !== false;
        document.getElementById('showSkills').checked = settings.showSkills !== false;
        document.getElementById('showProjects').checked = settings.showProjects !== false;
        document.getElementById('showCerts').checked = settings.showCerts !== false;
        document.getElementById('showGoals').checked = settings.showGoals !== false;
    }
}

settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const settings = {
        githubUrl: document.getElementById('githubUrl').value,
        linkedinUrl: document.getElementById('linkedinUrl').value,
        emailContact: document.getElementById('emailContact').value,
        driveUrl: document.getElementById('driveUrl').value,
        showAbout: document.getElementById('showAbout').checked,
        showSkills: document.getElementById('showSkills').checked,
        showProjects: document.getElementById('showProjects').checked,
        showCerts: document.getElementById('showCerts').checked,
        showGoals: document.getElementById('showGoals').checked,
    };

    try {
        if (db) {
            await db.collection('profile').doc('settings').set(settings);
        } else {
            localStorage.setItem('local_settings', JSON.stringify(settings));
        }
        alert('Settings saved successfully!');
    } catch (error) {
        alert('Error saving settings: ' + error.message);
    }
});

// --- Export Data Part by Part ---
exportBtn.addEventListener('click', async () => {
    const collections = ['skills', 'projects', 'certifications', 'academic', 'achievements', 'goals'];
    const backup = {
        settings: JSON.parse(localStorage.getItem('local_settings') || '{}'),
        profile: JSON.parse(localStorage.getItem('local_profile_about') || '{}')
    };

    for (const col of collections) {
        if (db) {
            const snap = await db.collection(col).get();
            backup[col] = snap.docs.map(doc => doc.data());
        } else {
            backup[col] = JSON.parse(localStorage.getItem(`local_${col}`) || '[]');
        }
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

// --- About Logic ---
async function loadAboutData() {
    if (!db) return;
    try {
        const doc = await db.collection('profile').doc('about').get();
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('heroDesc').value = data.heroDesc || '';
            document.getElementById('fullBio').value = data.fullBio || '';
        }
    } catch (error) {
        console.error("Error loading about data:", error);
    }
}

aboutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await db.collection('profile').doc('about').set({
            heroDesc: document.getElementById('heroDesc').value,
            fullBio: document.getElementById('fullBio').value
        });
        alert('About Me updated successfully!');
    } catch (error) {
        alert('Error updating About Me: ' + error.message);
    }
});

// --- Auth ---
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('isAdminLoggedIn');
    window.location.href = 'login.html';
});

// --- Modal Logic ---
function showModal(type, data = null) {
    currentType = type;
    editId = data ? data.id : null;
    modalTitle.textContent = editId ? `Edit ${type}` : `Add New ${type}`;
    
    renderFormFields(type, data);
    modalOverlay.classList.add('active');
}

function hideModal() {
    modalOverlay.classList.remove('active');
    adminForm.reset();
    editId = null;
}

function renderFormFields(type, data = {}) {
    formFields.innerHTML = '';
    
    if (type === 'skill') {
        formFields.innerHTML = `
            <div class="form-group">
                <label>Skill Name</label>
                <input type="text" id="name" value="${data.name || ''}" required>
            </div>
            <div class="form-group">
                <label>Date Started/Certified</label>
                <input type="text" id="date" value="${data.date || ''}" placeholder="Jan 2024">
            </div>
            <div class="form-group">
                <label>FontAwesome Icon Class (e.g. fab fa-flutter)</label>
                <input type="text" id="icon" value="${data.icon || 'fas fa-code'}" required>
            </div>
            <div class="form-group">
                <label>Skill Category (Part)</label>
                <div class="radio-group" style="display: flex; gap: 1rem; margin-top: 0.5rem; flex-wrap: wrap;">
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; background: rgba(255,255,255,0.05); padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid var(--glass-border);">
                        <input type="radio" name="category" value="Frontend" ${data.category === 'Frontend' || !data.category ? 'checked' : ''}> Frontend
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; background: rgba(255,255,255,0.05); padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid var(--glass-border);">
                        <input type="radio" name="category" value="Backend" ${data.category === 'Backend' ? 'checked' : ''}> Backend
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; background: rgba(255,255,255,0.05); padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid var(--glass-border);">
                        <input type="radio" name="category" value="Tools" ${data.category === 'Tools' ? 'checked' : ''}> Tools
                    </label>
                </div>
            </div>
        `;
    } else if (type === 'project') {
        formFields.innerHTML = `
            <div class="form-group">
                <label>Project Title</label>
                <input type="text" id="title" value="${data.title || ''}" required>
            </div>
            <div class="form-group">
                <label>Project Date</label>
                <input type="text" id="date" value="${data.date || ''}" placeholder="March 2025">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="description" rows="3" required>${data.description || ''}</textarea>
            </div>
            <div class="form-group">
                <label>Image URL</label>
                <input type="url" id="imageUrl" value="${data.imageUrl || ''}" required>
            </div>
            <div class="form-group">
                <label>Tags (comma separated)</label>
                <input type="text" id="tags" value="${data.tags ? data.tags.join(', ') : ''}" placeholder="Flutter, Firebase">
            </div>
            <div class="form-group">
                <label>Project Category (Part)</label>
                <div class="radio-group" style="display: flex; gap: 1rem; margin-top: 0.5rem; flex-wrap: wrap;">
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; background: rgba(255,255,255,0.05); padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid var(--glass-border);">
                        <input type="radio" name="category" value="Web" ${data.category === 'Web' || !data.category ? 'checked' : ''}> Web
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; background: rgba(255,255,255,0.05); padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid var(--glass-border);">
                        <input type="radio" name="category" value="Mobile" ${data.category === 'Mobile' ? 'checked' : ''}> Mobile
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; background: rgba(255,255,255,0.05); padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid var(--glass-border);">
                        <input type="radio" name="category" value="AI/ML" ${data.category === 'AI/ML' ? 'checked' : ''}> AI/ML
                    </label>
                </div>
            </div>
        `;
    } else if (type === 'cert') {
        formFields.innerHTML = `
            <div class="form-group">
                <label>Certification Name</label>
                <input type="text" id="name" value="${data.name || ''}" required>
            </div>
            <div class="form-group">
                <label>Issuer</label>
                <input type="text" id="issuer" value="${data.issuer || ''}" required>
            </div>
            <div class="form-group">
                <label>Date</label>
                <input type="text" id="date" value="${data.date || ''}" placeholder="Feb 2025">
            </div>
            <div class="form-group">
                <label>Verification Link</label>
                <input type="url" id="link" value="${data.link || ''}">
            </div>
            <div class="form-group">
                <label>Description/Skills Learnt</label>
                <input type="text" id="description" value="${data.description || ''}" placeholder="React, Java, Problem Solving">
            </div>
            <div class="form-group">
                <label>Certificate Image URL/Path</label>
                <input type="text" id="imageUrl" value="${data.imageUrl || 'image/Durjoy datta.png'}" placeholder="image/certificate.png">
            </div>
            <div class="form-group">
                <label>Category (Part)</label>
                <div class="radio-group" style="display: flex; gap: 1rem; margin-top: 0.5rem; flex-wrap: wrap;">
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; background: rgba(255,255,255,0.05); padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid var(--glass-border);">
                        <input type="radio" name="category" value="Technical" ${data.category === 'Technical' || !data.category ? 'checked' : ''}> Technical
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; background: rgba(255,255,255,0.05); padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid var(--glass-border);">
                        <input type="radio" name="category" value="Academic" ${data.category === 'Academic' ? 'checked' : ''}> Academic
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; background: rgba(255,255,255,0.05); padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid var(--glass-border);">
                        <input type="radio" name="category" value="Soft Skills" ${data.category === 'Soft Skills' ? 'checked' : ''}> Soft Skills
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; background: rgba(255,255,255,0.05); padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid var(--glass-border);">
                        <input type="radio" name="category" value="Other" ${data.category === 'Other' ? 'checked' : ''}> Other
                    </label>
                </div>
            </div>
        `;
    } else if (type === 'sql') {
        formFields.innerHTML = `
            <div class="form-group">
                <label>Database/System Title</label>
                <input type="text" id="title" value="${data.title || ''}" required>
            </div>
            <div class="form-group">
                <label>Implementation Type</label>
                <select id="type" required style="background: rgba(15, 23, 42, 0.92); color: white; border: 1px solid var(--glass-border); padding: 0.8rem; border-radius: 8px; width: 100%;">
                    <option value="Relational" ${data.type === 'Relational' ? 'selected' : ''}>Relational (MySQL/PostgreSQL)</option>
                    <option value="NoSQL" ${data.type === 'NoSQL' ? 'selected' : ''}>NoSQL (Firebase/MongoDB)</option>
                    <option value="Embedded" ${data.type === 'Embedded' ? 'selected' : ''}>Embedded (SQLite/Hive)</option>
                </select>
            </div>
            <div class="form-group">
                <label>Status</label>
                <input type="text" id="status" value="${data.status || 'Active'}" placeholder="Live / Local / Development">
            </div>
            <div class="form-group">
                <label>Key Features (comma separated)</label>
                <textarea id="description" rows="3" required>${data.description || ''}</textarea>
            </div>
        `;
        `;
    } else if (type === 'academic') {
        formFields.innerHTML = `
            <div class="form-group">
                <label>Topic/Subject</label>
                <input type="text" id="text" value="${data.text || ''}" required>
            </div>
            <div class="form-group">
                <label>Category (Part)</label>
                <select id="category" style="background: rgba(15, 23, 42, 0.92); color: white; border: 1px solid var(--glass-border); padding: 0.8rem; border-radius: 8px; width: 100%;">
                    <option value="Core CS" ${data.category === 'Core CS' ? 'selected' : ''}>Core Computer Science</option>
                    <option value="Development" ${data.category === 'Development' ? 'selected' : ''}>Software Development</option>
                    <option value="AI & Math" ${data.category === 'AI & Math' ? 'selected' : ''}>AI & Mathematics</option>
                </select>
            </div>
        `;
    } else if (type === 'achievement') {
        formFields.innerHTML = `
            <div class="form-group">
                <label>Achievement Description</label>
                <input type="text" id="text" value="${data.text || ''}" required>
            </div>
            <div class="form-group">
                <label>Type (Part)</label>
                <select id="category" style="background: rgba(15, 23, 42, 0.92); color: white; border: 1px solid var(--glass-border); padding: 0.8rem; border-radius: 8px; width: 100%;">
                    <option value="Competition" ${data.category === 'Competition' ? 'selected' : ''}>Competition/Hackathon</option>
                    <option value="Leadership" ${data.category === 'Leadership' ? 'selected' : ''}>Leadership/Event</option>
                    <option value="Academic" ${data.category === 'Academic' ? 'selected' : ''}>Academic Achievement</option>
                </select>
            </div>
        `;
    } else if (type === 'goal') {
        formFields.innerHTML = `
            <div class="form-group">
                <label>Future Goal</label>
                <input type="text" id="text" value="${data.text || ''}" required>
            </div>
            <div class="form-group">
                <label>Priority (Part)</label>
                <select id="category" style="background: rgba(15, 23, 42, 0.92); color: white; border: 1px solid var(--glass-border); padding: 0.8rem; border-radius: 8px; width: 100%;">
                    <option value="Short Term" ${data.category === 'Short Term' ? 'selected' : ''}>Short Term</option>
                    <option value="Mid Term" ${data.category === 'Mid Term' ? 'selected' : ''}>Mid Term</option>
                    <option value="Long Term" ${data.category === 'Long Term' ? 'selected' : ''}>Long Term</option>
                </select>
            </div>
        `;
    } else {
        // Generic text field
        formFields.innerHTML = `
            <div class="form-group">
                <label>Content</label>
                <input type="text" id="text" value="${data.text || ''}" required>
            </div>
        `;
    }
}

// --- Data Operations ---
adminForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {};
    const inputs = formFields.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        if (input.type === 'radio') {
            if (input.checked) {
                formData[input.name] = input.value;
            }
        } else if (input.id === 'tags') {
            formData[input.id] = input.value.split(',').map(tag => tag.trim());
        } else {
            formData[input.id] = input.value;
        }
    });

    try {
        const collectionMap = {
            'skill': 'skills',
            'project': 'projects',
            'cert': 'certifications',
            'academic': 'academic',
            'achievement': 'achievements',
            'goal': 'goals',
            'sql': 'sql_systems'
        };
        const collectionName = collectionMap[currentType];
        
        if (db) {
            if (editId) {
                await db.collection(collectionName).doc(editId).update(formData);
            } else {
                formData.timestamp = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection(collectionName).add(formData);
            }
        } else {
            // LocalStorage Fallback
            let localData = JSON.parse(localStorage.getItem(`local_${collectionName}`) || '[]');
            if (editId) {
                localData = localData.map(item => item.id === editId ? { ...formData, id: editId } : item);
            } else {
                formData.id = 'loc_' + Date.now();
                localData.push(formData);
            }
            localStorage.setItem(`local_${collectionName}`, JSON.stringify(localData));
        }
        
        hideModal();
        const sectionId = currentType === 'cert' ? 'certs' : (['academic', 'achievement', 'goal'].includes(currentType) ? currentType + 's' : currentType + 's');
        loadSectionData(sectionId);
        updateStats();
    } catch (error) {
        console.error("Error saving data:", error);
        alert("Error saving data: " + error.message);
    }
});

async function loadSectionData(sectionId) {
    const listId = `${sectionId}-list`;
    const container = document.getElementById(listId);
    if (!container) return;
    
    container.innerHTML = '<tr><td colspan="4" style="text-align:center">Loading...</td></tr>';

    try {
        const collectionMap = {
            'skills': 'skills',
            'projects': 'projects',
            'certs': 'certifications',
            'academic': 'academic',
            'achievements': 'achievements',
            'goals': 'goals',
            'sql': 'sql_systems'
        };
        const collectionName = collectionMap[sectionId];
        let items = [];

        if (db) {
            const snapshot = await db.collection(collectionName).get();
            snapshot.forEach(doc => {
                const data = doc.data();
                data.id = doc.id;
                items.push(data);
            });
        } else {
            items = JSON.parse(localStorage.getItem(`local_${collectionName}`) || '[]');
        }
        
        container.innerHTML = '';
        
        container.innerHTML = '';
        
        if (['skills', 'projects', 'sql', 'academic', 'achievements', 'goals'].includes(sectionId)) {
            let categories = [];
            if (sectionId === 'skills') categories = ['Frontend', 'Backend', 'Tools'];
            else if (sectionId === 'projects') categories = ['Web', 'Mobile', 'AI/ML'];
            else if (sectionId === 'sql') categories = ['Relational', 'NoSQL', 'Embedded'];
            else if (sectionId === 'academic') categories = ['Core CS', 'Development', 'AI & Math'];
            else if (sectionId === 'achievements') categories = ['Competition', 'Leadership', 'Academic'];
            else if (sectionId === 'goals') categories = ['Short Term', 'Mid Term', 'Long Term'];
            
            categories.forEach(cat => {
                const filteredItems = items.filter(i => {
                    const val = i.category || i.type || (sectionId === 'skills' ? 'Frontend' : (sectionId === 'projects' ? 'Web' : (sectionId === 'sql' ? 'Relational' : (sectionId === 'academic' ? 'Core CS' : (sectionId === 'achievements' ? 'Competition' : 'Short Term')))));
                    return val === cat;
                });
                
                if (filteredItems.length > 0) {
                    container.innerHTML += `<tr class="group-header"><td colspan="5" style="background: rgba(56, 189, 248, 0.1); color: var(--primary); font-weight: bold; padding: 10px 15px;">${cat} Part</td></tr>`;
                    filteredItems.forEach(data => {
                        let row = '';
                        if (sectionId === 'skills') {
                            row = `
                                <tr>
                                    <td><i class="${data.icon} table-icon"></i></td>
                                    <td>${data.name}</td>
                                    <td>${data.date || ''}</td>
                                    <td><span class="tag">${data.category || 'Frontend'}</span></td>
                                    <td class="table-actions">
                                        <button class="btn-icon" onclick='showModal("skill", ${JSON.stringify(data)})'><i class="fas fa-edit"></i></button>
                                        <button class="btn-icon delete" onclick="deleteItem('skills', '${data.id}')"><i class="fas fa-trash"></i></button>
                                    </td>
                                </tr>
                            `;
                        } else if (sectionId === 'projects') {
                            row = `
                                <tr>
                                    <td><img src="${data.imageUrl}" class="table-img"></td>
                                    <td>${data.title}</td>
                                    <td>${data.date || ''}</td>
                                    <td><span class="tag">${data.category || 'Web'}</span></td>
                                    <td class="table-actions">
                                        <button class="btn-icon" onclick='showModal("project", ${JSON.stringify(data)})'><i class="fas fa-edit"></i></button>
                                        <button class="btn-icon delete" onclick="deleteItem('projects', '${data.id}')"><i class="fas fa-trash"></i></button>
                                    </td>
                                </tr>
                            `;
                        } else if (sectionId === 'sql') {
                            row = `
                                <tr>
                                    <td>${data.title}</td>
                                    <td><span class="tag">${data.type || 'Relational'}</span></td>
                                    <td>${data.status || 'Active'}</td>
                                    <td class="table-actions">
                                        <button class="btn-icon" onclick='showModal("sql", ${JSON.stringify(data)})'><i class="fas fa-edit"></i></button>
                                        <button class="btn-icon delete" onclick="deleteItem('sql_systems', '${data.id}')"><i class="fas fa-trash"></i></button>
                                    </td>
                                </tr>
                            `;
                        } else {
                            // Academic, Achievement, Goal
                            row = `
                                <tr>
                                    <td>${data.text}</td>
                                    <td><span class="tag">${data.category || 'Other'}</span></td>
                                    <td class="table-actions">
                                        <button class="btn-icon" onclick='showModal("${sectionId === 'achievements' ? 'achievement' : sectionId.slice(0, -1)}", ${JSON.stringify(data)})'><i class="fas fa-edit"></i></button>
                                        <button class="btn-icon delete" onclick="deleteItem('${collectionName}', '${data.id}')"><i class="fas fa-trash"></i></button>
                                    </td>
                                </tr>
                            `;
                        }
                        container.innerHTML += row;
                    });
                }
            });
        } else {
            items.forEach(data => {
                let row = '';
                if (sectionId === 'certs') {
                    row = `
                        <tr>
                            <td>${data.name}</td>
                            <td><span class="tag">${data.category || 'Technical'}</span></td>
                            <td class="table-actions">
                                <button class="btn-icon" onclick='showModal("cert", ${JSON.stringify(data)})'><i class="fas fa-edit"></i></button>
                                <button class="btn-icon delete" onclick="deleteItem('certifications', '${data.id}')"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `;
                } else {
                    row = `
                        <tr>
                            <td>${data.text}</td>
                            <td>${data.date || ''}</td>
                            <td class="table-actions">
                                <button class="btn-icon" onclick='showModal("${sectionId.slice(0, -1)}", ${JSON.stringify(data)})'><i class="fas fa-edit"></i></button>
                                <button class="btn-icon delete" onclick="deleteItem('${collectionName}', '${data.id}')"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `;
                }
                container.innerHTML += row;
            });
        }
    } catch (error) {
        console.error("Error loading data:", error);
        container.innerHTML = '<tr><td colspan="4">Error loading data</td></tr>';
    }
}

async function deleteItem(collection, id) {
    if (confirm('Are you sure you want to delete this item?')) {
        try {
            if (db) {
                await db.collection(collection).doc(id).delete();
            } else {
                let localData = JSON.parse(localStorage.getItem(`local_${collection}`) || '[]');
                localData = localData.filter(item => item.id !== id);
                localStorage.setItem(`local_${collection}`, JSON.stringify(localData));
            }
            const section = collection === 'certifications' ? 'certs' : (['academic', 'achievements', 'goals'].includes(collection) ? collection : collection);
            loadSectionData(section);
            updateStats();
        } catch (error) {
            alert("Error deleting item: " + error.message);
        }
    }
}

async function updateStats() {
    if (!db) return;
    try {
        const skills = await db.collection('skills').get();
        const projects = await db.collection('projects').get();
        const certs = await db.collection('certifications').get();
        const sql = await db.collection('sql_systems').get();
        
        document.getElementById('count-skills').textContent = skills.size;
        document.getElementById('count-projects').textContent = projects.size;
        document.getElementById('count-certs').textContent = certs.size;
        document.getElementById('count-sql').textContent = sql.size;
    } catch (error) {
        console.error("Error updating stats:", error);
    }
}

// Initial stats load
updateStats();

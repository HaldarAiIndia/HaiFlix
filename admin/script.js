import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// IMPORTANT: Replace with your actual Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDhdItehDKZJT7Ihqb-AjUtZVT7yOfYKtA",
    authDomain: "filmx-bfac5.firebaseapp.com",
    databaseURL: "https://filmx-bfac5-default-rtdb.firebaseio.com",
    projectId: "filmx-bfac5",
    storageBucket: "filmx-bfac5.appspot.com",
    messagingSenderId: "506741430153",
    appId: "1:506741430153:web:d5590373c9ca74c595b358"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentSection = 'movies';
let episodeCounter = 0;
let unsubscribers = {};

const ui = {
    body: document.body,
    menuToggle: document.getElementById('menu-toggle'),
    overlay: document.querySelector('.overlay'),
    navLinks: document.querySelectorAll('.nav-link'),
    headerTitle: document.getElementById('header-title'),
    screens: document.querySelectorAll('.screen'),
    contentAreas: {
        movies: document.getElementById('movies-content-area'),
        series: document.getElementById('series-content-area'),
        livetv: document.getElementById('livetv-content-area'),
    },
    fab: document.getElementById('fab'),
    // Modals
    formModalOverlay: document.getElementById('form-modal-overlay'),
    permissionsModalOverlay: document.getElementById('permissions-modal-overlay'),
    bannerModalOverlay: document.getElementById('banner-modal-overlay'),
    confirmDialogOverlay: document.getElementById('confirm-dialog-overlay'),
    // Form Modal
    modalTitle: document.getElementById('modal-title'),
    dataForm: document.getElementById('data-form'),
    editId: document.getElementById('edit-id'),
    nameInput: document.getElementById('name'),
    imageUrlInput: document.getElementById('image-url'),
    isPublicInput: document.getElementById('is-public'),
    
    // Movie Fields
    movieFields: document.getElementById('movie-fields'),
    movieSourceType: document.getElementById('movie-source-type'),
    movieUrlInput: document.getElementById('movie-url'),
    catalogueInput: document.getElementById('catalogue'),
    
    // Series Fields
    seriesFields: document.getElementById('series-fields'),
    seriesNumberInput: document.getElementById('series-number'),
    episodesContainer: document.getElementById('episodes-container'),
    addEpisodeBtn: document.getElementById('add-episode-btn'),
    
    // Live TV Fields
    livetvFields: document.getElementById('livetv-fields'),
    livetvUrlInput: document.getElementById('livetv-url'),
    livetvSourceType: document.getElementById('livetv-source-type'),
    livetvMpdFields: document.getElementById('livetv-mpd-fields'),
    livetvKeyInput: document.getElementById('livetv-key'),
    livetvKidInput: document.getElementById('livetv-kid'),
    
    cancelBtn: document.getElementById('cancel-btn'),
    formCloseBtn: document.getElementById('form-close-btn'),
    // Permissions Modal
    permissionsBtn: document.getElementById('permissions-btn'),
    permissionsList: document.getElementById('permissions-list'),
    closePermissionsBtn: document.getElementById('close-permissions-btn'),
    // Banner Modal
    bannerBtn: document.getElementById('banner-btn'),
    bannerModal: document.getElementById('banner-modal'),
    bannerForm: document.getElementById('banner-form'),
    bannerUrlInput: document.getElementById('banner-url'),
    bannerEditId: document.getElementById('banner-edit-id'),
    bannerList: document.getElementById('banner-list'),
    closeBannerBtn: document.getElementById('close-banner-btn'),
    // Confirm Dialog
    confirmTitle: document.getElementById('confirm-title'),
    confirmMessage: document.getElementById('confirm-message'),
    confirmOk: document.getElementById('confirm-ok'),
    confirmCancel: document.getElementById('confirm-cancel'),
};

const showConfirmation = (title, message) => {
    ui.confirmTitle.textContent = title;
    ui.confirmMessage.textContent = message;
    ui.confirmDialogOverlay.classList.add('visible');
    return new Promise((resolve) => {
        ui.confirmOk.onclick = () => {
            ui.confirmDialogOverlay.classList.remove('visible');
            resolve(true);
        };
        ui.confirmCancel.onclick = () => {
            ui.confirmDialogOverlay.classList.remove('visible');
            resolve(false);
        };
    });
};

function handleLiveTvSourceChange() {
    const sourceType = ui.livetvSourceType.value;
    ui.livetvMpdFields.classList.toggle('hidden', sourceType !== 'mpd');
}

function handleMovieSourceChange() {
    const type = ui.movieSourceType.value;
    const label = document.getElementById('movie-url-label');
    const input = ui.movieUrlInput;
    if(type === 'iframe') {
        label.textContent = "iFrame URL (Embed Link)";
        input.placeholder = "https://example.com/embed/movie123";
    } else {
        label.textContent = "Stream URL (Video File)";
        input.placeholder = "https://example.com/movie.mp4";
    }
}

function addEpisodeInput(episode = { url: '', imageUrl: '' }) {
    episodeCounter++;
    const episodeDiv = document.createElement('div');
    episodeDiv.className = 'episode-input-group';
    episodeDiv.innerHTML = `
        <h4>Episode ${episodeCounter}</h4>
        <button type="button" class="icon-button remove-episode-btn"><span class="material-symbols-outlined">close</span></button>
        <div class="form-group">
            <label>Episode URL</label>
            <input type="url" placeholder="https://..." value="${episode.url}" class="episode-url" required>
        </div>
        <div class="form-group">
            <label>Episode Image URL</label>
            <input type="url" placeholder="https://..." value="${episode.imageUrl}" class="episode-image-url" required>
        </div>
    `;
    ui.episodesContainer.appendChild(episodeDiv);
    episodeDiv.querySelector('.remove-episode-btn').addEventListener('click', () => episodeDiv.remove());
}

function resetForm() {
    ui.dataForm.reset();
    ui.editId.value = '';
    ui.episodesContainer.innerHTML = '';
    episodeCounter = 0;
    ui.movieFields.classList.add('hidden');
    ui.seriesFields.classList.add('hidden');
    ui.livetvFields.classList.add('hidden');
    
    // Reset defaults
    ui.livetvSourceType.value = 'm3u8';
    ui.movieSourceType.value = 'direct';
    handleLiveTvSourceChange();
    handleMovieSourceChange();
}

function showModal(type, data = null) {
    resetForm();
    if (type === 'movies') {
        ui.modalTitle.textContent = data ? 'Edit Movie' : 'Add Movie';
        ui.movieFields.classList.remove('hidden');
        if (data) {
            ui.editId.value = data.id; 
            ui.nameInput.value = data.name; 
            ui.imageUrlInput.value = data.imageUrl;
            ui.movieUrlInput.value = data.movieUrl; 
            ui.catalogueInput.value = data.catalogue; 
            ui.isPublicInput.checked = data.isPublic;
            ui.movieSourceType.value = data.sourceType || 'direct';
        }
        handleMovieSourceChange();
    } else if (type === 'series') {
        ui.modalTitle.textContent = data ? 'Edit Series' : 'Add Series';
        ui.seriesFields.classList.remove('hidden');
        if (data) {
            ui.editId.value = data.id; ui.nameInput.value = data.name; ui.imageUrlInput.value = data.imageUrl;
            ui.seriesNumberInput.value = data.seriesNumber; ui.isPublicInput.checked = data.isPublic;
            data.episodes.forEach(ep => addEpisodeInput(ep));
        } else {
             addEpisodeInput();
        }
    } else if (type === 'livetv') {
        ui.modalTitle.textContent = data ? 'Edit Live TV' : 'Add Live TV';
        ui.livetvFields.classList.remove('hidden');
        if (data) {
            ui.editId.value = data.id; ui.nameInput.value = data.name; ui.imageUrlInput.value = data.imageUrl;
            ui.livetvUrlInput.value = data.liveTvUrl; ui.isPublicInput.checked = data.isPublic;
            
            const sourceType = data.sourceType || 'm3u8';
            ui.livetvSourceType.value = sourceType;
            ui.livetvKeyInput.value = data.key || '';
            ui.livetvKidInput.value = data.kid || '';
        }
        handleLiveTvSourceChange();
    }
    ui.formModalOverlay.classList.add('visible');
}

function hideAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('visible'));
}

async function saveData(e) {
    e.preventDefault();
    const id = ui.editId.value;
    const commonData = {
        name: ui.nameInput.value, imageUrl: ui.imageUrlInput.value,
        isPublic: ui.isPublicInput.checked,
    };

    let data;
    if (currentSection === 'movies') {
        data = { 
            ...commonData, 
            movieUrl: ui.movieUrlInput.value, 
            catalogue: ui.catalogueInput.value,
            sourceType: ui.movieSourceType.value
        };
    } else if (currentSection === 'series') {
        data = { ...commonData, seriesNumber: parseInt(ui.seriesNumberInput.value),
            episodes: Array.from(ui.episodesContainer.children).map(div => ({
                url: div.querySelector('.episode-url').value, imageUrl: div.querySelector('.episode-image-url').value,
            }))
        };
    } else if (currentSection === 'livetv') {
        const sourceType = ui.livetvSourceType.value;
        data = {
            ...commonData,
            sourceType,
            liveTvUrl: ui.livetvUrlInput.value,
        };

        if (id) {
            data.key = null;
            data.kid = null;
        }

        if (sourceType === 'mpd') {
            data.key = ui.livetvKeyInput.value;
            data.kid = ui.livetvKidInput.value;
        }
    }

    try {
        if (id) {
            await setDoc(doc(db, currentSection, id), data, { merge: true });
        } else {
            await addDoc(collection(db, currentSection), { ...data, createdAt: new Date() });
        }
        hideAllModals();
    } catch (error) { console.error("Error saving document: ", error); }
}

async function deleteData(id) {
    const confirmed = await showConfirmation('Delete Content', 'This action cannot be undone. Are you sure?');
    if (confirmed) {
        try { await deleteDoc(doc(db, currentSection, id)); } 
        catch (error) { console.error("Error removing document: ", error); }
    }
}

function renderContent(section, data) {
    const contentArea = ui.contentAreas[section];
    if (!contentArea) return;
    
    contentArea.innerHTML = `<div class="media-grid">${data.map(item => `
        <div class="media-card">
            <img src="${item.imageUrl}" alt="${item.name}">
            <div class="media-card-overlay">
                <h3 class="media-card-title">${item.name}</h3>
                <div class="media-card-actions">
                    <button class="icon-button edit-btn" data-id="${item.id}"><span class="material-symbols-outlined">edit</span></button>
                    <button class="icon-button delete-btn" data-id="${item.id}"><span class="material-symbols-outlined">delete</span></button>
                </div>
            </div>
        </div>
    `).join('')}</div>`;

    contentArea.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const docToEdit = data.find(d => d.id === btn.dataset.id);
            showModal(section, docToEdit);
        });
    });
    contentArea.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteData(btn.dataset.id));
    });
}

function setupRealtimeListener(section) {
    if (unsubscribers[section]) unsubscribers[section]();
    
    const q = collection(db, section);
    unsubscribers[section] = onSnapshot(q, (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const sortedData = data.sort((a,b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
        renderContent(section, sortedData);
    });
}

function switchSection(section) {
    currentSection = section;
    ui.screens.forEach(s => s.classList.toggle('active', s.id === `${section}-screen`));
    ui.navLinks.forEach(l => l.classList.toggle('active', l.dataset.section === section));
    const titles = {movies: "Movies", series: "Series", livetv: "Live TV"};
    ui.headerTitle.textContent = titles[section];
    setupRealtimeListener(section);
}

// Sidebar Logic
function toggleSidebar(forceClose = false) {
    if (forceClose) ui.body.classList.remove('left-sidebar-open');
    else ui.body.classList.toggle('left-sidebar-open');
}

// Permissions Modal Logic
function showPermissionsModal() {
    toggleSidebar(true);
    ui.permissionsModalOverlay.classList.add('visible');
    
    if (unsubscribers.permissions) unsubscribers.permissions();
    const q = collection(db, 'livetv');
    unsubscribers.permissions = onSnapshot(q, (querySnapshot) => {
        const channels = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        ui.permissionsList.innerHTML = channels.map(channel => `
            <div class="permission-item">
                <span>${channel.name}</span>
                <label class="switch">
                    <input type="checkbox" class="channel-toggle" data-id="${channel.id}" ${channel.isPublic ? 'checked' : ''}>
                    <span class="toggle-switch"></span>
                </label>
            </div>
        `).join('');
        
        ui.permissionsList.querySelectorAll('.channel-toggle').forEach(toggle => {
            toggle.addEventListener('change', async (e) => {
                 await updateDoc(doc(db, 'livetv', e.target.dataset.id), { isPublic: e.target.checked });
            });
        });
    });
}

// Banner Modal Logic
function showBannerModal() {
    toggleSidebar(true);
    ui.bannerModalOverlay.classList.add('visible');

    if (unsubscribers.banners) unsubscribers.banners();
    const q = collection(db, 'banners');
    unsubscribers.banners = onSnapshot(q, (querySnapshot) => {
        const banners = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        ui.bannerList.innerHTML = banners.map(banner => `
            <div class="banner-item">
                <span>${banner.url}</span>
                <div class="actions">
                    <button class="icon-button edit-banner-btn" data-id="${banner.id}" data-url="${banner.url}"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button>
                    <button class="icon-button delete-banner-btn" data-id="${banner.id}"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
                </div>
            </div>
        `).join('');
        
        ui.bannerList.querySelectorAll('.edit-banner-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                ui.bannerUrlInput.value = btn.dataset.url;
                ui.bannerEditId.value = btn.dataset.id;
                ui.bannerUrlInput.focus();
            });
        });
         ui.bannerList.querySelectorAll('.delete-banner-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (await showConfirmation('Delete Banner', 'Are you sure?')) {
                   await deleteDoc(doc(db, 'banners', btn.dataset.id));
                }
            });
        });
    });
}

ui.bannerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = ui.bannerUrlInput.value;
    const id = ui.bannerEditId.value;
    if (!url) return;

    try {
        const data = id ? { url, updatedAt: new Date() } : { url, createdAt: new Date() };
        const docRef = id ? doc(db, 'banners', id) : collection(db, 'banners');
        id ? await setDoc(docRef, data, { merge: true }) : await addDoc(docRef, data);
        
        ui.bannerForm.reset();
        ui.bannerEditId.value = '';
    } catch(err) { console.error("Error saving banner:", err) }
});

// Initial Event Listeners
ui.menuToggle.addEventListener('click', () => toggleSidebar());
ui.overlay.addEventListener('click', () => toggleSidebar(true));
ui.fab.addEventListener('click', () => showModal(currentSection));
ui.cancelBtn.addEventListener('click', hideAllModals);
ui.formCloseBtn.addEventListener('click', hideAllModals);
ui.dataForm.addEventListener('submit', saveData);
ui.addEpisodeBtn.addEventListener('click', () => addEpisodeInput());
ui.livetvSourceType.addEventListener('change', handleLiveTvSourceChange);
ui.movieSourceType.addEventListener('change', handleMovieSourceChange);

ui.navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        switchSection(link.dataset.section);
        toggleSidebar(true);
    });
});

ui.permissionsBtn.addEventListener('click', showPermissionsModal);
ui.closePermissionsBtn.addEventListener('click', hideAllModals);

ui.bannerBtn.addEventListener('click', showBannerModal);
ui.closeBannerBtn.addEventListener('click', hideAllModals);

// Initial Load
switchSection('movies');
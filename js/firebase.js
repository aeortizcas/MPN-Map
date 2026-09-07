const FIREBASE_CONFIG = {
    apiKey: "TU_API_KEY_AQUI",
    authDomain: "TU_PROYECTO.firebaseapp.com",
    databaseURL: "https://TU_PROYECTO-default-rtdb.firebaseio.com",
    projectId: "TU_PROYECTO",
    storageBucket: "TU_PROYECTO.appspot.com",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};

const FIREBASE = {
    db: null,
    connected: false,
    panelOpen: false,

    init() {
        try {
            firebase.initializeApp(FIREBASE_CONFIG);
            this.db = firebase.database();
            this.updateStatus('🟢 Firebase listo', 'green');
        } catch (err) {
            this.updateStatus('🔴 Configurar Firebase', 'red');
            console.error('Firebase error:', err);
        }
    },

    connect() {
        this.init();
        this.connected = true;
        this.updateStatus('🟢 Conectado', 'green');
        this.showToast('Firebase conectado');
    },

    disconnect() {
        this.connected = false;
        this.updateStatus('🔴 Desconectado', 'red');
        this.showToast('Firebase desconectado');
    },

    updateStatus(msg, color) {
        const el = document.getElementById('firebase-status');
        if (el) { el.textContent = msg; el.style.color = color; }
        const con = document.getElementById('firebase-connection');
        if (con) con.textContent = msg;
    },

    saveMarker() {
        if (!this.connected) { this.showToast('Conecta Firebase primero'); return; }
        const nombre = document.getElementById('fb-nombre').value;
        const lat = parseFloat(document.getElementById('fb-lat').value);
        const lng = parseFloat(document.getElementById('fb-lng').value);
        const address = document.getElementById('fb-address').value;
        if (!nombre || isNaN(lat) || isNaN(lng)) {
            this.showToast('Completa nombre, lat y lng');
            return;
        }
        const ref = this.db.ref('marcadores').push();
        ref.set({
            nombre: nombre,
            lat: lat,
            lng: lng,
            address: address || '',
            fecha: Date.now(),
            usuario: 'local'
        }).then(() => {
            this.showToast('Marcador guardado en Firebase');
            document.getElementById('fb-nombre').value = '';
            document.getElementById('fb-lat').value = '';
            document.getElementById('fb-lng').value = '';
            document.getElementById('fb-address').value = '';
            this.loadMarkers();
        }).catch(err => {
            this.showToast('Error: ' + err.message);
        });
    },

    loadMarkers() {
        if (!this.connected) { this.showToast('Conecta Firebase primero'); return; }
        const list = document.getElementById('fb-markers-list');
        list.innerHTML = '<div style="color:#888;font-size:11px;">Cargando...</div>';
        this.db.ref('marcadores').on('value', (snapshot) => {
            const data = snapshot.val();
            if (!data) { list.innerHTML = '<div style="color:#888;font-size:11px;">Sin marcadores</div>'; return; }
            list.innerHTML = '';
            Object.keys(data).forEach(key => {
                const m = data[key];
                const div = document.createElement('div');
                div.style.cssText = 'background:#0f3460;padding:6px;margin-bottom:4px;border-radius:4px;color:#fff;font-size:11px;cursor:pointer;';
                div.innerHTML = `<strong>${m.nombre}</strong><br><span style="color:#888">${m.lat.toFixed(4)}, ${m.lng.toFixed(4)}</span> <span style="float:right;color:#e94560;cursor:pointer" onclick="FIREBASE.deleteMarker('${key}')">[x]</span>`;
                div.onclick = () => { MAP.map.flyTo([m.lat, m.lng], 12); MAP.addMarker({ lat: m.lat, lng: m.lng }, { address: m.nombre }); };
                list.appendChild(div);
            });
        }, (err) => {
            list.innerHTML = '<div style="color:#e94560;font-size:11px;">Error cargando</div>';
        });
    },

    deleteMarker(key) {
        this.db.ref('marcadores/' + key).remove().then(() => {
            this.showToast('Marcador eliminado');
            this.loadMarkers();
        });
    },

    togglePanel() {
        this.panelOpen = !this.panelOpen;
        document.getElementById('firebase-panel').style.display = this.panelOpen ? 'block' : 'none';
        if (this.panelOpen && this.connected) this.loadMarkers();
    },

    showToast(msg) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = msg;
        document.getElementById('measure-result').parentNode.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    FIREBASE.init();
});

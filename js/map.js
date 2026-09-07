const MAP = {
    map: null,
    markersLayer: null,
    mpnLinksLayer: null,
    doctorsLayer: null,
    reclamosLayer: null,
    aseguranzasLayer: null,
    measureMode: false,
    measurePointA: null,

    init() {
        L.Icon.Default.imagePath = 'lib/leaflet/images';

        this.map = L.map('map', {
            center: [39.8283, -98.5795],
            zoom: 5,
            zoomControl: false,
            attributionControl: false
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap',
            maxZoom: 18
        }).addTo(this.map);

        this.markersLayer = L.layerGroup().addTo(this.map);
        this.mpnLinksLayer = L.layerGroup().addTo(this.map);
        this.doctorsLayer = L.layerGroup().addTo(this.map);
        this.reclamosLayer = L.layerGroup().addTo(this.map);
        this.aseguranzasLayer = L.layerGroup().addTo(this.map);

        this.setupControls();
        this.setupEvents();
        this.updateCoords();
    },

    setupControls() {
        document.getElementById('btn-zoom-in').addEventListener('click', () => this.map.zoomIn());
        document.getElementById('btn-zoom-out').addEventListener('click', () => this.map.zoomOut());
        document.getElementById('btn-reset').addEventListener('click', () => this.map.setView([39.8283, -98.5795], 5));
        document.getElementById('btn-geolocate').addEventListener('click', () => this.geolocate());
        document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('collapsed');
        });
    },

    setupEvents() {
        this.map.on('mousemove', (e) => this.updateCoords(e.latlng));
        this.map.on('zoomend', () => this.updateCoords());
        this.map.on('click', (e) => {
            if (this.measureMode && this.measurePointA) {
                this.handleMeasureClick(e.latlng);
            }
        });
    },

    updateCoords(e) {
        const lat = e ? e.latlng.lat.toFixed(4) : this.map.getCenter().lat.toFixed(4);
        const lng = e ? e.latlng.lng.toFixed(4) : this.map.getCenter().lng.toFixed(4);
        const zoom = this.map.getZoom();
        document.getElementById('coords').textContent = `Lat: ${lat}, Lng: ${lng} | Zoom: ${zoom}`;
    },

    // === GEOLocate ===
    async geolocate() {
        if (!navigator.geolocation) { this.showToast('Geolocalizacion no soportada'); return; }
        this.showToast('Buscando ubicacion...');
        try {
            const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
            });
            const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            this.addMarker(latlng, { address: 'Tu ubicacion', icon: this.getMarkerIcon('#2ecc71') });
            this.map.flyTo(latlng, 12);
            this.showToast('Ubicacion encontrada');
        } catch (err) {
            this.showToast('No se pudo obtener la ubicacion');
        }
    },

    // === MARKERS ON MAP ===
    addMarker(latlng, options = {}) {
        const marker = L.marker([latlng.lat, latlng.lng], {
            icon: options.icon || this.getMarkerIcon('#e94560')
        }).addTo(this.markersLayer);
        marker.bindPopup(options.popup || `<strong>${options.address || 'Marker'}</strong>`).openPopup();
    },

    getMarkerIcon(color) {
        return L.divIcon({
            className: 'doctor-marker',
            iconSize: [16, 16], iconAnchor: [8, 8],
            html: `<div style="background:${color};border:2px solid #fff;border-radius:50%;width:16px;height:16px;"></div>`
        });
    },

    // === LOAD DATA ON MAP ===
    loadDoctors() {
        this.doctorsLayer.clearLayers();
        const doctors = DB.getDoctors().filter(d => d[5] !== null && d[6] !== null);
        doctors.forEach(d => {
            const marker = L.marker([d[5], d[6]], {
                icon: this.getMarkerIcon('#2ecc71')
            }).addTo(this.doctorsLayer);
            marker.bindPopup(`<strong>${d[2]}</strong><br>${d[3]}<br>${d[7] || ''}`);
        });
        return doctors.length;
    },

    loadMpnLinks() {
        this.mpnLinksLayer.clearLayers();
        const links = DB.getMpnLinks();
        links.forEach(l => {
            const marker = L.marker([37, -105], {
                icon: this.getMarkerIcon('#3498db')
            }).addTo(this.mpnLinksLayer);
            marker.bindPopup(`<strong>${l[3]}</strong><br>${l[2] || ''}`);
        });
        return links.length;
    },

    loadReclamos() {
        this.reclamosLayer.clearLayers();
        const reclamos = DB.getReclamos();
        reclamos.forEach(r => {
            const marker = L.marker([37, -105], {
                icon: this.getMarkerIcon('#f39c12')
            }).addTo(this.reclamosLayer);
            marker.bindPopup(`<strong>Reclamo ${r[2]}</strong><br>Tipo: ${r[3]}<br>Estatus: ${r[7]}`);
        });
        return reclamos.length;
    },

    loadAseguranzas() {
        this.aseguranzasLayer.clearLayers();
        const asg = DB.getAseguranzas();
        asg.forEach(a => {
            const marker = L.marker([37, -105], {
                icon: this.getMarkerIcon('#e94560')
            }).addTo(this.aseguranzasLayer);
            marker.bindPopup(`<strong>${a[2]}</strong><br>${a[5] || ''}`);
        });
        return asg.length;
    },

    loadAll() {
        this.loadDoctors();
        this.loadMpnLinks();
        this.loadReclamos();
        this.loadAseguranzas();
    },

    // === MEASURE ===
    toggleMeasureMode() {
        this.measureMode = !this.measureMode;
        this.measurePointA = null;
        this.mpnLinksLayer.clearLayers();
        const btn = document.getElementById('btn-distance');
        if (btn) btn.classList.toggle('active', this.measureMode);
        this.showToast(this.measureMode ? 'Modo distancia activo - clic en punto A' : 'Modo distancia desactivado');
    },

    handleMeasureClick(latlng) {
        if (!this.measurePointA) {
            this.measurePointA = latlng;
            L.marker([latlng.lat, latlng.lng], { icon: this.getMarkerIcon('#2ecc71') }).addTo(this.mpnLinksLayer)
                .bindPopup('<strong>Punto A</strong>').openPopup();
            this.showToast('Punto A seleccionado - clic en punto B');
        } else {
            const dist = this.calculateDistance(
                this.measurePointA.lat, this.measurePointA.lng,
                latlng.lat, latlng.lng
            );
            L.polyline([this.measurePointA, latlng], { color: '#e94560', weight: 3, dashArray: '10,5' })
                .addTo(this.mpnLinksLayer);
            L.popup({ closeButton: true })
                .setLatLng([(this.measurePointA.lat + latlng.lat) / 2, (this.measurePointA.lng + latlng.lng) / 2])
                .setContent(`<strong>Distancia:</strong><br>${dist.km} km (${dist.miles} mi)`)
                .openOn(this.map);
            this.measurePointA = null;
            this.showToast(`Distancia: ${dist.km} km`);
        }
    },

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const km = R * c;
        return { km: km.toFixed(2), miles: (km * 0.621371).toFixed(2) };
    },

    showToast(msg) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = msg;
        document.getElementById('toast-container').appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
};

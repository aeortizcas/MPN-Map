const MAP = {
    map: null,
    statesLayer: null,
    markersLayer: null,
    distanceLayer: null,
    markers: [],
    currentState: null,
    measureMode: false,
    measurePointA: null,
    measurePointB: null,

    init() {
        L.Icon.Default.imagePath = 'lib/leaflet/images';

        this.map = L.map('map', {
            center: [39.8283, -98.5795],
            zoom: 4,
            zoomControl: false,
            attributionControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(this.map);

        this.markersLayer = L.layerGroup().addTo(this.map);
        this.distanceLayer = L.layerGroup().addTo(this.map);

        this.setupControls();
        this.setupEvents();
        this.loadStates();
        this.updateCoords();
    },

    setupControls() {
        document.getElementById('btn-zoom-in').addEventListener('click', () => {
            this.map.zoomIn();
        });
        document.getElementById('btn-zoom-out').addEventListener('click', () => {
            this.map.zoomOut();
        });
        document.getElementById('btn-reset').addEventListener('click', () => {
            this.map.setView([39.8283, -98.5795], 4);
        });
        document.getElementById('btn-geolocate').addEventListener('click', () => {
            GEOREF.geolocate();
        });
        document.getElementById('btn-distance').addEventListener('click', () => {
            this.toggleMeasureMode();
        });
        document.getElementById('btn-open-sqlite').addEventListener('click', () => {
            this.toggleSqlitePanel();
        });
        document.getElementById('btn-close-sqlite').addEventListener('click', () => {
            this.toggleSqlitePanel();
        });
        document.getElementById('btn-load-sqlite').addEventListener('click', async () => {
            await DB.loadToMap();
        });
        document.getElementById('btn-clear-sqlite').addEventListener('click', () => {
            DB.clearAll();
            this.markersLayer.clearLayers();
            this.markers = [];
            document.getElementById('sqlite-markers-list').innerHTML = '';
            document.getElementById('marker-count').textContent = '0 marcadores guardados';
            this.showToast('Base de datos limpia');
        });
        document.getElementById('btn-export-sqlite').addEventListener('click', () => {
            DB.exportDB();
        });
        this.setupSqliteImport();
    },

    setupSqliteImport() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.db,.sqlite';
        input.style.display = 'none';
        input.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                DB.importDB(e.target.files[0]);
            }
        });
        document.body.appendChild(input);

        const btn = document.createElement('button');
        btn.id = 'import-sqlite-btn';
        btn.title = 'Importar base de datos';
        btn.innerHTML = '<i class="fas fa-file-import"></i>';
        btn.addEventListener('click', () => input.click());
        document.body.appendChild(btn);
    },

    toggleSqlitePanel() {
        const panel = document.getElementById('sqlite-panel');
        panel.classList.toggle('open');
        if (panel.classList.contains('open')) {
            this.updateSqliteList();
        }
    },

    async updateSqliteList() {
        const markers = DB.getAllMarkers();
        document.getElementById('marker-count').textContent = `${markers.length} marcadores guardados`;
        const list = document.getElementById('sqlite-markers-list');
        if (markers.length === 0) {
            list.innerHTML = '<div style="color:#888;text-align:center;padding:20px;">No hay marcadores guardados</div>';
            return;
        }
        list.innerHTML = markers.map(m => `
            <div class="sqlite-marker-item">
                <div class="marker-info">
                    <div class="m-name">${m[3] || 'Sin nombre'}</div>
                    <div class="m-coords">${m[1].toFixed(4)}, ${m[2].toFixed(4)} | ${m[4]}</div>
                </div>
                <div class="marker-actions">
                    <button title="Volar" onclick="MAP.flyToMarker(${m[1]},${m[2]})"><i class="fas fa-location-arrow"></i></button>
                    <button title="Eliminar" onclick="MAP.deleteSqliteMarker(${m[0]})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    },

    flyToMarker(lat, lng) {
        this.map.flyTo([lat, lng], 10);
    },

    async deleteSqliteMarker(id) {
        DB.deleteMarker(id);
        this.updateSqliteList();
        this.showToast('Marcador eliminado');
    },

    toggleMeasureMode() {
        this.measureMode = !this.measureMode;
        this.measurePointA = null;
        this.measurePointB = null;
        this.distanceLayer.clearLayers();

        const btn = document.getElementById('btn-distance');
        btn.classList.toggle('active', this.measureMode);

        if (this.measureMode) {
            this.showToast('Modo distancia activo - haz clic en el mapa para el punto A');
        } else {
            this.showToast('Modo distancia desactivado');
        }
    },

    setupEvents() {
        this.map.on('mousemove', (e) => {
            this.updateCoords(e.latlng);
            if (this.measureMode && this.measurePointA && !this.measurePointB) {
                this.updateTempLine(e.latlng);
            }
        });
        this.map.on('zoomend', () => {
            this.updateCoords();
        });
        this.map.on('click', (e) => {
            if (this.measureMode) {
                this.handleMeasureClick(e.latlng);
                return;
            }
            if (!window.searchClicked && !window.geolocClicked) {
                this.addMarker(e.latlng);
            }
            window.searchClicked = false;
            window.geolocClicked = false;
        });
    },

    handleMeasureClick(latlng) {
        if (!this.measurePointA) {
            this.measurePointA = latlng;
            const marker = L.marker([latlng.lat, latlng.lng], {
                icon: L.divIcon({
                    className: 'custom-marker',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10],
                    html: '<div style="background:#2ecc71;border:2px solid #fff;border-radius:50%;width:20px;height:20px;"></div>'
                })
            }).addTo(this.distanceLayer);
            marker.bindPopup('<strong>Punto A</strong>').openPopup();
            this.showToast('Punto A seleccionado - haz clic en el punto B');
        } else if (!this.measurePointB) {
            this.measurePointB = latlng;
            const marker = L.marker([latlng.lat, latlng.lng], {
                icon: L.divIcon({
                    className: 'custom-marker',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10],
                    html: '<div style="background:#3498db;border:2px solid #fff;border-radius:50%;width:20px;height:20px;"></div>'
                })
            }).addTo(this.distanceLayer);
            marker.bindPopup('<strong>Punto B</strong>').openPopup();

            const distance = this.calculateDistance(
                this.measurePointA.lat, this.measurePointA.lng,
                this.measurePointB.lat, this.measurePointB.lng
            );

            const polyline = L.polyline(
                [this.measurePointA, this.measurePointB],
                { color: '#e94560', weight: 3, opacity: 0.8, dashArray: '10, 5' }
            ).addTo(this.distanceLayer);

            const midLat = (this.measurePointA.lat + this.measurePointB.lat) / 2;
            const midLng = (this.measurePointA.lng + this.measurePointB.lng) / 2;
            const midPopup = L.popup({ closeButton: true })
                .setLatLng([midLat, midLng])
                .setContent(`<div style="padding:8px;text-align:center;"><strong>Distancia:</strong><br><span style="font-size:20px;font-weight:700;color:#e94560;">${distance.km} km</span><br><span style="font-size:12px;color:#888;">${distance.miles.toFixed(2)} millas</span></div>`)
                .openOn(this.map);

            this.showToast(`Distancia: ${distance.km} km (${distance.miles.toFixed(2)} millas)`);
            this.measurePointA = null;
            this.measurePointB = null;
            setTimeout(() => {
                if (this.measureMode) {
                    this.showToast('Haz clic para el nuevo punto A');
                }
            }, 2000);
        }
    },

    updateTempLine(latlng) {
        this.distanceLayer.clearLayers();
        const markerA = L.marker([this.measurePointA.lat, this.measurePointA.lng], {
            icon: L.divIcon({
                className: 'custom-marker',
                iconSize: [20, 20],
                iconAnchor: [10, 10],
                html: '<div style="background:#2ecc71;border:2px solid #fff;border-radius:50%;width:20px;height:20px;"></div>'
            })
        }).addTo(this.distanceLayer);
        markerA.bindPopup('<strong>Punto A</strong>').openPopup();

        const tempLine = L.polyline(
            [this.measurePointA, latlng],
            { color: '#e94560', weight: 2, opacity: 0.5, dashArray: '5, 5' }
        ).addTo(this.distanceLayer);

        const dist = this.calculateDistance(
            this.measurePointA.lat, this.measurePointA.lng,
            latlng.lat, latlng.lng
        );
        this.showToast(`Distancia a punto A: ${dist.km.toFixed(2)} km`);
    },

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const km = R * c;
        return { km: km.toFixed(2), miles: (km * 0.621371).toFixed(2) };
    },

    updateCoords(e) {
        const lat = e ? e.latlng.lat.toFixed(4) : this.map.getCenter().lat.toFixed(4);
        const lng = e ? e.latlng.lng.toFixed(4) : this.map.getCenter().lng.toFixed(4);
        const zoom = this.map.getZoom();
        document.getElementById('coords').textContent = `Lat: ${lat}, Lng: ${lng} | Zoom: ${zoom}`;
    },

    async loadStates() {
        try {
            const response = await fetch('data/us-states.json');
            const data = await response.json();
            this.statesLayer = L.geoJSON(data, {
                style: {
                    fillColor: '#1a1a2e',
                    weight: 1.5,
                    opacity: 1,
                    color: '#e94560',
                    fillOpacity: 0.5
                },
                onEachFeature: (feature, layer) => {
                    const name = feature.properties.name || feature.properties.Name || 'Desconocido';
                    layer.on('mouseover', () => {
                        layer.setStyle({ fillColor: '#e94560', fillOpacity: 0.5 });
                    });
                    layer.on('mouseout', () => {
                        layer.setStyle({ fillColor: '#1a1a2e', fillOpacity: 0.5 });
                    });
                    layer.on('click', () => {
                        this.selectState(name, layer);
                    });
                }
            }).addTo(this.map);
            this.fitBounds();
        } catch (err) {
            console.error('Error cargando GeoJSON:', err);
            this.showToast('Error al cargar limites de estados');
        }
    },

    fitBounds() {
        if (this.statesLayer) {
            this.map.fitBounds(this.statesLayer.getBounds(), { padding: [50, 50] });
        }
    },

    selectState(name, layer) {
        if (this.currentState) {
            this.currentState.setStyle({ fillColor: '#1a1a2e', fillOpacity: 0.5 });
        }
        layer.setStyle({ fillColor: '#e94560', fillOpacity: 0.6 });
        this.currentState = layer;
        document.getElementById('state-info').textContent = `Estado: ${name}`;
        this.showToast(`Estado seleccionado: ${name}`);
    },

    addMarker(latlng, options = {}) {
        const defaultIcon = L.divIcon({
            className: 'custom-marker',
            iconSize: [18, 18],
            iconAnchor: [9, 9]
        });
        const marker = L.marker([latlng.lat, latlng.lng], {
            icon: options.icon || defaultIcon
        }).addTo(this.markersLayer);

        const popupContent = options.popup || `
            <div style="padding:5px;">
                <strong>Ubicacion</strong><br>
                Lat: ${latlng.lat.toFixed(4)}<br>
                Lng: ${latlng.lng.toFixed(4)}<br>
                ${options.address ? 'Direccion: ' + options.address + '<br>' : ''}
            </div>
        `;
        marker.bindPopup(popupContent);
        marker.openPopup();

        this.markers.push({ lat: latlng.lat, lng: latlng.lng, marker, address: options.address || null });
        if (DB.loaded && options.saveToDb !== false) {
            DB.addMarker(latlng.lat, latlng.lng, options.address || '', options.type || 'custom');
        }
        this.showToast('Marcador agregado');
    },

    addMarkerFromSearch(latlng, address) {
        this.addMarker(latlng, { address, icon: L.divIcon({
            className: 'custom-marker',
            iconSize: [22, 22],
            iconAnchor: [11, 11]
        })});
        this.map.flyTo(latlng, 12);
    },

    clearMarkers() {
        this.markersLayer.clearLayers();
        this.markers = [];
    },

    showToast(msg) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    MAP.init();
});

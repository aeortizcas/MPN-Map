const SEARCH = {
    debounceTimer: null,
    activeInput: null,

    init() {
        const inputA = document.getElementById('search-a');
        const inputB = document.getElementById('search-b');
        const btn = document.getElementById('search-btn');
        const btnMeasure = document.getElementById('btn-measure');
        const results = document.getElementById('search-results');

        this.activeInput = inputA;
        inputA.setAttribute('data-search-for', 'a');
        inputB.setAttribute('data-search-for', 'b');

        [inputA, inputB].forEach(input => {
            input.addEventListener('focus', () => {
                this.activeInput = input;
            });

            input.addEventListener('input', () => {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    if (input.value.length >= 3) {
                        this.autocomplete(input.value, input);
                    } else {
                        results.style.display = 'none';
                    }
                }, 300);
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.search(input);
                }
                if (e.key === 'Escape') {
                    results.style.display = 'none';
                }
            });
        });

        btn.addEventListener('click', () => {
            this.search(this.activeInput || inputA);
        });

        btnMeasure.addEventListener('click', () => {
            this.measureDistance();
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#search-container')) {
                results.style.display = 'none';
            }
        });
    },

    getActiveInput() {
        return this.activeInput || document.getElementById('search-a');
    },

    buildUrl(query, limit) {
        const params = new URLSearchParams({
            format: 'json',
            q: query,
            countrycodes: 'us',
            limit: limit.toString(),
            addressdetails: '1',
            namedetails: '1',
            extratags: '1',
            accept_language: 'es,en',
            viewbox: '-130,50,-65,25',
            bounded: '1'
        });
        return `https://nominatim.openstreetmap.org/search?${params.toString()}`;
    },

    async autocomplete(query, inputElement) {
        try {
            const url = this.buildUrl(query, 8);
            const response = await fetch(url, {
                headers: { 'Accept-Language': 'es,en' }
            });
            const data = await response.json();
            const results = document.getElementById('search-results');

            if (data.length === 0) {
                results.innerHTML = '<div class="result-item"><div class="result-name">Sin resultados para EE.UU.</div></div>';
                results.style.display = 'block';
                return;
            }

            results.innerHTML = data.map(item => {
                const typeIcon = this.getTypeIcon(item.type);
                return `
                <div class="result-item" data-lat="${item.lat}" data-lon="${item.lon}" data-display="${item.display_name}" data-searchfor="${inputElement.getAttribute('data-search-for')}">
                    <div class="result-name">${typeIcon} ${item.display_name}</div>
                    <div class="result-addr">${item.type || ''} ${item.class || ''}</div>
                </div>`;
            }).join('');

            results.style.display = 'block';

            results.querySelectorAll('.result-item').forEach(el => {
                el.addEventListener('click', () => {
                    const lat = parseFloat(el.dataset.lat);
                    const lon = parseFloat(el.dataset.lon);
                    const display = el.dataset.display;
                    const searchFor = el.dataset.searchfor;
                    const targetInput = searchFor === 'b'
                        ? document.getElementById('search-b')
                        : document.getElementById('search-a');
                    targetInput.value = display;
                    results.style.display = 'none';
                    MAP.showToast(`Punto ${searchFor.toUpperCase()}: ${display}`);
                });
            });
        } catch (err) {
            console.error('Error en autocomplete:', err);
        }
    },

    getTypeIcon(type) {
        const icons = {
            'city': '🏙️', 'town': '🏘️', 'village': '🏡', 'suburb': '🏘️',
            'neighbourhood': '📍', 'state': '🗺️', 'county': '🏛️', 'country': '🌎',
            'highway': '🚗', 'road': '🛣️', 'building': '🏢', 'place_of_worship': '⛪',
            'school': '🏫', 'hospital': '🏥', 'park': '🌳', 'restaurant': '🍽️',
            'post_office': '🏣', 'airport': '✈️', 'station': '🚉', 'university': '🎓'
        };
        return icons[type] || '📌';
    },

    async search(inputElement) {
        const query = inputElement.value;
        if (!query.trim()) return;
        try {
            const url = this.buildUrl(query, 5);
            const response = await fetch(url, {
                headers: { 'Accept-Language': 'es,en' }
            });
            const data = await response.json();
            const results = document.getElementById('search-results');

            if (data.length === 0) {
                MAP.showToast('No se encontro ningun resultado en Estados Unidos');
                return;
            }

            const first = data[0];
            const lat = parseFloat(first.lat);
            const lon = parseFloat(first.lon);
            const display = first.display_name;
            const type = first.type || '';

            inputElement.value = display;
            results.style.display = 'none';

            if (inputElement.id === 'search-a') {
                MAP.addMarker({ lat, lng: lon }, { address: `${display} (Punto A)`, icon: this.getMarkerIcon('#2ecc71') });
                MAP.map.flyTo([lat, lon], 10);
            } else {
                MAP.addMarker({ lat, lng: lon }, { address: `${display} (Punto B)`, icon: this.getMarkerIcon('#3498db') });
                MAP.map.flyTo([lat, lon], 10);
            }
        } catch (err) {
            console.error('Error en busqueda:', err);
            MAP.showToast('Error en la busqueda');
        }
    },

    getMarkerIcon(color) {
        return L.divIcon({
            className: 'custom-marker',
            iconSize: [22, 22],
            iconAnchor: [11, 11],
            html: `<div style="background:${color};border:2px solid #fff;border-radius:50%;width:22px;height:22px;"></div>`
        });
    },

    async measureDistance() {
        const inputA = document.getElementById('search-a');
        const inputB = document.getElementById('search-b');
        const valA = inputA.value.trim();
        const valB = inputB.value.trim();

        if (!valA || !valB) {
            MAP.showToast('Busca ambos puntos primero');
            return;
        }

        const coordA = await this.geocodeAddress(valA);
        const coordB = await this.geocodeAddress(valB);

        if (!coordA || !coordB) {
            MAP.showToast('No se encontro alguna de las direcciones');
            return;
        }

        MAP.distanceLayer.clearLayers();
        MAP.markersLayer.clearLayers();
        MAP.markers = [];

        const markerA = L.marker([coordA.lat, coordA.lng], {
            icon: this.getMarkerIcon('#2ecc71')
        }).addTo(MAP.markersLayer);
        markerA.bindPopup(`<strong>Punto A</strong><br>${valA}`).openPopup();

        const markerB = L.marker([coordB.lat, coordB.lng], {
            icon: this.getMarkerIcon('#3498db')
        }).addTo(MAP.markersLayer);
        markerB.bindPopup(`<strong>Punto B</strong><br>${valB}`).openPopup();

        MAP.markers.push(
            { lat: coordA.lat, lng: coordA.lng, marker: markerA, address: valA },
            { lat: coordB.lat, lng: coordB.lng, marker: markerB, address: valB }
        );

        const distance = MAP.calculateDistance(
            coordA.lat, coordA.lng,
            coordB.lat, coordB.lng
        );

        const polyline = L.polyline(
            [coordA, coordB],
            { color: '#e94560', weight: 3, opacity: 0.8, dashArray: '10, 5' }
        ).addTo(MAP.distanceLayer);

        const bounds = L.latLngBounds([coordA, coordB]);
        MAP.map.fitBounds(bounds, { padding: [80, 80] });

        const midLat = (coordA.lat + coordB.lat) / 2;
        const midLng = (coordA.lng + coordB.lng) / 2;
        const midPopup = L.popup({ closeButton: true })
            .setLatLng([midLat, midLng])
            .setContent(`<div style="padding:10px;text-align:center;background:#1a1a2e;color:#fff;border-radius:8px;"><strong>Distancia entre puntos</strong><br><span style="font-size:24px;font-weight:700;color:#e94560;">${distance.km} km</span><br><span style="font-size:13px;color:#aaa;">${distance.miles} millas</span></div>`)
            .openOn(MAP.map);

        const measureResult = document.getElementById('measure-result');
        measureResult.textContent = `${distance.km} km (${distance.miles} mi)`;
        measureResult.style.display = 'block';
        setTimeout(() => { measureResult.style.display = 'none'; }, 5000);

        MAP.showToast(`Distancia: ${distance.km} km (${distance.miles} millas)`);
    },

    async geocodeAddress(address) {
        try {
            const url = this.buildUrl(address, 1);
            const response = await fetch(url, {
                headers: { 'Accept-Language': 'es,en' }
            });
            const data = await response.json();
            if (data.length > 0) {
                return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            }
            return null;
        } catch (err) {
            console.error('Error geocoding:', err);
            return null;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    SEARCH.init();
});

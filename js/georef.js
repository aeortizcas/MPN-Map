const GEOREF = {
    init() {
        // Agregar boton de exportar/importar marcadores
        const btnExport = document.createElement('button');
        btnExport.title = 'Exportar marcadores';
        btnExport.innerHTML = '<i class="fas fa-download"></i>';
        btnExport.addEventListener('click', () => this.exportMarkers());
        document.getElementById('controls').appendChild(btnExport);

        const btnImport = document.createElement('button');
        btnImport.title = 'Importar marcadores';
        btnImport.innerHTML = '<i class="fas fa-upload"></i>';
        btnImport.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => this.importMarkers(e.target.files[0]);
            input.click();
        });
        document.getElementById('controls').appendChild(btnImport);
    },

    async geolocate() {
        if (!navigator.geolocation) {
            MAP.showToast('Geolocalizacion no soportada');
            return;
        }
        MAP.showToast('Buscando ubicacion...');
        try {
            const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            });
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const latlng = { lat, lng };

            MAP.addMarkerFromSearch(latlng, 'Tu ubicacion');
            MAP.map.flyTo(latlng, 12);
            window.geolocClicked = true;

            this.reverseGeocode(latlng);
        } catch (err) {
            if (err.code === err.PERMISSION_DENIED) {
                MAP.showToast('Permiso de ubicacion denegado');
            } else {
                MAP.showToast('No se pudo obtener la ubicacion');
            }
        }
    },

    async reverseGeocode(latlng) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&addressdetails=1&language=es`
            );
            const data = await response.json();
            if (data.display_name) {
                const addr = data.display_name.split(',')[0];
                const lastMarker = MAP.markers[MAP.markers.length - 1];
                if (lastMarker) {
                    lastMarker.address = addr;
                    lastMarker.marker.setPopupContent(`
                        <div style="padding:5px;">
                            <strong>${addr}</strong><br>
                            Lat: ${latlng.lat.toFixed(4)}<br>
                            Lng: ${latlng.lng.toFixed(4)}<br>
                        </div>
                    `);
                }
            }
        } catch (err) {
            console.error('Error en reverse geocoding:', err);
        }
    },

    async getAddress(latlng) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&addressdetails=1`
            );
            const data = await response.json();
            return data.display_name || 'Direccion no encontrada';
        } catch (err) {
            return 'Error al obtener direccion';
        }
    },

    async getCoordinates(address) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&addressdetails=1`
            );
            const data = await response.json();
            if (data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon),
                    address: data[0].display_name
                };
            }
            return null;
        } catch (err) {
            console.error('Error obteniendo coordenadas:', err);
            return null;
        }
    },

    exportMarkers() {
        const data = MAP.markers.map(m => ({
            lat: m.lat,
            lng: m.lng,
            address: m.address
        }));
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'marcadores_mapa.json';
        a.click();
        URL.revokeObjectURL(url);
        MAP.showToast('Marcadores exportados');
    },

    importMarkers(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                data.forEach(item => {
                    MAP.addMarker({ lat: item.lat, lng: item.lng }, { address: item.address });
                });
                MAP.showToast(`${data.length} marcadores importados`);
            } catch (err) {
                MAP.showToast('Archivo invalido');
            }
        };
        reader.readAsText(file);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    GEOREF.init();
});

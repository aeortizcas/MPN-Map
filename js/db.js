const DB = {
    db: null,
    loaded: false,

    async init() {
        try {
            const SQL = await loadSqlJs({
                locateFile: file => `lib/sql.js/${file}`
            });
            const buf = await fetch('data/markers.db').catch(() => null);
            if (buf) {
                const u8 = new Uint8Array(await buf.arrayBuffer());
                this.db = new SQL.Database(u8);
            } else {
                this.db = new SQL.Database();
            }
            this.db.run(`
                CREATE TABLE IF NOT EXISTS markers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    lat REAL NOT NULL,
                    lng REAL NOT NULL,
                    address TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    type TEXT DEFAULT 'custom'
                )
            `);
            this.loaded = true;
            this.showToast('Base de datos SQLite lista');
        } catch (err) {
            console.error('Error SQLite:', err);
            this.showToast('Error al iniciar SQLite - ' + err.message);
        }
    },

    addMarker(lat, lng, address, type = 'custom') {
        if (!this.loaded) return false;
        try {
            const stmt = this.db.prepare(
                'INSERT INTO markers (lat, lng, address, type) VALUES (?, ?, ?, ?)'
            );
            stmt.run([lat, lng, address || '', type]);
            stmt.free();
            return true;
        } catch (err) {
            console.error('Error insertando:', err);
            return false;
        }
    },

    getAllMarkers() {
        if (!this.loaded) return [];
        try {
            const result = this.db.exec('SELECT * FROM markers ORDER BY created_at DESC');
            if (result.length === 0) return [];
            return JSON.parse(result[0].values);
        } catch (err) {
            console.error('Error leyendo:', err);
            return [];
        }
    },

    getMarkerCount() {
        if (!this.loaded) return 0;
        try {
            const result = this.db.exec('SELECT COUNT(*) as count FROM markers');
            return result.length > 0 ? result[0].values[0][0] : 0;
        } catch (err) {
            return 0;
        }
    },

    deleteMarker(id) {
        if (!this.loaded) return false;
        try {
            this.db.run('DELETE FROM markers WHERE id = ?', [id]);
            return true;
        } catch (err) {
            return false;
        }
    },

    clearAll() {
        if (!this.loaded) return false;
        try {
            this.db.run('DELETE FROM markers');
            return true;
        } catch (err) {
            return false;
        }
    },

    exportDB() {
        if (!this.loaded) return;
        try {
            const data = this.db.export();
            const blob = new Blob([data], { type: 'application/x-sqlite3' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'mpn_map_data.db';
            a.click();
            URL.revokeObjectURL(url);
            this.showToast('Base de datos exportada');
        } catch (err) {
            this.showToast('Error al exportar');
        }
    },

    async importDB(file) {
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const data = new Uint8Array(e.target.result);
                this.db = new SQL.Database(data);
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS markers (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        lat REAL NOT NULL,
                        lng REAL NOT NULL,
                        address TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        type TEXT DEFAULT 'custom'
                    )
                `);
                this.loaded = true;
                this.showToast(`Base de datos importada`);
            };
            reader.readAsArrayBuffer(file);
        } catch (err) {
            this.showToast('Error al importar');
        }
    },

    async loadToMap() {
        const markers = this.getAllMarkers();
        MAP.markersLayer.clearLayers();
        MAP.markers = [];
        markers.forEach(m => {
            const marker = L.marker([m[1], m[2]], {
                icon: L.divIcon({
                    className: 'custom-marker',
                    iconSize: [22, 22],
                    iconAnchor: [11, 11],
                    html: '<div style="background:#9b59b6;border:2px solid #fff;border-radius:50%;width:22px;height:22px;"></div>'
                })
            }).addTo(MAP.markersLayer);
            marker.bindPopup(`<strong>${m[3] || 'Sin nombre'}</strong><br>Lat: ${m[1].toFixed(4)}<br>Lng: ${m[2].toFixed(4)}<br><small>Guardado: ${m[4]}</small>`);
            MAP.markers.push({ lat: m[1], lng: m[2], marker, address: m[3] });
        });
        if (markers.length > 0) {
            MAP.showToast(`${markers.length} marcadores cargados de SQLite`);
        }
    },

    showToast(msg) {
        MAP.showToast(msg);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    DB.init();
});

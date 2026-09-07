const DB = {
    db: null,
    loaded: false,
    SQL: null,

    async init() {
        try {
            this.SQL = await loadSqlJs({
                locateFile: file => `lib/sql.js/${file}`
            });
            this.db = new this.SQL.Database();

            // Crear todas las tablas
            this.db.run(`
                CREATE TABLE IF NOT EXISTS aseguranzas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT NOT NULL,
                    policy_number TEXT,
                    telefono TEXT,
                    email TEXT,
                    direccion TEXT,
                    estado TEXT
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS defense_attorneys (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT NOT NULL,
                    firma TEXT,
                    especialidad TEXT,
                    telefono TEXT,
                    email TEXT,
                    direccion TEXT,
                    estado TEXT,
                    activo INTEGER DEFAULT 1
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS mpn_links (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    url TEXT,
                    nombre TEXT,
                    aseguranca_id INTEGER,
                    caso_asociado TEXT,
                    FOREIGN KEY(aseguranca_id) REFERENCES aseguranzas(id)
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS doctors (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT NOT NULL,
                    especialidad TEXT,
                    zipcode TEXT,
                    lat REAL,
                    lng REAL,
                    telefono TEXT
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS doctor_facilities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    doctor_id INTEGER NOT NULL,
                    mpn_link_id INTEGER NOT NULL,
                    facility_name TEXT,
                    facility_type TEXT,
                    body_part TEXT,
                    rol_proveedor TEXT DEFAULT 'OTRO',
                    estado TEXT DEFAULT 'Activo',
                    FOREIGN KEY(doctor_id) REFERENCES doctors(id),
                    FOREIGN KEY(mpn_link_id) REFERENCES mpn_links(id)
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS reclamos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    codigo_aseguranza TEXT,
                    tipo TEXT DEFAULT 'Workers Comp',
                    fecha_reclamo TEXT,
                    fecha_lesion TEXT,
                    descripcion TEXT,
                    estatus TEXT DEFAULT 'Abierto',
                    mpn_link_id INTEGER,
                    FOREIGN KEY(mpn_link_id) REFERENCES mpn_links(id)
                )
            `);

            this.showToast('Base de datos SQLite lista');
            this.loaded = true;
        } catch (err) {
            console.error('Error SQLite:', err);
            this.showToast('Error al iniciar SQLite: ' + err.message);
        }
    },

    // === ASEGURANZAS ===
    getAseguranzas() {
        if (!this.loaded) return [];
        const result = this.db.exec('SELECT * FROM aseguranzas ORDER BY nombre');
        if (!result.length) return [];
        return JSON.parse(result[0].values);
    },

    addAseguranca(nombre, policy_number, telefono, email, direccion, estado) {
        const stmt = this.db.prepare('INSERT INTO aseguranzas (nombre, policy_number, telefono, email, direccion, estado) VALUES (?, ?, ?, ?, ?, ?)');
        stmt.run([nombre, policy_number, telefono, email, direccion, estado]);
        stmt.free();
    },

    deleteAseguranca(id) { this.db.run('DELETE FROM aseguranzas WHERE id = ?', [id]); },

    // === DEFENSE ATTORNEYS ===
    getAttorneys() {
        const result = this.db.exec('SELECT * FROM defense_attorneys ORDER BY nombre');
        if (!result.length) return [];
        return JSON.parse(result[0].values);
    },

    addAttorney(nombre, firma, especialidad, telefono, email, direccion, estado) {
        const stmt = this.db.prepare('INSERT INTO defense_attorneys (nombre, firma, especialidad, telefono, email, direccion, estado) VALUES (?, ?, ?, ?, ?, ?, ?)');
        stmt.run([nombre, firma, especialidad, telefono, email, direccion, estado]);
        stmt.free();
    },

    // === MPN LINKS ===
    getMpnLinks() {
        const result = this.db.exec('SELECT ml.*, a.nombre as aseguranca_nombre FROM mpn_links ml LEFT JOIN aseguranzas a ON ml.aseguranca_id = a.id ORDER BY ml.nombre');
        if (!result.length) return [];
        return JSON.parse(result[0].values);
    },

    addMpnLink(url, nombre, aseguranca_id, caso_asociado) {
        const stmt = this.db.prepare('INSERT INTO mpn_links (url, nombre, aseguranca_id, caso_asociado) VALUES (?, ?, ?, ?)');
        stmt.run([url, nombre, aseguranca_id, caso_asociado]);
        stmt.free();
    },

    deleteMpnLink(id) { this.db.run('DELETE FROM mpn_links WHERE id = ?', [id]); },

    // === DOCTORES ===
    getDoctors() {
        const result = this.db.exec('SELECT * FROM doctors ORDER BY nombre');
        if (!result.length) return [];
        return JSON.parse(result[0].values);
    },

    addDoctor(nombre, especialidad, zipcode, lat, lng, telefono) {
        const stmt = this.db.prepare('INSERT INTO doctors (nombre, especialidad, zipcode, lat, lng, telefono) VALUES (?, ?, ?, ?, ?, ?)');
        stmt.run([nombre, especialidad, zipcode, lat, lng, telefono]);
        stmt.free();
    },

    deleteDoctor(id) { this.db.run('DELETE FROM doctors WHERE id = ?', [id]); },

    // === DOCTOR FACILITIES ===
    getDoctorFacilities() {
        const result = this.db.exec(`
            SELECT df.*, d.nombre as doctor_nombre, ml.nombre as mpn_nombre
            FROM doctor_facilities df
            LEFT JOIN doctors d ON df.doctor_id = d.id
            LEFT JOIN mpn_links ml ON df.mpn_link_id = ml.id
            ORDER BY d.nombre
        `);
        if (!result.length) return [];
        return JSON.parse(result[0].values);
    },

    addDoctorFacility(doctor_id, mpn_link_id, facility_name, facility_type, body_part, rol_proveedor, estado) {
        const stmt = this.db.prepare('INSERT INTO doctor_facilities (doctor_id, mpn_link_id, facility_name, facility_type, body_part, rol_proveedor, estado) VALUES (?, ?, ?, ?, ?, ?, ?)');
        stmt.run([doctor_id, mpn_link_id, facility_name, facility_type, body_part, rol_proveedor, estado]);
        stmt.free();
    },

    // === RECLAMOS ===
    getReclamos() {
        const result = this.db.exec('SELECT r.*, ml.nombre as mpn_nombre FROM reclamos r LEFT JOIN mpn_links ml ON r.mpn_link_id = ml.id ORDER BY r.fecha_reclamo DESC');
        if (!result.length) return [];
        return JSON.parse(result[0].values);
    },

    addReclamo(codigo_aseguranza, tipo, fecha_reclamo, fecha_lesion, descripcion, estatus, mpn_link_id) {
        const stmt = this.db.prepare('INSERT INTO reclamos (codigo_aseguranza, tipo, fecha_reclamo, fecha_lesion, descripcion, estatus, mpn_link_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
        stmt.run([codigo_aseguranza, tipo, fecha_reclamo, fecha_lesion, descripcion, estatus, mpn_link_id]);
        stmt.free();
    },

    // === DASHBOARD ===
    getCounts() {
        const tables = ['aseguranzas', 'defense_attorneys', 'mpn_links', 'doctors', 'doctor_facilities', 'reclamos'];
        const counts = {};
        tables.forEach(t => {
            const r = this.db.exec(`SELECT COUNT(*) as c FROM ${t}`);
            counts[t] = r.length ? r[0].values[0][0] : 0;
        });
        return counts;
    },

    // === HELPERS ===
    getAllDoctorsWithLatLng() {
        const doctors = this.getDoctors();
        return doctors.filter(d => d[4] !== null && d[4] !== undefined && d[5] !== null && d[5] !== undefined);
    },

    showToast(msg) {
        if (window.MAP && window.MAP.showToast) {
            MAP.showToast(msg);
        } else {
            const toast = document.createElement('div');
            toast.className = 'toast';
            toast.textContent = msg;
            document.getElementById('toast-container').appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }
    }
};

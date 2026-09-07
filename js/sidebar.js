const SIDEBAR = {
    currentTab: 'dashboard',
    currentData: [],

    init() {
        this.setupNavigation();
        this.loadTab('dashboard');
    },

    setupNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.loadTab(btn.dataset.tab);
            });
        });

        document.getElementById('btn-close-panel').addEventListener('click', () => {
            document.getElementById('sidebar-panel').classList.remove('open');
        });
    },

    loadTab(tab) {
        this.currentTab = tab;
        const panel = document.getElementById('sidebar-panel');
        const title = document.getElementById('panel-title');
        const content = document.getElementById('panel-content');

        panel.classList.add('open');

        const tabInfo = {
            dashboard: { title: 'Dashboard', render: () => this.renderDashboard() },
            aseguranza: { title: 'Aseguranzas', render: () => this.renderAseguranzas() },
            mpnlink: { title: 'MPN Links', render: () => this.renderMpnLinks() },
            doctor: { title: 'Doctores', render: () => this.renderDoctors() },
            reclamo: { title: 'Reclamos', render: () => this.renderReclamos() },
            attorney: { title: 'Defense Attorneys', render: () => this.renderAttorneys() },
            mapview: { title: 'Ver Mapa', render: () => this.renderMapView() }
        };

        title.textContent = tabInfo[tab]?.title || tab;
        tabInfo[tab]?.render();
        MAP.loadAll();
    },

    updateCount(count) {
        document.getElementById('sidebar-count').textContent = `${count} registros`;
    },

    // === DASHBOARD ===
    renderDashboard() {
        const counts = DB.getCounts();
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        document.getElementById('panel-content').innerHTML = `
            <div class="panel-section">
                <h3>Estadisticas</h3>
                <div class="dash-card">
                    <div class="card-count">${total}</div>
                    <div class="card-label">Total registros</div>
                </div>
                <div class="dash-card">
                    <div class="card-count">${counts.aseguranzas}</div>
                    <div class="card-label">Aseguranzas</div>
                </div>
                <div class="dash-card">
                    <div class="card-count">${counts.mpn_links}</div>
                    <div class="card-label">MPN Links</div>
                </div>
                <div class="dash-card">
                    <div class="card-count">${counts.doctors}</div>
                    <div class="card-label">Doctores</div>
                </div>
                <div class="dash-card">
                    <div class="card-count">${counts.doctor_facilities}</div>
                    <div class="card-label">Doctor Facilities</div>
                </div>
                <div class="dash-card">
                    <div class="card-count">${counts.reclamos}</div>
                    <div class="card-label">Reclamos</div>
                </div>
                <div class="dash-card">
                    <div class="card-count">${counts.defense_attorneys}</div>
                    <div class="card-label">Defense Attorneys</div>
                </div>
            </div>
            <div class="panel-section">
                <h3>Mapa</h3>
                <button class="btn-primary" onclick="MAP.loadAll(); SIDEBAR.showToast('Mapa actualizado')">
                    <i class="fas fa-sync"></i> Refrescar mapa
                </button>
            </div>
            <div class="panel-section">
                <h3>Medir Distancia</h3>
                <button class="btn-secondary" onclick="MAP.toggleMeasureMode()">
                    <i class="fas fa-ruler"></i> ${MAP.measureMode ? 'Desactivar' : 'Activar'} modo distancia
                </button>
            </div>
        `;
    },

    // === ASEGURANZAS ===
    renderAseguranzas() {
        const data = DB.getAseguranzas();
        let html = `<div class="panel-section">
            <button class="btn-primary" onclick="SIDEBAR.showForm('aseguranca')" style="margin-bottom:10px;">
                <i class="fas fa-plus"></i> Agregar Aseguranza
            </button></div>`;
        data.forEach(a => {
            html += `<div class="panel-item" onclick="SIDEBAR.showToast('Aseguranza: ${a[2]}')">
                <div class="item-name">${a[2]}</div>
                <div class="item-detail">${a[5] || ''} | ${a[6] || ''}</div>
            </div>`;
        });
        document.getElementById('panel-content').innerHTML = html;
        this.updateCount(data.length);
        this.renderForm('aseguranca');
    },

    // === MPN LINKS ===
    renderMpnLinks() {
        const data = DB.getMpnLinks();
        let html = `<div class="panel-section">
            <button class="btn-primary" onclick="SIDEBAR.showForm('mpnlink')" style="margin-bottom:10px;">
                <i class="fas fa-plus"></i> Agregar MPN Link
            </button></div>`;
        data.forEach(l => {
            html += `<div class="panel-item">
                <div class="item-name">${l[3] || ''}</div>
                <div class="item-detail">${l[2] || ''} | Aseguranca: ${l[8] || ''}</div>
                <div class="item-detail">URL: ${l[1] || ''}</div>
            </div>`;
        });
        document.getElementById('panel-content').innerHTML = html;
        this.updateCount(data.length);
        this.renderForm('mpnlink');
    },

    // === DOCTORES ===
    renderDoctors() {
        const data = DB.getDoctors();
        let html = `<div class="panel-section">
            <button class="btn-primary" onclick="SIDEBAR.showForm('doctor')" style="margin-bottom:10px;">
                <i class="fas fa-plus"></i> Agregar Doctor
            </button></div>`;
        data.forEach(d => {
            html += `<div class="panel-item" onclick="MAP.map.flyTo([${d[5] || 37}, ${d[6] || -105}], 10)">
                <div class="item-name">${d[2]}</div>
                <div class="item-detail">${d[3] | ''} | ${d[7] || ''}</div>
                <div class="item-detail">Zip: ${d[4] || ''} | Tel: ${d[8] || ''}</div>
            </div>`;
        });
        document.getElementById('panel-content').innerHTML = html;
        this.updateCount(data.length);
        this.renderForm('doctor');
    },

    // === RECLAMOS ===
    renderReclamos() {
        const data = DB.getReclamos();
        let html = `<div class="panel-section">
            <button class="btn-primary" onclick="SIDEBAR.showForm('reclamo')" style="margin-bottom:10px;">
                <i class="fas fa-plus"></i> Agregar Reclamo
            </button></div>`;
        data.forEach(r => {
            html += `<div class="panel-item">
                <div class="item-name">Reclamo #${r[2]}</div>
                <div class="item-detail">Tipo: ${r[3] || ''} | Estatus: ${r[7] || ''}</div>
                <div class="item-detail">Codigo: ${r[1] || ''} | Fecha: ${r[4] || ''}</div>
            </div>`;
        });
        document.getElementById('panel-content').innerHTML = html;
        this.updateCount(data.length);
        this.renderForm('reclamo');
    },

    // === ATTORNEYS ===
    renderAttorneys() {
        const data = DB.getAttorneys();
        let html = `<div class="panel-section">
            <button class="btn-primary" onclick="SIDEBAR.showForm('attorney')" style="margin-bottom:10px;">
                <i class="fas fa-plus"></i> Agregar Attorney
            </button></div>`;
        data.forEach(a => {
            html += `<div class="panel-item">
                <div class="item-name">${a[2]}</div>
                <div class="item-detail">Firma: ${a[3] || ''} | Activo: ${a[9] ? 'Si' : 'No'}</div>
                <div class="item-detail">Esp: ${a[4] || ''} | Tel: ${a[5] || ''}</div>
            </div>`;
        });
        document.getElementById('panel-content').innerHTML = html;
        this.updateCount(data.length);
        this.renderForm('attorney');
    },

    // === MAP VIEW ===
    renderMapView() {
        document.getElementById('panel-content').innerHTML = `
            <div class="panel-section">
                <h3>Filtros del Mapa</h3>
                <div class="form-group">
                    <label>Especialidad</label>
                    <select id="filter-especialidad">
                        <option value="">Todas</option>
                        <option value="Ortopedia">Ortopedia</option>
                        <option value="Neurologia">Neurologia</option>
                        <option value="Quiropratica">Quiropratica</option>
                        <option value="Cardiologia">Cardiologia</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Rol del Proveedor</label>
                    <select id="filter-rol">
                        <option value="">Todos</option>
                        <option value="PTP">PTP</option>
                        <option value="STP">STP</option>
                        <option value="QME">QME</option>
                        <option value="LIEN">LIEN</option>
                        <option value="MTUS">MTUS</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Parte del Cuerpo</label>
                    <input type="text" id="filter-body" placeholder="Ej: Espalda, Rodilla..." />
                </div>
                <button class="btn-primary" onclick="SIDEBAR.filterMap()">
                    <i class="fas fa-filter"></i> Aplicar Filtros
                </button>
                <button class="btn-secondary" onclick="SIDEBAR.clearFilters()" style="margin-top:5px;">
                    <i class="fas fa-times"></i> Limpiar Filtros
                </button>
            </div>
            <div class="panel-section">
                <h3>Buscar por Zipcode</h3>
                <div class="form-group">
                    <input type="text" id="filter-zip" placeholder="Ej: 90210" />
                </div>
                <button class="btn-primary" onclick="SIDEBAR.searchByZip()">
                    <i class="fas fa-search"></i> Buscar Doctores
                </button>
            </div>
            <div class="panel-section">
                <h3>Capas del Mapa</h3>
                <button class="btn-secondary" onclick="MAP.loadAll()">
                    <i class="fas fa-sync"></i> Cargar todos los marcadores
                </button>
            </div>
        `;
    },

    filterMap() {
        MAP.doctorsLayer.clearLayers();
        const doctors = DB.getDoctors();
        const espec = document.getElementById('filter-especialidad')?.value || '';
        const rol = document.getElementById('filter-rol')?.value || '';
        const body = document.getElementById('filter-body')?.value?.toLowerCase() || '';
        const zip = document.getElementById('filter-zip')?.value || '';

        let filtered = doctors.filter(d => {
            if (espec && !d[3]?.includes(espec)) return false;
            if (zip && !d[4]?.includes(zip)) return false;
            return true;
        });

        filtered.forEach(d => {
            if (d[5] !== null && d[6] !== undefined && d[5] !== undefined) {
                MAP.addMarker({ lat: d[5], lng: d[6] }, {
                    address: `${d[2]} - ${d[3]}`,
                    icon: MAP.getMarkerIcon('#2ecc71')
                });
            }
        });
        MAP.showToast(`Se muestran ${filtered.length} doctores`);
    },

    clearFilters() {
        MAP.doctorsLayer.clearLayers();
        MAP.loadDoctors();
        MAP.showToast('Filtros limpiados');
    },

    searchByZip() {
        const zip = document.getElementById('filter-zip')?.value;
        if (!zip) { MAP.showToast('Ingresa un zipcode'); return; }
        MAP.doctorsLayer.clearLayers();
        const doctors = DB.getDoctors().filter(d => d[4]?.includes(zip) && d[5] !== null);
        doctors.forEach(d => {
            MAP.addMarker({ lat: d[5], lng: d[6] }, {
                address: `${d[2]} - ${d[3]}`,
                icon: MAP.getMarkerIcon('#2ecc71')
            });
        });
        MAP.showToast(`${doctors.length} doctores cerca de ${zip}`);
    },

    // === FORMS ===
    showForm(type) {
        const forms = {
            aseguranca: { title: 'Agregar Aseguranza', fields: [
                { name: 'nombre', label: 'Nombre', type: 'text' },
                { name: 'policy_number', label: 'Policy Number', type: 'text' },
                { name: 'telefono', label: 'Telefono', type: 'text' },
                { name: 'email', label: 'Email', type: 'text' },
                { name: 'direccion', label: 'Direccion', type: 'text' },
                { name: 'estado', label: 'Estado', type: 'text' }
            ]},
            mpnlink: { title: 'Agregar MPN Link', fields: [
                { name: 'url', label: 'URL', type: 'url' },
                { name: 'nombre', label: 'Nombre', type: 'text' },
                { name: 'aseguranca_id', label: 'ID Aseguranca', type: 'number' },
                { name: 'caso_asociado', label: 'Caso Asociado', type: 'text' }
            ]},
            doctor: { title: 'Agregar Doctor', fields: [
                { name: 'nombre', label: 'Nombre', type: 'text' },
                { name: 'especialidad', label: 'Especialidad', type: 'text' },
                { name: 'zipcode', label: 'Zipcode', type: 'text' },
                { name: 'lat', label: 'Latitud', type: 'number', step: '0.0001' },
                { name: 'lng', label: 'Longitud', type: 'number', step: '0.0001' },
                { name: 'telefono', label: 'Telefono', type: 'text' }
            ]},
            reclamo: { title: 'Agregar Reclamo', fields: [
                { name: 'codigo_aseguranza', label: 'Codigo Aseguranca', type: 'text' },
                { name: 'tipo', label: 'Tipo', type: 'select', options: ['Workers Comp', 'PI'] },
                { name: 'fecha_reclamo', label: 'Fecha Reclamo', type: 'date' },
                { name: 'fecha_lesion', label: 'Fecha Lesion', type: 'date' },
                { name: 'descripcion', label: 'Descripcion', type: 'textarea' },
                { name: 'estatus', label: 'Estatus', type: 'select', options: ['Abierto', 'En proceso', 'Cerrado'] },
                { name: 'mpn_link_id', label: 'ID MPN Link', type: 'number' }
            ]},
            attorney: { title: 'Agregar Attorney', fields: [
                { name: 'nombre', label: 'Nombre', type: 'text' },
                { name: 'firma', label: 'Firma', type: 'text' },
                { name: 'especialidad', label: 'Especialidad', type: 'text' },
                { name: 'telefono', label: 'Telefono', type: 'text' },
                { name: 'email', label: 'Email', type: 'text' },
                { name: 'direccion', label: 'Direccion', type: 'text' },
                { name: 'estado', label: 'Estado', type: 'text' }
            ]}
        };

        const form = forms[type];
        if (!form) return;

        let html = `<div class="panel-section"><h3>${form.title}</h3>`;
        form.fields.forEach(f => {
            html += `<div class="form-group">
                <label>${f.label}</label>`;
            if (f.type === 'select') {
                html += `<select name="${f.name}">`;
                f.options.forEach(opt => html += `<option value="${opt}">${opt}</option>`);
                html += `</select>`;
            } else if (f.type === 'textarea') {
                html += `<textarea name="${f.name}" rows="3"></textarea>`;
            } else {
                html += `<input type="${f.type}" name="${f.name}" ${f.step ? `step="${f.step}"` : ''} />`;
            }
            html += `</div>`;
        });
        html += `<button class="btn-primary" onclick="SIDEBAR.submitForm('${type}')">Guardar</button>
            <button class="btn-secondary" onclick="SIDEBAR.loadTab('${this.currentTab}')" style="margin-top:5px;">Cancelar</button>
        </div>`;

        document.getElementById('panel-content').innerHTML = html;
    },

    renderForm(type) {
        this.showForm(type);
    },

    submitForm(type) {
        const fields = {
            aseguranca: ['nombre', 'policy_number', 'telefono', 'email', 'direccion', 'estado'],
            mpnlink: ['url', 'nombre', 'aseguranca_id', 'caso_asociado'],
            doctor: ['nombre', 'especialidad', 'zipcode', 'lat', 'lng', 'telefono'],
            reclamo: ['codigo_aseguranza', 'tipo', 'fecha_reclamo', 'fecha_lesion', 'descripcion', 'estatus', 'mpn_link_id'],
            attorney: ['nombre', 'firma', 'especialidad', 'telefono', 'email', 'direccion', 'estado']
        };

        const values = fields[type].map(f => {
            const el = document.querySelector(`[name="${f}"]`);
            return el ? el.value : '';
        });

        switch (type) {
            case 'aseguranca':
                DB.addAseguranca(...values);
                break;
            case 'mpnlink':
                DB.addMpnLink(...values);
                break;
            case 'doctor':
                DB.addDoctor(...values);
                break;
            case 'reclamo':
                DB.addReclamo(...values);
                break;
            case 'attorney':
                DB.addAttorney(...values);
                break;
        }

        MAP.showToast(`${type} agregado exitosamente`);
        this.loadTab(this.currentTab);
    },

    showToast(msg) {
        MAP.showToast(msg);
    }
};

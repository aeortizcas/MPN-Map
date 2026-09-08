import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getDatabase, ref, set, push, remove, onValue, get } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDsA8A8SIpwmAsduf5tZQbrBU2eDxLItpE",
    authDomain: "miappmap-c7b98.firebaseapp.com",
    databaseURL: "https://miappmap-c7b98-default-rtdb.firebaseio.com",
    projectId: "miappmap-c7b98",
    storageBucket: "miappmap-c7b98.appspot.com",
    messagingSenderId: "121406195231",
    appId: "1:121406195231:web:1df294770ef7204158b72a"
};

window.FIREBASE = {
    db: null,
    connected: false,
    panelOpen: false,
    activeTab: 'claims',

    init() {
        try {
            const app = initializeApp(FIREBASE_CONFIG);
            this.db = getDatabase(app);
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

    togglePanel() {
        this.panelOpen = !this.panelOpen;
        document.getElementById('firebase-panel').style.display = this.panelOpen ? 'block' : 'none';
        if (this.panelOpen && this.connected) this.switchTab(this.activeTab);
    },

    switchTab(tab) {
        this.activeTab = tab;
        document.querySelectorAll('.fb-tab').forEach(t => t.classList.remove('active'));
        const tabBtn = document.querySelector(`.fb-tab[data-tab="${tab}"]`);
        if (tabBtn) tabBtn.classList.add('active');
        document.querySelectorAll('.fb-content').forEach(c => c.style.display = 'none');
        const content = document.getElementById(`fb-${tab}`);
        if (content) content.style.display = 'block';
        this.loadTab(tab);
        if (tab === 'claims') this.populateMPNSelect('fb-claim-mpn');
        if (tab === 'mpn-links') this.populateInsuranceSelect('fb-mpn-insurance');
        if (tab === 'facilities') {
            this.populateDoctorsSelect('fb-fac-doctor');
            this.populateMPNSelect('fb-fac-mpn');
        }
    },

    loadTab(tab) {
        switch(tab) {
            case 'claims': this.loadClaims(); break;
            case 'insurance': this.loadInsurance(); break;
            case 'attorneys': this.loadAttorneys(); break;
            case 'mpn-links': this.loadMPNLinks(); break;
            case 'doctors': this.loadDoctors(); break;
            case 'facilities': this.loadFacilities(); break;
        }
    },

    // ============ HELPERS ============
    r(path) { return ref(this.db, path); },

    showToast(msg) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    formatDate(ts) {
        if (!ts) return '';
        const d = new Date(ts);
        return d.toISOString().split('T')[0];
    },

    // ============ CLAIMS (RECLAMOS) ============
    saveClaim() {
        if (!this.connected) { this.showToast('Conecta Firebase primero'); return; }
        const codigo = document.getElementById('fb-claim-code').value.trim();
        const tipo = document.getElementById('fb-claim-type').value;
        const fechaReclamo = document.getElementById('fb-claim-fecha-reclamo').value;
        const fechaLesion = document.getElementById('fb-claim-fecha-lesion').value;
        const descripcion = document.getElementById('fb-claim-desc').value.trim();
        const estatus = document.getElementById('fb-claim-status').value;
        const mpnLinkId = document.getElementById('fb-claim-mpn').value;

        if (!codigo) { this.showToast('Completa el codigo de seguro'); return; }

        set(push(this.r('claims')), {
            codigo_aseguranza: codigo,
            tipo: tipo,
            fecha_reclamo: fechaReclamo,
            fecha_lesion: fechaLesion,
            descripcion: descripcion,
            estatus: estatus,
            mpn_link_id: mpnLinkId || null,
            fecha_creacion: Date.now()
        }).then(() => {
            this.showToast('Reclamo guardado');
            this.clearForm('claim');
            this.loadClaims();
        }).catch(err => this.showToast('Error: ' + err.message));
    },

    loadClaims() {
        if (!this.connected) return;
        const list = document.getElementById('fb-claims-list');
        if (!list) return;
        list.innerHTML = '<div style="color:#888;font-size:11px;">Cargando...</div>';
        onValue(this.r('claims'), (snapshot) => {
            const data = snapshot.val();
            if (!data) { list.innerHTML = '<div style="color:#888;font-size:11px;">Sin reclamos</div>'; return; }
            list.innerHTML = '';
            Object.keys(data).forEach(key => {
                const c = data[key];
                const div = document.createElement('div');
                div.style.cssText = 'background:#0f3460;padding:8px;margin-bottom:4px;border-radius:4px;color:#fff;font-size:11px;cursor:pointer;';
                div.innerHTML = `<strong>${c.codigo_aseguranza || 'N/A'}</strong> - ${c.tipo || ''} (${c.estatus || ''})<br><span style="color:#aaa;font-size:10px;">${c.descripcion || ''}</span><br><span style="color:#e94560;cursor:pointer" onclick="FIREBASE.deleteClaim('${key}')">[x]</span>`;
                div.onclick = () => this.flyToClaim(key);
                list.appendChild(div);
            });
        }, (err) => { list.innerHTML = '<div style="color:#e94560;font-size:11px;">Error</div>'; });
    },

    deleteClaim(key) {
        remove(this.r('claims/' + key)).then(() => {
            this.showToast('Reclamo eliminado');
            this.loadClaims();
        });
    },

    flyToClaim(key) {
        get(this.r('claims/' + key)).then((snapshot) => {
            const c = snapshot.val();
            if (c && c.mpn_link_id) {
                get(this.r('mpn_links/' + c.mpn_link_id)).then((msnap) => {
                    const link = msnap.val();
                    if (link && link.lat) {
                        MAP.map.flyTo([link.lat, link.lng], 12);
                        MAP.addMarker({ lat: link.lat, lng: link.lng }, { address: link.nombre || 'MPN Link', popup: `<strong>${link.nombre}</strong><br>Tipo: ${link.rol_proveedor || ''}` });
                    }
                });
            }
        });
    },

    clearForm(prefix) {
        const fields = document.querySelectorAll(`[id^="fb-${prefix}"]`);
        fields.forEach(f => { if (f.type !== 'button') f.value = ''; });
    },

    // ============ INSURANCE (ASEGURANZAS) ============
    saveInsurance() {
        if (!this.connected) { this.showToast('Conecta Firebase primero'); return; }
        const nombre = document.getElementById('fb-ins-name').value.trim();
        const policyNum = document.getElementById('fb-ins-policy').value.trim();
        const telefono = document.getElementById('fb-ins-phone').value.trim();
        const email = document.getElementById('fb-ins-email').value.trim();
        const direccion = document.getElementById('fb-ins-address').value.trim();
        const estado = document.getElementById('fb-ins-state').value.trim();

        if (!nombre) { this.showToast('Completa el nombre de la aseguranza'); return; }

        set(push(this.r('insurance')), {
            nombre: nombre,
            policy_number: policyNum,
            telefono: telefono,
            email: email,
            direccion: direccion,
            estado: estado,
            fecha_creacion: Date.now()
        }).then(() => {
            this.showToast('Aseguranza guardada');
            this.clearForm('ins');
            this.loadInsurance();
        }).catch(err => this.showToast('Error: ' + err.message));
    },

    loadInsurance() {
        if (!this.connected) return;
        const list = document.getElementById('fb-insurance-list');
        if (!list) return;
        list.innerHTML = '<div style="color:#888;font-size:11px;">Cargando...</div>';
        onValue(this.r('insurance'), (snapshot) => {
            const data = snapshot.val();
            if (!data) { list.innerHTML = '<div style="color:#888;font-size:11px;">Sin aseguranzas</div>'; return; }
            list.innerHTML = '';
            Object.keys(data).forEach(key => {
                const ins = data[key];
                const div = document.createElement('div');
                div.style.cssText = 'background:#0f3460;padding:8px;margin-bottom:4px;border-radius:4px;color:#fff;font-size:11px;';
                div.innerHTML = `<strong>${ins.nombre || ''}</strong> - Policy: ${ins.policy_number || ''}<br><span style="color:#aaa;font-size:10px;">${ins.estado || ''} | ${ins.email || ''}</span><br><span style="color:#e94560;cursor:pointer" onclick="FIREBASE.deleteInsurance('${key}')">[x]</span>`;
                div.onclick = () => this.showToast(`${ins.nombre} - ${ins.policy_number}`);
                list.appendChild(div);
            });
        });
    },

    deleteInsurance(key) {
        remove(this.r('insurance/' + key)).then(() => {
            this.showToast('Aseguranza eliminada');
            this.loadInsurance();
        });
    },

    // ============ DEFENSE ATTORNEYS ============
    saveAttorney() {
        if (!this.connected) { this.showToast('Conecta Firebase primero'); return; }
        const nombre = document.getElementById('fb-att-name').value.trim();
        const firma = document.getElementById('fb-att-firma').value.trim();
        const especialidad = document.getElementById('fb-att-especialidad').value.trim();
        const telefono = document.getElementById('fb-att-phone').value.trim();
        const email = document.getElementById('fb-att-email').value.trim();
        const direccion = document.getElementById('fb-att-address').value.trim();
        const estado = document.getElementById('fb-att-state').value.trim();
        const activo = document.getElementById('fb-att-activo').checked;

        if (!nombre) { this.showToast('Completa el nombre del abogado'); return; }

        set(push(this.r('attorneys')), {
            nombre: nombre,
            firma: firma,
            especialidad: especialidad,
            telefono: telefono,
            email: email,
            direccion: direccion,
            estado: estado,
            activo: activo,
            fecha_creacion: Date.now()
        }).then(() => {
            this.showToast('Abogado guardado');
            this.clearForm('att');
            this.loadAttorneys();
        }).catch(err => this.showToast('Error: ' + err.message));
    },

    loadAttorneys() {
        if (!this.connected) return;
        const list = document.getElementById('fb-attorneys-list');
        if (!list) return;
        list.innerHTML = '<div style="color:#888;font-size:11px;">Cargando...</div>';
        onValue(this.r('attorneys'), (snapshot) => {
            const data = snapshot.val();
            if (!data) { list.innerHTML = '<div style="color:#888;font-size:11px;">Sin abogados</div>'; return; }
            list.innerHTML = '';
            Object.keys(data).forEach(key => {
                const a = data[key];
                const div = document.createElement('div');
                div.style.cssText = 'background:#0f3460;padding:8px;margin-bottom:4px;border-radius:4px;color:#fff;font-size:11px;';
                const activoColor = a.activo ? '#2ecc71' : '#e94560';
                div.innerHTML = `<strong>${a.nombre || ''}</strong> - ${a.firma || ''} (${a.especialidad || ''})<br><span style="color:${activoColor};font-size:10px;">${a.activo ? 'Activo' : 'Inactivo'}</span><br><span style="color:#e94560;cursor:pointer" onclick="FIREBASE.deleteAttorney('${key}')">[x]</span>`;
                list.appendChild(div);
            });
        });
    },

    deleteAttorney(key) {
        remove(this.r('attorneys/' + key)).then(() => {
            this.showToast('Abogado eliminado');
            this.loadAttorneys();
        });
    },

    // ============ MPN LINKS ============
    saveMPNLink() {
        if (!this.connected) { this.showToast('Conecta Firebase primero'); return; }
        const url = document.getElementById('fb-mpn-url').value.trim();
        const nombre = document.getElementById('fb-mpn-name').value.trim();
        const asegurancaId = document.getElementById('fb-mpn-insurance').value;
        const casoAsociado = document.getElementById('fb-mpn-caso').value.trim();

        if (!nombre) { this.showToast('Completa el nombre del MPN link'); return; }

        const data = { nombre, url, caso_asociado: casoAsociado, fecha_creacion: Date.now() };
        if (asegurancaId && asegurancaId !== '') data.aseguranca_id = asegurancaId;

        set(push(this.r('mpn_links')), data).then(() => {
            this.showToast('MPN Link guardado');
            this.clearForm('mpn');
            this.loadMPNLinks();
        }).catch(err => this.showToast('Error: ' + err.message));
    },

    loadMPNLinks() {
        if (!this.connected) return;
        const list = document.getElementById('fb-mpn-list');
        if (!list) return;
        list.innerHTML = '<div style="color:#888;font-size:11px;">Cargando...</div>';
        onValue(this.r('mpn_links'), (snapshot) => {
            const data = snapshot.val();
            if (!data) { list.innerHTML = '<div style="color:#888;font-size:11px;">Sin MPN links</div>'; return; }
            list.innerHTML = '';
            Object.keys(data).forEach(key => {
                const link = data[key];
                const div = document.createElement('div');
                div.style.cssText = 'background:#0f3460;padding:8px;margin-bottom:4px;border-radius:4px;color:#fff;font-size:11px;';
                div.innerHTML = `<strong>${link.nombre || ''}</strong> - ${link.url || ''}<br><span style="color:#aaa;font-size:10px;">Caso: ${link.caso_asociado || ''}</span><br><span style="color:#e94560;cursor:pointer" onclick="FIREBASE.deleteMPNLink('${key}')">[x]</span>`;
                div.onclick = () => {
                    MAP.map.flyTo([link.lat || 39.8283, link.lng || -98.5795], 10);
                    MAP.addMarker({ lat: link.lat, lng: link.lng }, { address: link.nombre });
                };
                list.appendChild(div);
            });
        });
    },

    deleteMPNLink(key) {
        remove(this.r('mpn_links/' + key)).then(() => {
            this.showToast('MPN Link eliminado');
            this.loadMPNLinks();
        });
    },

    // ============ DOCTORS (DOCTOR_MPN) ============
    saveDoctor() {
        if (!this.connected) { this.showToast('Conecta Firebase primero'); return; }
        const nombre = document.getElementById('fb-doc-name').value.trim();
        const especialidad = document.getElementById('fb-doc-especialidad').value.trim();
        const zipcode = document.getElementById('fb-doc-zip').value.trim();
        const lat = parseFloat(document.getElementById('fb-doc-lat').value);
        const lng = parseFloat(document.getElementById('fb-doc-lng').value);
        const telefono = document.getElementById('fb-doc-phone').value.trim();

        if (!nombre || isNaN(lat) || isNaN(lng)) { this.showToast('Completa nombre, lat y lng'); return; }

        set(push(this.r('doctors')), {
            nombre: nombre,
            especialidad: especialidad,
            zipcode: zipcode,
            lat: lat,
            lng: lng,
            telefono: telefono,
            fecha_creacion: Date.now()
        }).then(() => {
            this.showToast('Doctor guardado');
            this.clearForm('doc');
            this.loadDoctors();
        }).catch(err => this.showToast('Error: ' + err.message));
    },

    loadDoctors() {
        if (!this.connected) return;
        const list = document.getElementById('fb-doctors-list');
        if (!list) return;
        list.innerHTML = '<div style="color:#888;font-size:11px;">Cargando...</div>';
        onValue(this.r('doctors'), (snapshot) => {
            const data = snapshot.val();
            if (!data) { list.innerHTML = '<div style="color:#888;font-size:11px;">Sin doctores</div>'; return; }
            list.innerHTML = '';
            Object.keys(data).forEach(key => {
                const d = data[key];
                const div = document.createElement('div');
                div.style.cssText = 'background:#0f3460;padding:8px;margin-bottom:4px;border-radius:4px;color:#fff;font-size:11px;cursor:pointer;';
                div.innerHTML = `<strong>${d.nombre || ''}</strong> - ${d.especialidad || ''} (${d.zipcode || ''})<br><span style="color:#aaa;font-size:10px;">${d.lat ? d.lat.toFixed(4) : ''}, ${d.lng ? d.lng.toFixed(4) : ''}</span><br><span style="color:#e94560;cursor:pointer" onclick="FIREBASE.deleteDoctor('${key}')">[x]</span>`;
                div.onclick = () => {
                    if (d.lat && d.lng) {
                        MAP.map.flyTo([d.lat, d.lng], 12);
                        MAP.addMarker({ lat: d.lat, lng: d.lng }, { address: d.nombre, popup: `<strong>${d.nombre}</strong><br>${d.especialidad}<br>${d.zipcode}` });
                    }
                };
                list.appendChild(div);
            });
        });
    },

    deleteDoctor(key) {
        remove(this.r('doctors/' + key)).then(() => {
            this.showToast('Doctor eliminado');
            this.loadDoctors();
        });
    },

    // ============ DOCTOR FACILITIES (RELACION N:M) ============
    saveFacility() {
        if (!this.connected) { this.showToast('Conecta Firebase primero'); return; }
        const doctorId = document.getElementById('fb-fac-doctor').value;
        const mpnLinkId = document.getElementById('fb-fac-mpn').value;
        const facilityName = document.getElementById('fb-fac-name').value.trim();
        const facilityType = document.getElementById('fb-fac-type').value;
        const bodyPart = document.getElementById('fb-fac-body').value.trim();
        const rol = document.getElementById('fb-fac-rol').value;
        const estado = document.getElementById('fb-fac-estado').value;

        if (!doctorId || !mpnLinkId || !facilityName) { this.showToast('Completa doctor, MPN link y nombre'); return; }

        set(push(this.r('doctor_facilities')), {
            doctor_id: doctorId,
            mpn_link_id: mpnLinkId,
            facility_name: facilityName,
            facility_type: facilityType,
            body_part: bodyPart,
            rol_proveedor: rol,
            estado: estado,
            fecha_creacion: Date.now()
        }).then(() => {
            this.showToast('Facility guardada');
            this.clearForm('fac');
            this.loadFacilities();
        }).catch(err => this.showToast('Error: ' + err.message));
    },

    loadFacilities() {
        if (!this.connected) return;
        const list = document.getElementById('fb-facilities-list');
        if (!list) return;
        list.innerHTML = '<div style="color:#888;font-size:11px;">Cargando...</div>';
        onValue(this.r('doctor_facilities'), (snapshot) => {
            const data = snapshot.val();
            if (!data) { list.innerHTML = '<div style="color:#888;font-size:11px;">Sin facilities</div>'; return; }
            list.innerHTML = '';
            Object.keys(data).forEach(key => {
                const f = data[key];
                const div = document.createElement('div');
                div.style.cssText = 'background:#0f3460;padding:8px;margin-bottom:4px;border-radius:4px;color:#fff;font-size:11px;';
                const rolColor = { PTP: '#2ecc71', STP: '#3498db', LIEN: '#e94560', QME: '#f39c12', MTUS: '#9b59b6', OTRO: '#95a5a6' }[f.rol_proveedor] || '#aaa';
                div.innerHTML = `<strong>${f.facility_name || ''}</strong> - Doctor: ${f.doctor_id || ''} | MPN: ${f.mpn_link_id || ''}<br><span style="color:${rolColor};font-size:10px;">${f.rol_proveedor || ''}</span> | ${f.body_part || ''} | ${f.estado || ''}<br><span style="color:#e94560;cursor:pointer" onclick="FIREBASE.deleteFacility('${key}')">[x]</span>`;
                list.appendChild(div);
            });
        });
    },

    deleteFacility(key) {
        remove(this.r('doctor_facilities/' + key)).then(() => {
            this.showToast('Facility eliminada');
            this.loadFacilities();
        });
    },

    // ============ SEED DATA ============
    seedSampleData() {
        if (!this.connected) { this.showToast('Conecta Firebase primero'); return; }
        set(this.r('claims'), {
            'claim_001': {
                codigo_aseguranza: 'WC-2026-001', tipo: 'Workers Comp',
                fecha_reclamo: '2026-01-15', fecha_lesion: '2025-12-01',
                descripcion: 'Lesion en espalda baja - trabajador de construccion', estatus: 'Abierto',
                mpn_link_id: null, fecha_creacion: Date.now()
            },
            'claim_002': {
                codigo_aseguranza: 'PI-2026-042', tipo: 'PI',
                fecha_reclamo: '2026-03-10', fecha_lesion: '2026-02-20',
                descripcion: 'Accidente automovilistico - lesion cervical', estatus: 'En proceso',
                mpn_link_id: null, fecha_creacion: Date.now()
            }
        }).then(() => {
            set(this.r('insurance'), {
                'ins_001': { nombre: 'State Farm', policy_number: 'SF-123456', telefono: '(555) 123-4567', email: 'statefarm@example.com', direccion: '123 Main St', estado: 'CA', fecha_creacion: Date.now() },
                'ins_002': { nombre: 'GEICO', policy_number: 'GE-789012', telefono: '(555) 987-6543', email: 'geico@example.com', direccion: '456 Elm St', estado: 'TX', fecha_creacion: Date.now() }
            }).then(() => {
                set(this.r('attorneys'), {
                    'att_001': { nombre: 'John Smith', firma: 'Smith & Associates', especialidad: 'Workers Comp', telefono: '(555) 111-1111', email: 'john@smith.com', direccion: '789 Oak Ave', estado: 'CA', activo: true, fecha_creacion: Date.now() },
                    'att_002': { nombre: 'Maria Garcia', firma: 'Garcia Law Firm', especialidad: 'PI', telefono: '(555) 222-2222', email: 'maria@garcia.com', direccion: '321 Pine St', estado: 'TX', activo: true, fecha_creacion: Date.now() }
                }).then(() => {
                    set(this.r('doctors'), {
                        'doc_001': { nombre: 'Dr. James Wilson', especialidad: 'Ortopedia', zipcode: '90210', lat: 34.0901, lng: -118.4065, telefono: '(555) 333-3333', fecha_creacion: Date.now() },
                        'doc_002': { nombre: 'Dr. Sarah Chen', especialidad: 'Neurologia', zipcode: '10001', lat: 40.7128, lng: -74.0060, telefono: '(555) 444-4444', fecha_creacion: Date.now() },
                        'doc_003': { nombre: 'Dr. Robert Martinez', especialidad: 'Medicina Fisica', zipcode: '60601', lat: 41.8781, lng: -87.6298, telefono: '(555) 555-5555', fecha_creacion: Date.now() }
                    }).then(() => {
                        set(this.r('mpn_links'), {
                            'mpn_001': { url: 'https://mpn1.example.com', nombre: 'MPN Red de California', aseguranca_id: 'ins_001', caso_asociado: 'claim_001', fecha_creacion: Date.now() },
                            'mpn_002': { url: 'https://mpn2.example.com', nombre: 'MPN Network Texas', aseguranca_id: 'ins_002', caso_asociado: 'claim_002', fecha_creacion: Date.now() }
                        }).then(() => {
                            set(this.r('doctor_facilities'), {
                                'fac_001': { doctor_id: 'doc_001', mpn_link_id: 'mpn_001', facility_name: 'Wilson Ortho Clinic', facility_type: 'Clinica', body_part: 'Espalda, Rodilla', rol_proveedor: 'PTP', estado: 'Activo', fecha_creacion: Date.now() },
                                'fac_002': { doctor_id: 'doc_002', mpn_link_id: 'mpn_002', facility_name: 'Chen Neurology Center', facility_type: 'Hospital', body_part: 'Cuello, Hombro', rol_proveedor: 'QME', estado: 'Activo', fecha_creacion: Date.now() }
                            }).then(() => {
                                this.showToast('Datos de ejemplo cargados!');
                                this.loadClaims(); this.loadInsurance(); this.loadAttorneys();
                                this.loadMPNLinks(); this.loadDoctors(); this.loadFacilities();
                            });
                        });
                    });
                });
            });
        });
    },

    // ============ CLEAR ALL DATA ============
    clearAll() {
        if (!this.connected) return;
        if (!confirm('¿Eliminar TODOS los datos? Esto no se puede deshacer.')) return;
        ['claims', 'insurance', 'attorneys', 'mpn_links', 'doctors', 'doctor_facilities'].forEach(path => {
            set(this.r(path), null);
        });
        this.showToast('Todos los datos eliminados');
    },

    // ============ DROPDOWN POPULATORS ============
    populateMPNSelect(selectId) {
        onValue(this.r('mpn_links'), (snapshot) => {
            const data = snapshot.val();
            const sel = document.getElementById(selectId);
            if (!sel) return;
            const currentVal = sel.value;
            sel.innerHTML = '<option value="">Sin MPN link</option>';
            if (data) {
                Object.keys(data).forEach(key => {
                    const opt = document.createElement('option');
                    opt.value = key;
                    opt.textContent = data[key].nombre || key;
                    sel.appendChild(opt);
                });
            }
            sel.value = currentVal;
        });
    },

    populateInsuranceSelect(selectId) {
        onValue(this.r('insurance'), (snapshot) => {
            const data = snapshot.val();
            const sel = document.getElementById(selectId);
            if (!sel) return;
            const currentVal = sel.value;
            sel.innerHTML = '<option value="">Sin aseguranza</option>';
            if (data) {
                Object.keys(data).forEach(key => {
                    const opt = document.createElement('option');
                    opt.value = key;
                    opt.textContent = data[key].nombre || key;
                    sel.appendChild(opt);
                });
            }
            sel.value = currentVal;
        });
    },

    populateDoctorsSelect(selectId) {
        onValue(this.r('doctors'), (snapshot) => {
            const data = snapshot.val();
            const sel = document.getElementById(selectId);
            if (!sel) return;
            const currentVal = sel.value;
            sel.innerHTML = '<option value="">Seleccionar doctor</option>';
            if (data) {
                Object.keys(data).forEach(key => {
                    const opt = document.createElement('option');
                    opt.value = key;
                    opt.textContent = data[key].nombre || key;
                    sel.appendChild(opt);
                });
            }
            sel.value = currentVal;
        });
    },

    populateAttorneysSelect(selectId) {
        onValue(this.r('attorneys'), (snapshot) => {
            const data = snapshot.val();
            const sel = document.getElementById(selectId);
            if (!sel) return;
            sel.innerHTML = '<option value="">Seleccionar abogado</option>';
            if (data) {
                Object.keys(data).forEach(key => {
                    const opt = document.createElement('option');
                    opt.value = key;
                    opt.textContent = data[key].nombre || key;
                    sel.appendChild(opt);
                });
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    FIREBASE.init();
});

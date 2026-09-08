const UI_HELPERS = {
    buildSelectOptions(data, valueKey, labelKey, placeholder) {
        let html = `<option value="">${placeholder || 'Seleccionar...'}</option>`;
        if (data) {
            Object.keys(data).forEach(key => {
                html += `<option value="${key}">${data[key][labelKey] || key}</option>`;
            });
        }
        return html;
    },

    populateSelect(selectId, data, valueKey, labelKey) {
        const sel = document.getElementById(selectId);
        if (!sel || !data) return;
        sel.innerHTML = '<option value="">Seleccionar...</option>';
        Object.keys(data).forEach(key => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = data[key][labelKey] || key;
            sel.appendChild(opt);
        });
    }
};

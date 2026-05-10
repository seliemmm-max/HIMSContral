/* ========================================
   js/settings.js
   إدارة الإعدادات والتزامن مع localStorage
   ======================================== */

const SETTINGS_KEY = 'masterCtrlSettingsV15';

// ---- الإعدادات الافتراضية ----
let normalSettings = {
    passGrade: 50, minRaise: 44, maxRaise: 49,
    boostPoints: 6, raiseType: 'gradual',
    midFactor: 5, actFactor: 10,
    midMin: 10, midMax: 20,
    actMin: 10, actMax: 30,
    applyHEnabled: true,
    hValue: 6
};

let distributeSettings = {
    isProgressive: false, baseBonus: 35, increment: 1,
    maxBonus: 50, minFinalForBonus: 15,
    midRatio: 0.4, actRatio: 0.6
};

let flexBands = [
    { min: 15, max: 20, midVal: 20, actVal: 30 },
    { min: 21, max: 25, midVal: 17, actVal: 28 },
    { min: 26, max: 100, midVal: 15, actVal: 25 }
];

let flexRaiseEnabled    = false;
let flexApprovalEnabled  = false;
let normalRaiseEnabled   = true;

let reportSettings = {
    programName:   "إدارة أعمال",
    courseName:    "مهارات وطرق الاتصال",
    instituteName: "المعهد العالي للعلوم الإدارية بالقطامية"
};

// ---- حفظ ----
function saveAllSettings() {
    reportSettings = {
        instituteName: document.getElementById('settingsInstituteName').value,
        programName:   document.getElementById('settingsProgramName').value,
        courseName:    document.getElementById('settingsCourseName').value
    };
    const toStore = {
        normalSettings, distributeSettings, flexBands,
        flexRaiseEnabled, flexApprovalEnabled, normalRaiseEnabled, reportSettings
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(toStore));
}

// ---- تحميل وربط الواجهة ----
function loadAllSettings() {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
        try {
            const obj = JSON.parse(saved);
            if (obj.normalSettings)       normalSettings       = { ...normalSettings,       ...obj.normalSettings };
            if (obj.distributeSettings)   distributeSettings   = { ...distributeSettings,   ...obj.distributeSettings };
            if (obj.flexBands)            flexBands            = obj.flexBands;
            if (obj.flexRaiseEnabled    !== undefined) flexRaiseEnabled    = obj.flexRaiseEnabled;
            if (obj.flexApprovalEnabled !== undefined) flexApprovalEnabled = obj.flexApprovalEnabled;
            if (obj.normalRaiseEnabled  !== undefined) normalRaiseEnabled  = obj.normalRaiseEnabled;
            if (obj.reportSettings)       reportSettings       = { ...reportSettings,       ...obj.reportSettings };
        } catch (e) {}
    }

    // مزامنة حقول الواجهة
    document.getElementById('passGradeNormal').value         = normalSettings.passGrade;
    document.getElementById('raiseTypeNormal').value         = normalSettings.raiseType;
    document.getElementById('boostPoints').value             = normalSettings.boostPoints;

    document.getElementById('settingsPassNormal').value      = normalSettings.passGrade;
    document.getElementById('settingsMinRaise').value        = normalSettings.minRaise;
    document.getElementById('settingsMaxRaise').value        = normalSettings.maxRaise;
    document.getElementById('settingsBoostPoints').value     = normalSettings.boostPoints;
    document.getElementById('settingsMidFactor').value       = normalSettings.midFactor;
    document.getElementById('settingsActFactor').value       = normalSettings.actFactor;
    document.getElementById('settingsMidMin').value          = normalSettings.midMin;
    document.getElementById('settingsMidMax').value          = normalSettings.midMax;
    document.getElementById('settingsActMin').value          = normalSettings.actMin;
    document.getElementById('settingsActMax').value          = normalSettings.actMax;

    document.getElementById('settingsIsProgressive').checked = distributeSettings.isProgressive;
    document.getElementById('settingsBaseBonus').value       = distributeSettings.baseBonus;
    document.getElementById('settingsIncrement').value       = distributeSettings.increment;
    document.getElementById('settingsMaxBonus').value        = distributeSettings.maxBonus;
    document.getElementById('settingsMinFinalForBonus').value= distributeSettings.minFinalForBonus;
    document.getElementById('settingsMidRatio').value        = distributeSettings.midRatio;
    document.getElementById('settingsActRatio').value        = distributeSettings.actRatio;

    document.getElementById('flexRaiseCheckbox').checked     = flexRaiseEnabled;
    const nrc = document.getElementById('raiseEnabledNormal');
    if (nrc) { nrc.checked = normalRaiseEnabled; nrc.dispatchEvent(new Event('change')); }
    document.getElementById('flexApprovalCheckbox').checked  = flexApprovalEnabled;

    document.getElementById('settingsInstituteName').value   = reportSettings.instituteName;
    document.getElementById('settingsProgramName').value     = reportSettings.programName;
    document.getElementById('settingsCourseName').value      = reportSettings.courseName;

    document.getElementById('applyHEnabled').checked         = normalSettings.applyHEnabled;
    document.getElementById('hValue').value                  = normalSettings.hValue;

    renderFlexBandsUI('bandsContainer',              flexBands, true);
    renderFlexBandsUI('flexBandsSettingsContainer',  flexBands, false);
    updateFlexUploadUI();
}

// ---- مزامنة من حقول الواجهة ----
function syncNormalFromUI(source) {
    if (source === 'normalTab') {
        normalSettings.passGrade  = parseInt(document.getElementById('passGradeNormal').value) || 50;
        normalSettings.raiseType  = document.getElementById('raiseTypeNormal').value;
        normalSettings.boostPoints= parseFloat(document.getElementById('boostPoints').value) || 6;
    } else {
        normalSettings.passGrade  = parseInt(document.getElementById('settingsPassNormal').value) || 50;
        normalSettings.minRaise   = parseInt(document.getElementById('settingsMinRaise').value) || 44;
        normalSettings.maxRaise   = parseInt(document.getElementById('settingsMaxRaise').value) || 49;
        normalSettings.boostPoints= parseFloat(document.getElementById('settingsBoostPoints').value) || 6;
        normalSettings.midFactor  = parseFloat(document.getElementById('settingsMidFactor').value) || 5;
        normalSettings.actFactor  = parseFloat(document.getElementById('settingsActFactor').value) || 10;
        normalSettings.midMin     = parseInt(document.getElementById('settingsMidMin').value) || 10;
        normalSettings.midMax     = parseInt(document.getElementById('settingsMidMax').value) || 20;
        normalSettings.actMin     = parseInt(document.getElementById('settingsActMin').value) || 10;
        normalSettings.actMax     = parseInt(document.getElementById('settingsActMax').value) || 30;
        normalSettings.applyHEnabled = document.getElementById('applyHEnabled').checked;
        normalSettings.hValue        = parseFloat(document.getElementById('hValue').value) || 0;

        // مزامنة عكسية للتبويب العادي
        document.getElementById('passGradeNormal').value  = normalSettings.passGrade;
        document.getElementById('raiseTypeNormal').value  = normalSettings.raiseType;
        document.getElementById('boostPoints').value      = normalSettings.boostPoints;
    }
    saveAllSettings();
}

function syncHSettingsFromUI() {
    normalSettings.applyHEnabled = document.getElementById('applyHEnabled').checked;
    normalSettings.hValue = parseFloat(document.getElementById('hValue').value) || 0;
    saveAllSettings();
}

function syncDistributeFromUI() {
    distributeSettings.isProgressive   = document.getElementById('settingsIsProgressive').checked;
    distributeSettings.baseBonus       = parseFloat(document.getElementById('settingsBaseBonus').value) || 35;
    distributeSettings.increment       = parseFloat(document.getElementById('settingsIncrement').value) || 1;
    distributeSettings.maxBonus        = parseFloat(document.getElementById('settingsMaxBonus').value) || 50;
    distributeSettings.minFinalForBonus= parseFloat(document.getElementById('settingsMinFinalForBonus').value) || 15;
    distributeSettings.midRatio        = parseFloat(document.getElementById('settingsMidRatio').value) || 0.4;
    distributeSettings.actRatio        = parseFloat(document.getElementById('settingsActRatio').value) || 0.6;
    saveAllSettings();
}

function syncReportFromUI() {
    reportSettings.instituteName = document.getElementById('settingsInstituteName').value;
    reportSettings.programName   = document.getElementById('settingsProgramName').value;
    reportSettings.courseName    = document.getElementById('settingsCourseName').value;
    saveAllSettings();
}

// ---- شرائح القاعدة 1 ----
function renderFlexBandsUI(containerId, bands, isEditable) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    bands.forEach((band, idx) => {
        const div = document.createElement('div');
        div.className = 'config-panel';
        div.style.marginBottom = '10px';
        div.innerHTML = `
            <div style="display:flex; flex-wrap:wrap; gap:12px;">
                <label>من   <input type="number" class="bandMin" data-idx="${idx}" value="${band.min}"    style="width:70px" ${!isEditable ? 'disabled' : ''}></label>
                <label>إلى  <input type="number" class="bandMax" data-idx="${idx}" value="${band.max}"    style="width:70px" ${!isEditable ? 'disabled' : ''}></label>
                <label>ميد  <input type="number" class="bandMid" data-idx="${idx}" value="${band.midVal}" style="width:70px" ${!isEditable ? 'disabled' : ''}></label>
                <label>أعمال<input type="number" class="bandAct" data-idx="${idx}" value="${band.actVal}" style="width:70px" ${!isEditable ? 'disabled' : ''}></label>
                ${isEditable ? `<button class="btn removeBandBtn" data-idx="${idx}" style="background:#c0392b; padding:4px 12px;">✖</button>` : ''}
            </div>`;
        container.appendChild(div);
    });

    if (isEditable) {
        container.querySelectorAll('.bandMin, .bandMax, .bandMid, .bandAct').forEach(inp => {
            inp.addEventListener('change', () => {
                const idx = parseInt(inp.dataset.idx);
                if (inp.classList.contains('bandMin')) flexBands[idx].min    = parseInt(inp.value) || 0;
                if (inp.classList.contains('bandMax')) flexBands[idx].max    = parseInt(inp.value) || 100;
                if (inp.classList.contains('bandMid')) flexBands[idx].midVal = parseInt(inp.value) || 0;
                if (inp.classList.contains('bandAct')) flexBands[idx].actVal = parseInt(inp.value) || 0;
                saveAllSettings();
                renderFlexBandsUI('bandsContainer',             flexBands, true);
                renderFlexBandsUI('flexBandsSettingsContainer', flexBands, false);
            });
        });
        container.querySelectorAll('.removeBandBtn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                flexBands.splice(idx, 1);
                saveAllSettings();
                renderFlexBandsUI('bandsContainer',             flexBands, true);
                renderFlexBandsUI('flexBandsSettingsContainer', flexBands, false);
            });
        });
    }
}

function addFlexBand() {
    flexBands.push({ min: 0, max: 14, midVal: 0, actVal: 0 });
    saveAllSettings();
    renderFlexBandsUI('bandsContainer',             flexBands, true);
    renderFlexBandsUI('flexBandsSettingsContainer', flexBands, false);
}

// ---- ربط أزرار الإعدادات ----
function initSettingsEvents() {
    document.getElementById('applyNormalSettingsBtn')   ?.addEventListener('click', () => { syncNormalFromUI('settings');  alert('تم تحديث إعدادات العادي'); });
    document.getElementById('applyDistributeSettingsBtn')?.addEventListener('click', () => { syncDistributeFromUI();         alert('تم تحديث القاعدة 3'); });
    document.getElementById('applyReportSettingsBtn')   ?.addEventListener('click', () => { syncReportFromUI();             alert('تم تحديث إعدادات التقرير'); });
    document.getElementById('applyHSettingsBtn')        ?.addEventListener('click', () => { syncHSettingsFromUI();          alert('تم تحديث إعدادات قاعدة H'); });

    document.getElementById('addBandBtn')        ?.addEventListener('click', addFlexBand);
    document.getElementById('addBandSettingsBtn')?.addEventListener('click', addFlexBand);

    // حفظ/استعادة JSON
    document.getElementById('saveAllSettingsBtn')?.addEventListener('click', () => {
        const all = { normalSettings, distributeSettings, flexBands, flexRaiseEnabled, flexApprovalEnabled, normalRaiseEnabled, reportSettings };
        const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'settings.json';
        a.click();
    });
    document.getElementById('loadAllSettingsBtn')?.addEventListener('click', () =>
        document.getElementById('restoreSettingsFile').click()
    );
    document.getElementById('restoreSettingsFile')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const loaded = JSON.parse(ev.target.result);
                if (loaded.normalSettings)       normalSettings       = { ...normalSettings,       ...loaded.normalSettings };
                if (loaded.distributeSettings)   distributeSettings   = { ...distributeSettings,   ...loaded.distributeSettings };
                if (loaded.flexBands)            flexBands            = loaded.flexBands;
                if (loaded.flexRaiseEnabled    !== undefined) flexRaiseEnabled    = loaded.flexRaiseEnabled;
                if (loaded.flexApprovalEnabled !== undefined) flexApprovalEnabled = loaded.flexApprovalEnabled;
                if (loaded.normalRaiseEnabled  !== undefined) normalRaiseEnabled  = loaded.normalRaiseEnabled;
                if (loaded.reportSettings)       reportSettings       = { ...reportSettings,       ...loaded.reportSettings };
                saveAllSettings();
                loadAllSettings();
                alert('تم الاستعادة');
            } catch (err) { alert('ملف غير صالح'); }
        };
        reader.readAsText(file);
    });

    // مراقبة التغييرات الفورية في تبويب العادي
    document.getElementById('passGradeNormal')?.addEventListener('change', () => syncNormalFromUI('normalTab'));
    document.getElementById('raiseTypeNormal')?.addEventListener('change', () => syncNormalFromUI('normalTab'));
    document.getElementById('boostPoints')    ?.addEventListener('change', () => syncNormalFromUI('normalTab'));

    // مزامنة خانات فلكس
    document.getElementById('flexRaiseCheckbox')   ?.addEventListener('change', (e) => { flexRaiseEnabled    = e.target.checked; saveAllSettings(); });
    document.getElementById('flexApprovalCheckbox')?.addEventListener('change', (e) => { flexApprovalEnabled = e.target.checked; saveAllSettings(); updateFlexUploadUI(); });
}

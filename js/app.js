/* ========================================
   js/app.js
   نقطة البداية - تشغيل التطبيق
   ======================================== */

// ---- المتغيرات العامة المشتركة ----
let processedData      = [];
let rawBeforeRaiseData = [];
let currentSys         = 'normal';

// ---- تهيئة Chart.js ----
Chart.register(ChartDataLabels);
Chart.defaults.set('plugins.datalabels', {
    color: '#0f3a5a', anchor: 'end', align: 'top', offset: 4,
    font: { weight: 'bold', size: 11 }
});

// ---- تصدير CSV ----
function initExportCSV() {
    function doExport() {
        if (!processedData.length) { alert('لا توجد بيانات معالجة'); return; }
        const rows = [['1', '1', '1', '1']];
        for (const s of processedData)
            rows.push([s.code, s.mid, s.act, s.finalOriginal]);
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Result');
        XLSX.writeFile(wb, `نتيجة_${currentSys}.csv`, { bookType: 'csv', type: 'buffer' });
    }
    // الزر القديم في تبويب الإعدادات
    document.getElementById('exportCSVBtn')?.addEventListener('click', doExport);
    // زر النظام العادي
    document.getElementById('exportNormalCSVBtn')?.addEventListener('click', doExport);
    // زر النظام المرن
    document.getElementById('exportFlexCSVBtn')?.addEventListener('click', doExport);

    // ── أزرار تنزيل شيت الغياب ──
    document.getElementById('exportNormalAbsentBtn')?.addEventListener('click', () =>
        exportAbsentStudents('النظام_العادي')
    );
    document.getElementById('exportFlexAbsentBtn')?.addEventListener('click', () =>
        exportAbsentStudents('النظام_المرن')
    );
}

// ---- نظام التبويبات ----
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const id = btn.getAttribute('data-tab');
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active-pane'));
            document.getElementById(id).classList.add('active-pane');
            // تحديث الإحصائيات عند فتح تبويب الإحصائيات
            if (id === 'tab3' && rawBeforeRaiseData.length && processedData.length)
                updateCompareStats(
                    rawBeforeRaiseData.map(s => s.totalBefore),
                    processedData.map(s => s.finalComputed)
                );
        });
    });
}

// ---- تشغيل كل شيء عند اكتمال DOM ----
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    loadAllSettings();
    initSettingsEvents();
    initNormalSystem();
    initFlexSystem();
    updateFlexUploadUI();
    initSampleDownloads();
    initExportCSV();

    setupSearch('normalSearchInput', 'normalTable');
    setupSearch('flexSearchInput',   'flexTable');
    setupPrintBeneficiaries('printNormalBeneficiariesBtn', 'beneficiariesArea');
    setupPrintBeneficiaries('printFlexBeneficiariesBtn',   'beneficiariesArea');
    setupPrintTable('printNormalTableBtn', 'normalTable');
    setupPrintTable('printFlexTableBtn',   'flexTable');
});
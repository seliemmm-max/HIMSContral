/* ========================================
   js/utils.js
   الدوال المساعدة المشتركة
   ======================================== */

/**
 * قراءة ملف Excel/CSV وإرجاعه كمصفوفة صفوف
 */
function readExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            const data = new Uint8Array(e.target.result);
            const wb   = XLSX.read(data, { type: 'array' });
            const sheet= wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
            resolve(rows);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

/**
 * تحليل درجة: 'غ' → -3، 'إلغاء' → -8، رقم → رقم، غير ذلك → null
 */
function parseGrade(g) {
    if (g === null || g === undefined || g === '') return null;
    const s = String(g).trim();
    if (s === '' )       return null;
    if (s === 'غ' || s === 'غـ' || s === 'غ ') return -3;
    if (s === 'إلغاء' || s === 'الغاء' || s === 'ألغاء') return -8;
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
}

/**
 * تطبيق الرفع على درجة كلية
 */
function applyRaise(score, minR, maxR, pass, boost, type) {
    if (score < 0) return score;
    if (type === 'direct') {
        return (score >= minR && score <= maxR && score < pass) ? pass : score;
    } else {
        if (score >= minR && score <= maxR && score < pass) {
            let addition = boost - (maxR - score);
            let newScore  = score + addition;
            if (newScore > pass) newScore = pass;
            return newScore;
        }
        return score;
    }
}

/**
 * تحويل درجة النموذج إلى ميد + أعمال وفق الشرائح (القاعدة 1)
 */
function convertFlex(scoreVal) {
    if (scoreVal === 'غ')     return { mid: -3, act: -3 };
    if (scoreVal === 'إلغاء') return { mid: -8, act: -8 };
    const num = parseFloat(scoreVal);
    if (isNaN(num)) return { mid: 0, act: 0 };
    for (const b of flexBands)
        if (num >= b.min && num <= b.max)
            return { mid: b.midVal, act: b.actVal };
    return { mid: 0, act: 0 };
}

/**
 * تحديد رمز التقدير من الدرجة
 */
function getGradeLetter(score) {
    if (score === -3 || score === -8) return 'F';
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 72) return 'C+';
    if (score >= 65) return 'C';
    if (score >= 55) return 'D+';
    if (score >= 50) return 'D';
    return 'F';
}

/**
 * حساب إحصائيات مجموعة درجات
 */
function calcStats(scores) {
    const total   = scores.length;
    const pass    = scores.filter(g => g >= normalSettings.passGrade && g >= 0).length;
    const fail    = total - pass;
    const percent = total > 0 ? (pass / total * 100).toFixed(1) : 0;
    const dist    = { 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D+': 0, 'D': 0, 'F': 0 };
    scores.forEach(s => { const l = getGradeLetter(s); dist[l]++; });
    return { total, pass, fail, percent, dist };
}

/**
 * تنزيل نموذج Excel
 */
function downloadSample(filename, content) {
    const ws = XLSX.utils.aoa_to_sheet(content);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'نموذج');
    XLSX.writeFile(wb, filename);
}

/**
 * مسح جميع البيانات المعالجة (يُستدعى عند رفع ملف جديد)
 */
function clearProcessedData() {
    processedData      = [];
    rawBeforeRaiseData = [];
    currentSys         = 'normal';

    // مسح الجداول والرسائل من الواجهة
    const ids = ['normalTable', 'flexTable', 'normalMsg', 'flexMsg', 'beneficiariesArea',
                 'statsBefore', 'statsAfter', 'compareDetails'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });

    // إعادة تهيئة الرسم البياني
    if (chartCompare) { chartCompare.destroy(); chartCompare = null; }
}

/**
 * ربط أحداث تنزيل النماذج
 */
function initSampleDownloads() {
    document.getElementById('downloadSampleNormal')    ?.addEventListener('click', () =>
        downloadSample('نموذج_طلاب_عادي.xlsx', [
            ['كود', 'اسم', 'ميد', 'أعمال', 'فاينل'],
            ['2241283', 'فارس', '34', '28', '45']
        ])
    );
    document.getElementById('downloadSampleApproval')  ?.addEventListener('click', () =>
        downloadSample('نموذج_موافقة.xlsx', [
            ['كود'],
            ['2241283']
        ])
    );
    document.getElementById('downloadSampleFlexOld')   ?.addEventListener('click', () =>
        downloadSample('نموذج_طلاب_مرن_قاعدة1.xlsx', [
            ['كود', 'اسم', 'نموذج', 'درجة'],
            ['2260001', 'البراء', 'Form1', '34']
        ])
    );
    document.getElementById('downloadSampleFlexAdd20') ?.addEventListener('click', () =>
        downloadSample('نموذج_طلاب_مرن_قاعدة2.xlsx', [
            ['كود', 'اسم', 'ميد', 'أعمال', 'فاينل'],
            ['2241283', 'فارس', '34', '28', '45']
        ])
    );
    document.getElementById('downloadSampleFlexDist35')?.addEventListener('click', () =>
        downloadSample('نموذج_طلاب_مرن_قاعدة3.xlsx', [
            ['كود', 'اسم', 'ميد', 'أعمال', 'فاينل'],
            ['2241283', 'فارس', '34', '28', '45']
        ])
    );
}

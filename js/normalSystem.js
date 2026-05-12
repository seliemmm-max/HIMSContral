/* ========================================
   js/normalSystem.js
   النظام العادي - 3 مسارات
   ======================================== */

let normalRowsRaw = [];
let approvalSet   = new Set();
let beneficiaries = [];

function initNormalSystem() {

    document.getElementById('normalInput')?.addEventListener('change', async e => {
        if (!e.target.files.length) return;
        clearProcessedData();
        normalRowsRaw = await readExcel(e.target.files[0]);
        document.getElementById('normalMsg').innerHTML =
            `<div class="alert-info">✅ تم رفع ${normalRowsRaw.length} صف - تم مسح البيانات السابقة تلقائياً</div>`;
        renderAbsentBox('normalAbsentArea', extractAbsentRows(normalRowsRaw), 'عادي');
    });

    document.getElementById('approvalInput')?.addEventListener('change', async e => {
        if (!e.target.files.length) return;
        clearProcessedData();
        const rows = await readExcel(e.target.files[0]);
        approvalSet.clear();
        for (const row of rows)
            for (const cell of row) {
                const c = parseInt(cell);
                if (!isNaN(c)) approvalSet.add(c);
            }
        document.getElementById('normalMsg').innerHTML +=
            `<div class="alert-info">📋 تم تحميل ${approvalSet.size} كود موافقة</div>`;
    });

    // checkbox رفع الأعمال
    const raiseChk  = document.getElementById('raiseEnabledNormal');
    const raiseOpts = document.getElementById('raiseOptionsNormal');
    function updateRaiseUI() {
        if (!raiseOpts) return;
        const on = raiseChk?.checked !== false;
        raiseOpts.style.opacity       = on ? '1'    : '0.4';
        raiseOpts.style.pointerEvents = on ? 'auto' : 'none';
    }
    raiseChk?.addEventListener('change', () => { saveAllSettings(); updateRaiseUI(); });
    updateRaiseUI();

    document.getElementById('processNormalBtn')?.addEventListener('click', processNormal);
}

async function processNormal() {
    syncNormalFromUI('normalTab');
    if (!normalRowsRaw.length) { alert('يرجى رفع ملف الطلاب'); return; }

    const header = normalRowsRaw[0];
    let idxCode = -1, idxName = -1, idxMid = -1, idxAct = -1, idxFinal = -1;
    for (let i = 0; i < header.length; i++) {
        const c = String(header[i] || '').trim().toLowerCase();
        if (c.includes('كود') || c === 'code' || c.includes('رقم')) idxCode  = i;
        if (c.includes('اسم') || c.includes('name'))                idxName  = i;
        if (c.includes('ميد') || c.includes('mid'))                 idxMid   = i;
        if (c.includes('اعمال') || c.includes('أعمال') ||
            c.includes('عمال')  || c.includes('act'))               idxAct   = i;
        if (c.includes('فاينل') || c.includes('final') ||
            c.includes('نهائي'))                                     idxFinal = i;
    }
    if (idxCode  === -1) idxCode  = 0;
    if (idxMid   === -1) idxMid   = 2;
    if (idxAct   === -1) idxAct   = 3;
    if (idxFinal === -1) idxFinal = 4;

    const results    = [];
    const beforeRows = [];  // قبل رفع الأعمال
    const afterRows  = [];  // بعد رفع الأعمال
    beneficiaries    = [];

    const raiseEnabled    = document.getElementById('raiseEnabledNormal')?.checked !== false;
    const midThreshold    = normalSettings.midThreshold ?? 0;
    const actThreshold    = normalSettings.actThreshold ?? 0;

    for (let i = 1; i < normalRowsRaw.length; i++) {
        const row  = normalRowsRaw[i];
        const code = parseInt(row[idxCode]);
        if (isNaN(code)) continue;

        const name      = (idxName !== -1) ? row[idxName] : `طالب ${code}`;
        let   mid       = parseGrade(row[idxMid]);
        let   act       = parseGrade(row[idxAct]);
        let   finalOrig = parseGrade(row[idxFinal]);
        if (mid === null || act === null || finalOrig === null) continue;

        const isApproved = approvalSet.has(code);
        let   actBoosted = false;

        /* ══ مسار 1: غائب ══ */
        if (mid < 0 || act < 0 || finalOrig < 0) {
            const total = Math.min(mid, act, finalOrig);
            beforeRows.push(total);
            afterRows.push(total);
            results.push({ code, name, mid, act,
                           finalOriginal: finalOrig,
                           finalComputed: total, actBoosted: false });
            continue;
        }

        /* ══ مسار 2: موافقة — قارن الأصلي بالمعامل وخذ الأكبر ══ */
        if (isApproved) {
            const oldMid = mid, oldAct = act;
            const fmid   = 15 + (finalOrig / 50) * normalSettings.midFactor;
            const fact   = 20 + (finalOrig / 50) * normalSettings.actFactor;
            // الأكبر بين الأصلي والمعامل
            let newMid = Math.max(mid, fmid);
            let newAct = Math.max(act, fact);
            // تطبيق الحدود
            newMid = Math.min(normalSettings.midMax, Math.max(normalSettings.midMin, newMid));
            newAct = Math.min(normalSettings.actMax, Math.max(normalSettings.actMin, newAct));

            beneficiaries.push({ code, name, oldMid, oldAct,
                                  newMid, newAct,
                                  byFormulaMid: fmid, byFormulaAct: fact });

            const total = Math.ceil(newMid) + Math.ceil(newAct) + finalOrig;
            beforeRows.push(total);
            afterRows.push(total);
            results.push({ code, name,
                           mid: Math.ceil(newMid), act: Math.ceil(newAct),
                           finalOriginal: finalOrig,
                           finalComputed: total, actBoosted: false });
            continue;
        }

        /* ══ مسار 3: باقي الطلاب ══ */
        let finalAct = act;

        // فحص العتبة — الطالب أقل من أو يساوي العتبة لا يستفيد من H ولا من رفع الأعمال
        const belowThreshold = (mid <= midThreshold && act <= actThreshold);

        // أ) قاعدة H — لا تطبق لو تحت العتبة أو فاينل < 15
        if (normalSettings.applyHEnabled && !belowThreshold && finalOrig >= 15) {
            const variable = 10 - normalSettings.hValue;
            const added    = act + normalSettings.hValue + (finalOrig / 50) * variable;
            finalAct = Math.ceil(added);
            if (finalAct > 30) finalAct = 30;
            if (finalAct < 0)  finalAct = 0;
        }

        // سجّل المجموع قبل رفع الأعمال
        const totalBefore = mid + finalAct + finalOrig;
        beforeRows.push(totalBefore);

        // ب) رفع الأعمال — لا تطبق لو تحت العتبة
        if (raiseEnabled &&
            normalSettings.applyHEnabled &&
            !belowThreshold &&
            finalOrig >= 15)
        {
            const threshold   = normalSettings.passGrade - normalSettings.boostPoints;
            const totalAfterH = mid + finalAct + finalOrig;
            if (totalAfterH >= threshold) {
                const needed = normalSettings.passGrade - mid - finalOrig;
                const newAct = Math.min(finalAct + normalSettings.boostPoints, needed);
                if (newAct <= 30 && newAct > finalAct) {
                    finalAct   = newAct;
                    actBoosted = true;
                }
            }
        }

        const totalAfter = mid + finalAct + finalOrig;
        afterRows.push(totalAfter);
        results.push({ code, name, mid, act: finalAct,
                       finalOriginal: finalOrig,
                       finalComputed: totalAfter, actBoosted });
    }

    if (!results.length) {
        document.getElementById('normalMsg').innerHTML = `
            <div class="alert-info" style="border-color:#c0392b; background:#ffeaea;">
                ⚠️ لم يتم العثور على بيانات صالحة!<br>
                • تأكد أن الصف الأول هو الهيدر (كود، اسم، ميد، أعمال، فاينل)
            </div>`;
        return;
    }

    processedData      = results;
    currentSys         = 'normal';
    rawBeforeRaiseData = beforeRows.map(v => ({ totalBefore: v }));

    displayTable(results, 'normalTable');

    // الإحصائيات: قبل رفع الأعمال vs بعد رفع الأعمال
    updateCompareStats(beforeRows, afterRows);

    // المستفيدون من الموافقة
    let benefHtml = '';
    if (beneficiaries.length) {
        benefHtml = `
            <div class="alert-info">
                <strong>المستفيدون من الموافقة</strong>
                <div class="beneficiary-list">
                    <table>
                        <thead>
                            <tr>
                                <th>الكود</th><th>الاسم</th>
                                <th>ميد أصلي</th><th>ميد بالمعامل</th><th>ميد نهائي</th>
                                <th>أعمال أصلي</th><th>أعمال بالمعامل</th><th>أعمال نهائية</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${beneficiaries.map(b => `
                                <tr>
                                    <td>${b.code}</td><td>${b.name}</td>
                                    <td>${b.oldMid}</td>
                                    <td>${b.byFormulaMid.toFixed(1)}</td>
                                    <td><strong>${b.newMid.toFixed(1)}</strong></td>
                                    <td>${b.oldAct}</td>
                                    <td>${b.byFormulaAct.toFixed(1)}</td>
                                    <td><strong>${b.newAct.toFixed(1)}</strong></td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
    }
    document.getElementById('beneficiariesArea').innerHTML = benefHtml;

    renderAbsentBox('normalAbsentArea', extractAbsentRows(normalRowsRaw), 'عادي');

    const boostedCount = results.filter(s => s.actBoosted).length;
    document.getElementById('normalMsg').innerHTML = `
        <div class="alert-info">
            ✔ معالجة ${results.length} طالب |
            موافقة: ${beneficiaries.length} |
            مستفيدون من رفع الأعمال: ${boostedCount} ⭐ |
            قاعدة H: ${normalSettings.applyHEnabled
                ? `مطبقة (ثابت ${normalSettings.hValue})`
                : 'معطلة'}
        </div>`;

    setupPrintBeneficiaries('printNormalBeneficiariesBtn', 'beneficiariesArea');
    setupPrintTable('printNormalTableBtn', 'normalTable');
}

/* ══════════════════════════════════════
   دوال الغائبين
══════════════════════════════════════ */
function extractAbsentRows(rawRows) {
    if (!rawRows || rawRows.length < 2) return [];
    const header = rawRows[0];
    let idxCode = 0, idxName = -1, idxMid = 2, idxAct = 3, idxFinal = 4;
    for (let i = 0; i < header.length; i++) {
        const c = String(header[i] || '').trim().toLowerCase();
        if (c.includes('كود') || c === 'code') idxCode  = i;
        if (c.includes('اسم'))                  idxName  = i;
        if (c.includes('ميد'))                  idxMid   = i;
        if (c.includes('اعمال') || c.includes('أعمال')) idxAct   = i;
        if (c.includes('فاينل') || c.includes('final')) idxFinal = i;
    }
    const absent = [];
    for (let i = 1; i < rawRows.length; i++) {
        const row  = rawRows[i];
        const code = parseInt(row[idxCode]);
        if (isNaN(code)) continue;
        const name    = idxName !== -1 ? row[idxName] : `طالب ${code}`;
        const vals    = [row[idxMid], row[idxAct], row[idxFinal]];
        const labels  = ['ميد', 'أعمال', 'فاينل'];
        const reasons = [];
        vals.forEach((v, idx) => {
            const s = String(v || '').trim();
            if (s === 'غ' || s === 'غـ')           reasons.push(`${labels[idx]}: غائب`);
            if (s === 'إلغاء' || s === 'الغاء')    reasons.push(`${labels[idx]}: إلغاء`);
        });
        if (reasons.length) absent.push({ code, name, reason: reasons.join(' | ') });
    }
    return absent;
}

function renderAbsentBox(containerId, absent, sysLabel) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!absent.length) {
        el.innerHTML = '<div class="alert-info">✅ لا يوجد طلاب غائبون أو ملغية درجاتهم</div>';
        return;
    }
    const rows = absent.map(s =>
        `<tr><td>${s.code}</td><td>${s.name}</td>
         <td style="color:#c0392b;font-weight:bold;">${s.reason}</td></tr>`
    ).join('');
    el.innerHTML = `
        <div class="alert-info" style="border-color:#e74c3c; background:#fff5f5;">
            <strong>⚠️ طلاب الغياب والإلغاء — العدد: ${absent.length}</strong>
            <div class="beneficiary-list" style="margin-top:8px;">
                <table>
                    <thead><tr><th>الكود</th><th>الاسم</th><th>السبب</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
}

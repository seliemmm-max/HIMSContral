/* ========================================
   js/normalSystem.js
   النظام العادي - 3 مسارات فقط:
   1) غائب         → تسجيل فقط
   2) موافقة        → تعديل ميد+أعمال بالمعاملات
   3) باقي الطلاب  → قاعدة H + رفع أعمال للعتبة
   ======================================== */

let normalRowsRaw = [];
let approvalSet   = new Set();
let beneficiaries = [];

function initNormalSystem() {

    document.getElementById('normalInput')?.addEventListener('change', async e => {
        if (!e.target.files.length) return;
        clearProcessedData();
        normalRowsRaw = await readExcel(e.target.files[0]);
        const absent = extractAbsentRows(normalRowsRaw);
        document.getElementById('normalMsg').innerHTML =
            `<div class="alert-info">تم رفع ${normalRowsRaw.length} صف - تم مسح البيانات السابقة</div>`;
        renderAbsentBox('normalAbsentArea', absent, 'عادي');
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
            `<div class="alert-info">تم تحميل ${approvalSet.size} كود موافقة</div>`;
    });

    // ── checkbox تفعيل/تعطيل رفع الأعمال ──
    const raiseChk = document.getElementById('raiseEnabledNormal');
    const raiseOpts = document.getElementById('raiseOptionsNormal');

    function updateRaiseUI() {
        if (!raiseOpts) return;
        const on = raiseChk?.checked !== false;
        raiseOpts.style.opacity        = on ? '1'       : '0.4';
        raiseOpts.style.pointerEvents  = on ? 'auto'    : 'none';
    }

    raiseChk?.addEventListener('change', () => {
        normalSettings.raiseEnabled = raiseChk.checked;
        updateRaiseUI();
        saveAllSettings();
    });

    updateRaiseUI();

    document.getElementById('processNormalBtn')?.addEventListener('click', processNormal);
}

async function processNormal() {
    syncNormalFromUI('normalTab');
    if (!normalRowsRaw.length) { alert('يرجى رفع ملف الطلاب'); return; }

    const header = normalRowsRaw[0];
    let idxCode = -1, idxName = -1, idxMid = -1, idxAct = -1, idxFinal = -1;
    for (let i = 0; i < header.length; i++) {
        const c = String(header[i] || '').toLowerCase();
        if (c.includes('كود') || c === 'code') idxCode  = i;
        if (c.includes('اسم'))                  idxName  = i;
        if (c.includes('ميد'))                  idxMid   = i;
        if (c.includes('اعمال'))                idxAct   = i;
        if (c.includes('فاينل'))                idxFinal = i;
    }
    if (idxCode  === -1) idxCode  = 0;
    if (idxMid   === -1) idxMid   = 2;
    if (idxAct   === -1) idxAct   = 3;
    if (idxFinal === -1) idxFinal = 4;

    const results  = [];
    const statRows = [];
    beneficiaries  = [];

    for (let i = 1; i < normalRowsRaw.length; i++) {
        const row  = normalRowsRaw[i];
        const code = parseInt(row[idxCode]);
        if (isNaN(code)) continue;

        const name      = (idxName !== -1) ? row[idxName] : ('طالب ' + code);
        let   mid       = parseGrade(row[idxMid]);
        let   act       = parseGrade(row[idxAct]);
        let   finalOrig = parseGrade(row[idxFinal]);
        if (mid === null || act === null || finalOrig === null) continue;

        const isApproved = approvalSet.has(code);
        let   actBoosted = false;

        /* ══ مسار 1: غائب ══ */
        if (mid < 0 || act < 0 || finalOrig < 0) {
            const total = Math.min(mid, act, finalOrig);
            statRows.push(total);
            results.push({ code, name, mid, act, finalOriginal: finalOrig,
                           finalComputed: total, actBoosted: false });
            continue;
        }

        /* ══ مسار 2: موافقة ══ */
        if (isApproved) {
            const oldMid = mid, oldAct = act;
            const newMid = 15 + (finalOrig / 50) * normalSettings.midFactor;
            const newAct = 20 + (finalOrig / 50) * normalSettings.actFactor;
            mid = Math.min(normalSettings.midMax, Math.max(normalSettings.midMin, newMid));
            act = Math.min(normalSettings.actMax, Math.max(normalSettings.actMin, newAct));
            beneficiaries.push({ code, name, oldMid, oldAct, newMid: mid, newAct: act });
            const total = Math.ceil(mid) + Math.ceil(act) + finalOrig;
            statRows.push(total);
            results.push({ code, name,
                           mid:           Math.ceil(mid),
                           act:           Math.ceil(act),
                           finalOriginal: finalOrig,
                           finalComputed: total,
                           actBoosted:    false });
            continue;
        }

        /* ══ مسار 3: باقي الطلاب ══ */
        let finalAct = act;

        // أ) قاعدة H
        if (normalSettings.applyHEnabled) {
            const variable = 10 - normalSettings.hValue;
            const added    = act + normalSettings.hValue + (finalOrig / 50) * variable;
            finalAct = Math.ceil(added);
            if (finalAct > 30) finalAct = 30;
            if (finalAct < 0)  finalAct = 0;
        }

        // ب) رفع أعمال السنة — فاينل >= 15 والمجموع في العتبة
        const raiseEnabled = document.getElementById('raiseEnabledNormal')?.checked !== false;
        if (raiseEnabled && normalSettings.applyHEnabled && finalOrig >= 15) {
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

        const total = mid + finalAct + finalOrig;
        statRows.push(total);
        results.push({ code, name, mid, act: finalAct,
                       finalOriginal: finalOrig,
                       finalComputed: total, actBoosted });
    }

    // حفظ وعرض
    processedData      = results;
    currentSys         = 'normal';
    rawBeforeRaiseData = results.map(s => ({ totalBefore: s.finalComputed }));

    displayTable(results, 'normalTable');
    updateCompareStats(statRows, statRows);

    // المستفيدون من الموافقة
    let benefHtml = '';
    if (beneficiaries.length) {
        benefHtml = `
            <div class="alert-info">
                <strong>المستفيدون من الموافقة (تم تعديل الميد/الأعمال)</strong>
                <div class="beneficiary-list">
                    <table>
                        <thead><tr><th>الكود</th><th>الاسم</th><th>ميد قديم</th><th>ميد جديد</th><th>اعمال قديم</th><th>اعمال جديد</th></tr></thead>
                        <tbody>
                            ${beneficiaries.map(b => '<tr><td>' + b.code + '</td><td>' + b.name + '</td><td>' + b.oldMid + '</td><td>' + b.newMid.toFixed(1) + '</td><td>' + b.oldAct + '</td><td>' + b.newAct.toFixed(1) + '</td></tr>').join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
    }
    document.getElementById('beneficiariesArea').innerHTML = benefHtml;

    renderAbsentBox('normalAbsentArea', extractAbsentRows(normalRowsRaw), 'عادي');

    const boostedCount = results.filter(s => s.actBoosted).length;
    document.getElementById('normalMsg').innerHTML =
        '<div class="alert-info">تم معالجة ' + results.length + ' طالب | موافقة: ' + beneficiaries.length +
        ' | مستفيدون من رفع الاعمال: ' + boostedCount + ' | قاعدة H: ' +
        (normalSettings.applyHEnabled ? 'مطبقة (ثابت ' + normalSettings.hValue + ')' : 'معطلة') + '</div>';

    setupPrintBeneficiaries('printNormalBeneficiariesBtn', 'beneficiariesArea');
    setupPrintTable('printNormalTableBtn', 'normalTable');
}

/* ─── دوال الغائبين ─── */
function extractAbsentRows(rawRows) {
    if (!rawRows || rawRows.length < 2) return [];
    const header = rawRows[0];
    let idxCode = 0, idxName = -1, idxMid = 2, idxAct = 3, idxFinal = 4;
    for (let i = 0; i < header.length; i++) {
        const c = String(header[i] || '').toLowerCase();
        if (c.includes('كود') || c === 'code') idxCode  = i;
        if (c.includes('اسم'))                  idxName  = i;
        if (c.includes('ميد'))                  idxMid   = i;
        if (c.includes('اعمال'))                idxAct   = i;
        if (c.includes('فاينل'))                idxFinal = i;
    }
    const absent = [];
    for (let i = 1; i < rawRows.length; i++) {
        const row  = rawRows[i];
        const code = parseInt(row[idxCode]);
        if (isNaN(code)) continue;
        const name    = idxName !== -1 ? row[idxName] : ('طالب ' + code);
        const vals    = [row[idxMid], row[idxAct], row[idxFinal]];
        const labels  = ['ميد', 'اعمال', 'فاينل'];
        const reasons = [];
        vals.forEach((v, idx) => {
            const s = String(v || '').trim();
            if (s === 'غ')     reasons.push(labels[idx] + ': غائب');
            if (s === 'الغاء' || s === 'إلغاء') reasons.push(labels[idx] + ': الغاء');
        });
        if (reasons.length) absent.push({ code, name, reason: reasons.join(' | ') });
    }
    return absent;
}

function renderAbsentBox(containerId, absent, sysLabel) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!absent.length) {
        el.innerHTML = '<div class="alert-info">لا يوجد طلاب غائبون او ملغية درجاتهم</div>';
        return;
    }
    const rows = absent.map(s =>
        '<tr><td>' + s.code + '</td><td>' + s.name +
        '</td><td style="color:#c0392b;font-weight:bold;">' + s.reason + '</td></tr>'
    ).join('');
    el.innerHTML =
        '<div class="alert-info" style="border-color:#e74c3c;background:#fff5f5;">' +
        '<strong>طلاب الغياب والالغاء - العدد: ' + absent.length + '</strong>' +
        '<button class="btn btn-success" style="margin-right:12px;margin-top:6px;" ' +
        'onclick=\'downloadAbsentExcel(' + JSON.stringify(absent).replace(/'/g,"\\'") + ',"' + sysLabel + '")\'>' +
        '<i class="fas fa-file-excel"></i> تنزيل قائمة الغائبين Excel</button>' +
        '<div class="beneficiary-list" style="margin-top:8px;">' +
        '<table><thead><tr><th>الكود</th><th>الاسم</th><th>السبب</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div></div>';
}

function downloadAbsentExcel(absent, sysLabel) {
    const rows = [['الكود', 'الاسم', 'السبب']];
    for (const s of absent) rows.push([s.code, s.name, s.reason]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الغائبون');
    XLSX.writeFile(wb, 'قائمة_الغائبين_' + sysLabel + '.xlsx');
}

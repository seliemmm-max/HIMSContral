/* ========================================
   js/flexSystem.js
   النظام المرن - القواعد الثلاث
   ======================================== */

let flexRowsRaw = [];
let flexRule    = 'old';

/**
 * تهيئة واجهة رفع الملفات حسب القاعدة المختارة
 */
function updateFlexUploadUI() {
    const container  = document.getElementById('flexUploadArea');
    const rule       = document.querySelector('input[name="flexRule"]:checked').value;
    flexRule         = rule;
    const extraConfig= document.getElementById('flexExtraConfig');

    if (rule === 'old') {
        extraConfig.style.display = 'block';
        container.innerHTML = `
            <div class="upload-box">
                <i class="fas fa-file-csv"></i>
                ملف الطلاب (كود، اسم، النموذج، درجة النموذج)
                <input type="file" id="flexStudentsFile" accept=".xlsx, .xls, .csv">
            </div>`;
        document.getElementById('flexApprovalUpload').style.display = 'none';
    } else {
        extraConfig.style.display = 'none';
        container.innerHTML = `
            <div class="upload-box">
                <i class="fas fa-file-excel"></i>
                ملف الطلاب العادي (كود، اسم، ميد، أعمال، فاينل)
                <input type="file" id="flexStudentsFileNormal" accept=".xlsx, .xls, .csv">
            </div>`;
        document.getElementById('flexApprovalUpload').style.display =
            flexApprovalEnabled ? 'block' : 'none';
    }

    // ── ربط حدث رفع الملف مع المسح التلقائي ──
    if (rule === 'old') {
        document.getElementById('flexStudentsFile')?.addEventListener('change', async e => {
            if (e.target.files.length) {
                clearProcessedData();
                flexRowsRaw = await readExcel(e.target.files[0]);
                document.getElementById('flexMsg').innerHTML =
                    `<div class="alert-info">✅ تم رفع ${flexRowsRaw.length} صف - تم مسح البيانات السابقة</div>`;
            }
        });
    } else {
        document.getElementById('flexStudentsFileNormal')?.addEventListener('change', async e => {
            if (e.target.files.length) {
                clearProcessedData();
                flexRowsRaw = await readExcel(e.target.files[0]);
                document.getElementById('flexMsg').innerHTML =
                    `<div class="alert-info">✅ تم رفع ${flexRowsRaw.length} صف - تم مسح البيانات السابقة</div>`;
            }
        });
    }
}

/**
 * تهيئة أحداث النظام المرن
 */
function initFlexSystem() {

    // ملف موافقة المرن
    document.getElementById('flexApprovalFile')?.addEventListener('change', async e => {
        if (!e.target.files.length) return;
        clearProcessedData();
        const rows = await readExcel(e.target.files[0]);
        approvalSet.clear();
        for (const row of rows)
            for (const cell of row) {
                const c = parseInt(cell);
                if (!isNaN(c)) approvalSet.add(c);
            }
        document.getElementById('flexMsg').innerHTML =
            `<div class="alert-info">📋 تم تحميل ${approvalSet.size} كود موافقة للمرن - تم مسح البيانات السابقة</div>`;
    });

    // مراقبة تغيير القاعدة
    document.querySelectorAll('input[name="flexRule"]').forEach(r =>
        r.addEventListener('change', () => updateFlexUploadUI())
    );

    // زر التطبيق
    document.getElementById('processFlexBtn')?.addEventListener('click', processFlex);
}

/**
 * تطبيق النظام المرن وفق القاعدة المختارة
 */
function processFlex() {
    flexRaiseEnabled    = document.getElementById('flexRaiseCheckbox').checked;
    flexApprovalEnabled = document.getElementById('flexApprovalCheckbox').checked;
    flexRule = document.querySelector('input[name="flexRule"]:checked').value;
    saveAllSettings();

    if (!flexRowsRaw.length) { alert('يرجى رفع ملف الطلاب'); return; }

    const results      = [];
    const beforeRaise  = [];
    const approvalCodes= flexApprovalEnabled ? approvalSet : new Set();

    // ── القاعدة 1: تحويل درجة النموذج ──
    if (flexRule === 'old') {
        const header = flexRowsRaw[0];
        let idxCode = -1, idxName = -1, idxScore = -1;
        for (let i = 0; i < header.length; i++) {
            const c = String(header[i] || "").trim().toLowerCase();
            if (c.includes('كود') || c.includes('رقم') || c === 'code') idxCode  = i;
            if (c.includes('اسم') || c.includes('name'))                 idxName  = i;
            if (c.includes('درجة') || c.includes('score'))               idxScore = i;
        }
        if (idxCode  === -1) idxCode  = 0;
        if (idxScore === -1) idxScore = 3;

        for (let i = 1; i < flexRowsRaw.length; i++) {
            const row  = flexRowsRaw[i];
            const code = parseInt(row[idxCode]);
            if (isNaN(code)) continue;
            const name       = (idxName !== -1) ? row[idxName] : `طالب ${code}`;
            const modelScore = row[idxScore];
            const { mid, act } = convertFlex(modelScore);
            const totalBefore  = mid + act;

            beforeRaise.push({ code, name, mid, act, totalBefore, finalOrig: totalBefore });

            let totalAfter = totalBefore;
            if (flexRaiseEnabled && totalAfter >= normalSettings.minRaise &&
                totalAfter <= normalSettings.maxRaise && totalAfter < normalSettings.passGrade)
                totalAfter = normalSettings.passGrade;

            results.push({ code, name, mid, act, finalOriginal: totalAfter, finalComputed: totalAfter });
        }
    }

    // ── القاعدة 2: إضافة 20 لأعمال السنة ──
    else if (flexRule === 'add20') {
        const header = flexRowsRaw[0];
        let idxCode = -1, idxName = -1, idxMid = -1, idxAct = -1, idxFinal = -1;
        for (let i = 0; i < header.length; i++) {
            const c = String(header[i] || "").trim().toLowerCase();
            if (c.includes('كود') || c.includes('رقم') || c === 'code') idxCode  = i;
            if (c.includes('اسم') || c.includes('name'))                 idxName  = i;
            if (c.includes('ميد') || c.includes('mid'))                  idxMid   = i;
            if (c.includes('اعمال') || c.includes('أعمال') ||
                c.includes('عمال')  || c.includes('act'))                idxAct   = i;
            if (c.includes('فاينل') || c.includes('final') ||
                c.includes('نهائي'))                                      idxFinal = i;
        }
        if (idxCode  === -1) idxCode  = 0;
        if (idxMid   === -1) idxMid   = 2;
        if (idxAct   === -1) idxAct   = 3;
        if (idxFinal === -1) idxFinal = 4;

        for (let i = 1; i < flexRowsRaw.length; i++) {
            const row      = flexRowsRaw[i];
            const code     = parseInt(row[idxCode]);
            if (isNaN(code)) continue;
            const name     = (idxName !== -1) ? row[idxName] : `طالب ${code}`;
            let   mid      = parseGrade(row[idxMid]);
            let   act      = parseGrade(row[idxAct]);
            let   finalOrig= parseGrade(row[idxFinal]);
            if (mid === null || act === null || finalOrig === null) continue;

            const isApproved = approvalCodes.has(code);
            if (isApproved && finalOrig >= 0 && !isNaN(finalOrig)) {
                const nm = 15 + (finalOrig / 50) * normalSettings.midFactor;
                const na = 20 + (finalOrig / 50) * normalSettings.actFactor;
                mid = Math.min(normalSettings.midMax, Math.max(normalSettings.midMin, nm));
                act = Math.min(normalSettings.actMax, Math.max(normalSettings.actMin, na));
            }

            let finalAct = act + 20;
            if (finalAct > 30) finalAct = 30;

            const totalBefore = (mid < 0 || finalAct < 0 || finalOrig < 0)
                ? Math.min(mid, finalAct, finalOrig)
                : (mid + finalAct + finalOrig);

            beforeRaise.push({ code, name, mid, act: finalAct, finalOrig, totalBefore });

            let totalAfter = totalBefore;
            if (flexRaiseEnabled && totalAfter >= normalSettings.minRaise &&
                totalAfter <= normalSettings.maxRaise && totalAfter < normalSettings.passGrade)
                totalAfter = normalSettings.passGrade;

            results.push({ code, name, mid, act: finalAct, finalOriginal: finalOrig, finalComputed: totalAfter });
        }
    }

    // ── القاعدة 3: توزيع 35 (ثابت أو تصاعدي) ──
    else if (flexRule === 'distribute35') {
        const header = flexRowsRaw[0];
        let idxCode = -1, idxName = -1, idxMid = -1, idxAct = -1, idxFinal = -1;
        for (let i = 0; i < header.length; i++) {
            const c = String(header[i] || "").trim().toLowerCase();
            if (c.includes('كود') || c.includes('رقم') || c === 'code') idxCode  = i;
            if (c.includes('اسم') || c.includes('name'))                 idxName  = i;
            if (c.includes('ميد') || c.includes('mid'))                  idxMid   = i;
            if (c.includes('اعمال') || c.includes('أعمال') ||
                c.includes('عمال')  || c.includes('act'))                idxAct   = i;
            if (c.includes('فاينل') || c.includes('final') ||
                c.includes('نهائي'))                                      idxFinal = i;
        }
        if (idxCode  === -1) idxCode  = 0;
        if (idxMid   === -1) idxMid   = 2;
        if (idxAct   === -1) idxAct   = 3;
        if (idxFinal === -1) idxFinal = 4;

        for (let i = 1; i < flexRowsRaw.length; i++) {
            const row      = flexRowsRaw[i];
            const code     = parseInt(row[idxCode]);
            if (isNaN(code)) continue;
            const name     = (idxName !== -1) ? row[idxName] : `طالب ${code}`;
            let   mid      = parseGrade(row[idxMid]);
            let   act      = parseGrade(row[idxAct]);
            let   finalOrig= parseGrade(row[idxFinal]);
            if (mid === null || act === null || finalOrig === null) continue;

            const isApproved = approvalCodes.has(code);
            if (isApproved && finalOrig >= 0 && !isNaN(finalOrig)) {
                const nm = 15 + (finalOrig / 50) * normalSettings.midFactor;
                const na = 20 + (finalOrig / 50) * normalSettings.actFactor;
                mid = Math.min(normalSettings.midMax, Math.max(normalSettings.midMin, nm));
                act = Math.min(normalSettings.actMax, Math.max(normalSettings.actMin, na));
            }

            if (finalOrig >= distributeSettings.minFinalForBonus) {
                let bonusTotal = distributeSettings.baseBonus;
                if (distributeSettings.isProgressive) {
                    bonusTotal += (finalOrig - distributeSettings.minFinalForBonus) * distributeSettings.increment;
                    if (bonusTotal > distributeSettings.maxBonus) bonusTotal = distributeSettings.maxBonus;
                    if (bonusTotal < 0) bonusTotal = 0;
                }
                const bonusMid = Math.ceil(bonusTotal * distributeSettings.midRatio);
                const bonusAct = Math.ceil(bonusTotal * distributeSettings.actRatio);
                let   newMid   = Math.max(mid, bonusMid);
                let   newAct   = Math.max(act, bonusAct);
                if (newMid > 20) newMid = 20;
                if (newAct > 30) newAct = 30;
                mid = newMid;
                act = newAct;
            }

            const totalBefore = (mid < 0 || act < 0 || finalOrig < 0)
                ? Math.min(mid, act, finalOrig)
                : (mid + act + finalOrig);

            beforeRaise.push({ code, name, mid, act, finalOrig, totalBefore });

            let totalAfter = totalBefore;
            if (flexRaiseEnabled && totalAfter >= normalSettings.minRaise &&
                totalAfter <= normalSettings.maxRaise && totalAfter < normalSettings.passGrade)
                totalAfter = normalSettings.passGrade;

            results.push({ code, name, mid, act, finalOriginal: finalOrig, finalComputed: totalAfter });
        }
    }

    // -- حفظ وعرض --
    processedData      = results;
    currentSys         = 'flex';
    rawBeforeRaiseData = beforeRaise;

    if (!results.length) {
        document.getElementById('flexMsg').innerHTML = `
            <div class="alert-info" style="border-color:#c0392b; background:#ffeaea;">
                ⚠️ لم يتم العثور على بيانات صالحة!<br>
                <strong>تحقق من:</strong><br>
                • أن الصف الأول هو الهيدر (كود، اسم، ميد، أعمال، فاينل)<br>
                • أن الأكواد أرقام وليست فارغة<br>
                • أن الدرجات أرقام أو "غ" أو "إلغاء"<br>
                <small style="color:#888">عدد الصفوف المرفوعة: ${flexRowsRaw.length - 1} صف بيانات</small>
            </div>`;
        return;
    }

    displayTable(results, 'flexTable');
    updateCompareStats(beforeRaise.map(s => s.totalBefore), results.map(s => s.finalComputed));

    const ruleName = (flexRule === 'old')
        ? '1 (تحويل النموذج)'
        : (flexRule === 'add20')
            ? '2 (إضافة 20)'
            : '3 (توزيع)';

    document.getElementById('flexMsg').innerHTML = `
        <div class="alert-info">
            ✔ معالجة ${results.length} طالب بالقاعدة ${ruleName} -
            رفع: ${flexRaiseEnabled ? 'مفعل' : 'معطل'} -
            موافقة: ${flexApprovalEnabled ? 'مفعلة' : 'معطلة'}
        </div>`;

    setupPrintBeneficiaries('printFlexBeneficiariesBtn', 'beneficiariesArea');
    setupPrintTable('printFlexTableBtn', 'flexTable');
}

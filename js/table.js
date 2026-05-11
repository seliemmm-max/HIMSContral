/* ========================================
   js/table.js
   عرض الجداول - البحث - الطباعة
   ======================================== */

/**
 * عرض جدول النتائج داخل عنصر HTML معيّن
 */
function displayTable(data, elementId) {
    let html = `
        <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>كود الطالب</th>
                    <th>الميد ترم</th>
                    <th>أعمال السنة</th>
                    <th>درجة الفاينل (الأصلية)</th>
                    <th class="total-col">المجموع الكلي</th>
                </tr>
            </thead>
            <tbody>`;

    data.forEach((s, idx) => {
        const hasAbsence = (s.mid < 0 || s.act < 0 || s.finalOriginal < 0);
        const rowClass   = hasAbsence
            ? 'class="absent-row"'
            : s.actBoosted
                ? 'class="boosted-row"'
                : '';
        const fmt = val => val < 0 ? `<span class="absent-cell">${val}</span>` : val;

        let total = (s.mid < 0 || s.act < 0 || s.finalOriginal < 0)
            ? Math.min(s.mid, s.act, s.finalOriginal)
            : (s.mid + s.act + s.finalOriginal);
        let totalDisplay = (s.mid < 0 || s.act < 0 || s.finalOriginal < 0)
            ? `<span class="absent-cell">${total}</span>`
            : `<strong>${total}</strong>`;

        const totalCellClass = s.actBoosted ? 'total-col boosted-total' : 'total-col';

        html += `
            <tr ${rowClass}>
                <td>${idx + 1}</td>
                <td>${s.code}</td>
                <td>${fmt(s.mid)}</td>
                <td>${fmt(s.act)}</td>
                <td>${fmt(s.finalOriginal)}</td>
                <td class="${totalCellClass}">${totalDisplay}${s.actBoosted ? ' <span title="تم رفع أعمال السنة">⭐</span>' : ''}</td>
            </tr>`;
    });

    html += `</tbody></table></div>`;
    document.getElementById(elementId).innerHTML = html;

    // إعادة ربط البحث بعد إعادة بناء الجدول
    setTimeout(() => {
        if (elementId === 'normalTable') setupSearch('normalSearchInput', 'normalTable');
        if (elementId === 'flexTable')   setupSearch('flexSearchInput',   'flexTable');
    }, 100);
}

/**
 * إعداد البحث الفوري في جدول
 */
function setupSearch(searchInputId, tableContainerId) {
    const searchInput = document.getElementById(searchInputId);
    if (!searchInput) return;
    const handler = () => {
        const term  = searchInput.value.trim().toLowerCase();
        const table = document.querySelector(`#${tableContainerId} .table-container table`);
        if (!table) return;
        table.querySelectorAll('tbody tr').forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
        });
    };
    searchInput.removeEventListener('keyup', handler);
    searchInput.addEventListener('keyup', handler);
}

/**
 * بناء صفحة طباعة داخل iframe مخفي وتشغيل أمر الطباعة
 */
function printDirect(content, title) {
    let printFrame = document.getElementById('printFrame');
    if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id        = 'printFrame';
        printFrame.className = 'print-frame';
        document.body.appendChild(printFrame);
    }
    const doc = printFrame.contentWindow.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Cairo', sans-serif; padding: 30px; background: white; direction: rtl; }
                .report-header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #1a4c6e; position: relative; }
                .logo-left-print, .logo-right-print { position: absolute; top: 0; }
                .logo-left-print  { left: 0; }
                .logo-right-print { right: 0; }
                .logo-img-print   { width: 60px; height: 60px; object-fit: contain; }
                .institute-name   { font-size: 1.4rem; font-weight: bold; color: #1a4c6e; margin-bottom: 5px; }
                .program-course   { font-size: 1rem; color: #2c7c9e; margin-bottom: 10px; }
                .report-title     { font-size: 1.3rem; font-weight: bold; color: #ffd966; background: #1a4c6e; display: inline-block; padding: 8px 25px; border-radius: 30px; margin-top: 10px; }
                .print-date       { text-align: left; font-size: 0.8rem; color: #666; margin-top: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #999; padding: 10px 8px; text-align: center; }
                th { background: #1a4c6e; color: white; }
                .footer-note { text-align: center; margin-top: 30px; font-size: 0.8rem; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
                @media print { body { margin: 0; padding: 20px; } }
            </style>
        </head>
        <body>
        <div class="report-header">
            <div class="logo-left-print"><img src="logos/ministry-logo.png"  class="logo-img-print" onerror="this.style.display='none'"></div>
            <div class="logo-right-print"><img src="logos/institute-logo.png" class="logo-img-print" onerror="this.style.display='none'"></div>
            <div class="institute-name">${reportSettings.instituteName}</div>
            <div class="program-course">برنامج ${reportSettings.programName} | مقرر ${reportSettings.courseName}</div>
            <div class="report-title">${title}</div>
            <div class="print-date">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</div>
        </div>
        ${content}
        <div class="footer-note">هذا التقرير صادر عن نظام الكنترول المتكامل - جميع الحقوق محفوظة</div>
        </body>
        </html>
    `);
    doc.close();
    setTimeout(() => { printFrame.contentWindow.focus(); printFrame.contentWindow.print(); }, 500);
}

/** طباعة قائمة المستفيدين */
function setupPrintBeneficiaries(btnId, beneficiariesAreaId) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', () => {
        const div = document.getElementById(beneficiariesAreaId);
        if (!div || !div.querySelector('table')) { alert('لا توجد بيانات مستفيدين للطباعة'); return; }
        printDirect(div.querySelector('table').outerHTML, 'قائمة المستفيدين من الموافقة');
    });
}

/**
 * تصدير شيت Excel لطلاب الغياب والإلغاء
 * يُصدَّر من processedData الحالية (عادي أو مرن)
 * @param {string} systemLabel - اسم النظام للملف (عادي / مرن)
 */
function exportAbsentStudents(systemLabel) {
    if (!processedData || !processedData.length) {
        alert('لا توجد بيانات معالجة — يرجى تطبيق النظام أولاً');
        return;
    }

    // تصفية طلاب الغياب والإلغاء (أي قيمة سالبة في mid أو act أو finalOriginal)
    const absentRows = processedData.filter(s =>
        s.mid < 0 || s.act < 0 || s.finalOriginal < 0
    );

    if (!absentRows.length) {
        alert('✅ لا يوجد طلاب غياب أو إلغاء في البيانات الحالية');
        return;
    }

    // بناء صفوف الشيت
    const sheetData = [
        ['م', 'كود الطالب', 'الاسم', 'الميد ترم', 'أعمال السنة', 'الفاينل', 'السبب']
    ];

    absentRows.forEach((s, idx) => {
        const getReason = (val) => {
            if (val === -3) return 'غائب (غ)';
            if (val === -8) return 'إلغاء';
            return '';
        };
        // نجمع أسباب كل الخانات السالبة
        const reasons = [];
        if (s.mid < 0)          reasons.push(`ميد: ${getReason(s.mid)}`);
        if (s.act < 0)          reasons.push(`أعمال: ${getReason(s.act)}`);
        if (s.finalOriginal < 0) reasons.push(`فاينل: ${getReason(s.finalOriginal)}`);

        const displayVal = v => v < 0 ? (v === -3 ? 'غ' : 'إلغاء') : v;

        sheetData.push([
            idx + 1,
            s.code,
            s.name || '',
            displayVal(s.mid),
            displayVal(s.act),
            displayVal(s.finalOriginal),
            reasons.join(' | ')
        ]);
    });

    // إنشاء الشيت مع تنسيق
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // ضبط عرض الأعمدة
    ws['!cols'] = [
        { wch: 5 }, { wch: 12 }, { wch: 25 },
        { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 30 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'طلاب الغياب');
    XLSX.writeFile(wb, `طلاب_الغياب_${systemLabel}_${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.xlsx`);
}

/** طباعة الجدول الكامل */
function setupPrintTable(btnId, tableContainerId) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', () => {
        const tableDiv = document.querySelector(`#${tableContainerId} .table-container`);
        if (!tableDiv || !tableDiv.querySelector('table')) { alert('لا توجد بيانات للطباعة'); return; }
        const title = (tableContainerId === 'normalTable')
            ? 'قائمة الطلاب - النظام العادي'
            : 'قائمة الطلاب - النظام المرن';
        printDirect(tableDiv.querySelector('table').outerHTML, title);
    });
}

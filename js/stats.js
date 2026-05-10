/* ========================================
   js/stats.js
   الإحصائيات والرسم البياني المقارن
   ======================================== */

let chartCompare = null;

/**
 * تحديث لوحة الإحصائيات (قبل/بعد الرفع) والرسم البياني
 */
function updateCompareStats(beforeScores, afterScores) {
    if (!beforeScores.length) return;

    const before = calcStats(beforeScores);
    const after  = calcStats(afterScores);

    const avgBefore = (beforeScores.reduce((a, b) => a + b, 0) / before.total).toFixed(1);
    const avgAfter  = (afterScores.reduce((a, b) => a + b, 0)  / after.total).toFixed(1);

    document.getElementById('statsBefore').innerHTML = `
        <div class="stat-card"><i class="fas fa-chart-line"></i> قبل الرفع<br>
            العدد: ${before.total}<br>ناجح: ${before.pass}<br>راسب: ${before.fail}<br>
            نسبة النجاح: ${before.percent}%</div>
        <div class="stat-card"><i class="fas fa-tachometer-alt"></i> المتوسط: ${avgBefore}</div>`;

    document.getElementById('statsAfter').innerHTML = `
        <div class="stat-card"><i class="fas fa-chart-line"></i> بعد الرفع<br>
            العدد: ${after.total}<br>ناجح: ${after.pass}<br>راسب: ${after.fail}<br>
            نسبة النجاح: ${after.percent}%</div>
        <div class="stat-card"><i class="fas fa-tachometer-alt"></i> المتوسط: ${avgAfter}</div>`;

    // الرسم البياني
    const labels     = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'];
    const beforeData = labels.map(l => before.dist[l]);
    const afterData  = labels.map(l => after.dist[l]);
    const ctx        = document.getElementById('compareChart').getContext('2d');

    if (chartCompare) chartCompare.destroy();
    chartCompare = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'قبل الرفع', data: beforeData, backgroundColor: '#f39c12' },
                { label: 'بعد الرفع', data: afterData,  backgroundColor: '#2ecc71' }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw} طالب` } },
                datalabels: { display: true, align: 'top', anchor: 'end' }
            }
        }
    });

    // جدول التفاصيل
    const buildTable = (dist, total) => `
        <table>
            <thead><tr><th>تقدير</th><th>عدد</th><th>نسبة</th></tr></thead>
            <tbody>
                ${labels.map(l => `
                    <tr>
                        <td>${l}</td>
                        <td>${dist[l]}</td>
                        <td>${((dist[l] / total) * 100).toFixed(1)}%</td>
                    </tr>`).join('')}
            </tbody>
        </table>`;

    document.getElementById('compareDetails').innerHTML = `
        <div class="compare-table">
            <div class="compare-card"><h4>📊 قبل الرفع</h4>${buildTable(before.dist, before.total)}</div>
            <div class="compare-card"><h4>📈 بعد الرفع</h4>${buildTable(after.dist,  after.total)}</div>
        </div>`;
}

// ============================================================================
// invoice_kit.js
// কেন্দ্রীয় শেয়ার্ড মডিউল — ইনভয়েস/কোটেশন টেমপ্লেট ও নিরাপদ PDF প্রিন্ট সিস্টেম
// ============================================================================

import { dbFirestore, doc, getDoc } from './firebase_config.js';

export async function getShopBranding(SHOP_ID) {
    let details = {};
    try {
        const cached = localStorage.getItem(`shop_details_${SHOP_ID}`);
        if (cached) details = JSON.parse(cached);
    } catch (e) { }

    if (!details.image || !details.address) {
        try {
            const snap = await getDoc(doc(dbFirestore, "shops", SHOP_ID));
            if (snap.exists()) {
                details = { ...details, ...snap.data() };
                localStorage.setItem(`shop_details_${SHOP_ID}`, JSON.stringify(details));
            }
        } catch (e) { }
    }

    return {
        name: details.name || localStorage.getItem('activeShopName') || 'My Shop',
        logo: details.image || '',
        address: details.address || '',
        phone: details.phone || details.contact || ''
    };
}

export function numberToWordsBDT(num) {
    num = Math.round(Number(num) || 0);
    if (num === 0) return "Zero Taka Only";
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function two(n) { return n < 20 ? a[n] : b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : ''); }
    function three(n) { return (n >= 100 ? a[Math.floor(n / 100)] + ' Hundred ' : '') + two(n % 100); }
    let crore = Math.floor(num / 10000000); num %= 10000000;
    let lakh = Math.floor(num / 100000); num %= 100000;
    let thousand = Math.floor(num / 1000); num %= 1000;
    let rest = num;
    let words = '';
    if (crore) words += three(crore) + ' Crore ';
    if (lakh) words += three(lakh) + ' Lakh ';
    if (thousand) words += three(thousand) + ' Thousand ';
    if (rest) words += three(rest);
    return words.trim() + ' Taka Only';
}

export function renderPremiumDocument({
    docType = 'INVOICE',
    docNo = '',
    docDate = '',
    shop = { name: '', logo: '', address: '', phone: '' },
    partyLabel = 'Customer',
    partyName = '',
    partyPhone = '',
    items = [],
    subtotal = 0,
    discount = 0,
    total = 0,
    paid = null,
    due = null,
    extraNote = '',
    footerNote = 'Thank you for your business!'
}) {
    const accentColor = docType === 'PURCHASE' ? '#7c3aed' : docType === 'QUOTATION' ? '#0891b2' : docType === 'RETURN' ? '#dc2626' : '#4F46E5';
    const docTitle = { INVOICE: 'INVOICE', PURCHASE: 'PURCHASE BILL', QUOTATION: 'QUOTATION', RETURN: 'RETURN MEMO' }[docType] || 'DOCUMENT';

    const rows = items.map((it, i) => `
        <tr>
            <td style="padding:10px 8px; border-bottom:1px solid #f1f5f9; text-align:center; color:#94a3b8; font-size:12px;">${i + 1}</td>
            <td style="padding:10px 8px; border-bottom:1px solid #f1f5f9;">
                <div style="font-weight:600; color:#1e293b; font-size:13px;">${it.name || ''}</div>
                ${it.brand ? `<div style="font-size:11px; color:#94a3b8;">${it.brand}</div>` : ''}
            </td>
            <td style="padding:10px 8px; border-bottom:1px solid #f1f5f9; text-align:center; font-size:13px; color:#475569;">${it.qty || 0} ${it.unit || ''}</td>
            <td style="padding:10px 8px; border-bottom:1px solid #f1f5f9; text-align:right; font-size:13px; color:#475569;">৳${Number(it.rate || 0).toLocaleString()}</td>
            <td style="padding:10px 8px; border-bottom:1px solid #f1f5f9; text-align:right; font-weight:600; font-size:13px; color:#1e293b;">৳${Number(it.amount || 0).toLocaleString()}</td>
        </tr>
    `).join('');

    const paidRow = (paid !== null) ? `
        <div style="display:flex; justify-content:space-between; padding:6px 0; font-size:13px; color:#059669;"><span>Paid</span><span>৳${Number(paid).toLocaleString()}</span></div>
        <div style="display:flex; justify-content:space-between; padding:6px 0; font-size:14px; font-weight:700; color:${due > 0 ? '#dc2626' : '#059669'};"><span>${due > 0 ? 'Due Amount' : 'Status'}</span><span>${due > 0 ? '৳' + Number(due).toLocaleString() : 'Fully Paid ✓'}</span></div>
    ` : '';

    const logoHeaderHtml = shop.logo
        ? `<img src="${shop.logo}" crossorigin="anonymous" style="width:64px; height:64px; border-radius:16px; object-fit:cover; box-shadow:0 4px 14px rgba(0,0,0,0.12); border:2px solid white;">`
        : `<div style="width:64px; height:64px; border-radius:16px; background:linear-gradient(135deg, ${accentColor}, #1e1b4b); display:flex; align-items:center; justify-content:center; color:white; font-weight:800; font-size:24px;">${(shop.name || 'S').charAt(0).toUpperCase()}</div>`;

    return `
    <div style="position:relative; font-family:'Poppins','Hind Siliguri',sans-serif; width:100%; max-width:800px; margin:0 auto; background:#ffffff; color:#1e293b; overflow:hidden;">
        <div style="position:relative; z-index:1; padding:32px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:20px; border-bottom:3px solid ${accentColor};">
                <div style="display:flex; gap:14px; align-items:center;">
                    ${logoHeaderHtml}
                    <div>
                        <div style="font-size:20px; font-weight:800; color:#0f172a; letter-spacing:-0.3px;">${shop.name || 'My Shop'}</div>
                        ${shop.address ? `<div style="font-size:11px; color:#64748b; margin-top:2px;">${shop.address}</div>` : ''}
                        ${shop.phone ? `<div style="font-size:11px; color:#64748b;">📞 ${shop.phone}</div>` : ''}
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="display:inline-block; background:${accentColor}; color:white; font-size:11px; font-weight:700; letter-spacing:1.5px; padding:5px 14px; border-radius:20px; margin-bottom:8px;">${docTitle}</div>
                    <div style="font-size:13px; color:#0f172a; font-weight:700;">${docNo}</div>
                    <div style="font-size:11px; color:#94a3b8;">${docDate}</div>
                </div>
            </div>

            <div style="margin-top:18px; background:#f8fafc; border-radius:12px; padding:14px 18px;">
                <div style="font-size:10px; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; font-weight:700; margin-bottom:4px;">${partyLabel}</div>
                <div style="font-size:14px; font-weight:700; color:#0f172a;">${partyName || 'Walk-in'}</div>
                ${partyPhone ? `<div style="font-size:12px; color:#64748b;">${partyPhone}</div>` : ''}
                ${extraNote ? `<div style="font-size:11px; color:${accentColor}; font-weight:600; margin-top:4px;">${extraNote}</div>` : ''}
            </div>

            <table style="width:100%; border-collapse:collapse; margin-top:20px;">
                <thead>
                    <tr style="background:#0f172a;">
                        <th style="padding:10px 8px; color:white; font-size:10px; text-transform:uppercase; text-align:center; border-radius:8px 0 0 8px;">#</th>
                        <th style="padding:10px 8px; color:white; font-size:10px; text-transform:uppercase; text-align:left;">Item</th>
                        <th style="padding:10px 8px; color:white; font-size:10px; text-transform:uppercase; text-align:center;">Qty</th>
                        <th style="padding:10px 8px; color:white; font-size:10px; text-transform:uppercase; text-align:right;">Rate</th>
                        <th style="padding:10px 8px; color:white; font-size:10px; text-transform:uppercase; text-align:right; border-radius:0 8px 8px 0;">Amount</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>

            <div style="display:flex; justify-content:flex-end; margin-top:16px;">
                <div style="width:260px;">
                    <div style="display:flex; justify-content:space-between; padding:6px 0; font-size:13px; color:#64748b;"><span>Subtotal</span><span>৳${Number(subtotal).toLocaleString()}</span></div>
                    ${discount > 0 ? `<div style="display:flex; justify-content:space-between; padding:6px 0; font-size:13px; color:#dc2626;"><span>Discount</span><span>- ৳${Number(discount).toLocaleString()}</span></div>` : ''}
                    <div style="display:flex; justify-content:space-between; padding:10px 0; margin-top:4px; border-top:2px solid #0f172a; font-size:16px; font-weight:800; color:#0f172a;"><span>Total</span><span>৳${Number(total).toLocaleString()}</span></div>
                    ${paidRow}
                </div>
            </div>

            <div style="margin-top:16px; padding:10px 14px; background:#fffbeb; border-radius:10px; font-size:11px; color:#78350f;">
                <strong>In Words:</strong> ${numberToWordsBDT(total)}
            </div>

            <div style="display:flex; justify-content:space-between; margin-top:50px; padding-top:14px;">
                <div style="text-align:center; width:160px;">
                    <div style="border-top:1px solid #cbd5e1; padding-top:6px; font-size:11px; color:#64748b; font-weight:600;">${partyLabel} Signature</div>
                </div>
                <div style="text-align:center; width:160px;">
                    <div style="border-top:1px solid #cbd5e1; padding-top:6px; font-size:11px; color:#64748b; font-weight:600;">For ${shop.name || 'Shop'}</div>
                </div>
            </div>

            <div style="text-align:center; margin-top:24px; font-size:11px; color:#94a3b8; font-weight:600;">${footerNote}</div>
        </div>
    </div>`;
}

// PDF Preview Handler with Safe Fallback
export async function showPdfPreview(htmlContent, filename, options = {}) {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // যদি মোবাইল ডিভাইস হয় অথবা সরাসরি প্রিন্ট ডায়ালগ দিয়ে PDF চাওয়া হয়
    if (isMobile) {
        const printWindow = document.createElement('div');
        printWindow.id = 'tempPrintHolder';
        printWindow.style.display = 'none';
        printWindow.innerHTML = typeof htmlContent === 'string' ? htmlContent : htmlContent.outerHTML;
        document.body.appendChild(printWindow);
        window.print();
        setTimeout(() => printWindow.remove(), 1000);
        return;
    }

    // ডেস্কটপে সরাসরি html2pdf এক্সপোর্ট
    try {
        if (typeof window.html2pdf !== 'undefined') {
            const pdfOptions = Object.assign({
                margin: 8,
                filename: filename || 'document.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }, options);

            await window.html2pdf().set(pdfOptions).from(htmlContent).save();
        } else {
            window.print();
        }
    } catch (e) {
        window.print();
    }
}

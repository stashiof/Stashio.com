// ============================================================================
// invoice_kit.js
// কেন্দ্রীয়/শেয়ার্ড মডিউল — প্রিমিয়াম ইনভয়েস/চালান/কোটেশন টেমপ্লেট এবং
// "ডাউনলোডের আগে প্রিভিউ" PDF মোডাল সিস্টেম। সব পেজ এটা import করে ব্যবহার করে,
// যাতে ডিজাইন সবখানে একই রকম প্রিমিয়াম মানের থাকে এবং কোড ডুপ্লিকেট না হয়।
// ============================================================================

import { dbFirestore, doc, getDoc } from './firebase_config.js';

// ---- ১. দোকানের ব্র্যান্ডিং তথ্য (নাম, লোগো, ঠিকানা, ফোন) আনা ----
// আগে localStorage cache চেক করে (দ্রুত), তারপর দরকার হলে Firestore থেকে fresh আনে।
export async function getShopBranding(SHOP_ID) {
    let details = {};
    try {
        const cached = localStorage.getItem(`shop_details_${SHOP_ID}`);
        if (cached) details = JSON.parse(cached);
    } catch (e) { /* cache পড়তে ব্যর্থ হলে সমস্যা নেই, Firestore থেকে আনবে */ }

    // যদি cache-এ লোগো/ঠিকানা না থাকে, Firestore থেকে fresh টেনে cache আপডেট করি
    if (!details.image || !details.address) {
        try {
            const snap = await getDoc(doc(dbFirestore, "shops", SHOP_ID));
            if (snap.exists()) {
                details = { ...details, ...snap.data() };
                localStorage.setItem(`shop_details_${SHOP_ID}`, JSON.stringify(details));
            }
        } catch (e) { /* অফলাইন হলে যা cache-এ আছে তাই দিয়ে চালাবো */ }
    }

    return {
        name: details.name || localStorage.getItem('activeShopName') || 'My Shop',
        logo: details.image || '',
        address: details.address || '',
        phone: details.phone || details.contact || ''
    };
}

// ---- ২. সংখ্যাকে কথায় রূপান্তর (টাকার অংকের জন্য) ----
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

// ---- ৩. প্রিমিয়াম ডকুমেন্ট টেমপ্লেট (ইনভয়েস / চালান / কোটেশন সব একই বেস ব্যবহার করে) ----
// docType: 'INVOICE' | 'PURCHASE' | 'QUOTATION' | 'RETURN'
export function renderPremiumDocument({
    docType = 'INVOICE',
    docNo = '',
    docDate = '',
    shop = { name: '', logo: '', address: '', phone: '' },
    partyLabel = 'Customer',
    partyName = '',
    partyPhone = '',
    items = [],           // [{ name, brand, unit, qty, rate, amount }]
    subtotal = 0,
    discount = 0,
    total = 0,
    paid = null,           // null হলে "Paid" সারি দেখাবে না (যেমন quotation-এ)
    due = null,
    extraNote = '',        // যেমন quotation-এর "Valid until" বা purchase-এর batch no
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

    // দোকানের লোগো watermark হিসেবে ব্যাকগ্রাউন্ডে হালকাভাবে বসানো হচ্ছে
    const watermarkHtml = shop.logo ? `
        <div style="position:absolute; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; pointer-events:none; z-index:0; overflow:hidden;">
            <img src="${shop.logo}" crossorigin="anonymous" style="width:340px; height:340px; object-fit:contain; opacity:0.06; transform:rotate(-15deg);">
        </div>` : '';

    const logoHeaderHtml = shop.logo
        ? `<img src="${shop.logo}" crossorigin="anonymous" style="width:64px; height:64px; border-radius:16px; object-fit:cover; box-shadow:0 4px 14px rgba(0,0,0,0.12); border:2px solid white;">`
        : `<div style="width:64px; height:64px; border-radius:16px; background:linear-gradient(135deg, ${accentColor}, #1e1b4b); display:flex; align-items:center; justify-content:center; color:white; font-weight:800; font-size:24px;">${(shop.name || 'S').charAt(0).toUpperCase()}</div>`;

    return `
    <div style="position:relative; font-family:'Poppins','Hind Siliguri',sans-serif; width:100%; max-width:800px; margin:0 auto; background:#ffffff; color:#1e293b; overflow:hidden;">
        ${watermarkHtml}
        <div style="position:relative; z-index:1; padding:32px;">

            <!-- হেডার -->
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

            <!-- পার্টি তথ্য -->
            <div style="margin-top:18px; background:#f8fafc; border-radius:12px; padding:14px 18px;">
                <div style="font-size:10px; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; font-weight:700; margin-bottom:4px;">${partyLabel}</div>
                <div style="font-size:14px; font-weight:700; color:#0f172a;">${partyName || 'Walk-in'}</div>
                ${partyPhone ? `<div style="font-size:12px; color:#64748b;">${partyPhone}</div>` : ''}
                ${extraNote ? `<div style="font-size:11px; color:${accentColor}; font-weight:600; margin-top:4px;">${extraNote}</div>` : ''}
            </div>

            <!-- আইটেম টেবিল -->
            <table style="width:100%; border-collapse:collapse; margin-top:20px;">
                <thead>
                    <tr style="background:#0f172a;">
                        <th style="padding:10px 8px; color:white; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; text-align:center; border-radius:8px 0 0 8px;">#</th>
                        <th style="padding:10px 8px; color:white; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; text-align:left;">Item</th>
                        <th style="padding:10px 8px; color:white; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; text-align:center;">Qty</th>
                        <th style="padding:10px 8px; color:white; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; text-align:right;">Rate</th>
                        <th style="padding:10px 8px; color:white; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; text-align:right; border-radius:0 8px 8px 0;">Amount</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>

            <!-- সামারি -->
            <div style="display:flex; justify-content:flex-end; margin-top:16px;">
                <div style="width:260px;">
                    <div style="display:flex; justify-content:space-between; padding:6px 0; font-size:13px; color:#64748b;"><span>Subtotal</span><span>৳${Number(subtotal).toLocaleString()}</span></div>
                    ${discount > 0 ? `<div style="display:flex; justify-content:space-between; padding:6px 0; font-size:13px; color:#dc2626;"><span>Discount</span><span>- ৳${Number(discount).toLocaleString()}</span></div>` : ''}
                    <div style="display:flex; justify-content:space-between; padding:10px 0; margin-top:4px; border-top:2px solid #0f172a; font-size:16px; font-weight:800; color:#0f172a;"><span>Total</span><span>৳${Number(total).toLocaleString()}</span></div>
                    ${paidRow}
                </div>
            </div>

            <!-- কথায় (word) -->
            <div style="margin-top:16px; padding:10px 14px; background:#fffbeb; border-radius:10px; font-size:11px; color:#78350f;">
                <strong>In Words:</strong> ${numberToWordsBDT(total)}
            </div>

            <!-- ফুটার / স্বাক্ষর -->
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

// ---- ৪. PDF প্রিভিউ মোডাল ----
// html2pdf দিয়ে PDF বানিয়ে সরাসরি ডাউনলোড না করে, একটা in-page মোডালে
// প্রিভিউ দেখায় — ইউজার চাইলে তবেই ডাউনলোড/শেয়ার করবে। এতে মোবাইলের
// Downloads ফোল্ডারে অপ্রয়োজনীয় ফাইল জমে স্টোরেজ নষ্ট হবে না।
let _pdfKitStylesInjected = false;
function ensurePdfKitStyles() {
    if (_pdfKitStylesInjected) return;
    const style = document.createElement('style');
    style.textContent = `
        #pdfPreviewOverlay { position:fixed; inset:0; background:rgba(15,23,42,0.75); backdrop-filter:blur(4px); z-index:9999; display:flex; flex-direction:column; animation:pdfFadeIn 0.2s ease-out; }
        @keyframes pdfFadeIn { from{opacity:0;} to{opacity:1;} }
        #pdfPreviewBar { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; background:#0f172a; color:white; }
        #pdfPreviewBar .pdf-title { font-family:'Poppins',sans-serif; font-weight:700; font-size:14px; display:flex; align-items:center; gap:8px; }
        #pdfPreviewBar button { font-family:'Poppins',sans-serif; border:none; cursor:pointer; font-weight:700; border-radius:10px; padding:9px 16px; font-size:13px; display:flex; align-items:center; gap:6px; }
        .pdf-btn-close { background:#334155; color:white; }
        .pdf-btn-download { background:linear-gradient(135deg,#4F46E5,#7c3aed); color:white; }
        #pdfPreviewFrameWrap { flex:1; overflow:hidden; background:#525659; }
        #pdfPreviewFrameWrap iframe { width:100%; height:100%; border:none; }
        #pdfPreviewLoading { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; font-family:'Poppins',sans-serif; gap:12px; }
    `;
    document.head.appendChild(style);
    _pdfKitStylesInjected = true;
}

/**
 * htmlContent (string বা DOM element) থেকে PDF বানিয়ে প্রিভিউ মোডাল দেখায়।
 * filename: ডাউনলোড করলে যে নামে সেভ হবে।
 * options: html2pdf-এর jsPDF/html2canvas অপশন override করার জন্য (ঐচ্ছিক)।
 */
export async function showPdfPreview(htmlContent, filename, options = {}) {
    ensurePdfKitStyles();

    // মোডাল স্কেলেটন তৈরি
    const overlay = document.createElement('div');
    overlay.id = 'pdfPreviewOverlay';
    overlay.innerHTML = `
        <div id="pdfPreviewBar">
            <div class="pdf-title"><i class="fas fa-file-pdf"></i> Preview</div>
            <div style="display:flex; gap:10px;">
                <button class="pdf-btn-download" id="pdfKitDownloadBtn" disabled><i class="fas fa-download"></i> Download</button>
                <button class="pdf-btn-close" id="pdfKitCloseBtn"><i class="fas fa-times"></i> Close</button>
            </div>
        </div>
        <div id="pdfPreviewFrameWrap">
            <div id="pdfPreviewLoading"><i class="fas fa-spinner fa-spin" style="font-size:28px;"></i><span>প্রিভিউ তৈরি হচ্ছে...</span></div>
        </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('pdfKitCloseBtn').onclick = () => overlay.remove();

    // কন্টেন্ট তৈরি — string হলে অস্থায়ী div-এ বসানো
    let sourceEl = htmlContent;
    if (typeof htmlContent === 'string') {
        sourceEl = document.createElement('div');
        sourceEl.innerHTML = htmlContent;
    }

    const pdfOptions = Object.assign({
        margin: 8,
        filename: filename || 'document.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }, options);

    try {
        const pdfBlob = await window.html2pdf().set(pdfOptions).from(sourceEl).outputPdf('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);

        const frameWrap = document.getElementById('pdfPreviewFrameWrap');
        if (frameWrap) {
            frameWrap.innerHTML = `<iframe src="${blobUrl}"></iframe>`;
        }
        const downloadBtn = document.getElementById('pdfKitDownloadBtn');
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.onclick = () => {
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = pdfOptions.filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
            };
        }
    } catch (err) {
        const frameWrap = document.getElementById('pdfPreviewFrameWrap');
        if (frameWrap) {
            frameWrap.innerHTML = `<div style="color:white; text-align:center; padding:40px; font-family:'Poppins',sans-serif;"><i class="fas fa-exclamation-triangle" style="font-size:32px; margin-bottom:10px; color:#f59e0b;"></i><p>PDF তৈরি করা যায়নি।</p><p style="font-size:12px; opacity:0.7;">${err.message}</p></div>`;
        }
    }
}

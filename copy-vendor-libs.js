// scripts/copy-vendor-libs.js
//
// এই স্ক্রিপ্টটা npm install-এর পরে অটোমেটিক চলে (package.json-এর "postinstall")।
// কাজ: node_modules-এর ভেতরের html2pdf.js ও html5-qrcode লাইব্রেরি ফাইল
// www/vendor/ ফোল্ডারে কপি করে দেয়, যাতে অ্যাপ CDN (ইন্টারনেট) এর উপর নির্ভর না
// করে লোকাল ফাইল থেকেই এগুলো লোড করতে পারে।
//
// কেন দরকার: Android APK (Capacitor WebView) এ CDN থেকে স্ক্রিপ্ট লোড করা মাঝে মাঝে
// ব্যর্থ হয় (নেটওয়ার্ক টাইমিং, নিরাপত্তা নীতি ইত্যাদির কারণে) — যার ফলে
// "html2pdf is not a function" এর মতো এরর দেখা দেয়। লোকাল ফাইল ব্যবহার করলে
// এই সমস্যা সম্পূর্ণ দূর হয়ে যায়, ওয়েবসাইট ও APK দুটোতেই।

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const vendorDir = path.join(root, 'www', 'vendor');

if (!fs.existsSync(vendorDir)) {
    fs.mkdirSync(vendorDir, { recursive: true });
}

const filesToCopy = [
    {
        src: path.join(root, 'node_modules', 'html2pdf.js', 'dist', 'html2pdf.bundle.min.js'),
        dest: path.join(vendorDir, 'html2pdf.bundle.min.js')
    },
    {
        src: path.join(root, 'node_modules', 'html5-qrcode', 'html5-qrcode.min.js'),
        dest: path.join(vendorDir, 'html5-qrcode.min.js')
    }
];

let successCount = 0;
filesToCopy.forEach(({ src, dest }) => {
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`✓ Copied: ${path.basename(dest)}`);
        successCount++;
    } else {
        console.warn(`⚠ Source not found (skipped): ${src}`);
    }
});

console.log(`Vendor library copy complete: ${successCount}/${filesToCopy.length} files.`);

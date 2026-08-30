# Poysha POS — Deployment গাইড

এই গাইডে আছে: (১) Cloudflare Pages-এ ওয়েবসাইট পাবলিশ করা, (২) GitHub Actions দিয়ে Android APK অটো-বিল্ড করা।

---

## ১. Cloudflare Pages-এ ওয়েবসাইট পাবলিশ (সবচেয়ে সহজ অংশ)

React বা কোনো build step লাগবে না — এটা plain HTML/CSS/JS, Cloudflare সরাসরি সার্ভ করে দেবে।

1. এই পুরো প্রজেক্ট আপনার GitHub রিপোজিটরিতে push করুন (যদি না করা থাকে)।
2. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**।
3. আপনার রিপোজিটরি সিলেক্ট করুন।
4. Build settings-এ:
   - **Framework preset:** `None`
   - **Build command:** `npm install`
   - **Build output directory:** `www`

   *(আগে এখানে "খালি রাখুন" বলা হয়েছিল, কিন্তু এখন `npm install` দেওয়া দরকার — এটা html2pdf.js ও html5-qrcode লাইব্রেরি `www/vendor/`-এ কপি করে দেবে, যা ছাড়া PDF/বারকোড স্ক্যান কাজ করবে না।)
5. **Save and Deploy** চাপুন।
6. কয়েক মিনিটে একটা `*.pages.dev` লিংক পাবেন — এটাই আপনার লাইভ ওয়েবসাইট। পরে চাইলে নিজের ডোমেইনও (Custom domains ট্যাব থেকে) যুক্ত করতে পারবেন।

এরপর থেকে যখনই আপনি `main` ব্রাঞ্চে নতুন কোড push করবেন, Cloudflare Pages স্বয়ংক্রিয়ভাবে নতুন ভার্সন পাবলিশ করে দেবে — কিছু করার দরকার নেই।

---

## ২. GitHub Actions দিয়ে Android APK অটো-বিল্ড

এই রিপোতে `.github/workflows/build-apk.yml` নামের একটা ফাইল আছে যেটা স্বয়ংক্রিয়ভাবে APK বানাবে।

### প্রথমবার সেটআপ (একবারই করতে হবে)

1. আপনার কম্পিউটারে (বা GitHub Codespaces-এ) প্রজেক্টটা ক্লোন করুন।
2. Node.js ইনস্টল থাকতে হবে ([nodejs.org](https://nodejs.org) থেকে, LTS ভার্সন)।
3. টার্মিনালে প্রজেক্ট ফোল্ডারে গিয়ে:
   ```
   npm install
   npx cap add android
   ```
   এটা একটা `android/` ফোল্ডার তৈরি করবে। `npm install`-এর সময় স্বয়ংক্রিয়ভাবে html2pdf.js ও html5-qrcode লাইব্রেরিও `www/vendor/`-এ কপি হয়ে যাবে (নিচে "PDF ও ক্যামেরা স্ক্যান" সেকশনে বিস্তারিত)।

4. **ক্যামেরা পারমিশন যোগ করুন** (বারকোড স্ক্যানারের জন্য আবশ্যক — নাহলে "Permission denied" এরর আসবে):

   `android/app/src/main/AndroidManifest.xml` ফাইল খুলুন, `<manifest>` ট্যাগের ভেতরে (`<application>` ট্যাগের **উপরে**) এই লাইনটা যোগ করুন:
   ```xml
   <uses-permission android:name="android.permission.CAMERA" />
   <uses-feature android:name="android.hardware.camera" android:required="false" />
   ```

   তারপর `android/app/src/main/java/com/poyshapos/app/MainActivity.java` (অথবা `.kt`) ফাইল খুলে নিশ্চিত করুন এতে এই মেথডটা আছে (Capacitor-এর ডিফল্ট টেমপ্লেটে সাধারণত এটা প্রয়োজন হয় না, কিন্তু WebView ক্যামেরা পারমিশন-request ঠিকভাবে handle করার জন্য নিচের মতো একটা override যোগ করা নিরাপদ):
   ```java
   package com.poyshapos.app;

   import android.webkit.PermissionRequest;
   import com.getcapacitor.BridgeActivity;

   public class MainActivity extends BridgeActivity {
       @Override
       public void onStart() {
           super.onStart();
           this.bridge.getWebView().setWebChromeClient(new android.webkit.WebChromeClient() {
               @Override
               public void onPermissionRequest(final PermissionRequest request) {
                   runOnUiThread(() -> request.grant(request.getResources()));
               }
           });
       }
   }
   ```
   এটা WebView-কে বলে দেয় যে ক্যামেরা/মাইক্রোফোন চাইলে (JavaScript-এর `getUserMedia()` কল থেকে) সরাসরি অনুমতি দিয়ে দিতে — যেহেতু এটা আপনার নিজের অ্যাপ, ব্যবহারকারীকে বারবার পপ-আপ দেখানোর দরকার নেই।

5. সব পরিবর্তন commit ও push করুন:
   ```
   git add android package.json capacitor.config.json www/vendor
   git commit -m "Add Android platform, camera permission, and local libraries"
   git push
   ```

### এরপর থেকে — সম্পূর্ণ স্বয়ংক্রিয়

যখনই আপনি `main` ব্রাঞ্চে push করবেন, GitHub Actions নিজে থেকেই:
- সর্বশেষ ওয়েব কোড Android প্রজেক্টে সিঙ্ক করবে
- একটা debug APK বানাবে
- সেটা "Artifacts" হিসেবে আপলোড করবে

### APK ডাউনলোড করবেন কীভাবে

1. GitHub রিপোজিটরিতে যান → **Actions** ট্যাব
2. সর্বশেষ "Build Android APK" workflow run-এ ক্লিক করুন
3. নিচে **Artifacts** সেকশনে `poysha-pos-debug-apk` পাবেন — ক্লিক করে ডাউনলোড করুন (zip ফাইল, ভেতরে `.apk`)
4. এই APK ফোনে ইনস্টল করার আগে "Unknown sources" থেকে অ্যাপ ইনস্টলের পারমিশন দিতে হতে পারে (ফোনের Settings থেকে)

### গুরুত্বপূর্ণ নোট

- এই workflow **debug APK** বানায় — নিজের ব্যবহার বা টেস্টিংয়ের জন্য এটাই যথেষ্ট, সরাসরি ইনস্টল করা যায়।
- **Google Play Store-এ আপলোড করতে চাইলে** এর চেয়ে বেশি লাগবে — একটা "signed release APK/AAB" বানাতে হবে, যার জন্য একটা সাইনিং key তৈরি ও GitHub Secrets-এ নিরাপদে সংরক্ষণ করতে হয়। এটা দরকার হলে জানাবেন, আলাদাভাবে সেট করে দেব।
- `capacitor.config.json`-এ `appId: "com.poyshapos.app"` আছে — এটা আপনার অ্যাপের ইউনিক identifier। Play Store-এ পাবলিশ করার আগে এটা একবার ঠিক করে নিশ্চিত হয়ে নিন (পরে বদলানো যায় না)।

---

## ৩. PDF ও ক্যামেরা স্ক্যান — CDN-নির্ভরতা দূর করা হয়েছে

আগে `html2pdf.js` (ইনভয়েস/রিপোর্ট PDF বানানোর জন্য) এবং `html5-qrcode` (বারকোড স্ক্যানারের জন্য) সরাসরি ইন্টারনেট থেকে (CDN) লোড হতো। Android APK-তে (WebView) এই CDN লোডিং কখনো কখনো ব্যর্থ হতো — যার ফলে "html2canvas is not a function" এর মতো এরর দেখা দিত।

এখন এই দুটো লাইব্রেরিই npm প্যাকেজ হিসেবে `package.json`-এ যোগ করা আছে, এবং `npm install` চালালেই স্বয়ংক্রিয়ভাবে `www/vendor/` ফোল্ডারে কপি হয়ে যায় (`scripts/copy-vendor-libs.js` এই কাজ করে)। সব HTML ফাইল এখন CDN-এর বদলে এই লোকাল কপি থেকেই লাইব্রেরি লোড করে — তাই ইন্টারনেট সংযোগ ছাড়াই (অফলাইনেও) PDF তৈরি ও কাজ করবে, এবং APK-তেও নির্ভরযোগ্যভাবে চলবে।

**গুরুত্বপূর্ণ:** `www/vendor/` ফোল্ডারটা `.gitignore`-এ নেই, তাই এটা Git-এ কমিট থাকবে — কিন্তু যদি আপনি লাইব্রেরির নতুন ভার্সন চান, `package.json`-এ ভার্সন নম্বর বদলে `npm install` চালালেই নতুন ফাইল কপি হয়ে যাবে।

---

## ৪. অ্যাপ আইকন (App Icon) — এখন স্বয়ংক্রিয়

আপনার লোগো থেকে বানানো `assets/icon-only.png` (1024×1024) ফাইলটা রিপোতে আছে। GitHub Actions workflow-এ এখন একটা ধাপ আছে যেটা প্রতিবার বিল্ডের সময় স্বয়ংক্রিয়ভাবে এই ছবি থেকে Android-এর সব প্রয়োজনীয় সাইজের আইকন জেনারেট করে দেয় — আপনাকে কিছু করতে হবে না।

নিজের কম্পিউটারে ম্যানুয়ালি একবার চালিয়ে দেখতে চাইলে:
```
npm install @capacitor/assets --save-dev
npx capacitor-assets generate --android --iconBackgroundColor "#0B4A3E" --iconBackgroundColorDark "#0B4A3E"
npx cap sync android
```

লোগো বদলাতে চাইলে শুধু `assets/icon-only.png` ফাইলটা (কমপক্ষে 1024×1024 সাইজে) বদলে দিলেই পরের বিল্ডে নতুন আইকন প্রয়োগ হয়ে যাবে।

---

## ফোল্ডার স্ট্রাকচার (নতুন কী যোগ হয়েছে)

```
Poysha POS/
├── www/                          ← আপনার আসল ওয়েবসাইট (সব HTML/JS/CSS/ছবি) — Cloudflare এখান থেকেই সার্ভ করে
│   ├── index.html
│   ├── ... (বাকি সব পেজ, আগের মতোই)
│   ├── vendor/                   ← html2pdf.js ও html5-qrcode-এর লোকাল কপি (npm install-এর পর অটো-তৈরি)
│   ├── _headers                  ← Cloudflare-এর জন্য ক্যাশিং নিয়ম
│   └── assets/
├── .github/workflows/
│   └── build-apk.yml             ← GitHub Actions workflow (APK অটো-বিল্ড)
├── scripts/
│   └── copy-vendor-libs.js       ← লাইব্রেরি ফাইল www/vendor/-এ কপি করার স্ক্রিপ্ট
├── capacitor.config.json         ← Capacitor সেটিংস (অ্যাপের নাম, আইডি, রঙ)
├── package.json                  ← Node dependencies তালিকা
├── .gitignore
└── android/                      ← (আপনি নিজে একবার তৈরি করবেন, ধাপ ২ দেখুন)
```

**মূল কথা:** এখন থেকে আপনার সব কাজ `www/` ফোল্ডারের ভেতরের ফাইলগুলোতেই হবে (sell.html, product_list.html ইত্যাদি) — এটাই root ফোল্ডারের সমতুল্য, আগের মতোই এডিট করবেন। শুধু নতুন কিছু যোগ করলে `www/`-এর ভেতরেই রাখতে হবে যাতে ওয়েবসাইট ও অ্যাপ দুটোতেই দেখা যায়।

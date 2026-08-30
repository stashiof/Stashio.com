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
   - **Build command:** (খালি রাখুন — কিছু লেখার দরকার নেই)
   - **Build output directory:** `www`
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
   এটা একটা `android/` ফোল্ডার তৈরি করবে।
4. সেই `android/` ফোল্ডারটা commit ও push করুন:
   ```
   git add android package.json capacitor.config.json
   git commit -m "Add Android platform for Capacitor"
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

## ফোল্ডার স্ট্রাকচার (নতুন কী যোগ হয়েছে)

```
Poysha POS/
├── www/                          ← আপনার আসল ওয়েবসাইট (সব HTML/JS/CSS/ছবি) — Cloudflare এখান থেকেই সার্ভ করে
│   ├── index.html
│   ├── ... (বাকি সব পেজ, আগের মতোই)
│   ├── _headers                  ← Cloudflare-এর জন্য ক্যাশিং নিয়ম
│   └── assets/
├── .github/workflows/
│   └── build-apk.yml             ← GitHub Actions workflow (APK অটো-বিল্ড)
├── capacitor.config.json         ← Capacitor সেটিংস (অ্যাপের নাম, আইডি, রঙ)
├── package.json                  ← Node dependencies তালিকা
├── .gitignore
└── android/                      ← (আপনি নিজে একবার তৈরি করবেন, ধাপ ২ দেখুন)
```

**মূল কথা:** এখন থেকে আপনার সব কাজ `www/` ফোল্ডারের ভেতরের ফাইলগুলোতেই হবে (sell.html, product_list.html ইত্যাদি) — এটাই root ফোল্ডারের সমতুল্য, আগের মতোই এডিট করবেন। শুধু নতুন কিছু যোগ করলে `www/`-এর ভেতরেই রাখতে হবে যাতে ওয়েবসাইট ও অ্যাপ দুটোতেই দেখা যায়।

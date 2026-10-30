# CINEGUIDE

মুভি, সিরিজ ও অ্যানিমের রিভিউ সাইট (পিউর HTML/JS, কোনো বিল্ড স্টেপ নেই)।
ইউজারের Watchlist / Watched / Rating Firebase (Google লগইন + Firestore)-এ সেভ হয়।

## ফোল্ডার
```
index.html            পাবলিক সাইট
admin.html            অ্যাডমিন প্যানেল
admin-modules/        অ্যাডমিনের JS
core-data/
  store.js            ডেটা লেয়ার (KEYS-এর নাম বদলাবেন না)
  demo-data.js        ডেমো পোস্ট
  config.js           TMDB key (ঐচ্ছিক)
  firebase-config.js  Firebase কনফিগ বসানোর ফাইল
  firebase-sync.js    ক্লাউড সিঙ্ক কোড
```

## GitHub-এ আপলোড
1. github.com -> New repository (নাম যেমন `cineguide`) -> Create
2. "uploading an existing file" চাপুন, ZIP আনজিপ করে **ভেতরের সব ফাইল-ফোল্ডার** (`.github` সহ) টেনে ছেড়ে দিন -> Commit
   (`.github` ফোল্ডার লুকানো থাকলে ফাইল ম্যানেজারে "Show hidden files" চালু করুন)
3. Settings -> Pages -> Source: **GitHub Actions**
4. কয়েক মিনিট পর সাইট: `https://<username>.github.io/<repo>/`

## Firebase সেটআপ (একবারই)
1. console.firebase.google.com -> Add project
2. Authentication -> Get started -> **Google** চালু করুন।
   Settings -> Authorized domains -> `<username>.github.io` যোগ করুন
3. Firestore Database -> Create database -> Rules-এ এটা বসিয়ে Publish:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{db}/documents {
       match /users/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
4. Project settings -> Your apps -> Web (`</>`) -> config কপি করে `core-data/firebase-config.js`-এ বসান, তারপর Commit।

> Firebase config পাবলিক রাখা নিরাপদ; সুরক্ষা আসে ওপরের Rules থেকে।

## সতর্কতা
`admin.html` পাবলিক রিপোজিটরিতে থাকলে যে কেউ খুলতে পারবে, আর পোস্ট ব্রাউজারের localStorage-এ থাকে (সবার ডিভাইসে আলাদা)। সত্যিকারের অ্যাডমিন সুরক্ষা চাইলে আলাদা ব্যবস্থা লাগবে।

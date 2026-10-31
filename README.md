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

       // Community Parental Guide (শুধু লগইন করা ইউজার ভোট দিতে পারে)
       match /pg_votes/{postId} {
         allow read: if true;
         allow create, update: if request.auth != null
           && request.resource.data.keys().hasOnly(['total', 'fam_yes', 'fam_no', 'c_sex_0', 'c_sex_1', 'c_sex_2', 'c_sex_3', 'c_violence_0', 'c_violence_1', 'c_violence_2', 'c_violence_3', 'c_profanity_0', 'c_profanity_1', 'c_profanity_2', 'c_profanity_3', 'c_drugs_0', 'c_drugs_1', 'c_drugs_2', 'c_drugs_3']);
         match /votes/{uid} {
           allow read, delete: if request.auth != null && request.auth.uid == uid;
           allow create, update: if request.auth != null && request.auth.uid == uid
             && request.resource.data.keys().hasOnly(['uid','sex','violence','profanity','drugs','family','updatedAt'])
             && request.resource.data.get('sex', 0) in [0,1,2,3]
             && request.resource.data.get('violence', 0) in [0,1,2,3]
             && request.resource.data.get('profanity', 0) in [0,1,2,3]
             && request.resource.data.get('drugs', 0) in [0,1,2,3]
             && request.resource.data.get('family', 'yes') in ['yes','no'];
         }
       }

       // CG Rating (সবার রেটিংয়ের গড়)
       match /cg_ratings/{postId} {
         allow read: if true;
         allow create, update: if request.auth != null
           && request.resource.data.count is int && request.resource.data.sum is int
           && request.resource.data.count >= 0
           && request.resource.data.sum >= 0
           && request.resource.data.sum <= request.resource.data.count * 10;
         match /votes/{uid} {
           allow read, delete: if request.auth != null && request.auth.uid == uid;
           allow create, update: if request.auth != null && request.auth.uid == uid
             && request.resource.data.value is int
             && request.resource.data.value >= 1 && request.resource.data.value <= 10;
         }
       }
     }
   }
   ```
4. Project settings -> Your apps -> Web (`</>`) -> config কপি করে `core-data/firebase-config.js`-এ বসান, তারপর Commit।

> Firebase config পাবলিক রাখা নিরাপদ; সুরক্ষা আসে ওপরের Rules থেকে।

## সতর্কতা
`admin.html` পাবলিক রিপোজিটরিতে থাকলে যে কেউ খুলতে পারবে, আর পোস্ট ব্রাউজারের localStorage-এ থাকে (সবার ডিভাইসে আলাদা)। সত্যিকারের অ্যাডমিন সুরক্ষা চাইলে আলাদা ব্যবস্থা লাগবে।

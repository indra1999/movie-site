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
   ➜ রিপোর `firestore.rules` ফাইলটি খুলে **পুরোটা** কপি করে বসান, `indromondol2@gmail.com` জায়গায় আপনার (ছোট হাতের) ইমেইল দিন, তারপর Publish। Rules Playground-এ একবার টেস্ট করে নিন।
4. Project settings -> Your apps -> Web (`</>`) -> config কপি করে `core-data/firebase-config.js`-এ বসান, তারপর Commit।

> Firebase config পাবলিক রাখা নিরাপদ; সুরক্ষা আসে ওপরের Rules থেকে।

## Cloud-only admin (nothing is stored in the browser)

All content you manage (posts, upcoming releases, categories, ads, footer texts, site features, deleted list)
is saved **only in Firebase Firestore**. The TMDB API key and custom domain are saved in a separate document
(`cg_admin/settings`) that only the admin can read. The admin panel keeps the data in memory while it is open and
saves every change to the cloud automatically (about 1 second later). The public site reads the same cloud data.

### One-time setup
1. Firebase Console -> **Authentication -> Sign-in method**: enable **Email/Password** (and **Google** if you want it).
2. **Authentication -> Users -> Add user**: create your admin account (your e-mail + a strong password).
   The first time you sign in with a password account, the panel sends a **verification e-mail**. Open the link, then sign in again.
   (Signing in with Google needs no verification.)
3. **Firestore -> Rules**: paste the rules above, replace `indromondol2@gmail.com` with your admin e-mail, **Publish**.
4. Open `admin.html`, sign in with that e-mail. Only the account named in the rules can save anything; any other account is refused.

### Good to know
- If two devices/tabs edit at the same time, the second save is refused (revision check) and you choose to overwrite or reload.
- Emptying every post asks for confirmation first.
- **Settings -> Download backup file** exports `site-data.json` (no API keys inside) if you want an extra copy.
- If this browser still holds posts from the old local version, a banner offers a one-time **upload to cloud and remove local copy**.
- Still stored per device (not in the cloud yet): visitor comments, view counters, and the watchlist of visitors who are not signed in.
- `admin.html` is a public page. The real protection is the Firestore rules above, not the page itself.

## Security checklist (one time)
- **API key সীমাবদ্ধ করুন:** Google Cloud Console -> APIs & Services -> Credentials -> Browser key -> *HTTP referrers*: `https://<username>.github.io/*`
- **App Check (recommended):** Firebase -> App Check -> reCAPTCHA v3 চালু করুন, তারপর Firestore-এ enforce করুন (বট ভোট ঠেকায়)।
- `core-data/config.js`-এ TMDB key বসাবেন না (ফাইলটি পাবলিক); অ্যাডমিন প্যানেল থেকে বসান।
- `robots.txt`-এ নিজের সাইটের ঠিকানা বসান; অ্যাডমিন Dashboard -> *Generate sitemap.xml* করে রুটে আপলোড দিন এবং Google Search Console-এ জমা দিন।
- Firestore: posts এখন ৬০০ KB-এর chunk-এ, upcoming আলাদা `upcoming_N` ডকুমেন্টে সেভ হয়। কোনো পোস্ট ৯০০ KB-এর বড় হলে সেভ থেমে কারণ দেখায় (base64 ছবির বদলে URL ব্যবহার করুন)।
- ভিজিটরের ব্রাউজারে শেষ সফল সাইট-ডেটা ক্যাশ থাকে; revision না বদলালে শুধু ১টি Firestore read হয়।

## Comments & demo posts
- Comments are now shared (Firestore `cg_comments`): visitors sign in with Google to post; the author or the admin can delete (admin tab *Users & Comments*). Add the new `cg_comments` rules from `firestore.rules`.
- Demo posts show only until you publish your own content. After the first save they never come back. The Dashboard has a *Remove demo posts* button.

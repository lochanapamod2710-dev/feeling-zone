# Feeling Zone — Clean / Error-Fixed Build

This project is a Next.js 14 + Firebase Realtime Database/Auth site for the Feeling Zone WhatsApp channel.

## Included

- Responsive mobile + desktop UI
- Public feelings/posts wall
- Anonymous Firebase sign-in for secure post creation and likes
- Admin email/password login
- Owner-only post editing
- Admin post editing/deleting
- Likes, favorites, search and sorting
- Copy, share and `.txt` download for posts
- Draft auto-save in the browser
- Random post and admin statistics
- Private per-user support chat
- Optional Netlify media downloader
- WhatsApp channel link

## 1. Firebase setup

Create a Firebase project and enable:

1. Realtime Database
2. Authentication → Sign-in method → Anonymous
3. Authentication → Sign-in method → Email/Password

Add your Firebase web-app values to Netlify environment variables (or `.env.local` while testing locally):

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## 2. Admin security

The Realtime Database rules use an `admins` map. After creating your admin user in Firebase Authentication, copy that user's UID and create this value in Realtime Database:

`admins/YOUR_ADMIN_UID = true`

Do not make the `admins` node publicly writable.

## 3. Database rules

Import/copy `database.rules.json` into Firebase Realtime Database → Rules.

These rules require Firebase authentication for writing. Anonymous users can create and like posts; users can edit their own posts; admin UIDs can edit/delete posts.

## 4. Netlify

Build command:

`npm run build`

For a Next.js project, keep the Netlify Next.js plugin enabled. The included `netlify.toml` configures it.

Required Firebase environment variables are listed above.

Optional downloader variable:

`RAPIDAPI_KEY`

The downloader is disabled cleanly when this optional key is not configured.

## 5. Local test

Use Node.js 18.17+ (Node 20/22 is fine):

`npm install`

`npm run build`

`npm start`

## Important

Never upload `.env.local`, API keys, Firebase service-account JSON files, or other private credentials to GitHub.

# ChronoTrack ⏱

ChronoTrack is a modern React + Firebase application designed to manage and track work sessions, progress, and schedules in a clean and intuitive interface.

## Features

- 📋 Session management
- ⏱ Real-time chronometer
- 📅 Calendar view
- 📈 Progress tracking
- 🔥 Firebase integration
- ⚡ Built with React + Vite
- 🎨 Modern responsive UI

---

# Tech Stack

- React
- Vite
- Firebase
- JavaScript (ES6+)
- CSS3

---

# Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/chronotrack-react.git
```

Go to the project folder:

```bash
cd chronotrack-react
```

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

```bash
http://localhost:5173
```

---

# Build for Production

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

---

# Firebase Setup

Create a Firebase project and add your Firebase configuration inside:

```bash
src/firebase.js
```

Example:

```js
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

export const app = initializeApp(firebaseConfig);
```

---

# Project Structure

```bash
src/
 ├── components/
 ├── hooks/
 ├── views/
 ├── App.jsx
 ├── main.jsx
 └── App.css
```

---

# Deployment

## Vercel

```bash
npm install -g vercel
vercel
```

## Firebase Hosting

```bash
firebase login
firebase init hosting
firebase deploy
```

---

# Author

Aboudé Kharsa

---

# License

MIT

# 🏆 JKSSB Prep Master (Installable PWA)
### 12,000+ Previous Year Questions (PYQs) & Dual-Method Maths Shortcuts

**JKSSB Prep Master** is a high-performance, offline-capable Progressive Web App (PWA) specifically engineered for students preparing for Jammu & Kashmir Services Selection Board (JKSSB) examinations.

---

## 🎯 Target Posts & Syllabus Included

1. **JKP Sub Inspector (Executive / Armed Police)**
   - *Syllabus*: GK with Special Reference to J&K UT (Reorganization Act 2019, History, Geography, Hydroelectric projects), Quantitative Aptitude, Logical Reasoning, Indian Constitution & Polity, General Science, English, Computers.
2. **JKP Constable (Executive, Armed, SDRF, Telecom)**
   - *Syllabus*: General Awareness of J&K, Elementary Arithmetic & Speed Shortcuts, Analytical Reasoning, Daily Science.
3. **Stock Assistant / Veterinary Pharmacist (Animal & Sheep Husbandry)**
   - *Syllabus*: Basic Mathematics, Basic Reasoning, Basic English, General Awareness & Science.
4. **Finance Accounts Assistant (FAA)**
   - *Syllabus*: Accountancy & Book Keeping, Statistics, Mathematics, J&K GK, Economics, Science, Computers, English.
5. **Panchayat Secretary / Village Level Worker (VLW)**
   - *Syllabus*: General Awareness (J&K UT Focus & Panchayati Raj Act 1989), English, Reasoning, Quantitative Aptitude, Computers.
6. **Patwari / Revenue Executive**
   - *Syllabus*: Revenue Terminology (Jamabandi, Khasra, Girdawari), Land Laws, Constitution, Mental Ability, English, Computers.
7. **Assistant Compiler (Finance Department / State Taxes / Treasuries)**
   - *Syllabus*: 8 distinct 15-mark sections: General English, Mathematics & Mensuration (Solids, Frustum, Heights & Distances with speed tricks), History (Revolt of 1857, National Movement, League of Nations), Civics (Constitution & UNO), Geography (Atmosphere, Pressure belts, Crops), General Science, Computers, and J&K Special GK.

---

## ⚡ Standout Feature: Dual-Method Solution for Mathematics

Every single quantitative aptitude and arithmetic question contains two distinct, pedagogical solutions revealed immediately after answering:

1. **⚡ Shortcut / Speed Trick Method**:
   - Designed for the high-pressure 120-minute examination environment.
   - Leverages **Multiplier Ratio techniques**, **LCM / Unit-Efficiency methods**, **Divisibility rules (e.g. 11-rule for $\pi$-based mensuration)**, **Successive percentage formulas**, and **Option Elimination** to solve questions in 10–20 seconds without lengthy algebra.
2. **📝 Traditional Step-by-Step Method**:
   - Step-by-step textbook derivation assuming variables ($x, y$).
   - Formulates the foundational equations and applies classical mathematical definitions so students build deep conceptual understanding.

---

## 📱 How Students Can Install the App (PWA)

### On Android (Chrome / Brave / Edge):
1. Open the web app link in Chrome.
2. Tap the **"Install App"** button at the top, or tap the three dots (**⋮**) in the top right corner.
3. Select **"Install app"** or **"Add to Home Screen"**.
4. The app icon will appear directly on your phone's home screen and works completely **offline**!

### On iPhone / iPad (Safari):
1. Open the web app link in Safari.
2. Tap the **Share** button (the square with an arrow pointing upward at the bottom).
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **"Add"** in the top-right corner.

### On PC / Laptop (Windows, Mac, Linux):
1. Open in Google Chrome, Microsoft Edge, or Brave.
2. Click the install icon in the address bar (or click the **"Install App"** button in the header).
3. The app opens as a standalone desktop window with no browser URL bar or distractions.

---

## 🚀 Running the App Locally

To start the local web server:

```powershell
# Navigate to the project directory
cd "C:\Users\user\.gemini\antigravity\scratch\jkssb-prep-pwa"

# Start the Python PWA server
python scripts/serve.py
```

Then open your browser and navigate to:
👉 **`http://localhost:8080`**

---

## 💾 Offline Question Storage & Scaling to 20,000+ MCQs

- **IndexedDB Architecture (`js/db.js`)**:
  - The app uses client-side IndexedDB (`JKSSB_Prep_DB_v1`) to store tens of thousands of questions directly in the browser's persistent storage without slowing down the device.
- **Starter Pack (1,200 High-Yield Questions)**:
  - Automatically seeded on first launch.
- **Full 12,000+ Question Bank**:
  - Under the **"Offline Packs"** tab, tap **"Download Complete 12,000+ Bank"**. The app will stream all 6 modular pack chunks into your local IndexedDB with a progress bar.
- **Custom Question Importer**:
  - Teachers, institutes, or students can upload `.json` or `.csv` files containing additional thousands of questions anytime.
- **Backup & Export**:
  - Export your saved questions, weak area bookmarks, and test history with a single click.

---

## 📊 Exam Simulation Features

- **Standard JKSSB Test Engine (`js/examEngine.js`)**:
  - 120 Questions / 120 Minutes countdown timer (with 10-minute warning alert).
  - Official marking scheme: **+1.0 Mark** for correct, **-0.25 Mark** negative deduction for incorrect answers.
  - Interactive **Question Palette** (Answered, Not Answered, Marked for Review, Not Visited).
  - Comprehensive Post-Test Scorecard with subject-wise marks breakdown and cut-off comparison.

# 🌸 ARLAK: Holographic Virtual Anime Companion & Jarvis PC Assistant 🌸

<div align="center">
  <img src="./build/icon.png" width="120" height="120" alt="ARLAK Logo" />
  <p><em>"An advanced, cute, and fiercely loyal AI companion right on your desktop."</em></p>
</div>

---

## ✨ Overview
**ARLAK** is a next-generation virtual anime heroine companion and autonomous desktop automation assistant. Power-packed by **Google Gemini 3.1 Flash (Live API)**, she features voice, vision, text chat, real-time screen sharing, and Jarvis-class PC control!

Whether you want to have a cozy voice call, type text messages when your mic is off, share your screen to debug code together, or command her to open apps and browse the web—Arlak is ready to help! 💖

---

## 🚀 Key Features

* 🎙️ **Holographic Voice Link**: Ultra-low latency voice connection with natural speaking, listening, and interruption detection.
* 💬 **Cozy Text Chat**: Fully-integrated chat overlay panel for typing when you don't have access to a microphone.
* 📜 **Real-time Subtitles**: Dynamic visual caption projections displaying Arlak's voice translations on-screen.
* 🖥️ **Multimodal Screen Vision**: Real-time desktop sharing allows Arlak to read code, detect terminal errors, review design mockups, and talk about what's on your screen.
* ⚙️ **Jarvis-Class PC Control**:
  * 📱 **App Launcher**: Open/Close Notepad, Chrome, VS Code, Calculator, and more.
  * 🌐 **Web Explorer**: Automate search inputs on YouTube, Google, GitHub, or any website.
  * 🔉 **System Controls**: Control system volume, toggle mute, and change screen brightness.
  * 💻 **Power Operations**: Shutdown, restart, lock, or sleep your PC (with safety confirmation triggers).
  * 📋 **Clipboard & Files**: Read/write clipboard data, create code files, organize folders, and run Python scripts.

---

## 🛠️ Tech Stack

* **Frontend**: React 19, Vite, Tailwind CSS, Motion (Framer Motion)
* **Backend**: Node.js, Express, WebSocket Server
* **Desktop Agent**: Python (FastAPI/Uvicorn), Playwright, PyAutoGUI, WMI
* **AI Engine**: `@google/genai` (Gemini Live API WebSocket Link)

---

## 📦 How to Run

### Option 1: Standalone Build (Windows)
Go to the `release/` folder and run:
* **`ARLAK-Portable-1.0.0.exe`**: Runs instantly without installation!
* **`ARLAK-Setup-1.0.0.exe`**: Performs a clean system installation.

### Option 2: Development Mode
1. Install Node dependencies:
   ```bash
   npm install
   ```
2. Setup your Gemini API Key in the settings panel of the app or in a `.env` file.
3. Start the server and client:
   ```bash
   start-arlak.bat
   ```

---

## 🌸 Core Personality
Arlak acts as a warm, polite, high-pitched anime companion (age 18-22). She speaks sweet words, has a gentle and slightly shy demeanor, and loves helping you with coding and daily tasks. 💕

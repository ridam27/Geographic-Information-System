# 🔧 Engineering Drawing Digitizer

A proof-of-concept web application that converts engineering drawings (JPG/PNG) into digital SVG representations by detecting shapes (lines, rectangles, circles) and text using computer vision.

**Goal:** Visually recreate uploaded drawings as digital SVGs — not CAD-perfect accuracy, but a faithful digital representation.

---

## 📁 Project Structure

```
drawing-digitizer/
├── backend/          # FastAPI + OpenCV + EasyOCR
│   ├── main.py
│   ├── requirements.txt
│   └── .gitignore
├── frontend/         # React + Vite
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md         # This file
```

---

## 🛠️ Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Python** | 3.9+ | Backend runtime |
| **Node.js** | 18+ | Frontend runtime |
| **npm** | 9+ | Package manager |
| **VS Code** | Latest | Recommended IDE |

> **Note:** EasyOCR downloads ~100MB of ML models on first run. Ensure you have a stable internet connection for the first backend startup.

---

## 🚀 Quick Start Guide

### Step 1: Clone / Extract the Project

```bash
cd drawing-digitizer
```

---

### Step 2: Backend Setup (Terminal 1)

```bash
# Navigate to backend
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
python main.py

uvicorn main:app --reload
```

The backend will start at **http://localhost:8000**

Verify it's running:
```bash
curl http://localhost:8000/api/health
```

---

### Step 3: Frontend Setup (Terminal 2)

Open a **new terminal** (keep the backend running):

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start the React dev server
npm run dev
```

The frontend will start at **http://localhost:5173**

---

### Step 4: Use the App

1. Open your browser to **http://localhost:5173**
2. Upload a JPG or PNG engineering drawing
3. Click **"Digitize Drawing"**
4. View the detected shapes, text, and generated SVG
5. Download the SVG file

---

## 📦 VS Code Setup (Recommended)

### Extensions to Install

1. **ES7+ React/Redux/React-Native snippets** — React snippets
2. **Prettier - Code: formatter** — Auto-formatting
3. **Python** — Microsoft official extension
4. **Pylance** — Python language server
5. **Auto Rename Tag** — HTML/JSX tag editing

### VS Code: Settings

Create `.vscode/settings.json` in the project root:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "python.defaultInterpreterPath": "./backend/venv/bin/python",
  "python.analysis.typeCheckingMode": "basic"
}
```

### VS Code: Launch Configuration

Create `.vscode/launch.json` for debugging:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Backend: FastAPI",
      "type": "debugpy",
      "request": "launch",
      "module": "uvicorn",
      "args": ["main:app", "--reload", "--port", "8000"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal"
    },
    {
      "name": "Frontend: Chrome",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/frontend/src"
    }
  ]
}
```

---

## 🔍 How It Works

### Detection Pipeline

1. **Image Upload** → FastAPI receives JPG/PNG
2. **Preprocessing** → Convert to grayscale, edge detection
3. **Line Detection** → Hough Line Transform
4. **Rectangle Detection** → Contour approximation (4 vertices)
5. **Circle Detection** → Hough Circle Transform
6. **Text Extraction** → EasyOCR with confidence filtering
7. **SVG Generation** → svgwrite library constructs the output
8. **Response** → SVG string + metadata sent to React frontend

### Color Coding in SVG

| Shape | Color | Stroke |
|-------|-------|--------|
| Lines | Dark Blue | `#2c3e50` |
| Rectangles | Blue | `#3498db` |
| Circles | Red | `#e74c3c` |
| Text | Dark | `#2c3e50` |

---

## ⚙️ API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info |
| `/api/health` | GET | Health check + dependency status |
| `/api/digitize` | POST | Upload image → return SVG + detections |

### Example API Call (cURL)

```bash
curl -X POST "http://localhost:8000/api/digitize" \
  -H "accept: application/json" \
  -F "file=@your_drawing.jpg"
```

---

## 🐛 Troubleshooting

### EasyOCR Model Download Fails
```bash
# Manually download models to default cache
# Or set custom path:
export EASYOCR_MODULE_PATH=/path/to/models
```

### OpenCV Installation Issues (Windows)
```bash
# If pip install fails, try:
pip install opencv-python-headless
```

### Port Already in Use
```bash
# Backend: change port in main.py
uvicorn.run(app, host="0.0.0.0", port=8001)

# Frontend: change port in vite.config.js
server: { port: 5174 }
```

### CORS Errors
Ensure the backend is running and the frontend proxy in `vite.config.js` matches your backend URL.

---

## 📝 Notes & Limitations

- **Accuracy:** This is a PoC, not a production CAD tool. Detection depends on drawing quality.
- **Text:** EasyOCR works best on clear, high-contrast text. Handwritten text may not be recognized.
- **Shapes:** Very small or heavily anti-aliased shapes may be missed.
- **Performance:** First OCR run downloads ~100MB models. Subsequent runs are faster.
- **File Size:** Max upload size is 20MB.

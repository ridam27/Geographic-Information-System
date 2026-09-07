import React, { useState, useCallback } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_DRAWING_API_BASE || '/api/drawing'

function App() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [svgResult, setSvgResult] = useState(null)
  const [detections, setDetections] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [activeTab, setActiveTab] = useState('upload')
  const [darkMode, setDarkMode] = useState(false)
  const [svgZoom, setSvgZoom] = useState(100)

  const handleFileChange = (e) => {
    const selected = e.target.files[0]
    if (selected) processFile(selected)
  }

  const processFile = (selected) => {
    if (!selected.type.match(/image\/(jpeg|jpg|png)/)) {
      setError('Only JPG and PNG files are supported')
      return
    }
    setFile(selected)
    setError(null)
    setSvgResult(null)
    setDetections(null)
    setActiveTab('upload')

    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(selected)
  }

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleDigitize = async () => {
    if (!file) return
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await axios.post(`${API_BASE}/digitize`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000
      })

      setSvgResult(response.data.svg)
      setDetections({
        shapes: response.data.shapes.length,
        text: response.data.text_blocks.length,
        width: response.data.original_width,
        height: response.data.original_height,
        shapeDetails: response.data.shapes,
        textDetails: response.data.text_blocks
      })
      setActiveTab('result')
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Unknown error'
      setError(`Digitization failed: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  const downloadSvg = () => {
    if (!svgResult) return
    const blob = new Blob([svgResult], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `digitized_${file.name.replace(/\.[^/.]+$/, '')}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className={`app-root${darkMode ? ' dark' : ''}`}>
      {/* Top Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="brand-icon">D</div>
          <div className="brand-text">
            <span className="brand-name">DrawDigitize</span>
            <span className="brand-sub">Engineering Drawing Processor</span>
          </div>
        </div>
        <div className="navbar-right">
          <div className={`status-chip ${loading ? 'status-processing' : file ? 'status-ready' : 'status-idle'}`}>
            <span className="status-dot"></span>
            {loading ? 'Processing' : file ? 'File Loaded' : 'Awaiting Input'}
          </div>
          <button className="theme-toggle" onClick={() => setDarkMode(d => !d)} title={darkMode ? 'Switch to Light' : 'Switch to Dark'}>
            {darkMode ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <p className="page-eyebrow">Active Session</p>
            <h1 className="page-title">Drawing Digitizer</h1>
            <p className="page-desc">Convert JPG/PNG engineering drawings into structured SVG with shape and text detection.</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="content-grid">
        {/* Left Panel */}
        <div className="left-panel">
          <div className="panel-card">
            <div className="panel-card-header">Processing Status</div>
            <div className="status-block">
              <div className="status-row">
                <span className="status-label">Engine</span>
                <span className="status-val online">OpenCV + EasyOCR</span>
              </div>
              <div className="status-row">
                <span className="status-label">File</span>
                <span className="status-val">{file ? file.name : '—'}</span>
              </div>
              <div className="status-row">
                <span className="status-label">Size</span>
                <span className="status-val">{file ? `${(file.size / 1024).toFixed(1)} KB` : '—'}</span>
              </div>
              <div className="status-row">
                <span className="status-label">Format</span>
                <span className="status-val">{file ? file.type.split('/')[1].toUpperCase() : '—'}</span>
              </div>
            </div>
          </div>

          {detections && (
            <div className="panel-card">
              <div className="panel-card-header">Detection Results</div>
              <div className="metric-grid">
                <div className="metric-item">
                  <span className="metric-num">{detections.shapes}</span>
                  <span className="metric-label">Shapes</span>
                </div>
                <div className="metric-item">
                  <span className="metric-num">{detections.text}</span>
                  <span className="metric-label">Text Blocks</span>
                </div>
              </div>
              <div className="status-row" style={{marginTop: '12px'}}>
                <span className="status-label">Dimensions</span>
                <span className="status-val">{detections.width} × {detections.height} px</span>
              </div>
            </div>
          )}

          <div className="panel-card">
            <div className="panel-card-header">Actions</div>
            <div className="action-stack">
              <label htmlFor="file-input-side" className="action-btn action-btn-outline">
                Select File
              </label>
              <input
                type="file"
                id="file-input-side"
                accept=".jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="file-input-hidden"
              />
              <button
                onClick={handleDigitize}
                disabled={!file || loading}
                className="action-btn action-btn-primary"
              >
                {loading ? 'Processing...' : 'Run Digitization'}
              </button>
              {svgResult && (
                <button onClick={downloadSvg} className="action-btn action-btn-outline">
                  Download SVG
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="right-panel">
          {error && (
            <div className="alert-error">
              <span className="alert-icon">!</span>
              {error}
            </div>
          )}

          {/* Tabs */}
          <div className="tab-bar">
            <button
              className={`tab-btn ${activeTab === 'upload' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              Upload
            </button>
            <button
              className={`tab-btn ${activeTab === 'result' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('result')}
              disabled={!svgResult}
            >
              SVG Output
            </button>
            <button
              className={`tab-btn ${activeTab === 'details' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('details')}
              disabled={!detections}
            >
              Detection Log
            </button>
          </div>

          <div className="tab-content">
            {/* Upload Tab */}
            {activeTab === 'upload' && (
              <div>
                <div
                  className={`drop-zone ${dragActive ? 'drop-zone-active' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    id="file-input"
                    accept=".jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="file-input-hidden"
                  />
                  <label htmlFor="file-input" className="drop-zone-label">
                    <div className="drop-icon">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                    </div>
                    <p className="drop-main">Click to upload or drag & drop</p>
                    <p className="drop-hint">Supported: JPG, PNG — Max 20 MB</p>
                  </label>
                </div>

                {preview && (
                  <div className="preview-box">
                    <div className="preview-header">
                      <span className="preview-title">Original Drawing</span>
                      <span className="preview-filename">{file?.name}</span>
                    </div>
                    <img src={preview} alt="Preview" className="preview-img" />
                  </div>
                )}
              </div>
            )}

            {/* SVG Output Tab */}
            {activeTab === 'result' && svgResult && !loading && (
              <div>
                <div className="svg-toolbar">
                  <button className="svg-zoom-btn" onClick={() => setSvgZoom(z => Math.max(30, z - 10))}>−</button>
                  <span className="svg-zoom-label">{svgZoom}%</span>
                  <button className="svg-zoom-btn" onClick={() => setSvgZoom(z => Math.min(300, z + 10))}>+</button>
                  <button className="svg-zoom-reset" onClick={() => setSvgZoom(100)}>Reset</button>
                </div>
                <div className="svg-output-box">
                  <div
                    style={{ transform: `scale(${svgZoom / 100})`, transformOrigin: 'top left', display: 'inline-block', minWidth: '100%' }}
                    dangerouslySetInnerHTML={{ __html: svgResult }}
                  />
                </div>
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div className="loading-box">
                <div className="loader-ring"></div>
                <p className="loading-title">Running detection pipeline</p>
                <p className="loading-sub">EasyOCR model loads on first run — this may take up to 2 minutes.</p>
              </div>
            )}

            {/* Detection Log Tab */}
            {activeTab === 'details' && detections && (
              <div className="details-box">
                <div className="details-section">
                  <div className="details-section-title">Shapes Detected</div>
                  {detections.shapeDetails.length === 0 ? (
                    <p className="empty-state">No shapes detected in this drawing.</p>
                  ) : (
                    detections.shapeDetails.map((s, i) => (
                      <div key={i} className="log-row">
                        <span className="log-type">{s.type}</span>
                        <span className="log-data">
                          {s.type === 'line' && `(${s.x1}, ${s.y1}) → (${s.x2}, ${s.y2})`}
                          {s.type === 'rect' && `x: ${s.x}  y: ${s.y}  w: ${s.width}  h: ${s.height}`}
                          {s.type === 'circle' && `cx: ${s.cx}  cy: ${s.cy}  r: ${s.r}`}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="details-section">
                  <div className="details-section-title">Text Blocks Detected</div>
                  {detections.textDetails.length === 0 ? (
                    <p className="empty-state">No text detected. EasyOCR may still be initializing.</p>
                  ) : (
                    detections.textDetails.map((t, i) => (
                      <div key={i} className="log-row">
                        <span className="log-text">"{t.text}"</span>
                        <span className="log-meta">at ({t.x}, {t.y}) · confidence: {(t.confidence * 100).toFixed(0)}%</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="app-footer">
        <span>DrawDigitize — Built with React · FastAPI · OpenCV · EasyOCR</span>
      </footer>
    </div>
  )
}

export default App

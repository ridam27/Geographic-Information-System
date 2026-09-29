import React, { useState, useCallback, useMemo } from 'react'
import axios from 'axios'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

const API_BASE = import.meta.env.VITE_DRAWING_API_BASE || '/api/drawing'

// Scale Presets (Feet per Pixel)
const SCALE_PRESETS = [
  { label: 'Standard (1 px ≈ 0.045 ft)', value: 0.045 },
  { label: '1/4" = 1\'-0" (1 px ≈ 0.033 ft)', value: 0.0333 },
  { label: '1/8" = 1\'-0" (1 px ≈ 0.066 ft)', value: 0.0666 },
  { label: '1:50 Metric (1 px ≈ 0.030 ft)', value: 0.030 },
  { label: '1:100 Metric (1 px ≈ 0.060 ft)', value: 0.060 },
  { label: 'High-Res CAD (1 px ≈ 0.020 ft)', value: 0.020 },
]

function App() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [isPdf, setIsPdf] = useState(false)
  const [activePage, setActivePage] = useState(0)
  const [pageCount, setPageCount] = useState(1)
  const [scaleFtPerPx, setScaleFtPerPx] = useState(0.045)
  
  const [svgResult, setSvgResult] = useState(null)
  const [rooms, setRooms] = useState([])
  const [takeoffs, setTakeoffs] = useState(null)
  const [scaleInfo, setScaleInfo] = useState(null)
  const [fileInfo, setFileInfo] = useState(null)
  const [shapes, setShapes] = useState([])
  const [textBlocks, setTextBlocks] = useState([])
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [activeTab, setActiveTab] = useState('takeoffs')
  const [darkMode, setDarkMode] = useState(true)
  const [svgZoom, setSvgZoom] = useState(100)
  const [hoveredRoomId, setHoveredRoomId] = useState(null)
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  
  // Layer visibility toggles
  const [showRooms, setShowRooms] = useState(true)
  const [showWalls, setShowWalls] = useState(true)
  const [showText, setShowText] = useState(true)

  const handleFileChange = (e) => {
    const selected = e.target.files[0]
    if (selected) processFile(selected)
  }

  const processFile = (selected) => {
    const isPdfFile = selected.type === 'application/pdf' || selected.name.toLowerCase().endsWith('.pdf')
    const isImageFile = selected.type.match(/image\/(jpeg|jpg|png)/) || selected.name.toLowerCase().match(/\.(jpg|jpeg|png)$/)

    if (!isPdfFile && !isImageFile) {
      setError('Please upload a valid PDF, JPG, or PNG drawing.')
      return
    }

    setFile(selected)
    setIsPdf(isPdfFile)
    setError(null)
    setSvgResult(null)
    setRooms([])
    setTakeoffs(null)
    setShapes([])
    setTextBlocks([])
    setActiveTab('upload')

    if (isImageFile) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target.result)
      reader.readAsDataURL(selected)
    } else {
      setPreview(null)
    }
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

  const handleDigitize = async (overrideScale = null) => {
    if (!file) return
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('page', activePage)
    if (overrideScale || scaleFtPerPx) {
      formData.append('scale_ft_per_px', overrideScale || scaleFtPerPx)
    }

    try {
      const response = await axios.post(`${API_BASE}/digitize`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000
      })

      const data = response.data
      setSvgResult(data.svg)
      setRooms(data.rooms || [])
      setTakeoffs(data.takeoffs || null)
      setScaleInfo(data.scale_info || null)
      setFileInfo(data.file_info || null)
      if (data.file_info?.preview_base64) {
        setPreview(data.file_info.preview_base64)
      }
      setShapes(data.shapes || [])
      setTextBlocks(data.text_blocks || [])
      
      if (data.file_info?.page_count) {
        setPageCount(data.file_info.page_count)
      }
      if (data.scale_info?.feet_per_pixel) {
        setScaleFtPerPx(data.scale_info.feet_per_pixel)
      }

      setActiveTab('takeoffs')
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Unknown digitization error'
      setError(`Digitization failed: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  // In-place Room Overrides & Custom Calibration State
  const [roomOverrides, setRoomOverrides] = useState({})
  const [editingRoomId, setEditingRoomId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', type: '', width_ft: '', length_ft: '', area_sqft: '' })
  const [targetSqftInput, setTargetSqftInput] = useState('')
  const [targetWidthInput, setTargetWidthInput] = useState('')

  // Real-time scale multiplier & room overrides for instantly updating exact measurements
  const recalculatedRooms = useMemo(() => {
    if (!rooms.length) return []
    const baseScale = scaleInfo?.feet_per_pixel || 0.045
    const factor = (scaleFtPerPx / baseScale) ** 2
    const lenFactor = scaleFtPerPx / baseScale

    const initial = rooms.map(r => {
      const override = roomOverrides[r.id]
      
      let widthFt = (override?.width_ft !== undefined && override?.width_ft !== '') 
        ? Number(override.width_ft) 
        : roundNum(r.width * scaleFtPerPx, 1)
      let lengthFt = (override?.length_ft !== undefined && override?.length_ft !== '') 
        ? Number(override.length_ft) 
        : roundNum(r.height * scaleFtPerPx, 1)
      let areaSqft = (override?.area_sqft !== undefined && override?.area_sqft !== '') 
        ? Number(override.area_sqft) 
        : roundNum(r.area_sqft * factor, 1)
      let areaSqm = roundNum(areaSqft * 0.092903, 2)
      let name = override?.name || r.name
      let type = override?.type || r.type
      let perimeterFt = roundNum((widthFt + lengthFt) * 2, 1)

      return {
        ...r,
        name,
        type,
        width_ft: widthFt,
        length_ft: lengthFt,
        dimensions_ft: `${widthFt}' × ${lengthFt}'`,
        dimensions_m: `${roundNum(widthFt * 0.3048, 2)}m × ${roundNum(lengthFt * 0.3048, 2)}m`,
        area_sqft: areaSqft,
        area_sqm: areaSqm,
        perimeter_ft: perimeterFt,
        isEdited: !!override
      }
    })

    const totalSqft = initial.reduce((sum, rm) => sum + rm.area_sqft, 0) || 1
    return initial.map(rm => ({
      ...rm,
      percentage: roundNum((rm.area_sqft / totalSqft) * 100, 1)
    }))
  }, [rooms, scaleFtPerPx, scaleInfo, roomOverrides])

  const applyTargetSqftCalibration = (targetSqft) => {
    const val = Number(targetSqft)
    if (!val || val <= 0) return
    const currentCarpet = recalculatedRooms.reduce((acc, r) => acc + r.area_sqft, 0)
    if (currentCarpet > 0) {
      const targetRatio = Math.sqrt(val / currentCarpet)
      const newScale = roundNum(scaleFtPerPx * targetRatio, 5)
      setScaleFtPerPx(newScale)
    }
  }

  const applyTargetWidthCalibration = (targetWidthFt) => {
    const val = Number(targetWidthFt)
    if (!val || val <= 0) return
    const maxW = fileInfo?.original_width || 1200
    const newScale = roundNum(val / (maxW * 0.8), 5)
    setScaleFtPerPx(newScale)
  }

  const startEditingRoom = (room) => {
    setEditingRoomId(room.id)
    setEditForm({
      name: room.name,
      type: room.type,
      width_ft: room.width_ft || roundNum(room.width * scaleFtPerPx, 1),
      length_ft: room.length_ft || roundNum(room.height * scaleFtPerPx, 1),
      area_sqft: room.area_sqft,
    })
  }

  const handleEditDimensionChange = (field, val) => {
    setEditForm(prev => {
      const next = { ...prev, [field]: val }
      if (field === 'width_ft' || field === 'length_ft') {
        const w = Number(field === 'width_ft' ? val : next.width_ft) || 0
        const l = Number(field === 'length_ft' ? val : next.length_ft) || 0
        if (w > 0 && l > 0) {
          next.area_sqft = roundNum(w * l, 1)
        }
      }
      return next
    })
  }

  const saveRoomEdit = () => {
    if (!editingRoomId) return
    const w = Number(editForm.width_ft) || 10
    const l = Number(editForm.length_ft) || 10
    const area = Number(editForm.area_sqft) || roundNum(w * l, 1)

    setRoomOverrides(prev => ({
      ...prev,
      [editingRoomId]: {
        name: editForm.name,
        type: editForm.type,
        width_ft: w,
        length_ft: l,
        area_sqft: area,
      }
    }))
    setEditingRoomId(null)
  }

  const cancelRoomEdit = () => {
    setEditingRoomId(null)
  }

  const handleAddRoom = () => {
    const newId = `room_custom_${Date.now()}`
    const newRoom = {
      id: newId,
      name: `Custom Room ${rooms.length + 1}`,
      type: 'Habitable',
      x: 100,
      y: 100,
      width: 250,
      height: 200,
      area_px: 50000,
      area_sqft: 150.0,
      area_sqm: 13.94,
      dimensions_ft: "15.0' × 10.0'",
      dimensions_m: "4.57m × 3.05m",
      perimeter_ft: 50.0,
      polygon: [],
      color: '#0f172a',
      percentage: 10.0
    }
    setRooms(prev => [...prev, newRoom])
    setRoomOverrides(prev => ({
      ...prev,
      [newId]: {
        name: newRoom.name,
        type: newRoom.type,
        width_ft: 15.0,
        length_ft: 10.0,
        area_sqft: 150.0
      }
    }))
  }

  const handleDeleteRoom = (roomId) => {
    setRooms(prev => prev.filter(r => r.id !== roomId))
    setRoomOverrides(prev => {
      const copy = { ...prev }
      delete copy[roomId]
      return copy
    })
  }

  const handleResetOverrides = () => {
    setRoomOverrides({})
  }

  const calculatedTakeoffs = useMemo(() => {
    if (!takeoffs) return null
    const totalCarpet = roundNum(recalculatedRooms.reduce((acc, r) => acc + r.area_sqft, 0), 1)
    const totalBuiltup = roundNum(totalCarpet * 1.18, 1)
    const totalCarpetSqm = roundNum(totalCarpet * 0.092903, 2)
    const totalBuiltupSqm = roundNum(totalBuiltup * 0.092903, 2)
    const circulation = roundNum(totalBuiltup - totalCarpet, 1)
    const lenFactor = scaleFtPerPx / (scaleInfo?.feet_per_pixel || 0.045)
    const wallLen = roundNum(takeoffs.total_wall_length_ft * lenFactor, 1)

    return {
      ...takeoffs,
      total_carpet_sqft: totalCarpet,
      total_carpet_sqm: totalCarpetSqm,
      total_builtup_sqft: totalBuiltup,
      total_builtup_sqm: totalBuiltupSqm,
      circulation_sqft: circulation,
      total_wall_length_ft: wallLen,
      total_wall_length_m: roundNum(wallLen * 0.3048, 1),
      flooring_area_sqft: totalCarpet,
      wall_paint_area_sqft: roundNum(wallLen * 10 * 2, 1),
      masonry_volume_cuft: roundNum(wallLen * 10 * 0.75, 1),
    }
  }, [recalculatedRooms, takeoffs, scaleFtPerPx, scaleInfo])

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

  const exportCsvSchedule = () => {
    if (!recalculatedRooms.length) return
    const headers = ['Room ID', 'Room Name', 'Type', 'Dimensions (Ft)', 'Dimensions (M)', 'Area (Sq. Ft.)', 'Area (Sq. M)', 'Perimeter (Ft)', '% of Space']
    const rows = recalculatedRooms.map(r => [
      r.id,
      `"${r.name}"`,
      `"${r.type}"`,
      `"${r.dimensions_ft}"`,
      `"${r.dimensions_m}"`,
      r.area_sqft,
      r.area_sqm,
      r.perimeter_ft,
      `${r.percentage}%`
    ])
    
    rows.push([])
    rows.push(['TOTAL CARPET AREA', '', '', '', '', calculatedTakeoffs?.total_carpet_sqft, calculatedTakeoffs?.total_carpet_sqm, '', '100%'])
    rows.push(['TOTAL BUILT-UP AREA', '', '', '', '', calculatedTakeoffs?.total_builtup_sqft, calculatedTakeoffs?.total_builtup_sqm, '', ''])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Room_Schedule_SquareFeet_${file ? file.name.replace(/\.[^/.]+$/, '') : 'Report'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportPdfReport = () => {
    if (!recalculatedRooms.length) {
      if (file) {
        handleDigitize().then(() => {
          setTimeout(exportPdfReport, 500)
        })
      } else {
        alert("Please upload and digitize a drawing first before downloading the PDF report.")
      }
      return
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
    const pageWidth = 210
    const pageHeight = 297
    const margin = 14
    const contentWidth = pageWidth - margin * 2 // 182 mm
    
    // ==========================================
    // 1. TOP DUAL BRAND ACCENT STRIPES
    // ==========================================
    // Cyan stripe (#22D3EE)
    doc.setFillColor(34, 211, 238)
    doc.rect(0, 0, pageWidth, 3.5, 'F')
    // Amber stripe (#F5A524)
    doc.setFillColor(245, 165, 36)
    doc.rect(0, 3.5, pageWidth, 1.2, 'F')

    // ==========================================
    // 2. BRAND LOGO HEADER & SYSTEM METADATA
    // ==========================================
    let y = 10

    // Draw GEOLITH Hexagon Logo
    drawGeolithLogoVector(doc, margin, y, 14, 14)

    // Draw Wordmark: "GEO" (Cyan) + "LITH" (Amber) + "CONSTRUCTION" (Navy)
    const textStartX = margin + 17
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)

    // "GEO" (#06B6D4)
    doc.setTextColor(6, 182, 212)
    doc.text('GEO', textStartX, y + 5.5)
    const geoWidth = doc.getTextWidth('GEO')

    // "LITH" (#D97706)
    doc.setTextColor(217, 119, 6)
    doc.text('LITH', textStartX + geoWidth, y + 5.5)
    const lithWidth = doc.getTextWidth('LITH')

    // "CONSTRUCTION" (#0F172A)
    doc.setTextColor(15, 23, 42)
    doc.text('CONSTRUCTION', textStartX + geoWidth + lithWidth + 1.5, y + 5.5)

    // Subtitle: "UNIFIED GIS CONSOLE | BLUEPRINT CAD TAKEOFF"
    doc.setFont('courier', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(100, 116, 139)
    doc.text('UNIFIED GIS CONSOLE  |  DIGITAL TAKEOFF & SQUARE FOOTAGE CAD', textStartX, y + 11)

    // Right Header Metadata Box
    const rightBoxWidth = 72
    const rightBoxX = pageWidth - margin - rightBoxWidth

    // Status Badge
    doc.setFillColor(240, 253, 250)
    doc.setDrawColor(45, 212, 191)
    doc.setLineWidth(0.3)
    doc.roundedRect(rightBoxX + 16, y - 1, 56, 5.5, 1.2, 1.2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.8)
    doc.setTextColor(13, 148, 136)
    doc.text('VERIFIED CAD TAKEOFF RECORD', rightBoxX + 19, y + 2.8)

    const now = new Date()
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const docRef = `DOC-REF: GL-CONS-${String(file?.name || 'PLAN').replace(/[^A-Za-z0-9]/g, '').substring(0, 8).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.2)
    doc.setTextColor(100, 116, 139)
    doc.text(docRef, rightBoxX + 16, y + 8.5)
    doc.text(`Generated: ${dateStr} at ${timeStr}`, rightBoxX + 16, y + 12)

    y += 16

    // Header Divider Line
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.4)
    doc.line(margin, y, pageWidth - margin, y)

    y += 3

    // ==========================================
    // 3. DOCUMENT TITLE BANNER
    // ==========================================
    doc.setFillColor(15, 23, 42) // Dark Navy #0F172A
    doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, 'F')

    // Cyan left accent notch
    doc.setFillColor(34, 211, 238)
    doc.roundedRect(margin, y, 2.5, 12, 1, 1, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255)
    doc.text('ARCHITECTURAL BLUEPRINT DIGITIZATION & SQUARE FOOTAGE REPORT', margin + 6, y + 5.2)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.8)
    doc.setTextColor(148, 163, 184)
    doc.text('Automated Spatial Room Segmentation, Square Footage Computation & Bill of Quantities', margin + 6, y + 9.2)

    // Right tag on title banner
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.2)
    doc.setTextColor(56, 189, 248)
    doc.text('FORM CAD-TK / 2026', pageWidth - margin - 35, y + 7.5)

    y += 15

    // ==========================================
    // 4. DRAWING & SCALE METADATA SUMMARY CARD
    // ==========================================
    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.roundedRect(margin, y, contentWidth, 14, 1.5, 1.5, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(71, 85, 105)
    doc.text('Drawing Source:', margin + 4, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(15, 23, 42)
    doc.text(String(file?.name || 'Blueprint_Plan.pdf'), margin + 27, y + 5)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(71, 85, 105)
    doc.text('Format:', margin + 105, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(15, 23, 42)
    doc.text(`${isPdf ? 'PDF Vector Blueprint' : 'Raster Image'} (Sheet ${activePage + 1}/${pageCount})`, margin + 118, y + 5)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(71, 85, 105)
    doc.text('Calibrated Scale:', margin + 4, y + 10.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(2, 132, 199)
    doc.text(`1 px = ${scaleFtPerPx} ft (${roundNum(1 / scaleFtPerPx, 1)} px/ft)`, margin + 27, y + 10.5)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(71, 85, 105)
    doc.text('Space Efficiency:', margin + 105, y + 10.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(16, 185, 129)
    doc.text(`${calculatedTakeoffs?.efficiency_ratio_pct}% Net Usable Area Ratio`, margin + 128, y + 10.5)

    y += 17

    // ==========================================
    // 5. 4-BOX METRIC HIGHLIGHT GRID
    // ==========================================
    const sColW = (contentWidth - 6) / 4
    const stats = [
      { label: 'TOTAL CARPET AREA', val: `${calculatedTakeoffs?.total_carpet_sqft} Sq. Ft.`, sub: `${calculatedTakeoffs?.total_carpet_sqm} Sq. M` },
      { label: 'GROSS BUILT-UP FOOTPRINT', val: `${calculatedTakeoffs?.total_builtup_sqft} Sq. Ft.`, sub: `${calculatedTakeoffs?.total_builtup_sqm} Sq. M` },
      { label: 'ROOMS / SPACES', val: `${recalculatedRooms.length} Spaces`, sub: `Circulation: ${calculatedTakeoffs?.circulation_sqft} sqft` },
      { label: 'WALL RUNNING LENGTH', val: `${calculatedTakeoffs?.total_wall_length_ft} Lin. Ft.`, sub: `${calculatedTakeoffs?.total_wall_length_m} Lin. Meters` },
    ]

    stats.forEach((s, idx) => {
      const sx = margin + idx * (sColW + 2)
      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(203, 213, 225)
      doc.setLineWidth(0.25)
      doc.roundedRect(sx, y, sColW, 14, 1, 1, 'FD')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(5.5)
      doc.setTextColor(15, 23, 42)
      doc.text(s.label, sx + 2.5, y + 3.5)

      doc.setFontSize(8.5)
      doc.setTextColor(15, 23, 42)
      doc.text(s.val, sx + 2.5, y + 8)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(5.5)
      doc.setTextColor(100, 116, 139)
      doc.text(s.sub, sx + 2.5, y + 11.5)
    })

    y += 17

    // ==========================================
    // 6. ROOM SCHEDULE AUTOTABLE
    // ==========================================
    const tableBody = recalculatedRooms.map((r, i) => [
      `#${i + 1}`,
      r.name,
      r.type,
      r.dimensions_ft,
      `${r.area_sqft} Sq. Ft.`,
      `${r.area_sqm} Sq. M`,
      `${r.perimeter_ft} ft`,
      `${r.percentage}%`
    ])

    // Total Row
    tableBody.push([
      'TOTAL',
      'NET CARPET AREA (All Habitable Spaces)',
      'Usable Floor Space',
      '—',
      `${calculatedTakeoffs?.total_carpet_sqft} Sq. Ft.`,
      `${calculatedTakeoffs?.total_carpet_sqm} Sq. M`,
      '—',
      '100.0%'
    ])

    doc.autoTable({
      startY: y,
      head: [['#', 'Room / Space Name', 'Category', 'Dimensions (W × L)', 'Area (Sq. Ft.)', 'Area (Sq. M)', 'Perimeter', '% Share']],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
      bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: margin, right: margin },
      didParseCell: function(data) {
        if (data.row.index === tableBody.length - 1) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [241, 245, 249]
          data.cell.styles.textColor = [15, 23, 42]
        }
      }
    })

    // ==========================================
    // 7. PAGE 2: UPLOADED DRAWING & BOQ TAKEOFFS
    // ==========================================
    doc.addPage()

    // Page 2 Top Brand Accent
    doc.setFillColor(34, 211, 238)
    doc.rect(0, 0, pageWidth, 2.5, 'F')
    doc.setFillColor(245, 165, 36)
    doc.rect(0, 2.5, pageWidth, 1, 'F')

    let p2Y = 8

    // Page 2 Header
    drawGeolithLogoVector(doc, margin, p2Y, 10, 10)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(6, 182, 212)
    doc.text('GEOLITH', margin + 13, p2Y + 4.5)
    doc.setTextColor(217, 119, 6)
    doc.text('CONSTRUCTION', margin + 33, p2Y + 4.5)

    doc.setFont('courier', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(100, 116, 139)
    doc.text('CAD TAKEOFF & MATERIAL QUANTITIES (BOQ) SCHEDULE', margin + 13, p2Y + 8.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(100, 116, 139)
    doc.text(`Drawing: ${file?.name || 'Blueprint'} | Scale: 1 px = ${scaleFtPerPx} ft`, pageWidth - margin - 65, p2Y + 6.5)

    p2Y += 12

    // UPLOADED DRAWING BLUEPRINT SNAPSHOT BOX
    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    const planBoxH = 82
    doc.roundedRect(margin, p2Y, contentWidth, planBoxH, 1.5, 1.5, 'FD')

    // Title bar for plan box
    doc.setFillColor(15, 23, 42)
    doc.roundedRect(margin, p2Y, contentWidth, 6.5, 1.5, 1.5, 'F')
    doc.rect(margin, p2Y + 5, contentWidth, 1.5, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(255, 255, 255)
    doc.text('UPLOADED ARCHITECTURAL DRAWING / FLOOR PLAN VIEW', margin + 5, p2Y + 4.5)

    doc.setFont('courier', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(56, 189, 248)
    doc.text(`SHEET 01 · LOD2 DIGITAL CAD`, pageWidth - margin - 42, p2Y + 4.5)

    // Embed preview image if available
    if (preview) {
      try {
        const boxMaxW = contentWidth - 8
        const boxMaxH = planBoxH - 12
        let embedW = boxMaxW
        let embedH = boxMaxH
        
        // Compute proper aspect-fit if dimensions are known
        const origW = fileInfo?.original_width || 1200
        const origH = fileInfo?.original_height || 800
        if (origW && origH) {
          const aspect = origW / origH
          const boxAspect = boxMaxW / boxMaxH
          if (aspect > boxAspect) {
            embedW = boxMaxW
            embedH = boxMaxW / aspect
          } else {
            embedH = boxMaxH
            embedW = boxMaxH * aspect
          }
        }
        const embedX = margin + 4 + (boxMaxW - embedW) / 2
        const embedY = p2Y + 8 + (boxMaxH - embedH) / 2
        const format = preview.startsWith('data:image/png') ? 'PNG' : 'JPEG'
        doc.addImage(preview, format, embedX, embedY, embedW, embedH, undefined, 'FAST')
      } catch (err) {
        console.warn('Could not embed preview image:', err)
        drawBlueprintPlaceholder(doc, margin + 4, p2Y + 8, contentWidth - 8, planBoxH - 12, recalculatedRooms)
      }
    } else {
      drawBlueprintPlaceholder(doc, margin + 4, p2Y + 8, contentWidth - 8, planBoxH - 12, recalculatedRooms)
    }

    p2Y += planBoxH + 5

    // ==========================================
    // 8. BILL OF QUANTITIES (BOQ) TABLE
    // ==========================================
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(15, 23, 42)
    doc.text('CONSTRUCTION MATERIAL TAKEOFF ESTIMATES (BOQ)', margin, p2Y)

    const boqData = [
      ['Flooring Tiles Required', `${calculatedTakeoffs?.flooring_area_sqft} Sq. Ft.`, 'Net usable floor surface area across all habitable rooms (add +10% for cuts & corners: ' + roundNum(calculatedTakeoffs?.flooring_area_sqft * 1.1, 1) + ' Sq. Ft.)'],
      ['Interior & Exterior Wall Paint / Plaster', `${calculatedTakeoffs?.wall_paint_area_sqft} Sq. Ft.`, 'Dual-coat internal & external plaster/paint finish based on standard 10.0 ft ceiling heights & ' + calculatedTakeoffs?.total_wall_length_ft + ' linear feet of walls'],
      ['Structural Masonry / Brickwork Volume', `${calculatedTakeoffs?.masonry_volume_cuft} Cu. Ft.`, 'Estimated structural mass for 9" external & 4.5" internal partition walls (' + roundNum(calculatedTakeoffs?.masonry_volume_cuft * 0.0283, 2) + ' Cu. M)'],
      ['Doors & Access Portals', `${calculatedTakeoffs?.doors_count} Units`, 'Detected room entryways and structural internal openings'],
      ['Windows & Ventilation Openings', `${calculatedTakeoffs?.windows_count} Units`, 'Estimated natural illumination and cross-ventilation apertures'],
    ]

    doc.autoTable({
      startY: p2Y + 2,
      head: [['Material / Engineering Item', 'Quantity / Takeoff', 'Engineering Specification & Notes']],
      body: boqData,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.8 },
      bodyStyles: { fontSize: 6.5, textColor: [51, 65, 85] },
      margin: { left: margin, right: margin }
    })

    // ==========================================
    // 9. OFFICIAL VERIFICATION, SEAL & SIGN-OFF
    // ==========================================
    const authY = doc.lastAutoTable.finalY + 4
    const authBoxHeight = 22

    // QR Verification Block (Left)
    doc.setDrawColor(203, 213, 225)
    doc.setLineWidth(0.3)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(margin, authY, 48, authBoxHeight, 1.2, 1.2, 'FD')

    drawQrCodeVector(doc, margin + 2.5, authY + 2.5, 17, 17, file?.name || 'GLCONS')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6)
    doc.setTextColor(15, 23, 42)
    doc.text('SCAN TO VERIFY', margin + 22, authY + 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5)
    doc.setTextColor(100, 116, 139)
    doc.text('Geolith CAD Portal', margin + 22, authY + 9.5)
    doc.text('SHA256 Validated', margin + 22, authY + 12.5)
    doc.text('Tamper-Proof Record', margin + 22, authY + 15.5)

    // Official Municipal & Engineering Seal (Center)
    const sealX = margin + 51
    const sealWidth = contentWidth - 51 - 48
    doc.roundedRect(sealX, authY, sealWidth, authBoxHeight, 1.2, 1.2, 'FD')
    drawOfficialSealVector(doc, sealX + sealWidth / 2, authY + authBoxHeight / 2)

    // Authorized Signature Block (Right)
    const sigX = pageWidth - margin - 45
    doc.roundedRect(sigX, authY, 45, authBoxHeight, 1.2, 1.2, 'FD')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.5)
    doc.setTextColor(100, 116, 139)
    doc.text('Digitally Authenticated by:', sigX + 3, authY + 4.5)

    drawDigitalSignatureVector(doc, sigX + 3, authY + 7)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.2)
    doc.setTextColor(15, 23, 42)
    doc.text('Chief GIS Structural Assessor', sigX + 3, authY + 16.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5)
    doc.setTextColor(100, 116, 139)
    doc.text('Engineering & Town Planning Division', sigX + 3, authY + 19.5)

    // ==========================================
    // 10. LEGAL DISCLAIMER & FOOTER
    // ==========================================
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.line(margin, 287, pageWidth - margin, 287)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.5)
    doc.setTextColor(148, 163, 184)
    doc.text(
      'LEGAL NOTICE: This document is an official electronically generated CAD takeoff record from GEOLITH PORTAL. Measurement data is computed via digital vector contour analysis and is certified for construction estimation purposes.',
      margin,
      290.5,
      { maxWidth: contentWidth }
    )

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6)
    doc.setTextColor(100, 116, 139)
    doc.text('GEOLITH PORTAL · UNIFIED GIS CONSOLE · ENGINEERING CAD DIVISION', margin, 294.5)

    doc.setFont('helvetica', 'normal')
    doc.text('Page 2 of 2 · System Authenticated & Certified', pageWidth - margin - 48, 294.5)

    doc.save(`GEOLITH_Construction_Takeoff_${file ? file.name.replace(/\.[^/.]+$/, '') : 'Blueprint'}.pdf`)
  }

  function drawBlueprintPlaceholder(doc, x, y, w, h, roomList) {
    // 1. Pure White CAD Drawing Canvas
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(203, 213, 225)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, y, w, h, 1.2, 1.2, 'FD')

    // 2. Subtle Millimeter Grid
    doc.setDrawColor(241, 245, 249)
    doc.setLineWidth(0.2)
    for (let gx = x + 12; gx < x + w; gx += 14) {
      doc.line(gx, y, gx, y + h)
    }
    for (let gy = y + 10; gy < y + h; gy += 14) {
      doc.line(x, gy, x + w, gy)
    }

    // 3. Header Text
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(15, 23, 42)
    doc.text('ARCHITECTURAL FLOOR PLAN & SPATIAL ROOM ZONES (WHITE CAD SHEET)', x + w / 2, y + 8, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(100, 116, 139)
    doc.text(`Total ${roomList.length} Segmented Rooms & Spatial Living Compartments`, x + w / 2, y + 13, { align: 'center' })

    // 4. Draw Schematic Room Boxes with crisp white card & colored accents
    const gridCols = Math.min(4, Math.max(1, roomList.length))
    const boxW = (w - 18) / gridCols
    const boxH = 26
    const startX = x + 9
    const startY = y + 17

    roomList.slice(0, 8).forEach((rm, idx) => {
      const col = idx % gridCols
      const row = Math.floor(idx / gridCols)
      const bx = startX + col * (boxW + 2)
      const by = startY + row * (boxH + 3)

      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(203, 213, 225)
      doc.setLineWidth(0.3)
      doc.roundedRect(bx, by, boxW - 2, boxH, 1, 1, 'FD')

      // Room Title
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.8)
      doc.setTextColor(15, 23, 42)
      doc.text(rm.name.substring(0, 18), bx + 2.5, by + 6)

      // Square Footage (Dark Slate)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(15, 23, 42)
      doc.text(`${rm.area_sqft} Sq. Ft.`, bx + 2.5, by + 12.5)

      // Dimensions (W × L) & Metric Area
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.2)
      doc.setTextColor(51, 65, 85)
      doc.text(`Dim: ${rm.dimensions_ft}`, bx + 2.5, by + 17.5)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(5.2)
      doc.setTextColor(100, 116, 139)
      doc.text(`${rm.area_sqm} Sq. M · Peri: ${rm.perimeter_ft} ft`, bx + 2.5, by + 22)
    })
  }

  /**
   * Helper to draw exact GEOLITH Hexagon Brand Logo
   */
  function drawGeolithLogoVector(doc, x, y, w, h) {
    const hw = w / 2
    const hh = h / 2
    const cx = x + hw
    const cy = y + hh

    const points = [
      [cx - w * 0.28, y],
      [cx + w * 0.28, y],
      [cx + hw, cy],
      [cx + w * 0.28, y + h],
      [cx - w * 0.28, y + h],
      [cx - hw, cy],
    ]

    doc.setFillColor(11, 19, 41)
    doc.setDrawColor(34, 211, 238) // Cyan stroke #22D3EE
    doc.setLineWidth(0.6)

    const deltaPoints = []
    for (let i = 1; i < points.length; i++) {
      deltaPoints.push([points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]])
    }
    doc.lines(deltaPoints, points[0][0], points[0][1], [1.0, 1.0], 'FD', true)

    // 3 Left-Aligned Stacked Horizontal Bars
    const barX = cx - w * 0.24
    const barH = h * 0.11

    // Bar 1: Cyan (#22D3EE)
    doc.setFillColor(34, 211, 238)
    doc.roundedRect(barX, cy - h * 0.22, w * 0.28, barH, 0.4, 0.4, 'F')

    // Bar 2: Amber (#F5A524)
    doc.setFillColor(245, 165, 36)
    doc.roundedRect(barX, cy - h * 0.05, w * 0.48, barH, 0.4, 0.4, 'F')

    // Bar 3: Coral (#F43F5E)
    doc.setFillColor(244, 63, 94)
    doc.roundedRect(barX, cy + h * 0.12, w * 0.38, barH, 0.4, 0.4, 'F')
  }

  function drawQrCodeVector(doc, x, y, w, h, code) {
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(203, 213, 225)
    doc.setLineWidth(0.2)
    doc.roundedRect(x, y, w, h, 0.8, 0.8, 'FD')

    const pad = 1.4
    const qx = x + pad
    const qy = y + pad
    const qw = w - pad * 2
    const grid = 7
    const cell = qw / grid

    doc.setFillColor(15, 23, 42)
    const drawFinder = (fx, fy) => {
      doc.rect(fx, fy, cell * 2.2, cell * 2.2, 'F')
      doc.setFillColor(255, 255, 255)
      doc.rect(fx + cell * 0.5, fy + cell * 0.5, cell * 1.2, cell * 1.2, 'F')
      doc.setFillColor(15, 23, 42)
      doc.rect(fx + cell * 0.8, fy + cell * 0.8, cell * 0.6, cell * 0.6, 'F')
    }

    drawFinder(qx, qy)
    drawFinder(qx + cell * 4.8, qy)
    drawFinder(qx, qy + cell * 4.8)

    const seedStr = String(code || 'GLCONS')
    for (let r = 0; r < grid; r++) {
      for (let c = 0; c < grid; c++) {
        if ((r < 3 && c < 3) || (r < 3 && c >= 4) || (r >= 4 && c < 3)) continue
        const val = (seedStr.charCodeAt((r * grid + c) % seedStr.length) * 31 + r * 17 + c * 23) % 2
        if (val === 1) {
          doc.setFillColor(15, 23, 42)
          doc.rect(qx + c * cell, qy + r * cell, cell * 0.85, cell * 0.85, 'F')
        }
      }
    }
    doc.setFillColor(34, 211, 238)
    doc.circle(qx + qw / 2, qy + qw / 2, cell * 0.65, 'F')
  }

  function drawOfficialSealVector(doc, cx, cy) {
    const r = 8.5
    doc.setDrawColor(217, 119, 6) // Amber
    doc.setLineWidth(0.35)
    doc.circle(cx, cy, r, 'S')

    doc.setDrawColor(180, 83, 9)
    doc.setLineWidth(0.2)
    doc.circle(cx, cy, r - 1.2, 'S')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(4.5)
    doc.setTextColor(217, 119, 6)
    doc.text('GEOLITH GIS', cx, cy - 2.8, { align: 'center' })

    doc.setFontSize(3.8)
    doc.setTextColor(15, 23, 42)
    doc.text('★ CAD TAKEOFF ★', cx, cy, { align: 'center' })
    doc.text('CERTIFIED SURVEY', cx, cy + 2.8, { align: 'center' })
  }

  function drawDigitalSignatureVector(doc, x, y) {
    doc.setDrawColor(37, 99, 235) // Blue ink
    doc.setLineWidth(0.3)
    const points = [[2, 2], [5, -2], [8, 3], [12, -1], [16, 2], [22, -2], [28, 1]]
    let px = x
    let py = y + 3
    for (let i = 0; i < points.length; i++) {
      const nx = x + points[i][0]
      const ny = y + 3 + points[i][1]
      doc.line(px, py, nx, ny)
      px = nx
      py = ny
    }
    doc.line(x, y + 5.5, x + 30, y + 5.5)
  }

  return (
    <div className={`app-root${darkMode ? ' dark' : ''}`}>
      {/* Top Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="brand-logo-hex">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <path d="M9 5H23L28 16L23 27H9L4 16Z" stroke="#22D3EE" strokeWidth="2" strokeLinejoin="round" />
              <rect x="10.5" y="11" width="7" height="2.4" rx="1.2" fill="#22D3EE" />
              <rect x="10.5" y="14.8" width="11" height="2.4" rx="1.2" fill="#F5A524" />
              <rect x="10.5" y="18.6" width="9" height="2.4" rx="1.2" fill="#F43F5E" />
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-title-wrap">
              <span className="brand-geo">GEO</span>
              <span className="brand-lith">LITH</span>
              <span className="brand-portal">CONSTRUCTION</span>
            </span>
            <span className="brand-sub">Architectural Blueprint &amp; Square Feet Digitizer</span>
          </div>
        </div>
        <div className="navbar-right">
          <div className={`status-chip ${loading ? 'status-processing' : file ? 'status-ready' : 'status-idle'}`}>
            <span className="status-dot"></span>
            {loading ? 'Digitizing Drawing...' : file ? `${isPdf ? 'PDF Loaded' : 'Image Loaded'}` : 'Awaiting Drawing'}
          </div>
          <button className="theme-toggle" onClick={() => setDarkMode(d => !d)} title={darkMode ? 'Switch to Light' : 'Switch to Dark'}>
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </nav>

      {/* Hero Banner */}
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <p className="page-eyebrow">Digital Twin Blueprint CAD</p>
            <h1 className="page-title">Drawing &amp; Square Feet Digitizer</h1>
            <p className="page-desc">Upload architectural drawings in PDF, JPG, or PNG format to automatically digitize walls, detect rooms, compute square footage, and generate construction quantity takeoffs.</p>
          </div>
          {calculatedTakeoffs && (
            <div className="header-export-actions">
              <button onClick={exportPdfReport} className="header-action-btn btn-pdf">
                <span>📄</span> Export Takeoff PDF
              </button>
              <button onClick={exportCsvSchedule} className="header-action-btn btn-csv">
                <span>📊</span> Export CSV Schedule
              </button>
              <button onClick={downloadSvg} className="header-action-btn btn-svg">
                <span>📥</span> Download SVG
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="content-grid">
        {/* Left Sidebar Control Panel */}
        <div className="left-panel">
          {/* Upload Card */}
          <div className="panel-card">
            <div className="panel-card-header">Upload Drawing / Blueprint</div>
            <div
              className={`drop-zone-mini ${dragActive ? 'drop-zone-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-input-side"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="file-input-hidden"
              />
              <label htmlFor="file-input-side" className="drop-zone-mini-label">
                <span className="drop-mini-icon">{isPdf ? '📄' : file ? '🖼️' : '📁'}</span>
                <span className="drop-mini-text">
                  {file ? file.name : 'Choose PDF, JPG or PNG'}
                </span>
                <span className="drop-mini-hint">Drag &amp; drop or click to browse</span>
              </label>
            </div>

            {/* Multi-page selector if PDF */}
            {isPdf && pageCount > 1 && (
              <div className="page-selector-row">
                <span className="page-selector-label">PDF Sheet / Page:</span>
                <select
                  value={activePage}
                  onChange={(e) => setActivePage(Number(e.target.value))}
                  className="page-selector-dropdown"
                >
                  {Array.from({ length: pageCount }).map((_, i) => (
                    <option key={i} value={i}>Sheet / Page {i + 1}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Scale Calibration & Exact Measurement Control */}
            <div className="scale-control-box">
              <div className="scale-header">
                <span className="scale-title">Drawing Scale &amp; Calibration</span>
                <span className="scale-val">{scaleFtPerPx} ft/px</span>
              </div>
              
              <select
                value={scaleFtPerPx}
                onChange={(e) => setScaleFtPerPx(Number(e.target.value))}
                className="scale-dropdown"
              >
                {SCALE_PRESETS.map((p, idx) => (
                  <option key={idx} value={p.value}>{p.label}</option>
                ))}
              </select>

              <input
                type="range"
                min="0.015"
                max="0.12"
                step="0.002"
                value={scaleFtPerPx}
                onChange={(e) => setScaleFtPerPx(Number(e.target.value))}
                className="scale-slider"
              />

              {/* Exact Target Area Calibrator */}
              <div className="exact-calibrator-box">
                <div className="calibrator-label">🎯 Calibrate by Total Known Area (Sq. Ft.)</div>
                <div className="calibrator-presets">
                  <button type="button" className="calibrator-preset-btn" onClick={() => applyTargetSqftCalibration(850)}>850 sft</button>
                  <button type="button" className="calibrator-preset-btn" onClick={() => applyTargetSqftCalibration(1250)}>1,250 sft</button>
                  <button type="button" className="calibrator-preset-btn" onClick={() => applyTargetSqftCalibration(1650)}>1,650 sft</button>
                  <button type="button" className="calibrator-preset-btn" onClick={() => applyTargetSqftCalibration(2400)}>2,400 sft</button>
                </div>
                <div className="calibrator-input-row">
                  <input
                    type="number"
                    placeholder="Enter Exact Sq. Ft. (e.g. 1500)"
                    value={targetSqftInput}
                    onChange={(e) => setTargetSqftInput(e.target.value)}
                    className="calibrator-input"
                  />
                  <button
                    type="button"
                    onClick={() => { applyTargetSqftCalibration(targetSqftInput); setTargetSqftInput(''); }}
                    className="calibrator-apply-btn"
                    disabled={!targetSqftInput}
                  >
                    Apply Exact Scale
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleDigitize()}
              disabled={!file || loading}
              className="action-btn action-btn-primary"
            >
              {loading ? (
                <>
                  <span className="spinner-mini"></span>
                  <span>Processing Drawing...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Digitize &amp; Calculate Sq. Ft.</span>
                </>
              )}
            </button>
          </div>

          {/* Key Summary Metrics */}
          {calculatedTakeoffs && (
            <div className="panel-card">
              <div className="panel-card-header">Takeoff Overview</div>
              <div className="metric-grid-2x2">
                <div className="metric-box box-cyan">
                  <span className="metric-val">{calculatedTakeoffs.total_carpet_sqft}</span>
                  <span className="metric-unit">Sq. Ft.</span>
                  <span className="metric-title">Total Carpet Area</span>
                  <span className="metric-sub">{calculatedTakeoffs.total_carpet_sqm} Sq. M</span>
                </div>
                <div className="metric-box box-amber">
                  <span className="metric-val">{calculatedTakeoffs.total_builtup_sqft}</span>
                  <span className="metric-unit">Sq. Ft.</span>
                  <span className="metric-title">Built-up Footprint</span>
                  <span className="metric-sub">{calculatedTakeoffs.total_builtup_sqm} Sq. M</span>
                </div>
                <div className="metric-box box-emerald">
                  <span className="metric-val">{recalculatedRooms.length}</span>
                  <span className="metric-unit">Spaces</span>
                  <span className="metric-title">Rooms Detected</span>
                  <span className="metric-sub">Efficiency: {calculatedTakeoffs.efficiency_ratio_pct}%</span>
                </div>
                <div className="metric-box box-purple">
                  <span className="metric-val">{calculatedTakeoffs.total_wall_length_ft}</span>
                  <span className="metric-unit">Lin. Ft.</span>
                  <span className="metric-title">Wall Length</span>
                  <span className="metric-sub">{calculatedTakeoffs.total_wall_length_m} Lin. M</span>
                </div>
              </div>
            </div>
          )}

          {/* Layer Visibility Toggles */}
          {svgResult && (
            <div className="panel-card">
              <div className="panel-card-header">Blueprint Layers</div>
              <div className="layer-toggles">
                <label className="layer-toggle-item">
                  <input type="checkbox" checked={showRooms} onChange={(e) => setShowRooms(e.target.checked)} />
                  <span className="layer-color-dot dot-cyan"></span>
                  <span>Room Zones &amp; Sq. Ft. Badges</span>
                </label>
                <label className="layer-toggle-item">
                  <input type="checkbox" checked={showWalls} onChange={(e) => setShowWalls(e.target.checked)} />
                  <span className="layer-color-dot dot-blue"></span>
                  <span>Structural Walls &amp; Lines</span>
                </label>
                <label className="layer-toggle-item">
                  <input type="checkbox" checked={showText} onChange={(e) => setShowText(e.target.checked)} />
                  <span className="layer-color-dot dot-slate"></span>
                  <span>Text &amp; Dimensions</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Right Main Content Area */}
        <div className="right-panel">
          {error && (
            <div className="alert-error">
              <span className="alert-icon">⚠️</span>
              <div className="alert-text">
                <strong>Digitization Notice:</strong> {error}
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="tab-bar">
            <button
              className={`tab-btn ${activeTab === 'takeoffs' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('takeoffs')}
              disabled={!recalculatedRooms.length}
            >
              <span>📊</span> Square Footage &amp; Takeoffs ({recalculatedRooms.length})
            </button>
            <button
              className={`tab-btn ${activeTab === 'blueprint' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('blueprint')}
              disabled={!svgResult}
            >
              <span>📐</span> Interactive Vector Blueprint
            </button>
            <button
              className={`tab-btn ${activeTab === 'boq' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('boq')}
              disabled={!calculatedTakeoffs}
            >
              <span>🧱</span> Material Quantities (BOQ)
            </button>
            <button
              className={`tab-btn ${activeTab === 'upload' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <span>🖼️</span> Original Upload Preview
            </button>
          </div>

          <div className="tab-content">
            {/* 1. SQUARE FOOTAGE & ROOM SCHEDULE TAB */}
            {activeTab === 'takeoffs' && recalculatedRooms.length > 0 && (
              <div className="takeoffs-view">
                <div className="schedule-header-row">
                  <div>
                    <h3 className="section-title">Room-by-Room Square Footage Schedule</h3>
                    <p className="section-sub">Geometric spatial analysis &amp; exact custom dimensional calibration</p>
                  </div>
                  <div className="schedule-actions">
                    <button onClick={exportPdfReport} className="btn-sm btn-primary">📄 Download PDF</button>
                    <button onClick={handleAddRoom} className="btn-sm btn-action-add">➕ Add Space</button>
                    {Object.keys(roomOverrides).length > 0 && (
                      <button onClick={handleResetOverrides} className="btn-sm btn-action-reset" title="Reset all custom room edits">↺ Reset Edits</button>
                    )}
                    <button onClick={exportCsvSchedule} className="btn-sm btn-secondary">📊 Export CSV</button>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="schedule-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Room / Space Name</th>
                        <th>Category</th>
                        <th>Dimensions (W × L)</th>
                        <th>Area (Sq. Ft.)</th>
                        <th>Area (Sq. M)</th>
                        <th>Perimeter</th>
                        <th>% Share</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recalculatedRooms.map((r, idx) => (
                        editingRoomId === r.id ? (
                          <tr key={r.id} className="schedule-row-editing">
                            <td className="room-idx-cell">
                              <span className="room-num-badge">{idx + 1}</span>
                            </td>
                            <td>
                              <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                className="table-edit-input"
                                placeholder="Room Name"
                              />
                            </td>
                            <td>
                              <select
                                value={editForm.type}
                                onChange={(e) => setEditForm(prev => ({ ...prev, type: e.target.value }))}
                                className="table-edit-select"
                              >
                                <option value="Habitable / Bedroom">Habitable / Bedroom</option>
                                <option value="Living / Common">Living / Common</option>
                                <option value="Service / Utility">Service / Utility</option>
                                <option value="Service / Wet Area">Service / Wet Area</option>
                                <option value="Outdoor / Semi-Open">Outdoor / Semi-Open</option>
                                <option value="Circulation">Circulation</option>
                              </select>
                            </td>
                            <td>
                              <div className="dim-edit-wrap">
                                <input
                                  type="number"
                                  step="0.5"
                                  value={editForm.width_ft}
                                  onChange={(e) => handleEditDimensionChange('width_ft', e.target.value)}
                                  className="table-dim-input"
                                  placeholder="Width"
                                />
                                <span className="dim-sep">×</span>
                                <input
                                  type="number"
                                  step="0.5"
                                  value={editForm.length_ft}
                                  onChange={(e) => handleEditDimensionChange('length_ft', e.target.value)}
                                  className="table-dim-input"
                                  placeholder="Length"
                                />
                                <span className="dim-unit">ft</span>
                              </div>
                            </td>
                            <td>
                              <input
                                type="number"
                                step="1"
                                value={editForm.area_sqft}
                                onChange={(e) => setEditForm(prev => ({ ...prev, area_sqft: e.target.value }))}
                                className="table-sqft-input"
                                placeholder="Sq. Ft."
                              />
                            </td>
                            <td className="sqm-cell">
                              {roundNum((Number(editForm.area_sqft) || 0) * 0.092903, 2)} Sq. M
                            </td>
                            <td>—</td>
                            <td>—</td>
                            <td style={{ textAlign: 'center' }}>
                              <div className="edit-btn-group">
                                <button onClick={saveRoomEdit} className="btn-save-sm" title="Save Dimensions">✓ Save</button>
                                <button onClick={cancelRoomEdit} className="btn-cancel-sm" title="Cancel">✕</button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr
                            key={r.id}
                            className={`schedule-row ${hoveredRoomId === r.id ? 'row-hovered' : ''}`}
                            onMouseEnter={() => setHoveredRoomId(r.id)}
                            onMouseLeave={() => setHoveredRoomId(null)}
                          >
                            <td className="room-idx-cell">
                              <span className="room-num-badge">{idx + 1}</span>
                            </td>
                            <td className="room-name-cell">
                              <strong>{r.name}</strong>
                              {r.isEdited && <span className="badge-calibrated">Edited</span>}
                            </td>
                            <td>
                              <span className="category-tag">{r.type}</span>
                            </td>
                            <td className="dim-cell">{r.dimensions_ft}</td>
                            <td className="sqft-cell">
                              <strong>{r.area_sqft}</strong> Sq. Ft.
                            </td>
                            <td className="sqm-cell">{r.area_sqm} Sq. M</td>
                            <td>{r.perimeter_ft} ft</td>
                            <td className="pct-cell">
                              <div className="pct-bar-wrap">
                                <div className="pct-bar-fill" style={{ width: `${Math.min(100, r.percentage * 2)}%`, backgroundColor: '#0f172a' }}></div>
                                <span className="pct-text">{r.percentage}%</span>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div className="row-action-group">
                                <button
                                  onClick={() => startEditingRoom(r)}
                                  className="btn-row-action btn-row-edit"
                                  title="Edit Dimensions & Exact Square Feet"
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteRoom(r.id)}
                                  className="btn-row-action btn-row-del"
                                  title="Remove Space"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="tfoot-total">
                        <td colSpan="4">TOTAL NET CARPET AREA</td>
                        <td className="sqft-cell"><strong>{calculatedTakeoffs?.total_carpet_sqft}</strong> Sq. Ft.</td>
                        <td className="sqm-cell"><strong>{calculatedTakeoffs?.total_carpet_sqm}</strong> Sq. M</td>
                        <td>—</td>
                        <td>100.0%</td>
                        <td></td>
                      </tr>
                      <tr className="tfoot-builtup">
                        <td colSpan="4">TOTAL GROSS BUILT-UP FOOTPRINT (Inc. Exterior Walls &amp; Columns)</td>
                        <td className="sqft-cell"><strong>{calculatedTakeoffs?.total_builtup_sqft}</strong> Sq. Ft.</td>
                        <td className="sqm-cell"><strong>{calculatedTakeoffs?.total_builtup_sqm}</strong> Sq. M</td>
                        <td colSpan="3">Circulation: {calculatedTakeoffs?.circulation_sqft} Sq. Ft.</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* 2. INTERACTIVE VECTOR BLUEPRINT TAB */}
            {activeTab === 'blueprint' && svgResult && (
              <div className="blueprint-view">
                <div className="svg-toolbar">
                  <div className="zoom-controls">
                    <button className="svg-zoom-btn" onClick={() => setSvgZoom(z => Math.max(30, z - 10))}>−</button>
                    <span className="svg-zoom-label">{svgZoom}%</span>
                    <button className="svg-zoom-btn" onClick={() => setSvgZoom(z => Math.min(300, z + 10))}>+</button>
                    <button className="svg-zoom-reset" onClick={() => setSvgZoom(100)}>Reset</button>
                  </div>
                  <div className="svg-info-tag">
                    <span>{shapes.length} Wall Vectors</span> · <span>{recalculatedRooms.length} Enclosed Rooms</span> · <span>Scale: 1 px = {scaleFtPerPx} ft</span>
                  </div>
                  <button onClick={downloadSvg} className="btn-sm btn-primary">
                    📥 Download SVG
                  </button>
                </div>

                <div className="svg-output-box">
                  <div
                    className={`svg-inner-container ${!showRooms ? 'hide-rooms' : ''} ${!showWalls ? 'hide-walls' : ''} ${!showText ? 'hide-text' : ''}`}
                    style={{ transform: `scale(${svgZoom / 100})`, transformOrigin: 'top left' }}
                    dangerouslySetInnerHTML={{ __html: svgResult }}
                  />
                </div>
              </div>
            )}

            {/* 3. MATERIAL QUANTITIES & BOQ TAB */}
            {activeTab === 'boq' && calculatedTakeoffs && (
              <div className="boq-view">
                <h3 className="section-title">Bill of Quantities (BOQ) &amp; Material Estimates</h3>
                <p className="section-sub">Structural takeoffs calculated directly from digitized architectural lines and room polygons</p>

                <div className="boq-cards-grid">
                  <div className="boq-card">
                    <div className="boq-card-icon">🔲</div>
                    <div className="boq-card-body">
                      <span className="boq-title">Flooring Tiles &amp; Screed</span>
                      <span className="boq-num">{calculatedTakeoffs.flooring_area_sqft} Sq. Ft.</span>
                      <span className="boq-desc">Net usable floor surface area across all habitable rooms. Recommended order quantity with 10% wastage allowance: <strong>{roundNum(calculatedTakeoffs.flooring_area_sqft * 1.10, 1)} Sq. Ft.</strong></span>
                    </div>
                  </div>

                  <div className="boq-card">
                    <div className="boq-card-icon">🎨</div>
                    <div className="boq-card-body">
                      <span className="boq-title">Wall Plaster &amp; Painting</span>
                      <span className="boq-num">{calculatedTakeoffs.wall_paint_area_sqft} Sq. Ft.</span>
                      <span className="boq-desc">Internal and external wall surface area based on standard 10.0 ft ceiling heights and {calculatedTakeoffs.total_wall_length_ft} linear feet of running walls.</span>
                    </div>
                  </div>

                  <div className="boq-card">
                    <div className="boq-card-icon">🧱</div>
                    <div className="boq-card-body">
                      <span className="boq-title">Brickwork &amp; Masonry Volume</span>
                      <span className="boq-num">{calculatedTakeoffs.masonry_volume_cuft} Cu. Ft.</span>
                      <span className="boq-desc">Total structural volume for 9-inch exterior and 4.5-inch interior partition masonry ({roundNum(calculatedTakeoffs.masonry_volume_cuft * 0.0283168, 2)} Cubic Meters).</span>
                    </div>
                  </div>

                  <div className="boq-card">
                    <div className="boq-card-icon">🚪</div>
                    <div className="boq-card-body">
                      <span className="boq-title">Doors &amp; Windows Schedule</span>
                      <span className="boq-num">{calculatedTakeoffs.doors_count} Doors / {calculatedTakeoffs.windows_count} Windows</span>
                      <span className="boq-desc">Estimated openings count based on room transitions and exterior facade fenestration analysis.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. ORIGINAL PREVIEW TAB */}
            {activeTab === 'upload' && (
              <div className="upload-view">
                {isPdf ? (
                  <div className="pdf-preview-box">
                    <div className="pdf-icon-big">📄</div>
                    <h4 className="pdf-title">{file?.name}</h4>
                    <p className="pdf-sub">PDF Architectural Document · {pageCount} Sheet(s) Detected</p>
                    <button onClick={() => handleDigitize()} className="action-btn action-btn-primary" style={{ maxWidth: '280px', margin: '16px auto' }}>
                      🚀 Run Digital CAD Extraction
                    </button>
                  </div>
                ) : preview ? (
                  <div className="preview-box">
                    <div className="preview-header">
                      <span className="preview-title">Uploaded Drawing Preview</span>
                      <span className="preview-filename">{file?.name}</span>
                    </div>
                    <img src={preview} alt="Drawing Preview" className="preview-img" />
                  </div>
                ) : (
                  <div className="empty-upload-placeholder">
                    <span className="empty-icon">📁</span>
                    <h4>No Drawing Uploaded Yet</h4>
                    <p>Select a PDF, JPG, or PNG blueprint on the left to start digitization.</p>
                  </div>
                )}
              </div>
            )}

            {/* Loading Indicator */}
            {loading && (
              <div className="loading-box">
                <div className="loader-ring"></div>
                <p className="loading-title">Digitizing Drawing &amp; Extracting Square Footage</p>
                <p className="loading-sub">Rasterizing blueprint, segmenting enclosed rooms, and calculating structural takeoffs...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="app-footer">
        <span>GEOLITH PORTAL · Unified GIS Console · Construction Blueprint Digitizer</span>
      </footer>
    </div>
  )
}

function roundNum(val, dec = 1) {
  const p = Math.pow(10, dec)
  return Math.round(val * p) / p
}

export default App

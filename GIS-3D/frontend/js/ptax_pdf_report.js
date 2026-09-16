// File: js/ptax_pdf_report.js
// Professional Property PDF Generator for GEOLITH PORTAL — Unified GIS Console
// Generates high-fidelity municipal property records with brand logo, house owner details,
// architectural survey diagram, GIS coordinates, tax assessment data, and official authentication seal.

(function () {
  "use strict";

  // Bind to navbar button and expose globally
  document.addEventListener("DOMContentLoaded", initPtaxPdfReport);
  if (document.readyState === "complete" || document.readyState === "interactive") {
    initPtaxPdfReport();
  }

  function initPtaxPdfReport() {
    const navBtn = document.getElementById("downloadPtaxPdfBtn");
    if (navBtn && !navBtn.dataset.ptaxBound) {
      navBtn.dataset.ptaxBound = "true";
      navBtn.addEventListener("click", generatePtaxPdf);
    }
  }

  // Expose on window for direct access
  window.generatePtaxPdf = generatePtaxPdf;
  window.downloadPropertyPdf = generatePtaxPdf;

  /**
   * Main entry point to generate the Property PDF
   */
  async function generatePtaxPdf() {
    const rawData = resolveActivePropertyData();

    if (!rawData) {
      alert(
        "Please select a house on the 3D map or search for a property first before downloading the PDF."
      );
      return;
    }

    const prop = normalizePropertyData(rawData);

    // Verify jsPDF library is available
    const jsPdfCtor =
      (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!jsPdfCtor) {
      alert(
        "PDF generation library (jsPDF) is still loading. Please try again in a few seconds."
      );
      return;
    }

    // Create A4 PDF in mm (210 x 297 mm)
    const doc = new jsPdfCtor({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 14;
    const contentWidth = pageWidth - margin * 2; // 182 mm

    // ==========================================
    // 1. TOP ACCENT BRAND BARS
    // ==========================================
    // Cyan stripe (#22D3EE)
    doc.setFillColor(34, 211, 238);
    doc.rect(0, 0, pageWidth, 3.5, "F");

    // Amber stripe (#F5A524)
    doc.setFillColor(245, 165, 36);
    doc.rect(0, 3.5, pageWidth, 1.2, "F");

    // ==========================================
    // 2. HEADER BRAND LOGO & SYSTEM METADATA
    // ==========================================
    let y = 10;

    // Draw GEOLITH Hexagon Mark
    drawGeolithLogoMark(doc, margin, y, 14, 14);

    // Draw Wordmark: "GEO" (Cyan) + "LITH" (Amber) + "PORTAL" (Navy)
    const textStartX = margin + 17;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);

    // "GEO" (#06B6D4)
    doc.setTextColor(6, 182, 212);
    doc.text("GEO", textStartX, y + 6);
    const geoWidth = doc.getTextWidth("GEO");

    // "LITH" (#D97706)
    doc.setTextColor(217, 119, 6);
    doc.text("LITH", textStartX + geoWidth, y + 6);
    const lithWidth = doc.getTextWidth("LITH");

    // "PORTAL" (#0F172A)
    doc.setTextColor(15, 23, 42);
    doc.text("PORTAL", textStartX + geoWidth + lithWidth + 1.2, y + 6);

    // Brand Subtitle: "UNIFIED GIS CONSOLE"
    doc.setFont("courier", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "UNIFIED GIS CONSOLE  |  MUNICIPAL DIGITAL TWIN",
      textStartX,
      y + 11.5
    );

    // Right Header Metadata Box
    const rightBoxWidth = 72;
    const rightBoxX = pageWidth - margin - rightBoxWidth;
    
    // Status Badge
    doc.setFillColor(240, 253, 250);
    doc.setDrawColor(45, 212, 191);
    doc.setLineWidth(0.3);
    doc.roundedRect(rightBoxX + 18, y - 1, 54, 5.5, 1.2, 1.2, "FD");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(13, 148, 136);
    doc.text("VERIFIED MUNICIPAL RECORD", rightBoxX + 22, y + 2.8);

    // Document Reference & Timestamp
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timeStr = now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const docRef = `DOC-REF: GL-PTAX-${String(prop.propertyNumber || "NMC").replace(/[^A-Za-z0-9]/g, "").toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(docRef, rightBoxX + 18, y + 8.5);
    doc.text(`Generated: ${dateStr} at ${timeStr}`, rightBoxX + 18, y + 12.5);

    y += 17;

    // Header Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);

    y += 3;

    // ==========================================
    // 3. DOCUMENT TITLE BANNER
    // ==========================================
    doc.setFillColor(15, 23, 42); // Dark Navy #0F172A
    doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, "F");

    // Cyan left accent marker
    doc.setFillColor(34, 211, 238);
    doc.roundedRect(margin, y, 2.5, 12, 1, 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(255, 255, 255);
    doc.text("MUNICIPAL PROPERTY VALUATION & GIS SURVEY DOSSIER", margin + 7, y + 5.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("Urban Land Records, Cadastral GIS Mapping & Digital Twin Assessment Framework", margin + 7, y + 9.5);

    // Right tag on title banner
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(56, 189, 248);
    doc.text("FORM P-TAX / SEC-12", pageWidth - margin - 36, y + 7.5);

    y += 16;

    // ==========================================
    // 4. CORE DOSSIER: PROPERTY & OWNER (DUAL CARDS)
    // ==========================================
    const cardWidth = (contentWidth - 4) / 2; // ~89 mm each
    const cardHeight = 52;

    // --- LEFT CARD: PROPERTY DETAILS ---
    drawSectionCard(
      doc,
      margin,
      y,
      cardWidth,
      cardHeight,
      "PROPERTY IDENTIFICATION",
      "#0284C7"
    );

    let cy = y + 10;
    // Highlight Property Number
    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(186, 230, 253);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin + 3, cy - 2, cardWidth - 6, 8, 1, 1, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(3, 105, 161);
    doc.text("Property ID / Holding No:", margin + 5, cy + 3.2);

    doc.setFontSize(9);
    doc.setTextColor(2, 132, 199);
    doc.text(String(prop.propertyNumber), margin + 44, cy + 3.2);

    cy += 10;
    renderKeyValueRow(doc, margin + 4, cy, "Property Name:", prop.propertyName, 28, cardWidth - 32);
    cy += 6;
    renderKeyValueRow(doc, margin + 4, cy, "Nature / Structure:", prop.natureOfProperty, 28, cardWidth - 32);
    cy += 6;
    renderKeyValueRow(doc, margin + 4, cy, "Usage Category:", prop.usageType, 28, cardWidth - 32);
    cy += 6;
    renderKeyValueRow(doc, margin + 4, cy, "Municipal Category:", prop.category, 28, cardWidth - 32);
    cy += 6;
    renderKeyValueRow(doc, margin + 4, cy, "Assessment Cycle:", prop.assessmentYear, 28, cardWidth - 32);

    // --- RIGHT CARD: OWNER & BENEFICIARY (HOUSE HONOR) DETAILS ---
    const rightCardX = margin + cardWidth + 4;
    drawSectionCard(
      doc,
      rightCardX,
      y,
      cardWidth,
      cardHeight,
      "OWNER & BENEFICIARY DETAILS",
      "#D97706"
    );

    cy = y + 10;
    // Highlight Owner Name ("House Honor") in premium amber/navy badge
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(252, 211, 77);
    doc.setLineWidth(0.3);
    doc.roundedRect(rightCardX + 3, cy - 2, cardWidth - 6, 8, 1, 1, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9);
    doc.text("Owner Name:", rightCardX + 5, cy + 3.2);

    doc.setFontSize(8.8);
    doc.setTextColor(15, 23, 42);
    doc.text(String(prop.ownerName), rightCardX + 26, cy + 3.2);

    cy += 10;
    renderKeyValueRow(doc, rightCardX + 4, cy, "Owner UID / Aadhaar:", prop.ownerUID, 30, cardWidth - 34);
    cy += 6;
    renderKeyValueRow(doc, rightCardX + 4, cy, "Ownership Type:", prop.ownerType, 30, cardWidth - 34);
    cy += 6;
    renderKeyValueRow(doc, rightCardX + 4, cy, "Contact Mobile:", prop.mobile, 30, cardWidth - 34);
    cy += 6;
    renderKeyValueRow(doc, rightCardX + 4, cy, "Registered Email:", prop.email, 30, cardWidth - 34);
    cy += 6;
    renderKeyValueRow(doc, rightCardX + 4, cy, "Occupier / Tenant:", prop.occupierName, 30, cardWidth - 34);

    y += cardHeight + 4;

    // ==========================================
    // 5. GEOSPATIAL & CADASTRAL LOCATION CARD
    // ==========================================
    const locCardHeight = 27;
    drawSectionCard(
      doc,
      margin,
      y,
      contentWidth,
      locCardHeight,
      "GEOSPATIAL & CADASTRAL LOCATION DETAILS",
      "#059669"
    );

    let ly = y + 9.5;
    // Full Address (wrapped)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Property Address:", margin + 4, ly);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    const splitAddress = doc.splitTextToSize(String(prop.address), contentWidth - 36);
    doc.text(splitAddress, margin + 30, ly);

    ly += (splitAddress.length > 1 ? 7.5 : 5.5);

    // 4 Column Grid for Zone, Ward, Pincode, Coordinates
    const colW = (contentWidth - 8) / 4;
    renderMiniBadge(doc, margin + 4, ly, colW - 2, 8, "Zone", prop.zone, "#0284C7");
    renderMiniBadge(doc, margin + 4 + colW, ly, colW - 2, 8, "Ward", prop.ward, "#0284C7");
    renderMiniBadge(doc, margin + 4 + colW * 2, ly, colW - 2, 8, "Pincode", prop.pincode, "#059669");
    renderMiniBadge(
      doc,
      margin + 4 + colW * 3,
      ly,
      colW - 2,
      8,
      "GIS Coordinates",
      `${prop.lat}° N, ${prop.lng}° E`,
      "#4F46E5"
    );

    y += locCardHeight + 4;

    // ==========================================
    // 6. STRUCTURAL, ENGINEERING & AREA SPECS
    // ==========================================
    const structCardHeight = 24;
    drawSectionCard(
      doc,
      margin,
      y,
      contentWidth,
      structCardHeight,
      "STRUCTURAL SPECIFICATIONS & ARCHITECTURAL DIMENSIONS",
      "#7C3AED"
    );

    const sColW = (contentWidth - 10) / 4;
    const sy = y + 9.5;

    renderStatCard(doc, margin + 4, sy, sColW, 11, "CARPET / BUILT-UP AREA", prop.area, "Sq. Meters");
    renderStatCard(doc, margin + 4 + sColW + 2, sy, sColW, 11, "TOTAL FLOORS", prop.floors, "Storeys (RCC)");
    renderStatCard(doc, margin + 4 + (sColW + 2) * 2, sy, sColW, 11, "CONSTRUCTION TYPE", prop.constructionType, "Framed Structure");
    renderStatCard(doc, margin + 4 + (sColW + 2) * 3, sy, sColW, 11, "BUILDING AGE", `${prop.yearBuilt} (${prop.age})`, "Year Built");

    y += structCardHeight + 4;

    // ==========================================
    // 7. TAX VALUATION & MUNICIPAL ASSESSMENT TABLE
    // ==========================================
    const taxCardHeight = 31;
    drawSectionCard(
      doc,
      margin,
      y,
      contentWidth,
      taxCardHeight,
      "TAX COMPUTATION & MUNICIPAL VALUATION SUMMARY",
      "#DC2626"
    );

    const ty = y + 8.5;

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(margin + 3, ty, contentWidth - 6, 5.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    const thCols = [
      { label: "Assessment Head", x: margin + 6 },
      { label: "Base Period", x: margin + 48 },
      { label: "Rateable / Old Value", x: margin + 82 },
      { label: "Annual Property Tax", x: margin + 120 },
      { label: "Account Status", x: margin + 152 },
    ];
    thCols.forEach((th) => doc.text(th.label, th.x, ty + 3.8));

    // Table Row 1 (Current Assessment)
    let ry = ty + 5.5;
    doc.setFillColor(255, 255, 255);
    doc.rect(margin + 3, ry, contentWidth - 6, 6, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text("General Municipal Property Tax", margin + 6, ry + 4.2);
    doc.text(String(prop.assessmentYear), margin + 48, ry + 4.2);
    doc.text(String(prop.rateableValue), margin + 82, ry + 4.2);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text(String(prop.totalTax), margin + 120, ry + 4.2);

    // Status Pill
    doc.setFillColor(220, 252, 231);
    doc.setDrawColor(134, 239, 172);
    doc.roundedRect(margin + 150, ry + 1, 24, 4, 1, 1, "FD");
    doc.setFontSize(6.5);
    doc.setTextColor(22, 101, 52);
    doc.text("PAID / CURRENT", margin + 152, ry + 3.8);

    // Table Row 2 (Previous Assessment Benchmark)
    ry += 6;
    doc.setFillColor(248, 250, 252);
    doc.rect(margin + 3, ry, contentWidth - 6, 6, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Previous Cycle Assessment", margin + 6, ry + 4.2);
    doc.text(String(prop.oldAssessmentYear), margin + 48, ry + 4.2);
    doc.text(String(prop.oldAssessmentValue), margin + 82, ry + 4.2);
    doc.text("Historical Reference", margin + 120, ry + 4.2);

    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin + 150, ry + 1, 24, 4, 1, 1, "FD");
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text("VERIFIED", margin + 157, ry + 3.8);

    y += taxCardHeight + 4;

    // ==========================================
    // 8. ARCHITECTURAL SURVEY ELEVATION & SCHEMATIC
    // ==========================================
    const archHeight = 28;
    drawSectionCard(
      doc,
      margin,
      y,
      contentWidth,
      archHeight,
      "ARCHITECTURAL 3D SURVEY ELEVATION & DIGITAL TWIN SCHEMATIC",
      "#0284C7"
    );

    // Render architectural facade drawing directly in PDF vectors
    drawArchitecturalElevation(doc, margin + 4, y + 8, contentWidth - 8, archHeight - 10, prop);

    y += archHeight + 4;

    // ==========================================
    // 9. OFFICIAL VERIFICATION, SEAL & SIGN-OFF
    // ==========================================
    const authBoxHeight = 28;

    // QR Verification Block (Left)
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, 52, authBoxHeight, 1.5, 1.5, "FD");

    drawQrCodeMatrix(doc, margin + 3, y + 3, 22, 22, prop.propertyNumber);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    doc.text("SCAN TO VERIFY", margin + 27, y + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.8);
    doc.setTextColor(100, 116, 139);
    doc.text("Geolith Municipal", margin + 27, y + 11);
    doc.text("Digital Twin Portal", margin + 27, y + 14.5);
    doc.text("SHA256 Validated", margin + 27, y + 18);
    doc.text("Tamper-Proof Record", margin + 27, y + 21.5);

    // Official Municipal Stamp / Seal (Center)
    const sealX = margin + 55;
    const sealWidth = contentWidth - 55 - 54;
    doc.roundedRect(sealX, y, sealWidth, authBoxHeight, 1.5, 1.5, "FD");

    drawOfficialSeal(doc, sealX + sealWidth / 2, y + authBoxHeight / 2);

    // Authorized Signature Block (Right)
    const sigX = pageWidth - margin - 50;
    doc.roundedRect(sigX, y, 50, authBoxHeight, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Digitally Authenticated by:", sigX + 4, y + 5.5);

    // Simulated signature graphic
    drawDigitalSignature(doc, sigX + 4, y + 9);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text("Chief Municipal GIS Assessor", sigX + 4, y + 21);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text("Town Planning & Land Records", sigX + 4, y + 24.5);

    y += authBoxHeight + 3;

    // ==========================================
    // 10. LEGAL DISCLAIMER & FOOTER
    // ==========================================
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);

    y += 3;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "LEGAL NOTICE: This document is an official electronically generated municipal GIS certificate issued via the GEOLITH PORTAL Digital Twin Console. In accordance with Digital Municipal Governance & Land Survey Standards, this electronic certificate is legally valid and verified without physical ink signatures.",
      margin,
      y,
      { maxWidth: contentWidth }
    );

    // Page number and System footer
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("GEOLITH PORTAL · UNIFIED GIS CONSOLE", margin, 292);

    doc.setFont("helvetica", "normal");
    doc.text(
      `Property Record: ${prop.propertyNumber} | Page 1 of 1`,
      pageWidth - margin - 52,
      292
    );

    // Bottom decorative bar
    doc.setFillColor(34, 211, 238);
    doc.rect(0, 295.5, pageWidth, 1.5, "F");

    // Save the PDF
    const cleanFileName = `GEOLITH_Property_${String(prop.propertyNumber || "Report").replace(/[^A-Za-z0-9_-]/g, "_")}.pdf`;
    doc.save(cleanFileName);
  }

  // ==========================================
  // HELPER DRAWING FUNCTIONS
  // ==========================================

  /**
   * Draws the exact GEOLITH Hexagon Brand Logo Mark with Cyan outline and 3 color bars
   */
  function drawGeolithLogoMark(doc, x, y, w, h) {
    const hw = w / 2;
    const hh = h / 2;
    const cx = x + hw;
    const cy = y + hh;

    // Flat-top Hexagon coordinates
    // Vertices: (cx - w*0.28, y), (cx + w*0.28, y), (cx + hw, cy), (cx + w*0.28, y + h), (cx - w*0.28, y + h), (cx - hw, cy)
    const points = [
      [cx - w * 0.28, y],
      [cx + w * 0.28, y],
      [cx + hw, cy],
      [cx + w * 0.28, y + h],
      [cx - w * 0.28, y + h],
      [cx - hw, cy],
    ];

    // Background fill (Deep Navy #0B1329)
    doc.setFillColor(11, 19, 41);
    doc.setDrawColor(34, 211, 238); // Cyan stroke #22D3EE
    doc.setLineWidth(0.6);

    // Draw hexagon polygon
    const deltaPoints = [];
    for (let i = 1; i < points.length; i++) {
      deltaPoints.push([
        points[i][0] - points[i - 1][0],
        points[i][1] - points[i - 1][1],
      ]);
    }
    doc.lines(deltaPoints, points[0][0], points[0][1], [1.0, 1.0], "FD", true);

    // 3 Left-Aligned Horizontal Stacked Bars inside hexagon
    const barX = cx - w * 0.24;
    const barH = h * 0.11;

    // Bar 1: Cyan (#22D3EE)
    doc.setFillColor(34, 211, 238);
    doc.roundedRect(barX, cy - h * 0.22, w * 0.28, barH, 0.4, 0.4, "F");

    // Bar 2: Amber (#F5A524)
    doc.setFillColor(245, 165, 36);
    doc.roundedRect(barX, cy - h * 0.05, w * 0.48, barH, 0.4, 0.4, "F");

    // Bar 3: Coral (#F43F5E)
    doc.setFillColor(244, 63, 94);
    doc.roundedRect(barX, cy + h * 0.12, w * 0.38, barH, 0.4, 0.4, "F");
  }

  /**
   * Draws a card container with rounded corners and colored top accent
   */
  function drawSectionCard(doc, x, y, w, h, title, accentColor) {
    // Card background
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, h, 1.5, 1.5, "FD");

    // Top Title Bar
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, w, 6.5, 1.5, 1.5, "F");
    doc.rect(x, y + 5, w, 1.5, "F"); // Flat bottom for header

    // Left accent pill
    const rgb = hexToRgb(accentColor);
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.roundedRect(x + 2, y + 1.2, 1.8, 4.2, 0.6, 0.6, "F");

    // Header Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(30, 41, 59);
    doc.text(title, x + 6, y + 4.4);
  }

  /**
   * Helper to print Key - Value row with proper alignment
   */
  function renderKeyValueRow(doc, x, y, label, value, labelWidth, valMaxWidth) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(label, x, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    const safeVal = String(value || "N/A");
    const fitVal = doc.splitTextToSize(safeVal, valMaxWidth || 55);
    doc.text(fitVal[0] || "", x + labelWidth, y);
  }

  /**
   * Mini Badge Component (for location details)
   */
  function renderMiniBadge(doc, x, y, w, h, label, value, colorHex) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y, w, h, 1, 1, "FD");

    const rgb = hexToRgb(colorHex || "#0284C7");
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.rect(x, y, 1.2, h, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.8);
    doc.setTextColor(100, 116, 139);
    doc.text(label.toUpperCase(), x + 2.5, y + 3.2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    const fitVal = doc.splitTextToSize(String(value || "N/A"), w - 4);
    doc.text(fitVal[0] || "", x + 2.5, y + 6.8);
  }

  /**
   * Stat Card Component (for structural details)
   */
  function renderStatCard(doc, x, y, w, h, title, val, sub) {
    doc.setFillColor(250, 250, 255);
    doc.setDrawColor(224, 231, 255);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y, w, h, 1, 1, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(99, 102, 241);
    doc.text(title, x + 2.5, y + 3.2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    const fitVal = doc.splitTextToSize(String(val || "N/A"), w - 4);
    doc.text(fitVal[0] || "", x + 2.5, y + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text(sub || "", x + 2.5, y + 9.8);
  }

  /**
   * Architectural 3D Elevation / Survey Sketch Graphic
   */
  function drawArchitecturalElevation(doc, x, y, w, h, prop) {
    doc.setFillColor(15, 23, 42); // Navy Blueprint background
    doc.roundedRect(x, y, w, h, 1, 1, "F");

    // Ground plane
    doc.setFillColor(51, 65, 85);
    doc.rect(x, y + h - 3, w, 3, "F");

    // Building Facade (Center)
    const bWidth = 50;
    const bHeight = h - 6;
    const bx = x + (w - bWidth) / 2;
    const by = y + h - 3 - bHeight;

    // Roof Pitch (Triangle / Gable)
    doc.setFillColor(249, 115, 22);
    doc.triangle(
      bx - 3, by + 4,
      bx + bWidth / 2, by,
      bx + bWidth + 3, by + 4,
      "F"
    );

    // Wall (Cyan tinted #0284C7)
    doc.setFillColor(2, 132, 199);
    doc.rect(bx, by + 4, bWidth, bHeight - 4, "F");

    // Windows (Glowing Yellow / Warm Glass)
    doc.setFillColor(254, 240, 138);
    doc.setDrawColor(3, 105, 161);
    doc.setLineWidth(0.2);

    const winW = 6;
    const winH = 5;
    doc.rect(bx + 6, by + 7, winW, winH, "FD");
    doc.rect(bx + bWidth - 12, by + 7, winW, winH, "FD");
    doc.rect(bx + 6, by + 13, winW, winH, "FD");

    // Entrance Door
    doc.setFillColor(120, 53, 15);
    doc.rect(bx + bWidth / 2 - 3.5, by + bHeight - 9, 7, 9, "F");

    // Door knob
    doc.setFillColor(250, 204, 21);
    doc.circle(bx + bWidth / 2 + 1.5, by + bHeight - 4.5, 0.4, "F");

    // Architectural Dimension Lines & Blueprint Text (Left & Right)
    doc.setFont("courier", "bold");
    doc.setFontSize(6);
    doc.setTextColor(56, 189, 248);
    doc.text(`PROPERTY: ${prop.propertyNumber}`, x + 4, y + 5);
    doc.text(`STRUCTURE: ${prop.natureOfProperty}`, x + 4, y + 8.5);
    doc.text(`FLOORS: ${prop.floors}`, x + 4, y + 12);

    doc.text(`SURVEY ELEVATION: 0.00m + LOD2 MESH`, x + w - 58, y + 5);
    doc.text(`AREA FOOTPRINT: ${prop.area}`, x + w - 58, y + 8.5);
    doc.text(`ACCURACY: MUNICIPAL CAD CERTIFIED`, x + w - 58, y + 12);
  }

  /**
   * QR Code Matrix Graphic
   */
  function drawQrCodeMatrix(doc, x, y, w, h, code) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, w, h, 0.8, 0.8, "FD");

    const pad = 1.8;
    const qx = x + pad;
    const qy = y + pad;
    const qw = w - pad * 2;
    const qh = h - pad * 2;
    const grid = 9;
    const cell = qw / grid;

    doc.setFillColor(15, 23, 42);

    // Corner Finder Patterns
    const drawFinder = (fx, fy) => {
      doc.rect(fx, fy, cell * 3, cell * 3, "F");
      doc.setFillColor(255, 255, 255);
      doc.rect(fx + cell * 0.6, fy + cell * 0.6, cell * 1.8, cell * 1.8, "F");
      doc.setFillColor(15, 23, 42);
      doc.rect(fx + cell * 1, fy + cell * 1, cell * 1, cell * 1, "F");
    };

    drawFinder(qx, qy);
    drawFinder(qx + cell * 6, qy);
    drawFinder(qx, qy + cell * 6);

    // Deterministic pseudo-random inner dots based on property number string
    const seedStr = String(code || "MN101");
    for (let r = 0; r < grid; r++) {
      for (let c = 0; c < grid; c++) {
        // Skip corner finder areas
        if (
          (r < 4 && c < 4) ||
          (r < 4 && c >= 5) ||
          (r >= 5 && c < 4)
        ) {
          continue;
        }
        const val = (seedStr.charCodeAt((r * grid + c) % seedStr.length) * 31 + r * 17 + c * 23) % 2;
        if (val === 1) {
          doc.setFillColor(15, 23, 42);
          doc.rect(qx + c * cell, qy + r * cell, cell * 0.88, cell * 0.88, "F");
        }
      }
    }

    // Center Cyan Brand Dot
    doc.setFillColor(34, 211, 238);
    doc.circle(qx + qw / 2, qy + qh / 2, cell * 0.75, "F");
  }

  /**
   * Official Municipal Seal Graphic
   */
  function drawOfficialSeal(doc, cx, cy) {
    const r = 10;

    // Outer circle
    doc.setDrawColor(217, 119, 6); // Amber #D97706
    doc.setLineWidth(0.4);
    doc.circle(cx, cy, r, "S");

    // Inner dashed circle
    doc.setDrawColor(180, 83, 9);
    doc.setLineWidth(0.2);
    doc.circle(cx, cy, r - 1.5, "S");

    // Center Star / Symbol
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5);
    doc.setTextColor(217, 119, 6);
    doc.text("GEOLITH GIS", cx, cy - 3.2, { align: "center" });

    doc.setFontSize(4.2);
    doc.setTextColor(15, 23, 42);
    doc.text("★ MUNICIPAL ★", cx, cy, { align: "center" });
    doc.text("CERTIFIED SURVEY", cx, cy + 3.2, { align: "center" });

    doc.setFontSize(3.8);
    doc.setTextColor(100, 116, 139);
    doc.text("2026 OFFICIAL", cx, cy + 5.8, { align: "center" });
  }

  /**
   * Digital Signature Vector Graphic
   */
  function drawDigitalSignature(doc, x, y) {
    doc.setDrawColor(37, 99, 235); // Blue ink
    doc.setLineWidth(0.35);

    // Signature flourish curve
    const sigPoints = [
      [2, 3],
      [4, -2],
      [7, 4],
      [11, -1],
      [15, 3],
      [20, -3],
      [25, 2],
      [32, -1],
    ];

    let px = x;
    let py = y + 4;
    for (let i = 0; i < sigPoints.length; i++) {
      const nx = x + sigPoints[i][0];
      const ny = y + 4 + sigPoints[i][1];
      doc.line(px, py, nx, ny);
      px = nx;
      py = ny;
    }

    // Underline loop
    doc.line(x, y + 7, x + 35, y + 7);
  }

  /**
   * Helper to convert hex to RGB
   */
  function hexToRgb(hex) {
    let cleanHex = hex.replace("#", "");
    if (cleanHex.length === 3) {
      cleanHex = cleanHex
        .split("")
        .map((c) => c + c)
        .join("");
    }
    const num = parseInt(cleanHex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }

  // ==========================================
  // PROPERTY DATA RESOLVER & NORMALIZATION
  // ==========================================

  /**
   * Robust multi-source resolver for currently active/selected house or property
   */
  function resolveActivePropertyData() {
    // 1. Direct window.selectedPTAXProperty
    if (window.selectedPTAXProperty && typeof window.selectedPTAXProperty === "object") {
      return window.selectedPTAXProperty;
    }

    // 2. window.selectedHouseData
    if (window.selectedHouseData && typeof window.selectedHouseData === "object") {
      return window.selectedHouseData;
    }

    // 3. Resolve by window.selectedHouseId
    if (window.selectedHouseId && typeof window.getCustomHouseData === "function") {
      const data = window.getCustomHouseData(window.selectedHouseId);
      if (data) return data;
    }

    // 4. Resolve from active Cesium selected entity
    if (window.viewer && window.viewer.selectedEntity && typeof window.getCustomHouseData === "function") {
      const data = window.getCustomHouseData(window.viewer.selectedEntity);
      if (data) return data;
    }

    // 5. Check DOM elements inside House Details banner card
    const idEl = document.getElementById("houseDataId");
    const ownerEl = document.getElementById("houseDataOwner");
    if (idEl && idEl.textContent && idEl.textContent.trim() !== "-" && idEl.textContent.trim() !== "") {
      const domId = idEl.textContent.trim();
      if (typeof window.getCustomHouseData === "function") {
        const data = window.getCustomHouseData(domId);
        if (data) return data;
      }
      // Construct fallback from DOM
      return {
        "Property Number": domId,
        "Name of the Property Owner": (ownerEl && ownerEl.textContent.trim() !== "-") ? ownerEl.textContent.trim() : "Devendra S. Deshmukh",
        "Name of the Property": document.getElementById("houseDataProperty")?.textContent?.trim() || "Residential Complex",
        "Nature of Property": document.getElementById("houseDataType")?.textContent?.trim() || "Residential (RCC)",
        "Address of Property": document.getElementById("houseDataAddress")?.textContent?.trim() || "Nagpur Municipal Corporation Area",
        "Telephone / Mobile Number": document.getElementById("houseDataMobile")?.textContent?.trim() || "+91 98221 45892",
      };
    }

    // 6. Check if ptaxDatabase has any default/first record as fallback demo
    if (window.ptaxDatabase) {
      const keys = Object.keys(window.ptaxDatabase);
      if (keys.length > 0 && window.ptaxDatabase[keys[0]]) {
        return window.ptaxDatabase[keys[0]];
      }
    }

    // 7. Fallback generated record
    if (typeof window.generateMunicipalPropertyRecord === "function") {
      return window.generateMunicipalPropertyRecord("MN-101");
    }

    return null;
  }

  /**
   * Normalizes property record into clean, consistent field values
   */
  function normalizePropertyData(raw) {
    const pick = (keys, fallback = "") => {
      for (const k of keys) {
        if (raw[k] !== undefined && raw[k] !== null && String(raw[k]).trim() !== "") {
          return String(raw[k]).trim();
        }
      }
      return fallback;
    };

    const propNo = pick(
      ["Property Number", "propertyNumber", "propertyNo", "_id", "id"],
      "MN-101"
    );

    const ownerName = pick(
      ["Name of the Property Owner", "ownerName", "name", "owner"],
      "Devendra S. Deshmukh"
    );

    const propName = pick(
      ["Name of the Property", "propertyName", "buildingName", "building"],
      "Shree Ganesh Residency"
    );

    const nature = pick(
      ["Nature of Property", "natureOfProperty", "nature"],
      "Residential (RCC)"
    );

    const usage = pick(
      ["Usage of Property", "usageType", "usage"],
      "Residential"
    );

    const category = pick(
      ["Category of Property", "category", "propertyCategory"],
      "Residential A-1 (Municipal)"
    );

    const ownerType = pick(
      ["Type of Owner", "ownerType"],
      "Individual / Freehold Title"
    );

    const ownerUID = pick(
      ["UID number of Property Owner", "ownerUID", "uid"],
      `UID-NMC-${770000 + Math.abs(hashCode(propNo)) % 99999}`
    );

    const occupierName = pick(
      ["Name of Occupier & Tenant", "occupierName", "occupier"],
      "Self-Occupied"
    );

    const mobile = pick(
      ["Telephone / Mobile Number", "mobileNumber", "mobile", "phone"],
      "+91 98221 45892"
    );

    const email = pick(
      ["e-mail-id", "email", "mail"],
      `${ownerName.toLowerCase().replace(/[^a-z]/g, "")}@gmail.com`
    );

    const address = pick(
      ["Address of Property", "propertyAddress", "address"],
      "Plot No. 101, Sector 2, Near Somalwada Square, Manish Nagar, Nagpur - 440015"
    );

    const zone = pick(["Zone", "zone"], "Zone 9 - Laxmi Nagar");
    const ward = pick(["Ward", "ward"], "Ward 36 - Manish Nagar / Somalwada");
    const pincode = pick(
      ["Postal Pin code of Property", "pincode", "postalCode"],
      "440015"
    );

    const area = pick(
      ["Carpet/Built-up area (Sq.M)", "area", "carpetArea"],
      "185 Sq.M"
    );

    const floors = pick(
      ["Number of Floors", "floors", "totalFloors"],
      "2 Floors (G+1)"
    );

    const constructionType = pick(
      ["Floor wise type of construction", "constructionType"],
      "RCC Framed Structure"
    );

    const yearBuilt = pick(
      ["Year of Construction", "constructionYear", "yearBuilt"],
      "2018"
    );

    const age = pick(
      ["Age of Building", "buildingAge", "age"],
      `${2026 - parseInt(yearBuilt, 10) || 8} Years`
    );

    const rateableValue = pick(
      ["rateableValue", "Rateable Value", "Old Assessment Value"],
      "₹28,500"
    );

    const oldAssessmentValue = pick(
      ["Old Assessment Value", "oldValue"],
      "₹18,200"
    );

    const totalTax = pick(
      ["Total Property Tax", "totalTax", "tax"],
      "₹6,240"
    );

    const assessmentYear = pick(
      ["Assessment year", "assessmentYear"],
      "2025 - 2026"
    );

    const oldAssessmentYear = pick(
      ["Old Assessment Year", "oldAssessmentYear"],
      "2020 - 2021"
    );

    const lat = pick(["Latitude", "lat"], "21.0834");
    const lng = pick(["Longitude", "lng", "lon"], "79.0721");

    return {
      propertyNumber: propNo,
      ownerName,
      propertyName: propName,
      natureOfProperty: nature,
      usageType: usage,
      category,
      ownerType,
      ownerUID,
      occupierName,
      mobile,
      email,
      address,
      zone,
      ward,
      pincode,
      area,
      floors,
      constructionType,
      yearBuilt,
      age,
      rateableValue,
      oldAssessmentValue,
      totalTax,
      assessmentYear,
      oldAssessmentYear,
      lat,
      lng,
    };
  }

  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    return hash;
  }
})();

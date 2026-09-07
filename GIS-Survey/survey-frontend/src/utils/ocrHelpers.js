import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const OCR_PAGE_LIMIT = 2;

export function normalizeOcrText(text) {
  return String(text || "")
    .replace(/\n+/g, "\n")
    .replace(/\n/g, " \n")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractLabeledValue(text, labelPatterns, allLabelPatterns) {
  const normalizedText = normalizeOcrText(text);
  let bestMatch = null;

  for (const pattern of labelPatterns) {
    const match = normalizedText.match(pattern);
    if (match && typeof match.index === "number") {
      const labelEndIndex = match.index + match[0].length;
      if (!bestMatch || match.index < bestMatch.index || (match.index === bestMatch.index && labelEndIndex > bestMatch.labelEndIndex)) {
        bestMatch = {
          index: match.index,
          labelEndIndex
        };
      }
    }
  }

  if (!bestMatch) {
    return "";
  }

  let nextLabelIndex = normalizedText.length;
  for (const pattern of allLabelPatterns) {
    const nextMatch = normalizedText.slice(bestMatch.labelEndIndex).match(pattern);
    if (nextMatch && typeof nextMatch.index === "number") {
      const absoluteIndex = bestMatch.labelEndIndex + nextMatch.index;
      if (absoluteIndex < nextLabelIndex) {
        nextLabelIndex = absoluteIndex;
      }
    }
  }

  return normalizedText
    .slice(bestMatch.labelEndIndex, nextLabelIndex)
    .replace(/^[:\-\s]+/, "")
    .replace(/[|]+$/g, "")
    .trim();
}

export function formatFileSize(sizeInBytes) {
  if (!sizeInBytes && sizeInBytes !== 0) return "";
  if (sizeInBytes < 1024) return `${sizeInBytes} B`;
  if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function ocrCanvas(input) {
  // Accept either a canvas element, an Image, or a File/Blob
  async function toCanvas(src) {
    if (!src) return null;
    if (typeof HTMLCanvasElement !== 'undefined' && src instanceof HTMLCanvasElement) return src;
    if (typeof HTMLImageElement !== 'undefined' && src instanceof HTMLImageElement) {
      const c = document.createElement('canvas');
      c.width = src.width;
      c.height = src.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(src, 0, 0);
      return c;
    }
    // assume File/Blob -> use preprocess to get dataURL and draw
    try {
      const dataUrl = await preprocessFileToDataUrl(src);
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = dataUrl;
      });
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      return c;
    } catch (e) {
      return null;
    }
  }

  const baseCanvas = await toCanvas(input);
  if (!baseCanvas) return '';

  const scales = [1, 1.5, 2, 3];
  const worker = await createWorker("eng");
  try {
    let best = { text: '', score: -Infinity };

    for (const s of scales) {
      // don't upscale beyond reasonable size
      const w = Math.round(baseCanvas.width * s);
      const h = Math.round(baseCanvas.height * s);
      const c = document.createElement('canvas');
      c.width = Math.max(1, w);
      c.height = Math.max(1, h);
      const ctx = c.getContext('2d');
      ctx.drawImage(baseCanvas, 0, 0, baseCanvas.width, baseCanvas.height, 0, 0, c.width, c.height);

      try {
        const result = await worker.recognize(c);
        const txt = (result?.data?.text || '').trim();
        const words = (result?.data?.words || []);
        const avgConf = words.length ? (words.reduce((a, b) => a + (b.confidence || 0), 0) / words.length) : 0;
        // scoring: favour longer results and higher confidence
        const score = avgConf * Math.log(1 + txt.length);
        if (score > best.score) best = { text: txt, score };
      } catch (e) {
        // ignore and continue with next scale
      }
    }

    return best.text || '';
  } finally {
    try { await worker.terminate(); } catch (e) {}
  }
}

export async function extractTextFromImageFile(file) {
  // Try client-side Tesseract first (fast for printed text)
  try {
    const text = await ocrCanvas(file);
    if (text && text.trim().length > 25) return text;
  } catch (err) {
    // No HTR fallback configured — return empty so caller continues with printed OCR only
    console.warn('Tesseract OCR failed or returned short text; HTR fallback removed:', err);
    return '';
  }
}

// Preprocess an input File to a cleaned data URL for improved OCR/HTR
async function preprocessFileToDataUrl(file) {
  const img = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // create canvas and upscale moderately for better recognition
  const maxDim = Math.max(img.width, img.height);
  const scale = Math.min(2, Math.max(1, 1000 / Math.max(maxDim, 1)));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // basic contrast and brightness adjustment + grayscale
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const contrast = 1.25; // increase contrast slightly
  const brightness = 0; // no change
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let v = data[i + c];
      v = (v - 128) * contrast + 128 + brightness;
      data[i + c] = Math.max(0, Math.min(255, v));
    }
    // convert to grayscale in-place
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    data[i] = data[i + 1] = data[i + 2] = lum;
  }
  ctx.putImageData(imageData, 0, 0);

  // simple global thresholding to binarize
  const imgData2 = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let sum = 0;
  for (let i = 0; i < imgData2.data.length; i += 4) sum += imgData2.data[i];
  const avg = sum / (imgData2.data.length / 4 || 1);
  const threshold = Math.max(120, Math.min(200, avg - 10));
  for (let i = 0; i < imgData2.data.length; i += 4) {
    const v = imgData2.data[i] < threshold ? 0 : 255;
    imgData2.data[i] = imgData2.data[i + 1] = imgData2.data[i + 2] = v;
  }
  ctx.putImageData(imgData2, 0, 0);

  return canvas.toDataURL('image/png');
}

function getDocumentTextFromPdf(pdfDocument, pageLimit = OCR_PAGE_LIMIT) {
  return new Promise(async (resolve, reject) => {
    try {
      const pageCount = Math.min(pdfDocument.numPages, pageLimit);
      let combinedText = "";

      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        const page = await pdfDocument.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(" ").trim();
        combinedText += `${pageText}\n`;
      }

      resolve(combinedText.trim());
    } catch (error) {
      reject(error);
    }
  });
}

export async function extractTextFromPdfFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true }).promise;

  const textContent = await getDocumentTextFromPdf(pdfDocument);
  if (textContent && textContent.length > 25) {
    return textContent;
  }

  const page = await pdfDocument.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: context, viewport }).promise;
  try {
    const text = await ocrCanvas(canvas);
    if (text && text.trim().length > 25) return text;
  } catch (err) {
    console.warn('PDF canvas Tesseract failed, falling back to HTR', err);
  }

  // Fallback to backend HTR: send canvas as data URL
  try {
    const dataUrl = canvas.toDataURL('image/png');
    const resp = await fetch('/api/ocr/recognize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: dataUrl })
    });
    if (!resp.ok) return '';
    const json = await resp.json();
    return json.text || '';
  } catch (err) {
    console.error('Failed to call backend HTR for PDF page:', err);
    return '';
  }
}

export async function extractLocalDocumentText(file) {
  const mimeType = file.type || "";
  const isPdf = mimeType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    return extractTextFromPdfFile(file);
  }

  return extractTextFromImageFile(file);
}

// (No apiUrl helper here; dev server proxy handles /api requests.)

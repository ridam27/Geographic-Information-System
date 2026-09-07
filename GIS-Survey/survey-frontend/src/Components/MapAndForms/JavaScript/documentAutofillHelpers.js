import { useRef, useState } from "react";
import { X, UploadCloud, Sparkles } from "lucide-react";
import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// last per-field OCR debug info (candidates per field)
let lastCropDebug = {};

export function mergeDraftValues(previousState, draft = {}) {
  const nextState = { ...previousState };

  Object.entries(draft).forEach(([fieldName, value]) => {
    const hasValue =
      value !== undefined &&
      value !== null &&
      !(typeof value === "string" && value.trim() === "");

    if (hasValue) {
      nextState[fieldName] = value;
    }
  });

  return nextState;
}

export function formatFileSize(sizeInBytes) {
  if (!sizeInBytes && sizeInBytes !== 0) return "";
  if (sizeInBytes < 1024) return `${sizeInBytes} B`;
  if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

const DOCUMENT_BOUNDARY_PATTERNS = [
  /owner\s*name/i,
  /occupier\s*name/i,
  /address/i,
  /mobile/i,
  /phone/i,
  /ward/i,
  /zone/i,
  /new\s*property\s*no\.?/i,
  /old\s*property\s*no\.?/i,
  /property\s*no\.?/i,
  /property\s*number/i,
  /usage\s*type/i,
  /construction\s*type/i,
  /construction\s*year/i,
  /year\s*of\s*construction/i,
  /area/i,
  /built\s*up\s*area/i,
  /rate/i,
  /taxable\s*value/i,
  /proposed\s*tax/i,
  /notice\s*date/i,
  /notice\s*reason/i,
  /appeal\s*reason/i,
  /reason\s*for\s*appeal/i,
  /hearing\s*date/i,
  /date\s*of\s*hearing/i,
  /hearing\s*time/i,
  /hearing\s*location/i,
  /location/i
];

function normalizeOcrText(text) {
  return String(text || "")
    .replace(/\r/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLabelToken(token) {
  return String(token || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function areLabelTokensSimilar(a, b) {
  const ta = normalizeLabelToken(a);
  const tb = normalizeLabelToken(b);
  if (!ta || !tb) return false;
  if (ta === tb) return true;
  if (ta.includes(tb) || tb.includes(ta)) {
    return Math.abs(ta.length - tb.length) <= 2;
  }
  const maxDiff = Math.max(1, Math.floor(Math.min(ta.length, tb.length) / 4));
  let diff = 0;
  const len = Math.max(ta.length, tb.length);
  for (let i = 0; i < len; i += 1) {
    if (ta[i] !== tb[i]) diff += 1;
    if (diff > maxDiff) return false;
  }
  return diff <= maxDiff;
}

function patternToLabelTokens(pattern) {
  const source = String(pattern.source || pattern);
  const cleaned = source
    .replace(/\\s\*/g, " ")
    .replace(/\\s\+/g, " ")
    .replace(/\\b/g, " ")
    .replace(/\\d\+/g, " ")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim();
  return cleaned.split(/\s+/).filter(Boolean);
}

function findLabelSequence(normalizedText, patternTokens) {
  const tokenMatches = [...normalizedText.matchAll(/\S+/g)].map((match) => ({
    text: match[0],
    start: match.index,
    end: match.index + match[0].length,
    normalized: normalizeLabelToken(match[0])
  }));

  for (let i = 0; i < tokenMatches.length; i += 1) {
    let j = 0;
    let lastEnd = tokenMatches[i].end;
    for (let k = i; k < tokenMatches.length && j < patternTokens.length; k += 1) {
      if (areLabelTokensSimilar(patternTokens[j], tokenMatches[k].normalized)) {
        lastEnd = tokenMatches[k].end;
        j += 1;
      } else {
        break;
      }
    }
    if (j === patternTokens.length) {
      return { index: tokenMatches[i].start, labelEndIndex: lastEnd };
    }
  }
  return null;
}

function extractSectionValue(text, labelPatterns, allLabelPatterns) {
  const normalizedText = normalizeOcrText(text);
  let bestMatch = null;

  for (const pattern of labelPatterns) {
    const match = normalizedText.match(pattern);
    if (match && typeof match.index === "number") {
      const labelEndIndex = match.index + match[0].length;
      if (
        !bestMatch ||
        match.index < bestMatch.index ||
        (match.index === bestMatch.index && labelEndIndex > bestMatch.labelEndIndex)
      ) {
        bestMatch = {
          index: match.index,
          labelEndIndex
        };
      }
    }
  }

  if (!bestMatch) {
    for (const pattern of labelPatterns) {
      const patternTokens = patternToLabelTokens(pattern);
      if (!patternTokens.length) continue;
      const fuzzyMatch = findLabelSequence(normalizedText, patternTokens);
      if (fuzzyMatch) {
        if (
          !bestMatch ||
          fuzzyMatch.index < bestMatch.index ||
          (fuzzyMatch.index === bestMatch.index && fuzzyMatch.labelEndIndex > bestMatch.labelEndIndex)
        ) {
          bestMatch = fuzzyMatch;
        }
      }
    }
  }

  if (!bestMatch) return "";

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

  const rawValue = normalizedText
    .slice(bestMatch.labelEndIndex, nextLabelIndex)
    .replace(/^[:\-\s]+/, "")
    .replace(/[|]+$/g, "")
    .trim();
  return looksLikeLabelOnly(rawValue) ? "" : rawValue;
}

const LABEL_ONLY_WORDS = new Set([
  'owner','occupier','name','ward','zone','property','no','number','old','new',
  'taxable','value','proposed','tax','notice','date','of','the','and','address',
  'usage','construction','year','area','rate','mobile','phone','location','reason',
  'hearing','venue','assessment','notice','proposed','taxable'
]);

function looksLikeLabelOnly(text) {
  if (!text) return false;
  const tokens = String(text || '')
    .replace(/[:\-\|]+/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return false;

  const labelTokens = tokens.filter((t) => LABEL_ONLY_WORDS.has(t));
  const numericTokens = tokens.filter((t) => /^\d+$/.test(t));
  const nonLabelNonNumericTokens = tokens.filter((t) => !LABEL_ONLY_WORDS.has(t) && !/^\d+$/.test(t));

  if (nonLabelNonNumericTokens.length > 0) return false;
  if (numericTokens.length > 0 && tokens.length <= 3) return false;

  return labelTokens.length >= Math.max(2, Math.floor(tokens.length * 0.7));
}

function postProcessValue(value, fieldDefinition = {}) {
  const candidate = String(value || "").trim();
  if (!candidate) return "";
  if (looksLikeLabelOnly(candidate)) return "";

  if (fieldDefinition.valuePattern) {
    const matchedValue = candidate.match(fieldDefinition.valuePattern);
    if (matchedValue && matchedValue[1]) {
      return String(matchedValue[1]).trim();
    }
    if (matchedValue && matchedValue[0]) {
      return String(matchedValue[0]).trim();
    }
  }

  if (fieldDefinition.type === "number") {
    const matchedNumber = candidate.match(/-?\d+(?:[.,]\d+)?/);
    return matchedNumber ? matchedNumber[0] : "";
  }

  if (fieldDefinition.type === "date") {
    const matchedDate = candidate.match(/\b\d{4}-\d{2}-\d{2}\b|\b\d{2}[/.-]\d{2}[/.-]\d{4}\b|\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b/);
    return matchedDate ? matchedDate[0] : candidate;
  }

  if (fieldDefinition.type === "time") {
    const matchedTime = candidate.match(/\b\d{1,2}:\d{2}\s?(?:AM|PM|am|pm)?\b/);
    return matchedTime ? matchedTime[0] : candidate;
  }

  if (fieldDefinition.transform) {
    return fieldDefinition.transform(candidate);
  }

  return candidate;
}

export function buildDraftFromText(documentText, fieldDefinitions = []) {
  const allLabelPatterns = [...fieldDefinitions.flatMap((definition) => definition.patterns || []), ...DOCUMENT_BOUNDARY_PATTERNS];

  return fieldDefinitions.reduce((draft, definition) => {
    const sectionValue = extractSectionValue(documentText, definition.patterns || [], allLabelPatterns);
    draft[definition.name] = postProcessValue(sectionValue, definition);
    return draft;
  }, {});
}

async function ocrCanvas(canvas) {
  const worker = await createWorker("eng");
  try {
    const result = await worker.recognize(canvas);
    return result.data.text || "";
  } finally {
    await worker.terminate();
  }
}

async function extractTextFromPdfFile(file, fieldDefinitions = []) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true }).promise;

  let combinedText = "";
  const pageCount = Math.min(pdfDocument.numPages, 2);

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ").trim();
    combinedText += `${pageText}\n`;
  }
// adityachange2
  const normalizedText = combinedText.trim();
  const effectiveFieldDefs = Array.isArray(fieldDefinitions) && fieldDefinitions.length
    ? fieldDefinitions
    : documentFieldDefinitionsForPdf();

  if (normalizedText && normalizedText.length > 25) {
    const drafted = buildDraftFromText(normalizedText, effectiveFieldDefs);
    const hasUsefulField = Object.values(drafted).some((v) => v && String(v).trim().length > 0);
    if (hasUsefulField) {
      return normalizedText;
    }
  }

  const firstPage = await pdfDocument.getPage(1);
  const viewport = firstPage.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await firstPage.render({ canvasContext: context, viewport }).promise;
  // Try per-field crop+OCR for this rendered canvas (better accuracy for forms)
  try {
    const perFieldDraft = await cropAndOcrFields(canvas, effectiveFieldDefs);
    if (perFieldDraft && Object.values(perFieldDraft).some(v => v && String(v).trim().length > 0)) {
      return perFieldDraft;
    }

    const text = await ocrCanvas(canvas);
    if (text && text.trim().length > 25) return text;
  } catch (err) {
    console.warn('PDF canvas Tesseract / per-field OCR failed (no HTR fallback):', err);
  }

  // HTR removed: no backend fallback available; return empty string so caller continues with printed OCR only
  return '';
}

async function extractTextFromImageFile(file) {
  // Try client-side Tesseract first (fast for printed text)
  try {
    const text = await ocrCanvas(file);
    if (text && text.trim().length > 25) return text;
  } catch (err) {
    console.warn('Tesseract OCR failed or returned short text, falling back to preprocessing', err);
  }

  // Try a preprocessing pass and then OCR the cleaned image before per-field crop.
  try {
    const img = await preprocessFileToDataUrl(file);
    const tmpImg = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = img;
    });
    const c = document.createElement('canvas');
    const s = Math.min(1500, Math.max(tmpImg.width, tmpImg.height));
    const scale = s / Math.max(tmpImg.width, tmpImg.height);
    c.width = Math.round(tmpImg.width * scale);
    c.height = Math.round(tmpImg.height * scale);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(tmpImg, 0, 0, c.width, c.height);

    const preprocessedText = await ocrCanvas(c);
    if (preprocessedText && preprocessedText.trim().length > 25) return preprocessedText;

    const perFieldDraft = await cropAndOcrFields(c, documentFieldDefinitionsForPdf());
    if (perFieldDraft && Object.values(perFieldDraft).some(v => v && String(v).trim().length > 0)) {
      return perFieldDraft;
    }
  } catch (e) {
    console.warn('Preprocessed image OCR failed, falling back to previous flow', e);
  }

  // HTR removed: no backend fallback available; return empty string so caller continues with printed OCR only
  return '';
}

// reusable preprocessing for File -> dataURL used by image fallback
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

  const maxDim = Math.max(img.width, img.height);
  const scale = Math.min(3, Math.max(1, 1500 / Math.max(maxDim, 1)));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const contrast = 1.25;
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let v = data[i + c];
      v = (v - 128) * contrast + 128;
      data[i + c] = Math.max(0, Math.min(255, v));
    }
    const r = data[i], g = data[i+1], b = data[i+2];
    const lum = 0.299*r + 0.587*g + 0.114*b;
    data[i] = data[i+1] = data[i+2] = lum;
  }
  ctx.putImageData(imageData, 0, 0);

  const imgData2 = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let sum = 0;
  for (let i = 0; i < imgData2.data.length; i += 4) sum += imgData2.data[i];
  const avg = sum / (imgData2.data.length / 4 || 1);
  const threshold = Math.max(120, Math.min(200, avg - 10));
  for (let i = 0; i < imgData2.data.length; i += 4) {
    const v = imgData2.data[i] < threshold ? 0 : 255;
    imgData2.data[i] = imgData2.data[i+1] = imgData2.data[i+2] = v;
  }
  ctx.putImageData(imgData2, 0, 0);

  // lightweight deskew: test small rotations and pick angle with max horizontal projection variance
  const computeRowVariance = (c) => {
    try {
      const w = c.width, h = c.height;
      const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
      const rows = new Float64Array(h);
      for (let y = 0; y < h; y++) {
        let sum = 0;
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          sum += d[i];
        }
        rows[y] = sum;
      }
      const mean = rows.reduce((a, b) => a + b, 0) / rows.length;
      let varSum = 0;
      for (let i = 0; i < rows.length; i++) varSum += (rows[i] - mean) * (rows[i] - mean);
      return varSum / rows.length;
    } catch (e) {
      return 0;
    }
  };

  const rotateCanvas = (srcCanvas, angleDeg) => {
    const a = angleDeg * Math.PI / 180;
    const w = srcCanvas.width, h = srcCanvas.height;
    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    const tctx = tmp.getContext('2d', { willReadFrequently: true });
    tctx.clearRect(0, 0, w, h);
    tctx.translate(w / 2, h / 2);
    tctx.rotate(a);
    tctx.drawImage(srcCanvas, -w / 2, -h / 2);
    return tmp;
  };

  try {
    const angles = [-3, -2, -1, 0, 1, 2, 3];
    let bestAngle = 0, bestScore = -Infinity;
    for (const a of angles) {
      const r = rotateCanvas(canvas, a);
      const score = computeRowVariance(r);
      if (score > bestScore) { bestScore = score; bestAngle = a; }
    }
    if (bestAngle !== 0) {
      const rotated = rotateCanvas(canvas, bestAngle);
      canvas.width = rotated.width;
      canvas.height = rotated.height;
      const newCtx = canvas.getContext('2d');
      newCtx.drawImage(rotated, 0, 0);
      console.log('Preprocess: applied deskew angle', bestAngle, 'score', bestScore, 'canvas', canvas.width, 'x', canvas.height);
    }
  } catch (e) {
    console.warn('Preprocess deskew failed:', e);
  }

  return canvas.toDataURL('image/png');
}

export async function extractLocalDocumentText(file, fieldDefinitions = []) {
  const mimeType = file.type || "";
  const isPdf = mimeType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    return extractTextFromPdfFile(file, fieldDefinitions);
  }

  return extractTextFromImageFile(file);
}

export function useDocumentAutofill(fieldDefinitions, { onDraft } = {}) {
  const fileInputRef = useRef(null);
  const [documentFile, setDocumentFile] = useState(null);
  const [isAutofillPanelOpen, setIsAutofillPanelOpen] = useState(false);
  const [importError, setImportError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [draftPreview, setDraftPreview] = useState(null);

  const openDocumentPicker = () => {
    fileInputRef.current?.click();
  };

  const handleDocumentImport = async (file) => {
    if (!file) return;

    setIsAutofillPanelOpen(true);
    setDocumentFile(file);
    setIsAnalyzing(true);
    setImportError("");

    try {
      // Run printed OCR (local Tesseract/pdfjs) and HTR in parallel, then merge fields
      const printedPromise = extractLocalDocumentText(file, fieldDefinitions);

      // HTR removed: no backend HTR request. Provide empty HTR result.
      const htrPromise = Promise.resolve('');

      const cropDraftPromise = (async () => {
        try {
          const mimeType = file.type || "";
          const isPdf = mimeType === "application/pdf" || file.name.toLowerCase().endsWith('.pdf');
          let canvas = null;

          if (isPdf) {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true }).promise;
            const page = await pdfDocument.getPage(1);
            const viewport = page.getViewport({ scale: 2 });
            canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: context, viewport }).promise;
          } else {
            const img = await preprocessFileToDataUrl(file);
            const loadedImage = await new Promise((resolve, reject) => {
              const image = new Image();
              image.onload = () => resolve(image);
              image.onerror = reject;
              image.src = img;
            });

            canvas = document.createElement('canvas');
            const scale = Math.min(2, Math.max(1, 1500 / Math.max(loadedImage.width, loadedImage.height, 1)));
            canvas.width = Math.round(loadedImage.width * scale);
            canvas.height = Math.round(loadedImage.height * scale);
            const context = canvas.getContext('2d');
            context.drawImage(loadedImage, 0, 0, canvas.width, canvas.height);
          }

          if (!canvas) return {};
          const fieldDefs = Array.isArray(fieldDefinitions) && fieldDefinitions.length
            ? fieldDefinitions
            : documentFieldDefinitionsForPdf();
          return await cropAndOcrFields(canvas, fieldDefs);
        } catch (err) {
          console.warn('Per-field crop OCR failed:', err);
          return {};
        }
      })();

      const [printedText, htrText, cropDraft] = await Promise.all([printedPromise, htrPromise, cropDraftPromise]);

      console.log("PRINTED OCR:");
console.log(printedText);

console.log("HTR OCR:");
console.log(htrText);

      const printedDraft =
        typeof printedText === "object"
          ? printedText
          : buildDraftFromText(printedText || "", fieldDefinitions);

      const htrDraft =
        typeof htrText === "object"
          ? htrText
          : buildDraftFromText(htrText || "", fieldDefinitions);

      const cropFieldDraft = cropDraft && typeof cropDraft === 'object' ? cropDraft : {};

      console.log('[autofill] Printed OCR draft:', JSON.stringify(Object.fromEntries(Object.entries(printedDraft).filter(([,v])=>v))).slice(0,200));
      console.log('[autofill] Crop OCR draft:', JSON.stringify(Object.fromEntries(Object.entries(cropFieldDraft).filter(([,v])=>v))).slice(0,200));

      // Merge drafts using field-specific heuristics
      const mergedDraft = {};

      const digitCount = (s) => (String(s || '').match(/\d/g) || []).length;
      const alphaCount = (s) => (String(s || '').match(/[A-Za-z]/g) || []).length;
      const cleanStr = (s) => String(s || '').trim();

      const isNumericField = (name) => /mobile|phone|zip|pin|age|year|tax|amount|rate|area|propertyNo|noticeDate|noticeDate|pinCode/i.test(name);
      const isNameOrAddressField = (name) => /owner|occupier|address|name|ward|zone|location|venue/i.test(name);

      // fields we always want from HTR when available (handwritten-friendly)
      const htrPreferredFields = new Set(['ownerName','occupierName','address','propertyAddress','propertyName','owner','occupier']);

      const scoreCandidate = (name, value) => {
        const text = cleanStr(value);
        if (!text) return -Infinity;
        const digits = digitCount(text);
        const alpha = alphaCount(text);
        const alnum = String(text).replace(/[^A-Za-z0-9]/g, '').length;
        const length = text.length;

        if (/mobile|phone|zip|pin|year|rate|area|amount|tax|propertyNo/i.test(name)) {
          return digits * 10 + Math.min(length, 30);
        }

        if (/owner|occupier|address|name|ward|zone/i.test(name)) {
          return alpha * 8 + Math.min(length, 40) - (digits * 2);
        }

        return alnum * 4 + Math.min(length, 30);
      };

      const chooseBest = (name, ...values) => {
        let best = '';
        let bestScore = -Infinity;
        for (const value of values) {
          const candidate = cleanStr(value);
          if (!candidate) continue;
          const score = scoreCandidate(name, candidate);
          if (score > bestScore) {
            best = candidate;
            bestScore = score;
          }
        }
        return best;
      };

      // Quick rollback preference: for property-like fields prefer printed OCR
      const LEGACY_PREFER_PRINTED = new Set([
        'propertyNo', 'propertyNumber', 'property', 'newPropertyNo', 'oldPropertyNo', 'ward', 'ownerName', 'propertyNumber'
      ]);

      for (const def of fieldDefinitions) {
        //aditya change: added cropFieldDraft as another source of OCR text for merging, since it can be more accurate for handwritten fields
        const name = def.name;
        let p = cleanStr(printedDraft[name]);
        let h = cleanStr(htrDraft[name]);
        let c = cleanStr(cropFieldDraft[name]);
        if (looksLikeLabelOnly(p)) p = '';
        if (looksLikeLabelOnly(h)) h = '';
        if (looksLikeLabelOnly(c)) c = '';

        // if only one exists, pick it
        if (!p && !h && c) { mergedDraft[name] = c; continue; }
        if (!p && h && !c) { mergedDraft[name] = h; continue; }
        if (!h && p && !c) { mergedDraft[name] = p; continue; }

        // both empty
        if (!p && !h && !c) { mergedDraft[name] = ''; continue; }

        // If this is a property-like field, prefer printed OCR first (legacy behavior)
        if (LEGACY_PREFER_PRINTED.has(name)) {
          mergedDraft[name] = chooseBest(name, p, h, c);
          continue;
        }

        // Crop OCR is usually strongest for handwritten forms, so let it win when plausible.
        if (htrPreferredFields.has(name)) {
          const best = chooseBest(name, c, h, p);
          if (best) { mergedDraft[name] = best; continue; }
        }

        // numeric fields: prefer value with more digits
        if (isNumericField(name)) {
          mergedDraft[name] = chooseBest(name, p, h, c);
          continue;
        }

        // names/addresses: prefer the one with more alphabetic characters and reasonable length
        if (isNameOrAddressField(name)) {
          mergedDraft[name] = chooseBest(name, c, h, p);
          continue;
        }

        // default: prefer the longer non-noisy string (more alnum chars)
        const score = (s) => (String(s).replace(/[^A-Za-z0-9]/g, '').length);
        mergedDraft[name] = chooseBest(name, p, h, c) || (score(h) > score(p) ? h : p);
      }

      console.log('Autofill merged draft JSON:', JSON.stringify(mergedDraft, null, 2));
      // Sanitization: clean common OCR artifacts and normalize values per-field
      const defIsNumber = (nameLower) => {
        return /\b(amount|rate|tax|year|age|number|num|area)\b/i.test(nameLower);
      };

      const editDistance = (a, b) => {
        const sa = String(a || '');
        const sb = String(b || '');
        const dp = Array.from({ length: sa.length + 1 }, () => []);
        for (let i = 0; i <= sa.length; i += 1) dp[i][0] = i;
        for (let j = 0; j <= sb.length; j += 1) dp[0][j] = j;
        for (let i = 1; i <= sa.length; i += 1) {
          for (let j = 1; j <= sb.length; j += 1) {
            dp[i][j] = Math.min(
              dp[i - 1][j] + 1,
              dp[i][j - 1] + 1,
              dp[i - 1][j - 1] + (sa[i - 1] === sb[j - 1] ? 0 : 1)
            );
          }
        }
        return dp[sa.length][sb.length];
      };

      const chooseBestNameSegment = (input) => {
        const parts = String(input || '')
          .split(/[|\/;,]+/)
          .map((segment) => String(segment || '').trim())
          .filter(Boolean);
        if (parts.length <= 1) return String(input || '').trim();

        const score = (segment) => {
          const alpha = (segment.match(/[A-Za-z]/g) || []).length;
          const weird = (segment.match(/[^A-Za-z0-9\s]/g) || []).length;
          const words = segment.split(/\s+/).length;
          const singleLetters = (segment.match(/\b[A-Za-z]\b/g) || []).length;
          return alpha * 4 + words * 3 - weird * 8 - singleLetters * 2;
        };

        return parts.reduce((best, segment) => (score(segment) > score(best) ? segment : best), parts[0]);
      };

      const normalizeToken = (token) => String(token || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      const areTokensSimilar = (a, b) => {
        const ta = normalizeToken(a);
        const tb = normalizeToken(b);
        if (!ta || !tb) return false;
        if (ta === tb) return true;
        if (ta.includes(tb) || tb.includes(ta)) {
          return Math.abs(ta.length - tb.length) <= 3;
        }
        const maxDiff = Math.max(1, Math.floor(Math.min(ta.length, tb.length) / 4));
        return editDistance(ta, tb) <= maxDiff;
      };

      const removeDuplicateTrailingWords = (text) => {
        const words = String(text || '').trim().split(/\s+/);
        const total = words.length;
        for (let size = Math.floor(total / 2); size >= 1; size -= 1) {
          const tail = words.slice(total - size);
          const prev = words.slice(total - 2 * size, total - size);
          if (prev.length !== tail.length) continue;
          const allSimilar = tail.every((word, index) => areTokensSimilar(word, prev[index]));
          if (allSimilar) {
            return words.slice(0, total - size).join(' ');
          }
        }
        return text;
      };

      const removeFuzzyRepeatedSuffix = (text) => {
        const words = String(text || '').trim().split(/\s+/);
        const total = words.length;
        for (let size = Math.min(4, Math.floor(total / 2)); size >= 2; size -= 1) {
          const suffix = words.slice(total - size);
          for (let start = 0; start <= total - 2 * size; start += 1) {
            const candidate = words.slice(start, start + size);
            const allSimilar = suffix.every((word, index) => areTokensSimilar(word, candidate[index]));
            if (allSimilar) {
              return words.slice(0, total - size).join(' ');
            }
          }
        }
        return text;
      };

      const extractNumericValue = (text, labelRegex) => {
        const value = String(text || '').trim();
        if (!value) return '';
        const cleaned = value.replace(/\s+/g, ' ');

        if (labelRegex) {
          const labelPattern = new RegExp(`${labelRegex.source}[\s:\-]*([+-]?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)`, 'i');
          const labelMatch = cleaned.match(labelPattern);
          if (labelMatch && labelMatch[1]) {
            return labelMatch[1].replace(/,/g, '').trim();
          }
        }

        const allNumbers = cleaned.match(/[+-]?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?/g) || [];
        if (!allNumbers.length) return '';
        if (allNumbers.length === 1) return allNumbers[0].replace(/,/g, '').trim();

        const decimalNumber = allNumbers.find((n) => /[.,]\d+$/.test(n));
        if (decimalNumber) return decimalNumber.replace(/,/g, '').trim();

        if (labelRegex) {
          const labelIndex = cleaned.search(labelRegex);
          if (labelIndex >= 0) {
            const afterLabel = cleaned.slice(labelIndex);
            const postNumbers = afterLabel.match(/[+-]?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?/g);
            if (postNumbers && postNumbers.length) {
              return postNumbers[0].replace(/,/g, '').trim();
            }
          }
        }

        return allNumbers[allNumbers.length - 1].replace(/,/g, '').trim();
      };

      const extractWardValue = (text) => {
        const value = String(text || '').trim();
        if (!value) return '';
        const cleaned = value.replace(/\s+/g, ' ');
        const wardMatch = cleaned.match(/ward\s*(?:no\.?|number)?[\s:\-]*([A-Za-z0-9-]{1,6})/i);
        if (wardMatch && wardMatch[1]) {
          return wardMatch[1].replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '').trim();
        }
        const digits = cleaned.match(/\b([1-9]\d{0,3})\b/);
        if (digits) return digits[1];
        const fallback = cleaned.match(/\b[A-Za-z0-9-]{1,6}\b/g);
        return fallback ? fallback[0] : cleaned;
      };

      const stripNameLabels = (text) => {
        return String(text || '')
          .replace(/\b(owner|occupier|owner name|occupier name|name of owner|name|property|structure|property structure|old property|new property|no|number)\b/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      };

      const extractPropertyNumber = (text) => {
        const value = String(text || '').trim();
        const patterns = [
          /[A-Z]{1,3}\/\w+(?:\/\d{2,4})+/gi,
          /[A-Z]{1,3}\/\d{2,4}(?:\/\d{2,4})*/gi,
          /[A-Za-z0-9]+\/[A-Za-z0-9]+(?:\/[A-Za-z0-9]+)*/g
        ];
        for (const pattern of patterns) {
          const match = value.match(pattern);
          if (match && match.length) {
            return String(match[0] || '').trim();
          }
        }
        const stripped = value.replace(/[^A-Za-z0-9\/\- ]+/g, ' ').replace(/\s+/g, ' ').trim();
        const token = stripped.split(/\s+/).find((t) => t.includes('/'));
        return token || stripped;
      };

      const sanitizeValue = (name, raw) => {
        let v = String(raw || '').trim();
        if (!v) return '';

        // remove long runs of non-printable chars and collapse whitespace
          // remove long runs of control chars and collapse whitespace
          v = v.replace(/[\s\x7F]+/g, ' ');
        v = v.replace(/[|_]{2,}/g, ' ');
        v = v.replace(/\s+/g, ' ').trim();
      // remove trailing helper notes like "Check here..."
      v = v.replace(/\bCheck here[\s\S]*$/i, '');

      // remove stray standalone markers like [J], [XY], (Multiple Family Residence)
      v = v.replace(/\[[^\]]+\]/g, '');
      v = v.replace(new RegExp('\\([^)]*Residence\\)', 'ig'), '');

        // remove repeated punctuation
        v = v.replace(/["'`]{2,}/g, '');
        v = v.replace(/[-]{2,}/g, '-');

          // normalize common OCR artifacts: replace multiple capital sequences separated by underscores or pipes
          v = v.replace(/[-_]+/g, ' ');

        // strip non-ASCII/control chars left by OCR
        v = v.replace(new RegExp('[^\\u0020-\\u007E]+', 'g'), '');

        // Field-specific heuristics
        const nameLower = String(name || '').toLowerCase();
        // mobile/phone: return only digits (reasonable length)
        if (/mobile|phone|zip|pin|mobilenumber|phonenumber|mobileno|mobile_num|mobile_number/i.test(nameLower)) {
          const digits = (v.match(/\d+/g) || []).join('');
          return digits.length >= 6 && digits.length <= 15 ? digits : v.replace(/[^0-9]/g, '');
        }

        // numeric fields
        if (/^\w*(tax|rate|area|year|age|amount|revision|previous|revised)\w*$/i.test(nameLower) || defIsNumber(nameLower)) {
          if (/rate/i.test(nameLower)) {
            return extractNumericValue(v, /rate/i);
          }
          if (/area/i.test(nameLower) && !/rate/i.test(nameLower)) {
            return extractNumericValue(v, /area/i);
          }
          if (/tax|amount|rate|area/i.test(nameLower)) {
            return extractNumericValue(v);
          }
          const numMatch = v.match(/-?\d+(?:[.,]\d+)?/);
          return numMatch ? numMatch[0] : v;
        }

        // property numbers: extract the most likely property number and drop trailing label text
        if (/property|propno|propertyno|propertyno\.|propertynumber|newpropertyno|oldpropertyno/i.test(nameLower)) {
          return extractPropertyNumber(v);
        }

        // constructionType: remove stray label fragments and common helper text
        if (/constructiontype|construction_type|usageType|usage/i.test(nameLower)) {
          v = v.replace(/construction\s*year[\s|:-]*/i, '');
          v = v.replace(/year[\s|:-]*\d{4}/i, '').trim();
          v = v.replace(/\|/g, ' ').replace(/\s{2,}/g, ' ');
          const tok = v.split(/[,:;|]/).map(s=>s.trim()).filter(Boolean)[0] || v;
          return tok.replace(/^[-:\s]+|[-:\s]+$/g, '').trim();
        }

        // zone: prefer title-case words, remove stray punctuation
        if (/\bzone\b/i.test(nameLower)) {
          v = v.replace(/[|]+/g, ' ').replace(/[^A-Za-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
          return v.split(' ').map(w => w ? (w[0].toUpperCase() + w.slice(1).toLowerCase()) : '').join(' ').trim();
        }

        // owner/occupier/name fields: split on separators, choose the best segment, and remove repeated trailing duplicates
        if (/owner|occupier|name/i.test(nameLower)) {
          v = stripNameLabels(v);
          v = chooseBestNameSegment(v);
          v = v.replace(/[|\/;,:]+/g, ' ');
          v = v.replace(/\b[y|]\b/gi, ' ');
          v = v.replace(/\s+/g, ' ').trim();
          v = removeDuplicateTrailingWords(v);
          v = removeFuzzyRepeatedSuffix(v);
          v = v.replace(/\b(?!A\b|I\b)[A-Za-z]\b/g, '').replace(/\s+/g, ' ').trim();
          return v.split(' ').map(w => w ? (w[0].toUpperCase() + w.slice(1).toLowerCase()) : '').join(' ').trim();
        }

        // ward: prefer numeric extraction (e.g., "Ward No. 12" -> "12")
        if (/ward/i.test(nameLower)) {
          return extractWardValue(v);
        }

        // area/rate: ensure numeric with optional decimal point
        if (/\b(area|rate|amount|tax|taxable|proposed tax|taxable value)\b/i.test(nameLower)) {
          if (/rate/i.test(nameLower)) {
            return extractNumericValue(v, /rate|taxable value|proposed tax/i);
          }
          if (/area/i.test(nameLower) && !/rate/i.test(nameLower)) {
            return extractNumericValue(v, /area/i);
          }
          const m = v.match(/-?\d{1,3}(?:[,\s]\d{3})*(?:[.,]\d+)?|\d+(?:[.,]\d+)?/);
          if (m) return m[0].replace(/\s+/g,'').replace(/,/g,'');
        }

        // default: collapse multiple spaces and trim punctuation edges
        v = v.replace(/^[-:\s|.,]+|[-:\s|.,]+$/g, '');
        return v.trim();
      };

      const cleanedDraft = Object.fromEntries(Object.entries(mergedDraft).map(([k, v]) => [k, sanitizeValue(k, v)]));

      console.log('Autofill cleaned merged draft JSON:', JSON.stringify(cleanedDraft, null, 2));

      // Post-process cleanedDraft: extract phone numbers, clean address pipes, validate years
      const finalDraft = { ...cleanedDraft };

      // If mobile missing, scan all fields for a digit sequence (6-15 digits) and assign it
      const phoneMatchRegex = /\d{6,15}/g;
      if (!finalDraft.mobile || String(finalDraft.mobile).trim() === '') {
        for (const [k, v] of Object.entries(finalDraft)) {
          if (!v) continue;
          const m = String(v).match(phoneMatchRegex);
          if (m && m.length) {
            finalDraft.mobile = m[0];
            // remove the found number from the original field
            finalDraft[k] = String(v).replace(m[0], '').replace(/\s+/g, ' ').trim();
            break;
          }
        }
      } else {
        // ensure mobile only contains digits
        finalDraft.mobile = String(finalDraft.mobile).replace(/[^0-9+]/g, '').trim();
      }

      // Address: replace separators like '|' and multiple commas with a single comma
      if (finalDraft.address) {
        finalDraft.address = finalDraft.address
          .replace(/[|\u007C]+/g, ',')
          .replace(/[%*]+/g, ' ')
          .replace(/\b[y|]\b/gi, ' ')
          .replace(/[()]/g, ' ')
          .replace(/\ba\s+(\d+)\b/gi, '$1')
          .replace(/!+/g, ' ')
          .replace(/\bpc\b/gi, 'pc')
          .replace(/,+/g, ',')
          .replace(/\s+,/g, ',')
          .replace(/,\s+/g, ', ')
          .replace(/\s+/g, ' ')
          .trim();
        const segments = finalDraft.address.split(',').map((segment) => segment.trim()).filter(Boolean);
        finalDraft.address = segments.join(', ');
        finalDraft.address = removeDuplicateTrailingWords(finalDraft.address);
      }

      // Ward: remove stray phone numbers if any left
      if (finalDraft.ward) {
        finalDraft.ward = finalDraft.ward.replace(phoneMatchRegex, '').replace(/\s+/g, ' ').trim();
      }

      // constructionYear: accept only 4-digit year
      if (finalDraft.constructionYear) {
        finalDraft.constructionYear = /^\d{4}$/.test(finalDraft.constructionYear) ? finalDraft.constructionYear : '';
      }

      console.log('Autofill final cleaned draft JSON:', JSON.stringify(finalDraft, null, 2));

      // Heuristics: if the draft looks poor (many empty fields or missing phone/name/address)
      // try server-side OpenAI cleaning to convert noisy OCR into structured JSON.
      const titleCase = (s) => String(s || '')
        .toLowerCase()
        .split(/\s+/)
        .map((w) => (w ? (w[0].toUpperCase() + w.slice(1)) : ''))
        .join(' ')
        .trim();

      const isLikelyGarbled = (s) => {
        if (!s) return false;
        const str = String(s);
        const alphaNum = (str.match(/[A-Za-z0-9]/g) || []).length;
        const total = Math.max(1, str.length);
        const non = total - alphaNum;
        return non / total > 0.35 && alphaNum < 5;
      };

      const expectedFields = fieldDefinitions.map(f => f.name);

      const needsOpenAIClean = (() => {
        // Count empty/short fields
        let empty = 0;
        const keys = Object.keys(finalDraft);
        for (const k of keys) {
          const v = String(finalDraft[k] || '').trim();
          if (!v || v.length < 3) empty += 1;
        }
        const manyEmpty = empty >= Math.max(3, Math.floor(keys.length / 2));
        const hasPhoneField = expectedFields.some((f) => /\b(mobile|phone|contact)\b/i.test(f));
        const hasNameField = expectedFields.some((f) => /\b(owner|occupier|name|applicant)\b/i.test(f));
        const hasAddressField = expectedFields.some((f) => /\b(address|location|venue|site|propertyAddress)\b/i.test(f));
        const phoneMissing = hasPhoneField && (!finalDraft.mobile || String(finalDraft.mobile).trim().length < 7);
        const nameMissing = hasNameField && (!finalDraft.ownerName || String(finalDraft.ownerName).trim().length < 3);
        const addressMissing = hasAddressField && (!finalDraft.address || String(finalDraft.address).trim().length < 6);
        // If many empty fields OR critical fields are missing OR values look garbled, ask OpenAI
        return manyEmpty || phoneMissing || nameMissing || addressMissing || Object.values(finalDraft).some(isLikelyGarbled);
      })();

      let openAICleaned = null;
      const cropCompleteness = Object.values(cropFieldDraft || {}).filter((v) => String(v || '').trim()).length;
      const handwrittenStrongEnough = cropCompleteness >= Math.max(4, Math.floor(expectedFields.length / 3));
      if (needsOpenAIClean) {
        try {
          const rawOcrText = [printedText, htrText]
            .filter((value) => typeof value === 'string' && value.trim())
            .map((value) => String(value).trim())
            .join('\n\n');

          const payload = {
            ocrText: rawOcrText,
            //aditya change
            fields: Array.isArray(fieldDefinitions) ? fieldDefinitions.map((f) => f.name) : Object.keys(finalDraft),
            fieldSnapshot: finalDraft,
          };

          const resp = await fetch('/api/ocr/clean', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const respText = await resp.text();
          let j = null;
          try { j = JSON.parse(respText); } catch (e) { j = null; }

          // Handle quota/errors explicitly: if OpenAI returns 429 or a quota error string,
          // skip AI merge and surface a warning so the UI falls back to local OCR only.
          if (!resp.ok) {
            const quotaHint = resp.status === 429 || (respText && respText.toLowerCase().includes('insufficient_quota'));
            if (quotaHint) {
              console.warn('AI provider quota exceeded or returned 429; skipping AI clean', resp.status, respText);
              // leave openAICleaned as null and attach a warning to preview later
              openAICleaned = null;
              // store the message for UI preview
              var openAIMeta = { error: 'quota_exceeded', status: resp.status, message: respText };
            } else {
              console.warn('AI clean endpoint returned', resp.status, respText);
            }
          } else if (j) {
            openAICleaned = j.json || null;
            console.log('AI cleaned JSON:', openAICleaned);
          }
        } catch (e) {
          console.warn('AI clean request failed:', e);
        }
      }

      // Merge AI only when local crop OCR is weak; otherwise keep the handwritten crop output.
      const mergedWithAI = { ...finalDraft };
      if (openAICleaned && typeof openAICleaned === 'object' && !handwrittenStrongEnough) {
        for (const [k, v] of Object.entries(openAICleaned)) {
          try {
            const cur = String(mergedWithAI[k] || '').trim();
            const cand = String(v || '').trim();
            if (!cand) continue;
            if (!isValidForField(k, cand)) continue;
            // prefer candidate when current is empty, very short, or looks garbled
            if (!cur || cur.length < 3 || isLikelyGarbled(cur)) {
              mergedWithAI[k] = cand;
            } else if (cand.length > cur.length + 3) {
              // prefer longer (more complete) candidate
              mergedWithAI[k] = cand;
            }
          } catch (e) { /* ignore */ }
        }
      }

      // field-specific validator: used to decide when a crop OCR value is trustworthy
      function isValidForField(name, value) {
        if (!value) return false;
        const s = String(value).trim();
        const nameLower = String(name || '').toLowerCase();
        const normalized = s.toLowerCase();
        if (/mobile|phone|mobileno|phonenumber/i.test(nameLower)) {
          const d = (s.match(/\d/g) || []).length;
          return d >= 6 && d <= 15;
        }
        if (/ward/i.test(nameLower)) {
          if (/\b(notice|reason|owner|property|date)\b/i.test(normalized)) return false;
          return /\b\d{1,4}\b/.test(s) || (s.length <= 6 && /^[A-Za-z0-9-]+$/.test(s));
        }
        if (/zone/i.test(nameLower)) {
          if (/\b(notice|reason|owner|property|date|ward)\b/i.test(normalized)) return false;
          return /[A-Za-z]/.test(s) && s.length <= 40;
        }
        if (/area|rate|amount|tax/i.test(nameLower)) {
          return !!s.match(/^-?\d+(?:[.,]\d+)?$/);
        }
        if (/property|propno|propertyno/i.test(nameLower)) {
          if (/\b(notice|reason|ward|owner|date|address)\b/i.test(normalized)) return false;
          if (s.length > 40) return false;
          return !!s.match(/[A-Za-z0-9/ -]{2,}/);
        }
        if (/owner|occupier|name/i.test(nameLower)) {
          if (/\b(notice|reason|property|ward|date|address)\b/i.test(normalized)) return false;
          const letters = (s.match(/[A-Za-z]/g) || []).length;
          return letters >= 2 && !/^\s*\d+\s*$/.test(s);
        }
        if (/date/i.test(nameLower)) {
          return !!String(s).match(/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b/);
        }
        // default: consider non-garbled short names/addresses valid
        return !(isLikelyGarbled(s));
      }

      // Prefer the crop OCR values directly for handwritten forms when they exist
      // and pass field-specific validators. This prevents AI from overwriting
      // stronger local crop OCR results.
      for (const [k, v] of Object.entries(cropFieldDraft || {})) {
        const cropValue = String(v || '').trim();
        if (!cropValue) continue;
        const current = String(mergedWithAI[k] || '').trim();
        // if crop looks valid for this field, take it
        if (isValidForField(k, cropValue)) {
          mergedWithAI[k] = cropValue;
          continue;
        }
        // otherwise, keep previous behavior but be more conservative
        if (!current || current.length < 2 || isLikelyGarbled(current) || current === 'A') {
          mergedWithAI[k] = cropValue;
        }
      }

      // Final lightweight formatting
      if (mergedWithAI.ownerName) mergedWithAI.ownerName = titleCase(mergedWithAI.ownerName);
      if (mergedWithAI.occupierName) mergedWithAI.occupierName = titleCase(mergedWithAI.occupierName);
      if (mergedWithAI.mobile) mergedWithAI.mobile = String(mergedWithAI.mobile).replace(/[^0-9+]/g, '');
      if (mergedWithAI.address) mergedWithAI.address = String(mergedWithAI.address).replace(/[|\u007C]+/g, ',').replace(/,+/g, ',').replace(/\s+,/g, ',').replace(/,\s+/g, ', ').trim();

      // Ensure schema: keep all expected fields and attempt to reassign misclassified values.
      // validators
      const isPhone = (s) => { const d = String(s||'').match(/\d/g)||[]; return d.length >= 6 && d.length <= 15; };
      const isYear = (s) => /^\s*\d{4}\s*$/.test(String(s||''));
      const isNumeric = (s) => !!String(s||'').match(/^-?\d+(?:[.,]\d+)?$/);
      const isPropertyNo = (s) => {
        const text = String(s || '').trim();
        if (!text || text.length > 40) return false;
        if (/\b(?:notice|reason|ward|owner|date|address)\b/i.test(text)) return false;
        return /\b[A-Za-z0-9]+(?:[\/-][A-Za-z0-9]+)+\b/.test(text)
          || /\b[A-Za-z]{1,3}\/\d{1,4}\b/.test(text)
          || /^[A-Za-z0-9][A-Za-z0-9\s\/-]{1,39}$/.test(text);
      };
      //aditya change
      const isNameLike = (s) => {
        if (!s) return false;
        const text = String(s || '').trim();
        if (looksLikeLabelOnly(text)) return false;
        const a = (text.match(/[A-Za-z]/g) || []).length;
        return a >= 2 && !isPhone(text) && !isPropertyNo(text);
      };
      const isAddressLike = (s) => {
        if (!s) return false;
        const text = String(s || '').trim();
        if (looksLikeLabelOnly(text)) return false;
        return text.includes(',') || (text.split(' ').length >= 3 && /\d/.test(text));
      };

      // pool other values (non-empty) for possible reassignment
      const pool = [];
      for (const k of expectedFields) {
        const v = String(mergedWithAI[k] || '').trim();
        if (v) pool.push({ key: k, value: v, used: false });
      }

      const pickCandidate = (pred) => {
        for (const p of pool) {
          if (p.used) continue;
          if (pred(p.value)) { p.used = true; return p.value; }
        }
        return null;
      };

      const finalSchemaDraft = {};
      for (const fname of expectedFields) {
        let cur = String(mergedWithAI[fname] || '').trim();
        // if current looks wrong for field, try to find a better candidate
        if (/mobile|phone/i.test(fname)) {
          if (!isPhone(cur)) {
            const cand = pickCandidate(isPhone);
            if (cand) cur = cand; else cur = cur && isPhone(cur) ? cur : '';
          }
        } else if (/year|constructionYear/i.test(fname)) {
          if (!isYear(cur)) {
            const cand = pickCandidate(isYear);
            if (cand) cur = cand; else cur = '';
          }
        } else if (/area|rate|amount|tax/i.test(fname)) {
          if (!isNumeric(cur)) {
            const cand = pickCandidate(isNumeric);
            if (cand) cur = cand; else cur = cur && isNumeric(cur.replace(/[^\d.,-]/g,'')) ? cur.replace(/[^\d.,-]/g,'') : '';
          }
        } else if (/property|propno/i.test(fname)) {
          if (!isPropertyNo(cur)) {
            const cand = pickCandidate(isPropertyNo) || pickCandidate((v)=> new RegExp('[A-Za-z0-9/\\-]{4,}').test(v));
            if (cand) cur = cand;
          }
        } else if (/address/i.test(fname)) {
          if (!isAddressLike(cur)) {
            const cand = pickCandidate(isAddressLike);
            if (cand) cur = cand;
          }
        } else if (/owner|occupier|name/i.test(fname)) {
          if (!isNameLike(cur)) {
            const cand = pickCandidate(isNameLike);
            if (cand) cur = cand;
          }
        }
        finalSchemaDraft[fname] = cur || '';
      }

      // Ensure any leftover pool items that look useful are not lost: only assign to address
      // if we can find an address-like leftover (avoid filling address everywhere).
      const leftovers = pool.filter(p=>!p.used).map(p=>p.value).filter(Boolean);
      const addressLikeLeftovers = leftovers.filter(v => isAddressLike(v));
      if (addressLikeLeftovers.length && (!finalSchemaDraft.address || finalSchemaDraft.address==='')) {
        finalSchemaDraft.address = addressLikeLeftovers.join(' | ');
      }

      // Additional fixes:
      // 1) Extract phone from any field into `mobile` if mobile is empty
      const extractPhone = (s) => {
        if (!s) return null;
        const m = String(s).match(/\d{6,15}/);
        return m ? m[0] : null;
      };

      if (!finalSchemaDraft.mobile || String(finalSchemaDraft.mobile).trim().length < 6) {
        for (const k of expectedFields) {
          if (k === 'mobile') continue;
          const found = extractPhone(finalSchemaDraft[k]);
          if (found) {
            finalSchemaDraft.mobile = found;
            finalSchemaDraft[k] = String(finalSchemaDraft[k] || '').replace(found, '').replace(/\s+/g,' ').trim();
            break;
          }
        }
      }

      // 2) Remove stray phone tokens from ward/newPropertyNo/other non-phone fields
      for (const k of expectedFields) {
        if (/ward|newPropertyNo|oldPropertyNo|zone|ownerName|occupierName/i.test(k)) {
          finalSchemaDraft[k] = String(finalSchemaDraft[k] || '').replace(/\d{6,15}/g,'').replace(/\s+/g,' ').trim();
        }
      }

      // 3) If ownerName empty, pick best name-like candidate from mergedWithAI or cleanedDraft
      const candidateNames = [];
      for (const [k,v] of Object.entries(mergedWithAI)) {
        if (!v) continue;
        if (k === 'ownerName' || k === 'occupierName') continue;
        if (isNameLike(v) && !isAddressLike(v)) candidateNames.push({k, v, score: (String(v).match(/[A-Za-z]/g)||[]).length});
      }
      for (const [k,v] of Object.entries(cleanedDraft)) {
        if (!v) continue;
        if (k === 'ownerName' || k === 'occupierName') continue;
        if (isNameLike(v) && !isAddressLike(v)) candidateNames.push({k, v, score: (String(v).match(/[A-Za-z]/g)||[]).length});
      }
      candidateNames.sort((a,b)=>b.score-a.score);
      if ((!finalSchemaDraft.ownerName || finalSchemaDraft.ownerName.trim()==='') && candidateNames.length) {
        finalSchemaDraft.ownerName = candidateNames[0].v;
        // remove assigned value from source field
        finalSchemaDraft[candidateNames[0].k] = String(finalSchemaDraft[candidateNames[0].k] || '').replace(candidateNames[0].v, '').replace(/\s+/g,' ').trim();
      }

      // 4) If address empty, pick best address-like leftover
      if (!finalSchemaDraft.address || finalSchemaDraft.address.trim()==='') {
        let addrCand = null;
        for (const k of expectedFields) {
          if (k === 'address') continue;
          const v = finalSchemaDraft[k] || '';
          if (isAddressLike(v)) { addrCand = v; finalSchemaDraft[k]=''; break; }
        }
        if (addrCand) finalSchemaDraft.address = addrCand;
      }

      // 5) constructionYear must be 4-digit
      if (finalSchemaDraft.constructionYear && !/^\d{4}$/.test(finalSchemaDraft.constructionYear)) {
        finalSchemaDraft.constructionYear = '';
      }

      // 6) if newPropertyNo looks like phone, clear it
      if (finalSchemaDraft.newPropertyNo && extractPhone(finalSchemaDraft.newPropertyNo)) {
        finalSchemaDraft.newPropertyNo = '';
      }

      setDraftPreview({
        source: openAICleaned ? 'ai-cleaned-ocr' : 'crop-ocr',
        extractedText: { printed: printedText, htr: htrText },
        draft: mergedDraft,
        cleanedDraft,
        finalDraft: finalSchemaDraft,
        aiMeta: typeof openAIMeta !== 'undefined' ? openAIMeta : undefined,
        debugCandidates: lastCropDebug
      });

      if (onDraft) {
        onDraft(finalSchemaDraft, printedText || htrText);
      }

      setIsAutofillPanelOpen(false);
    } catch (error) {
      const rawMessage = error?.message || "Failed to analyze the uploaded file";
      setImportError(`Local OCR could not read this file: ${rawMessage}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDocumentChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      handleDocumentImport(file);
    }
  };

  const handleDocumentDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleDocumentImport(file);
    }
  };

  const handleDocumentDragOver = (event) => {
    event.preventDefault();
  };

  return {
    fileInputRef,
    documentFile,
    isAutofillPanelOpen,
    setIsAutofillPanelOpen,
    importError,
    isAnalyzing,
    draftPreview,
    openDocumentPicker,
    handleDocumentImport,
    handleDocumentChange,
    handleDocumentDrop,
    handleDocumentDragOver
  };
}

export function DocumentAutofillOverlay({
  isOpen,
  onClose,
  title,
  description,
  fileInputRef,
  openDocumentPicker,
  documentFile,
  isAnalyzing,
  importError,
  draftPreview,
  handleDocumentChange,
  handleDocumentDrop,
  handleDocumentDragOver
}) {
  if (!isOpen) return null;

  return (
    <div className="autofill-overlay-layer" onClick={onClose}>
      <section
        className="document-import-panel document-import-panel--overlay"
        onClick={(event) => event.stopPropagation()}
        onDrop={handleDocumentDrop}
        onDragOver={handleDocumentDragOver}
      >
        <div className="document-import-copy document-import-copy--compact">
          <div className="document-import-head-row">
            <div className="document-import-eyebrow">
              <Sparkles size={14} />
              <span>Document auto-fill</span>
            </div>
            <button
              type="button"
              className="document-overlay-close"
              onClick={onClose}
              aria-label="Close document autofill"
            >
              <X size={16} />
            </button>
          </div>

          <h4>{title}</h4>
          <p>{description}</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleDocumentChange}
          className="document-file-input"
        />

        <button
          type="button"
          className={`document-upload-button ${isAnalyzing ? "is-working" : ""}`}
          onClick={openDocumentPicker}
          onDrop={handleDocumentDrop}
          onDragOver={handleDocumentDragOver}
        >
          <UploadCloud size={20} />
          <span>
            {documentFile ? "Replace uploaded hardcopy" : "Upload hardcopy to auto-fill"}
          </span>
          <small>
            {documentFile
              ? `${documentFile.name} • ${formatFileSize(documentFile.size)}`
              : "PNG, JPG, JPEG, or PDF"}
          </small>
        </button>

        {importError && <div className="document-import-error">{importError}</div>}

        {(draftPreview?.finalDraft || draftPreview?.draft) && (
          <div className="document-preview">
            <div className="document-preview-header">
              <strong>Parsed JSON</strong>
              <span>Source: {draftPreview.source}</span>
            </div>

            <div className="document-preview-grid">
              {Object.entries(draftPreview.finalDraft || draftPreview.draft)
                .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
                .slice(0, 6)
                .map(([key, value]) => (
                  <div key={key} className="document-preview-item">
                    <span>{key}</span>
                    <strong>{String(value)}</strong>
                  </div>
                ))}
            </div>
          </div>
        )}

        
      </section>
    </div>
  );
}

// Provide a combined field definitions list used across forms (fallback when caller doesn't pass definitions)
function documentFieldDefinitionsForPdf() {
  // merge common field patterns used by forms (kept small; callers can pass explicit definitions)
  return [
    { name:'ownerName', patterns:[/owner\s*name/i, /name\s*of\s*owner/i] },
    { name:'occupierName', patterns:[/occupier\s*name/i, /name\s*of\s*occupier/i] },
    { name:'address', patterns:[/address/i, /property\s*address/i] },
    { name:'mobile', patterns:[/mobile/i, /phone/i] },
    { name:'ward', patterns:[/ward\s*no\.?/i, /ward\b/i] },
    { name:'zone', patterns:[/zone/i] },
    { name:'newPropertyNo', patterns:[/new\s*property\s*no\.?/i, /property\s*no\.?/i, /prop\.?\s*no\.?/i] },
    { name:'oldPropertyNo', patterns:[/old\s*property\s*no\.?/i, /property\s*no\.?/i, /old\s*prop\.?\s*no\.?/i] },
    { name:'usageType', patterns:[/usage\s*type/i] },
    { name:'constructionType', patterns:[/construction\s*type/i] },
    { name:'constructionYear', patterns:[/construction\s*year/i, /year\s*of\s*construction/i] },
    { name:'area', patterns:[/area/i, /built\s*up\s*area/i] },
    { name:'rate', patterns:[/rate/i, /tax\s*rate/i] }
  ]
}

// Crop a rectangular area from a canvas and return a new canvas
function cropCanvas(srcCanvas, x, y, w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext('2d');
  ctx.drawImage(srcCanvas, x, y, w, h, 0, 0, c.width, c.height);
  return c;
}

// Crop and OCR each field by detecting label lines/words with Tesseract, then OCR the nearby region for the value.
async function cropAndOcrFields(canvas, fieldDefinitions = []) {
  const worker = await createWorker("eng");
  try {
    const result = await worker.recognize(canvas);
    const lines = (result.data && result.data.lines) || [];
    const words = (result.data && result.data.words) || [];

    // Log detected words for debugging label detection
    const detectedWordTexts = words.slice(0, 30).map(w => w.text).join(' ');
    console.log('[cropOCR] Full-page OCR detected (first 30 words):', detectedWordTexts.slice(0, 200));
    console.log('[cropOCR] Total found: words=' + words.length + ', lines=' + lines.length);

    const out = {};
    const debug = {};

    // helper to compute bbox for a sequence of words
    const bboxForWords = (ws) => {
      if (!ws || ws.length === 0) return null;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const w of ws) {
        const b = w.bbox || w; // try fallbacks
        const lx = b.x0 ?? b.x;
        const ly = b.y0 ?? b.y;
        const rx = (b.x1 ?? (b.x + (b.w || 0)));
        const ry = (b.y1 ?? (b.y + (b.h || 0)));
        x0 = Math.min(x0, lx);
        y0 = Math.min(y0, ly);
        x1 = Math.max(x1, rx);
        y1 = Math.max(y1, ry);
      }
      return { x0, y0, x1, y1 };
    };

    // Build a searchable sequence of words (text + index)
    const wordSeq = words.map((w, i) => ({ text: (w.text || '').trim(), bbox: w.bbox || w, i }));

    // Helper: try multiple recognition modes/params and pick best by confidence and length
    const computeScore = (res) => {
      try {
        const words = (res.data && res.data.words) || [];
        if (words.length === 0) return (res.data && String(res.data.text || '').length) || 0;
        const avg = words.reduce((s, w) => s + (w.confidence || 0), 0) / words.length;
        const len = String(res.data.text || '').trim().length;
        return avg * Math.log(1 + len);
      } catch (e) {
        return 0;
      }
    };

    const upscaleCanvas = (src, scale) => {
      if (!scale || scale === 1) return src;
      const w = Math.max(1, Math.round(src.width * scale));
      const h = Math.max(1, Math.round(src.height * scale));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(src, 0, 0, w, h);
      return c;
    };

    const numericPostFix = (s) => {
      if (!s) return s;
      // Common OCR confusions -> digits
      let t = String(s);
      t = t.replace(/[OoQ]/g, '0');
      t = t.replace(/[lI|]/g, '1');
      t = t.replace(/[Ss]/g, '5');
      t = t.replace(/[Bb]/g, '8');
      // collapse repeated non-digits
      t = t.replace(/[^0-9+]/g, '');
      return t;
    };

    const ocrWithModes = async (cropCanvas, fieldName) => {
      const name = String(fieldName || '').toLowerCase();
      const candidates = [];

      const numericField = /mobile|phone|zip|pin|age|year|tax|amount|rate|area|propertyno|mobileno|phonenumber/i.test(name);
      const propertyField = /property|propno|propertyno|newpropertyno|oldpropertyno/i.test(name);
      const nameField = /owner|occupier|name|address/i.test(name);

      const modes = [];
      if (numericField) {
        modes.push({ psm: '7', params: { tessedit_char_whitelist: '0123456789+' } });
        modes.push({ psm: '6', params: { tessedit_char_whitelist: '0123456789+' } });
        modes.push({ psm: '11', params: { tessedit_char_whitelist: '0123456789+,' } });
      } else if (propertyField) {
        modes.push({ psm: '7', params: { tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/-' } });
        modes.push({ psm: '3', params: {} });
        modes.push({ psm: '11', params: {} });
      } else if (nameField) {
        // For handwritten name/address fields, try layout-preserving modes first
        modes.push({ psm: '3', params: {} });
        modes.push({ psm: '6', params: {} });
        modes.push({ psm: '11', params: {} });
        modes.push({ psm: '7', params: {} });
      } else {
        modes.push({ psm: '3', params: {} });
        modes.push({ psm: '6', params: {} });
        modes.push({ psm: '11', params: {} });
        modes.push({ psm: '7', params: {} });
      }

      // Try each mode and multiple scales and keep best
      const scales = [1, 1.5, 2];
      for (const m of modes) {
        for (const s of scales) {
          try {
            const trialCanvas = upscaleCanvas(cropCanvas, s);
            // set params (whitelist etc.) when available
            if (m.params && Object.keys(m.params).length > 0) {
              try { await worker.setParameters(m.params); } catch (e) { /* ignore */ }
            }
            // set PSM
            try { await worker.setParameters({ tessedit_pageseg_mode: m.psm }); } catch (e) { /* ignore */ }

            const r = await worker.recognize(trialCanvas);
            let text = (r.data && r.data.text) ? r.data.text.trim() : '';
            // apply numeric post-fix for numeric fields
            if (/mobile|phone|zip|pin|property|propno|rate|area|year|amount/i.test(name)) {
              text = numericPostFix(text);
            }
            const score = computeScore(r);
            candidates.push({ text, score, raw: r, scale: s, mode: m.psm });
          } catch (e) {
            /* ignore mode/scale failure */
          }
        }
      }

      // pick best candidate
      candidates.sort((a, b) => b.score - a.score);
      return candidates.length ? candidates[0] : { text: '' };
    };

    const pickBestCropText = async (crops, fieldName) => {
      const candidates = [];
      for (const crop of crops.filter(Boolean)) {
        try {
          const best = await ocrWithModes(crop, fieldName);
          candidates.push(best || { text: '', score: -Infinity });
        } catch (e) {
          candidates.push({ text: '', score: -Infinity });
        }
      }
      candidates.sort((a, b) => (b.score || 0) - (a.score || 0));
      return candidates.length ? candidates[0] : { text: '' };
    };

      for (const def of fieldDefinitions) {
      out[def.name] = '';
      const patterns = def.patterns || [];
      let patternMatched = false;

      // search lines first
      let found = false;
      for (const line of lines) {
        const text = (line.text || '').trim();
        for (const p of patterns) {
          if (p.test(text)) {
            patternMatched = true;
            // Try both the value box below the label and the area to the right.
            const lb = line.bbox || line;
            const labelLeft = Math.max(0, (lb.x0 ?? lb.x ?? 0) - 16);
            const labelTop = Math.max(0, (lb.y0 ?? lb.y ?? 0) - 4);
            const labelBottom = Math.min(canvas.height - 1, (lb.y1 ?? ((lb.y0 ?? lb.y ?? 0) + (lb.h || 40))) + 6);
            const rightX = Math.min(canvas.width - 1, (lb.x1 ?? ((lb.x0 ?? lb.x ?? 0) + (lb.w || 0))) + 4);
            const belowCrop = cropCanvas(
              canvas,
              labelLeft,
              labelBottom,
              Math.max(1, canvas.width - labelLeft - 8),
              Math.max(30, Math.min(220, canvas.height - labelBottom - 4))
            );
            const rightCrop = cropCanvas(
              canvas,
              rightX,
              labelTop,
              Math.max(1, Math.min(canvas.width - rightX - 4, 600)),
              Math.max(20, Math.min(160, (lb.h || ((lb.y1 ?? labelBottom) - labelTop) || 40) + 16))
            );
            try {
              const best = await pickBestCropText([belowCrop, rightCrop], def.name);
              const bestText = best && best.text ? best.text.trim() : '';
              if (bestText && !looksLikeLabelOnly(bestText)) {
                out[def.name] = bestText;
                debug[def.name] = best && best.raw && best.raw.data ? (best.raw.data.words || []).map(w=>({t:w.text, c:w.confidence})) : (best && best.text ? [{t:best.text, c:best.score}] : []);
                console.log(`[cropOCR] ${def.name}: extracted "${bestText.slice(0,60)}" (score: ${(best?.score || 0).toFixed(2)})`);
                found = true;
              } else if (best?.text) {
                console.log(`[cropOCR] ${def.name}: rejected "${best.text.slice(0,40)}" (looks like label-only)`);
              }
              break;
            } catch (e) {
              console.warn(`[cropOCR] ${def.name}: error during recognition`, e);
              /* ignore */
            }
          }
        }
        if (found) break;
      }

      if (found) continue;

      // fallback: search words sequences (up to 4 words) for label match
      const maxSeq = 4;
      for (let i = 0; i < wordSeq.length; i++) {
        for (let len = 1; len <= maxSeq && i + len <= wordSeq.length; len++) {
          const seq = wordSeq.slice(i, i + len);
          const joined = seq.map(s => s.text).join(' ').trim();
          for (const p of patterns) {
            if (p.test(joined)) {
              const b = bboxForWords(seq);
              if (!b) continue;
              const left = Math.max(0, (b.x0 ?? b.x ?? 0) - 16);
              const top = Math.max(0, (b.y0 ?? b.y ?? 0) - 4);
              const bottom = Math.min(canvas.height - 1, (b.y1 ?? ((b.y0 ?? b.y ?? 0) + 40)) + 6);
              const belowCrop = cropCanvas(
                canvas,
                left,
                bottom,
                Math.max(1, canvas.width - left - 8),
                Math.max(30, Math.min(220, canvas.height - bottom - 4))
              );
              const rightX = Math.min(canvas.width - 1, (b.x1 ?? ((b.x0 ?? b.x ?? 0) + 0)) + 4);
              const rightCrop = cropCanvas(
                canvas,
                rightX,
                top,
                Math.max(1, Math.min(600, canvas.width - rightX - 4)),
                Math.max(20, Math.min(canvas.height - top - 4, (b.y1 - b.y0) + 40))
              );
              try {
                const best = await pickBestCropText([belowCrop, rightCrop], def.name);
                //aditya change
                const bestText = best && best.text ? best.text.trim() : '';
                out[def.name] = looksLikeLabelOnly(bestText) ? '' : bestText;
                debug[def.name] = best && best.raw && best.raw.data ? (best.raw.data.words || []).map(w=>({t:w.text, c:w.confidence})) : (best && best.text ? [{t:best.text, c:best.score}] : []);
                found = true;
                break;
              } catch (e) {}
            }
          }
          if (found) break;
        }
        if (found) break;
      }

      // Log label detection result for each field
      if (!patternMatched) {
        console.log(`[cropOCR] ${def.name}: NO matching label found in document (patterns not matched)`);
      }
    }

    // store debug info for inspection by callers
    lastCropDebug = debug;

    await worker.terminate();
    return out;
  } catch (err) {
    try { await worker.terminate(); } catch (e) {}
    return {};
  }
}
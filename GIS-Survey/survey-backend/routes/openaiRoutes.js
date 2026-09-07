const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// Simple in-memory rate limiter (per-IP)
const rateMap = new Map(); // ip -> { count, windowStart }
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 20; // max requests per window per IP

function checkRateLimit(req, res) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, windowStart: now };
  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count += 1;
  rateMap.set(ip, entry);
  const remaining = Math.max(0, RATE_LIMIT_MAX - entry.count);
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX);
  res.setHeader('X-RateLimit-Remaining', remaining);
  if (entry.count > RATE_LIMIT_MAX) return false;
  return true;
}

function redactPII(s) {
  if (!s || typeof s !== 'string') return s;
  // redact long digit sequences (phones, ids)
  let out = s.replace(/\d{4,}/g, '[REDACTED]');
  // redact emails
  out = out.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED]');
  return out;
}

function compactValue(v) {
  return String(v || '').replace(/[\s\u00A0]+/g, ' ').trim();
}

function looksLikeLabelOnly(text) {
  if (!text) return false;
  const LABEL_ONLY_WORDS = new Set([
    'owner','occupier','name','ward','zone','property','no','number','old','new',
    'taxable','value','proposed','tax','notice','date','of','the','and','address',
    'usage','construction','year','area','rate','mobile','phone','location','reason',
    'hearing','venue','assessment','notice','proposed','taxable'
  ]);
  const tokens = String(text || '')
    .replace(/[:\-\|]+/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (!tokens.length) return false;
  const labelTokens = tokens.filter((t) => LABEL_ONLY_WORDS.has(t) || /^\d+$/.test(t));
  return labelTokens.length >= Math.max(2, Math.floor(tokens.length * 0.9));
}

function linesFromText(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => compactValue(line))
    .filter(Boolean);
}

function extractLabeledValue(text, labelPatterns) {
  const lines = linesFromText(text);
  for (const line of lines) {
    for (const pattern of labelPatterns) {
      const match = line.match(pattern);
      if (match) {
        const value = compactValue(match[1] || match[2] || '');
        if (value) return value;
      }
    }
  }
  return '';
}

function normalizeExtractedFields(parsed, text, targetFields, fallbackDraft = {}) {
  const output = {};
  const source = parsed && typeof parsed === 'object' ? parsed : {};
  const rawText = String(text || '');
  const lines = linesFromText(rawText);

  const fallbackLine = (predicate) => {
    for (const line of lines) {
      if (predicate(line)) return line;
    }
    return '';
  };

  const labelPatterns = {
    ownerName: [
      /(?:^|\b)(?:owner\s*name|owner|name)\s*[:\-]?\s*(.+)$/i,
    ],
    occupierName: [
      /(?:^|\b)(?:occupier\s*name|occupier|tenant)\s*[:\-]?\s*(.+)$/i,
    ],
    address: [
      /(?:^|\b)(?:address|property\s*address|site\s*address|location)\s*[:\-]?\s*(.+)$/i,
    ],
    mobile: [
      /(?:^|\b)(?:mobile|mobile\s*no|mobile\s*number|phone|phone\s*no|contact|contact\s*no)\s*[:\-]?\s*([+]?\d[\d\s()-]{5,})$/i,
    ],
    ward: [
      /(?:^|\b)(?:ward|ward\s*no|ward\s*number)\s*[:\-]?\s*(.+)$/i,
    ],
    zone: [
      /(?:^|\b)(?:zone|zone\s*no|zone\s*number)\s*[:\-]?\s*(.+)$/i,
    ],
    newPropertyNo: [
      /(?:^|\b)(?:new\s*property\s*no|new\s*property\s*number|property\s*no|property\s*number|assessment\s*no)\s*[:\-]?\s*(.+)$/i,
    ],
    oldPropertyNo: [
      /(?:^|\b)(?:old\s*property\s*no|old\s*property\s*number|old\s*no|previous\s*property\s*no)\s*[:\-]?\s*(.+)$/i,
    ],
    usageType: [
      /(?:^|\b)(?:usage\s*type|usage|property\s*usage|nature\s*of\s*property)\s*[:\-]?\s*(.+)$/i,
    ],
    constructionType: [
      /(?:^|\b)(?:construction\s*type|building\s*type|structure\s*type)\s*[:\-]?\s*(.+)$/i,
    ],
    constructionYear: [
      /(?:^|\b)(?:construction\s*year|year\s*of\s*construction|built\s*year|year)\s*[:\-]?\s*((?:19|20)\d{2})\b/i,
    ],
    area: [
      /(?:^|\b)(?:area|plot\s*area|built\s*up\s*area|carpet\s*area)\s*[:\-]?\s*([\d.,]+(?:\s*(?:sq\.?\s*ft|sqm|m2|sq\.?\s*m))?)/i,
    ],
    rate: [
      /(?:^|\b)(?:rate|tax\s*rate|annual\s*rate|property\s*tax)\s*[:\-]?\s*([\d.,]+)/i,
    ],
  };

  for (const field of targetFields) {
    let value = compactValue(source[field]);

    if (!value && fallbackDraft && typeof fallbackDraft === 'object') {
      const fallbackValue = compactValue(fallbackDraft[field]);
      if (fallbackValue && fallbackValue.length >= 2) {
        value = fallbackValue;
      }
    }

    if (!value && labelPatterns[field]) {
      value = extractLabeledValue(rawText, labelPatterns[field]);
    }

    if (!value && field === 'mobile') {
      const match = rawText.match(/\b\+?\d[\d\s()-]{5,}\b/);
      value = match ? compactValue(match[0]).replace(/[^0-9+]/g, '') : '';
    }

    if (!value && field === 'constructionYear') {
      const match = rawText.match(/\b(?:19|20)\d{2}\b/);
      value = match ? match[0] : '';
    }

    if (!value && (field === 'area' || field === 'rate')) {
      const match = fallbackLine((line) => new RegExp(`\\b${field}\\b`, 'i').test(line));
      if (match) {
        const numberMatch = match.match(/-?\d+(?:[.,]\d+)?/);
        value = numberMatch ? numberMatch[0] : '';
      }
    }

    if (!value && (field === 'ward' || field === 'zone')) {
      const match = fallbackLine((line) => new RegExp(`\\b${field}\\b`, 'i').test(line));
      if (match) {
        value = compactValue(match.replace(new RegExp(`.*?\\b${field}\\b\\s*[:\-]?\\s*`, 'i'), ''));
      }
    }

    if (!value && (field === 'ownerName' || field === 'occupierName')) {
      const match = fallbackLine((line) => new RegExp(`\\b${field.replace('Name', '')}\\b`, 'i').test(line));
      if (match) {
        value = compactValue(match.replace(/^[^:：\-]+[:：\-]\s*/, ''));
      }
    }

    if (!value && field === 'address') {
      const addressLine = fallbackLine((line) => /\b(address|property address|site address|location)\b/i.test(line));
      if (addressLine) {
        value = compactValue(addressLine.replace(/^[^:：\-]+[:：\-]\s*/, ''));
      } else {
        const likelyAddress = lines.find((line) => /\d/.test(line) && /[,/-]/.test(line)) || lines.find((line) => /\d/.test(line) && line.split(' ').length >= 3);
        if (likelyAddress) value = compactValue(likelyAddress);
      }
    }

    if (!value && field === 'usageType') {
      const usageLine = fallbackLine((line) => /\b(residential|commercial|industrial|mixed|institutional|vacant|agricultural)\b/i.test(line));
      if (usageLine) value = compactValue(usageLine.replace(/^[^:：\-]+[:：\-]\s*/, ''));
    }

    if (looksLikeLabelOnly(value)) {
      value = '';
    }

    output[field] = compactValue(value);
  }

  return output;
}

// POST /api/ocr/clean
// Body: { text: "...", fields?: ["ownerName", ...] }
router.post('/ocr/clean', async (req, res) => {
  try {
    if (!checkRateLimit(req, res)) return res.status(429).json({ error: 'Too many requests' });
    const { text, ocrText, fields, fieldSnapshot } = req.body || {};
    const rawOcrText = compactValue(ocrText || text);
    if (!rawOcrText) return res.status(400).json({ error: 'ocrText required' });

    const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY;
    const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
    const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct';
    if (!NVIDIA_API_KEY) return res.status(500).json({ error: 'NVIDIA_API_KEY not configured in environment' });

    const targetFields = Array.isArray(fields) && fields.length > 0 ? fields : [
      'ownerName','occupierName','address','mobile','ward','zone','newPropertyNo','oldPropertyNo','usageType','constructionType','constructionYear','area','rate'
    ];

    const systemPrompt = `You are an assistant that converts noisy OCR text into a strict JSON object.
  Return ONLY valid JSON with exactly these keys: ${targetFields.join(', ')}.
  Do not add extra keys, markdown, or explanation text.
  If a field cannot be found, set it to an empty string.
  Prefer values that appear after labels like Owner Name, Occupier Name, Address, Mobile, Ward, Zone, Property No, Usage Type, Construction Type, Construction Year, Area, Rate.
  Normalize phone numbers to digits only, years to 4 digits, and numeric fields (area, rate) to plain numbers.`;

    // Do not log raw text; redact before any logging
    const redactedForLogs = redactPII(rawOcrText);
    const userPrompt = `OCR text:\n\n${rawOcrText}\n\nReturn a JSON object with the fields: ${targetFields.join(', ')}.`;
    console.log('[ai/clean] incoming request', { fields: targetFields.length, snippet: redactedForLogs.slice(0,200) });

    const body = {
      model: NVIDIA_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0,
      max_tokens: 800
    };

    const resp = await fetch(`${NVIDIA_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const respJson = await resp.json();
    console.log('[ai/clean] provider status', resp.status);
    try {
      const redactedRespJson = JSON.stringify(respJson).slice(0, 1000).replace(/\d{4,}/g, '[REDACTED]');
      console.log('[ai/clean] provider response (redacted snippet):', redactedRespJson);
    } catch (e) {}

    const content = respJson?.choices?.[0]?.message?.content || '';

    // Try to extract JSON substring and parse it
    let parsed = null;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // attempt to find the first {...} block
      const m = content.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch (e2) { parsed = null; }
      }
    }

    const normalized = normalizeExtractedFields(parsed, rawOcrText, targetFields, fieldSnapshot);

    // redact any PII before including assistant content in logs
    const redactedAssistant = redactPII(content);
    console.log('[ai/clean] assistant response snippet:', redactedAssistant.slice(0,200));

    const out = { json: normalized, text: content, raw: respJson };
    if (!content || String(content).trim() === '') {
      out.warning = 'empty_assistant_content';
    }
    return res.json(out);
  } catch (err) {
    console.error('AI clean route error:', redactPII(String(err)));
    return res.status(500).json({ error: 'Failed to call AI provider', details: String(err) });
  }
});

module.exports = router;

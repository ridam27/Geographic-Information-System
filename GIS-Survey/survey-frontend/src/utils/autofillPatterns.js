import { normalizeOcrText, extractLabeledValue } from "./ocrHelpers";

const COMMON_PATTERNS = {
  ownerName: [/owner\s*(?:name|s\s*name)?[:\-]*/i, /मालिक\s*(?:का\s*)?नाम[:\-]*/],
  address: [/address[:\-]*/i, /पता[:\-]*/],
  ward: [/ward\s*(?:no\.?)?[:\-]*/i, /वार्ड\s*(?:न\.)?[:\-]*/],
  zone: [/zone\s*(?:no\.?)?[:\-]*/i, /जोन\s*(?:न\.)?[:\-]*/],
  propertyNo: [/property\s*(?:no\.?|number)[:\-]*/i, /प्रॉपर्टी\s*न\.?[:\-]*/],
  newPropertyNo: [/new\s*(?:property\s*)?(?:no\.?|number)[:\-]*/i, /नया\s*(?:प्रॉपर्टी\s*)?न\.?[:\-]*/],
  oldPropertyNo: [/old\s*(?:property\s*)?(?:no\.?|number)[:\-]*/i, /पुराना\s*(?:प्रॉपर्टी\s*)?न\.?[:\-]*/],
  latitude: [/latitude[:\-]*/i, /अक्षांश[:\-]*/],
  longitude: [/longitude[:\-]*/i, /देशांतर[:\-]*/],
};

export const AUTOFILL_PATTERNS = {
  appeal: {
    fields: ["ownerName", "ward", "propertyNo", "previousTax", "revisedTax", "appealReason"],
    patterns: {
      ...COMMON_PATTERNS,
      previousTax: [/previous\s*(?:tax|amount)[:\-]*/i, /पिछला\s*(?:कर|राशि)[:\-]*/],
      revisedTax: [/revised\s*(?:tax|amount)[:\-]*/i, /संशोधित\s*(?:कर|राशि)[:\-]*/],
      appealReason: [/(?:reason|grounds)\s*(?:for\s*)?appeal[:\-]*/i, /अपील\s*(?:का\s*)?कारण[:\-]*/],
    },
  },
  hearing: {
    fields: ["ownerName", "address", "ward", "zone", "hearingDate", "hearingTime", "hearingLocation"],
    patterns: {
      ...COMMON_PATTERNS,
      hearingDate: [/hearing\s*date[:\-]*/i, /सुनवाई\s*की\s*तारीख[:\-]*/],
      hearingTime: [/hearing\s*time[:\-]*/i, /सुनवाई\s*का\s*समय[:\-]*/],
      hearingLocation: [/hearing\s*(?:location|venue|place)[:\-]*/i, /सुनवाई\s*(?:का\s*)?स्थान[:\-]*/],
    },
  },
  namuna43: {
    fields: ["ownerName", "ward", "zone", "propertyNo", "noticeReason", "noticeDate"],
    patterns: {
      ...COMMON_PATTERNS,
      noticeReason: [/(?:reason|grounds)\s*(?:for\s*)?notice[:\-]*/i, /नोटिस\s*(?:का\s*)?कारण[:\-]*/],
      noticeDate: [/notice\s*date[:\-]*/i, /नोटिस\s*की\s*तारीख[:\-]*/],
    },
  },
  notice119: {
    fields: ["ownerName", "ward", "zone", "newPropertyNo", "oldPropertyNo", "taxableValue", "proposedTax", "noticeDate"],
    patterns: {
      ...COMMON_PATTERNS,
      taxableValue: [/taxable\s*(?:value|amount)[:\-]*/i, /कर\s*(?:योग्य\s*)?(?:मूल्य|राशि)[:\-]*/],
      proposedTax: [/proposed\s*(?:tax|amount)[:\-]*/i, /प्रस्तावित\s*(?:कर|राशि)[:\-]*/],
      noticeDate: [/notice\s*date[:\-]*/i, /नोटिस\s*की\s*तारीख[:\-]*/],
    },
  },
};

export function extractDraftFromText(documentText, formType) {
  const formConfig = AUTOFILL_PATTERNS[formType] || AUTOFILL_PATTERNS.appeal;
  const allPatterns = Object.values(formConfig.patterns).flat();
  const draft = {};

  for (const fieldName of formConfig.fields) {
    const labelPatterns = formConfig.patterns[fieldName] || [];
    const value = extractLabeledValue(documentText, labelPatterns, allPatterns);
    if (value) {
      draft[fieldName] = value;
    }
  }

  return draft;
}

export function applyDraftToForm(previousState, draft) {
  const updated = { ...previousState };
  for (const [key, value] of Object.entries(draft)) {
    if (key in updated && !updated[key]) {
      updated[key] = value || "";
    }
  }
  return updated;
}

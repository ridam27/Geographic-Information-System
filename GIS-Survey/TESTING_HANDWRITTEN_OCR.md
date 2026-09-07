# Testing Handwritten OCR Improvements

## Overview
This guide tests the enhanced OCR pipeline that now supports handwritten documents through:
- PSM mode 11 for sparse/scattered text
- Name/address field detection
- Per-field crop OCR with improved logging
- Cross-source merging (printed, HTR, crop)

## Prerequisites
- Frontend built: `npm run build` (✓ completed)
- Browser with DevTools available
- Test document with handwritten fields (provided or create new one)

## Test Environment Setup

### 1. Start Local Dev Server
```bash
cd survey-frontend
npm start
```
Wait for it to open http://localhost:3000

### 2. Open Browser Console
- Press `F12` to open DevTools
- Go to **Console** tab
- Keep this visible during testing

## Test Scenarios

### Scenario 1: Handwritten Notice Document

**Test Image**: Use any Notice119 document with handwritten fields

**Expected Console Output**:
```
[autofill] Printed OCR draft: {"ownerName":"...","ward":"..."}
[autofill] Crop OCR draft: {"ownerName":"...","ward":"...","zone":"..."}
[cropOCR] ownerName: extracted "... handwritten text ..." (score: 0.85)
[cropOCR] ward: extracted "..." (score: 0.92)
```

**Steps**:
1. Navigate to Notice119 form
2. Click upload document
3. Select handwritten notice image
4. **Expected**: Notice119 fields (ownerName, ward, zone, propertyNo, etc.) appear in form
5. **Verify**: Console shows extraction messages with confidence scores

**Success Criteria**:
- ✓ At least 3-4 fields populate
- ✓ Console shows `[cropOCR]` messages indicating per-field recognition
- ✓ Confidence scores > 0.7 for most fields

---

### Scenario 2: Test with PropertyDetails Form

**Expected**: PropertyDetails form should continue working (regression test)

**Steps**:
1. Navigate to PropertyDetails form
2. Upload same handwritten document (or different one)
3. **Expected**: Property-specific fields populate (area, constructionType, etc.)

**Success Criteria**:
- ✓ Form fields populate like before
- ✓ No errors in console
- ✓ Console shows `[cropOCR]` messages

---

### Scenario 3: Multiple Field Types

**Test with**: Document containing:
- Handwritten text (name, address fields)
- Printed text (zone, ward, etc.)
- Mixed handwriting/print

**Expected Behavior**:
```
[autofill] Printed OCR draft: {"ward":"123","zone":"A1"}
[autofill] Crop OCR draft: {"ownerName":"John","address":"...","ward":"123"}
```

Form should show:
- Printed fields from Printed OCR
- Handwritten fields from Crop OCR
- Merged result with best of both

---

### Scenario 4: Check Console Diagnostics

**Look For These Messages**:

1. **Label Detection**: 
   ```
   [cropOCR] ownerName: extracted "..." (score: 0.85)
   ```

2. **Rejected Entries**:
   ```
   [cropOCR] ward: rejected "ward:" (looks like label-only)
   ```

3. **Failed Fields**:
   ```
   [cropOCR] zone: error during recognition [error details]
   ```

**Diagnostics**:
- If many "rejected" messages: Crop region includes label
- If many "error" messages: Field detection not finding labels
- If many empty messages: PSM modes not recognizing text

---

## Troubleshooting Guide

### Issue: Fields Still Empty
**Check**:
1. Console for `[autofill]` messages - do they show any extracted fields?
2. Is `[cropOCR]` being called? If not, labels not detected
3. Check `[cropOCR] field_name: rejected...` - field recognized but rejected

**Solution**:
- Adjust preprocessing threshold in `documentAutofillHelpers.js` line 365
- Try lower threshold (100-110) for light images
- Try higher threshold (140-150) for dark images

### Issue: Wrong Fields Populated
**Cause**: Field label detection finding wrong labels

**Solution**:
- Check console for label detection details
- May need to adjust label proximity radius
- Verify form field definitions match document

### Issue: Low Confidence Scores (< 0.7)
**Cause**: Handwriting too unclear or document quality poor

**Solution**:
- Try PSM mode 11 by itself (currently runs with others)
- Increase preprocessing contrast from 1.25x to 1.5x
- Try different preprocessing threshold

### Issue: "Unnecessary escape character" Warnings
**Status**: Pre-existing ESLint warnings, safe to ignore
- Build succeeds despite warnings
- Functionality unaffected

---

## Advanced Debugging

### Enable Tesseract Debug Logging
Edit `documentAutofillHelpers.js` line 1391:
```javascript
// Change:
const worker = await Tesseract.createWorker('eng');

// To:
const worker = await Tesseract.createWorker('eng', undefined, {
  logger: msg => console.log('[Tesseract]', msg.status, msg.progress)
});
```

Then rebuild: `npm run build`

### Check Image Preprocessing
Edit `documentAutofillHelpers.js` line 365-366:
```javascript
// Try different threshold values
const threshold = 127;  // Current
// const threshold = 110;  // Lighter images
// const threshold = 140;  // Darker images
```

### Log Crop Regions
Add temporary logging in `cropAndOcrFields()`:
```javascript
console.log(`[cropDebug] Crop region: (${x},${y}) ${w}x${h}`);
```

---

## Test Results Template

**Date**: _______________
**Document**: _______________
**Form Used**: _______________

| Field Name | Expected | Got | Confidence | Status |
|------------|----------|-----|------------|--------|
| ownerName | John Doe | | | [ ] Pass |
| ward | 123 | | | [ ] Pass |
| zone | A1 | | | [ ] Pass |

**Console Messages Observed**:
- [ ] [autofill] Printed OCR draft
- [ ] [autofill] Crop OCR draft
- [ ] [cropOCR] extraction messages

**Overall Result**: [ ] PASS  [ ] FAIL  [ ] PARTIAL

**Notes**:
_________________

---

## Regression Tests

Run after each code change:

1. **PDF with text layer**: Should use text layer if fields are valid
2. **Scanned image**: Should fallback to OCR pipeline
3. **PropertyDetails form**: Existing functionality should not break
4. **All form types**: Notice119, Appeal, Hearing, Namuna43

---

## Performance Notes

- Initial worker creation: ~1-2 seconds
- Per-field crop OCR: ~0.5-1 second per field
- Full document processing: ~5-10 seconds for 6-8 fields
- PSM mode 11 adds ~20% overhead to recognition time

---

## Next Optimization Ideas

1. **Worker pooling**: Keep worker alive between uploads
2. **Parallel field processing**: Recognize multiple fields in parallel
3. **Smart threshold**: Auto-detect image contrast and set threshold
4. **Caching**: Store recognition results for identical crops
5. **ML-based validation**: Use confidence scores to reject low-quality results

---

## Related Files

- Main OCR code: `survey-frontend/src/Components/MapAndForms/JavaScript/documentAutofillHelpers.js`
- Form components: `survey-frontend/src/Components/MapAndForms/JavaScript/*Form.js`
- Form definitions: Look for `*_FIELD_DEFINITIONS` in form components

---

Last Updated: [After PSM 11 Implementation]
Improvements: Enhanced handwritten text recognition, per-field logging, cross-source merging

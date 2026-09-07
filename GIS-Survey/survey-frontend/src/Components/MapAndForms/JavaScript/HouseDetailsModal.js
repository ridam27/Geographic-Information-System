import { useState, useEffect } from 'react';
import { Save, X, UploadCloud } from 'lucide-react';
import '../Style/HouseDetailsModal.css';
import { DocumentAutofillOverlay, useDocumentAutofill } from './documentAutofillHelpers';

const initialState = {
  propertyNumber: '',
  assessmentYear: '',
  oldAssessmentValue: '',
  oldAssessmentYear: '',
  ownerName: '',
  ownerUID: '',
  ownerType: 'Private',
  occupierName: '',
  occupierUID: '',
  propertyAddress: '',
  propertyName: '',
  pinCode: '',
  latitude: '',
  longitude: '',
  propertyCategory: 'Owner',
  natureOfProperty: 'Individual',
  usageOfProperty: 'Residential',
  ageOfBuilding: '',
  mobileNumber: '',
  email: '',
  yearOfConstruction: '',
  floorNumber: '',
  floorArea: '',
  totalArea: '',
  floorConstructionType: 'RCC structure',
  floorUseType: 'Residential',
  shopOfficeNumber: '',
  photos: null,
};

const HOUSE_DETAILS_FIELD_DEFINITIONS = [
  { name: 'propertyNumber', patterns: [/property\s*number/i, /property\s*no\.?/i, /property\s*id/i, /survey\s*no\.?/i] },
  { name: 'ownerName', patterns: [/owner\s*name/i, /name\s*of\s*owner/i, /property\s*owner/i, /owner\b/i] },
  { name: 'occupierName', patterns: [/occupier\s*name/i, /tenant\s*name/i, /name\s*of\s*occupier/i] },
  { name: 'propertyAddress', patterns: [/address\s*of\s*property/i, /property\s*address/i, /\baddress\b/i] },
  { name: 'propertyName', patterns: [/property\s*name/i, /name\s*of\s*property/i] },
  { name: 'pinCode', patterns: [/pin\s*code/i, /postal\s*code/i, /pincode/i], type: 'number' },
  { name: 'mobileNumber', patterns: [/mobile\s*number/i, /phone\s*number/i, /contact\s*number/i], type: 'number' },
  { name: 'yearOfConstruction', patterns: [/year\s*of\s*construction/i, /construction\s*year/i, /built\s*year/i], type: 'number' },
  { name: 'totalArea', patterns: [/total\s*area/i, /built[-\s]*up\s*area/i, /carpet\s*area/i, /\barea\b/i] },
  { name: 'ageOfBuilding', patterns: [/age\s*of\s*building/i, /building\s*age/i], type: 'number' },
  { name: 'floorArea', patterns: [/floor\s*area/i], type: 'number' },
  { name: 'shopOfficeNumber', patterns: [/shop\s*office\s*no\.?/i, /office\s*no\.?/i, /shop\s*no\.?/i], type: 'number' },
  { name: 'email', patterns: [/email\s*id/i, /e-?mail/i] }
];

export default function HouseDetailsModal({ isOpen, onClose, onSave, capturedLocation }) {
  const [formData, setFormData] = useState(initialState);

  const {
    fileInputRef,
    documentFile,
    isAutofillPanelOpen,
    setIsAutofillPanelOpen,
    importError,
    isAnalyzing,
    draftPreview,
    openDocumentPicker,
    handleDocumentChange,
    handleDocumentDrop,
    handleDocumentDragOver
  } = useDocumentAutofill(HOUSE_DETAILS_FIELD_DEFINITIONS, {
    onDraft: (draft) => {
      setFormData((prev) => ({ ...prev, ...draft }));
    },
  });

  useEffect(() => {
    if (capturedLocation) {
      setFormData(prev => ({
        ...prev,
        latitude: capturedLocation.lat.toFixed(7),
        longitude: capturedLocation.lng.toFixed(7),
      }));
    }
  }, [capturedLocation]);

  const sanitizeDigits = (val) => {
    // remove non-digits
    return val.replace(/\D+/g, '');
  };

  const sanitizeOwnerName = (val) => {
    // allow letters, spaces, dot, hyphen and apostrophe — strip digits and other weird characters
    return val.replace(/[^A-Za-z\s.'-]/g, '');
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;

    if (type === 'file') {
      setFormData(prev => ({ ...prev, [name]: e.target.files }));
      return;
    }

    let newVal = value;

    switch (name) {
      // numeric-only fields (integers)
      case 'propertyNumber':
      case 'oldAssessmentValue':
      case 'totalArea':
      case 'floorArea':
      case 'floorNumber':
      case 'shopOfficeNumber':
        newVal = sanitizeDigits(value);
        break;

      case 'pinCode':
        newVal = sanitizeDigits(value).slice(0, 6); // max 6 digits
        break;

      case 'ageOfBuilding':
        newVal = sanitizeDigits(value).slice(0, 2); // max 2 digits
        break;

      case 'mobileNumber':
        newVal = sanitizeDigits(value).slice(0, 10); // max 10 digits
        break;

      case 'assessmentYear':
      case 'oldAssessmentYear':
        newVal = sanitizeDigits(value).slice(0, 4); // only digits, max 4
        break;

      case 'ownerName':
        newVal = sanitizeOwnerName(value);
        break;

      case 'ownerUID':
      case 'occupierUID':
        // allow alphanumeric but keep as-is; placeholder handled in JSX
        newVal = value;
        break;

      case 'email':
        newVal = value;
        break;

      default:
        // leave other fields unchanged
        newVal = value;
    }

    setFormData(prev => ({ ...prev, [name]: newVal }));
  };

  const validateBeforeSave = (data) => {
    // Required basic checks
    if (!data.ownerName || !data.propertyAddress) {
      alert('Please fill in required fields: Owner Name and Address.');
      return false;
    }

    // Owner name should be alphabetic (at least one letter)
    if (!/[A-Za-z]/.test(data.ownerName)) {
      alert('Owner name must contain alphabetic characters only.');
      return false;
    }

    // assessment years must be 4 digits if provided
    if (data.assessmentYear && data.assessmentYear.length !== 4) {
      alert('Assessment Year must be 4 digits (e.g., 2024).');
      return false;
    }
    if (data.oldAssessmentYear && data.oldAssessmentYear.length !== 4) {
      alert('Old Assessment Year must be 4 digits (e.g., 2020).');
      return false;
    }

    // mobile number must be exactly 10 digits if provided
    if (data.mobileNumber && data.mobileNumber.length !== 10) {
      alert('Mobile number must be exactly 10 digits.');
      return false;
    }

    // pinCode max 6 digits if provided
    if (data.pinCode && data.pinCode.length > 6) {
      alert('Postal Pin code cannot be more than 6 digits.');
      return false;
    }

    // age of building max 2 digits if provided
    if (data.ageOfBuilding && (isNaN(Number(data.ageOfBuilding)) || data.ageOfBuilding.length > 2)) {
      alert('Age of Building must be a number with up to 2 digits.');
      return false;
    }

    // totalArea and oldAssessmentValue and propertyNumber should be numeric when provided
    const numericFields = ['propertyNumber', 'oldAssessmentValue', 'totalArea', 'floorArea', 'floorNumber', 'shopOfficeNumber'];
    for (const f of numericFields) {
      if (data[f] && !/^\d+$/.test(String(data[f]))) {
        alert(`${f} must contain digits only.`);
        return false;
      }
    }
    
    // email basic check when provided
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      alert('Please enter a valid email address.');
      return false;
    }

    return true;
  };

  const handleSaveClick = () => {
    // run validation
    if (!validateBeforeSave(formData)) return;

    // prepare final data: convert appropriate fields to numbers (as user requested digits)
    const finalData = { ...formData };

    // fields to convert to numbers (if not empty)
    const integerFields = [
      'propertyNumber',
      'oldAssessmentValue',
      'totalArea',
      'floorArea',
      'floorNumber',
      'shopOfficeNumber',
      'ageOfBuilding',
      'assessmentYear',
      'oldAssessmentYear',
    ];

    integerFields.forEach((f) => {
      if (finalData[f] !== '' && finalData[f] !== null && finalData[f] !== undefined) {
        // parseInt will convert "012" -> 12; if you want to preserve leading zeros (e.g., pin code), do not convert
        finalData[f] = parseInt(finalData[f], 10);
      }
    });

    // mobileNumber keep as string of digits (but validated)
    // pinCode: preserve as string (to keep leading zeros) but ensure digits
    if (finalData.pinCode !== '' && finalData.pinCode !== null && finalData.pinCode !== undefined) {
      finalData.pinCode = String(finalData.pinCode);
    }

    onSave(finalData);
    setFormData(initialState);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">PTAX Data Collection</h3>
          <button onClick={onClose} className="modal-close-button"><X size={20} /></button>
        </div>

        <div className="modal-body">
          <fieldset>
            <legend>PMC Details (If available)</legend>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Property Number</label>
                <input
                  name="propertyNumber"
                  value={formData.propertyNumber}
                  onChange={handleChange}
                  inputMode="numeric"
                  pattern="\d*"
                  placeholder=""
                />
              </div>
              <div className="form-group">
                <label>Assessment Year</label>
                <input
                  name="assessmentYear"
                  value={formData.assessmentYear}
                  onChange={handleChange}
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="e.g., 2024"
                />
              </div>
              <div className="form-group">
                <label>Old Assessment Value</label>
                <input
                  name="oldAssessmentValue"
                  value={formData.oldAssessmentValue}
                  onChange={handleChange}
                  inputMode="numeric"
                  pattern="\d*"
                />
              </div>
              <div className="form-group">
                <label>Old Assessment Year</label>
                <input
                  name="oldAssessmentYear"
                  value={formData.oldAssessmentYear}
                  onChange={handleChange}
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="e.g., 2020"
                />
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Owner & Occupier Details</legend>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Property Owner Name (M)</label>
                <input
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Owner UID (M)</label>
                <input
                  name="ownerUID"
                  value={formData.ownerUID}
                  onChange={handleChange}
                  placeholder="remaining"
                />
              </div>
              <div className="form-group">
                <label>Type of Owner (M)</label>
                <select name="ownerType" value={formData.ownerType} onChange={handleChange}>
                  <option>Private</option>
                  <option>Public</option>
                  <option>State Government</option>
                  <option>Central Government</option>
                  <option>Semi Government</option>
                  <option>Municipal Corporation</option>
                  <option>Co-opp. Society (CHS)</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Name of Occupier / Tenant (M)</label>
                <input name="occupierName" value={formData.occupierName} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Occupier UID (M)</label>
                <input
                  name="occupierUID"
                  value={formData.occupierUID}
                  onChange={handleChange}
                  placeholder="remaining"
                />
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Property Address & Location</legend>
            <div className="form-group">
              <label>Address of Property (M)</label>
              <textarea name="propertyAddress" value={formData.propertyAddress} onChange={handleChange} rows="2"></textarea>
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Name of the Property (M)</label>
                <input name="propertyName" value={formData.propertyName} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Postal Pin code (M)</label>
                <input
                  name="pinCode"
                  value={formData.pinCode}
                  onChange={handleChange}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder=""
                />
              </div>
              <div className="form-group">
                <label>Latitude (M) (Auto-filled)</label>
                <input name="latitude" value={formData.latitude} readOnly />
              </div>
              <div className="form-group">
                <label>Longitude (M) (Auto-filled)</label>
                <input name="longitude" value={formData.longitude} readOnly />
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Property Classification</legend>
            <div className="form-grid-3">
              <div className="form-group">
                <label>Category of Property (M)</label>
                <select name="propertyCategory" value={formData.propertyCategory} onChange={handleChange}>
                  <option>Owner</option>
                  <option>Tenant/Occupier</option>
                  <option>Lease or Rent</option>
                </select>
              </div>
              <div className="form-group">
                <label>Nature of Property (M)</label>
                <select name="natureOfProperty" value={formData.natureOfProperty} onChange={handleChange}>
                  <option>Individual</option>
                  <option>Apartments</option>
                  <option>Row House</option>
                  <option>Building</option>
                  <option>Shopping mall</option>
                  <option>Open plot</option>
                </select>
              </div>
              <div className="form-group">
                <label>Usage of Property (M)</label>
                <select name="usageOfProperty" value={formData.usageOfProperty} onChange={handleChange}>
                  <option>Residential</option>
                  <option>Commercial</option>
                  <option>Industrial</option>
                  <option>Institutional</option>
                  <option>Government</option>
                  <option>Hospital</option>
                  <option>Community Hall</option>
                  <option>Entertainment Hall</option>
                  <option>Without CC</option>
                  <option>Change of properties</option>
                  <option>Unauthorized towers</option>
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Building Details</legend>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Age of Building (M)</label>
                <input
                  name="ageOfBuilding"
                  type="text"
                  value={formData.ageOfBuilding}
                  onChange={handleChange}
                  inputMode="numeric"
                  maxLength={2}
                  placeholder=""
                />
              </div>
              <div className="form-group">
                <label>Year of Construction (M)</label>
                <input
                  name="yearOfConstruction"
                  type="number"
                  placeholder="e.g., 2010"
                  value={formData.yearOfConstruction}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Total Carpet/Built-up Area (M)</label>
                <input
                  name="totalArea"
                  type="text"
                  placeholder="in Sq. Meter"
                  value={formData.totalArea}
                  onChange={handleChange}
                  inputMode="numeric"
                />
              </div>
              <div className="form-group">
                <label>Mobile Number (Optional)</label>
                <input
                  name="mobileNumber"
                  type="text"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10 digits"
                />
              </div>
              <div className="form-group">
                <label>E-mail ID (Optional) — @email.com</label>
                <input name="email" type="email" value={formData.email} onChange={handleChange} />
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Floor Details (Add for each floor)</legend>
            <div className="form-grid-3">
              <div className="form-group">
                <label>Floor Number (M)</label>
                <input
                  name="floorNumber"
                  type="text"
                  placeholder="e.g., 0 for Ground"
                  value={formData.floorNumber}
                  onChange={handleChange}
                  inputMode="numeric"
                />
              </div>
              <div className="form-group">
                <label>Floor Area (M)</label>
                <input
                  name="floorArea"
                  type="text"
                  placeholder="in Sq. Meter"
                  value={formData.floorArea}
                  onChange={handleChange}
                  inputMode="numeric"
                />
              </div>
              <div className="form-group">
                <label>Shop / Office No. (M)</label>
                <input
                  name="shopOfficeNumber"
                  value={formData.shopOfficeNumber}
                  onChange={handleChange}
                  inputMode="numeric"
                />
              </div>
              <div className="form-group">
                <label>Floor Construction (M)</label>
                <select name="floorConstructionType" value={formData.floorConstructionType} onChange={handleChange}>
                  <option>RCC structure</option>
                  <option>Load baring</option>
                  <option>Permanent shade</option>
                  <option>Temporary shade</option>
                </select>
              </div>
              <div className="form-group">
                <label>Floor Use Type (M)</label>
                <select name="floorUseType" value={formData.floorUseType} onChange={handleChange}>
                  <option>Residential</option>
                  <option>Commercial</option>
                  <option>Semi Commercial</option>
                  <option>Institution</option>
                  <option>Religious</option>
                  <option>Government</option>
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Attachments</legend>
            <div className="form-group">
              <label>Photograph of Building (M)</label>
              <input name="photos" type="file" accept="image/*" multiple onChange={handleChange} />
            </div>
          </fieldset>

        </div>

        <div className="modal-footer">
          <button type="button" onClick={() => setIsAutofillPanelOpen(true)} className="button-ghost footer-autofill-button">
            <UploadCloud size={16} /> Doc Autofill
          </button>
          <button onClick={onClose} className="button-secondary">Cancel</button>
          <button onClick={handleSaveClick} className="button-primary">
            <Save size={16} /> Save Survey Details
          </button>
        </div>
      </div>
      <DocumentAutofillOverlay
        isOpen={isAutofillPanelOpen}
        onClose={() => setIsAutofillPanelOpen(false)}
        title="Upload a handwritten property form to auto-fill House Details"
        description="Upload a scanned property document and let the system extract owner, property, and address values automatically."
        fileInputRef={fileInputRef}
        openDocumentPicker={openDocumentPicker}
        documentFile={documentFile}
        isAnalyzing={isAnalyzing}
        importError={importError}
        draftPreview={draftPreview}
        handleDocumentChange={handleDocumentChange}
        handleDocumentDrop={handleDocumentDrop}
        handleDocumentDragOver={handleDocumentDragOver}
      />
  );
}

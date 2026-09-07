import { useState, useEffect } from "react";
import { X, Save, UploadCloud } from "lucide-react";
import axios from "axios";
import "../Style/PropertyDetailsForm.css";
import { DocumentAutofillOverlay, useDocumentAutofill } from "./documentAutofillHelpers";

import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "https://geo-survey-backend-2fy8.onrender.com";

const initialState = {
  ownerName: "",
  occupierName: "",
  address: "",
  mobile: "",
  ward: "",
  zone: "",
  newPropertyNo: "",
  oldPropertyNo: "",

  usageType: "Residential",
  constructionType: "A",
  constructionYear: "",
  area: "",
  rate: "",

  taxableValue: 0,
  deduction: 0,
  finalTaxableValue: 0,
  propertyTax: 0,
  educationTax: 0,
  treeTax: 0,
  fireTax: 0,
  totalTax: 0,

   latitude: "",
  longitude: ""
};

const PROPERTY_FIELD_DEFINITIONS = [
  { name: "ownerName", patterns: [/owner\s*name/i, /name\s*of\s*owner/i] },
  { name: "occupierName", patterns: [/occupier\s*name/i, /name\s*of\s*occupier/i] },
  { name: "address", patterns: [/address/i, /property\s*address/i] },
  { name: "mobile", patterns: [/mobile/i, /phone/i, /phone\s*no\.?/i], type: "mobile" },
  { name: "ward", patterns: [/ward\s*no\.?/i, /ward\b/i] },
  { name: "zone", patterns: [/zone/i] },
  { name: "newPropertyNo", patterns: [/new\s*property\s*no\.?/i, /property\s*no\.?/i, /prop\.?\s*no\.?/i] },
  { name: "oldPropertyNo", patterns: [/old\s*property\s*no\.?/i, /property\s*no\.?/i, /old\s*prop\.?\s*no\.?/i] },
  { name: "usageType", patterns: [/usage\s*type/i] },
  { name: "constructionType", patterns: [/construction\s*type/i] },
  { name: "constructionYear", patterns: [/construction\s*year/i, /year\s*of\s*construction/i], type: "number" },
  { name: "area", patterns: [/area/i, /built\s*up\s*area/i, /area\s*of\s*plot/i], type: "number" },
  { name: "rate", patterns: [/rate/i, /tax\s*rate/i], type: "number" }
];

export default function PropertyDetailsForm({ isOpen, onClose, polygonLocation }) {

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
  } = useDocumentAutofill(PROPERTY_FIELD_DEFINITIONS, {
    onDraft: (draft) => {
      const normalizedDraft = Object.fromEntries(
        Object.entries(draft)
          .filter(([_, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])
      );
      console.log("Applying autofill draft to form:", normalizedDraft);
      setFormData((previousState) => ({
        ...previousState,
        ...normalizedDraft
      }));
    }
  });

  useEffect(() => {
  if (polygonLocation) {
    setFormData(prev => ({
      ...prev,
      latitude: polygonLocation.latitude,
      longitude: polygonLocation.longitude
    }));
  }
}, [polygonLocation]);

  const navigate = useNavigate();

  // -------------------------
  // AUTO TAX CALCULATION
  // -------------------------
  useEffect(() => {

    const area = parseFloat(formData.area) || 0;
    const rate = parseFloat(formData.rate) || 0;

    const taxableValue = area * rate;
    const deduction = taxableValue * 0.10;

    const finalTaxableValue = taxableValue - deduction;

    const propertyTax = finalTaxableValue * 0.12;
    const educationTax = finalTaxableValue * 0.02;
    const treeTax = finalTaxableValue * 0.01;
    const fireTax = finalTaxableValue * 0.01;

    const totalTax =
      propertyTax +
      educationTax +
      treeTax +
      fireTax;

    setFormData(prev => ({
      ...prev,
      taxableValue,
      deduction,
      finalTaxableValue,
      propertyTax,
      educationTax,
      treeTax,
      fireTax,
      totalTax
    }));

  }, [formData.area, formData.rate]);

  const handleChange = (e) => {

    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

  };



  // -------------------------
  // SAVE TO BACKEND
  // -------------------------
  const handleSave = async () => {

    try {

      // include polygon geometry if available so backend can persist full polygon
      const payload = { ...formData };
      if (polygonLocation && polygonLocation.geometry) {
        payload.geometry = polygonLocation.geometry;
        payload.polygonCoordinates = polygonLocation.coordinates;
      }

      await axios.post(
        `${API_BASE_URL}/api/property-details`,
        payload
      );

      alert("Property details saved successfully");

      setFormData(initialState);

      onClose();

    } catch (error) {

      console.error(error);

      alert("Failed to save property details");

    }

  };


  if (!isOpen) return null;



  return (
<div className="modal-overlay">
<div className={`modal-content professional-form ${isAutofillPanelOpen ? "autofill-open" : ""}`}>

        <div className="modal-header">
          <button onClick={() => navigate(0)} className="modal-close-button" aria-label="Back">
            <ArrowLeft size={18} />
          </button>
          <h3 className="modal-title">Main Property Assessment Entry</h3>
          <button onClick={onClose} className="modal-close-button" aria-label="Close">
            <X size={18} />
          </button>
        </div>

<div className="modal-body">

<div className={`property-form-shell ${isAutofillPanelOpen ? "is-blurred" : ""}`}>

<fieldset>
<legend>Owner Details</legend>

<div className="form-grid-2">

<div className="form-group">
<label>Owner Name</label>
<input
name="ownerName"
value={formData.ownerName}
onChange={handleChange}
/>
</div>

<div className="form-group">
<label>Occupier Name</label>
<input
name="occupierName"
value={formData.occupierName}
onChange={handleChange}
/>
</div>

<div className="form-group full-width">
<label>Address</label>
<textarea
name="address"
rows="2"
value={formData.address}
onChange={handleChange}
/>
</div>

<div className="form-group">
<label>Mobile</label>
<input
name="mobile"
value={formData.mobile}
onChange={handleChange}
/>
</div>

<div className="form-group">
<label>Ward</label>
<input
name="ward"
value={formData.ward}
onChange={handleChange}
/>
</div>

<div className="form-group">
<label>Zone</label>
<input
name="zone"
value={formData.zone}
onChange={handleChange}
/>
</div>

<div className="form-group">
<label>New Property No</label>
<input
name="newPropertyNo"
value={formData.newPropertyNo}
onChange={handleChange}
/>
</div>

<div className="form-group">
<label>Old Property No</label>
<input
name="oldPropertyNo"
value={formData.oldPropertyNo}
onChange={handleChange}
/>
</div>

</div>
</fieldset>


<fieldset>
<legend>Property Structure</legend>

<div className="form-grid-3">

<div className="form-group">
<label>Usage Type</label>
<select
name="usageType"
value={formData.usageType}
onChange={handleChange}
>
<option>Residential</option>
<option>Commercial</option>
<option>Industrial</option>
</select>
</div>

<div className="form-group">
<label>Construction Type</label>
<select
name="constructionType"
value={formData.constructionType}
onChange={handleChange}
>
<option value="A">A</option>
<option value="B">B</option>
<option value="C">C</option>
<option value="D">D</option>
<option value="E">E</option>
</select>
</div>

<div className="form-group">
<label>Construction Year</label>
<input
type="number"
name="constructionYear"
value={formData.constructionYear}
onChange={handleChange}
/>
</div>

<div className="form-group">
<label>Area (Sq.m)</label>
<input
type="number"
name="area"
value={formData.area}
onChange={handleChange}
/>
</div>

<div className="form-group">
<label>Rate</label>
<input
type="number"
name="rate"
value={formData.rate}
onChange={handleChange}
/>
</div>

</div>
</fieldset>


<fieldset className="tax-section">

<legend>Tax Calculation (System Generated)</legend>

<div className="tax-grid">

<div>
<span>Taxable Value</span>
<strong>₹ {formData.taxableValue.toFixed(2)}</strong>
</div>

<div>
<span>10% Deduction</span>
<strong>₹ {formData.deduction.toFixed(2)}</strong>
</div>

<div>
<span>Final Taxable Value</span>
<strong>₹ {formData.finalTaxableValue.toFixed(2)}</strong>
</div>

<div>
<span>Property Tax</span>
<strong>₹ {formData.propertyTax.toFixed(2)}</strong>
</div>

<div>
<span>Education Tax</span>
<strong>₹ {formData.educationTax.toFixed(2)}</strong>
</div>

<div>
<span>Tree Tax</span>
<strong>₹ {formData.treeTax.toFixed(2)}</strong>
</div>

<div>
<span>Fire Tax</span>
<strong>₹ {formData.fireTax.toFixed(2)}</strong>
</div>

<div className="total-tax">
<span>Total Tax</span>
<strong>₹ {formData.totalTax.toFixed(2)}</strong>
</div>

</div>

</fieldset>

</div>

</div>

<div className={`modal-footer ${isAutofillPanelOpen ? "is-blurred" : ""}`}>

<button
type="button"
onClick={() => setIsAutofillPanelOpen((previousState) => !previousState)}
className="button-ghost footer-autofill-button"
>
<UploadCloud size={16} /> {isAutofillPanelOpen ? "Hide Doc Autofill" : "Doc Autofill"}
</button>

<button onClick={onClose} className="button-secondary">
Cancel
</button>

<button onClick={handleSave} className="button-primary">
<Save size={16}/> Save
</button>

</div>

<DocumentAutofillOverlay
  isOpen={isAutofillPanelOpen}
  onClose={() => setIsAutofillPanelOpen(false)}
  title="Upload property hardcopy, auto-fill the form"
  description="Upload a scanned property document and the extracted values will populate the property fields automatically."
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

</div>
</div>
  );
}
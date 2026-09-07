import { useState, useEffect } from "react";
import { X, Save, UploadCloud } from "lucide-react";
import axios from "axios";
import "../Style/HouseDetailsModal.css";

import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { DocumentAutofillOverlay, useDocumentAutofill } from "./documentAutofillHelpers";
//adityachange
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "https://geo-survey-backend-2fy8.onrender.com";

const initialState = {
  ownerName: "",
  ward: "",
  propertyNo: "",
  previousTax: "",
  revisedTax: "",
  appealReason: "",
  latitude: "",
  longitude: ""
};

const APPEAL_FIELD_DEFINITIONS = [
  { name: "ownerName", patterns: [/owner\s*name/i, /name\s*of\s*owner/i] },
  { name: "ward", patterns: [/ward\s*no\.?/i, /ward\b/i] },
  { name: "propertyNo", patterns: [/property\s*no\.?/i, /property\s*number/i, /prop\.?\s*no\.?/i] },
  { name: "previousTax", patterns: [/previous\s*tax/i, /tax\s*previous/i, /tax\s*amount/i], type: "number" },
  { name: "revisedTax", patterns: [/revised\s*tax/i, /tax\s*revised/i], type: "number" },
  { name: "appealReason", patterns: [/appeal\s*reason/i, /reason\s*for\s*appeal/i, /justification/i] }
];

export default function AppealForm({ isOpen, onClose, polygonLocation }){
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
  } = useDocumentAutofill(APPEAL_FIELD_DEFINITIONS, {
    onDraft: (draft) => {
      console.log("Applying autofill draft to appeal form:", draft);
      setFormData((previousState) => ({
        ...previousState,
        ...draft
      }));
    }
  });

  useEffect(() => {
  if (polygonLocation) {
    setFormData((prev) => ({
      ...prev,
      latitude: polygonLocation.latitude,
      longitude: polygonLocation.longitude
    }));
  }
}, [polygonLocation]);
  

  const handleChange = (e) =>
    setFormData((previousState) => ({ ...previousState, [e.target.name]: e.target.value }));
  const navigate = useNavigate();

  
  const handleSave = async () => {
    try {
      // include polygon geometry if available so backend can persist full polygon
      const payload = { ...formData };
      if (polygonLocation && polygonLocation.geometry) {
        payload.geometry = polygonLocation.geometry;
        payload.polygonCoordinates = polygonLocation.coordinates;
      }

      await axios.post(`${API_BASE_URL}/api/appeal`, payload);

      alert("Appeal saved successfully");

      setFormData(initialState);
      onClose();

    } catch (error) {
      console.error("Error saving appeal:", error.response ? error.response.data : error);
      alert("Failed to save appeal");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content professional-form">
        <div className="modal-header">

  <button
  onClick={() => navigate(0)}
  className="modal-close-button"
>
  <ArrowLeft size={20}/>
</button>
  <h3>Appeal Form</h3>

  <button onClick={onClose} className="modal-close-button">
    <X size={20}/>
  </button>

</div>

        <div className="modal-body">
          <div className={`form-content-shell ${isAutofillPanelOpen ? "is-blurred" : ""}`}>
          <fieldset>
            <legend>Appeal Details</legend>
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
                <label>Ward</label>
                <input
                  name="ward"
                  value={formData.ward}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Property No</label>
                <input
                  name="propertyNo"
                  value={formData.propertyNo}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Previous Tax</label>
                <input
                  name="previousTax"
                  type="number"
                  value={formData.previousTax}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Revised Tax</label>
                <input
                  name="revisedTax"
                  type="number"
                  value={formData.revisedTax}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group full-width">
                <label>Appeal Reason</label>
                <textarea
                  name="appealReason"
                  rows="3"
                  value={formData.appealReason}
                  onChange={handleChange}
                />
              </div>

            </div>
          </fieldset>
          </div>
        </div>

        <div className={`modal-footer ${isAutofillPanelOpen ? "is-blurred" : ""}`}>

          <button
            type="button"
            onClick={() => setIsAutofillPanelOpen(true)}
            className="button-ghost footer-autofill-button"
          >
            <UploadCloud size={16} /> Doc Autofill
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
          title="Upload appeal hardcopy, auto-fill the form"
          description="Upload a scanned appeal document and the extracted values will populate the appeal fields automatically."
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
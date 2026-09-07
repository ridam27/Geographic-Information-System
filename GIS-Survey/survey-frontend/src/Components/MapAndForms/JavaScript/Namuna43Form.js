import { useState, useEffect } from "react";
import { X, Save, UploadCloud } from "lucide-react";
import axios from "axios";
import "../Style/HouseDetailsModal.css";

import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { DocumentAutofillOverlay, useDocumentAutofill } from "./documentAutofillHelpers";
// adityachang``
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "https://geo-survey-backend-2fy8.onrender.com";

const initialState = {
  ownerName: "",
  ward: "",
  zone: "",
  propertyNo: "",
  noticeReason: "",
  noticeDate: "",
  latitude: "",
  longitude: ""
};

const NAMUNA43_FIELD_DEFINITIONS = [
  {
    name: "ownerName",
    patterns: [/owner\s*name/i, /name\s*of\s*owner/i, /property\s*owner/i, /owner\b/i],
    valuePattern: /(?:owner\s*name|name\s*of\s*owner|property\s*owner)\s*[: -]*\s*([A-Za-z\s.'-]{2,80})/i,
  },
  {
    name: "ward",
    patterns: [/ward\s*no\.?/i, /ward\b/i],
    valuePattern: /ward\s*(?:no\.?|number)?\s*[: -]*\s*([A-Za-z0-9-]{1,6})/i,
  },
  { name: "zone", patterns: [/zone/i], valuePattern: /zone\s*[: -]*\s*([A-Za-z0-9\s-]{1,40})/i },
  {
    name: "propertyNo",
    patterns: [/property\s*no\.?/i, /property\s*number/i, /prop\.?\s*no\.?/i, /survey\s*no\.?/i],
    valuePattern: /(?:property\s*no\.?|property\s*number|prop\.?\s*no\.?|survey\s*no\.?)\s*[: -]*\s*([A-Za-z0-9/-\s]{1,50})/i,
  },
  {
    name: "noticeReason",
    patterns: [/notice\s*reason/i, /reason\s*for\s*notice/i, /reason\b/i, /notice\b/i],
  },
  { name: "noticeDate", patterns: [/notice\s*date/i, /date\s*of\s*notice/i, /\bdate\b/i], type: "date" }
];

export default function Namuna43Form({ isOpen, onClose, polygonLocation }) {

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
  } = useDocumentAutofill(NAMUNA43_FIELD_DEFINITIONS, {
    onDraft: (draft) => {
      console.log("Applying autofill draft to namuna43 form:", draft);
      setFormData((previousState) => ({
        ...previousState,
        ...draft
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
  
  const handleChange = (e) =>
    setFormData((previousState) => ({
      ...previousState,
      [e.target.name]: e.target.value
    }));

  const handleSave = async () => {

    try {

      // include polygon geometry if available so backend can persist full polygon
      const payload = { ...formData };
      if (polygonLocation && polygonLocation.geometry) {
        payload.geometry = polygonLocation.geometry;
        payload.polygonCoordinates = polygonLocation.coordinates;
      }

      await axios.post(
        `${API_BASE_URL}/api/namuna43`,
        payload
      );

      alert("Namuna 43 notice saved successfully");

      setFormData(initialState);

      onClose();

    } catch (error) {

      console.error(error.response ? error.response.data : error);

      alert("Failed to save notice");

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
          <h3>Namuna 43 Notice</h3>
          <button onClick={onClose} className="modal-close-button">
            <X size={20}/>
          </button>
        </div>

        <div className="modal-body">

          <div className={`form-content-shell ${isAutofillPanelOpen ? "is-blurred" : ""}`}>

          <fieldset>
            <legend>Notice Information</legend>

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
                <label>Zone</label>
                <input
                  name="zone"
                  value={formData.zone}
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

              <div className="form-group full-width">
                <label>Notice Reason</label>
                <textarea
                  name="noticeReason"
                  rows="3"
                  value={formData.noticeReason}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Notice Date</label>
                <input
                  type="date"
                  name="noticeDate"
                  value={formData.noticeDate}
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
          title="Upload Namuna 43 hardcopy, auto-fill the form"
          description="Upload a scanned Namuna 43 document and the extracted values will populate the notice fields automatically."
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
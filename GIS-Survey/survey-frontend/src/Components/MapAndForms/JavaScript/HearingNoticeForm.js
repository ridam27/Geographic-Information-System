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
  address: "",
  ward: "",
  zone: "",
  hearingDate: "",
  hearingTime: "",
  hearingLocation: "",
  latitude: "",
  longitude: ""
};

const HEARING_FIELD_DEFINITIONS = [
  { name: "ownerName", patterns: [/owner\s*name/i, /name\s*of\s*owner/i] },
  { name: "address", patterns: [/address/i, /property\s*address/i] },
  { name: "ward", patterns: [/ward\s*no\.?/i, /ward\b/i] },
  { name: "zone", patterns: [/zone/i] },
  { name: "hearingDate", patterns: [/hearing\s*date/i, /date\s*of\s*hearing/i, /\bdate\b/i], type: "date" },
  { name: "hearingTime", patterns: [/hearing\s*time/i, /time\s*of\s*hearing/i, /\btime\b/i], type: "time" },
  { name: "hearingLocation", patterns: [/hearing\s*location/i, /location/i, /venue/i] }
];

export default function HearingNoticeForm({ isOpen, onClose, polygonLocation }) {

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
  } = useDocumentAutofill(HEARING_FIELD_DEFINITIONS, {
    onDraft: (draft) => {
      console.log("Applying autofill draft to hearing notice form:", draft);
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
        `${API_BASE_URL}/api/hearing-notice`,
        payload
      );

      alert("Hearing notice saved successfully");

      setFormData(initialState);

      onClose();

    } catch (error) {
        //aditya change
      console.error(error.response ? error.response.data : error);

      alert("Failed to save hearing notice");

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

      <h3>Hearing Notice</h3>

  <button onClick={onClose} className="modal-close-button">
    <X size={20}/>
  </button>

</div>

        <div className="modal-body">
          <div className={`form-content-shell ${isAutofillPanelOpen ? "is-blurred" : ""}`}>

          <fieldset>
            <legend>Hearing Details</legend>

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
                <label>Address</label>
                <input
                  name="address"
                  value={formData.address}
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
                <label>Hearing Date</label>
                <input
                  type="date"
                  name="hearingDate"
                  value={formData.hearingDate}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Hearing Time</label>
                <input
                  type="time"
                  name="hearingTime"
                  value={formData.hearingTime}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group full-width">
                <label>Hearing Location</label>
                <input
                  name="hearingLocation"
                  value={formData.hearingLocation}
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
          title="Upload hearing notice hardcopy, auto-fill the form"
          description="Upload a scanned hearing notice and the extracted values will populate the hearing fields automatically."
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
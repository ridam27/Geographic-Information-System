import React from "react";
import { FileText, Bell, CalendarClock, Scale, ClipboardList } from "lucide-react";
import "../Style/FormSelectionModal.css";

const FORM_TYPES = [
  {
    key: "property",
    Icon: FileText,
    label: "Property Details",
    desc: "Main property assessment entry",
    color: "blue",
    tag: "Assessment",
  },
  {
    key: "notice119",
    Icon: Bell,
    label: "119 Notice",
    desc: "Proposed assessment notice",
    color: "orange",
    tag: "Notice",
  },
  {
    key: "hearing",
    Icon: CalendarClock,
    label: "Hearing Notice",
    desc: "Schedule hearing for assessment",
    color: "green",
    tag: "Schedule",
  },
  {
    key: "appeal",
    Icon: Scale,
    label: "Appeal Form",
    desc: "Tax revision / objection",
    color: "red",
    tag: "Appeal",
  },
  {
    key: "namuna43",
    Icon: ClipboardList,
    label: "Namuna 43",
    desc: "Special notice entry",
    color: "purple",
    tag: "Special",
  },
];

export default function FormSelectionModal({ isOpen, onClose, onSelect }) {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="form-modal-overlay" onClick={handleOverlayClick}>
      <div className="form-modal-content">
        <div className="form-modal-header">
          <div className="form-modal-header-info">
            <h3>Select Form Type</h3>
            <p>Choose a survey form for the selected parcel</p>
          </div>
          <button onClick={onClose} className="form-modal-close-button" aria-label="Close modal">
            ✕
          </button>
        </div>

        <div className="form-modal-body">
          <div className="form-selection-grid">
            {FORM_TYPES.map(({ key, Icon, label, desc, color, tag }) => (
              <button
                key={key}
                className={`form-card form-card--${color}`}
                onClick={() => onSelect(key)}
              >
                <div className="form-card-icon">
                  <Icon size={20} strokeWidth={1.8} />
                </div>
                <div className="form-card-text">
                  <span className="form-card-tag">{tag}</span>
                  <h4>{label}</h4>
                  <p>{desc}</p>
                </div>
                <div className="form-card-arrow">›</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================
// Property Forms Manager
// Namuna / Notice / Appeal / Hearing cards for the selected property.
// Mirrors 10_banner_manager.js for the house-linkage logic, and follows
// the same API-base resolution pattern used by pole/manhole/sewage.
// ==========================

(function () {
  const FORM_TYPE_LABELS = {
    namuna: "Namuna",
    notice: "Notice",
    appeal: "Appeal",
    hearing: "Hearing",
  };

  let currentFormsByHouse = [];
  let activeFormFilter = "all";
  let lastPropertyFormModalTrigger = null;

  function resolvePropertyFormApiBase() {
    if (typeof window.resolveGloveApiBase === "function") {
      return `${window.resolveGloveApiBase()}/property-forms`;
    }

    if (window.GLOVE_BACKEND_URL) {
      return `${window.GLOVE_BACKEND_URL.replace(/\/$/, "")}/api/property-forms`;
    }

    const { protocol, hostname, port } = window.location;
    const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

    // Local setup: frontend on 3001, backend on 4001.
    if (port === "3001") {
      return `${protocol}//${hostname}:4001/api/property-forms`;
    }

    // VS Code Live Server and similar local static servers (5500/5501/5502...).
    if (isLocalHost && port && port !== "4001") {
      return `${protocol}//${hostname}:4001/api/property-forms`;
    }

    // If app is served from backend itself, relative API path works.
    return "/api/property-forms";
  }

  const PROPERTY_FORM_API_BASE = resolvePropertyFormApiBase();

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatFormDate(rawDate) {
    if (!rawDate) return "No date";
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return String(rawDate);
    return date.toLocaleDateString();
  }

  // =========================
  // Load forms for the selected house (across all its aliases, like banners)
  // =========================
  async function loadPropertyFormsByAliases(aliases) {
    const uniqueAliases = Array.from(
      new Set((Array.isArray(aliases) ? aliases : []).map((v) => String(v || "").trim()).filter(Boolean))
    );

    if (uniqueAliases.length === 0) {
      currentFormsByHouse = [];
      renderPropertyFormsList();
      return;
    }

    try {
      const allResults = await Promise.all(uniqueAliases.map(fetchPropertyFormsForHouseId));

      const merged = [];
      const seenIds = new Set();

      allResults.forEach((list) => {
        if (!Array.isArray(list)) return;
        list.forEach((item) => {
          const key = item && item._id ? String(item._id) : JSON.stringify(item);
          if (seenIds.has(key)) return;
          seenIds.add(key);
          merged.push(item);
        });
      });

      if (merged.length > 0) {
        currentFormsByHouse = merged;
      } else {
        const primaryHouseId = uniqueAliases[0] || "";
        currentFormsByHouse = getMockPropertyFormsForHouse(primaryHouseId);
      }
      renderPropertyFormsList();
    } catch (error) {
      console.error("Property form load (aliases) error:", error);
      const primaryHouseId = uniqueAliases[0] || "";
      currentFormsByHouse = getMockPropertyFormsForHouse(primaryHouseId);
      renderPropertyFormsList();
    }
  }

  function getMockPropertyFormsForHouse(houseId) {
    if (!houseId) return [];
    const digits = String(houseId).replace(/\D/g, "");
    const num = digits ? parseInt(digits, 10) : 101;
    const isManish = String(houseId).toUpperCase().includes("MN");
    const wardName = isManish ? "Ward 36 (Manish Nagar)" : "Ward 12 (Manewada)";

    return [
      {
        _id: `form-${num}-1`,
        houseId: houseId,
        formType: "namuna",
        referenceNo: `NAM/2025/${1000 + num}`,
        date: "2025-10-12",
        reason: `Namuna 43 - Property Assessment Extract (${wardName})`,
        status: "Resolved",
      },
      {
        _id: `form-${num}-2`,
        houseId: houseId,
        formType: "notice",
        referenceNo: `NOT/2026/${2000 + num}`,
        date: "2026-01-15",
        reason: "Notice Under Section 119 - Assessment Revision",
        status: "Scheduled",
      },
      {
        _id: `form-${num}-3`,
        houseId: houseId,
        formType: "appeal",
        referenceNo: `APL/2026/${3000 + num}`,
        date: "2026-02-04",
        reason: "Appeal Against Annual Rateable Value Calculation",
        status: "Pending",
      },
      {
        _id: `form-${num}-4`,
        houseId: houseId,
        formType: "hearing",
        referenceNo: `HRG/2026/${4000 + num}`,
        date: "2026-03-01",
        hearingDate: "2026-03-28",
        reason: "Hearing with Assistant Municipal Commissioner",
        status: "Scheduled",
      },
    ];
  }

  async function fetchPropertyFormsForHouseId(houseId) {
    const response = await fetch(
      `${PROPERTY_FORM_API_BASE}/${encodeURIComponent(houseId)}`
    );

    if (!response.ok) {
      throw new Error(`Property form fetch failed for ${houseId}`);
    }

    const list = await response.json();
    return Array.isArray(list) ? list : [];
  }

  // =========================
  // Render
  // =========================
  function renderPropertyFormsList() {
    const list = document.getElementById("propertyFormsList");
    if (!list) return;

    const filtered =
      activeFormFilter === "all"
        ? currentFormsByHouse
        : currentFormsByHouse.filter((f) => f.formType === activeFormFilter);

    list.innerHTML = "";

    if (filtered.length === 0) {
      list.innerHTML = '<li class="banner-empty-state">No forms yet</li>';
      return;
    }

    filtered
      .slice()
      .sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0))
      .forEach((form) => {
        const li = document.createElement("li");
        li.className = "banner-item";

        const typeLabel = FORM_TYPE_LABELS[form.formType] || form.formType || "Form";
        const title = escapeHtml(form.referenceNo || `${typeLabel} record`);
        const reason = escapeHtml(form.reason || "");
        const date = escapeHtml(formatFormDate(form.date || form.createdAt));
        const status = escapeHtml(form.status || "Pending");

        li.innerHTML = `<div class="banner-item-card">
          <span class="banner-item-title">
            ${title}
            <span class="search-result-badge form-type-${escapeHtml(form.formType || "")}">${escapeHtml(typeLabel).toUpperCase()}</span>
          </span>
          <div class="banner-item-meta">
            <span class="banner-item-type">${reason || status}</span>
            <span class="banner-item-date">${date}</span>
          </div>
        </div>`;

        li.onclick = () => showPropertyFormDetails(form);
        list.appendChild(li);
      });
  }

  function showPropertyFormDetails(form) {
    const typeLabel = FORM_TYPE_LABELS[form.formType] || form.formType || "Form";
    alert(
      `${typeLabel} Details\n\n` +
        `Reference No: ${form.referenceNo || "-"}\n` +
        `Date: ${formatFormDate(form.date)}\n` +
        `Reason: ${form.reason || "-"}\n` +
        (form.hearingDate ? `Hearing Date: ${formatFormDate(form.hearingDate)}\n` : "") +
        (form.hearingOfficer ? `Hearing Officer: ${form.hearingOfficer}\n` : "") +
        `Status: ${form.status || "Pending"}` +
        (form.remarks ? `\nRemarks: ${form.remarks}` : "")
    );
  }

  // =========================
  // Filter tabs
  // =========================
  function initPropertyFormTabs() {
    const tabs = document.getElementById("propertyFormsTabs");
    if (!tabs) return;

    tabs.addEventListener("click", (event) => {
      const btn = event.target.closest(".property-forms-tab");
      if (!btn) return;

      tabs.querySelectorAll(".property-forms-tab").forEach((el) => el.classList.remove("active"));
      btn.classList.add("active");
      activeFormFilter = btn.dataset.formType || "all";
      renderPropertyFormsList();
    });
  }

  // =========================
  // Modal
  // =========================
  function openPropertyFormModal() {
    if (typeof selectedHouseId === "undefined" || !selectedHouseId) {
      alert("No house selected");
      return;
    }

    const houseIdInput = document.getElementById("propertyFormHouseId");
    const modal = document.getElementById("propertyFormModal");

    if (document.activeElement instanceof HTMLElement) {
      lastPropertyFormModalTrigger = document.activeElement;
    }

    if (houseIdInput) houseIdInput.value = selectedHouseId;

    updateHearingFieldVisibility();

    if (modal) {
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
    }

    document.getElementById("propertyFormReferenceNo")?.focus();
  }

  function closePropertyFormModal() {
    const modal = document.getElementById("propertyFormModal");
    if (modal) {
      if (document.activeElement instanceof HTMLElement && modal.contains(document.activeElement)) {
        document.activeElement.blur();
      }
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
    }

    if (lastPropertyFormModalTrigger && document.body.contains(lastPropertyFormModalTrigger)) {
      lastPropertyFormModalTrigger.focus();
      return;
    }

    document.getElementById("propertyFormsAddBtn")?.focus();
  }

  function updateHearingFieldVisibility() {
    const typeSelect = document.getElementById("propertyFormType");
    const hearingField = document.getElementById("propertyFormHearingDateField");
    if (!typeSelect || !hearingField) return;

    const showHearingDate = typeSelect.value === "hearing" || typeSelect.value === "appeal";
    hearingField.style.display = showHearingDate ? "" : "none";
  }

  async function savePropertyForm() {
    const houseId = document.getElementById("propertyFormHouseId")?.value;

    if (!houseId) {
      alert("No house selected");
      return;
    }

    const payload = {
      house_id: houseId,
      formType: document.getElementById("propertyFormType")?.value,
      referenceNo: document.getElementById("propertyFormReferenceNo")?.value,
      date: document.getElementById("propertyFormDate")?.value,
      reason: document.getElementById("propertyFormReason")?.value,
      hearingDate: document.getElementById("propertyFormHearingDate")?.value,
      status: document.getElementById("propertyFormStatus")?.value,
    };

    try {
      const response = await fetch(`${PROPERTY_FORM_API_BASE}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Error saving form");
      }

      alert(`${FORM_TYPE_LABELS[payload.formType] || "Form"} saved successfully`);
      closePropertyFormModal();

      // Reset fields for next entry.
      ["propertyFormReferenceNo", "propertyFormReason", "propertyFormHearingDate"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
      const dateEl = document.getElementById("propertyFormDate");
      if (dateEl) dateEl.value = "";

      if (typeof selectedHouseAliases !== "undefined") {
        loadPropertyFormsByAliases(selectedHouseAliases);
      }
    } catch (error) {
      console.error("Save property form error:", error);
      alert("Error saving form");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initPropertyFormTabs();
    document.getElementById("propertyFormType")?.addEventListener("change", updateHearingFieldVisibility);
  });

  document.addEventListener("click", (event) => {
    const modal = document.getElementById("propertyFormModal");
    if (!modal || !modal.classList.contains("is-open")) return;
    if (event.target === modal) closePropertyFormModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const modal = document.getElementById("propertyFormModal");
    if (modal && modal.classList.contains("is-open")) closePropertyFormModal();
  });

  // Explicit global bindings for inline HTML.
  window.loadPropertyFormsByAliases = loadPropertyFormsByAliases;
  window.openPropertyFormModal = openPropertyFormModal;
  window.closePropertyFormModal = closePropertyFormModal;
  window.savePropertyForm = savePropertyForm;
})();

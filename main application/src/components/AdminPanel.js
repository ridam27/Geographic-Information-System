import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

const PASSWORD_MIN_LENGTH = 8;
const emptyForm = { name: "", email: "", password: "", moduleIds: [] };

function getPasswordError(password) {
  if (password.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain a number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain a special character.";
  return null;
}

export default function AdminPanel() {
  const {
    adminFetchModules,
    adminFetchUsers,
    adminCreateUser,
    adminUpdateUserRole,
    adminUpdateUserStatus,
    adminDeleteUser,
  } = useAuth();

  const [modules, setModules] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);

  const [rowBusyId, setRowBusyId] = useState(null);
  const [rowError, setRowError] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingModuleIds, setEditingModuleIds] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [modulesData, usersData] = await Promise.all([adminFetchModules(), adminFetchUsers()]);
      setModules(modulesData);
      setUsers(usersData);
    } catch (err) {
      setLoadError(err.message || "Could not load admin data.");
    } finally {
      setLoading(false);
    }
  }, [adminFetchModules, adminFetchUsers]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim() || !form.email.trim() || !form.password || form.moduleIds.length === 0) {
      setFormError("Fill in name, email, password and select at least one module.");
      return;
    }
    const passwordError = getPasswordError(form.password);
    if (passwordError) {
      setFormError(passwordError);
      return;
    }
    setCreating(true);
    try {
      await adminCreateUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        moduleIds: form.moduleIds,
      });
      setForm(emptyForm);
      setShowTemporaryPassword(false);
      await load();
    } catch (err) {
      setFormError(err.message || "Could not create the user.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRoleChange(userId, moduleIds) {
    setRowError(null);
    setRowBusyId(userId);
    try {
      await adminUpdateUserRole(userId, moduleIds);
      await load();
      return true;
    } catch (err) {
      setRowError(err.message || "Could not update the role.");
      return false;
    } finally {
      setRowBusyId(null);
    }
  }

  function toggleModule(moduleId) {
    setForm((current) => ({
      ...current,
      moduleIds: current.moduleIds.includes(moduleId)
        ? current.moduleIds.filter((id) => id !== moduleId)
        : [...current.moduleIds, moduleId],
    }));
  }

  function startEditingUser(user) {
    setRowError(null);
    setEditingUserId(user.id);
    setEditingModuleIds(user.modules);
  }

  function cancelEditingUser() {
    setEditingUserId(null);
    setEditingModuleIds([]);
  }

  function toggleEditingModule(moduleId) {
    setEditingModuleIds((current) => current.includes(moduleId)
      ? current.filter((id) => id !== moduleId)
      : [...current, moduleId]);
  }

  async function saveUserModules(user) {
    if (editingModuleIds.length === 0) {
      setRowError("Select at least one module before saving.");
      return;
    }
    const saved = await handleRoleChange(user.id, editingModuleIds);
    if (saved) {
      setEditingUserId(null);
      setEditingModuleIds([]);
    }
  }

  async function handleToggleStatus(user) {
    setRowError(null);
    setRowBusyId(user.id);
    try {
      await adminUpdateUserStatus(user.id, user.status === "active" ? "disabled" : "active");
      await load();
    } catch (err) {
      setRowError(err.message || "Could not update the account status.");
    } finally {
      setRowBusyId(null);
    }
  }

  async function handleDelete(user) {
    if (!window.confirm(`Remove ${user.name} (${user.email})? This cannot be undone.`)) return;
    setRowError(null);
    setRowBusyId(user.id);
    try {
      await adminDeleteUser(user.id);
      await load();
    } catch (err) {
      setRowError(err.message || "Could not delete the user.");
    } finally {
      setRowBusyId(null);
    }
  }

  const subUsers = users.filter((u) => !u.isAdmin);

  return (
    <div className="adminpanel">
      <div className="adminpanel__header">
        <h2 className="adminpanel__title">Admin Panel</h2>
        <p className="adminpanel__subtitle">
          Create sub-users and assign one or more modules. Use Edit to change access; a sub-user only sees and can open the modules assigned to them.
        </p>
      </div>

      <div className="adminpanel__grid">
        <section className="adminpanel__card">
          <h3 className="adminpanel__cardTitle">Create sub-user</h3>
          <form onSubmit={handleCreate} noValidate>
            <div className="field">
              <label className="field__label" htmlFor="admin-name">Full name</label>
              <input
                id="admin-name"
                className="field__input"
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Sub-user's name"
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="admin-email">Email address</label>
              <input
                id="admin-email"
                className="field__input"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="user@organization.gov"
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="admin-password">Temporary password</label>
              <div className="field__inputWrap">
                <input
                  id="admin-password"
                  className="field__input"
                  type={showTemporaryPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="8+ chars, capital/number/symbol"
                />
                <button
                  type="button"
                  className="field__toggle"
                  onClick={() => setShowTemporaryPassword((shown) => !shown)}
                  aria-label={showTemporaryPassword ? "Hide temporary password" : "Show temporary password"}
                  aria-pressed={showTemporaryPassword}
                >
                  {showTemporaryPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <div className="field">
              <div className="field__label" id="admin-role-label">Modules</div>
              <div className="modulePicker" role="group" aria-labelledby="admin-role-label">
                {modules.map((m) => (
                  <label className={`modulePicker__option ${form.moduleIds.includes(m.id) ? "modulePicker__option--selected" : ""}`} key={m.id}>
                    <input
                      type="checkbox"
                      checked={form.moduleIds.includes(m.id)}
                      onChange={() => toggleModule(m.id)}
                    />
                    <span>{m.name}</span>
                    <span className="modulePicker__check" aria-hidden="true">✓</span>
                  </label>
                ))}
              </div>
              <div className="modulePicker__count">
                {form.moduleIds.length} module{form.moduleIds.length === 1 ? "" : "s"} selected
              </div>
            </div>

            {formError && <div className="authcard__error" role="alert">{formError}</div>}

            <button type="submit" className="btn btn--primary btn--full" disabled={creating}>
              {creating ? "Creating…" : "Create sub-user"}
            </button>
          </form>
        </section>

        <section className="adminpanel__card adminpanel__card--wide">
          <h3 className="adminpanel__cardTitle">Sub-users ({subUsers.length})</h3>

          {rowError && <div className="authcard__error" role="alert">{rowError}</div>}

          {loading ? (
            <p className="muted">Loading users…</p>
          ) : loadError ? (
            <div className="authcard__error" role="alert">{loadError}</div>
          ) : subUsers.length === 0 ? (
            <p className="muted">No sub-users yet. Create one on the left.</p>
          ) : (
            <div className="adminpanel__tableWrap">
              <table className="adminpanel__table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Modules</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {subUsers.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td className="adminpanel__email">{u.email}</td>
                      <td>
                        {editingUserId === u.id ? (
                          <div className="modulePicker modulePicker--row" role="group" aria-label={`Edit modules for ${u.name}`}>
                            {modules.map((m) => (
                              <label className={`modulePicker__option ${editingModuleIds.includes(m.id) ? "modulePicker__option--selected" : ""}`} key={m.id}>
                                <input
                                  type="checkbox"
                                  checked={editingModuleIds.includes(m.id)}
                                  disabled={rowBusyId === u.id}
                                  onChange={() => toggleEditingModule(m.id)}
                                />
                                <span>{m.name}</span>
                                <span className="modulePicker__check" aria-hidden="true">✓</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="adminpanel__moduleSummary">
                            {u.modules.length > 0
                              ? modules.filter((m) => u.modules.includes(m.id)).map((m) => (
                                <span className="adminpanel__moduleTag" key={m.id}>{m.name}</span>
                              ))
                              : <span className="muted">No access</span>}
                          </div>
                        )}
                        <span className="modulePicker__count">
                          {editingUserId === u.id ? `${editingModuleIds.length} selected` : `${u.modules.length} assigned`}
                        </span>
                      </td>
                      <td>
                        <span className={`adminpanel__status adminpanel__status--${u.status}`}>
                          {u.status === "active" ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="adminpanel__actions">
                        {editingUserId === u.id ? (
                          <>
                            <button type="button" className="btn btn--primary btn--sm" disabled={rowBusyId === u.id} onClick={() => saveUserModules(u)}>
                              {rowBusyId === u.id ? "Saving..." : "Save"}
                            </button>
                            <button type="button" className="btn btn--ghost btn--sm" disabled={rowBusyId === u.id} onClick={cancelEditingUser}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button type="button" className="btn btn--ghost btn--sm" disabled={rowBusyId === u.id || editingUserId !== null} onClick={() => startEditingUser(u)}>
                            Edit
                          </button>
                        )}
                        <button type="button" className="btn btn--ghost btn--sm" disabled={rowBusyId === u.id || editingUserId !== null} onClick={() => handleToggleStatus(u)}>
                          {u.status === "active" ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm adminpanel__danger"
                          disabled={rowBusyId === u.id || editingUserId !== null}
                          onClick={() => handleDelete(u)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

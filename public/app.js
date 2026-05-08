const app = document.querySelector("#app");
const toast = document.querySelector("#toast");

const state = {
  view: "dashboard",
  tab: "Overview",
  projects: [],
  selectedId: null,
  nextScheduledSend: null,
  loading: true,
  error: "",
  modalOpen: false,
  modalProject: null,
  modalEmail: null,
  editMode: false,
  sending: false,
  config: null,
  password: window.localStorage.getItem("cadencePassword") || "",
  sendDryRun: true,
  sendTestRecipient: ""
};

const navItems = [
  ["dashboard", "Dashboard", "grid"],
  ["projects", "Projects", "folder"],
  ["email-log", "Email Log", "mail"],
  ["settings", "Settings", "settings"]
];

const icons = {
  grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
  folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"/><path d="M19 12a7 7 0 0 0-.1-1.1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.9-1.1L14.3 3h-4.6l-.3 2.9A8 8 0 0 0 7.5 7L5.1 6l-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.1l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.9 1.1l.3 2.9h4.6l.3-2.9a8 8 0 0 0 1.9-1.1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1.1z"/></svg>`,
  send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`
};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function formatDate(value) {
  if (!value) return "Not sent yet";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function relativeDays(value) {
  if (!value) return "Draft cadence";
  const days = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 86400000));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function nextSendLabel() {
  if (!state.nextScheduledSend) return "Thursday 2:00 PM";
  return new Intl.DateTimeFormat(undefined, { weekday: "long", hour: "numeric", minute: "2-digit" }).format(new Date(state.nextScheduledSend));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}

async function requestJson(url, options = {}) {
  const headers = {
    ...(options.headers || {})
  };
  if (state.password) {
    headers["x-cadence-demo-password"] = state.password;
  }
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function projectStatus(project) {
  return project.active === false ? "Paused" : "Active";
}

function allEmails() {
  return state.projects.flatMap((project) => {
    const updates = project.last_updates?.length ? project.last_updates : [];
    return updates.map((email, index) => ({
      ...email,
      id: `${project.id}-${index}`,
      project: project.project_name,
      recipient: email.recipient_email || project.client_email,
      status: index === 0 ? "Sent" : "Failed"
    }));
  });
}

function renderAuth() {
  app.innerHTML = `
    <main class="auth-screen">
      <form class="auth-card card" data-auth-form>
        <div class="brand auth-brand">
          <div class="brand-mark">C</div>
          <div><strong>Cadence</strong><span>by C0D3AI</span></div>
        </div>
        <div>
          <h1>Protected Demo</h1>
          <p>Enter the dashboard password to view project memory, generated updates, and send controls.</p>
        </div>
        <label class="field">Password<input class="input" type="password" name="password" autocomplete="current-password" autofocus /></label>
        <button class="button primary" type="submit">Unlock Demo</button>
      </form>
    </main>
  `;
}

function renderShell(content, title, subtitle) {
  const activeNav = state.view === "projects" || state.view === "detail" || state.view === "edit-project" ? "projects" : state.view;
  app.innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">C</div>
          <div><strong>Cadence</strong><span>by C0D3AI</span></div>
        </div>
        <nav class="nav" aria-label="Main navigation">
          ${navItems.map(([id, label, icon]) => `
            <button type="button" class="${activeNav === id ? "active" : ""}" data-view="${id}">
              <span class="icon">${icons[icon]}</span>${label}
            </button>
          `).join("")}
        </nav>
        <div class="sidebar-card">
          <span>Next global send</span>
          <strong>${nextSendLabel()}</strong>
        </div>
      </aside>
      <main class="main">
        <header class="topbar">
          <div><h1>${title}</h1><p>${subtitle}</p></div>
          <div class="top-actions">
            <button class="button secondary" type="button" data-view="settings"><span class="icon">${icons.settings}</span>Settings</button>
            <div class="avatar" aria-label="User avatar">C0</div>
          </div>
        </header>
        <section class="content">${content}</section>
      </main>
    </div>
    ${renderModal()}
  `;
}

function render() {
  if (state.config?.authEnabled && !state.password) return renderAuth();
  if (state.loading) return renderShell(`<div class="loading card">Loading Cadence workspace...</div>`, "Dashboard", "Preparing active project cadences and email history.");
  if (state.error) return renderShell(`<div class="error card">${escapeHtml(state.error)}</div>`, "Dashboard", "Cadence could not load this workspace.");
  if (state.view === "email-log") return renderShell(renderEmailLog(), "Email Log", "Every generated project update, delivery status, and preview link.");
  if (state.view === "settings") return renderShell(renderSettings(), "Settings", "Configure Gmail, send cadence, signature, and model defaults.");
  if (state.view === "edit-project") return renderShell(renderProjectForm(), "Add Project", "Create a communication cadence from scope, deliverables, deadlines, and Gmail context.");
  if (state.view === "detail") return renderShell(renderDetail(), "Project Detail", "Project memory, upcoming send, and generated update context.");
  return renderShell(renderDashboard(), "Dashboard", "Active client projects with twice-weekly AI update emails.");
}

function renderDashboard() {
  if (!state.projects.length) {
    return `<div class="empty card"><div><strong>No active projects yet.</strong><p>Add a project to start a Monday and Thursday communication cadence.</p><button class="button primary" data-view="edit-project"><span class="icon">${icons.plus}</span>Add Project</button></div></div>`;
  }
  const sentCount = allEmails().length;
  return `
    <div class="toolbar">
      <div><h2>Active Projects</h2><p>${state.projects.length} projects monitored from Gmail, docs, and project memory.</p></div>
      <button class="button primary" type="button" data-view="edit-project"><span class="icon">${icons.plus}</span>Add Project</button>
    </div>
    <div class="metrics">
      <div class="metric card"><span>Projects</span><strong>${state.projects.length}</strong></div>
      <div class="metric card"><span>Emails sent</span><strong>${sentCount}</strong></div>
      <div class="metric card"><span>Next send</span><strong>${nextSendLabel().replace(" at ", " ")}</strong></div>
      <div class="metric card"><span>Gmail</span><strong>${state.config?.gmailConfigured ? "Connected" : "Dry Run"}</strong></div>
    </div>
    <div class="project-grid">
      ${state.projects.map(renderProjectCard).join("")}
    </div>
  `;
}

function renderProjectCard(project) {
  return `
    <article class="project-card card">
      <div class="project-head">
        <div><h3>${escapeHtml(project.client_name)} · ${escapeHtml(project.project_name)}</h3><div class="subtle">${escapeHtml(project.client_email)}</div></div>
        <span class="badge ${projectStatus(project).toLowerCase()}">${projectStatus(project)}</span>
      </div>
      <div class="project-meta">
        <div class="meta-box"><span>Last email sent</span><strong>${formatDate(project.last_email_sent_at)}</strong><div class="subtle">${relativeDays(project.last_email_sent_at)}</div></div>
        <div class="meta-box"><span>Next scheduled send</span><strong>${nextSendLabel()}</strong><div class="subtle">Twice weekly cadence</div></div>
      </div>
      <div class="subtle">${escapeHtml(project.recent_activity_summary || "Cadence is ready to generate an update from project memory.")}</div>
      <div class="card-actions">
        <button class="button primary" type="button" data-send="${project.id}"><span class="icon">${icons.send}</span>Send Now</button>
        <button class="button ghost" type="button" data-detail="${project.id}">View</button>
      </div>
    </article>
  `;
}

function selectedProject() {
  return state.projects.find((project) => project.id === state.selectedId) || state.projects[0];
}

function renderDetail() {
  const project = selectedProject();
  if (!project) return `<div class="empty card">Select a project to view details.</div>`;
  const tabs = ["Overview", "Email History", "Project Memory", "Settings"];
  return `
    <div class="toolbar">
      <div><h2>${escapeHtml(project.client_name)} · ${escapeHtml(project.project_name)}</h2><p>${escapeHtml(project.client_email)}</p></div>
      <button class="switch ${project.active ? "on" : ""}" type="button" aria-label="Status toggle"><i></i></button>
    </div>
    <div class="detail-grid">
      <div class="panel">
        <div class="tabs">${tabs.map((tab) => `<button class="${state.tab === tab ? "active" : ""}" data-tab="${tab}">${tab}</button>`).join("")}</div>
        ${renderDetailTab(project)}
      </div>
      <aside class="side-panel card">
        <div class="meta-box"><span>Next send time</span><strong>${nextSendLabel()}</strong><div class="subtle">Auto-send unless paused</div></div>
        <button class="button primary" type="button" data-send="${project.id}"><span class="icon">${icons.send}</span>Manual Send</button>
        <div class="thread"><span class="icon">${icons.mail}</span><div><strong>Gmail thread connected</strong><div class="subtle">${escapeHtml(project.gmail_thread_query || "Conversation query saved")}</div></div></div>
      </aside>
    </div>
  `;
}

function listItems(items = []) {
  return items.length ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : "<li>No items yet.</li>";
}

function renderDetailTab(project) {
  if (state.tab === "Email History") return `<div class="section-grid">${(project.last_updates || []).map((email) => `<div class="info-block full"><h3>${escapeHtml(email.subject)}</h3><p>${formatDate(email.sent_at)}</p><p>${escapeHtml(email.body)}</p></div>`).join("") || `<div class="empty">No sent emails yet.</div>`}</div>`;
  if (state.tab === "Project Memory") return `<div class="section-grid"><div class="info-block full"><h3>Milestones</h3><ul>${listItems(project.milestones)}</ul></div><div class="info-block full"><h3>Deadlines</h3><ul>${listItems(project.deadlines)}</ul></div></div>`;
  if (state.tab === "Settings") return `<div class="section-grid"><div class="info-block full"><h3>Gmail Query</h3><p>${escapeHtml(project.gmail_thread_query || "")}</p></div><div class="info-block"><h3>Cadence</h3><p>Monday morning and Thursday afternoon.</p></div><div class="info-block"><h3>Status</h3><p>${projectStatus(project)}</p></div></div>`;
  return `
    <div class="section-grid">
      <div class="info-block full"><h3>Scope of Work</h3><p>${escapeHtml(project.scope_of_work || "No scope saved.")}</p></div>
      <div class="info-block"><h3>Deliverables</h3><ul>${listItems(project.deliverables)}</ul></div>
      <div class="info-block tone-amber"><h3>Open Loops</h3><ul>${listItems(project.open_loops)}</ul></div>
      <div class="info-block tone-green"><h3>Wins</h3><ul>${listItems(project.wins)}</ul></div>
      <div class="info-block tone-red"><h3>Risks</h3><ul>${listItems(project.risks)}</ul></div>
      <div class="info-block full"><h3>Recent Activity Summary</h3><p>${escapeHtml(project.recent_activity_summary || "No AI summary generated yet.")}</p></div>
    </div>
  `;
}

function renderEmailLog() {
  const emails = allEmails();
  return `
    <div class="table-panel card">
      <div class="filters">
        <select class="select" aria-label="Filter by project"><option>All projects</option>${state.projects.map((project) => `<option>${escapeHtml(project.project_name)}</option>`).join("")}</select>
        <input class="input" type="date" aria-label="Start date" />
        <input class="input" type="date" aria-label="End date" />
      </div>
      ${emails.length ? `<table><thead><tr><th>Date sent</th><th>Project</th><th>Subject line</th><th>Recipient</th><th>Status</th><th>Preview</th></tr></thead><tbody>${emails.map((email) => `<tr><td>${formatDate(email.sent_at)}</td><td>${escapeHtml(email.project)}</td><td>${escapeHtml(email.subject)}</td><td>${escapeHtml(email.recipient)}</td><td><span class="badge ${email.status.toLowerCase()}">${email.status}</span></td><td><button class="button ghost" data-preview-email="${email.id}"><span class="icon">${icons.eye}</span>Preview</button></td></tr>`).join("")}</tbody></table>` : `<div class="empty">No emails sent yet.</div>`}
    </div>
  `;
}

function renderProjectForm() {
  const project = selectedProject() || {};
  return `
    <form class="card" data-project-form>
      <div class="form-grid">
        <div class="field"><label>Client Name</label><input class="input" value="${escapeHtml(project.client_name || "")}" /></div>
        <div class="field"><label>Project Name</label><input class="input" value="${escapeHtml(project.project_name || "")}" /></div>
        <div class="field"><label>Client Email</label><input class="input" type="email" value="${escapeHtml(project.client_email || "")}" /></div>
        <div class="field"><label>Connect Gmail Thread</label><input class="input" value="${escapeHtml(project.gmail_thread_query || "")}" /></div>
        <div class="field full"><label>Scope of Work</label><textarea class="textarea">${escapeHtml(project.scope_of_work || "")}</textarea></div>
        <div class="field"><label>Deliverables</label><div class="tag-row">${(project.deliverables || ["Homepage refresh", "Weekly update emails"]).map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("")}</div><input class="input" placeholder="Add deliverable" /></div>
        <div class="field"><label>Milestones</label><textarea class="textarea">${escapeHtml((project.milestones || []).join("\n"))}</textarea></div>
        <div class="field"><label>Deadlines</label><textarea class="textarea">${escapeHtml((project.deadlines || []).join("\n"))}</textarea></div>
        <div class="field full"><label>Upload Documents</label><div class="drop-zone">Drag scope docs, meeting notes, or project plans here</div></div>
      </div>
      <div class="form-actions"><button class="button secondary" type="button" data-view="dashboard">Cancel</button><button class="button primary" type="submit">Save Project</button></div>
    </form>
  `;
}

function renderSettings() {
  return `
    <div class="settings-grid">
      <div class="settings-card card"><div><h2>Gmail API</h2><p class="subtle">${state.config?.gmailConfigured ? "Connected for live sends" : "Missing credentials; sends are dry-run only"}</p></div><span class="badge ${state.config?.gmailConfigured ? "connected" : "pending"}">${state.config?.gmailConfigured ? "Connected" : "Dry Run"}</span><button class="button secondary">Reconnect Gmail</button></div>
      <div class="settings-card card"><h2>Send Schedule</h2><label class="field">Mon morning time<input class="input" type="time" value="09:00" /></label><label class="field">Thu afternoon time<input class="input" type="time" value="14:00" /></label></div>
      <div class="settings-card card"><h2>Default Signature</h2><textarea class="textarea">Best,\nC0D3AI</textarea></div>
      <div class="settings-card card"><h2>OpenAI Model</h2><select class="select"><option>gpt-4.1</option><option>gpt-4.1-mini</option><option>gpt-4o</option></select></div>
    </div>
  `;
}

function renderModal() {
  const project = state.modalProject;
  const generated = state.modalEmail || {
    subject: `[Cadence Update] ${project?.project_name || "Project"} - Status + Next Steps`,
    body: "Generating a fresh client update..."
  };
  const words = generated.body.split(/\s+/).filter(Boolean).length;
  return `
    <div class="modal-backdrop ${state.modalOpen ? "open" : ""}" data-close-modal>
      <div class="modal" role="dialog" aria-modal="true" aria-label="Email preview" data-modal>
        <div class="modal-head"><div><strong>Email Preview</strong><div class="subtle">${escapeHtml(project?.client_email || "")}</div></div><button class="button ghost" type="button" data-close-modal>Close</button></div>
        <div class="email-preview">
          <label class="field">Subject line<input class="input" value="${escapeHtml(generated.subject)}" ${state.editMode ? "" : "readonly"} /></label>
          <div class="field"><label>Email body</label><div class="email-body" ${state.editMode ? "contenteditable=true" : ""}>${escapeHtml(generated.body)}</div></div>
          <div class="send-safety">
            <label class="check-row"><input type="checkbox" data-dry-run ${state.sendDryRun ? "checked" : ""} /> Dry run only</label>
            <label class="field">Test recipient override<input class="input" data-test-recipient value="${escapeHtml(state.sendTestRecipient)}" placeholder="you@example.com" /></label>
          </div>
          <div class="subtle">${words} words · Tone: Clear, proactive, client-ready</div>
        </div>
        <div class="modal-foot">
          <button class="button secondary" type="button" data-edit-toggle>${state.editMode ? "Preview Mode" : "Edit"}</button>
          <div class="top-actions"><button class="button secondary" type="button" data-schedule>Schedule</button><button class="button primary" type="button" data-confirm-send="${project?.id || ""}"><span class="icon">${icons.send}</span>${state.sending ? "Sending..." : "Send Now"}</button></div>
        </div>
      </div>
    </div>
  `;
}

async function openSendModal(projectId, generateOnly = true) {
  const project = state.projects.find((item) => item.id === projectId);
  state.modalOpen = true;
  state.modalProject = project;
  state.modalEmail = null;
  state.editMode = false;
  state.sendDryRun = !state.config?.gmailConfigured;
  state.sendTestRecipient = "";
  render();
  if (!generateOnly) return;
  try {
    const data = await requestJson(`/api/email/${projectId}/generate-preview`, { method: "POST" });
    state.modalEmail = data.generated;
  } catch (error) {
    state.modalEmail = { subject: "Preview unavailable", body: error.message };
  }
  render();
}

async function loadProjects() {
  try {
    const data = await requestJson("/api/projects");
    state.projects = data.projects || [];
    state.selectedId = state.selectedId || state.projects[0]?.id;
    state.nextScheduledSend = data.next_scheduled_send;
    state.error = "";
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
    render();
  }
}

async function loadConfig() {
  state.config = await requestJson("/api/config");
}

app.addEventListener("click", async (event) => {
  const viewButton = event.target.closest("[data-view]");
  const detailButton = event.target.closest("[data-detail]");
  const sendButton = event.target.closest("[data-send]");
  const tabButton = event.target.closest("[data-tab]");
  const previewEmail = event.target.closest("[data-preview-email]");
  const closeModal = event.target.closest("[data-close-modal]");
  const closeButton = event.target.closest(".modal-head [data-close-modal]");
  const modal = event.target.closest("[data-modal]");
  const editToggle = event.target.closest("[data-edit-toggle]");
  const schedule = event.target.closest("[data-schedule]");
  const confirmSend = event.target.closest("[data-confirm-send]");

  if (viewButton) {
    state.view = viewButton.dataset.view;
    render();
  } else if (detailButton) {
    state.selectedId = detailButton.dataset.detail;
    state.view = "detail";
    state.tab = "Overview";
    render();
  } else if (sendButton) {
    await openSendModal(sendButton.dataset.send);
  } else if (tabButton) {
    state.tab = tabButton.dataset.tab;
    render();
  } else if (previewEmail) {
    const email = allEmails().find((item) => item.id === previewEmail.dataset.previewEmail);
    const project = state.projects.find((item) => item.project_name === email.project);
    state.modalProject = project;
    state.modalEmail = { subject: email.subject, body: email.body };
    state.modalOpen = true;
    render();
  } else if (closeButton || (closeModal && !modal)) {
    state.modalOpen = false;
    render();
  } else if (editToggle) {
    state.editMode = !state.editMode;
    render();
  } else if (schedule) {
    showToast("Email scheduled for the next cadence window.");
  } else if (confirmSend?.dataset.confirmSend) {
    state.sending = true;
    state.sendDryRun = Boolean(document.querySelector("[data-dry-run]")?.checked);
    state.sendTestRecipient = document.querySelector("[data-test-recipient]")?.value.trim() || "";
    render();
    try {
      const data = await requestJson(`/api/email/${confirmSend.dataset.confirmSend}/send-now`, {
        method: "POST",
        body: JSON.stringify({
          confirm: true,
          dryRun: state.sendDryRun,
          testRecipient: state.sendTestRecipient
        })
      });
      state.modalEmail = data.generated;
      state.modalOpen = false;
      await loadProjects();
      showToast(data.sendResult?.dryRun ? "Generated update. Gmail is not configured for live send." : "Email sent successfully.");
    } catch (error) {
      showToast(error.message);
    } finally {
      state.sending = false;
      render();
    }
  }
});

app.addEventListener("submit", (event) => {
  if (event.target.matches("[data-auth-form]")) {
    event.preventDefault();
    state.password = new FormData(event.target).get("password")?.toString() || "";
    window.localStorage.setItem("cadencePassword", state.password);
    state.loading = true;
    loadProjects();
    return;
  }

  if (event.target.matches("[data-project-form]")) {
    event.preventDefault();
    showToast("Project saved.");
    state.view = "dashboard";
    render();
  }
});

loadConfig()
  .then(loadProjects)
  .catch((error) => {
    state.error = error.message;
    state.loading = false;
    render();
  });

export function normalizeProject(project) {
  return {
    id: project.id,
    client_name: project.client_name || "",
    client_email: project.client_email || "",
    project_name: project.project_name || "",
    scope_of_work: project.scope_of_work || "",
    deliverables: project.deliverables || [],
    milestones: project.milestones || [],
    deadlines: project.deadlines || [],
    last_updates: project.last_updates || [],
    open_loops: project.open_loops || [],
    risks: project.risks || [],
    wins: project.wins || [],
    recent_activity_summary: project.recent_activity_summary || "",
    gmail_thread_query: project.gmail_thread_query || "",
    local_document_paths: project.local_document_paths || [],
    last_email_sent_at: project.last_email_sent_at || null,
    active: project.active !== false
  };
}

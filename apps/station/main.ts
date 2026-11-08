import type { Assessment, Attempt, Command, CommandResult, Criterion, Dependency, GoalView, Snapshot } from '../../packages/contracts/index.ts';

const app = document.querySelector<HTMLDivElement>('#app')!;
const dialog = document.querySelector<HTMLDialogElement>('#dialog')!;
const toastRegion = document.querySelector<HTMLDivElement>('#toast-region')!;
let state: Snapshot;
let token = '';
let selectedId: string | null = null;
let page: 'objectives' | 'services' | 'activity' = 'objectives';
let detailTab: 'overview' | 'work' | 'evidence' | 'history' = 'overview';
let filter = 'all';
let search = '';
let busy = false;
let refreshedAt = new Date();

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const uid = () => crypto.randomUUID();
const shortId = (value: string) => { const start = value.indexOf('_') + 1; return value.slice(start, start + 8); };
const titleCase = (value: string) => value.replaceAll('_', ' ').replace(/^./, char => char.toUpperCase());
const date = (value: string) => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const money = (value: number, currency: string) => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value); } catch { return `${value.toFixed(2)} ${currency}`; } };
const bytes = (value: number) => value < 1024 ? `${value} B` : value < 1024 * 1024 ? `${(value / 1024).toFixed(1)} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`;
const statusNames: Record<string, string> = { draft: 'Draft', in_progress: 'In progress', needs_review: 'Needs review', blocked: 'Blocked', accepted: 'Accepted', stale: 'Needs recheck' };
const icon = (name: string, size = 18) => {
  const paths: Record<string, string> = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    service: '<rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01M16 7h2M16 17h2"/>',
    pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    down: '<path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.5-2L20 8M4 16l2.4 3A7 7 0 0 0 18 17"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    flag: '<path d="M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5"/>',
    upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    edit: '<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15z"/>',
    copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
    alert: '<path d="m12 3 10 18H2zM12 9v5M12 17h.01"/>',
    link: '<path d="m10 13 4-4m-6 6-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 3 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0"/>',
    circle: '<circle cx="12" cy="12" r="8"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.circle}</svg>`;
};
const badge = (status: string) => `<span class="badge ${esc(status)}"><span class="status-dot"></span>${esc(statusNames[status] ?? titleCase(status))}</span>`;
const button = (action: string, label: string, glyph = '', className = 'button secondary', extra = '') => `<button type="button" class="${className}" data-action="${action}" ${extra}>${glyph ? icon(glyph) : ''}<span>${esc(label)}</span></button>`;
const goal = () => state.goals.find(item => item.id === selectedId);
const activeAssessments = (g: GoalView, criterionId?: string): Assessment[] => {
  const findings = state.assessments.filter(a => a.goalId === g.id && a.goalRevision === g.revision && a.manifestId === g.currentManifestId && (!criterionId || a.criterionId === criterionId));
  const superseded = new Set(findings.map(a => a.supersedes).filter(Boolean));
  return findings.filter(a => !superseded.has(a.id));
};
const currentAttempts = (g: GoalView) => state.attempts.filter(a => a.goalId === g.id && a.goalRevision === g.revision);
const costLabel = (g: GoalView) => Object.entries(g.costs).map(([c, n]) => money(n, c)).join(' + ') || (g.unknownCosts ? 'Unknown' : '—');

async function jsonFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error([data.error || `Request failed (${response.status})`, ...(data.blockers ?? []).map((b: { message: string }) => b.message)].filter(Boolean).join('\n'));
  return data as T;
}
async function refresh() {
  state = await jsonFetch<Snapshot>('/api/state');
  refreshedAt = new Date();
  if (selectedId && !state.goals.some(g => g.id === selectedId)) selectedId = null;
  if (!selectedId && state.goals.length) selectedId = state.goals[0].id;
  render();
}
function toast(message: string, error = false) {
  toastRegion.innerHTML = `<div class="toast ${error ? 'error' : ''}">${icon(error ? 'alert' : 'check')}<span>${esc(message)}</span></div>`;
  window.setTimeout(() => { toastRegion.innerHTML = ''; }, error ? 9000 : 4500);
}
async function command(type: Command['type'], payload: Record<string, unknown>) {
  return jsonFetch<CommandResult>('/api/commands', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Corral-Token': token }, body: JSON.stringify({ commandId: uid(), type, payload }) });
}
async function act(task: () => Promise<void>) {
  if (busy) return;
  busy = true;
  document.body.classList.add('is-busy');
  try { await task(); } catch (error) { toast(error instanceof Error ? error.message : String(error), true); }
  finally { busy = false; document.body.classList.remove('is-busy'); }
}

function render() {
  const attention = state.goals.filter(g => ['needs_review', 'blocked', 'stale'].includes(g.status)).length;
  app.innerHTML = `<aside class="sidebar">
    <a class="brand" href="#" aria-label="OpenCorral home"><span class="corral-mark" aria-hidden="true"></span><span>OpenCorral</span></a>
    <div class="workspace-label"><span class="workspace-avatar">P</span><div><strong>Personal station</strong><span>Local workspace</span></div><span class="local-dot" title="Local service connected"></span></div>
    <div class="nav-caption">WORKSPACE</div>
    <nav aria-label="Main navigation">
      ${nav('objectives', 'Objectives', 'grid', state.goals.length)}
      ${nav('services', 'Services', 'service', state.services.length)}
      ${nav('activity', 'Activity', 'pulse', '')}
    </nav>
    <div class="sidebar-note"><span class="small-icon">${icon('shield', 18)}</span><strong>Your work, on your machine.</strong><p>Objectives, artifacts, and evidence stay in this local station.</p></div>
    <div class="sidebar-bottom"><span class="local-dot"></span><span>Local preview <small>v0.1</small></span></div>
  </aside>
  <main class="main">
    <header class="topbar"><div class="breadcrumb">Personal station <span>/</span> <strong>${titleCase(page)}</strong></div><div class="connection"><span class="local-dot"></span>Local service connected ${button('refresh', 'Refresh', 'refresh', 'icon-button', 'title="Refresh station"')}</div></header>
    <section class="content">
      ${page === 'objectives' ? renderObjectives(attention) : page === 'services' ? renderServices() : renderActivity()}
    </section>
    <footer class="workspace-footer"><span>OpenCorral · S0/S1 local preview</span><span>Updated ${refreshedAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span></footer>
  </main>`;
  document.title = `${page === 'objectives' && goal() ? goal()!.title : titleCase(page)} · OpenCorral`;
}
function nav(id: string, label: string, glyph: string, count: number | '') {
  return `<button type="button" class="nav-item ${page === id ? 'active' : ''}" data-action="nav" data-page="${id}" ${page === id ? 'aria-current="page"' : ''}>${icon(glyph)}<span>${label}</span>${count !== '' ? `<span class="nav-count">${count}</span>` : ''}</button>`;
}
function renderObjectives(attention: number) {
  const active = state.goals.filter(g => g.status !== 'accepted').length;
  const accepted = state.goals.filter(g => g.status === 'accepted').length;
  const filtered = state.goals.filter(g => (filter === 'all' || (filter === 'attention' ? ['needs_review', 'blocked', 'stale'].includes(g.status) : filter === 'active' ? g.status !== 'accepted' : g.status === filter)) && `${g.title} ${g.description}`.toLowerCase().includes(search.toLowerCase()));
  return `<div class="page-heading"><div><div class="eyebrow">THE RESULT COMES FIRST</div><h1>Your objectives<span class="heading-dot">.</span></h1><p>Keep the work, the evidence, and the next decision together.</p></div><div class="heading-actions"><a class="button secondary" href="/api/export" download="opencorral-export.json">${icon('down')}<span>Export</span></a>${button('new-goal', 'New objective', 'plus', 'button primary')}</div></div>
  <div class="summary-strip">
    <button class="summary-item ${filter === 'active' ? 'chosen' : ''}" data-action="filter" data-filter="active"><span class="summary-icon">${icon('flag')}</span><div><span>Open objectives</span><strong>${active.toString().padStart(2, '0')}</strong></div></button>
    <button class="summary-item ${filter === 'attention' ? 'chosen' : ''}" data-action="filter" data-filter="attention"><span class="summary-icon warm">${icon('alert')}</span><div><span>Need attention</span><strong>${attention.toString().padStart(2, '0')}</strong></div></button>
    <button class="summary-item ${filter === 'accepted' ? 'chosen' : ''}" data-action="filter" data-filter="accepted"><span class="summary-icon green">${icon('shield')}</span><div><span>Accepted results</span><strong>${accepted.toString().padStart(2, '0')}</strong></div></button>
    <div class="summary-explanation">${icon('link', 20)}<p>One objective.<br><strong>Every contribution accounted for.</strong></p></div>
  </div>
  <div class="board ${state.goals.length ? '' : 'board-empty'}">
    <section class="objective-list" aria-label="Objective list"><div class="list-top"><h2>Objectives <span>${state.goals.length}</span></h2><select aria-label="Filter objectives" id="filter-select"><option value="all" ${filter === 'all' ? 'selected' : ''}>All objectives</option><option value="active" ${filter === 'active' ? 'selected' : ''}>Open</option><option value="attention" ${filter === 'attention' ? 'selected' : ''}>Needs attention</option><option value="accepted" ${filter === 'accepted' ? 'selected' : ''}>Accepted</option></select></div>
    ${state.goals.length ? `<label class="search-field">${icon('search', 16)}<input type="search" id="search" placeholder="Find an objective…" value="${esc(search)}" aria-label="Search objectives"></label>` : ''}
    <div class="objective-rows">${filtered.length ? filtered.map(renderGoalRow).join('') : state.goals.length ? '<div class="small-empty">No objectives match this view.<button class="text-button" data-action="clear-filter">Show all objectives</button></div>' : '<div class="list-placeholder"><div class="placeholder-line"></div><div class="placeholder-line short"></div><p>Your objectives will appear here.</p></div>'}</div>
    <div class="list-bottom">${icon('shield', 14)}<span>Status follows evidence.</span></div></section>
    <section class="focus-panel" aria-label="Selected objective">${goal() ? renderGoalDetail(goal()!) : renderWelcome()}</section>
  </div>`;
}
function renderGoalRow(g: GoalView) {
  const complete = g.criteria.filter(c => { const a = activeAssessments(g, c.id); return a.length > 0 && a.every(item => item.verdict === 'pass'); }).length;
  return `<button type="button" class="objective-row ${selectedId === g.id ? 'selected' : ''}" data-action="select-goal" data-id="${esc(g.id)}" ${selectedId === g.id ? 'aria-current="true"' : ''}><div class="row-top">${badge(g.status)}<span class="revision">R${g.revision}</span></div><h3>${esc(g.title)}</h3><p>${esc(g.description || 'No description added.')}</p><div class="objective-row-footer"><span>${icon('shield', 13)}${complete}/${g.criteria.length} criteria</span><span>${esc(costLabel(g))}${g.unknownCosts && Object.keys(g.costs).length ? ' + unknown' : ''}</span></div></button>`;
}
function renderWelcome() {
  return `<div class="welcome"><div class="welcome-symbol">${icon('flag', 32)}</div><div class="eyebrow">A CLEAR STARTING POINT</div><h2>What do you want to accomplish?</h2><p>Define a result. Bring in contributions from your services.<br>Decide it is ready with evidence you can inspect.</p>${button('new-goal', 'Create your first objective', 'plus', 'button primary')}<div class="welcome-steps"><div><span>01</span><strong>Define the result</strong><p>Name the outputs and what good looks like.</p></div><div><span>02</span><strong>Bring in the work</strong><p>Relay tasks and import the exact deliverables.</p></div><div><span>03</span><strong>Check & accept</strong><p>Review the evidence before calling it done.</p></div></div><div class="welcome-foot">${icon('service', 15)}<span>This preview uses manual relay. Your services keep doing the work.</span></div></div>`;
}
function renderGoalDetail(g: GoalView) {
  return `<div class="focus-heading"><div><div class="focus-overline">OBJECTIVE <span>${esc(shortId(g.id))}</span></div><h2>${esc(g.title)}</h2></div>${button('edit-goal', 'Revise objective', 'edit', 'icon-button', 'title="Revise objective"')}</div>
    <div class="focus-meta">${badge(g.status)}<span>Revision ${g.revision}</span><span>Created ${esc(date(g.createdAt))}</span></div>
    <div class="detail-tabs" role="tablist" aria-label="Objective detail">${(['overview', 'work', 'evidence', 'history'] as const).map(tab => `<button role="tab" type="button" aria-selected="${detailTab === tab}" class="${detailTab === tab ? 'selected' : ''}" data-action="detail-tab" data-tab="${tab}">${({ overview: 'Overview', work: 'Work & artifacts', evidence: 'Evidence', history: 'History' })[tab]}${tab === 'work' ? `<span>${g.attemptCount}</span>` : ''}</button>`).join('')}</div>
    <div class="detail-body" role="tabpanel">${detailTab === 'overview' ? renderOverview(g) : detailTab === 'work' ? renderWork(g) : detailTab === 'evidence' ? renderEvidence(g) : renderHistory(g.id)}</div>`;
}
function renderOverview(g: GoalView) {
  const attempts = currentAttempts(g);
  const nextAction = g.status === 'accepted' ? `<div class="next-action accepted-callout">${icon('shield', 22)}<div><strong>This result is accepted.</strong><p>Acceptance is tied to this revision, its exact outputs, and the recorded evidence.</p></div></div>` : !attempts.length ? `<div class="next-action"><span>${icon('arrow', 22)}</span><div><strong>Next: assign the first contribution</strong><p>Choose a service and prepare the work to relay.</p></div>${button('new-attempt', 'Assign work', 'arrow', 'button compact primary')}</div>` : !g.currentManifestId ? `<div class="next-action"><span>${icon('upload', 22)}</span><div><strong>Next: bring in a contribution</strong><p>Import a file or paste the result from your service.</p></div>${button('import', 'Import result', 'upload', 'button compact primary')}</div>` : `<div class="next-action ${g.status === 'stale' || g.status === 'blocked' ? 'warning-callout' : ''}"><span>${icon(g.blockers.length ? 'alert' : 'shield', 22)}</span><div><strong>${g.blockers.length ? 'The result needs attention' : 'Ready for your acceptance'}</strong><p>${esc(g.blockers[0]?.message || 'Every required criterion has passing evidence for this result.')}</p></div>${button('evidence-tab', 'Review evidence', 'arrow', 'button compact secondary')}</div>`;
  return `${nextAction}<section class="detail-section"><div class="section-label">INTENDED RESULT</div><p class="description">${esc(g.description || 'No description has been added. Revise the objective to record its purpose.')}</p></section>
  <section class="detail-section"><div class="section-heading"><h3>Required outputs</h3><span>${g.slots.length} ${g.slots.length === 1 ? 'output' : 'outputs'}</span></div>${renderOutputs(g)}</section>
  <section class="detail-section"><div class="section-heading"><h3>Acceptance criteria</h3>${button('evidence-tab', 'View evidence', 'arrow', 'text-button')}</div>${renderCriteria(g, false)}</section>
  ${g.dependencies.length ? `<section class="detail-section"><div class="section-heading"><h3>Required objectives</h3></div><div class="dependency-list">${g.dependencies.map(d => { const child = state.goals.find(x => x.id === d.goalId); return `<button class="dependency" data-action="select-goal" data-id="${esc(d.goalId)}">${icon('link')}<span>${esc(child?.title || d.goalId)}<small>Pinned revision ${d.revision}</small></span>${child ? badge(child.status) : badge('stale')}</button>`; }).join('')}</div></section>` : ''}
  <section class="cost-summary"><div><span class="section-label">RECORDED EXPENDITURE</span><strong>${esc(costLabel(g))}</strong><p>${g.unknownCosts ? `${g.unknownCosts} ${g.unknownCosts === 1 ? 'attempt has' : 'attempts have'} unknown cost.` : g.attemptCount ? 'All attempts have a declared cost.' : 'Costs appear when work is recorded.'}</p></div><span class="label-neutral">Declared by you</span></section>`;
}
function renderOutputs(g: GoalView) {
  const manifest = state.manifests.find(m => m.id === g.currentManifestId);
  return `<div class="output-list">${g.slots.map(slot => { const artifact = state.artifacts.find(a => a.id === manifest?.outputs[slot]); return `<div class="output-item"><div class="file-symbol ${artifact ? 'available' : ''}">${icon('file', 19)}</div><div><strong>${esc(slot)}</strong>${artifact ? `<a class="artifact-link" href="/api/artifacts/${encodeURIComponent(artifact.id)}" download>${esc(artifact.name)}</a><small>${esc(bytes(artifact.size))} · ${esc(artifact.mediaType)} · ${esc(artifact.source)}</small>` : '<span class="muted">Waiting for a contribution</span>'}</div>${artifact ? `<a class="icon-button" href="/api/artifacts/${encodeURIComponent(artifact.id)}" download title="Download ${esc(artifact.name)}" aria-label="Download ${esc(artifact.name)}">${icon('down')}</a>` : `<span class="label-neutral">Missing</span>`}</div>`; }).join('')}</div>`;
}
function renderCriteria(g: GoalView, withActions: boolean) {
  return `<div class="criterion-list">${g.criteria.map(c => {
    const findings = activeAssessments(g, c.id);
    const hasFail = findings.some(a => a.verdict === 'fail');
    const passed = findings.length > 0 && !hasFail;
    const label = hasFail ? 'Failed' : passed ? 'Passed' : 'Not assessed';
    return `<div class="criterion-item"><span class="criterion-state ${passed ? 'pass' : hasFail ? 'fail' : ''}">${icon(passed ? 'check' : hasFail ? 'close' : 'circle', 16)}</span><div class="criterion-copy"><strong>${esc(c.label)}</strong><span>${c.kind === 'human' ? 'Your judgment' : c.kind === 'nonempty' ? 'Non-empty file check' : `Contains “${esc(c.pattern || '')}”`} · ${esc(c.slot)}</span>${withActions && findings.length ? findings.map(f => `<p class="finding-note">${esc(f.note || 'No note recorded.')}<small>${esc(date(f.createdAt))} · ${esc(f.method)}</small></p>`).join('') : ''}</div>${withActions && c.kind === 'human' && g.currentManifestId ? button('judge', findings.length ? 'Review again' : 'Review', '', 'button compact secondary', `data-criterion="${esc(c.id)}"`) : `<span class="criterion-label ${passed ? 'pass' : hasFail ? 'fail' : ''}">${label}</span>`}</div>`;
  }).join('')}</div>`;
}
function renderWork(g: GoalView) {
  const attempts = state.attempts.filter(a => a.goalId === g.id).slice().reverse();
  return `<div class="tab-intro"><div><h3>Contributions to this objective</h3><p>Assignments are relayed manually. Import the work when it is ready.</p></div>${button('new-attempt', 'Assign work', 'plus', 'button compact primary')}</div>
    ${attempts.length ? `<div class="attempt-list">${attempts.map(a => renderAttempt(a, g)).join('')}</div>` : `<div class="inline-empty">${icon('service', 28)}<h3>No work assigned yet</h3><p>Register a service, then give it a bounded contribution to make.</p>${button('new-attempt', 'Assign the first contribution', 'plus', 'button secondary')}</div>`}
    <section class="detail-section"><div class="section-heading"><h3>Current result</h3>${currentAttempts(g).length ? button('import', 'Import contribution', 'upload', 'text-button') : ''}</div>${renderOutputs(g)}${g.currentManifestId ? `<p class="technical-note">Result ${esc(shortId(g.currentManifestId))} · immutable artifact snapshots</p>` : ''}</section>`;
}
function renderAttempt(a: Attempt, g: GoalView) {
  const artifacts = state.artifacts.filter(item => item.attemptId === a.id);
  const costs = state.resources.filter(r => r.attemptId === a.id);
  const cost = costs.find(r => !costs.some(c => c.replaces === r.id));
  const historical = a.goalRevision !== g.revision;
  return `<article class="attempt-card ${historical ? 'historical' : ''}"><div class="attempt-top"><div class="service-avatar">${esc(a.serviceName.slice(0, 2).toUpperCase())}</div><div><h4>${esc(a.serviceName)}</h4><p>${esc(a.model)} · Manual relay</p></div><span class="label-neutral">${historical ? `Prior revision ${a.goalRevision}` : `Revision ${a.goalRevision}`}</span></div><p class="attempt-instructions">${esc(a.instructions)}</p><div class="attempt-facts"><span>${icon('file', 14)}${artifacts.length} ${artifacts.length === 1 ? 'artifact' : 'artifacts'}</span><span>${cost?.amount != null ? esc(money(cost.amount, cost.currency)) : 'Cost unknown'}</span><span>${esc(date(a.createdAt))}</span></div><div class="attempt-actions">${button('copy-work', 'Copy relay brief', 'copy', 'text-button', `data-attempt="${esc(a.id)}"`)}${button('cost', 'Record cost', '', 'text-button', `data-attempt="${esc(a.id)}"`)}${!historical ? button('import', 'Import result', 'upload', 'text-button', `data-attempt="${esc(a.id)}"`) : ''}</div></article>`;
}
function renderEvidence(g: GoalView) {
  const acceptance = state.acceptances.slice().reverse().find(a => a.goalId === g.id && a.goalRevision === g.revision && a.manifestId === g.currentManifestId);
  return `<div class="tab-intro"><div><h3>Evidence before acceptance</h3><p>Checks and judgments apply to the exact current result.</p></div>${button('run-checks', 'Run checks', 'shield', 'button compact secondary', g.currentManifestId && g.criteria.some(c => c.kind !== 'human') ? '' : 'disabled')}</div>
    ${!g.currentManifestId ? '<div class="notice">Import a contribution before assessing this objective.</div>' : `<div class="subject-line">${icon('file', 16)}<span>Result <code>${esc(shortId(g.currentManifestId))}</code> under objective revision ${g.revision}</span></div>`}
    ${renderCriteria(g, true)}
    ${g.blockers.length ? `<section class="blockers"><h4>${icon('alert', 16)}${g.blockers.length} ${g.blockers.length === 1 ? 'item' : 'items'} to resolve</h4><ul>${g.blockers.map(b => `<li>${esc(b.message)}</li>`).join('')}</ul></section>` : ''}
    <div class="acceptance-panel ${g.status === 'accepted' ? 'accepted-panel' : ''}"><div><h3>${g.status === 'accepted' ? 'Result accepted' : 'Accept this result'}</h3><p>${g.status === 'accepted' && acceptance ? `Recorded ${esc(date(acceptance.createdAt))}. Earlier evidence and attempts remain in history.` : 'Acceptance requires all outputs, current evidence, and valid dependencies.'}</p></div>${button('accept', g.status === 'accepted' ? 'Accepted' : 'Accept result', 'check', 'button primary', !g.currentManifestId || g.blockers.length || g.status === 'accepted' ? 'disabled' : '')}</div>
    <p class="technical-note">A service’s report is a claim. Only checks executed here and your recorded judgments can satisfy these criteria.</p>`;
}
function renderServices() {
  return `<div class="page-heading"><div><div class="eyebrow">THE SERVICES DOING THE WORK</div><h1>Your services<span class="heading-dot">.</span></h1><p>Register the harness and model pairings you use.</p></div>${button('new-service', 'Add service', 'plus', 'button primary')}</div><div class="notice service-notice">${icon('link', 20)}<div><strong>Manual relay is ready.</strong><p>Copy a work brief into your service, then bring the deliverable back here. Registration does not connect to an account or launch an agent.</p></div></div>
  ${state.services.length ? `<div class="service-grid">${state.services.map(s => { const attempts = state.attempts.filter(a => a.serviceId === s.id); return `<article class="service-card"><div class="service-card-top"><div class="service-avatar large">${esc(s.name.slice(0, 2).toUpperCase())}</div><span class="label-neutral">Manual relay</span></div><h2>${esc(s.name)}</h2><p class="service-model">${esc(s.model)}</p><div class="service-card-bottom"><span>${attempts.length} ${attempts.length === 1 ? 'assignment' : 'assignments'}</span><span>Added ${esc(new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))}</span></div></article>`; }).join('')}</div>` : `<div class="large-empty"><div class="welcome-symbol">${icon('service', 30)}</div><h2>Bring your services into view.</h2><p>Add a harness and model pairing to start assigning work.<br>You can keep using the tools you already have.</p>${button('new-service', 'Add your first service', 'plus', 'button primary')}</div>`}`;
}
function historyItems(goalId?: string) {
  const items: { title: string; detail: string; when: string; glyph: string; id: string; goalId?: string; tone?: string }[] = [];
  state.goals.filter(g => !goalId || g.id === goalId).forEach(g => items.push({ title: 'Objective created', detail: g.title, when: g.createdAt, glyph: 'flag', id: g.id, goalId: g.id }));
  state.attempts.filter(a => !goalId || a.goalId === goalId).forEach(a => items.push({ title: 'Work assigned for manual relay', detail: `${a.serviceName} · ${a.model} · revision ${a.goalRevision}`, when: a.createdAt, glyph: 'service', id: a.id, goalId: a.goalId }));
  state.artifacts.filter(a => !goalId || a.goalId === goalId).forEach(a => items.push({ title: 'Contribution imported', detail: `${a.name} · ${bytes(a.size)} · ${a.slot}`, when: a.createdAt, glyph: 'file', id: a.id, goalId: a.goalId }));
  state.assessments.filter(a => !goalId || a.goalId === goalId).forEach(a => items.push({ title: `${a.method === 'human' ? 'Judgment' : 'Check'} recorded: ${a.verdict}`, detail: a.note || `Criterion ${a.criterionId}`, when: a.createdAt, glyph: a.verdict === 'pass' ? 'check' : 'close', id: a.id, goalId: a.goalId, tone: a.verdict }));
  state.acceptances.filter(a => !goalId || a.goalId === goalId).forEach(a => items.push({ title: 'Result accepted', detail: `Revision ${a.goalRevision} · result ${shortId(a.manifestId)}`, when: a.createdAt, glyph: 'shield', id: a.id, goalId: a.goalId, tone: 'pass' }));
  state.resources.filter(r => !goalId || state.attempts.find(a => a.id === r.attemptId)?.goalId === goalId).forEach(r => items.push({ title: r.replaces ? 'Cost observation replaced' : 'Cost recorded', detail: r.amount === null ? 'Amount declared unknown' : `${money(r.amount, r.currency)} · declared`, when: r.createdAt, glyph: 'circle', id: r.id, goalId: state.attempts.find(a => a.id === r.attemptId)?.goalId }));
  if (!goalId) state.services.forEach(s => items.push({ title: 'Service registered', detail: `${s.name} · ${s.model}`, when: s.createdAt, glyph: 'service', id: s.id }));
  return items.sort((a, b) => b.when.localeCompare(a.when));
}
function renderHistory(goalId?: string) {
  const items = historyItems(goalId);
  return `${goalId ? '<div class="tab-intro"><div><h3>The evidence trail</h3><p>Prior attempts, findings, and acceptances remain visible.</p></div></div>' : ''}${items.length ? `<div class="timeline">${items.map(item => `<article class="timeline-item"><span class="timeline-symbol ${item.tone || ''}">${icon(item.glyph, 16)}</span><div><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p>${!goalId && item.goalId ? `<button class="text-button" data-action="select-goal" data-id="${esc(item.goalId)}">${esc(state.goals.find(g => g.id === item.goalId)?.title || 'Open objective')} ${icon('arrow', 13)}</button>` : ''}</div><time datetime="${esc(item.when)}">${esc(date(item.when))}</time></article>`).join('')}</div>` : '<div class="inline-empty"><h3>Your record starts here.</h3><p>Assignments, contributions, and evidence will appear as you work.</p></div>'}`;
}
function renderActivity() {
  return `<div class="page-heading"><div><div class="eyebrow">A RECORD YOU CAN INSPECT</div><h1>Station activity<span class="heading-dot">.</span></h1><p>The contributions and decisions behind your results.</p></div><a class="button secondary" href="/api/export" download="opencorral-export.json">${icon('down')}<span>Export full record</span></a></div><div class="activity-panel"><div class="activity-panel-heading"><h2>Recent activity</h2><span>${state.journalCount} recorded events</span></div>${renderHistory()}</div>`;
}

type FormTask = (form: HTMLFormElement) => Promise<void>;
function openDialog(title: string, intro: string, content: string, submitLabel: string, task: FormTask, options: { wide?: boolean } = {}) {
  dialog.className = options.wide ? 'wide-dialog' : '';
  dialog.innerHTML = `<form id="modal-form"><div class="dialog-header"><div><h2 id="dialog-title">${esc(title)}</h2><p>${esc(intro)}</p></div>${button('close-dialog', 'Close dialog', 'close', 'icon-button', 'aria-label="Close dialog"')}</div><div class="dialog-content">${content}<div class="form-error" role="alert" hidden></div></div><div class="dialog-footer">${button('close-dialog', 'Cancel', '', 'button secondary')}<button type="submit" class="button primary"><span>${esc(submitLabel)}</span>${icon('arrow', 16)}</button></div></form>`;
  const form = dialog.querySelector<HTMLFormElement>('form')!;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    const error = form.querySelector<HTMLDivElement>('.form-error')!;
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    busy = true;
    error.hidden = true;
    submit.disabled = true;
    submit.classList.add('loading');
    try { await task(form); dialog.close(); await refresh(); }
    catch (e) { error.textContent = e instanceof Error ? e.message : String(e); error.hidden = false; error.scrollIntoView({ block: 'nearest' }); }
    finally { busy = false; submit.disabled = false; submit.classList.remove('loading'); }
  });
  dialog.showModal();
}
function field(label: string, name: string, value = '', options: { placeholder?: string; required?: boolean; type?: string; help?: string; maxLength?: number } = {}) {
  return `<label class="field"><span>${esc(label)}</span><input name="${name}" type="${options.type || 'text'}" value="${esc(value)}" ${options.required === false ? '' : 'required'} maxlength="${options.maxLength || 200}" placeholder="${esc(options.placeholder || '')}">${options.help ? `<small>${esc(options.help)}</small>` : ''}</label>`;
}
function criterionEditor(c?: Criterion) {
  const id = c?.id || uid();
  return `<div class="criterion-editor" data-criterion-id="${esc(id)}"><div class="criterion-editor-top"><input name="criterion-label" aria-label="Criterion description" placeholder="What must be true?" value="${esc(c?.label || '')}" required maxlength="300"><button type="button" class="icon-button remove-criterion" aria-label="Remove criterion">${icon('close', 15)}</button></div><div class="criterion-editor-fields"><label><span>Assessment</span><select name="criterion-kind"><option value="nonempty" ${c?.kind === 'nonempty' || !c ? 'selected' : ''}>Non-empty file</option><option value="contains" ${c?.kind === 'contains' ? 'selected' : ''}>Contains text</option><option value="human" ${c?.kind === 'human' ? 'selected' : ''}>My judgment</option></select></label><label><span>Output slot</span><input name="criterion-slot" list="slot-options" value="${esc(c?.slot || 'deliverable')}" required maxlength="80"></label></div><label class="pattern-field ${c?.kind === 'contains' ? '' : 'hidden'}"><span>Exact text to find</span><input name="criterion-pattern" value="${esc(c?.pattern || '')}" ${c?.kind === 'contains' ? 'required' : ''} maxlength="1000" placeholder="A literal phrase in a text file"></label></div>`;
}
function editGoal(existing?: GoalView) {
  const available = state.goals.filter(g => g.id !== existing?.id && g.status === 'accepted');
  const defaults: Criterion[] = [{ id: uid(), label: 'The deliverable is not empty', kind: 'nonempty', slot: 'deliverable' }, { id: uid(), label: 'The result meets the objective', kind: 'human', slot: 'deliverable' }];
  const criteria = existing?.criteria || defaults;
  openDialog(existing ? 'Revise objective' : 'Create an objective', existing ? 'A new revision preserves previous work and starts a fresh result.' : 'Start with the intended result and the evidence you need to accept it.', `${existing ? '<div class="notice">Revising clears the current result selection. Previous artifacts, judgments, and acceptances remain in history.</div>' : ''}${field('Objective', 'title', existing?.title, { placeholder: 'What result do you want?', maxLength: 160 })}<label class="field"><span>Intended result</span><textarea name="description" rows="3" maxlength="10000" placeholder="Describe the purpose, scope, and the result you will use.">${esc(existing?.description || '')}</textarea></label>${field('Required outputs', 'slots', existing?.slots.join(', ') || 'deliverable', { help: 'Name each output slot, separated by commas. For example: article, diagram.', maxLength: 1000 })}<datalist id="slot-options">${(existing?.slots || ['deliverable']).map(slot => `<option value="${esc(slot)}"></option>`).join('')}</datalist><div class="form-section-heading"><h3>Acceptance criteria</h3><button type="button" id="add-criterion" class="text-button">${icon('plus', 15)}Add criterion</button></div><p class="form-hint">Checks run on exact files. Use your judgment for quality, accuracy, and purpose.</p><div id="criteria-editors">${criteria.map(criterionEditor).join('')}</div>${available.length || existing?.dependencies.length ? `<div class="form-section-heading"><h3>Required objectives</h3><span>Optional</span></div><p class="form-hint">Select accepted prerequisites. Their exact revision and acceptance will be pinned.</p><div class="dependency-options">${available.map(g => `<label class="checkbox-field"><input type="checkbox" name="dependency" value="${esc(g.id)}" ${existing?.dependencies.some(d => d.goalId === g.id) ? 'checked' : ''}><span>${esc(g.title)}<small>Revision ${g.revision}</small></span></label>`).join('')}${existing?.dependencies.filter(d => !available.some(g => g.id === d.goalId)).map(d => `<label class="checkbox-field"><input type="checkbox" name="dependency" value="${esc(d.goalId)}" checked><span>${esc(state.goals.find(g => g.id === d.goalId)?.title || d.goalId)}<small>Existing pinned prerequisite · needs review</small></span></label>`).join('') || ''}</div>` : ''}`, existing ? 'Save revision' : 'Create objective', async form => {
    const data = new FormData(form);
    const slots = String(data.get('slots')).split(',').map(s => s.trim()).filter(Boolean);
    if (!slots.length || new Set(slots).size !== slots.length) throw new Error('Give every output a unique, non-empty slot name.');
    const rows = [...form.querySelectorAll<HTMLElement>('.criterion-editor')];
    if (!rows.length) throw new Error('Add at least one acceptance criterion.');
    const criteria: Criterion[] = rows.map(row => {
      const kind = row.querySelector<HTMLSelectElement>('[name="criterion-kind"]')!.value as Criterion['kind'];
      const slot = row.querySelector<HTMLInputElement>('[name="criterion-slot"]')!.value.trim();
      if (!slots.includes(slot)) throw new Error(`Criterion output “${slot}” must appear in Required outputs.`);
      return { id: row.dataset.criterionId!, label: row.querySelector<HTMLInputElement>('[name="criterion-label"]')!.value.trim(), kind, slot, ...(kind === 'contains' ? { pattern: row.querySelector<HTMLInputElement>('[name="criterion-pattern"]')!.value } : {}) };
    });
    const dependencies: Dependency[] = data.getAll('dependency').map(id => {
      const child = state.goals.find(g => g.id === id)!;
      const acceptance = state.acceptances.slice().reverse().find(a => a.goalId === id && a.goalRevision === child.revision && a.manifestId === child.currentManifestId);
      if (child.status !== 'accepted' || !acceptance) { const old = existing?.dependencies.find(d => d.goalId === id); if (old) return old; throw new Error('Each new prerequisite must have a current accepted result.'); }
      return { goalId: child.id, revision: child.revision, acceptanceId: acceptance.id };
    });
    const result = await command(existing ? 'reviseGoal' : 'createGoal', { title: String(data.get('title')).trim(), description: String(data.get('description')).trim(), slots, criteria, dependencies, ...(existing ? { goalId: existing.id, expectedHead: existing.head } : {}) });
    selectedId = result.goalId || result.id || existing?.id || null;
    page = 'objectives'; detailTab = 'overview'; filter = 'all'; search = '';
    toast(existing ? 'Objective revision saved.' : 'Objective created.');
  }, { wide: true });
  const editors = dialog.querySelector('#criteria-editors')!;
  dialog.querySelector('#add-criterion')!.addEventListener('click', () => {
    const slots = dialog.querySelector<HTMLInputElement>('[name="slots"]')!.value.split(',').map(s => s.trim()).filter(Boolean);
    editors.insertAdjacentHTML('beforeend', criterionEditor({ id: uid(), label: '', kind: 'human', slot: slots[0] || 'deliverable' }));
    editors.lastElementChild?.querySelector<HTMLInputElement>('input')?.focus();
  });
  editors.addEventListener('click', event => { const target = (event.target as HTMLElement).closest('.remove-criterion'); if (target) target.closest('.criterion-editor')?.remove(); });
  editors.addEventListener('change', event => { const target = event.target as HTMLSelectElement; if (target.name === 'criterion-kind') { const row = target.closest('.criterion-editor')!; row.querySelector('.pattern-field')!.classList.toggle('hidden', target.value !== 'contains'); row.querySelector<HTMLInputElement>('[name="criterion-pattern"]')!.required = target.value === 'contains'; } });
  dialog.querySelector<HTMLInputElement>('[name="slots"]')!.addEventListener('input', event => { const slots = (event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean); dialog.querySelector('#slot-options')!.innerHTML = slots.map(slot => `<option value="${esc(slot)}"></option>`).join(''); });
}
function newService(after?: () => void) {
  openDialog('Register a service', 'Record a harness and model pairing for manual relay.', `${field('Harness or service', 'name', '', { placeholder: 'e.g. Claude Code, Codex, or a design service', maxLength: 120 })}${field('Model or profile', 'model', '', { placeholder: 'The model or service profile you use', maxLength: 120 })}<div class="notice">No credentials are needed. This registers a pairing; it does not connect or dispatch work.</div>`, 'Add service', async form => { const data = new FormData(form); await command('registerService', { name: String(data.get('name')).trim(), model: String(data.get('model')).trim() }); toast('Service registered for manual relay.'); if (after) window.setTimeout(after, 120); });
}
function newAttempt() {
  const g = goal(); if (!g) return;
  if (!state.services.length) { newService(() => newAttempt()); return; }
  openDialog('Assign a contribution', 'Prepare a bounded work order to relay to one of your services.', `<div class="form-context">${icon('flag')}<div><strong>${esc(g.title)}</strong><span>Objective revision ${g.revision}</span></div></div><label class="field"><span>Service pairing</span><select name="serviceId" required>${state.services.map(s => `<option value="${esc(s.id)}">${esc(s.name)} · ${esc(s.model)}</option>`).join('')}</select></label><label class="field"><span>Work instructions</span><textarea name="instructions" rows="6" maxlength="20000" required placeholder="What should this service contribute? Include the scope, inputs, and expected output."></textarea><small>Copy the relay brief after saving. The station will not launch the service.</small></label>`, 'Create work order', async form => { const data = new FormData(form); await command('issueAttempt', { goalId: g.id, expectedHead: g.head, serviceId: data.get('serviceId'), instructions: String(data.get('instructions')).trim() }); detailTab = 'work'; toast('Work order ready. Copy the brief to your service.'); });
}
async function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error('Could not read this file.')); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(file); });
}
function textToBase64(text: string) {
  const bytes = new TextEncoder().encode(text); let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
function importContribution(attemptId?: string) {
  const g = goal(); if (!g) return;
  const attempts = currentAttempts(g);
  if (!attempts.length) { newAttempt(); return; }
  openDialog('Import a contribution', 'Retain exact bytes and record which service produced them.', `<label class="field"><span>Work order</span><select name="attemptId" required>${attempts.map(a => `<option value="${esc(a.id)}" ${attemptId === a.id ? 'selected' : ''}>${esc(a.serviceName)} · ${esc(a.model)} · ${esc(shortId(a.id))}</option>`).join('')}</select></label><label class="field"><span>Output slot</span><select name="slot">${g.slots.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}</select><small>Replacing a slot creates a new result. Previous evidence will not accept the new bytes.</small></label><fieldset class="segmented-control"><legend class="sr-only">Contribution source</legend><label><input type="radio" name="sourceMode" value="file" checked><span>${icon('file', 15)}Upload a file</span></label><label><input type="radio" name="sourceMode" value="text"><span>${icon('edit', 15)}Paste text</span></label></fieldset><div id="file-fields"><label class="file-drop"><span class="file-drop-icon">${icon('upload', 26)}</span><strong>Choose a deliverable</strong><span>Any file type · up to 8 MB</span><input type="file" name="file" aria-label="Choose artifact file" required></label><p class="selected-file" id="selected-file"></p></div><div id="text-fields" hidden>${field('File name', 'name', 'deliverable.txt', { maxLength: 180 })}<label class="field"><span>Text contribution</span><textarea name="text" rows="7" placeholder="Paste the actual output from your service."></textarea></label></div><div class="notice">Imported reports remain claims. Run checks and record your judgment after importing.</div>`, 'Import contribution', async form => {
    const data = new FormData(form); const mode = data.get('sourceMode'); let name: string; let mediaType: string; let contentBase64: string;
    if (mode === 'file') { const file = data.get('file') as File; if (!file || !file.name) throw new Error('Choose a file to import.'); if (file.size > 8 * 1024 * 1024) throw new Error('The import limit is 8 MB.'); name = file.name; mediaType = file.type || 'application/octet-stream'; contentBase64 = await toBase64(file); }
    else { const text = String(data.get('text')); if (new TextEncoder().encode(text).length > 8 * 1024 * 1024) throw new Error('The import limit is 8 MB.'); name = String(data.get('name')).trim(); mediaType = 'text/plain'; contentBase64 = textToBase64(text); }
    await command('importContribution', { goalId: g.id, expectedHead: g.head, attemptId: data.get('attemptId'), slot: data.get('slot'), name, mediaType, contentBase64 }); detailTab = 'evidence'; toast('Contribution imported. Review its current evidence.');
  });
  dialog.querySelectorAll<HTMLInputElement>('[name="sourceMode"]').forEach(input => input.addEventListener('change', () => { const fileMode = input.value === 'file'; (dialog.querySelector('#file-fields') as HTMLElement).hidden = !fileMode; (dialog.querySelector('#text-fields') as HTMLElement).hidden = fileMode; dialog.querySelector<HTMLInputElement>('[name="file"]')!.required = fileMode; dialog.querySelector<HTMLInputElement>('[name="name"]')!.required = !fileMode; }));
  dialog.querySelector<HTMLInputElement>('[name="file"]')!.addEventListener('change', event => { const file = (event.target as HTMLInputElement).files?.[0]; dialog.querySelector('#selected-file')!.textContent = file ? `${file.name} · ${bytes(file.size)}` : ''; });
}
function judgment(criterionId: string) {
  const g = goal(); const c = g?.criteria.find(item => item.id === criterionId); if (!g || !c || !g.currentManifestId) return;
  const previous = activeAssessments(g, criterionId).filter(a => a.method === 'human');
  openDialog('Record your judgment', 'This finding applies to the current result and this criterion.', `<div class="form-context">${icon('shield')}<div><strong>${esc(c.label)}</strong><span>Result ${esc(shortId(g.currentManifestId))} · revision ${g.revision}</span></div></div><label class="field"><span>Verdict</span><select name="verdict"><option value="pass">Pass — this criterion is satisfied</option><option value="fail">Fail — this criterion is not satisfied</option></select></label><label class="field"><span>Evidence or reasoning</span><textarea name="note" rows="4" maxlength="10000" required placeholder="What did you inspect, and why does it pass or fail?"></textarea></label>${previous.length ? `<label class="field"><span>Replace an earlier judgment</span><select name="supersedes">${previous.map(a => `<option value="${esc(a.id)}">${titleCase(a.verdict)} · ${esc(date(a.createdAt))}</option>`).join('')}<option value="">Add a separate finding</option></select><small>The earlier judgment stays in history. Conflicting active findings block acceptance.</small></label>` : ''}`, 'Record judgment', async form => { const data = new FormData(form); await command('recordJudgment', { goalId: g.id, expectedHead: g.head, manifestId: g.currentManifestId, criterionId, verdict: data.get('verdict'), note: String(data.get('note')).trim(), ...(data.get('supersedes') ? { supersedes: data.get('supersedes') } : {}) }); toast('Judgment recorded for this exact result.'); });
}
function recordCost(attemptId: string) {
  const a = state.attempts.find(item => item.id === attemptId); if (!a) return;
  const observations = state.resources.filter(r => r.attemptId === attemptId); const prior = observations.find(r => !observations.some(x => x.replaces === r.id));
  openDialog('Record attempt cost', 'Enter the final charge for this attempt, or leave it unknown.', `<div class="form-context">${icon('service')}<div><strong>${esc(a.serviceName)} · ${esc(a.model)}</strong><span>Attempt ${esc(shortId(a.id))}</span></div></div><div class="form-row"><label class="field"><span>Amount</span><input name="amount" type="number" min="0" step="any" value="${prior?.amount ?? ''}" placeholder="Unknown"><small>Blank means unknown. Zero means known to be free.</small></label>${field('Currency', 'currency', prior?.currency || 'USD', { maxLength: 3 })}</div><label class="field"><span>Source or note</span><textarea name="note" rows="3" maxlength="10000" placeholder="For example, the charge shown on your service’s receipt.">${esc(prior?.note || '')}</textarea></label>${prior ? '<div class="notice">This replaces the prior cost observation for the attempt. The original remains in history and is not counted twice.</div>' : ''}`, 'Save cost', async form => { const data = new FormData(form); const amount = String(data.get('amount')).trim(); await command('recordCost', { attemptId, amount: amount === '' ? null : Number(amount), currency: String(data.get('currency')).trim().toUpperCase(), note: String(data.get('note')).trim() }); toast('Cost observation saved.'); });
}
async function copyWork(attemptId: string) {
  const a = state.attempts.find(x => x.id === attemptId); const g = state.goals.find(x => x.id === a?.goalId); if (!a || !g) return;
  const current = g.revision === a.goalRevision;
  const text = `OpenCorral work order\nObjective: ${g.title}${current ? '' : ' (title shown from current revision)'}\nContract revision: ${a.goalRevision}\nAttempt: ${a.id}\nService: ${a.serviceName} / ${a.model}\n\n${a.instructions}${current ? `\n\nRequired output slots: ${g.slots.join(', ')}\nCriteria:\n${g.criteria.map(c => `- ${c.label} [${c.slot}; ${c.kind}${c.pattern ? `: ${c.pattern}` : ''}]`).join('\n')}` : '\n\nThis attempt belongs to a previous revision. Its frozen instructions are shown above.'}\n\nReturn your deliverable for manual import. Acceptance is recorded separately in OpenCorral.`;
  try { await navigator.clipboard.writeText(text); toast('Relay brief copied. Paste it into your service.'); }
  catch { openDialog('Relay brief', 'Copy these instructions into your service.', `<label class="field"><span>Work order</span><textarea rows="12" readonly>${esc(text)}</textarea></label>`, 'Done', async () => {}); }
}

document.addEventListener('click', event => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!target || (target instanceof HTMLButtonElement && target.disabled)) return;
  const action = target.dataset.action;
  if (action === 'close-dialog') { if (!busy) dialog.close(); return; }
  if (busy) return;
  if (action === 'nav') { page = target.dataset.page as typeof page; render(); }
  else if (action === 'refresh') void act(async () => { await refresh(); toast('Station refreshed.'); });
  else if (action === 'new-goal') editGoal();
  else if (action === 'edit-goal' && goal()) editGoal(goal());
  else if (action === 'filter') { filter = filter === target.dataset.filter ? 'all' : target.dataset.filter!; render(); }
  else if (action === 'clear-filter') { filter = 'all'; search = ''; render(); }
  else if (action === 'select-goal') { selectedId = target.dataset.id!; page = 'objectives'; detailTab = 'overview'; render(); }
  else if (action === 'detail-tab') { detailTab = target.dataset.tab as typeof detailTab; render(); }
  else if (action === 'evidence-tab') { detailTab = 'evidence'; render(); }
  else if (action === 'new-service') newService();
  else if (action === 'new-attempt') newAttempt();
  else if (action === 'import') importContribution(target.dataset.attempt);
  else if (action === 'judge') judgment(target.dataset.criterion!);
  else if (action === 'cost') recordCost(target.dataset.attempt!);
  else if (action === 'copy-work') void copyWork(target.dataset.attempt!);
  else if (action === 'run-checks') void act(async () => { const g = goal()!; await command('runChecks', { goalId: g.id, expectedHead: g.head, manifestId: g.currentManifestId }); await refresh(); toast('Checks recorded for the current result.'); });
  else if (action === 'accept') void act(async () => { const g = goal()!; await command('acceptResult', { goalId: g.id, expectedHead: g.head, manifestId: g.currentManifestId }); await refresh(); toast('Result accepted. Its evidence is preserved.'); });
});
document.addEventListener('change', event => { const target = event.target as HTMLSelectElement; if (target.id === 'filter-select') { filter = target.value; render(); } });
document.addEventListener('input', event => { const target = event.target as HTMLInputElement; if (target.id === 'search') { const selection = target.selectionStart; search = target.value; render(); const input = document.querySelector<HTMLInputElement>('#search'); input?.focus(); if (selection !== null) input?.setSelectionRange(selection, selection); } });
document.addEventListener('click', event => { const brand = (event.target as HTMLElement).closest('.brand'); if (brand) { event.preventDefault(); page = 'objectives'; render(); } });
dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });

async function boot() {
  try { const session = await jsonFetch<{ token: string }>('/api/session'); token = session.token; await refresh(); }
  catch (error) { app.innerHTML = `<main class="boot-error"><span class="corral-mark" aria-hidden="true"></span><h1>The station could not connect.</h1><p>${esc(error instanceof Error ? error.message : error)}</p><p>Check that the local OpenCorral service is running.</p><button class="button primary" id="retry-boot">Try again ${icon('refresh')}</button></main>`; document.querySelector('#retry-boot')?.addEventListener('click', () => void boot()); }
}
void boot();

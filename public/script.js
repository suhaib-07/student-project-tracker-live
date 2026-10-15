// Student Project Tracker
// The API is the source of truth for all project records.

let projects = [];
let editingId = null;
let isLoading = false;
let isSaving = false;
let loadFailed = false;

const form = document.querySelector('#project-form');
const nameInput = document.querySelector('#project-name');
const statusInput = document.querySelector('#project-status');
const projectList = document.querySelector('#project-list');
const submitButton = form?.querySelector('button[type="submit"]');
const message = document.querySelector('#message');

if (!form || !nameInput || !statusInput || !projectList ||
    !submitButton || !message) {
  throw new Error('Required page elements are missing. Check public/index.html.');
}

const cancelButton = document.createElement('button');
cancelButton.type = 'button';
cancelButton.textContent = 'Cancel edit';
cancelButton.hidden = true;
cancelButton.style.marginLeft = '8px';
submitButton.insertAdjacentElement('afterend', cancelButton);

const retryButton = document.createElement('button');
retryButton.type = 'button';
retryButton.textContent = 'Retry loading projects';
retryButton.hidden = true;
retryButton.style.marginLeft = '8px';
message.insertAdjacentElement('afterend', retryButton);

function normalizeId(id) {
  if (
    !(typeof id === 'number' ||
      (typeof id === 'string' && /^\d+$/.test(id)))
  ) {
    return null;
  }

  const numberId = Number(id);
  return Number.isSafeInteger(numberId) && numberId > 0
    ? numberId
    : null;
}

function normalizeProject(project) {
  if (!project || typeof project !== 'object') return null;

  const id = normalizeId(project.id);
  if (
    id === null ||
    typeof project.name !== 'string' ||
    typeof project.status !== 'string' ||
    !['Planned', 'In Progress', 'Completed'].includes(project.status)
  ) {
    return null;
  }

  return { ...project, id };
}

function toApiStatus(status) {
  return status === 'Not Started' ? 'Planned' : status;
}

function toFormStatus(status) {
  return status === 'Planned' ? 'Not Started' : status;
}

function showMessage(text) {
  message.textContent = text;
}

function updateControls() {
  const disabled = isLoading || isSaving || loadFailed;

  submitButton.disabled = disabled;
  nameInput.disabled = disabled;
  statusInput.disabled = disabled;

  projectList.querySelectorAll('button').forEach((button) => {
    button.disabled = disabled;
  });

  cancelButton.disabled = isLoading || isSaving;
  retryButton.disabled = isLoading || isSaving;
  retryButton.hidden = !loadFailed;
}

function resetForm() {
  editingId = null;
  form.reset();
  submitButton.textContent = 'Add Project';
  cancelButton.hidden = true;
  updateControls();
}

async function getApiError(response) {
  try {
    const data = await response.json();
    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error;
    }
    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message;
    }
  } catch {
    // Response was not JSON.
  }

  return `Request failed with HTTP ${response.status}.`;
}

async function apiRequest(url, options = {}) {
  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      }
    });
  } catch {
    throw new Error('Network error. Check your internet connection and try again.');
  }

  if (!response.ok) {
    throw new Error(await getApiError(response));
  }

  if (response.status === 204) return null;

  try {
    return await response.json();
  } catch {
    throw new Error('The server returned an invalid response.');
  }
}

function renderProjects() {
  projectList.replaceChildren();

  if (isLoading) {
    const item = document.createElement('li');
    item.textContent = 'Loading projects...';
    projectList.appendChild(item);
  } else if (loadFailed) {
    const item = document.createElement('li');
    item.textContent = 'Projects could not be displayed because loading failed.';
    projectList.appendChild(item);
  } else if (projects.length === 0) {
    const item = document.createElement('li');
    item.textContent = 'No projects yet. Add your first project above.';
    projectList.appendChild(item);
  }

  for (const project of projects) {
    const item = document.createElement('li');

    const name = document.createElement('span');
    name.textContent = project.name;

    const status = document.createElement('span');
    status.textContent = ` — ${toFormStatus(project.status)}`;

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.textContent = 'Edit';
    editButton.style.marginLeft = '12px';

    editButton.addEventListener('click', () => {
      if (isLoading || isSaving || loadFailed) return;

      editingId = project.id;
      nameInput.value = project.name;
      statusInput.value = toFormStatus(project.status);
      submitButton.textContent = 'Save changes';
      cancelButton.hidden = false;
      showMessage('Editing project.');
      nameInput.focus();
      updateControls();

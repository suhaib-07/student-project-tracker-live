// Student Project Tracker
// The API is the source of truth for all project records.

let projects = [];
let editingId = null;
let isLoading = false;
let isSaving = false;
let loadFailed = false;

// Find the existing HTML elements.
const form = document.querySelector('#project-form');
const nameInput = document.querySelector('#project-name');
const statusInput = document.querySelector('#project-status');
const projectList = document.querySelector('#project-list');
const submitButton = form.querySelector('button[type="submit"]');
const message = document.querySelector('#message');

// Create a Cancel edit button without changing the HTML file.
const cancelButton = document.createElement('button');
cancelButton.type = 'button';
cancelButton.textContent = 'Cancel edit';
cancelButton.hidden = true;
cancelButton.style.marginLeft = '8px';
submitButton.insertAdjacentElement('afterend', cancelButton);

// Create a retry button for failed project-list loads.
const retryButton = document.createElement('button');
retryButton.type = 'button';
retryButton.textContent = 'Retry loading projects';
retryButton.hidden = true;
retryButton.style.marginLeft = '8px';
message.insertAdjacentElement('afterend', retryButton);

// Translate between the existing HTML option and API status.
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
  const mutationDisabled = isLoading || isSaving || loadFailed;

  submitButton.disabled = mutationDisabled;
  nameInput.disabled = mutationDisabled;
  statusInput.disabled = mutationDisabled;

  projectList.querySelectorAll('button').forEach((button) => {
    button.disabled = mutationDisabled;
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
    const listItem = document.createElement('li');

    const projectName = document.createElement('span');
    projectName.textContent = project.name;

    const projectStatus = document.createElement('span');
    projectStatus.textContent = ` — ${toFormStatus(project.status)}`;

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
    });

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = 'Delete';
    deleteButton.style.marginLeft = '8px';

    deleteButton.addEventListener('click', async () => {
      if (isLoading || isSaving || loadFailed) return;

      const confirmed = window.confirm(
        `Delete "${project.name}" (${project.status})? This cannot be undone.`
      );

      // Cancelling does not send a request or change anything.
      if (!confirmed || isLoading || isSaving || loadFailed) return;

      isSaving = true;
      updateControls();
      showMessage('Deleting project...');

      try {
        const response = await fetch(
          `/api/projects/${encodeURIComponent(project.id)}`,
          { method: 'DELETE' }
        );

        if (!response.ok) {
          throw new Error(await getApiError(response));
        }

        if (editingId === project.id) {
          resetForm();
        }

        // The deletion succeeded. Refresh the collection before reporting
        // the final result, while keeping mutation controls locked.
        await loadProjects('Project deleted successfully.');
      } catch (error) {
        showMessage(`Could not delete project: ${error.message}`);
      } finally {
        isSaving = false;
        updateControls();
        renderProjects();
      }
    });

    listItem.append(
      projectName,
      projectStatus,
      editButton,
      deleteButton
    );

    projectList.appendChild(listItem);
  }

  updateControls();
}

async function getApiError(response) {
  try {
    const data = await response.json();

    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error;
    }
  } catch {
    // The response may not contain JSON.
  }

  return `Request failed with HTTP ${response.status}.`;
}

async function loadProjects(successMessage = '') {
  if (isLoading) return false;

  isLoading = true;
  loadFailed = false;
  showMessage('Loading projects...');
  updateControls();
  renderProjects();

  try {
    const response = await fetch('/api/projects');

    if (!response.ok) {
      throw new Error(await getApiError(response));
    }

    const data = await response.json();

    if (
      !Array.isArray(data) ||
      !data.every((project) =>
        project &&
        Number.isSafeInteger(project.id) &&
        project.id > 0 &&
        typeof project.name === 'string' &&
        typeof project.status === 'string'
      )
    ) {
      throw new Error('The server returned an unexpected project list.');
    }

    projects = data;
    loadFailed = false;

    if (
      editingId !== null &&
      !projects.some((project) => project.id === editingId)
    ) {
      resetForm();
      showMessage('The project being edited no longer exists.');
    } else {
      showMessage(
        successMessage ||
        (projects.length === 0
          ? 'No projects found.'
          : `Loaded ${projects.length} project(s).`)
      );
    }

    return true;
  } catch (error) {
    loadFailed = true;
    showMessage(
      `Could not load projects: ${error.message}. Check your connection and retry.`
    );
    return false;
  } finally {
    isLoading = false;
    updateControls();
    renderProjects();
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (isLoading || isSaving || loadFailed) {
    showMessage('Projects are not ready. Retry loading the project list first.');
    return;
  }

  const name = nameInput.value.trim();
  const status = toApiStatus(statusInput.value);

  if (!name) {
    showMessage('Please enter a project name.');
    nameInput.focus();
    return;
  }

  if (name.length > 80) {
    showMessage('Project names must be 80 characters or fewer.');
    nameInput.focus();
    return;
  }

  if (!['Planned', 'In Progress', 'Completed'].includes(status)) {
    showMessage('Please select a valid project status.');
    statusInput.focus();
    return;
  }

  const wasEditing = editingId !== null;
  const originalEditingId = editingId;
  const url = wasEditing
    ? `/api/projects/${encodeURIComponent(originalEditingId)}`
    : '/api/projects';
  const method = wasEditing ? 'PUT' : 'POST';

  isSaving = true;
  updateControls();
  showMessage(wasEditing ? 'Saving changes...' : 'Adding project...');

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, status })
    });

    if (!response.ok) {
      throw new Error(await getApiError(response));
    }

    const savedProject = await response.json();

    if (
      !savedProject ||
      !Number.isSafeInteger(savedProject.id) ||
      typeof savedProject.name !== 'string' ||
      typeof savedProject.status !== 'string'
    ) {
      throw new Error('The server returned an unexpected saved project.');
    }

    // Do not reset the form until the mutation itself succeeds.
    resetForm();

    // Refresh from the API. loadProjects handles its own errors, so a
    // refresh failure is reported as a load failure rather than a failed save.
    await loadProjects(
      wasEditing
        ? 'Project updated successfully.'
        : 'Project added successfully.'
    );
  } catch (error) {
    // Leave the entered values and editingId intact on a failed save.
    showMessage(
      `Could not ${wasEditing ? 'save changes' : 'add project'}: ${error.message}. Your form input has been kept.`
    );
  } finally {
    isSaving = false;
    updateControls();
    renderProjects();
  }
});

cancelButton.addEventListener('click', () => {
  if (isSaving || isLoading) return;

  resetForm();
  showMessage('Edit cancelled.');
  nameInput.focus();
});

retryButton.addEventListener('click', async () => {
  if (isLoading || isSaving) return;
  await loadProjects();
});

// Initial load: the API, not browser storage, supplies the projects.
renderProjects();
loadProjects();
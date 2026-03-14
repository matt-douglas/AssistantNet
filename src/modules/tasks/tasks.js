// AssistantNet — Task Engine Module (Kanban Board + Edit + Subtasks)
import { dataStore } from '../../services/data.js';
import { showToast } from '../../main.js';
import './tasks.css';

const COLUMNS = [
  { id: 'backlog', label: '📋 Backlog', status: 'backlog' },
  { id: 'todo', label: '📌 To Do', status: 'todo' },
  { id: 'in-progress', label: '⚡ In Progress', status: 'in-progress' },
  { id: 'done', label: '✅ Done', status: 'done' },
];

let draggedTaskId = null;

export function renderTasks(container) {
  const tasks = dataStore.getTasks();
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const urgentTasks = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length;

  container.innerHTML = `
    <div class="tasks-view">
      <div class="tasks-header animate-fade-in">
        <h1>✅ Task Engine</h1>
        <div class="tasks-stats">
          <div class="tasks-stat">
            <div class="tasks-stat-value">${totalTasks}</div>
            <div class="tasks-stat-label">Total</div>
          </div>
          <div class="tasks-stat">
            <div class="tasks-stat-value" style="color: var(--color-success)">${doneTasks}</div>
            <div class="tasks-stat-label">Completed</div>
          </div>
          <div class="tasks-stat">
            <div class="tasks-stat-value" style="color: var(--color-danger)">${urgentTasks}</div>
            <div class="tasks-stat-label">Urgent</div>
          </div>
        </div>
      </div>

      <div class="kanban-board">
        ${COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.status);
          return `
            <div class="kanban-column status-${col.status}" data-status="${col.status}">
              <div class="kanban-column-header">
                <span class="kanban-column-title">${col.label} <span class="kanban-count">${colTasks.length}</span></span>
              </div>
              <div class="kanban-column-body" data-status="${col.status}">
                ${colTasks.map(renderTaskCard).join('')}
                ${col.status === 'todo' ? '<button class="add-task-btn" id="add-task-btn">+ Add Task</button>' : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  bindTaskEvents();
}

function renderTaskCard(task) {
  const priorityClass = `badge-${task.priority === 'urgent' ? 'urgent' : task.priority === 'high' ? 'high' : task.priority === 'medium' ? 'medium' : 'low'}`;
  const completedSubtasks = task.subtasks?.filter(s => s.done).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const progress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return `
    <div class="task-card" draggable="true" data-task-id="${task.id}">
      <div class="task-card-meta">
        <span class="badge ${priorityClass}">${task.priority}</span>
        <span class="task-card-due">${task.dueDate || ''}</span>
      </div>
      <div class="task-card-title">${task.title}</div>
      ${task.tags?.length ? `
        <div class="task-card-tags">
          ${task.tags.map(t => `<span class="task-card-tag">${t}</span>`).join('')}
        </div>
      ` : ''}
      ${totalSubtasks > 0 ? `
        <div class="subtask-progress">
          <div class="subtask-count">${completedSubtasks}/${totalSubtasks} subtasks</div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
        </div>
      ` : ''}
      <div class="task-card-footer">
        <div class="task-card-assignee">
          <div class="mini-avatar">${(task.assignee || 'U')[0]}</div>
          ${task.assignee || 'Unassigned'}
        </div>
        <button class="btn btn-ghost btn-sm task-edit-btn" data-task-id="${task.id}" title="Edit">✏️</button>
      </div>
    </div>
  `;
}

function bindTaskEvents() {
  // Click to open task detail
  document.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.task-edit-btn')) return; // handled below
      showTaskDetailModal(card.dataset.taskId);
    });
  });

  // Edit button
  document.querySelectorAll('.task-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showEditTaskModal(btn.dataset.taskId);
    });
  });

  // Drag & Drop
  document.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('dragstart', (e) => {
      draggedTaskId = card.dataset.taskId;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedTaskId = null;
      document.querySelectorAll('.kanban-column-body').forEach(col => col.classList.remove('drag-over'));
    });
  });

  document.querySelectorAll('.kanban-column-body').forEach(colBody => {
    colBody.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      colBody.classList.add('drag-over');
    });
    colBody.addEventListener('dragleave', () => {
      colBody.classList.remove('drag-over');
    });
    colBody.addEventListener('drop', (e) => {
      e.preventDefault();
      colBody.classList.remove('drag-over');
      if (draggedTaskId) {
        const newStatus = colBody.dataset.status;
        dataStore.updateTaskStatus(draggedTaskId, newStatus);
        showToast(`Task moved to ${newStatus.replace('-', ' ')}`, 'success');
        renderTasks(document.getElementById('view-container'));
      }
    });
  });

  // Add Task
  const addBtn = document.getElementById('add-task-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => showAddTaskModal());
  }
}

// ---- Task Detail Modal (view + subtask toggling) ----
function showTaskDetailModal(taskId) {
  const task = dataStore.getTasks().find(t => t.id === taskId);
  if (!task) return;
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('hidden');

  function renderDetail() {
    const completedSubtasks = task.subtasks?.filter(s => s.done).length || 0;
    const totalSubtasks = task.subtasks?.length || 0;
    const priorityClass = `badge-${task.priority}`;

    overlay.innerHTML = `
      <div class="modal task-detail-modal" style="animation: scaleIn 0.2s var(--ease-spring); max-width: 540px">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-4)">
          <div>
            <span class="badge ${priorityClass}" style="margin-bottom: var(--space-2); display: inline-block">${task.priority}</span>
            <h2 style="margin-top: var(--space-2)">${task.title}</h2>
          </div>
          <button class="btn btn-ghost btn-sm" id="close-detail">✕</button>
        </div>
        <div style="display: flex; gap: var(--space-4); margin-bottom: var(--space-4); font-size: var(--text-sm); color: var(--text-secondary)">
          <span>📅 ${task.dueDate || 'No due date'}</span>
          <span>👤 ${task.assignee || 'Unassigned'}</span>
          <span>📌 ${task.status.replace('-', ' ')}</span>
        </div>
        ${task.tags?.length ? `
          <div style="display: flex; gap: var(--space-1); margin-bottom: var(--space-4); flex-wrap: wrap">
            ${task.tags.map(t => `<span class="task-card-tag">${t}</span>`).join('')}
          </div>
        ` : ''}
        ${totalSubtasks > 0 ? `
          <div style="margin-bottom: var(--space-4)">
            <div style="font-size: var(--text-sm); font-weight: var(--weight-semibold); margin-bottom: var(--space-2); color: var(--text-primary)">
              Subtasks (${completedSubtasks}/${totalSubtasks})
            </div>
            <div class="subtask-list">
              ${task.subtasks.map((s, i) => `
                <label class="subtask-item ${s.done ? 'completed' : ''}" data-idx="${i}">
                  <input type="checkbox" ${s.done ? 'checked' : ''} class="subtask-checkbox" data-idx="${i}" />
                  <span>${s.title}</span>
                </label>
              `).join('')}
            </div>
            <div style="margin-top: var(--space-2)">
              <div class="progress-bar"><div class="progress-fill" style="width: ${totalSubtasks > 0 ? Math.round(completedSubtasks / totalSubtasks * 100) : 0}%"></div></div>
            </div>
          </div>
        ` : ''}
        <div style="display: flex; gap: var(--space-3); justify-content: flex-end; padding-top: var(--space-3); border-top: 1px solid var(--border-subtle)">
          <button class="btn btn-danger btn-sm" id="delete-task-btn">🗑️ Delete</button>
          <button class="btn btn-secondary btn-sm" id="edit-task-btn">✏️ Edit</button>
        </div>
      </div>
    `;

    // Bind events
    document.getElementById('close-detail').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    // Subtask toggling
    document.querySelectorAll('.subtask-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        const idx = parseInt(cb.dataset.idx);
        task.subtasks[idx].done = cb.checked;
        dataStore.save();
        renderDetail(); // re-render with updated progress
      });
    });

    document.getElementById('delete-task-btn')?.addEventListener('click', () => {
      dataStore.deleteTask(taskId);
      showToast('Task deleted', 'info');
      close();
      renderTasks(document.getElementById('view-container'));
    });

    document.getElementById('edit-task-btn')?.addEventListener('click', () => {
      close();
      showEditTaskModal(taskId);
    });
  }

  const close = () => {
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
  };

  renderDetail();
}

// ---- Edit Task Modal ----
function showEditTaskModal(taskId) {
  const task = dataStore.getTasks().find(t => t.id === taskId);
  if (!task) return;
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <div class="modal" style="animation: scaleIn 0.2s var(--ease-spring); max-width: 540px">
      <h2>✏️ Edit Task</h2>
      <div class="input-group" style="margin-bottom: var(--space-4)">
        <label class="input-label">Title</label>
        <input type="text" id="edit-task-title" class="input" value="${escapeAttr(task.title)}" />
      </div>
      <div style="display: flex; gap: var(--space-3); margin-bottom: var(--space-4)">
        <div class="input-group" style="flex: 1">
          <label class="input-label">Priority</label>
          <select id="edit-task-priority" class="select" style="width: 100%">
            ${['urgent', 'high', 'medium', 'low'].map(p => `<option value="${p}" ${task.priority === p ? 'selected' : ''}>${p.charAt(0).toUpperCase() + p.slice(1)}</option>`).join('')}
          </select>
        </div>
        <div class="input-group" style="flex: 1">
          <label class="input-label">Status</label>
          <select id="edit-task-status" class="select" style="width: 100%">
            ${COLUMNS.map(c => `<option value="${c.status}" ${task.status === c.status ? 'selected' : ''}>${c.label}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="display: flex; gap: var(--space-3); margin-bottom: var(--space-4)">
        <div class="input-group" style="flex: 1">
          <label class="input-label">Assignee</label>
          <input type="text" id="edit-task-assignee" class="input" value="${escapeAttr(task.assignee || '')}" />
        </div>
        <div class="input-group" style="flex: 1">
          <label class="input-label">Due Date</label>
          <input type="text" id="edit-task-due" class="input" value="${escapeAttr(task.dueDate || '')}" placeholder="e.g. Mar 20" />
        </div>
      </div>
      <div class="input-group" style="margin-bottom: var(--space-4)">
        <label class="input-label">Tags (comma separated)</label>
        <input type="text" id="edit-task-tags" class="input" value="${escapeAttr((task.tags || []).join(', '))}" placeholder="frontend, api, design" />
      </div>
      <div style="display: flex; gap: var(--space-3); justify-content: flex-end">
        <button class="btn btn-ghost" id="cancel-edit-btn">Cancel</button>
        <button class="btn btn-primary" id="save-edit-btn">💾 Save</button>
      </div>
    </div>
  `;

  const close = () => { overlay.classList.add('hidden'); overlay.innerHTML = ''; };
  document.getElementById('cancel-edit-btn').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  document.getElementById('save-edit-btn').addEventListener('click', () => {
    task.title = document.getElementById('edit-task-title').value.trim() || task.title;
    task.priority = document.getElementById('edit-task-priority').value;
    task.status = document.getElementById('edit-task-status').value;
    task.assignee = document.getElementById('edit-task-assignee').value.trim();
    task.dueDate = document.getElementById('edit-task-due').value.trim();
    task.tags = document.getElementById('edit-task-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    dataStore.save();
    showToast('Task updated!', 'success');
    close();
    renderTasks(document.getElementById('view-container'));
  });
}

// ---- Add Task Modal ----
function showAddTaskModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <div class="modal" style="animation: scaleIn 0.2s var(--ease-spring)">
      <h2>✅ New Task</h2>
      <div class="input-group" style="margin-bottom: var(--space-4)">
        <label class="input-label">Title</label>
        <input type="text" id="new-task-title" class="input" placeholder="What needs to be done?" autofocus />
      </div>
      <div style="display: flex; gap: var(--space-3); margin-bottom: var(--space-4)">
        <div class="input-group" style="flex: 1">
          <label class="input-label">Priority</label>
          <select id="new-task-priority" class="select" style="width: 100%">
            <option value="medium" selected>Medium</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div class="input-group" style="flex: 1">
          <label class="input-label">Assignee</label>
          <input type="text" id="new-task-assignee" class="input" value="You" />
        </div>
      </div>
      <div class="input-group" style="margin-bottom: var(--space-5)">
        <label class="input-label">Due Date</label>
        <input type="text" id="new-task-due" class="input" placeholder="e.g. Mar 20, This week" />
      </div>
      <div style="display: flex; gap: var(--space-3); justify-content: flex-end">
        <button class="btn btn-ghost" id="cancel-task-btn">Cancel</button>
        <button class="btn btn-primary" id="confirm-task-btn">Create Task</button>
      </div>
    </div>
  `;

  const titleInput = document.getElementById('new-task-title');
  titleInput.focus();
  const close = () => { overlay.classList.add('hidden'); overlay.innerHTML = ''; };
  document.getElementById('cancel-task-btn').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  const create = () => {
    const title = titleInput.value.trim();
    if (!title) { titleInput.focus(); return; }
    dataStore.addTask({
      title,
      status: 'todo',
      priority: document.getElementById('new-task-priority').value,
      assignee: document.getElementById('new-task-assignee').value.trim() || 'You',
      dueDate: document.getElementById('new-task-due').value.trim() || 'This week',
      tags: [],
      subtasks: []
    });
    showToast('Task created!', 'success');
    close();
    renderTasks(document.getElementById('view-container'));
  };

  document.getElementById('confirm-task-btn').addEventListener('click', create);
  titleInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') create(); });
}

function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function destroyTasks() {}

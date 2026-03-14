// AssistantNet — Task Engine Module (Kanban Board)
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
        <span class="task-card-due">${task.dueDate}</span>
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
          ${task.assignee}
        </div>
      </div>
    </div>
  `;
}

function bindTaskEvents() {
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
    addBtn.addEventListener('click', () => {
      const title = prompt('Enter task title:');
      if (title) {
        dataStore.addTask({
          title,
          status: 'todo',
          priority: 'medium',
          assignee: 'You',
          dueDate: 'This week',
          tags: [],
          subtasks: []
        });
        showToast('Task created!', 'success');
        renderTasks(document.getElementById('view-container'));
      }
    });
  }
}

export function destroyTasks() {}

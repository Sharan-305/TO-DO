/**
 * Project Task Tracker - Interactive Sheet To-Do List Application
 * Features: Grid sheet layout, localStorage persistence, sorting/filtering, inline editing, status click toggles
 */

// Application State
let state = {
    tasks: [],
    filter: 'all',          // 'all' | 'active' | 'completed'
    searchQuery: '',
    sortBy: 'date-desc',    // 'date-desc' | 'date-asc' | 'priority-desc' | 'alphabetical'
    theme: 'light',         // 'light' | 'dark'
    editingTaskId: null     // ID of task currently being edited
};

// DOM Elements
const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const todoPriority = document.getElementById('todo-priority');
const todoCategory = document.getElementById('todo-category');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const filterTabs = document.querySelectorAll('.filter-tab');
const todoList = document.getElementById('todo-list');
const emptyState = document.getElementById('empty-state');
const itemsLeftCounter = document.getElementById('items-left');
const progressText = document.querySelector('.progress-text');
const progressBarFill = document.getElementById('progress-bar-fill');
const clearCompletedBtn = document.getElementById('clear-completed');
const themeToggleBtn = document.getElementById('theme-toggle');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    loadStateFromLocalStorage();
    setupEventListeners();
    render();
});

// Setup Event Listeners
function setupEventListeners() {
    // 1. Theme Toggle
    themeToggleBtn.addEventListener('click', toggleTheme);

    // 2. Add Task Form Submit
    todoForm.addEventListener('submit', handleAddTask);

    // 3. Search input
    searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim();
        render();
    });

    // 4. Sort select
    sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        render();
    });

    // 5. Filter tabs
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.filter = tab.getAttribute('data-filter');
            render();
        });
    });

    // 6. Clear Completed Button
    clearCompletedBtn.addEventListener('click', handleClearCompleted);

    // 7. Event Delegation for Grid Actions (Status Toggle, Delete, Edit, Save)
    todoList.addEventListener('click', handleListActions);
    todoList.addEventListener('dblclick', handleListDoubleClick);
}

// State Management & LocalStorage
function loadStateFromLocalStorage() {
    try {
        const storedTasks = localStorage.getItem('taskflow_tasks');
        if (storedTasks) {
            state.tasks = JSON.parse(storedTasks);
        }
    } catch (e) {
        console.error('Error loading tasks from LocalStorage:', e);
        state.tasks = [];
    }

    try {
        const storedTheme = localStorage.getItem('taskflow_theme');
        if (storedTheme) {
            state.theme = storedTheme;
        } else {
            state.theme = 'light'; // Default to Canva Sheet Light Mode
        }
    } catch (e) {
        state.theme = 'light';
    }

    // Apply loaded theme to document root
    document.documentElement.setAttribute('data-theme', state.theme);
}

function saveTasksToLocalStorage() {
    try {
        localStorage.setItem('taskflow_tasks', JSON.stringify(state.tasks));
    } catch (e) {
        console.error('Error saving tasks to LocalStorage:', e);
    }
}

function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('taskflow_theme', state.theme);
}

// Add Task Handler
function handleAddTask(e) {
    e.preventDefault();
    
    const text = todoInput.value.trim();
    if (!text) return;

    const newTask = {
        id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        text: text,
        completed: false,
        priority: todoPriority.value,
        category: todoCategory.value,
        createdAt: Date.now()
    };

    state.tasks.unshift(newTask);
    saveTasksToLocalStorage();
    
    // Reset input and focus
    todoInput.value = '';
    todoInput.focus();

    render();
}

// Delegated Event Handlers for Task Row Actions
function handleListActions(e) {
    const target = e.target;
    const itemEl = target.closest('.todo-item');
    if (!itemEl) return;
    
    const taskId = itemEl.getAttribute('data-id');

    // Case A: Clicked Status Badge (interactive status toggle)
    if (target.closest('.status-badge')) {
        const currentCompletedState = itemEl.classList.contains('completed');
        toggleTaskCompletion(taskId, !currentCompletedState);
        return;
    }

    // Case B: Clicked Delete Button
    if (target.closest('.btn-action-delete')) {
        deleteTaskWithAnimation(itemEl, taskId);
        return;
    }

    // Case C: Clicked Edit Button
    if (target.closest('.btn-action-edit')) {
        if (state.editingTaskId === taskId) {
            saveTaskEdit(taskId, itemEl.querySelector('.todo-edit-input').value);
        } else {
            enterEditMode(taskId);
        }
        return;
    }
}

// Double click on task text enters edit mode
function handleListDoubleClick(e) {
    const target = e.target;
    if (target.matches('.todo-text')) {
        const itemEl = target.closest('.todo-item');
        if (itemEl) {
            const taskId = itemEl.getAttribute('data-id');
            enterEditMode(taskId);
        }
    }
}

// CRUD Operations Implementation
function toggleTaskCompletion(id, completed) {
    state.tasks = state.tasks.map(task => {
        if (task.id === id) {
            return { ...task, completed };
        }
        return task;
    });
    
    saveTasksToLocalStorage();
    
    // Animate DOM transition instantly before structural re-render
    const itemEl = document.querySelector(`[data-id="${id}"]`);
    if (itemEl) {
        const badge = itemEl.querySelector('.status-badge');
        if (completed) {
            itemEl.classList.add('completed');
            if (badge) {
                badge.className = 'status-badge status-done';
                badge.innerHTML = 'Done ✓';
            }
        } else {
            itemEl.classList.remove('completed');
            if (badge) {
                badge.className = 'status-badge status-progress';
                badge.innerHTML = 'In Progress 🔄';
            }
        }
    }
    
    // Re-render list to reflect any sorting/filtering changes
    setTimeout(render, 250);
}

function enterEditMode(id) {
    state.editingTaskId = id;
    render();
    
    // Auto-focus edit field
    const editInput = document.querySelector(`[data-id="${id}"] .todo-edit-input`);
    if (editInput) {
        editInput.focus();
        const len = editInput.value.length;
        editInput.setSelectionRange(len, len);
        
        editInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveTaskEdit(id, editInput.value);
            } else if (e.key === 'Escape') {
                state.editingTaskId = null;
                render();
            }
        });

        editInput.addEventListener('blur', () => {
            saveTaskEdit(id, editInput.value);
        });
    }
}

function saveTaskEdit(id, newText) {
    const trimmedText = newText.trim();
    if (!trimmedText) {
        state.tasks = state.tasks.filter(t => t.id !== id);
    } else {
        state.tasks = state.tasks.map(task => {
            if (task.id === id) {
                return { ...task, text: trimmedText };
            }
            return task;
        });
    }
    
    state.editingTaskId = null;
    saveTasksToLocalStorage();
    render();
}

function deleteTaskWithAnimation(itemEl, id) {
    itemEl.classList.add('deleting');
    
    itemEl.addEventListener('animationend', (e) => {
        if (e.animationName === 'slideOut') {
            state.tasks = state.tasks.filter(task => task.id !== id);
            if (state.editingTaskId === id) {
                state.editingTaskId = null;
            }
            saveTasksToLocalStorage();
            render();
        }
    });
}

function handleClearCompleted() {
    const completedTasks = state.tasks.filter(t => t.completed);
    if (completedTasks.length === 0) return;

    const completedEls = todoList.querySelectorAll('.todo-item.completed');
    completedEls.forEach(el => el.classList.add('deleting'));

    if (completedEls.length > 0) {
        setTimeout(() => {
            state.tasks = state.tasks.filter(task => !task.completed);
            saveTasksToLocalStorage();
            render();
        }, 350);
    } else {
        state.tasks = state.tasks.filter(task => !task.completed);
        saveTasksToLocalStorage();
        render();
    }
}

// Utility: Format Date like "17 Jun 2026"
function formatDate(timestamp) {
    const date = new Date(timestamp);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Rendering System
function render() {
    // 1. Filter Tasks
    let filteredTasks = state.tasks.filter(task => {
        if (state.filter === 'active' && task.completed) return false;
        if (state.filter === 'completed' && !task.completed) return false;
        
        if (state.searchQuery) {
            return task.text.toLowerCase().includes(state.searchQuery.toLowerCase());
        }
        
        return true;
    });

    // 2. Sort Tasks
    filteredTasks.sort((a, b) => {
        if (state.sortBy === 'date-desc') {
            return b.createdAt - a.createdAt;
        }
        if (state.sortBy === 'date-asc') {
            return a.createdAt - b.createdAt;
        }
        if (state.sortBy === 'priority-desc') {
            const prioValues = { high: 3, medium: 2, low: 1 };
            if (prioValues[b.priority] !== prioValues[a.priority]) {
                return prioValues[b.priority] - prioValues[a.priority];
            }
            return b.createdAt - a.createdAt;
        }
        if (state.sortBy === 'alphabetical') {
            return a.text.localeCompare(b.text);
        }
        return 0;
    });

    // 3. Clear List Container
    todoList.innerHTML = '';

    // 4. Update Empty State Visibility
    if (filteredTasks.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
    }

    // 5. Injects Task elements
    filteredTasks.forEach(task => {
        const isEditing = state.editingTaskId === task.id;
        const li = document.createElement('li');
        li.className = `todo-item ${task.completed ? 'completed' : ''}`;
        li.setAttribute('data-id', task.id);

        // Column 1: Task Description
        const taskCol = document.createElement('div');
        taskCol.className = 'col-task';
        
        const textWrapper = document.createElement('div');
        textWrapper.className = 'todo-text-wrapper';

        if (isEditing) {
            const editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.className = 'todo-edit-input';
            editInput.value = task.text;
            editInput.maxLength = 120;
            textWrapper.appendChild(editInput);
        } else {
            const textSpan = document.createElement('span');
            textSpan.className = 'todo-text';
            textSpan.textContent = task.text;
            textWrapper.appendChild(textSpan);
        }
        taskCol.appendChild(textWrapper);
        li.appendChild(taskCol);

        // Column 2: Project Category
        const projectCol = document.createElement('div');
        projectCol.className = 'col-project';
        
        // Convert category to lower kebab case for CSS style matching (e.g. "Summer Campaign" -> "summer-campaign")
        const projectClass = task.category.toLowerCase().replace(/\s+/g, '-');
        
        const projectBadge = document.createElement('span');
        projectBadge.className = `project-badge project-${projectClass}`;
        projectBadge.textContent = task.category;
        projectCol.appendChild(projectBadge);
        li.appendChild(projectCol);

        // Column 3: Priority
        const priorityCol = document.createElement('div');
        priorityCol.className = 'col-priority';
        
        const priorityBadge = document.createElement('span');
        priorityBadge.className = `prio-badge prio-${task.priority}`;
        priorityBadge.innerHTML = `<span class="prio-dot"></span>${task.priority}`;
        priorityCol.appendChild(priorityBadge);
        li.appendChild(priorityCol);

        // Column 4: Date
        const dateCol = document.createElement('div');
        dateCol.className = 'col-date';
        
        const dateSpan = document.createElement('span');
        dateSpan.className = 'todo-date';
        dateSpan.textContent = formatDate(task.createdAt);
        dateCol.appendChild(dateSpan);
        li.appendChild(dateCol);

        // Column 5: Status Badge (Interactive toggle click)
        const statusCol = document.createElement('div');
        statusCol.className = 'col-status';
        
        const statusBadge = document.createElement('span');
        statusBadge.className = `status-badge ${task.completed ? 'status-done' : 'status-progress'}`;
        statusBadge.setAttribute('role', 'button');
        statusBadge.setAttribute('aria-label', `Status: ${task.completed ? 'Done' : 'In Progress'}`);
        if (task.completed) {
            statusBadge.innerHTML = `Done ✓`;
        } else {
            statusBadge.innerHTML = `In Progress 🔄`;
        }
        statusCol.appendChild(statusBadge);
        li.appendChild(statusCol);

        // Column 6: Actions (Edit & Delete)
        const actionsCol = document.createElement('div');
        actionsCol.className = 'col-actions';

        // Edit button
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-action btn-action-edit';
        editBtn.setAttribute('aria-label', isEditing ? 'Save item name' : 'Edit item name');
        
        if (isEditing) {
            editBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            `;
        } else {
            editBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
            `;
        }
        actionsCol.appendChild(editBtn);

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-action btn-action-delete';
        deleteBtn.setAttribute('aria-label', 'Delete item');
        deleteBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
        `;
        actionsCol.appendChild(deleteBtn);

        li.appendChild(actionsCol);
        todoList.appendChild(li);
    });

    // 6. Update Counters & Statistics Footer
    updateStats();
}

function updateStats() {
    const totalTasks = state.tasks.length;
    const activeTasks = state.tasks.filter(t => !t.completed).length;
    const completedTasks = state.tasks.filter(t => t.completed).length;

    // Remaining count
    itemsLeftCounter.textContent = `${activeTasks} task${activeTasks === 1 ? '' : 's'} active`;

    // Completion percentage & progress bar fill
    const percentDone = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
    progressText.textContent = `${percentDone}% Done`;
    progressBarFill.style.width = `${percentDone}%`;

    // Toggle "Clear Completed" visibility
    if (completedTasks > 0) {
        clearCompletedBtn.style.opacity = '1';
        clearCompletedBtn.style.pointerEvents = 'auto';
    } else {
        clearCompletedBtn.style.opacity = '0';
        clearCompletedBtn.style.pointerEvents = 'none';
    }
}

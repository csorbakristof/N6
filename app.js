const STORAGE_KEY = 'n6_app_data';
const REMINDERS_FILE = 'method-reminders.txt';

// Default Data State
let appData = {
    tasks: Array.from({ length: 6 }, (_, i) => ({ id: `t${i+1}`, text: '', completed: false })),
    methodologies: [
        { id: 'm1', text: 'Focus on sequence over volume.' },
        { id: 'm2', text: 'Incomplete tasks move up tomorrow with maximal priority.' }
    ],
    lastActiveDate: new Date().toISOString().split('T')[0],
    currentReminder: { id: null, text: 'No reminders set yet.', read: true }
};

// Initialize App
async function init() {
    const hasSavedData = loadData();
    if (!hasSavedData) {
        await loadMethodologiesFromFile();
    }
    checkRollover();
    selectRandomReminder();
    renderTasks();
    renderMethodologies();
    renderReminder();

    // Event Listeners
    document.getElementById('settings-btn').addEventListener('click', toggleModal);
    document.getElementById('close-modal-btn').addEventListener('click', toggleModal);
    document.getElementById('add-methodology-btn').addEventListener('click', addMethodology);
    document.getElementById('reminder-banner').addEventListener('click', markReminderRead);
    document.getElementById('export-reminders-btn').addEventListener('click', exportMethodologies);
    document.getElementById('import-reminders-btn').addEventListener('click', () => document.getElementById('import-reminders-file').click());
    document.getElementById('import-reminders-file').addEventListener('change', importMethodologies);
}

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            appData = JSON.parse(saved);
            return true;
        } catch (e) {
            console.error("Failed to load local storage data", e);
        }
    }
    return false;
}

async function loadMethodologiesFromFile() {
    try {
        const response = await fetch(REMINDERS_FILE);
        if (!response.ok) {
            throw new Error(`Failed to load ${REMINDERS_FILE}: ${response.status}`);
        }

        const reminders = parseReminderLines(await response.text());
        if (reminders.length > 0) {
            appData.methodologies = reminders.map((reminder, index) => ({
                id: `m${index + 1}`,
                text: reminder
            }));
        }
    } catch (error) {
        console.error('Failed to load initial reminders', error);
    }
}

function parseReminderLines(text) {
    return text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

// Daily Rollover Logic
function checkRollover() {
    const today = new Date().toISOString().split('T')[0];
    if (appData.lastActiveDate !== today) {
        // Keep incomplete tasks, drop completed ones
        const incompleteTasks = appData.tasks.filter(t => t.text.trim() !== '' && !t.completed);
        
        // Rebuild 6 slots: uncompleted first, then blanks
        const newTasks = [];
        for (let i = 0; i < 6; i++) {
            newTasks.push({
                id: `t${i+1}`,
                text: incompleteTasks[i] ? incompleteTasks[i].text : '',
                completed: false
            });
        }
        appData.tasks = newTasks;
        appData.lastActiveDate = today;
        saveData();
    }
}

// Reminder Logic
function selectRandomReminder() {
    if (appData.methodologies.length === 0) {
        appData.currentReminder = { id: null, text: 'Add methodologies in settings.', read: true };
        return;
    }
    const randomIndex = Math.floor(Math.random() * appData.methodologies.length);
    const chosen = appData.methodologies[randomIndex];
    
    // Only flag as unread if it's a different reminder than before
    if (!appData.currentReminder || appData.currentReminder.id !== chosen.id) {
        appData.currentReminder = { id: chosen.id, text: chosen.text, read: false };
    }
    saveData();
}

function markReminderRead() {
    appData.currentReminder.read = true;
    saveData();
    renderReminder();
}

function renderReminder() {
    const banner = document.getElementById('reminder-banner');
    const textEl = document.getElementById('reminder-text');
    
    textEl.textContent = appData.currentReminder.text;
    if (!appData.currentReminder.read) {
        banner.classList.add('unread');
    } else {
        banner.classList.remove('unread');
    }
}

// Render Tasks (N6 Queue)
function renderTasks() {
    const listEl = document.getElementById('n6-list');
    listEl.innerHTML = '';

    appData.tasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;

        li.innerHTML = `
            <span class="task-number">${index + 1}.</span>
            <input type="text" class="task-input" value="${escapeHtml(task.text)}" placeholder="Task ${index + 1}..." data-index="${index}">
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} data-index="${index}">
        `;
        listEl.appendChild(li);
    });

    // Attach listeners to dynamic elements
    document.querySelectorAll('.task-input').forEach(input => {
        input.addEventListener('blur', (e) => updateTaskText(e.target.dataset.index, e.target.value));
    });

    document.querySelectorAll('.task-checkbox').forEach(box => {
        box.addEventListener('change', (e) => toggleTaskComplete(e.target.dataset.index, e.target.checked));
    });
}

function updateTaskText(index, value) {
    appData.tasks[index].text = value;
    saveData();
}

function toggleTaskComplete(index, isCompleted) {
    appData.tasks[index].completed = isCompleted;
    saveData();
    renderTasks();
}

// Methodology Manager Operations
function toggleModal() {
    const modal = document.getElementById('settings-modal');
    modal.classList.toggle('hidden');
}

function renderMethodologies() {
    const listEl = document.getElementById('methodology-list');
    listEl.innerHTML = '';

    appData.methodologies.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'methodology-row';
        li.innerHTML = `
            <span>${escapeHtml(item.text)}</span>
            <button onclick="deleteMethodology('${item.id}')">Delete</button>
        `;
        listEl.appendChild(li);
    });
}

function addMethodology() {
    const input = document.getElementById('new-methodology-input');
    const text = input.value.trim();
    if (text) {
        appData.methodologies.push({ id: 'm_' + Date.now(), text });
        input.value = '';
        saveData();
        renderMethodologies();
    }
}

window.deleteMethodology = function(id) {
    appData.methodologies = appData.methodologies.filter(m => m.id !== id);
    saveData();
    renderMethodologies();
};

// Reminder Backup: plain text, one reminder per line (same format as method-reminders.txt)
function exportMethodologies() {
    const text = appData.methodologies.map(m => m.text).join('\n') + '\n';
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    link.download = `n6-reminders-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

async function importMethodologies(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    const reminders = parseReminderLines(await file.text());
    if (reminders.length === 0) {
        alert('No reminders found in this file.');
        return;
    }
    if (!confirm(`Replace your ${appData.methodologies.length} reminders with the ${reminders.length} in this file?`)) return;

    const stamp = Date.now();
    appData.methodologies = reminders.map((text, index) => ({ id: `m_${stamp}_${index}`, text }));
    saveData();
    renderMethodologies();
}

function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Boot up
window.addEventListener('DOMContentLoaded', init);

let todos = [];
const todoList = document.getElementById('todoList');
const input = document.querySelector('input');
const stats = document.querySelector('.stats');
const clearButton = document.querySelector('.clear-button');
const filterButtons = document.querySelector('.filter-buttons');

function loadTodos() {
    try {
        const savedTodos = localStorage.getItem('ascii-todos');
        if (savedTodos) {
            todos = JSON.parse(savedTodos);
            // Validate loaded data
            if (!Array.isArray(todos)) {
                console.error('Invalid todos data');
                todos = [];
                saveTodos(); // Save empty array if data is invalid
            }
        } else {
            todos = []; // Initialize empty array if no data exists
            saveTodos(); // Save initial empty state
        }
        renderTodos();
    } catch (error) {
        console.error('Error loading todos:', error);
        todos = [];
        saveTodos(); // Save empty array if there's an error
    }
}

function saveTodos() {
    try {
        localStorage.setItem('ascii-todos', JSON.stringify(todos));
    } catch (error) {
        console.error('Error saving todos:', error);
        alert('Failed to save your changes. Please check your browser storage settings.');
    }
}

function formatDueDate(date) {
    if (!date) return '';
    try {
        const todoDate = new Date(date);
        if (isNaN(todoDate.getTime())) {
            throw new Error('Invalid date');
        }
        
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (todoDate.toDateString() === today.toDateString()) return 'Today';
        if (todoDate.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
        
        if (todoDate < today) {
            return `Overdue: ${todoDate.toLocaleDateString()}`;
        }
        return todoDate.toLocaleDateString();
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid date';
    }
}

function getPrioritySymbol(priority) {
    const symbols = {
        high: '⚡',
        medium: '◆',
        low: '○'
    };
    return symbols[priority] || '';
}

function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Keep track of the current filter
let currentFilter = 'all';

function renderTodos(filter = currentFilter) {
    try {
        currentFilter = filter;  // Update current filter
        let filteredTodos = [...todos];
        
        switch (filter) {
            case 'active':
                filteredTodos = filteredTodos.filter(t => !t.completed);
                break;
            case 'completed':
                filteredTodos = filteredTodos.filter(t => t.completed);
                break;
            case 'overdue':
                filteredTodos = filteredTodos.filter(t => {
                    if (!t.completed && t.dueDate) {
                        const dueDate = new Date(t.dueDate);
                        return dueDate < new Date();
                    }
                    return false;
                });
                break;
        }

        // Enhanced sorting
        filteredTodos.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1, undefined: 0 };
            
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            
            if (priorityOrder[b.priority] !== priorityOrder[a.priority]) {
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            }
            
            if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate) - new Date(b.dueDate);
            }
            
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Store the mapping between filtered and original indices
        const indexMapping = filteredTodos.map(todo => todos.indexOf(todo));

        todoList.innerHTML = filteredTodos.map((todo, filteredIndex) => {
            const originalIndex = indexMapping[filteredIndex];  // Get the original index
            const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && !todo.completed;
            return `
                <div class="todo-item ${todo.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}" 
                     data-index="${originalIndex}">
                    <span class="checkbox" role="checkbox" tabindex="0"
                          aria-checked="${todo.completed}"
                          onkeypress="if(event.key==='Enter')this.click()"
                    >[${todo.completed ? 'x' : ' '}]</span>
                    <span class="priority-indicator" title="${todo.priority || 'no priority'}">${getPrioritySymbol(todo.priority)}</span>
                    <span class="todo-text">${sanitizeHTML(todo.text)}</span>
                    ${todo.dueDate ? 
                      `<span class="due-date ${isOverdue ? 'overdue' : ''}">(${formatDueDate(todo.dueDate)})</span>` 
                      : ''}
                    <button class="edit-btn" aria-label="Edit todo">✎</button>
                    <button class="delete-btn" aria-label="Delete todo">×</button>
                </div>`;
        }).join('');

        updateStats();
    } catch (error) {
        console.error('Error rendering todos:', error);
        todoList.innerHTML = '<div class="error">Error displaying todos</div>';
    }
}

function updateStats() {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const overdue = todos.filter(t => 
        !t.completed && t.dueDate && new Date(t.dueDate) < new Date()
    ).length;
    
    stats.innerHTML = `
        ${completed}/${total} tasks completed
        ${overdue ? `<span class="overdue-count">(${overdue} overdue)</span>` : ''}
    `;
}

function parseTodoInput(text) {
    const priorityMatch = text.match(/!(high|medium|low)/i);
    const dateMatch = text.match(/@(\d{4}-\d{2}-\d{2})/);
    
    let priority = priorityMatch ? priorityMatch[1].toLowerCase() : undefined;
    let dueDate = dateMatch ? dateMatch[1] : undefined;
    
    if (dueDate) {
        const parsedDate = new Date(dueDate);
        if (isNaN(parsedDate.getTime())) {
            dueDate = undefined;
        }
    }
    
    let cleanText = text
        .replace(/!(high|medium|low)/i, '')
        .replace(/@\d{4}-\d{2}-\d{2}/, '')
        .trim();
    
    if (!cleanText) {
        throw new Error('Todo text cannot be empty');
    }

    return { text: cleanText, priority, dueDate };
}

function addTodo() {
    const inputText = input.value.trim();
    if (!inputText) return;

    try {
        const { text, priority, dueDate } = parseTodoInput(inputText);
        todos.push({
            text,
            completed: false,
            priority,
            dueDate,
            createdAt: new Date().toISOString()
        });
        saveTodos(); // Save immediately after adding
        input.value = '';
        renderTodos();
    } catch (error) {
        alert(error.message);
    }
}


function editTodo(index) {
    const todo = todos[index];
    const newText = prompt('Edit todo:', todo.text);
    if (newText === null) return;
    
    try {
        const { text, priority, dueDate } = parseTodoInput(newText);
        todos[index] = {
            ...todo,
            text,
            priority: priority || todo.priority,
            dueDate: dueDate || todo.dueDate
        };
        saveTodos(); // Save immediately after editing
        renderTodos();
    } catch (error) {
        alert(error.message);
    }
}

// Event Listeners
input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

todoList.addEventListener('click', (e) => {
    const item = e.target.closest('.todo-item');
    if (!item) return;

    const index = parseInt(item.dataset.index);
    if (isNaN(index) || index < 0 || index >= todos.length) return;

    if (e.target.classList.contains('checkbox')) {
        todos[index].completed = !todos[index].completed;
        saveTodos(); // Save immediately after modifying
        renderTodos();
    } else if (e.target.classList.contains('delete-btn')) {
        if (confirm('Are you sure you want to delete this task?')) {
            todos.splice(index, 1);
            saveTodos(); // Save immediately after deleting
            renderTodos();
        }
    } else if (e.target.classList.contains('edit-btn')) {
        editTodo(index);
    }
});

clearButton.addEventListener('click', () => {
    if (todos.length === 0) return;
    
    if (confirm('Are you sure you want to clear all tasks?')) {
        todos = [];
        saveTodos(); // Save immediately after clearing
        renderTodos();
    }
});


filterButtons.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        const filter = e.target.dataset.filter;
        document.querySelectorAll('.filter-buttons button').forEach(btn => 
            btn.classList.remove('active'));
        e.target.classList.add('active');
        renderTodos(filter);
    }
});

// Initialize
loadTodos();
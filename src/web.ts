#!/usr/bin/env node
/**
 * Forge Web UI - Simple task dashboard
 */

import express from 'express';
import { createTask, listTasks, claimTask, completeTask, unclaimTask, getTask } from './db.js';

const app = express();
const PORT = process.env.PORT || 3030;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API endpoints
app.get('/api/tasks', (_req, res) => {
  const tasks = listTasks();
  res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
  const { title, description, priority, tags, creator } = req.body || {};
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }
  if (title.length > 500) {
    res.status(400).json({ error: 'Title too long (max 500 chars)' });
    return;
  }
  const validPriorities = ['low', 'medium', 'high'];
  const safePriority = validPriorities.includes(priority) ? priority : 'medium';
  let safeTags: string[] = [];
  if (typeof tags === 'string') {
    safeTags = tags.split(',').map((t: string) => t.trim()).filter(Boolean);
  } else if (Array.isArray(tags)) {
    safeTags = tags.filter((t: unknown) => typeof t === 'string').map((t: string) => t.trim()).filter(Boolean);
  }
  const task = createTask({
    title: title.trim(),
    description: description || undefined,
    priority: safePriority,
    tags: safeTags,
    creator: typeof creator === 'string' ? creator : '@web-user'
  });
  res.json(task);
});

app.post('/api/tasks/:id/claim', (req, res) => {
  const { agent } = req.body;
  const task = claimTask(req.params.id, agent || '@web-user');
  if (!task) {
    res.status(400).json({ error: 'Cannot claim task' });
    return;
  }
  res.json(task);
});

app.post('/api/tasks/:id/complete', (req, res) => {
  const { proof } = req.body;
  const task = completeTask(req.params.id, proof);
  if (!task) {
    res.status(400).json({ error: 'Cannot complete task' });
    return;
  }
  res.json(task);
});

app.post('/api/tasks/:id/unclaim', (req, res) => {
  const task = unclaimTask(req.params.id);
  if (!task) {
    res.status(400).json({ error: 'Cannot unclaim task' });
    return;
  }
  res.json(task);
});

// Web UI
app.get('/', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Forge - Task Coordination</title>
  <style>
    :root {
      --bg: #0a0a0a;
      --bg-card: #111;
      --bg-input: #0a0a0a;
      --bg-tag: #222;
      --bg-btn: #222;
      --fg: #00ff41;
      --fg-muted: #00ff41b3;
      --border: #333;
      --accent: #00ff41;
      --accent-hover: #00cc33;
      --accent-bg: #00ff4122;
      --accent-badge: #00ff4133;
      --warn: #ffaa00;
      --warn-badge: #ffaa0033;
      --danger: #ff4444;
      --info: #4444ff;
      --muted: #666;
      --muted-badge: #66666633;
      --transition: background 0.2s, color 0.2s, border-color 0.2s;
    }
    [data-theme="light"] {
      --bg: #f5f5f0;
      --bg-card: #ffffff;
      --bg-input: #ffffff;
      --bg-tag: #e8e8e0;
      --bg-btn: #e8e8e0;
      --fg: #1a1a1a;
      --fg-muted: #555;
      --border: #ccc;
      --accent: #007a1f;
      --accent-hover: #005a16;
      --accent-bg: #007a1f18;
      --accent-badge: #007a1f22;
      --warn: #b37400;
      --warn-badge: #ffaa0028;
      --danger: #cc2222;
      --info: #2244cc;
      --muted: #999;
      --muted-badge: #99999928;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'SF Mono', 'Fira Code', monospace;
      background: var(--bg);
      color: var(--fg);
      padding: 20px;
      min-height: 100vh;
      transition: var(--transition);
    }
    h1 { margin-bottom: 20px; border-bottom: 1px solid var(--accent); padding-bottom: 10px; }
    h2 { margin: 20px 0 10px; font-size: 14px; color: var(--fg-muted); }

    .container { max-width: 900px; margin: 0 auto; }

    .create-form {
      background: var(--bg-card);
      padding: 15px;
      border: 1px solid var(--border);
      margin-bottom: 20px;
      transition: var(--transition);
    }
    .create-form input, .create-form select {
      background: var(--bg-input);
      border: 1px solid var(--border);
      color: var(--fg);
      padding: 8px;
      margin: 5px;
      font-family: inherit;
      transition: var(--transition);
    }
    .create-form button {
      background: var(--accent);
      color: var(--bg);
      border: none;
      padding: 8px 16px;
      cursor: pointer;
      font-family: inherit;
      font-weight: bold;
    }
    .create-form button:hover { background: var(--accent-hover); }

    .tasks { display: flex; flex-direction: column; gap: 10px; }

    .task {
      background: var(--bg-card);
      border: 1px solid var(--border);
      padding: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: var(--transition);
    }
    .task.claimed { border-color: var(--warn); }
    .task.completed { border-color: var(--muted); opacity: 0.6; }
    .task.high { border-left: 3px solid var(--danger); }
    .task.medium { border-left: 3px solid var(--warn); }
    .task.low { border-left: 3px solid var(--info); }

    .task-info { flex: 1; }
    .task-title { font-weight: bold; margin-bottom: 5px; }
    .task-meta { font-size: 12px; color: var(--fg-muted); }
    .task-tags { margin-top: 5px; }
    .tag {
      display: inline-block;
      background: var(--bg-tag);
      padding: 2px 8px;
      margin-right: 5px;
      font-size: 11px;
      border-radius: 3px;
      transition: var(--transition);
    }

    .task-actions button {
      background: transparent;
      border: 1px solid var(--accent);
      color: var(--accent);
      padding: 5px 12px;
      margin-left: 5px;
      cursor: pointer;
      font-family: inherit;
      font-size: 12px;
    }
    .task-actions button:hover { background: var(--accent-bg); }
    .task-actions button.complete { border-color: var(--accent); color: var(--accent); }
    .task-actions button.unclaim { border-color: var(--warn); color: var(--warn); }

    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      font-size: 10px;
      margin-left: 10px;
      text-transform: uppercase;
    }
    .status-badge.open { background: var(--accent-badge); color: var(--accent); }
    .status-badge.claimed { background: var(--warn-badge); color: var(--warn); }
    .status-badge.completed { background: var(--muted-badge); color: var(--muted); }

    .toolbar {
      position: fixed;
      top: 20px;
      right: 20px;
      display: flex;
      gap: 8px;
    }
    .toolbar button {
      background: var(--bg-btn);
      border: 1px solid var(--border);
      color: var(--fg);
      padding: 8px 16px;
      cursor: pointer;
      font-family: inherit;
      transition: var(--transition);
    }
    .toolbar button:hover { border-color: var(--accent); }
  </style>
</head>
<body>
  <div class="toolbar">
    <button onclick="toggleTheme()" id="theme-btn">light</button>
    <button onclick="loadTasks()">↻ Refresh</button>
  </div>
  <div class="container">
    <h1>⚒ FORGE</h1>

    <div class="create-form">
      <input type="text" id="title" placeholder="Task title" style="width: 300px;">
      <input type="text" id="tags" placeholder="Tags (comma-separated)">
      <select id="priority">
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="low">Low</option>
      </select>
      <button onclick="createTask()">+ Create Task</button>
    </div>

    <h2>OPEN TASKS</h2>
    <div id="open-tasks" class="tasks"></div>

    <h2>CLAIMED</h2>
    <div id="claimed-tasks" class="tasks"></div>

    <h2>COMPLETED</h2>
    <div id="completed-tasks" class="tasks"></div>
  </div>

  <script>
    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
    }

    async function loadTasks() {
      const res = await fetch('/api/tasks');
      const tasks = await res.json();

      const open = tasks.filter(t => t.status === 'open');
      const claimed = tasks.filter(t => t.status === 'claimed');
      const completed = tasks.filter(t => t.status === 'completed');

      document.getElementById('open-tasks').innerHTML = open.map(renderTask).join('') || '<div style="opacity:0.5;padding:10px;">No open tasks</div>';
      document.getElementById('claimed-tasks').innerHTML = claimed.map(renderTask).join('') || '<div style="opacity:0.5;padding:10px;">No claimed tasks</div>';
      document.getElementById('completed-tasks').innerHTML = completed.map(renderTask).join('') || '<div style="opacity:0.5;padding:10px;">No completed tasks</div>';
    }

    function renderTask(task) {
      const safeId = escapeHtml(task.id);
      const tags = (task.tags || []).map(t => '<span class="tag">' + escapeHtml(t) + '</span>').join('');
      const actions = task.status === 'open'
        ? '<button onclick="claimTask(\\'' + safeId + '\\')">Claim</button>'
        : task.status === 'claimed'
        ? '<button class="complete" onclick="completeTask(\\'' + safeId + '\\')">Complete</button><button class="unclaim" onclick="unclaimTask(\\'' + safeId + '\\')">Unclaim</button>'
        : '';

      return '<div class="task ' + escapeHtml(task.status) + ' ' + escapeHtml(task.priority) + '">' +
        '<div class="task-info">' +
          '<div class="task-title">' + escapeHtml(task.title) + '<span class="status-badge ' + escapeHtml(task.status) + '">' + escapeHtml(task.status) + '</span></div>' +
          '<div class="task-meta">ID: ' + safeId + ' | Creator: ' + escapeHtml(task.creator) + (task.assignee ? ' | Assigned: ' + escapeHtml(task.assignee) : '') + '</div>' +
          '<div class="task-tags">' + tags + '</div>' +
        '</div>' +
        '<div class="task-actions">' + actions + '</div>' +
      '</div>';
    }

    async function createTask() {
      const title = document.getElementById('title').value;
      const tags = document.getElementById('tags').value;
      const priority = document.getElementById('priority').value;

      if (!title) return alert('Title required');

      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, tags, priority })
      });

      document.getElementById('title').value = '';
      document.getElementById('tags').value = '';
      loadTasks();
    }

    async function claimTask(id) {
      await fetch('/api/tasks/' + id + '/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      loadTasks();
    }

    async function completeTask(id) {
      const proof = prompt('Proof of completion (optional):');
      await fetch('/api/tasks/' + id + '/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proof }) });
      loadTasks();
    }

    async function unclaimTask(id) {
      await fetch('/api/tasks/' + id + '/unclaim', { method: 'POST' });
      loadTasks();
    }

    function toggleTheme() {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme');
      const next = current === 'light' ? 'dark' : 'light';
      html.setAttribute('data-theme', next);
      document.getElementById('theme-btn').textContent = next === 'light' ? 'dark' : 'light';
      localStorage.setItem('forge-theme', next);
    }

    // Restore saved theme
    (function() {
      const saved = localStorage.getItem('forge-theme');
      if (saved === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        document.getElementById('theme-btn').textContent = 'dark';
      }
    })();

    loadTasks();
    setInterval(loadTasks, 5000); // Auto-refresh every 5s
  </script>
</body>
</html>`);
});

app.listen(Number(PORT), '127.0.0.1', () => {
  console.log(`Forge Web UI running at http://localhost:${PORT}`);
});

/**
 * JSON file-based task storage (simple, no native deps)
 */

import { homedir } from 'os';
import { join, dirname } from 'path';
import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync } from 'fs';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'open' | 'claimed' | 'completed';
  priority: 'low' | 'medium' | 'high';
  creator: string;
  assignee: string | null;
  tags: string[];
  bounty?: { amount: number; currency: string };
  proof?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

interface Store {
  tasks: Record<string, Task>;
}

const FORGE_DIR = join(homedir(), '.forge');
const DB_PATH = join(FORGE_DIR, 'tasks.json');

function loadStore(): Store {
  if (!existsSync(FORGE_DIR)) {
    mkdirSync(FORGE_DIR, { recursive: true });
  }

  if (!existsSync(DB_PATH)) {
    return { tasks: {} };
  }

  try {
    return JSON.parse(readFileSync(DB_PATH, 'utf-8'));
  } catch {
    console.error(`[FORGE] Warning: could not parse ${DB_PATH}, starting with empty store`);
    return { tasks: {} };
  }
}

function saveStore(store: Store): void {
  const tmpPath = DB_PATH + '.tmp';
  writeFileSync(tmpPath, JSON.stringify(store, null, 2));
  renameSync(tmpPath, DB_PATH);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function createTask(data: {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  creator: string;
  tags?: string[];
  bounty?: { amount: number; currency: string };
}): Task {
  const store = loadStore();
  const now = Date.now();
  const id = generateId();

  const task: Task = {
    id,
    title: data.title,
    description: data.description || null,
    status: 'open',
    priority: data.priority || 'medium',
    creator: data.creator,
    assignee: null,
    tags: data.tags || [],
    bounty: data.bounty,
    createdAt: now,
    updatedAt: now
  };

  store.tasks[id] = task;
  saveStore(store);

  return task;
}

export function getTask(id: string): Task | null {
  const store = loadStore();
  return store.tasks[id] || null;
}

export function listTasks(status?: string): Task[] {
  const store = loadStore();
  let tasks = Object.values(store.tasks);

  if (status) {
    tasks = tasks.filter(t => t.status === status);
  }

  return tasks.sort((a, b) => b.createdAt - a.createdAt);
}

export function claimTask(id: string, assignee: string): Task | null {
  const store = loadStore();
  const task = store.tasks[id];
  if (!task || task.status !== 'open') return null;

  task.status = 'claimed';
  task.assignee = assignee;
  task.updatedAt = Date.now();

  saveStore(store);
  return task;
}

export function completeTask(id: string, proof?: string): Task | null {
  const store = loadStore();
  const task = store.tasks[id];
  if (!task || task.status !== 'claimed') return null;

  const now = Date.now();
  task.status = 'completed';
  task.updatedAt = now;
  task.completedAt = now;
  if (proof) task.proof = proof;

  saveStore(store);
  return task;
}

export function unclaimTask(id: string): Task | null {
  const store = loadStore();
  const task = store.tasks[id];
  if (!task || task.status !== 'claimed') return null;

  task.status = 'open';
  task.assignee = null;
  task.updatedAt = Date.now();

  saveStore(store);
  return task;
}

export function taskToPublic(task: Task) {
  return {
    ...task,
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt),
    completedAt: task.completedAt ? new Date(task.completedAt) : undefined
  };
}

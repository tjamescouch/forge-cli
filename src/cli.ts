#!/usr/bin/env node
/**
 * Forge CLI - Task coordination for multi-agent workflows
 */

import { Command } from 'commander';
import { createTask, listTasks, claimTask, completeTask, unclaimTask, getTask, taskToPublic } from './db.js';

const program = new Command();

program
  .name('forge')
  .description('Task coordination CLI for multi-agent workflows')
  .version('0.1.0');

// Create a new task
program
  .command('create <title>')
  .description('Create a new task')
  .option('-d, --description <desc>', 'Task description')
  .option('-p, --priority <priority>', 'Priority: low, medium, high', 'medium')
  .option('-t, --tags <tags>', 'Comma-separated tags')
  .option('-b, --bounty <amount>', 'Bounty amount')
  .option('-c, --currency <currency>', 'Bounty currency', 'TEST')
  .option('--creator <id>', 'Creator agent ID', '@user')
  .action((title, options) => {
    const tags = options.tags ? options.tags.split(',').map((t: string) => t.trim()) : [];
    const bounty = options.bounty ? { amount: parseFloat(options.bounty), currency: options.currency } : undefined;

    const task = createTask({
      title,
      description: options.description,
      priority: options.priority,
      creator: options.creator,
      tags,
      bounty
    });

    const pub = taskToPublic(task);
    console.log(`\n✓ Task created: ${pub.id}`);
    console.log(`  Title: ${pub.title}`);
    if (pub.tags.length) console.log(`  Tags: ${pub.tags.join(', ')}`);
    if (pub.bounty) console.log(`  Bounty: ${pub.bounty.amount} ${pub.bounty.currency}`);
    console.log(`  Priority: ${pub.priority}`);
    console.log('');

    // Print broadcast format
    console.log('[FORGE] New task: "' + pub.title + '" (' + pub.priority.toUpperCase() + ')');
    console.log(`ID: ${pub.id} | Creator: ${pub.creator}`);
    if (pub.bounty) console.log(`Bounty: ${pub.bounty.amount} ${pub.bounty.currency}`);
    if (pub.tags.length) console.log(`Tags: ${pub.tags.join(', ')}`);
    console.log(`Claim with: forge claim ${pub.id}`);
  });

// List tasks
program
  .command('list')
  .description('List tasks')
  .option('-s, --status <status>', 'Filter by status: open, claimed, completed')
  .option('-a, --all', 'Show all tasks')
  .action((options) => {
    const status = options.all ? undefined : (options.status || 'open');
    const tasks = listTasks(status);

    if (tasks.length === 0) {
      console.log(`\nNo ${status || ''} tasks found.\n`);
      return;
    }

    console.log(`\n[FORGE] ${status ? status.charAt(0).toUpperCase() + status.slice(1) : 'All'} tasks (${tasks.length}):\n`);

    for (const task of tasks) {
      const pub = taskToPublic(task);
      const priority = pub.priority === 'high' ? '(HIGH)' : pub.priority === 'medium' ? '(MED)' : '';
      const bounty = pub.bounty ? ` [${pub.bounty.amount} ${pub.bounty.currency}]` : '';
      const assignee = pub.assignee ? ` → ${pub.assignee}` : '';
      console.log(`  ${pub.id}: ${pub.title} ${priority}${bounty}${assignee}`);
    }
    console.log('');
  });

// Show task details
program
  .command('show <id>')
  .description('Show task details')
  .action((id) => {
    const task = getTask(id);
    if (!task) {
      console.error(`Task not found: ${id}`);
      process.exit(1);
    }

    const pub = taskToPublic(task);
    console.log(`\nTask: ${pub.id}`);
    console.log(`  Title: ${pub.title}`);
    if (pub.description) console.log(`  Description: ${pub.description}`);
    console.log(`  Status: ${pub.status}`);
    console.log(`  Priority: ${pub.priority}`);
    console.log(`  Creator: ${pub.creator}`);
    if (pub.assignee) console.log(`  Assignee: ${pub.assignee}`);
    if (pub.tags.length) console.log(`  Tags: ${pub.tags.join(', ')}`);
    if (pub.bounty) console.log(`  Bounty: ${pub.bounty.amount} ${pub.bounty.currency}`);
    console.log(`  Created: ${pub.createdAt.toISOString()}`);
    console.log('');
  });

// Claim a task
program
  .command('claim <id>')
  .description('Claim a task')
  .option('--agent <id>', 'Agent ID claiming the task', '@user')
  .action((id, options) => {
    const task = claimTask(id, options.agent);
    if (!task) {
      console.error(`Cannot claim task ${id} - not found or not open`);
      process.exit(1);
    }

    const pub = taskToPublic(task);
    console.log(`\n✓ Task claimed: ${pub.id}`);
    console.log(`  "${pub.title}" now assigned to ${pub.assignee}`);
    console.log('');

    console.log(`[FORGE] Task claimed: "${pub.title}" by ${pub.assignee}`);
    console.log(`ID: ${pub.id}`);
  });

// Complete a task
program
  .command('complete <id>')
  .description('Mark a task as completed')
  .option('--proof <proof>', 'Proof of completion (PR link, commit, etc.)')
  .action((id, options) => {
    const task = completeTask(id, options.proof);
    if (!task) {
      console.error(`Cannot complete task ${id} - not found or not claimed`);
      process.exit(1);
    }

    const pub = taskToPublic(task);
    console.log(`\n✓ Task completed: ${pub.id}`);
    console.log(`  "${pub.title}" marked done`);
    console.log('');

    console.log(`[FORGE] Task completed: "${pub.title}" by ${pub.assignee}`);
    console.log(`ID: ${pub.id}`);
    if (options.proof) console.log(`Proof: ${options.proof}`);
  });

// Unclaim a task
program
  .command('unclaim <id>')
  .description('Release a claimed task')
  .action((id) => {
    const task = unclaimTask(id);
    if (!task) {
      console.error(`Cannot unclaim task ${id} - not found or not claimed`);
      process.exit(1);
    }

    const pub = taskToPublic(task);
    console.log(`\n✓ Task unclaimed: ${pub.id}`);
    console.log(`  "${pub.title}" is now available`);
    console.log('');

    console.log(`[FORGE] Task available: "${pub.title}"`);
    console.log(`ID: ${pub.id} | Claim with: forge claim ${pub.id}`);
  });

program.parse();

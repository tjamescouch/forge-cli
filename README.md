# Forge

Task coordination CLI for multi-agent workflows. Create, claim, and complete tasks from the terminal or a built-in web dashboard.

## Install

```bash
npm install
npm run build
npm link        # makes `forge` available globally
```

## CLI Usage

```bash
forge create "Fix login bug" -p high -t "bug,auth" -d "Users can't log in with email"
forge list                        # open tasks (default)
forge list -s claimed             # filter by status
forge list --all                  # show everything
forge show <id>                   # task details
forge claim <id>                  # claim a task
forge claim <id> --agent @alice   # claim on behalf of an agent
forge complete <id>               # mark done
forge complete <id> --proof "https://github.com/org/repo/pull/42"
forge unclaim <id>                # release back to open
```

### Commands

| Command | Description |
|---------|-------------|
| `create <title>` | Create a new task |
| `list` | List tasks (default: open) |
| `show <id>` | Show task details |
| `claim <id>` | Claim an open task |
| `complete <id>` | Mark a claimed task as completed |
| `unclaim <id>` | Release a claimed task |

### Create Options

| Flag | Description | Default |
|------|-------------|---------|
| `-d, --description <desc>` | Task description | - |
| `-p, --priority <level>` | `low`, `medium`, `high` | `medium` |
| `-t, --tags <tags>` | Comma-separated tags | - |
| `-b, --bounty <amount>` | Bounty amount | - |
| `-c, --currency <currency>` | Bounty currency | `TEST` |
| `--creator <id>` | Creator agent ID | `@user` |

## Web Dashboard

```bash
npm run web           # http://localhost:3030
PORT=8080 npm run web # custom port
```

The web UI provides:
- Task creation form with title, tags, and priority
- Three-column view: Open / Claimed / Completed
- Claim, complete, and unclaim actions
- Auto-refresh every 5 seconds
- Dark/light theme toggle (persisted in localStorage)

## REST API

The web server exposes a JSON API on the same port:

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `GET` | `/api/tasks` | - | List all tasks |
| `POST` | `/api/tasks` | `{ title, description?, priority?, tags?, creator? }` | Create task |
| `POST` | `/api/tasks/:id/claim` | `{ agent? }` | Claim task |
| `POST` | `/api/tasks/:id/complete` | `{ proof? }` | Complete task |
| `POST` | `/api/tasks/:id/unclaim` | - | Unclaim task |

## Data Storage

Tasks are stored as JSON at `~/.forge/tasks.json`. Writes are atomic (write to `.tmp`, then rename). The store is created automatically on first use.

### Task Schema

```typescript
{
  id: string;           // base36 timestamp + random suffix
  title: string;
  description: string | null;
  status: 'open' | 'claimed' | 'completed';
  priority: 'low' | 'medium' | 'high';
  creator: string;      // agent ID, e.g. "@user"
  assignee: string | null;
  tags: string[];
  bounty?: { amount: number; currency: string };
  proof?: string;       // completion proof (PR link, commit hash, etc.)
  createdAt: number;    // epoch ms
  updatedAt: number;
  completedAt?: number;
}
```

## Development

```bash
npm run dev   # run CLI via tsx (no build step)
npm run web   # run web UI via tsx
npm run build # compile to dist/
```

Requires Node.js 18+.

// Shared task utilities — thin layer over localStorage so TodoList, KanbanBoard,
// and PomodoroTimer can read/write the same task data without prop-drilling or a
// heavy state manager. Custom events notify other mounted components of changes.

export type SharedTask = {
  id: string;
  text: string;
  done: boolean;
  priority: "low" | "medium" | "high";
  createdAt: number;
};

const TASKS_KEY   = "studylin_tasks";
const KANBAN_KEY  = "studylin_kanban";
const PINNED_KEY  = "fomodoro_pinned_task";

export const SHARED_TASKS_CHANGED = "fomodoro_tasks_changed";

export function getSharedTasks(): SharedTask[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    return raw ? (JSON.parse(raw) as SharedTask[]) : [];
  } catch {
    return [];
  }
}

export function sendTaskToKanban(task: SharedTask): void {
  try {
    const raw    = localStorage.getItem(KANBAN_KEY);
    const cards: { id: string; text: string; status: string; createdAt: number }[] =
      raw ? JSON.parse(raw) : [];
    if (cards.some((c) => c.id === task.id)) return; // already there
    cards.push({ id: task.id, text: task.text, status: "todo", createdAt: task.createdAt });
    localStorage.setItem(KANBAN_KEY, JSON.stringify(cards));
    window.dispatchEvent(
      new CustomEvent(SHARED_TASKS_CHANGED, { detail: { type: "kanban" } })
    );
  } catch {
    // ignore
  }
}

export function getPinnedTaskId(): string | null {
  try {
    return localStorage.getItem(PINNED_KEY);
  } catch {
    return null;
  }
}

export function setPinnedTaskId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(PINNED_KEY, id);
    } else {
      localStorage.removeItem(PINNED_KEY);
    }
    window.dispatchEvent(
      new CustomEvent(SHARED_TASKS_CHANGED, { detail: { type: "pinned" } })
    );
  } catch {
    // ignore
  }
}

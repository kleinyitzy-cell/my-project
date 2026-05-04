"""Tool definitions and dispatch for the productivity agent."""

import json
from storage import ProductivityStorage

_storage = ProductivityStorage()

# ── Tool schemas (sent to Claude) ─────────────────────────────────────────────

TOOLS = [
    {
        "name": "add_goal",
        "description": (
            "Add a new long-term, value-driven goal. Use when the user wants to capture "
            "something important they want to achieve. Ask clarifying questions first if "
            "the goal is vague or the motivation isn't clear."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Short, clear goal name (e.g. 'Learn Spanish', 'Write a novel')",
                },
                "description": {
                    "type": "string",
                    "description": "What success looks like — a specific, concrete end state",
                },
                "motivation": {
                    "type": "string",
                    "description": "Why this goal matters personally — the deeper 'why'",
                },
                "category": {
                    "type": "string",
                    "enum": ["health", "career", "relationships", "creative", "financial", "learning", "personal", "other"],
                    "description": "Category that best fits this goal",
                },
            },
            "required": ["title", "description", "motivation"],
        },
    },
    {
        "name": "list_goals",
        "description": "List the user's goals, optionally filtered by status. Use to review what's being tracked.",
        "input_schema": {
            "type": "object",
            "properties": {
                "status": {
                    "type": "string",
                    "enum": ["active", "paused", "completed", "all"],
                    "description": "Filter by status. Omit to show active goals only.",
                },
            },
            "required": [],
        },
    },
    {
        "name": "add_task",
        "description": (
            "Add a specific, actionable task to an existing goal. Tasks should be small "
            "enough to complete in one sitting (15–90 min). Always start the title with "
            "a verb: 'Write', 'Read', 'Draft', 'Research', 'Call'."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "goal_id": {"type": "string", "description": "ID of the goal this task belongs to"},
                "title": {"type": "string", "description": "Specific action, starting with a verb"},
                "effort_minutes": {
                    "type": "integer",
                    "description": "Estimated time in minutes (15–90 is ideal)",
                },
                "due_date": {
                    "type": "string",
                    "description": "Optional target date in YYYY-MM-DD format",
                },
            },
            "required": ["goal_id", "title"],
        },
    },
    {
        "name": "complete_task",
        "description": "Mark a task as completed. Use when the user reports finishing a task.",
        "input_schema": {
            "type": "object",
            "properties": {
                "task_id": {"type": "string", "description": "ID of the completed task"},
            },
            "required": ["task_id"],
        },
    },
    {
        "name": "log_progress",
        "description": "Record a progress note for a goal — what was accomplished, observations, breakthroughs, or reflections.",
        "input_schema": {
            "type": "object",
            "properties": {
                "goal_id": {"type": "string", "description": "ID of the goal to log progress for"},
                "note": {"type": "string", "description": "What happened, what was learned, what was accomplished"},
            },
            "required": ["goal_id", "note"],
        },
    },
    {
        "name": "plan_day",
        "description": (
            "Generate a focused daily plan that reserves time for important-but-not-urgent "
            "goal work before the day fills with reactive tasks. Call when the user asks "
            "what to work on today or wants help planning their day."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "available_minutes": {
                    "type": "integer",
                    "description": "Minutes available for goal work today (not counting other obligations)",
                },
                "focus_category": {
                    "type": "string",
                    "description": "Optional: limit suggestions to one category today",
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_status_report",
        "description": (
            "Get a comprehensive overview of all goals, recent progress, and pending tasks. "
            "Use for weekly reviews, check-ins, or when the user wants the big picture."
        ),
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "update_goal_status",
        "description": "Change the status of a goal — pause it, mark it complete, or reactivate a paused goal.",
        "input_schema": {
            "type": "object",
            "properties": {
                "goal_id": {"type": "string", "description": "ID of the goal to update"},
                "status": {
                    "type": "string",
                    "enum": ["active", "paused", "completed"],
                    "description": "New status for the goal",
                },
            },
            "required": ["goal_id", "status"],
        },
    },
]

# ── Tool dispatch ──────────────────────────────────────────────────────────────

def dispatch(name: str, inputs: dict) -> str:
    """Execute a tool by name and return a string result for Claude."""
    try:
        return _handlers[name](**inputs)
    except Exception as e:
        return f"Error executing {name}: {e}"


def _add_goal(title: str, description: str, motivation: str, category: str = "other") -> str:
    goal_id = _storage.add_goal(title, description, motivation, category)
    return json.dumps({"success": True, "goal_id": goal_id, "title": title})


def _list_goals(status: str = "active") -> str:
    goals = _storage.get_goals(status if status != "all" else None)
    if not goals:
        return json.dumps({"goals": [], "message": "No goals found."})
    result = []
    for g in goals:
        done = sum(1 for t in g["tasks"] if t["completed"])
        pending = sum(1 for t in g["tasks"] if not t["completed"])
        result.append({
            "id": g["id"],
            "title": g["title"],
            "category": g["category"],
            "status": g["status"],
            "motivation": g["motivation"],
            "tasks_done": done,
            "tasks_pending": pending,
            "pending_tasks": [
                {"id": t["id"], "title": t["title"], "effort_minutes": t["effort_minutes"]}
                for t in g["tasks"] if not t["completed"]
            ],
        })
    return json.dumps({"goals": result})


def _add_task(goal_id: str, title: str, effort_minutes: int = 30, due_date: str | None = None) -> str:
    task_id = _storage.add_task(goal_id, title, effort_minutes, due_date)
    if not task_id:
        return json.dumps({"success": False, "error": f"Goal '{goal_id}' not found."})
    return json.dumps({"success": True, "task_id": task_id, "title": title, "effort_minutes": effort_minutes})


def _complete_task(task_id: str) -> str:
    result = _storage.complete_task(task_id)
    if not result:
        return json.dumps({"success": False, "error": f"Task '{task_id}' not found."})
    return json.dumps({"success": True, **result})


def _log_progress(goal_id: str, note: str) -> str:
    ok = _storage.log_progress(goal_id, note)
    if not ok:
        return json.dumps({"success": False, "error": f"Goal '{goal_id}' not found."})
    return json.dumps({"success": True, "goal_id": goal_id})


def _plan_day(available_minutes: int = 60, focus_category: str | None = None) -> str:
    pending = _storage.get_pending_tasks()
    if focus_category:
        # filter by category via goal lookup
        goals_by_id = {g["id"]: g for g in _storage.get_goals()}
        pending = [t for t in pending if goals_by_id.get(t["goal_id"], {}).get("category") == focus_category]
    return json.dumps({
        "available_minutes": available_minutes,
        "focus_category": focus_category,
        "pending_tasks": pending,
    })


def _get_status_report() -> str:
    return json.dumps(_storage.build_status_report())


def _update_goal_status(goal_id: str, status: str) -> str:
    ok = _storage.update_goal_status(goal_id, status)
    if not ok:
        return json.dumps({"success": False, "error": f"Goal '{goal_id}' not found."})
    return json.dumps({"success": True, "goal_id": goal_id, "new_status": status})


_handlers = {
    "add_goal": _add_goal,
    "list_goals": _list_goals,
    "add_task": _add_task,
    "complete_task": _complete_task,
    "log_progress": _log_progress,
    "plan_day": _plan_day,
    "get_status_report": _get_status_report,
    "update_goal_status": _update_goal_status,
}

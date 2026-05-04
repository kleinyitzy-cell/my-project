import json
import time
from datetime import datetime
from pathlib import Path


class ProductivityStorage:
    def __init__(self):
        self.data_dir = Path.home() / ".productivity_agent"
        self.data_file = self.data_dir / "data.json"
        self.data_dir.mkdir(exist_ok=True)
        self.data = self._load()

    def _load(self):
        if self.data_file.exists():
            return json.loads(self.data_file.read_text())
        return {"goals": []}

    def _save(self):
        self.data_file.write_text(json.dumps(self.data, indent=2))

    # ── Goals ────────────────────────────────────────────────────────────────

    def add_goal(self, title: str, description: str, motivation: str, category: str = "other") -> str:
        goal_id = f"g{len(self.data['goals']) + 1}_{int(time.time())}"
        self.data["goals"].append({
            "id": goal_id,
            "title": title,
            "description": description,
            "motivation": motivation,
            "category": category,
            "status": "active",
            "created_at": datetime.now().isoformat(),
            "tasks": [],
            "progress_log": [],
        })
        self._save()
        return goal_id

    def get_goals(self, status: str | None = None) -> list[dict]:
        goals = self.data["goals"]
        if status and status != "all":
            goals = [g for g in goals if g["status"] == status]
        return goals

    def get_goal(self, goal_id: str) -> dict | None:
        return next((g for g in self.data["goals"] if g["id"] == goal_id), None)

    def update_goal_status(self, goal_id: str, status: str) -> bool:
        goal = self.get_goal(goal_id)
        if not goal:
            return False
        goal["status"] = status
        self._save()
        return True

    # ── Tasks ─────────────────────────────────────────────────────────────────

    def add_task(self, goal_id: str, title: str, effort_minutes: int = 30, due_date: str | None = None) -> str | None:
        goal = self.get_goal(goal_id)
        if not goal:
            return None
        task_id = f"t{sum(len(g['tasks']) for g in self.data['goals']) + 1}_{int(time.time())}"
        goal["tasks"].append({
            "id": task_id,
            "title": title,
            "effort_minutes": effort_minutes,
            "due_date": due_date,
            "completed": False,
            "created_at": datetime.now().isoformat(),
            "completed_at": None,
        })
        self._save()
        return task_id

    def complete_task(self, task_id: str) -> dict | None:
        """Returns (goal_title, task_title) on success, None if not found."""
        for goal in self.data["goals"]:
            for task in goal["tasks"]:
                if task["id"] == task_id:
                    task["completed"] = True
                    task["completed_at"] = datetime.now().isoformat()
                    self._save()
                    return {"goal_title": goal["title"], "task_title": task["title"]}
        return None

    def get_pending_tasks(self) -> list[dict]:
        tasks = []
        for goal in self.data["goals"]:
            if goal["status"] == "active":
                for task in goal["tasks"]:
                    if not task["completed"]:
                        tasks.append({**task, "goal_title": goal["title"], "goal_id": goal["id"]})
        return tasks

    # ── Progress ──────────────────────────────────────────────────────────────

    def log_progress(self, goal_id: str, note: str) -> bool:
        goal = self.get_goal(goal_id)
        if not goal:
            return False
        goal["progress_log"].append({"date": datetime.now().isoformat(), "note": note})
        self._save()
        return True

    # ── Summaries ─────────────────────────────────────────────────────────────

    def build_status_report(self) -> dict:
        goals = self.get_goals()
        active = [g for g in goals if g["status"] == "active"]
        paused = [g for g in goals if g["status"] == "paused"]
        completed_goals = [g for g in goals if g["status"] == "completed"]

        goal_summaries = []
        for goal in active:
            all_tasks = goal["tasks"]
            done = sum(1 for t in all_tasks if t["completed"])
            pending = [t for t in all_tasks if not t["completed"]]
            recent_log = goal["progress_log"][-3:] if goal["progress_log"] else []
            goal_summaries.append({
                "id": goal["id"],
                "title": goal["title"],
                "category": goal["category"],
                "motivation": goal["motivation"],
                "tasks_done": done,
                "tasks_pending": len(pending),
                "pending_tasks": pending,
                "recent_progress": recent_log,
            })

        return {
            "active_goal_count": len(active),
            "paused_goal_count": len(paused),
            "completed_goal_count": len(completed_goals),
            "goals": goal_summaries,
        }

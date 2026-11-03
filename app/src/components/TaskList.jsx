import React, { useState } from "react";
import { deadlineInfo } from "../lib/applicationStatus.js";

// Focused checklist: description, optional due date, completion checkbox.
export function TaskList({ student, trackers, tasks, scholarshipFilter, setScholarshipFilter, onAdd, onToggle, onUpdateDueDate, onOpenScholarship }) {
  const [draft, setDraft] = useState({ title: "", due_date: "", scholarship_id: "" });
  const [showDone, setShowDone] = useState(false);
  const open = tasks.filter((task) => !task.completed).sort((a, b) => (a.due_date || "9999") < (b.due_date || "9999") ? -1 : 1);
  const done = tasks.filter((task) => task.completed);
  const scholarshipOptions = trackers.filter((tracker) => tracker.scholarship);

  function dueText(task) {
    if (!task.due_date) return "No due date";
    const info = deadlineInfo({ deadline: task.due_date }, null);
    if (!info.known) return "No due date";
    return info.pastDue ? `Overdue · ${info.label}` : `Due ${info.label}`;
  }

  function renderTask(task) {
    return (
      <article className={task.completed ? "taskCard taskRowCard done" : "taskCard taskRowCard"} key={task.id}>
        <label className="taskMain">
          <input type="checkbox" checked={Boolean(task.completed)} onChange={() => onToggle(task)} />
          <div>
            <strong>{task.title}</strong>
            <p>{task.scholarship?.name || "General"} · {dueText(task)}</p>
          </div>
        </label>
        <div className="taskWorkflowActions">
          <input type="date" aria-label={`Due date for ${task.title}`} value={task.due_date || ""} onChange={(event) => onUpdateDueDate(task.id, event.target.value)} />
          {task.scholarship_id && <button type="button" onClick={() => onOpenScholarship(task)}>Open application</button>}
        </div>
      </article>
    );
  }

  return (
    <>
      <div className="pageHeader"><h2>Tasks{student ? ` · ${student.name}` : ""}</h2></div>
      <form
        className="createBar"
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.title.trim() || !student) return;
          onAdd({ student_id: student.id, scholarship_id: draft.scholarship_id || null, title: draft.title.trim(), due_date: draft.due_date || null });
          setDraft({ ...draft, title: "", due_date: "" });
        }}
      >
        <input value={draft.title} placeholder="What needs to be done?" aria-label="Task description" onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
        <input type="date" aria-label="Due date (optional)" value={draft.due_date} onChange={(event) => setDraft({ ...draft, due_date: event.target.value })} />
        <select aria-label="Scholarship (optional)" value={draft.scholarship_id} onChange={(event) => setDraft({ ...draft, scholarship_id: event.target.value })}>
          <option value="">No scholarship</option>
          {scholarshipOptions.map((tracker) => <option key={tracker.id} value={tracker.scholarship_id}>{tracker.scholarship.name}</option>)}
        </select>
        <button type="submit" className="primary">Add task</button>
      </form>
      {scholarshipOptions.length > 0 && (
        <label className="selectLabel">
          <span>Show tasks for</span>
          <select value={scholarshipFilter} onChange={(event) => setScholarshipFilter(event.target.value)}>
            <option value="all">All scholarships</option>
            {scholarshipOptions.map((tracker) => <option key={tracker.id} value={tracker.scholarship_id}>{tracker.scholarship.name}</option>)}
          </select>
        </label>
      )}
      <section className="taskList" aria-label="Open tasks">
        {open.map(renderTask)}
        {!open.length && <div className="emptyState">No open tasks. Start an application and its checklist will appear here.</div>}
      </section>
      {done.length > 0 && (
        <section>
          <button type="button" className="linkButton" aria-expanded={showDone} onClick={() => setShowDone((value) => !value)}>
            {showDone ? "Hide" : "Show"} completed ({done.length})
          </button>
          {showDone && <div className="taskList faded">{done.map(renderTask)}</div>}
        </section>
      )}
    </>
  );
}

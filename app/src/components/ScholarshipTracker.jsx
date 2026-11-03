import React, { useEffect, useRef, useState } from "react";
import {
  SELECTABLE_STAGES,
  amountLabel,
  deadlineInfo,
  eligibilityInfo,
  nextActionFor,
  stageByKey,
  stageOf,
  stageTone,
  verificationInfo,
} from "../lib/applicationStatus.js";

const VIEW_COPY = {
  saved: {
    title: "Saved scholarships",
    empty: "Nothing saved yet. Browse scholarships and tap Save on the ones worth a closer look.",
    stages: ["saved", "not_eligible"],
  },
  progress: {
    title: "In progress",
    empty: "No applications in progress. Start one from Saved.",
    stages: ["preparing", "needs_review", "ready"],
  },
  results: {
    title: "Results",
    empty: "No results yet. Submitted, awarded and not-selected applications appear here.",
    stages: ["submitted", "awarded", "not_selected"],
  },
};

const REQUIREMENTS = [
  ["transcript_required", "Transcript"],
  ["essay_required", "Essay"],
  ["recommendation_required", "Recommendation letter"],
  ["fafsa_required", "FAFSA"],
  ["military_service_required", "Proof of military service"],
  ["dependent_status_required", "Proof of dependent status"],
];

export function ScholarshipTracker({
  view,
  trackers,
  workspaces,
  tasks,
  focusId,
  onSetStage,
  onToggleTask,
  onAddTask,
  onSaveNotes,
  onFindAnswers,
  onOpenDetails,
  onOpenAwards,
  onBrowse,
}) {
  const copy = VIEW_COPY[view];
  const rows = trackers
    .filter((tracker) => copy.stages.includes(stageOf(tracker.application_status).key))
    .map((tracker) => ({ tracker, deadline: deadlineInfo(tracker.scholarship, tracker) }))
    .sort((a, b) => {
      const ad = a.deadline.known ? a.deadline.date : "9999-12-31";
      const bd = b.deadline.known ? b.deadline.date : "9999-12-31";
      return ad < bd ? -1 : ad > bd ? 1 : 0;
    });
  const active = rows.filter(({ tracker }) => stageOf(tracker.application_status).key !== "not_eligible");
  const notEligible = rows.filter(({ tracker }) => stageOf(tracker.application_status).key === "not_eligible");

  const cardProps = { workspaces, tasks, focusId, onSetStage, onToggleTask, onAddTask, onSaveNotes, onFindAnswers, onOpenDetails, onOpenAwards };
  return (
    <section className="trackerView">
      <div className="pageHeader"><h2>{copy.title}</h2></div>
      <div className="list">
        {active.map(({ tracker, deadline }) => (
          <ApplicationCard key={tracker.id} tracker={tracker} deadline={deadline} {...cardProps} />
        ))}
        {!active.length && (
          <div className="emptyState">
            {copy.empty}{" "}
            {view === "saved" && <button type="button" className="linkButton" onClick={onBrowse}>Browse scholarships</button>}
          </div>
        )}
      </div>
      {notEligible.length > 0 && (
        <details className="notEligibleList">
          <summary>Marked not eligible ({notEligible.length})</summary>
          {notEligible.map(({ tracker }) => (
            <div className="homeRow" key={tracker.id}>
              <div>
                <strong>{tracker.scholarship?.name || "Scholarship"}</strong>
                <p>Marked not eligible. You can undo this if it was a mistake.</p>
              </div>
              <button type="button" onClick={() => onSetStage(tracker, "saved")}>Move back to Saved</button>
            </div>
          ))}
        </details>
      )}
    </section>
  );
}

function ApplicationCard({ tracker, deadline, workspaces, tasks, focusId, onSetStage, onToggleTask, onAddTask, onSaveNotes, onFindAnswers, onOpenDetails, onOpenAwards }) {
  const scholarship = tracker.scholarship || {};
  const stage = stageOf(tracker.application_status);
  const workspace = workspaces.find((item) => item.student_id === tracker.student_id && item.scholarship_id === tracker.scholarship_id);
  const cardTasks = tasks.filter((task) => task.student_id === tracker.student_id && task.scholarship_id === tracker.scholarship_id);
  const doneCount = cardTasks.filter((task) => task.completed).length;
  const openCount = cardTasks.length - doneCount;
  const verification = verificationInfo(scholarship);
  const eligibility = eligibilityInfo(scholarship, tracker);
  const isFocus = focusId && focusId === tracker.scholarship_id;
  const [open, setOpen] = useState(Boolean(isFocus));
  const ref = useRef(null);
  const [notes, setNotes] = useState(workspace?.submission_notes || "");
  const [newTask, setNewTask] = useState({ title: "", due_date: "" });

  useEffect(() => setNotes(workspace?.submission_notes || ""), [workspace?.submission_notes]);
  useEffect(() => {
    if (isFocus) {
      setOpen(true);
      ref.current?.scrollIntoView?.({ block: "start" });
    }
  }, [isFocus]);

  const requirements = REQUIREMENTS.filter(([key]) => scholarship[key]);
  const showTasks = stage.view !== "saved";

  function primaryAction() {
    switch (stage.key) {
      case "saved":
        return <button type="button" className="primary" onClick={() => onSetStage(tracker, "preparing")}>Start application</button>;
      case "preparing":
        return <button type="button" className="primary" onClick={() => setOpen(true)}>{nextActionFor(stage.key, { openTaskCount: openCount })}</button>;
      case "needs_review":
        return <button type="button" className="primary" onClick={() => onSetStage(tracker, "ready")}>Mark ready to submit</button>;
      case "ready":
        return <button type="button" className="primary" onClick={() => onSetStage(tracker, "submitted")}>Mark as submitted</button>;
      case "submitted":
        return (
          <span className="resultButtons" role="group" aria-label="Record the result">
            <button type="button" className="primary" onClick={() => onSetStage(tracker, "awarded")}>Awarded</button>
            <button type="button" onClick={() => onSetStage(tracker, "not_selected")}>Not selected</button>
          </span>
        );
      case "awarded":
        return <button type="button" onClick={onOpenAwards}>See in Awards</button>;
      default:
        return null;
    }
  }

  return (
    <article className="scholarshipItem trackerCard" ref={ref}>
      <div className="itemTop">
        <div>
          <h3>{scholarship.name || "Scholarship"}</h3>
          <p>
            {amountLabel(scholarship)} · {deadline.known ? `Due ${deadline.label}${deadline.pastDue ? " (past due)" : ""}` : deadline.label}
            {!deadline.known && deadline.raw ? ` (listed as “${deadline.raw}”)` : ""}
          </p>
        </div>
        <span className={`badge ${stageTone(stage.key)}`}>{stage.label}</span>
      </div>
      <div className="badges">
        <span className="badge neutral">{eligibility.label}</span>
        <span className={`badge ${verification.verified ? "green" : "yellow"}`}>{verification.label}</span>
        {showTasks && cardTasks.length > 0 && <span className="badge neutral">{doneCount} of {cardTasks.length} tasks done</span>}
      </div>
      <div className="cardActionsBar">
        <div className="primaryCardActions">
          {primaryAction()}
          <button type="button" className="compactAction" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            {open ? "Hide details" : "Details"}
          </button>
        </div>
      </div>
      {open && (
        <div className="trackerDetails">
          <label className="selectLabel">
            <span>Status</span>
            <select value={stage.key === "not_eligible" ? "saved" : stage.key} onChange={(event) => onSetStage(tracker, event.target.value)}>
              {SELECTABLE_STAGES.map((key) => <option key={key} value={key}>{stageByKey(key).label}</option>)}
            </select>
          </label>

          {requirements.length > 0 && (
            <p className="notes"><strong>Requirements:</strong> {requirements.map(([, label]) => label).join(", ")}</p>
          )}
          {scholarship.eligibility_reason && <p className="notes"><strong>Eligibility:</strong> {scholarship.eligibility_reason}</p>}

          {showTasks && (
            <div className="trackerTasks">
              <h4>Checklist</h4>
              {cardTasks.map((task) => (
                <label className="homeRow homeTask" key={task.id}>
                  <input type="checkbox" checked={Boolean(task.completed)} onChange={() => onToggleTask(task)} />
                  <div>
                    <strong>{task.title}</strong>
                    <p>{task.due_date ? `Due ${task.due_date}` : "No due date"}</p>
                  </div>
                </label>
              ))}
              {!cardTasks.length && <p className="inlineHint">No tasks yet.</p>}
              <form
                className="inlineTaskForm"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!newTask.title.trim()) return;
                  onAddTask({ student_id: tracker.student_id, scholarship_id: tracker.scholarship_id, workspace_id: workspace?.id || null, title: newTask.title.trim(), due_date: newTask.due_date || null });
                  setNewTask({ title: "", due_date: "" });
                }}
              >
                <input value={newTask.title} onChange={(event) => setNewTask({ ...newTask, title: event.target.value })} placeholder="Add a task" aria-label="New task" />
                <input type="date" value={newTask.due_date} onChange={(event) => setNewTask({ ...newTask, due_date: event.target.value })} aria-label="Task due date (optional)" />
                <button type="submit">Add</button>
              </form>
            </div>
          )}

          {workspace && (
            <label className="selectLabel">
              <span>Notes</span>
              <textarea
                value={notes}
                placeholder="Notes for this application"
                onChange={(event) => setNotes(event.target.value)}
                onBlur={() => { if (notes !== (workspace.submission_notes || "")) onSaveNotes(workspace.id, notes); }}
              />
            </label>
          )}

          <div className="actions">
            {showTasks && <button type="button" onClick={() => onFindAnswers(tracker)}>Find an answer to reuse</button>}
            <button type="button" onClick={() => onOpenDetails(tracker)}>Scholarship details</button>
            {scholarship.link && <a className="secondary" href={/^https?:/i.test(scholarship.link) ? scholarship.link : `https://${scholarship.link}`} target="_blank" rel="noreferrer">Website</a>}
            {stage.key === "saved" && <button type="button" onClick={() => onSetStage(tracker, "not_eligible")}>Not eligible</button>}
          </div>
        </div>
      )}
    </article>
  );
}

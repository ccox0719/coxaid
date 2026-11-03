import React from "react";
import { stageOf, stageTone, deadlineInfo, amountLabel } from "../lib/applicationStatus.js";

function dueSort(a, b) {
  const ad = a.due_date || "9999-12-31";
  const bd = b.due_date || "9999-12-31";
  return ad < bd ? -1 : ad > bd ? 1 : 0;
}

function dueLabel(task, today = new Date()) {
  if (!task.due_date) return "No due date";
  const info = deadlineInfo({ deadline: task.due_date }, null, today);
  if (!info.known) return "No due date";
  if (info.days < 0) return `Overdue · ${info.label}`;
  if (info.days === 0) return "Due today";
  return `Due ${info.label}`;
}

export function HomePage({ student, trackers, tasks, onToggleTask, onResume, onNavigate }) {
  const today = new Date();
  const openTasks = tasks.filter((task) => !task.completed).sort(dueSort);
  const nextTasks = openTasks.slice(0, 5);

  const live = trackers.filter((tracker) => ["saved", "progress"].includes(stageOf(tracker.application_status).view));
  const inProgress = live
    .filter((tracker) => stageOf(tracker.application_status).view === "progress")
    .map((tracker) => ({ tracker, deadline: deadlineInfo(tracker.scholarship, tracker, today) }))
    .sort((a, b) => (a.deadline.known ? a.deadline.date : "9999") < (b.deadline.known ? b.deadline.date : "9999") ? -1 : 1);

  const dated = live
    .map((tracker) => ({ tracker, deadline: deadlineInfo(tracker.scholarship, tracker, today) }))
    .filter((item) => item.deadline.known)
    .sort((a, b) => (a.deadline.date < b.deadline.date ? -1 : 1))
    .slice(0, 5);
  const needsCheck = live.filter((tracker) => !deadlineInfo(tracker.scholarship, tracker, today).known).length;

  if (!student) {
    return (
      <section className="homePage">
        <div className="emptyState">No student selected. Choose a student at the top, or add one in Settings.</div>
      </section>
    );
  }

  return (
    <section className="homePage">
      <header className="homeHeader">
        <p className="eyebrow">Scholarship workspace</p>
        <h2>{student.name}</h2>
      </header>

      <section className="homeSection" aria-labelledby="home-resume">
        <div className="homeSectionHeader">
          <h3 id="home-resume">Resume an application</h3>
          <button type="button" className="linkButton" onClick={() => onNavigate("In Progress")}>See all</button>
        </div>
        {inProgress.slice(0, 3).map(({ tracker, deadline }) => {
          const stage = stageOf(tracker.application_status);
          return (
            <article className="homeRow" key={tracker.id}>
              <div>
                <strong>{tracker.scholarship?.name || "Scholarship"}</strong>
                <p>
                  <span className={`badge ${stageTone(stage.key)}`}>{stage.label}</span>{" "}
                  {amountLabel(tracker.scholarship)} · {deadline.known ? `Due ${deadline.label}` : deadline.label}
                </p>
              </div>
              <button type="button" className="primary" onClick={() => onResume(tracker)}>Resume</button>
            </article>
          );
        })}
        {!inProgress.length && (
          <div className="emptyState">
            No applications in progress.{" "}
            <button type="button" className="linkButton" onClick={() => onNavigate("Saved")}>Start one from your saved scholarships</button>
            {" or "}
            <button type="button" className="linkButton" onClick={() => onNavigate("Scholarships")}>browse scholarships</button>.
          </div>
        )}
      </section>

      <section className="homeSection" aria-labelledby="home-tasks">
        <div className="homeSectionHeader">
          <h3 id="home-tasks">Next tasks</h3>
          <button type="button" className="linkButton" onClick={() => onNavigate("Tasks")}>All tasks ({openTasks.length})</button>
        </div>
        {nextTasks.map((task) => (
          <label className="homeRow homeTask" key={task.id}>
            <input type="checkbox" checked={Boolean(task.completed)} onChange={() => onToggleTask(task)} aria-label={`Complete: ${task.title}`} />
            <div>
              <strong>{task.title}</strong>
              <p>{task.scholarship?.name || "General"} · {dueLabel(task, today)}</p>
            </div>
          </label>
        ))}
        {!nextTasks.length && <div className="emptyState">You're caught up. Start an application to get a checklist.</div>}
      </section>

      <section className="homeSection" aria-labelledby="home-deadlines">
        <div className="homeSectionHeader">
          <h3 id="home-deadlines">Upcoming deadlines</h3>
        </div>
        {dated.map(({ tracker, deadline }) => (
          <article className="homeRow" key={tracker.id}>
            <div>
              <strong>{tracker.scholarship?.name || "Scholarship"}</strong>
              <p>{deadline.pastDue ? `Past due · ${deadline.label}` : deadline.days === 0 ? "Due today" : `${deadline.label} · ${deadline.days} day${deadline.days === 1 ? "" : "s"} left`}</p>
            </div>
            <span className={`badge ${stageTone(stageOf(tracker.application_status).key)}`}>{stageOf(tracker.application_status).label}</span>
          </article>
        ))}
        {!dated.length && <div className="emptyState">No known deadlines for saved or in-progress scholarships.</div>}
        {needsCheck > 0 && (
          <p className="inlineHint">
            {needsCheck} saved scholarship{needsCheck === 1 ? " has" : "s have"} no exact deadline — <button type="button" className="linkButton" onClick={() => onNavigate("Saved")}>check them</button>.
          </p>
        )}
      </section>
    </section>
  );
}


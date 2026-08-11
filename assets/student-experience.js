const primaryOrder = ["Home", "Tasks", "Scholarships", "Answer Bank", "More"];
let allowApplicationNavigation = false;
let scheduled = false;

function textOf(element) {
  return element?.textContent?.replace(/\s+/g, " ").trim() || "";
}

function currentSection() {
  const heading = document.querySelector(
    ".workspace .pageHeader h1, .workspace .pageHeader h2, .workspace > .pageHeader h1, .workspace > .pageHeader h2",
  );
  if (heading) return textOf(heading);
  if (document.querySelector(".glassDashboard")) return "Home";
  return "";
}

function clickNamedButton(container, label) {
  const button = [...container.querySelectorAll("button")].find(
    (candidate) => textOf(candidate) === label,
  );
  button?.click();
}

function enhanceBottomNavigation() {
  const nav = document.querySelector(".mobileBottomNav");
  if (!nav) return;

  nav.setAttribute("aria-label", "Student navigation");
  const buttons = [...nav.querySelectorAll(":scope > button")];
  const byLabel = new Map(buttons.map((button) => [textOf(button), button]));
  const applicationButton = byLabel.get("Applications") || nav.querySelector('[data-student-destination="Answer Bank"]');
  if (!applicationButton) return;

  applicationButton.dataset.studentDestination = "Answer Bank";
  applicationButton.setAttribute("aria-label", "Answer Bank");
  const applicationLabel = applicationButton.querySelector("span");
  if (applicationLabel && applicationLabel.textContent !== "Answer Bank") {
    applicationLabel.textContent = "Answer Bank";
  }
  const applicationIcon = applicationButton.querySelector("svg:not([data-student-icon])");
  if (applicationIcon) {
    applicationIcon.outerHTML =
      '<svg data-student-icon="answer-bank" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/><path d="M8 7h8M8 11h6"/></svg>';
  }

  const destinationByButton = new Map([
    [byLabel.get("Home"), "Home"],
    [byLabel.get("Tasks"), "Tasks"],
    [byLabel.get("Scholarships"), "Scholarships"],
    [applicationButton, "Answer Bank"],
    [byLabel.get("More"), "More"],
  ]);

  for (const [button, destination] of destinationByButton) {
    if (!button) continue;
    button.dataset.studentDestination = destination;
    button.style.order = String(primaryOrder.indexOf(destination) + 1);
    button.setAttribute("type", "button");
  }

  const section = currentSection();
  const secondarySections = [
    "Applications",
    "Student Profiles",
    "Service Log",
    "Awards",
    "Local Leads",
    "Follow-Up Emails",
    "Scholarship Report",
    "Family Settings",
  ];
  for (const [button, destination] of destinationByButton) {
    if (!button) continue;
    const active =
      destination === section ||
      (destination === "Home" && section === "Dashboard") ||
      (destination === "More" && secondarySections.includes(section));
    button.classList.toggle("studentActive", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
    if (destination === "Answer Bank" && section !== "Answer Bank") button.classList.remove("active");
  }
}

function enhanceMoreMenu() {
  const sheet = document.querySelector(".mobileMoreSheet");
  if (!sheet) return;
  const list = sheet.querySelector(".mobileMoreList");
  const answerButton = [...list.querySelectorAll("button")].find(
    (button) => textOf(button) === "Answer Bank",
  );
  if (answerButton) answerButton.hidden = true;

  if (!list.querySelector('[data-more-destination="Applications"]')) {
    const applications = document.createElement("button");
    applications.type = "button";
    applications.className = "navButton studentApplicationsLink";
    applications.dataset.moreDestination = "Applications";
    applications.innerHTML = '<span aria-hidden="true">✓</span><span>Applications</span>';
    applications.addEventListener("click", () => {
      const primary = document.querySelector('[data-student-destination="Answer Bank"]');
      allowApplicationNavigation = true;
      primary?.click();
      allowApplicationNavigation = false;
    });
    list.prepend(applications);
  }
}

function estimatedMinutes(text) {
  const value = text.toLowerCase();
  if (value.includes("submit") || value.includes("final review")) return 15;
  if (value.includes("essay") || value.includes("personal statement")) return 60;
  if (value.includes("recommendation") || value.includes("transcript")) return 15;
  if (value.includes("fafsa") || value.includes("application")) return 30;
  if (value.includes("eligibility") || value.includes("requirements")) return 10;
  return 5;
}

function enhanceTasks() {
  const pageHeading = [...document.querySelectorAll(".pageHeader h1, .pageHeader h2")].find(
    (heading) => textOf(heading) === "Tasks",
  );
  if (!pageHeading) return;

  const labels = { Today: "Needs Attention", Upcoming: "Not Started" };
  document.querySelectorAll(".taskWorkflowTabs button > span, .taskSectionHeader h3").forEach((label) => {
    if (labels[textOf(label)]) label.textContent = labels[textOf(label)];
  });

  document.querySelectorAll(".taskRowCard").forEach((card) => {
    const title = textOf(card.querySelector(".taskMain strong"));
    const detail = card.querySelector("details .notes");
    if (detail && !card.querySelector(".studentTaskDescription")) {
      const description = document.createElement("p");
      description.className = "studentTaskDescription";
      description.textContent = textOf(detail);
      card.querySelector(".taskMain > div")?.append(description);
    }

    let facts = card.querySelector(".studentTaskFacts");
    if (!facts) {
      facts = document.createElement("div");
      facts.className = "studentTaskFacts";
      facts.setAttribute("aria-label", "Task details");
      card.querySelector(".taskMeta")?.after(facts);
    }
    const dueText = textOf(card.querySelector(".taskMain p"));
    const status = card.classList.contains("done") ? "Completed" : "Not started";
    const urgency = /No due date/i.test(dueText) ? "Flexible" : "Deadline set";
    const factMarkup = [
      `<span class="studentTime">◷ ${estimatedMinutes(title)} minutes</span>`,
      `<span>${status}</span>`,
      `<span>${urgency}</span>`,
    ].join("");
    if (facts.innerHTML !== factMarkup) facts.innerHTML = factMarkup;
  });
}

function enhanceScholarships() {
  const scope = document.querySelector(".scholarshipScopeBar");
  if (!scope) return;
  const summary = textOf(scope.querySelector(".scopeSummary strong"));
  if (!scope.nextElementSibling?.classList.contains("studentScholarshipIntro")) {
    const intro = document.createElement("section");
    intro.className = "studentScholarshipIntro";
    intro.innerHTML = `<div><span class="eyebrow">Best matches</span><h2>Recommended for ${summary}</h2><p>Priority reflects verified status, current eligibility, deadline urgency, and major award value. Unverified opportunities cannot rank above 3.</p></div><div class="studentSectionKeys" aria-label="Priority guide"><span>5 · Act now</span><span>4 · Strong target</span><span>3 · Research</span><span>2 · Prepare later</span><span>1 · Low match</span><span>0 · Closed</span></div>`;
    scope.after(intro);
  }

  document.querySelectorAll(".scholarshipItem").forEach((card) => {
    if (card.querySelector(".studentScholarshipFacts")) return;
    const title = textOf(card.querySelector("h3"));
    const saved = [...card.querySelectorAll(".badge")].some((badge) => textOf(badge).startsWith("Saved to"));
    const description = textOf(card.querySelector(":scope > .notes, :scope > div > .notes"));
    const facts = document.createElement("div");
    facts.className = "studentScholarshipFacts";
    facts.setAttribute("aria-label", "Scholarship match details");
    facts.innerHTML = `<span>◷ About ${estimatedMinutes(title + " " + description)} minutes</span><span>${saved ? "Saved" : "Ready to review"}</span><span>${description ? "Profile match noted" : "Check requirements"}</span>`;
    card.querySelector(".itemTop")?.after(facts);
  });
}

function enhanceHome() {
  const dashboard = document.querySelector(".glassDashboard");
  if (!dashboard) return;
  const eyebrow = dashboard.querySelector(".glassHeroCopy > .eyebrow");
  const prompt = dashboard.querySelector(".heroQuote > p");
  const answer = dashboard.querySelector(".heroQuote > cite");
  const firstDeadline = textOf(dashboard.querySelector(".deadlineBadgeCard strong"));
  if (eyebrow && eyebrow.textContent !== "Your next step") eyebrow.textContent = "Your next step";
  if (prompt && prompt.textContent !== "What should I work on next?") {
    prompt.textContent = "What should I work on next?";
  }
  const nextStep = firstDeadline
    ? `Start with ${firstDeadline}`
    : "You are caught up—review your best scholarship matches.";
  if (answer && answer.textContent !== nextStep) answer.textContent = nextStep;

  if (!dashboard.querySelector(".studentQuickLinks")) {
    const links = document.createElement("nav");
    links.className = "studentQuickLinks";
    links.setAttribute("aria-label", "Quick access");
    links.innerHTML = ["Tasks", "Scholarships", "Answer Bank", "More tools"]
      .map((label) => `<button type="button" data-quick-link="${label}">${label}</button>`)
      .join("");
    links.addEventListener("click", (event) => {
      const label = event.target.closest("button")?.dataset.quickLink;
      if (!label) return;
      const destination = label === "More tools" ? "More" : label;
      document.querySelector(`[data-student-destination="${destination}"]`)?.click();
    });
    dashboard.querySelector(".glassHero")?.after(links);
  }
}

function enhanceAnswerBank() {
  const heading = [...document.querySelectorAll(".pageHeader h1, .pageHeader h2")].find(
    (candidate) => textOf(candidate) === "Answer Bank",
  );
  if (!heading) return;
  const header = heading.closest(".pageHeader");
  if (!header?.nextElementSibling?.classList.contains("studentAnswerIntro")) {
    const intro = document.createElement("p");
    intro.className = "studentAnswerIntro";
    intro.textContent = "Search by topic or question type, update an answer, then reuse it in an application.";
    header.after(intro);
  }
}

function enhance() {
  enhanceBottomNavigation();
  enhanceMoreMenu();
  enhanceHome();
  enhanceTasks();
  enhanceScholarships();
  enhanceAnswerBank();
}

document.addEventListener(
  "click",
  (event) => {
    const answerBankButton = event.target.closest('[data-student-destination="Answer Bank"]');
    if (!answerBankButton || allowApplicationNavigation) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const more = document.querySelector('[data-student-destination="More"]');
    more?.click();
    requestAnimationFrame(() => {
      const sheet = document.querySelector(".mobileMoreSheet");
      clickNamedButton(sheet || document, "Answer Bank");
    });
  },
  true,
);

new MutationObserver(() => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    enhance();
  });
}).observe(document.getElementById("root"), { childList: true, subtree: true });

enhance();

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Papa from "papaparse";
import {
  Award,
  BookOpen,
  CalendarDays,
  Check,
  Clipboard,
  ClipboardCheck,
  Copy,
  Crown,
  Download,
  Dumbbell,
  ExternalLink,
  ListChecks,
  FileText,
  Film,
  Flame,
  Gamepad2,
  Gift,
  GraduationCap,
  History,
  LayoutDashboard,
  Mail,
  MapPinned,
  Medal,
  Menu,
  Lightbulb,
  LoaderCircle,
  Palmtree,
  PartyPopper,
  PenLine,
  Pizza,
  Plus,
  Search,
  Send,
  Settings,
  Star,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  Upload,
  UserRound,
  Utensils,
  X,
  Zap,
  Rocket,
  Printer,
} from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, isToday } from "date-fns";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { acceptFamilyInvite, createFamilyInvite, deleteFamilyInvite, listFamilies, listFamilyInvites, listFamilyMemberships, lookupFamilyInvite, removeFamilyMember, updateFamilyMemberRole } from "./lib/familyQueries";
import { listLocalScholarshipLeads } from "./lib/localScholarshipLeadQueries";
import { archiveEmailTemplate, listEmailTemplates, listGeneratedEmails, saveEmailTemplate, saveGeneratedEmail, markEmailCopied, markEmailSent, deleteGeneratedEmail } from "./lib/emailQueries";
import { listSchools, upsertSchool, updateSchool, deleteSchool, listStudentSchoolOptions, upsertStudentSchoolOption, updateStudentSchoolOption, deleteStudentSchoolOption, listSchoolComparisonNotes, saveSchoolComparisonNote as insertSchoolComparisonNote, deleteSchoolComparisonNote } from "./lib/schoolQueries";
import { listServiceAchievements, listServiceLogs, listServiceOrganizations, saveServiceAchievement, saveServiceLog, saveServiceOrganization, updateServiceAchievement, updateServiceLog, updateServiceOrganization, deleteServiceAchievement, deleteServiceLog, deleteServiceOrganization } from "./lib/serviceQueries";
import { listStudentAwards, saveStudentAward, updateStudentAward, deleteStudentAward } from "./lib/studentAwardQueries";
import { SectionNav } from "./components/SectionNav.jsx";
import { HomePage } from "./components/HomePage.jsx";
import { ScholarshipTracker } from "./components/ScholarshipTracker.jsx";
import { TaskList } from "./components/TaskList.jsx";
import { SELECTABLE_STAGES, amountLabel, deadlineInfo, eligibilityInfo, nextActionFor, stageByKey, stageOf, verificationInfo } from "./lib/applicationStatus.js";
import "./styles.css";

if (typeof document !== "undefined") {
  document.documentElement.dataset.theme = "light";
}

// Pages (internal keys) are grouped under four primary destinations.
const NAV_HOME = "Dashboard";
const NAV_TASKS = "Tasks";
const NAV_RESEARCH = "Scholarships"; // Browse
const NAV_SAVED = "Saved";
const NAV_PROGRESS = "In Progress";
const NAV_RESULTS = "Results";
const NAV_LEADS = "Local Leads";
const NAV_EMAILS = "Follow-Up Emails";
const NAV_REPORT = "Scholarship Report";
const NAV_ANSWERS = "Answer Bank";
const NAV_SERVICE = "Service Log";
const NAV_AWARDS = "Awards";
const NAV_PROFILES = "Student Profiles";
const NAV_FAMILY = "Family Settings";
const DESTINATIONS = [
  {
    key: "Home",
    label: "Home",
    icon: "home",
    pages: [
      { key: NAV_HOME, label: "Next up" },
      { key: NAV_TASKS, label: "Tasks" },
    ],
  },
  {
    key: "Scholarships",
    label: "Scholarships",
    icon: "scholarships",
    pages: [
      { key: NAV_RESEARCH, label: "Browse" },
      { key: NAV_SAVED, label: "Saved" },
      { key: NAV_PROGRESS, label: "In progress" },
      { key: NAV_RESULTS, label: "Results" },
      { key: NAV_LEADS, label: "Local leads", secondary: true },
      { key: NAV_EMAILS, label: "Follow-up emails", secondary: true },
      { key: NAV_REPORT, label: "Summary report", secondary: true },
    ],
  },
  {
    key: "My Materials",
    label: "My Materials",
    icon: "materials",
    pages: [
      { key: NAV_ANSWERS, label: "Answers" },
      { key: NAV_SERVICE, label: "Service & activities" },
      { key: NAV_AWARDS, label: "Awards" },
    ],
  },
  {
    key: "Settings",
    label: "Settings",
    icon: "settings",
    pages: [
      { key: NAV_PROFILES, label: "Student profiles" },
      { key: NAV_FAMILY, label: "Family & account" },
    ],
  },
];
const NAV = DESTINATIONS.flatMap((destination) => destination.pages.map((page) => page.key));
function destinationOf(page) {
  return DESTINATIONS.find((destination) => destination.pages.some((item) => item.key === page)) || DESTINATIONS[0];
}
const TRACKER_STATUSES = ["Not Started", "Researching", "Not Eligible"];
const WORKSPACE_STATUSES = ["Drafting", "Needs Review", "Ready to Submit", "Submitted", "Won", "Lost"];
const ACTIVE_WORKSPACE_STATUSES = ["Researching", "Drafting", "Needs Review", "Ready to Submit"];
const APPLICATION_STATUS_OPTIONS = ["Not Started", "Researching", "Drafting", "Needs Review", "Ready to Submit", "Submitted", "Won", "Lost", "Not Eligible"];
const SCHOLARSHIP_COMMON_TAGS = ["Iowa", "Veteran dependent", "Leadership", "Faith", "Business/math", "Need-based", "School-specific"];
const GRADE_LEVEL_OPTIONS = ["9th Grade", "10th Grade", "11th Grade", "12th Grade", "College", "Graduate", "Other"];
const SCHOOL_TYPES = ["University", "Community College", "Trade School", "Private College", "Public College", "Online Program", "Other"];
const SCHOOL_INTEREST_LEVELS = ["Considering", "Strong Fit", "Backup", "Not Interested", "Chosen"];
const SCHOOL_ADMISSION_STATUSES = ["Not Applied", "Applied", "Accepted", "Waitlisted", "Denied", "Enrolled"];
const SCHOOL_COMPARISON_CATEGORIES = ["Cost", "Program Fit", "Location", "Faith Fit", "Business Program", "Math Program", "Ministry Opportunity", "Campus Life", "Scholarship Package", "Housing", "Career Outcomes"];
const SCHOOL_SPECIFIC_SCHOLARSHIP_STATUSES = ["Researching", "Admission Required", "Apply After Admission", "Applied", "Offered", "Accepted", "Declined", "Not Usable - Different School"];
const PERSONAL_AWARD_CATEGORIES = ["Academic Achievement", "Athletics", "Leadership", "Arts & Performance", "Faith & Service", "Community Recognition", "Competitions & Contests", "Other"];
const SERVICE_CATEGORIES = ["Church", "Mentoring", "Youth Work", "Sports", "Community Service", "Event Help", "Teaching", "Leadership", "Volunteer", "Other"];
const SERVICE_TAGS = ["leadership", "mentoring", "service", "faith", "youth", "teamwork", "responsibility", "communication", "planning", "problem_solving"];
const SERVICE_SKILLS = ["leadership", "communication", "patience", "organization", "teamwork", "teaching", "conflict_resolution", "reliability", "initiative"];
const SERVICE_ACHIEVEMENT_TYPES = ["Leadership", "Mentorship", "Service Milestone", "Event Support", "Responsibility", "Community Impact", "Recognition", "Other"];
const CATEGORIES = [
  "Personal Statement",
  "Leadership",
  "Community Service",
  "Career Goals",
  "Military Family Background",
  "Financial Need",
  "Academic Achievement",
  "Challenge / Adversity",
  "Short Answer",
  "Essay",
  "Recommendation Info",
  "Activity Description",
];
const SNIPPET_CATEGORIES = [
  "military_family_background",
  "leadership",
  "service",
  "volunteering",
  "resilience",
  "goals",
  "character",
  "challenge",
  "career_interest",
  "personal_statement",
];
const ORGANIZATION_TYPES = [
  "High School Guidance Office",
  "Church",
  "American Legion",
  "VFW",
  "Rotary Club",
  "Lions Club",
  "Elks Lodge",
  "Local Bank",
  "Credit Union",
  "Local Business",
  "Employer",
  "City Office",
  "County Office",
  "Community Foundation",
  "Referee Association",
  "Veteran Network",
  "Other",
];
const LEAD_STATUSES = ["To Check", "Contacted", "Follow Up Needed", "Confirmed Opportunity", "No Scholarship", "Not a Fit", "Applied", "Won", "Lost"];
const PROJECT_IDEA_STATUSES = ["idea", "planning", "active", "submitted"];
const TASK_TYPES = [
  "Review Requirements",
  "Confirm Eligibility",
  "Gather Documents",
  "Request Transcript",
  "Draft Essay",
  "Request Recommendation",
  "Complete FAFSA",
  "Gather Military Documents",
  "Parent Review",
  "Final Review",
  "Submit Application",
  "Confirm Submission",
];
const EMAIL_CATEGORIES = [
  ["scholarship_follow_up", "Scholarship Follow-Up"],
  ["local_lead_follow_up", "Local Lead Follow-Up"],
  ["recommendation_follow_up", "Recommendation Follow-Up"],
  ["document_follow_up", "Missing Document Follow-Up"],
  ["thank_you", "Thank-You"],
  ["submission_confirmation", "Submission Confirmation"],
];
const EMAIL_TONES = ["polite", "warm", "direct", "grateful"];
const EMAIL_MERGE_FIELDS = ["student_name", "scholarship_name", "organization_name", "recipient_name", "deadline", "parent_name", "follow_up_reason", "missing_items"];
const STARTER_QUESTIONS = [
  {
    title: "Personal Statement / Tell us about yourself",
    why: "Appears everywhere; this becomes the base layer for many applications.",
    include: "Values, interests, leadership, a short origin story, and direction.",
    use: "Start broad, then connect the student's story to the kind of impact they want to make.",
    tag: "personal_statement",
    category: "Personal Statement",
    tone: "sincere, focused, confident",
    prompt: "Tell us about yourself. What values, interests, experiences, and goals have shaped who you are?",
  },
  {
    title: "Leadership Experience",
    why: "Leadership is a top selection factor across many scholarship programs.",
    include: "Mentoring younger kids, church leadership, refereeing, decision-making, fairness, and oldest-sibling responsibility.",
    use: "Show what the student did, who benefited, and what leadership taught them.",
    tag: "leadership",
    category: "Leadership",
    tone: "confident, humble, specific",
    prompt: "Describe a leadership experience and explain how it shaped your character, judgment, or responsibility.",
  },
  {
    title: "Challenge / Obstacle / Failure",
    why: "This shows resilience, maturity, and growth under pressure.",
    include: "Handling pressure as a referee, stepping up to lead, balancing commitments, or learning from a mistake.",
    use: "Name the challenge, explain the response, and end with what changed afterward.",
    tag: "challenge_resilience",
    category: "Challenge / Adversity",
    tone: "honest, resilient, reflective",
    prompt: "Describe a challenge, obstacle, or failure you faced. How did you respond, and what did you learn?",
  },
  {
    title: "Community Service / Impact",
    why: "Local, faith-based, and leadership scholarships often look for service and visible impact.",
    include: "Church volunteering, mentoring neighborhood kids, organizing activities, and serving without needing attention.",
    use: "Focus on the people served, the need being met, and the student's personal investment.",
    tag: "community_service",
    category: "Community Service",
    tone: "warm, grounded, service-minded",
    prompt: "Describe a community service experience and the impact it had on others and on you.",
  },
  {
    title: "Goals / Future Plans",
    why: "This connects the student's past experiences to future direction and purpose.",
    include: "Business, math, ministry, leadership impact, career interests, and the kind of person they want to become.",
    use: "Connect current strengths and experiences to a practical next step.",
    tag: "future_goals",
    category: "Career Goals",
    tone: "purposeful, optimistic, practical",
    prompt: "What are your future goals, and how will your education help you pursue them?",
  },
];

const LEAD_QUICK_FILTERS = [
  ["to_check", "To Check"],
  ["follow_up", "Follow Up Needed"],
  ["confirmed", "Confirmed Opportunity"],
  ["military", "Military Family"],
  ["leadership", "Leadership"],
  ["faith", "Faith/Church"],
  ["work_ethic", "Work Ethic"],
  ["local_iowa", "Local Iowa"],
];
const OUTREACH_MESSAGE = "Hello, I have a high school student and we are looking for local or lesser-known scholarships, especially anything connected to leadership, community service, faith involvement, work ethic, or military families. Do you offer anything like that, or know someone local who does?";
const TAGS = [
  "leadership",
  "community service",
  "military family",
  "veteran dependent",
  "overcoming challenges",
  "career goals",
  "STEM",
  "healthcare",
  "education",
  "financial need",
  "character",
  "volunteer work",
  "sports",
  "faith",
  "family responsibility",
  "patriotism",
  "school activities",
  "work experience",
  "personal growth",
];
const DOCS = [
  ["transcript_required", "Transcript"],
  ["essay_required", "Essay"],
  ["recommendation_required", "Recommendation letter"],
  ["fafsa_required", "FAFSA"],
  ["military_service_required", "Proof of military service"],
  ["dependent_status_required", "Proof of dependent status"],
];

const blankAnswer = {
  student_id: "",
  scholarship_id: "",
  question_text: "",
  answer_text: "",
  tags: "",
  category: "Personal Statement",
  tone: "",
  application_year: new Date().getFullYear(),
  quality_rating: 4,
};
const blankLead = {
  title: "",
  organization_name: "",
  organization_type: "Other",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  address: "",
  city: "",
  county: "",
  state: "Iowa",
  possible_fit_tags: "",
  lead_status: "To Check",
  last_contacted_at: "",
  follow_up_date: "",
  notes: "",
  website: "",
  application_link: "",
  confirmed_scholarship: false,
  estimated_award: "",
  typical_deadline: "",
};

const blankScholarship = {
  name: "",
  link: "",
  award: "",
  tags: "",
  deadline: "",
  deadline_raw: "",
  school_name: "",
  school_type: "",
  is_school_specific: false,
  requires_admission: false,
  school_specific_reason: "",
  decision_bucket: "",
  stackable: true,
  scholarship_category: "",
  renewable: false,
  renewable_years: "",
  estimated_total_value: "",
  admission_deadline: "",
  scholarship_deadline: "",
  status: "Researching",
  source_file: "manual",
  last_verified_at: "",
  eligibility_reason: "",
  age_min: "",
  age_max: "",
  grade_requirement: "",
  eligible_now: false,
  eligible_soon: true,
  priority_score: 3,
  resident_state: "",
  notes: "",
};

function App() {
  const [session, setSession] = useState(null);
  const [families, setFamilies] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [familyInvites, setFamilyInvites] = useState([]);
  const [activeFamilyId, setActiveFamilyId] = useState(() => (typeof window !== "undefined" ? window.localStorage.getItem("scholarship.activeFamilyId") || "" : ""));
  const [activeMembership, setActiveMembership] = useState(null);
  const [students, setStudents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [scholarships, setScholarships] = useState([]);
  const [taskTemplates, setTaskTemplates] = useState([]);
  const [trackers, setTrackers] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [studentSchoolOptions, setStudentSchoolOptions] = useState([]);
  const [schoolComparisonNotes, setSchoolComparisonNotes] = useState([]);
  const [serviceLogs, setServiceLogs] = useState([]);
  const [serviceOrganizations, setServiceOrganizations] = useState([]);
  const [serviceAchievements, setServiceAchievements] = useState([]);
  const [studentAwards, setStudentAwards] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [snippets, setSnippets] = useState([]);
  const [projectIdeas, setProjectIdeas] = useState([]);
  const [projectIdeasEnabled, setProjectIdeasEnabled] = useState(true);
  const [localLeads, setLocalLeads] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [generatedEmails, setGeneratedEmails] = useState([]);
  const [activeNav, setActiveNav] = useState(() => {
    if (typeof window === "undefined") return "Dashboard";
    const savedNav = window.localStorage.getItem("scholarship.activeNav");
    return NAV.includes(savedNav) ? savedNav : "Dashboard";
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scholarshipFocusId, setScholarshipFocusId] = useState("");
  const dataLoadedRef = useRef(false);
  const [selectedStudentName, setSelectedStudentName] = useState(() => localStorage.getItem("scholarship.selectedStudentName") || null);
  const [showAllScholarships, setShowAllScholarships] = useState(false);
  const [scholarshipTargetStudentId, setScholarshipTargetStudentId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.documentElement.dataset.theme = "light";
    localStorage.setItem("scholarship.theme", "light");
  }, []);

  useEffect(() => {
    if (NAV.includes(activeNav)) {
      localStorage.setItem("scholarship.activeNav", activeNav);
    }
  }, [activeNav]);

  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [authMode, setAuthMode] = useState("sign_in");
  const [pendingInviteToken, setPendingInviteToken] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("invite") || params.get("invite_token") || "";
  });
  const [pendingInvite, setPendingInvite] = useState(null);
  const [inviteAccepted, setInviteAccepted] = useState(false);
  const [filters, setFilters] = useState({
    query: "",
    tag: "",
    category: "all",
    scholarship: "",
    year: "",
    minWords: "",
    maxWords: "",
    quality: "all",
    status: "all",
    eligibility: "all",
    schoolId: "all",
    renewable: "all",
    stackable: "all",
    scholarshipCategory: "all",
    deadlineWindow: "all",
  });
  const [snippetFilters, setSnippetFilters] = useState({
    query: "",
    student_id: "all",
    category: "all",
    topic: "all",
    tag: "",
    tone: "",
    reusable: "all",
  });
  const [leadFilters, setLeadFilters] = useState({
    query: "",
    status: "all",
    organization_type: "all",
    quick: "all",
  });
  const [taskFilters, setTaskFilters] = useState({
    student_id: "all",
    scholarship_id: "all",
    status: "all",
    task_type: "all",
    dueSoon: false,
  });
  const [answerForm, setAnswerForm] = useState(blankAnswer);
  const [leadForm, setLeadForm] = useState(blankLead);
  const [snippetDrafts, setSnippetDrafts] = useState([]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    withTimeout(supabase.auth.getSession(), "Supabase session lookup timed out.")
      .then(({ data }) => setSession(data.session))
      .catch((error) => setMessage(error.message))
      .finally(() => setLoading(false));

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!pendingInviteToken || !isSupabaseConfigured) return;

    lookupFamilyInvite(supabase, pendingInviteToken)
      .then(({ data, error }) => {
        if (error) {
          setMessage(error.message);
          return;
        }

        const invite = Array.isArray(data) ? data[0] : data;
        if (!invite) {
          setMessage("Invite link was not found.");
          return;
        }

        setPendingInvite(invite);
        setAuthForm((current) => ({ ...current, email: invite.email || current.email }));
        setAuthMode("sign_up");
      })
      .catch((error) => setMessage(error.message));
  }, [pendingInviteToken]);

  useEffect(() => {
    if (!session || !pendingInviteToken || inviteAccepted) return;

    acceptFamilyInvite(supabase, pendingInviteToken)
      .then(({ error }) => {
        if (error) {
          setMessage(error.message);
          return;
        }

        setInviteAccepted(true);
        setPendingInviteToken("");
        setPendingInvite(null);
        window.history.replaceState({}, "", window.location.pathname);
        setMessage("Invite accepted.");
        return loadData();
      })
      .catch((error) => setMessage(error.message));
  }, [session, pendingInviteToken, inviteAccepted]);

  useEffect(() => {
    if (!session) {
      setFamilies([]);
      setFamilyMembers([]);
      setFamilyInvites([]);
      setActiveMembership(null);
      setActiveFamilyId("");
      setServiceLogs([]);
      setServiceOrganizations([]);
      setServiceAchievements([]);
      setStudentAwards([]);
      return;
    }
    loadData();
  }, [session]);

  useEffect(() => {
    if (!session || !activeFamilyId) return;
    loadData();
  }, [session, activeFamilyId]);

  const selectedStudent = useMemo(
    () => students.find((student) => student.name === selectedStudentName),
    [students, selectedStudentName],
  );
  const defaultAnswerStudentId = selectedStudent?.id || scholarshipTargetStudentId || students[0]?.id || "";

  const activeFamily = useMemo(
    () => families.find((family) => family.id === activeFamilyId) || null,
    [families, activeFamilyId],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeFamilyId) window.localStorage.setItem("scholarship.activeFamilyId", activeFamilyId);
  }, [activeFamilyId]);

  useEffect(() => {
    if (selectedStudentName) {
      localStorage.setItem("scholarship.selectedStudentName", selectedStudentName);
    } else {
      localStorage.removeItem("scholarship.selectedStudentName");
    }
  }, [selectedStudentName]);

  useEffect(() => {
    if (!students.length) return;
    if (!selectedStudentName || selectedStudentName === "Family" || !students.some((student) => student.name === selectedStudentName)) {
      setSelectedStudentName(students[0].name);
      selectScholarshipTargetStudent(students[0].id);
      return;
    }

    if (selectedStudent?.id && scholarshipTargetStudentId !== selectedStudent.id) {
      selectScholarshipTargetStudent(selectedStudent.id);
    }
  }, [students, selectedStudentName, selectedStudent?.id, scholarshipTargetStudentId]);

  useEffect(() => {
    if (!defaultAnswerStudentId) return;
    setAnswerForm((current) => ({ ...current, student_id: defaultAnswerStudentId }));
  }, [defaultAnswerStudentId]);

  function selectStudentName(name) {
    setSelectedStudentName(name);

    const student = students.find((item) => item.name === name);
    setScholarshipTargetStudentId(student?.id || "");
  }

  function toggleShowAllScholarships(nextValue) {
    setShowAllScholarships(nextValue);
  }

  function selectScholarshipTargetStudent(nextId) {
    setScholarshipTargetStudentId(nextId);
  }

  async function loadData() {
    // Only the first load replaces the screen; later refreshes (after saving a
    // task, changing a status, ...) update in place so scroll position, open
    // cards and success messages are not lost.
    const firstLoad = !dataLoadedRef.current;
    if (firstLoad) {
      setLoading(true);
      setMessage("");
    }

    try {
      const [familyResult, membershipResult] = await withTimeout(Promise.all([
        listFamilies(supabase),
        listFamilyMemberships(supabase),
      ]), "Family lookup timed out.");

      if (familyResult.error || membershipResult.error) {
        setMessage(familyResult.error?.message || membershipResult.error?.message || "");
        return;
      }

      const allMemberships = membershipResult.data || [];
      const currentMemberships = allMemberships.filter((membership) => membership.user_id === session.user.id);
      const currentFamilyIds = currentMemberships.map((membership) => membership.family_id);
      const familyList = (familyResult.data || []).filter((family) => currentFamilyIds.includes(family.id));
      if (!currentFamilyIds.length) {
        setFamilies([]);
        setFamilyMembers([]);
        setFamilyInvites([]);
        setActiveMembership(null);
        setActiveFamilyId("");
        setStudents([]);
        setSchools([]);
        setScholarships([]);
        setStudentSchoolOptions([]);
        setSchoolComparisonNotes([]);
        setTaskTemplates([]);
        setTrackers([]);
        setWorkspaces([]);
        setQuestions([]);
        setAnswers([]);
        setSnippets([]);
        setServiceLogs([]);
        setServiceOrganizations([]);
        setServiceAchievements([]);
        setStudentAwards([]);
        setLocalLeads([]);
        setTasks([]);
        setEmailTemplates([]);
        setGeneratedEmails([]);
        setProjectIdeas([]);
        setMessage("This login is not linked to any family membership yet.");
        return;
      }

      const preferredFamilyId = currentFamilyIds.includes(activeFamilyId) ? activeFamilyId : currentFamilyIds[0];
      const nextFamilyId = preferredFamilyId;
      const activeFamilyMembers = allMemberships.filter((membership) => membership.family_id === nextFamilyId);
      const nextActiveMembership = currentMemberships.find((membership) => membership.family_id === nextFamilyId) || currentMemberships[0] || null;
      const nextCanManageFamily = Boolean(nextActiveMembership && ["family_admin", "parent"].includes(nextActiveMembership.role));

      setFamilies(familyList);
      setFamilyMembers(activeFamilyMembers);
      setActiveMembership(nextActiveMembership);
      if (nextFamilyId && nextCanManageFamily) {
        const inviteResult = await withTimeout(listFamilyInvites(supabase, nextFamilyId), "Invite lookup timed out.").catch((error) => ({ error }));
        if (!inviteResult.error) setFamilyInvites(inviteResult.data || []);
      } else {
        setFamilyInvites([]);
      }

      if (nextFamilyId && nextFamilyId !== activeFamilyId) {
        setActiveFamilyId(nextFamilyId);
      }

      if (!selectedStudentName) {
        setSelectedStudentName("Family");
      }

      const [studentResult, schoolResult, scholarshipResult, schoolOptionResult, schoolNoteResult, serviceLogResult, serviceOrganizationResult, serviceAchievementResult, studentAwardResult, templateResult, trackerResult, workspaceResult, questionResult, answerResult, snippetResult, leadResult, taskResult, emailTemplateResult, generatedEmailResult] =
        await withTimeout(Promise.all([
          supabase.from("students").select("*").eq("family_id", nextFamilyId).order("name"),
          listSchools(supabase),
          supabase.from("scholarships").select("*, school:schools(*)").eq("family_id", nextFamilyId).order("priority_score", { ascending: false }),
          listStudentSchoolOptions(supabase, nextFamilyId),
          listSchoolComparisonNotes(supabase, nextFamilyId),
          listServiceLogs(supabase, nextFamilyId),
          listServiceOrganizations(supabase, nextFamilyId),
          listServiceAchievements(supabase, nextFamilyId),
          listStudentAwards(supabase, nextFamilyId),
          supabase.from("scholarship_task_templates").select("*").order("sort_order", { ascending: true }),
          supabase
            .from("student_scholarships")
            .select("*, student:students(*), scholarship:scholarships(*)")
            .eq("family_id", nextFamilyId)
            .order("updated_at", { ascending: false }),
          supabase
            .from("application_workspaces")
            .select("*, student:students(*), scholarship:scholarships(*)")
            .eq("family_id", nextFamilyId)
            .order("updated_at", { ascending: false }),
          supabase.from("application_questions").select("*").eq("family_id", nextFamilyId).order("updated_at", { ascending: false }),
          supabase
            .from("answer_bank")
            .select("*, student:students(*), scholarship:scholarships(*)")
            .eq("family_id", nextFamilyId)
            .order("updated_at", { ascending: false }),
          supabase
            .from("answer_snippets")
            .select("*, student:students(*), scholarship:scholarships(*), answer:answer_bank(*)")
            .eq("family_id", nextFamilyId)
            .order("updated_at", { ascending: false }),
          listLocalScholarshipLeads(supabase, nextFamilyId),
          supabase
            .from("tasks")
            .select("*, student:students(*), scholarship:scholarships(*), workspace:application_workspaces(*)")
            .eq("family_id", nextFamilyId)
            .order("due_date", { ascending: true }),
          listEmailTemplates(supabase),
          listGeneratedEmails(supabase, nextFamilyId),
        ]), "Workspace data lookup timed out.");

      const error =
        studentResult.error ||
        schoolResult.error ||
        scholarshipResult.error ||
        schoolOptionResult.error ||
        schoolNoteResult.error ||
        serviceLogResult.error ||
        serviceOrganizationResult.error ||
        serviceAchievementResult.error ||
        studentAwardResult.error ||
        templateResult.error ||
        trackerResult.error ||
        workspaceResult.error ||
        questionResult.error ||
        answerResult.error ||
        snippetResult.error ||
        leadResult.error ||
        taskResult.error ||
        emailTemplateResult.error ||
        generatedEmailResult.error;

      if (error) setMessage(error.message);
      setStudents(orderStudents(studentResult.data || []));
      setSchools(orderSchools(schoolResult.data || []));
      setScholarships(scholarshipResult.data || []);
      setStudentSchoolOptions(schoolOptionResult.data || []);
      setSchoolComparisonNotes(schoolNoteResult.data || []);
      setServiceLogs(serviceLogResult.data || []);
      setServiceOrganizations(serviceOrganizationResult.data || []);
      setServiceAchievements(serviceAchievementResult.data || []);
      setStudentAwards(studentAwardResult.data || []);
      setTaskTemplates(templateResult.data || []);
      setTrackers(trackerResult.data || []);
      setWorkspaces(workspaceResult.data || []);
      setQuestions(questionResult.data || []);
      setAnswers(answerResult.data || []);
      setSnippets(snippetResult.data || []);
      setLocalLeads(leadResult.data || []);
      setTasks(taskResult.data || []);
      setEmailTemplates(emailTemplateResult.data || []);
      setGeneratedEmails(generatedEmailResult.data || []);
      await refreshProjectIdeas(nextFamilyId);
    } catch (error) {
      setMessage(error.message || "Unable to load workspace.");
    } finally {
      dataLoadedRef.current = true;
      setLoading(false);
    }
  }

  async function refreshProjectIdeas(familyId) {
    if (!projectIdeasEnabled) {
      setProjectIdeas([]);
      return;
    }
    if (!familyId) {
      setProjectIdeas([]);
      return;
    }

    const projectIdeaResult = await withTimeout(
      supabase
        .from("project_ideas")
        .select("*, student:students(*), scholarship:scholarships(*)")
        .eq("family_id", familyId)
        .order("updated_at", { ascending: false }),
      "Project ideas lookup timed out.",
    ).catch((error) => ({ error }));

    if (projectIdeaResult.error) {
      const messageText = String(projectIdeaResult.error.message || "").toLowerCase();
      if (messageText.includes("project_ideas") || messageText.includes("schema cache")) {
        setProjectIdeasEnabled(false);
      }
      setProjectIdeas([]);
      return;
    }

    setProjectIdeas(projectIdeaResult.data || []);
    setProjectIdeasEnabled(true);
  }

  async function signIn(event) {
    event.preventDefault();
    if (pendingInvite?.email && authForm.email.toLowerCase() !== pendingInvite.email.toLowerCase()) {
      setMessage(`Use the invited email address: ${pendingInvite.email}`);
      return;
    }

    setLoading(true);
    const result = authMode === "sign_up"
      ? await supabase.auth.signUp(authForm)
      : await supabase.auth.signInWithPassword(authForm);
    setMessage(result.error ? result.error.message : authMode === "sign_up" ? "Account created. Check your email if confirmation is required." : "");
    setLoading(false);
  }

  async function signOut() {
    dataLoadedRef.current = false;
    const { error } = await supabase.auth.signOut();
    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("");
    setActiveFamilyId("");
    setActiveMembership(null);
    setFamilies([]);
    setFamilyMembers([]);
    setFamilyInvites([]);
    setInviteAccepted(false);
    setPendingInviteToken("");
    setPendingInvite(null);
    setAuthMode("sign_in");
    setAuthForm({ email: "", password: "" });
  }

  const visibleStudents = useMemo(() => {
    if (selectedStudent) return [selectedStudent];
    return students[0] ? [students[0]] : [];
  }, [students, selectedStudent]);

  const visibleStudentIds = visibleStudents.map((student) => student.id);
  const visibleTrackers = trackers.filter((item) => visibleStudentIds.includes(item.student_id));
  const visibleWorkspaces = workspaces.filter((item) => visibleStudentIds.includes(item.student_id) && ACTIVE_WORKSPACE_STATUSES.includes(item.status));
  const visibleStudentSchoolOptions = studentSchoolOptions.filter((item) => visibleStudentIds.includes(item.student_id));
  const visibleSchoolComparisonNotes = schoolComparisonNotes.filter((item) => visibleStudentIds.includes(item.student_id));
  const visibleServiceLogs = serviceLogs.filter((item) => visibleStudentIds.includes(item.student_id));
  const visibleServiceAchievements = serviceAchievements.filter((item) => visibleStudentIds.includes(item.student_id));
  const visibleStudentAwards = studentAwards.filter((item) => visibleStudentIds.includes(item.student_id));
  const visibleAnswers = answers.filter((item) => visibleStudentIds.includes(item.student_id));
  const visibleSnippets = snippets.filter((item) => visibleStudentIds.includes(item.student_id));
  const visibleProjectIdeas = projectIdeas.filter((item) => visibleStudentIds.includes(item.student_id));
  const visibleTasks = tasks.filter((item) => visibleStudentIds.includes(item.student_id));
  const selectedStudentChosenSchoolId = visibleStudentSchoolOptions.find((item) => item.student_id === selectedStudent?.id && item.interest_level === "Chosen")?.school_id || null;
  const selectedStudentChosenSchool = visibleStudentSchoolOptions.find((item) => item.student_id === selectedStudent?.id && item.interest_level === "Chosen") || null;
  const filteredAnswers = filterAnswers(visibleAnswers, filters);
  const filteredSnippets = filterSnippets(visibleSnippets, snippetFilters);
  const filteredScholarships = filterScholarships(scholarships, filters, selectedStudent, showAllScholarships, trackers, selectedStudentChosenSchoolId);
  const filteredLeads = filterLocalLeads(localLeads, leadFilters);
  const filteredTasks = filterTasks(visibleTasks, taskFilters);
  const workplaceLabel = `${activeFamily?.name || "Family"} Scholarship Workplace`;
  const scholarshipActionStudent = selectedStudent || visibleStudents[0] || null;
  const canManageFamily = Boolean(activeMembership && ["family_admin", "parent"].includes(activeMembership.role));
  const currentUserLabel = session?.user?.email || "Family";

  useEffect(() => {
    setSnippetFilters((current) => (
      current.student_id === "all" || visibleStudentIds.includes(current.student_id)
        ? current
        : { ...current, student_id: "all" }
    ));
    setTaskFilters((current) => (
      current.student_id === "all" || visibleStudentIds.includes(current.student_id)
        ? current
        : { ...current, student_id: "all" }
    ));
  }, [visibleStudentIds.join("|")]);

  function focusTaskViewForTracker(tracker) {
    const student = students.find((item) => item.id === tracker.student_id);

    setScholarshipFocusId(tracker.scholarship_id);
    setActiveNav(NAV_PROGRESS);

    if (selectedStudentName !== "Family" && student && selectedStudentName !== student.name) {
      selectStudentName(student.name);
    }
  }

  async function saveScholarshipForStudent(studentId, scholarship) {
    const { error } = await supabase.from("student_scholarships").upsert(
      {
        family_id: activeFamilyId,
        student_id: studentId,
        scholarship_id: scholarship.id,
        application_status: "Researching",
        personal_notes: scholarship.notes,
        deadline: scholarship.deadline,
      },
      { onConflict: "student_id,scholarship_id" },
    );
    if (error) {
      setMessage(error.message);
      return;
    }

    const { error: workspaceError } = await supabase.from("application_workspaces").upsert(
      {
        family_id: activeFamilyId,
        student_id: studentId,
        scholarship_id: scholarship.id,
        status: "Researching",
        deadline: scholarship.deadline,
        deadline_raw: scholarship.deadline_raw || null,
      },
      { onConflict: "student_id,scholarship_id" },
    );

    if (workspaceError) setMessage(workspaceError.message);
    else setMessage(`Saved ${scholarship.name} to ${students.find((student) => student.id === studentId)?.name || "student"}.`);
    await loadData();
  }

  async function unsaveScholarshipForStudent(studentId, scholarship) {
    const { error } = await supabase
      .from("student_scholarships")
      .delete()
      .eq("student_id", studentId)
      .eq("scholarship_id", scholarship.id);
    if (error) { setMessage(error.message); return; }
    const { error: workspaceError } = await supabase
      .from("application_workspaces")
      .delete()
      .eq("student_id", studentId)
      .eq("scholarship_id", scholarship.id);
    if (workspaceError) setMessage(workspaceError.message);
    else setMessage(`Removed ${scholarship.name} from ${students.find((s) => s.id === studentId)?.name || "student"}.`);
    await loadData();
  }

  async function markScholarshipNotEligible(studentId, scholarship) {
    const { error } = await supabase.from("student_scholarships").upsert(
      {
        family_id: activeFamilyId,
        student_id: studentId,
        scholarship_id: scholarship.id,
        application_status: "Not Eligible",
        personal_notes: scholarship.notes,
        deadline: scholarship.deadline,
      },
      { onConflict: "student_id,scholarship_id" },
    );
    if (error) setMessage(error.message);
    else setMessage(`Marked ${scholarship.name} as not eligible for ${students.find((student) => student.id === studentId)?.name || "student"}.`);
    await loadData();
  }

  async function researchLater(studentId, scholarship) {
    if (!studentId) {
      setMessage("Choose a student before sending a scholarship to research later.");
      return;
    }

    const { error } = await supabase.from("scholarships").update({ status: "Research Later" }).eq("id", scholarship.id);
    if (error) {
      setMessage(error.message);
      return;
    }

    const { error: workspaceError } = await supabase.from("application_workspaces").upsert(
      {
        student_id: studentId,
        scholarship_id: scholarship.id,
        status: "Researching",
        deadline: scholarship.deadline,
        deadline_raw: scholarship.deadline_raw || null,
      },
      { onConflict: "student_id,scholarship_id" },
    );

    if (workspaceError) setMessage(workspaceError.message);
    else setMessage(`Moved ${scholarship.name} to research later.`);
    await loadData();
  }

  async function updateTracker(id, patch) {
    const { error } = await supabase.from("student_scholarships").update(patch).eq("id", id);
    if (error) {
      setMessage(error.message);
    } else if (patch.application_status === "Drafting") {
      const tracker = trackers.find((item) => item.id === id);
      if (tracker) {
        const scholarship = scholarships.find((item) => item.id === tracker.scholarship_id);
        const { error: workspaceError } = await supabase.from("application_workspaces").upsert(
          {
            family_id: activeFamilyId,
            student_id: tracker.student_id,
            scholarship_id: tracker.scholarship_id,
            status: "Drafting",
            deadline: tracker.deadline || scholarship?.deadline || null,
            deadline_raw: tracker.deadline_raw || scholarship?.deadline_raw || null,
          },
          { onConflict: "student_id,scholarship_id" },
        );

        if (workspaceError) {
          setMessage(workspaceError.message);
        } else {
          const result = await generateApplicationTasks(id);
          focusTaskViewForTracker(tracker);
          if (result) setMessage(result.message);
        }
      }
    }
    await loadData();
  }

  async function generateApplicationTasks(trackerId) {
    const { data, error } = await supabase.rpc("generate_application_tasks", { target_student_scholarship_id: trackerId });
    if (error) {
      setMessage(error.message);
      return null;
    }

    const result = Array.isArray(data) ? data[0] : data;
    if (result?.message) setMessage(result.message);
    await loadData();
    return result;
  }

  async function generateApplicationTasksAndFocus(tracker) {
    const result = await generateApplicationTasks(tracker.id);
    focusTaskViewForTracker(tracker);
    return result;
  }

  async function useDefaultTaskTemplate(scholarshipId) {
    const { data, error } = await supabase.rpc("seed_default_scholarship_task_templates", { target_scholarship_id: scholarshipId });
    setMessage(error ? error.message : `Added ${data || 0} default template tasks.`);
    await loadData();
  }

  async function saveTaskTemplate(template) {
    const row = normalizeTaskTemplate(template);
    const { error } = await supabase.from("scholarship_task_templates").upsert(row, { onConflict: "scholarship_id,title" });
    setMessage(error ? error.message : `Saved task template: ${row.title}`);
    await loadData();
  }

  async function deleteTaskTemplate(template) {
    if (!window.confirm(`Delete template task "${template.title}"?`)) return;
    const { error } = await supabase.from("scholarship_task_templates").delete().eq("id", template.id);
    setMessage(error ? error.message : `Deleted template task: ${template.title}`);
    await loadData();
  }

  async function removeTracker(tracker) {
    const label = `${tracker.scholarship?.name || "this scholarship"} for ${tracker.student?.name || "this student"}`;
    if (!window.confirm(`Remove ${label} from tracking?`)) return;

    const { error } = await supabase.from("student_scholarships").delete().eq("id", tracker.id);
    setMessage(error ? error.message : `Removed ${label}.`);
    await loadData();
  }

  async function removeScholarship(scholarship) {
    if (!window.confirm(`Remove ${scholarship.name} from the scholarship library? This also removes related trackers, workspaces, questions, and tasks.`)) return;

    const { error } = await supabase.from("scholarships").delete().eq("id", scholarship.id);
    setMessage(error ? error.message : `Removed ${scholarship.name}.`);
    await loadData();
  }

  async function updateScholarship(id, patch) {
    const normalized = normalizeScholarshipForm(patch);
    normalized.family_id = activeFamilyId;
    if (normalized.school_name) {
      const school = await ensureSchoolRecord({
        name: normalized.school_name,
        school_type: normalized.school_type,
      });
      normalized.school_id = school?.id || null;
    }
    delete normalized.school_name;
    delete normalized.school_type;

    const { error } = await supabase.from("scholarships").update(normalized).eq("id", id);
    if (error) {
      setMessage(error.message);
      return;
    }

    if (normalized.is_school_specific && normalized.school_id) {
      const scholarship = scholarships.find((item) => item.id === id) || { id, ...normalized };
      await Promise.all(visibleStudents.map((student) => generateSchoolSpecificTasks(student.id, { ...scholarship, ...normalized }, normalized.school_id)));
    }

    setMessage("Scholarship updated.");
    await loadData();
  }

  async function createScholarship(draft) {
    const normalized = normalizeScholarshipForm(draft);
    if (!normalized.name) {
      setMessage("Scholarship name is required.");
      return false;
    }
    normalized.family_id = activeFamilyId;

    if (normalized.school_name) {
      const school = await ensureSchoolRecord({
        name: normalized.school_name,
        school_type: normalized.school_type,
      });
      normalized.school_id = school?.id || null;
    }
    delete normalized.school_name;
    delete normalized.school_type;

    const { error } = await supabase.from("scholarships").insert(normalized);
    if (error) {
      setMessage(`Scholarship create failed: ${formatSupabaseError(error)}`);
      return false;
    }

    setSelectedStudentName("Family");
    setShowAllScholarships(true);
    setFilters((current) => resetScholarshipFilterState(current));
    setActiveNav(NAV_RESEARCH);
    setMessage(`Added scholarship: ${normalized.name}`);
    await loadData();
    return true;
  }

  async function saveLead(event) {
    event.preventDefault();
    const row = normalizeLeadForm(leadForm);
    row.family_id = activeFamilyId;
    const { error } = await supabase.from("local_scholarship_leads").insert(row);
    setMessage(error ? error.message : `Added lead: ${row.title}`);
    if (!error) setLeadForm(blankLead);
    await loadData();
  }

  async function updateLead(id, patch) {
    const nextPatch = { ...patch };
    if ("possible_fit_tags" in patch && typeof patch.possible_fit_tags === "string") {
      nextPatch.possible_fit_tags = parseTags(patch.possible_fit_tags);
    }
    nextPatch.family_id = activeFamilyId;

    const { error } = await supabase.from("local_scholarship_leads").update(nextPatch).eq("id", id);
    setMessage(error ? error.message : "Lead updated.");
    await loadData();
  }

  async function archiveLead(lead) {
    const { error } = await supabase.from("local_scholarship_leads").update({ lead_status: "Not a Fit" }).eq("id", lead.id);
    setMessage(error ? error.message : `Archived lead: ${lead.title}`);
    await loadData();
  }

  async function copyOutreachMessage(lead) {
    const greeting = lead.contact_name ? `Hello ${lead.contact_name},` : "Hello,";
    const message = OUTREACH_MESSAGE.replace("Hello,", greeting);
    await navigator.clipboard?.writeText(message);
    setMessage("Outreach message copied.");
  }

  async function convertLeadToScholarship(lead) {
    if (!lead.confirmed_scholarship && lead.lead_status !== "Confirmed Opportunity") {
      setMessage("Mark this lead as a confirmed scholarship opportunity before converting it.");
      return;
    }

    const row = {
      family_id: activeFamilyId,
      name: lead.title,
      link: lead.application_link || lead.website || null,
      award: lead.estimated_award || null,
      deadline: toDate(lead.typical_deadline),
      deadline_raw: lead.typical_deadline || null,
      status: "Local lead",
      source_file: "local_scholarship_leads",
      eligibility_reason: `${lead.organization_name}${lead.possible_fit_tags?.length ? `: ${lead.possible_fit_tags.join(", ")}` : ""}`,
      notes: lead.notes || null,
    };

    const { error } = await supabase.from("scholarships").upsert(row, { onConflict: "family_id,name" });
    setMessage(error ? error.message : `Created scholarship record: ${lead.title}`);
    await loadData();
  }

  async function createWorkspace(studentId, scholarshipId) {
    if (!studentId || !scholarshipId) {
      setMessage("Choose a student and scholarship first.");
      return;
    }
    const scholarship = scholarships.find((item) => item.id === scholarshipId);
    const { error } = await supabase.from("application_workspaces").upsert(
      {
        family_id: activeFamilyId,
        student_id: studentId,
        scholarship_id: scholarshipId,
        status: "Drafting",
        deadline: scholarship?.deadline || null,
      },
      { onConflict: "student_id,scholarship_id" },
    );
    if (error) setMessage(error.message);
    if (!error) {
      const { data: tracker } = await supabase
        .from("student_scholarships")
        .select("id, student_id, scholarship_id")
        .eq("student_id", studentId)
        .eq("scholarship_id", scholarshipId)
        .maybeSingle();

      if (tracker) {
        const result = await generateApplicationTasks(tracker.id);
        focusTaskViewForTracker(tracker);
        if (result) setMessage(result.message);
      }
    }
    await loadData();
  }

  async function updateWorkspace(id, patch) {
    const { error } = await supabase.from("application_workspaces").update(patch).eq("id", id);
    if (error) {
      setMessage(error.message);
    } else if (patch.status === "Drafting") {
      const workspace = workspaces.find((item) => item.id === id);
      const tracker = trackers.find((item) => item.student_id === workspace?.student_id && item.scholarship_id === workspace?.scholarship_id);
      if (tracker) {
        const result = await generateApplicationTasks(tracker.id);
        focusTaskViewForTracker(tracker);
        if (result) setMessage(result.message);
      }
    }
    await loadData();
  }

  async function addQuestion(workspaceId, questionText) {
    const { error } = await supabase.from("application_questions").insert({
      family_id: activeFamilyId,
      workspace_id: workspaceId,
      question_text: questionText,
      category: "Short Answer",
      tags: [],
    });
    if (error) setMessage(error.message);
    await loadData();
  }

  async function updateQuestion(id, patch) {
    const { error } = await supabase.from("application_questions").update(patch).eq("id", id);
    if (error) setMessage(error.message);
    await loadData();
  }

  async function finalizeQuestion(workspace, question) {
    const finalText = question.final_answer || question.draft_answer || "";
    if (!finalText.trim()) {
      setMessage("Add a final answer before saving to the answer bank.");
      return;
    }
    const counts = countText(finalText);
    const { error } = await supabase.from("answer_bank").insert({
      family_id: activeFamilyId,
      student_id: workspace.student_id,
      scholarship_id: workspace.scholarship_id,
      question_text: question.question_text,
      answer_text: finalText,
      tags: question.tags || [],
      category: question.category,
      word_count: counts.words,
      character_count: counts.characters,
      application_year: new Date().getFullYear(),
      quality_rating: 4,
    });
    if (!error) {
      await supabase.from("application_questions").update({ completed: true, final_answer: finalText }).eq("id", question.id);
    }
    setMessage(error ? error.message : "Saved finalized answer to the reusable answer bank.");
    await loadData();
  }

  async function saveAnswer(event) {
    event.preventDefault();
    const counts = countText(answerForm.answer_text);
    const row = {
      family_id: activeFamilyId,
      ...answerForm,
      scholarship_id: answerForm.scholarship_id || null,
      tags: parseTags(answerForm.tags),
      word_count: counts.words,
      character_count: counts.characters,
      application_year: Number(answerForm.application_year) || null,
      quality_rating: Number(answerForm.quality_rating) || null,
    };
    delete row.notes;
    const { error } = await supabase.from("answer_bank").insert(row);
    setMessage(error ? error.message : "Answer saved.");
    if (!error) setAnswerForm({ ...blankAnswer, student_id: answerForm.student_id || "" });
    await loadData();
  }

  async function markAnswerUsed(answer) {
    await navigator.clipboard?.writeText(answer.answer_text);
    const { error } = await supabase.from("answer_bank").update({ last_used_at: new Date().toISOString().slice(0, 10) }).eq("id", answer.id);
    setMessage(error ? error.message : "Answer copied and last-used date updated.");
    await loadData();
  }

  async function createSnippetDrafts(answer) {
    const drafts = suggestSnippets(answer);
    if (!drafts.length) {
      setMessage("This answer needs more text before snippets can be suggested.");
      return;
    }
    const rows = drafts.map(({ local_id, ...row }) => row);
    rows.forEach((row) => { row.family_id = activeFamilyId; });
    const { error } = await supabase.from("answer_snippets").insert(rows);
    setMessage(error ? error.message : `Saved ${rows.length} snippet${rows.length !== 1 ? "s" : ""} from this answer.`);
    if (!error) await loadData();
  }

  function updateSnippetDraft(localId, patch) {
    setSnippetDrafts((current) => current.map((item) => {
      if (item.local_id !== localId) return item;
      const next = { ...item, ...patch };
      if ("snippet_text" in patch) {
        const counts = countText(next.snippet_text);
        next.word_count = counts.words;
        next.character_count = counts.characters;
      }
      return next;
    }));
  }

  function removeSnippetDraft(localId) {
    setSnippetDrafts((current) => current.filter((item) => item.local_id !== localId));
  }

  async function saveSnippetDraft(draft) {
    const { local_id, student, scholarship, answer, ...row } = draft;
    row.family_id = activeFamilyId;
    const { error } = await supabase.from("answer_snippets").insert(row);
    setMessage(error ? error.message : `Saved snippet: ${draft.title}`);
    if (!error) removeSnippetDraft(local_id);
    await loadData();
  }

  async function updateSnippet(id, patch) {
    const nextPatch = { ...patch };
    if ("snippet_text" in patch) {
      const counts = countText(patch.snippet_text);
      nextPatch.word_count = counts.words;
      nextPatch.character_count = counts.characters;
    }

    const { error } = await supabase.from("answer_snippets").update(nextPatch).eq("id", id);
    setMessage(error ? error.message : "Snippet updated.");
    await loadData();
  }

  async function createProjectIdea(studentId, scholarship, draft) {
    if (!studentId) {
      setMessage("Choose a student first.");
      return false;
    }

    const row = {
      family_id: activeFamilyId,
      student_id: studentId,
      scholarship_id: scholarship?.id || null,
      title: draft.title?.trim() || `Project idea: ${scholarship?.name || "Scholarship"}`,
      description: draft.description || scholarship?.eligibility_reason || scholarship?.notes || null,
      status: draft.status || "idea",
      mentor_name: draft.mentor_name || null,
      notes: draft.notes || scholarship?.notes || null,
    };

    const { error } = await supabase.from("project_ideas").insert(row);
    if (error) {
      setMessage(error.message);
      return false;
    }

    setMessage(`Saved project idea for ${students.find((student) => student.id === studentId)?.name || "student"}.`);
    await loadData();
    return true;
  }

  async function updateProjectIdea(id, patch) {
    const { error } = await supabase.from("project_ideas").update({ ...patch, family_id: activeFamilyId }).eq("id", id);
    if (error) setMessage(error.message);
    else setMessage("Project idea updated.");
    await loadData();
  }

  async function deleteProjectIdea(projectIdea) {
    if (!window.confirm(`Delete project idea "${projectIdea.title}"?`)) return;

    const { error } = await supabase.from("project_ideas").delete().eq("id", projectIdea.id);
    if (error) setMessage(error.message);
    else setMessage(`Deleted project idea: ${projectIdea.title}`);
    await loadData();
  }

  async function deleteAnswer(answer) {
    if (!window.confirm(`Delete this answer?\n"${answer.question_text.slice(0, 80)}"`)) return;
    const { error } = await supabase.from("answer_bank").delete().eq("id", answer.id);
    setMessage(error ? error.message : "Answer deleted.");
    if (!error) await loadData();
  }

  async function deleteSnippet(snippet) {
    if (!window.confirm(`Delete snippet "${snippet.title}"?`)) return;

    const { error } = await supabase.from("answer_snippets").delete().eq("id", snippet.id);
    setMessage(error ? error.message : `Deleted snippet: ${snippet.title}`);
    await loadData();
  }

  async function copySnippet(snippet) {
    await navigator.clipboard?.writeText(snippet.snippet_text);
    setMessage("Snippet copied.");
  }

  async function insertSnippetIntoQuestion(question, snippet) {
    const existing = question.draft_answer || "";
    const separator = existing.trim() ? "\n\n" : "";
    const { error } = await supabase
      .from("application_questions")
      .update({ draft_answer: `${existing}${separator}${snippet.snippet_text}` })
      .eq("id", question.id);

    setMessage(error ? error.message : `Inserted snippet: ${snippet.title}`);
    await loadData();
  }

  async function addTask(task) {
    const title = String(task.title || "").trim();
    const duplicate = tasks.some((item) => (
      !item.completed
      && item.student_id === task.student_id
      && (item.scholarship_id || null) === (task.scholarship_id || null)
      && String(item.title || "").trim().toLowerCase() === title.toLowerCase()
    ));
    if (duplicate) {
      setMessage("That task is already on the list.");
      return;
    }
    const { error } = await supabase.from("tasks").insert({ ...task, title, family_id: activeFamilyId });
    if (error) setMessage(formatSupabaseError(error));
    await loadData();
  }

  async function toggleTask(task) {
    const { error } = await supabase.from("tasks").update({ completed: !task.completed }).eq("id", task.id);
    if (error) setMessage(error.message);
    await loadData();
  }

  async function updateTask(id, patch) {
    const nextPatch = { ...patch };
    if ("due_date" in nextPatch) nextPatch.due_date = nextPatch.due_date || null;
    if ("completed" in nextPatch) nextPatch.completed = Boolean(nextPatch.completed);

    const { error } = await supabase.from("tasks").update({ ...nextPatch, family_id: activeFamilyId }).eq("id", id);
    if (error) setMessage(error.message);
    await loadData();
  }

  function focusStudentForTask(task) {
    const student = task.student || students.find((item) => item.id === task.student_id);
    if (student && selectedStudentName !== student.name) {
      selectStudentName(student.name);
    }
  }

  async function createFamily({ family_name, student_name, student_grade }) {
    const { error } = await supabase.rpc("create_family_with_student", {
      family_name,
      student_name,
      student_grade: student_grade || null,
    });
    if (error) {
      setMessage(formatSupabaseError(error));
      return;
    }
    setMessage("");
    dataLoadedRef.current = false;
    await loadData();
  }

  function goTo(page) {
    setActiveNav(page);
    setSidebarOpen(false);
  }

  function resumeApplication(tracker) {
    const student = tracker.student || students.find((item) => item.id === tracker.student_id);
    if (student && selectedStudentName !== student.name) selectStudentName(student.name);
    setScholarshipFocusId(tracker.scholarship_id);
    goTo(NAV_PROGRESS);
  }

  // One status model: the stage is written to both the tracker and the
  // application workspace (DB triggers also keep them in sync).
  async function setApplicationStage(tracker, stageKey) {
    const stage = stageByKey(stageKey);
    const previous = stageOf(tracker.application_status);
    if (previous.key === stage.key) return;
    const name = tracker.scholarship?.name || "Scholarship";

    const { error } = await supabase.from("student_scholarships").update({ application_status: stage.write }).eq("id", tracker.id);
    if (error) {
      setMessage(formatSupabaseError(error));
      return;
    }

    if (stage.key !== "not_eligible") {
      const { data: updated, error: workspaceError } = await supabase
        .from("application_workspaces")
        .update({ status: stage.write })
        .eq("student_id", tracker.student_id)
        .eq("scholarship_id", tracker.scholarship_id)
        .select("id");
      if (workspaceError) {
        setMessage(formatSupabaseError(workspaceError));
      } else if (!updated?.length) {
        const { error: insertError } = await supabase.from("application_workspaces").insert({
          family_id: activeFamilyId,
          student_id: tracker.student_id,
          scholarship_id: tracker.scholarship_id,
          status: stage.write,
          deadline: tracker.deadline || tracker.scholarship?.deadline || null,
          deadline_raw: tracker.deadline_raw || tracker.scholarship?.deadline_raw || null,
        });
        if (insertError) setMessage(formatSupabaseError(insertError));
      }
    }

    if (stage.key === "preparing" && previous.key === "saved") {
      const result = await generateApplicationTasks(tracker.id);
      setMessage(result?.message ? `${name}: ${result.message}` : `Started ${name}.`);
      setScholarshipFocusId(tracker.scholarship_id);
      goTo(NAV_PROGRESS);
    } else {
      setMessage(`${name}: ${stage.label}.`);
      if (stage.view === "results" && stage.key !== "not_selected") setScholarshipFocusId(tracker.scholarship_id);
    }
    await loadData();
  }

  function openAnswersForReuse(tracker) {
    const student = tracker.student || students.find((item) => item.id === tracker.student_id);
    if (student && selectedStudentName !== student.name) selectStudentName(student.name);
    setFilters((current) => ({ ...current, query: "", tag: "", category: "all", scholarship: "", year: "", minWords: "", maxWords: "", quality: "all" }));
    setAnswerForm((current) => ({ ...current, student_id: tracker.student_id || current.student_id, scholarship_id: tracker.scholarship_id || "" }));
    goTo(NAV_ANSWERS);
  }

  function openTaskApplication(task) {
    focusStudentForTask(task);
    setScholarshipFocusId(task.scholarship_id || "");
    setActiveNav(NAV_PROGRESS);
    setSidebarOpen(false);
  }

  function openTaskScholarship(task) {
    focusStudentForTask(task);
    const scholarshipName = task.scholarship?.name || "";
    setShowAllScholarships(true);
    setFilters((current) => ({ ...resetScholarshipFilterState(current), query: scholarshipName }));
    setActiveNav(NAV_RESEARCH);
    setSidebarOpen(false);
  }

  function openWorkspaceAnswers(workspace) {
    const student = workspace.student || students.find((item) => item.id === workspace.student_id);
    if (student && selectedStudentName !== student.name) {
      selectStudentName(student.name);
    }

    setFilters((current) => ({
      ...current,
      query: "",
      tag: "",
      category: "all",
      scholarship: workspace.scholarship?.name || "",
      year: "",
      minWords: "",
      maxWords: "",
      quality: "all",
    }));
    setAnswerForm((current) => ({
      ...current,
      student_id: workspace.student_id || current.student_id,
      scholarship_id: workspace.scholarship_id || "",
    }));
    setActiveNav("Answer Bank");
    setSidebarOpen(false);
  }

  function openWorkspaceScholarship(workspace) {
    const student = workspace.student || students.find((item) => item.id === workspace.student_id);
    if (student && selectedStudentName !== student.name) {
      selectStudentName(student.name);
    }

    setShowAllScholarships(true);
    setFilters((current) => ({ ...resetScholarshipFilterState(current), query: workspace.scholarship?.name || "" }));
    setActiveNav(NAV_RESEARCH);
    setSidebarOpen(false);
  }

  async function updateStudent(id, patch) {
    const normalized = { ...patch };
    if ("graduation_year" in normalized) normalized.graduation_year = normalized.graduation_year === "" ? null : Number(normalized.graduation_year) || null;
    if ("gpa" in normalized) normalized.gpa = normalized.gpa === "" ? null : Number(normalized.gpa);
    if ("volunteer_hours" in normalized) normalized.volunteer_hours = normalized.volunteer_hours === "" ? null : Number(normalized.volunteer_hours) || null;

    const { error } = await supabase.from("students").update(normalized).eq("id", id);
    if (error) setMessage(error.message);
    await loadData();
  }

  async function clearAllStudentProfiles() {
    if (!students.length) {
      setMessage("No student profiles to clear.");
      return;
    }

    const confirmation = window.prompt(`Type CLEAR ALL to clear all student profile fields.`);
    if (confirmation !== "CLEAR ALL") return;

    const studentIds = students.map((student) => student.id);
    const cleared = {
      residence_state: null,
      grade_level: null,
      graduation_year: null,
      gpa: null,
      interests: null,
      activities: null,
      clubs: null,
      sports: null,
      volunteer_hours: null,
      volunteer_work: null,
      church_involvement: null,
      awards: null,
      work_experience: null,
      career_interests: null,
      military_family_background: null,
      notes: null,
    };

    const cleanupSteps = [
      () => supabase.from("answer_snippets").delete().in("student_id", studentIds),
      () => supabase.from("answer_bank").delete().in("student_id", studentIds),
      () => supabase.from("project_ideas").delete().in("student_id", studentIds),
      () => supabase.from("service_achievements").delete().in("student_id", studentIds),
      () => supabase.from("service_logs").delete().in("student_id", studentIds),
      () => supabase.from("tasks").delete().in("student_id", studentIds),
      () => supabase.from("student_scholarships").delete().in("student_id", studentIds),
      () => supabase.from("application_workspaces").delete().in("student_id", studentIds),
      () => supabase.from("students").update(cleared).in("id", studentIds),
    ];

    for (const step of cleanupSteps) {
      const { error } = await step();
      if (error) {
        setMessage(error.message);
        return;
      }
    }

    setMessage("All student profile, workspace, and history data were cleared.");
    await loadData();
  }

  async function ensureSchoolRecord(schoolInput) {
    const name = String(schoolInput?.name || "").trim();
    if (!name) return null;

    const row = {
      name,
      city: schoolInput.city?.trim() || null,
      state: schoolInput.state?.trim() || null,
      school_type: schoolInput.school_type?.trim() || null,
      website: schoolInput.website?.trim() || null,
      notes: schoolInput.notes?.trim() || null,
    };

    const { data, error } = await upsertSchool(supabase, row);
    if (error) {
      setMessage(error.message);
      return null;
    }

    return data;
  }

  async function generateSchoolSpecificTasks(studentId, scholarship, schoolId) {
    if (!studentId || !scholarship?.id) return;

    const titles = [
      scholarship.requires_admission ? "Apply for admission" : "Confirm admission requirement",
      "Check school scholarship portal",
      "Submit FAFSA if required",
      "Request transcript",
      "Check renewable requirements",
      "Compare award letter",
      "Decide whether scholarship is usable",
    ];

    const rows = titles.map((title, index) => ({
      family_id: activeFamilyId,
      student_id: studentId,
      scholarship_id: scholarship.id,
      workspace_id: null,
      title,
      due_date: scholarship.scholarship_deadline || scholarship.admission_deadline || scholarship.deadline || null,
      completed: false,
      notes: schoolId ? `School-specific task for ${schoolId}` : "School-specific scholarship task",
      task_type: "Review Requirements",
      source_type: "school_specific_scholarship",
      source_id: scholarship.id,
      sort_order: index + 1,
      required: true,
    }));

    const { error } = await supabase.from("tasks").upsert(rows, {
      onConflict: "student_id,scholarship_id,source_type,source_id,title",
    });

    if (error) setMessage(error.message);
  }

  async function saveStudentSchoolOption(studentId, option, schoolInput) {
    const school = schoolInput?.id
      ? schoolInput
      : await ensureSchoolRecord(schoolInput || {
        name: option.school_name,
        school_type: option.school_type,
        city: option.city,
        state: option.state,
        website: option.website,
        notes: option.school_notes,
      });
    if (!school?.id) return null;

    const row = {
      family_id: activeFamilyId,
      student_id: studentId,
      school_id: school.id,
      interest_level: option.interest_level || "Considering",
      admission_status: option.admission_status || "Not Applied",
      estimated_cost_of_attendance: option.estimated_cost_of_attendance === "" ? null : Number(option.estimated_cost_of_attendance) || null,
      estimated_aid: option.estimated_aid === "" ? null : Number(option.estimated_aid) || null,
      estimated_scholarships: option.estimated_scholarships === "" ? null : Number(option.estimated_scholarships) || null,
      estimated_out_of_pocket: option.estimated_out_of_pocket === "" ? null : Number(option.estimated_out_of_pocket) || null,
      pros: option.pros || null,
      cons: option.cons || null,
      notes: option.notes || null,
    };

    const { data, error } = await upsertStudentSchoolOption(supabase, row);
    if (error) {
      setMessage(error.message);
      return null;
    }

    if (row.interest_level === "Chosen") {
      const chosen = school.id;
      const schoolSpecificScholarships = scholarships.filter((scholarship) => scholarship.is_school_specific && scholarship.school_id === chosen);
      const otherSchoolTrackers = trackers.filter((tracker) => tracker.student_id === studentId && tracker.scholarship?.is_school_specific && tracker.scholarship?.school_id && tracker.scholarship.school_id !== chosen);

      await Promise.all([
        ...schoolSpecificScholarships.map((scholarship) => generateSchoolSpecificTasks(studentId, scholarship, chosen)),
        ...otherSchoolTrackers.map((tracker) => supabase.from("student_scholarships").update({
          application_status: "Not Eligible",
          personal_notes: `${tracker.personal_notes ? `${tracker.personal_notes}\n` : ""}Not Usable - Different School.`,
        }).eq("id", tracker.id)),
      ]);

      setStudentSchoolOptions((current) => current.map((item) => {
        if (item.student_id !== studentId) return item;
        if (item.school_id === chosen) return { ...item, ...row };
        return item;
      }));
    }

    await loadData();
    setMessage(`Saved school option for ${students.find((student) => student.id === studentId)?.name || "student"}.`);
    return data;
  }

  async function deleteStudentSchoolOptionRecord(id) {
    const { error } = await deleteStudentSchoolOption(supabase, id);
    if (error) {
      setMessage(error.message);
      return;
    }
    await loadData();
    setMessage("Deleted school option.");
  }

  async function saveStudentSchoolComparisonNote(studentId, note) {
    const row = {
      family_id: activeFamilyId,
      student_id: studentId,
      school_id: note.school_id,
      category: note.category || null,
      note: note.note || null,
      score: note.score === "" ? null : Number(note.score) || null,
    };
    const { data, error } = await insertSchoolComparisonNote(supabase, row);
    if (error) {
      setMessage(error.message);
      return null;
    }
    await loadData();
    setMessage("Saved school comparison note.");
    return data;
  }

  async function deleteStudentSchoolComparisonNoteRecord(id) {
    const { error } = await deleteSchoolComparisonNote(supabase, id);
    if (error) {
      setMessage(error.message);
      return;
    }
    await loadData();
    setMessage("Deleted school comparison note.");
  }

  function normalizeServiceLogInput(log) {
    const activityDate = log.activity_date || log.activityDate || "";
    const organizationName = String(log.organization_name || log.organizationName || "").trim();
    const activityTitle = String(log.activity_title || log.activityTitle || "").trim();
    const tags = Array.isArray(log.tags) ? uniqueOptions(log.tags) : parseTags(log.tags);
    const skillsUsed = Array.isArray(log.skills_used) ? uniqueOptions(log.skills_used) : parseTags(log.skills_used);

    return {
      family_id: activeFamilyId,
      student_id: log.student_id,
      activity_date: activityDate || null,
      hours: log.hours === "" || log.hours == null ? null : Number(log.hours),
      organization_name: organizationName,
      activity_title: activityTitle,
      category: log.category || null,
      tags,
      description: log.description?.trim() || null,
      impact_description: log.impact_description?.trim() || null,
      skills_used: skillsUsed,
      people_served: log.people_served === "" || log.people_served == null ? null : Number(log.people_served),
      leadership_role: Boolean(log.leadership_role),
      recurring_activity: Boolean(log.recurring_activity),
      verification_contact_name: log.verification_contact_name?.trim() || null,
      verification_contact_email: log.verification_contact_email?.trim() || null,
      proof_url: log.proof_url?.trim() || null,
      reflection: log.reflection?.trim() || null,
    };
  }

  async function saveServiceOrganizationRecord(organization) {
    if (!activeFamilyId) return null;
    const row = {
      family_id: activeFamilyId,
      name: String(organization.name || "").trim(),
      category: organization.category || null,
      contact_name: organization.contact_name?.trim() || null,
      contact_email: organization.contact_email?.trim() || null,
      contact_phone: organization.contact_phone?.trim() || null,
      notes: organization.notes?.trim() || null,
    };

    if (!row.name) return null;

    const { data, error } = await saveServiceOrganization(supabase, row);
    if (error) {
      setMessage(error.message);
      return null;
    }
    return data;
  }

  async function saveServiceLogRecord(log) {
    const row = normalizeServiceLogInput(log);
    if (!row.student_id || !row.activity_date || row.hours === null || row.hours === undefined || row.hours === "" || !row.organization_name || !row.activity_title) {
      setMessage("Service logs need a student, date, hours, organization, and activity title.");
      return null;
    }

    const organization = serviceOrganizations.find((item) => item.family_id === activeFamilyId && item.name.toLowerCase() === row.organization_name.toLowerCase()) || null;
    if (canManageFamily) {
      await saveServiceOrganizationRecord({
        name: row.organization_name,
        category: row.category || organization?.category || null,
        contact_name: row.verification_contact_name || organization?.contact_name || null,
        contact_email: row.verification_contact_email || organization?.contact_email || null,
        contact_phone: organization?.contact_phone || null,
        notes: row.description || organization?.notes || null,
      });
    }

    const { data, error } = await saveServiceLog(supabase, row);
    if (error) {
      setMessage(error.message);
      return null;
    }

    setMessage("Service log saved.");
    await loadData();
    return data;
  }

  async function updateServiceLogRecord(id, patch) {
    const nextPatch = {};
    if ("student_id" in patch) nextPatch.student_id = patch.student_id;
    if ("activity_date" in patch) nextPatch.activity_date = patch.activity_date || null;
    if ("hours" in patch) nextPatch.hours = patch.hours === "" || patch.hours == null ? null : Number(patch.hours);
    if ("organization_name" in patch) nextPatch.organization_name = String(patch.organization_name || "").trim();
    if ("activity_title" in patch) nextPatch.activity_title = String(patch.activity_title || "").trim();
    if ("category" in patch) nextPatch.category = patch.category || null;
    if ("tags" in patch) nextPatch.tags = Array.isArray(patch.tags) ? uniqueOptions(patch.tags) : parseTags(patch.tags);
    if ("skills_used" in patch) nextPatch.skills_used = Array.isArray(patch.skills_used) ? uniqueOptions(patch.skills_used) : parseTags(patch.skills_used);
    if ("description" in patch) nextPatch.description = patch.description?.trim() || null;
    if ("impact_description" in patch) nextPatch.impact_description = patch.impact_description?.trim() || null;
    if ("people_served" in patch) nextPatch.people_served = patch.people_served === "" || patch.people_served == null ? null : Number(patch.people_served);
    if ("leadership_role" in patch) nextPatch.leadership_role = Boolean(patch.leadership_role);
    if ("recurring_activity" in patch) nextPatch.recurring_activity = Boolean(patch.recurring_activity);
    if ("verification_contact_name" in patch) nextPatch.verification_contact_name = patch.verification_contact_name?.trim() || null;
    if ("verification_contact_email" in patch) nextPatch.verification_contact_email = patch.verification_contact_email?.trim() || null;
    if ("proof_url" in patch) nextPatch.proof_url = patch.proof_url?.trim() || null;
    if ("reflection" in patch) nextPatch.reflection = patch.reflection?.trim() || null;

    const { error } = await updateServiceLog(supabase, id, nextPatch);
    if (error) {
      setMessage(error.message);
      return null;
    }

    setMessage("Service log updated.");
    await loadData();
    return true;
  }

  async function deleteServiceLogRecord(id) {
    const { error } = await deleteServiceLog(supabase, id);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Service log deleted.");
    await loadData();
  }

  async function saveServiceAchievementRecord(achievement) {
    const row = {
      family_id: activeFamilyId,
      student_id: achievement.student_id,
      service_log_id: achievement.service_log_id || null,
      title: String(achievement.title || "").trim(),
      description: achievement.description?.trim() || null,
      achievement_type: achievement.achievement_type || null,
      date_earned: achievement.date_earned || null,
      tags: Array.isArray(achievement.tags) ? uniqueOptions(achievement.tags) : parseTags(achievement.tags),
      resume_bullet: achievement.resume_bullet?.trim() || null,
      scholarship_angle: achievement.scholarship_angle?.trim() || null,
    };

    if (!row.student_id || !row.title) {
      setMessage("Achievement needs a student and title.");
      return null;
    }

    const { data, error } = await saveServiceAchievement(supabase, row);
    if (error) {
      setMessage(error.message);
      return null;
    }

    setMessage("Service achievement saved.");
    await loadData();
    return data;
  }

  async function updateServiceAchievementRecord(id, patch) {
    const nextPatch = {};
    if ("student_id" in patch) nextPatch.student_id = patch.student_id;
    if ("service_log_id" in patch) nextPatch.service_log_id = patch.service_log_id || null;
    if ("title" in patch) nextPatch.title = String(patch.title || "").trim();
    if ("description" in patch) nextPatch.description = patch.description?.trim() || null;
    if ("achievement_type" in patch) nextPatch.achievement_type = patch.achievement_type || null;
    if ("date_earned" in patch) nextPatch.date_earned = patch.date_earned || null;
    if ("tags" in patch) nextPatch.tags = Array.isArray(patch.tags) ? uniqueOptions(patch.tags) : parseTags(patch.tags);
    if ("resume_bullet" in patch) nextPatch.resume_bullet = patch.resume_bullet?.trim() || null;
    if ("scholarship_angle" in patch) nextPatch.scholarship_angle = patch.scholarship_angle?.trim() || null;
    const { error } = await updateServiceAchievement(supabase, id, nextPatch);
    if (error) {
      setMessage(error.message);
      return null;
    }
    setMessage("Service achievement updated.");
    await loadData();
    return true;
  }

  async function deleteServiceAchievementRecord(id) {
    const { error } = await deleteServiceAchievement(supabase, id);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Service achievement deleted.");
    await loadData();
  }

  async function saveStudentAwardRecord(award) {
    const row = {
      student_id: award.student_id,
      title: String(award.title || "").trim(),
      category: award.category || null,
      issuing_org: award.issuing_org?.trim() || null,
      date_earned: award.date_earned || null,
      description: award.description?.trim() || null,
      scholarship_angle: award.scholarship_angle?.trim() || null,
      tags: Array.isArray(award.tags) ? uniqueOptions(award.tags) : parseTags(award.tags),
    };
    if (!row.title) { setMessage("Award title is required."); return null; }
    const { data, error } = await saveStudentAward(supabase, row);
    if (error) { setMessage(error.message); return null; }
    setStudentAwards((prev) => [data, ...prev]);
    setMessage("Award saved.");
    return data;
  }

  async function updateStudentAwardRecord(id, patch) {
    const { data, error } = await updateStudentAward(supabase, id, patch);
    if (error) { setMessage(error.message); return null; }
    setStudentAwards((prev) => prev.map((a) => (a.id === id ? data : a)));
    setMessage("Award updated.");
    return data;
  }

  async function deleteStudentAwardRecord(id) {
    const { error } = await deleteStudentAward(supabase, id);
    if (error) { setMessage(error.message); return; }
    setStudentAwards((prev) => prev.filter((a) => a.id !== id));
    setMessage("Award deleted.");
  }

  async function generateAndSaveEmail({ templateId, studentId, scholarshipId, leadId, recipientName, recipientEmail, subject, body }) {
    const { data, error } = await saveGeneratedEmail(supabase, {
      family_id: activeFamilyId,
      template_id: templateId || null,
      student_id: studentId || null,
      scholarship_id: scholarshipId || null,
      lead_id: leadId || null,
      recipient_name: recipientName || null,
      recipient_email: recipientEmail || null,
      subject,
      body,
    });
    if (error) { setMessage(error.message); return null; }
    setGeneratedEmails((prev) => [data, ...prev]);
    return data;
  }

  async function markGeneratedEmailCopied(id) {
    const { error } = await markEmailCopied(supabase, id);
    if (error) { setMessage(error.message); return; }
    setGeneratedEmails((prev) => prev.map((e) => e.id === id ? { ...e, copied_at: new Date().toISOString() } : e));
  }

  async function markGeneratedEmailSent(id) {
    const { error } = await markEmailSent(supabase, id);
    if (error) { setMessage(error.message); return; }
    setGeneratedEmails((prev) => prev.map((e) => e.id === id ? { ...e, sent_manually: true } : e));
  }

  async function removeGeneratedEmail(id) {
    const { error } = await deleteGeneratedEmail(supabase, id);
    if (error) { setMessage(error.message); return; }
    setGeneratedEmails((prev) => prev.filter((e) => e.id !== id));
  }

  async function saveEmailTemplateRecord(template) {
    const row = {
      ...template,
      name: String(template.name || "").trim(),
      category: template.category || EMAIL_CATEGORIES[0][0],
      subject_template: String(template.subject_template || "").trim(),
      body_template: String(template.body_template || "").trim(),
      tone: template.tone || "polite",
      active: true,
    };

    if (!row.name || !row.subject_template || !row.body_template) {
      setMessage("Template name, subject, and body are required.");
      return null;
    }

    const { data, error } = await saveEmailTemplate(supabase, row);
    if (error) {
      setMessage(error.message);
      return null;
    }

    setEmailTemplates((prev) => {
      const exists = prev.some((item) => item.id === data.id);
      const next = exists ? prev.map((item) => item.id === data.id ? data : item) : [...prev, data];
      return next.sort((a, b) => `${a.category} ${a.name}`.localeCompare(`${b.category} ${b.name}`));
    });
    setMessage(`Saved email template: ${data.name}`);
    return data;
  }

  async function archiveEmailTemplateRecord(template) {
    if (!window.confirm(`Archive email template "${template.name}"?`)) return;
    const { error } = await archiveEmailTemplate(supabase, template.id);
    if (error) {
      setMessage(error.message);
      return;
    }

    setEmailTemplates((prev) => prev.filter((item) => item.id !== template.id));
    setMessage(`Archived email template: ${template.name}`);
  }

  async function createInviteRecord(invite) {
    if (!activeFamilyId) return;
    const inviteToken = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const row = {
      family_id: activeFamilyId,
      email: invite.email,
      role: invite.role || "parent",
      student_id: invite.student_id || null,
      invite_token: inviteToken,
      expires_at: invite.expires_at || null,
    };
    const { error } = await createFamilyInvite(supabase, row);
    if (error) setMessage(error.message);
    else {
      setMessage("Invite created.");
      await loadData();
    }
  }

  async function deleteInviteRecord(inviteId) {
    const invite = familyInvites.find((entry) => entry.id === inviteId);
    if (!invite) {
      setMessage("Invite not found.");
      return;
    }
    if (invite.accepted_at) {
      setMessage("Accepted invites cannot be deleted.");
      return;
    }
    if (!window.confirm(`Delete the pending invite for ${invite.email}?`)) return;

    const { error } = await deleteFamilyInvite(supabase, inviteId);
    if (error) setMessage(error.message);
    else {
      setMessage("Invite deleted.");
      await loadData();
    }
  }

  async function updateFamilyMemberRoleRecord(memberId, role) {
    const { error } = await updateFamilyMemberRole(supabase, memberId, role);
    if (error) setMessage(error.message);
    else {
      setMessage("Member role updated.");
      await loadData();
    }
  }

  async function removeFamilyMemberRecord(memberId) {
    const { error } = await removeFamilyMember(supabase, memberId);
    if (error) setMessage(error.message);
    else {
      setMessage("Member removed.");
      await loadData();
    }
  }

  async function runFamilyAccessCheck() {
    if (!activeFamilyId || !session?.user?.id) return;

    const testName = `Access check ${Date.now()}`;
    const { data, error } = await supabase
      .from("scholarships")
      .insert({
        family_id: activeFamilyId,
        name: testName,
        priority_score: 0,
        is_school_specific: false,
        eligible_now: false,
        eligible_soon: false,
        renewable: false,
        requires_admission: false,
        stackable: true,
      })
      .select("id,family_id,name")
      .single();

    if (error) {
      setMessage(`Access check failed for ${activeFamily?.name || "active family"} (${activeFamilyId}): ${error.message}`);
      return;
    }

    await supabase.from("scholarships").delete().eq("id", data.id);
    setMessage(`Access check passed for ${activeFamily?.name || "active family"} (${activeFamilyId}) as ${session.user.email}.`);
  }

  async function importCsv(file) {
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeCsvHeader,
      complete: async ({ data, errors, meta }) => {
        if (errors?.length) {
          setMessage(`CSV parse error: ${errors[0].message}`);
          return;
        }

        const parsedRows = data.map((row) => normalizeCsvRow(row, file.name)).filter((row) => row.name);
        if (!parsedRows.length) {
          setMessage(`No scholarship rows found in ${file.name}. Headers: ${(meta?.fields || []).join(", ") || "none"}`);
          return;
        }

        const rows = [];

        for (const row of parsedRows) {
          let schoolId = null;
          if (row.is_school_specific && row.school_name) {
            const school = await ensureSchoolRecord({
              name: row.school_name,
              school_type: row.school_type,
            });
            schoolId = school?.id || null;
          }

          const { school_name, school_type, ...scholarshipRow } = row;
          rows.push({
            ...scholarshipRow,
            family_id: activeFamilyId,
            school_id: schoolId,
          });
        }

        const { data: existingRows, error: existingError } = await supabase
          .from("scholarships")
          .select("id,name")
          .eq("family_id", activeFamilyId)
          .in("name", rows.map((row) => row.name));

        const targetFamily = `${activeFamily?.name || "active family"} (${activeFamilyId.slice(0, 8)})`;
        if (existingError) {
          setMessage(`CSV import failed for ${targetFamily}: ${formatSupabaseError(existingError)}`);
          return;
        }

        const existingByName = new Map((existingRows || []).map((row) => [row.name, row.id]));
        const rowsToInsert = rows.filter((row) => !existingByName.has(row.name));
        const rowsToUpdate = rows.filter((row) => existingByName.has(row.name));

        let insertedCount = 0;
        let updatedCount = 0;

        if (rowsToInsert.length) {
          const { data: insertedRows, error: insertError } = await supabase
            .from("scholarships")
            .insert(rowsToInsert)
            .select("id,name,family_id");
          if (insertError) {
            setMessage(`CSV import failed for ${targetFamily}: ${formatSupabaseError(insertError)}`);
            return;
          }
          insertedCount = insertedRows?.length || rowsToInsert.length;
        }

        for (const row of rowsToUpdate) {
          const { error: updateError } = await supabase
            .from("scholarships")
            .update(row)
            .eq("id", existingByName.get(row.name));
          if (updateError) {
            setMessage(`CSV update failed for ${row.name} in ${targetFamily}: ${formatSupabaseError(updateError)}`);
            return;
          }
          updatedCount += 1;
        }

        {
          setSelectedStudentName("Family");
          setShowAllScholarships(true);
          setFilters((current) => resetScholarshipFilterState(current));
          setActiveNav(NAV_RESEARCH);
        }
        setMessage(`Imported ${insertedCount} new and updated ${updatedCount} scholarships in ${targetFamily}.`);
        await loadData();
      },
    });
  }

  const currentDestination = destinationOf(activeNav);
  const pageCounts = {
    [NAV_SAVED]: visibleTrackers.filter((item) => stageOf(item.application_status).key === "saved").length,
    [NAV_PROGRESS]: visibleTrackers.filter((item) => stageOf(item.application_status).view === "progress").length,
    [NAV_TASKS]: visibleTasks.filter((item) => !item.completed).length,
  };

  if (!isSupabaseConfigured) return <SetupMissing />;
  if (loading) return <Shell><LoadingState label="Loading workspace" description="One moment while we sync your data." /></Shell>;
  if (!session) return <AuthScreen form={authForm} setForm={setAuthForm} mode={authMode} setMode={setAuthMode} invite={pendingInvite} onSubmit={signIn} message={message} />;
  if (!activeFamilyId) return <NoFamilyAccess message={message} onReload={loadData} onSwitchAccount={signOut} onCreateFamily={createFamily} />;

  return (
    <Shell>
      <header className="topbar">
        <div className="topbarBrand">
          <button className="mobileMenuBtn" aria-label="Toggle menu" onClick={() => setSidebarOpen((v) => !v)}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="appIcon"><GraduationCap size={22} /></div>
          <div>
            <p className="eyebrow">{workplaceLabel}</p>
            <h1>{activeFamily?.name || "Scholarship Workplace"}</h1>
          </div>
        </div>
        <div className="mobileContextBar">
          <label className="profileSwitcher">
            <UserRound size={16} />
            <span className="srOnly">Student view</span>
            <select value={selectedStudentName || students[0]?.name || ""} onChange={(event) => selectStudentName(event.target.value)}>
              {students.map((student) => <option key={student.id} value={student.name}>{student.name}</option>)}
            </select>
          </label>
          {families.length > 1 && <FamilySwitcher families={families} activeFamilyId={activeFamilyId} onSelect={setActiveFamilyId} />}
        </div>
        <div className="topbarActions">
          <label className="profileSwitcher topbarStudentPicker">
            <UserRound size={16} />
            <span className="topbarStudentLabel">Student:</span>
            <select value={selectedStudentName || students[0]?.name || ""} onChange={(event) => selectStudentName(event.target.value)}>
              {students.map((student) => <option key={student.id} value={student.name}>{student.name}</option>)}
            </select>
          </label>
          {families.length > 1 && <FamilySwitcher families={families} activeFamilyId={activeFamilyId} onSelect={setActiveFamilyId} />}
          <button className="ghost" onClick={signOut}>Sign out</button>
        </div>
      </header>

      {message && (
        <div className="notice" role="status">
          <span>{message}</span>
          <button type="button" className="linkButton" onClick={() => setMessage("")}>Dismiss</button>
        </div>
      )}

      {sidebarOpen && <div className="sidebarBackdrop" onClick={() => setSidebarOpen(false)} />}

      <div className="layout">
        <aside className={sidebarOpen ? "sidebar open" : "sidebar"}>
          <nav aria-label="Primary">
            {DESTINATIONS.map((destination) => (
              <button
                key={destination.key}
                type="button"
                aria-current={destination.key === currentDestination.key ? "page" : undefined}
                className={destination.key === currentDestination.key ? "active navButton" : "navButton"}
                onClick={() => goTo(destination.pages[0].key)}
              >
                {navIcon(destination.icon)}
                <span className="navLabel">{destination.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="workspace">
          <SectionNav
            label={`${currentDestination.label} sections`}
            items={currentDestination.pages.map((page) => ({ ...page, count: pageCounts[page.key] }))}
            active={activeNav}
            onSelect={goTo}
          />

          {activeNav === NAV_HOME && (
            <HomePage
              student={scholarshipActionStudent}
              trackers={visibleTrackers}
              tasks={visibleTasks}
              onToggleTask={toggleTask}
              onResume={resumeApplication}
              onNavigate={goTo}
            />
          )}

          {activeNav === NAV_TASKS && (
            <TaskList
              student={scholarshipActionStudent}
              trackers={visibleTrackers}
              tasks={filteredTasks}
              scholarshipFilter={taskFilters.scholarship_id}
              setScholarshipFilter={(value) => setTaskFilters((current) => ({ ...current, scholarship_id: value }))}
              onAdd={addTask}
              onToggle={toggleTask}
              onUpdateDueDate={(id, value) => updateTask(id, { due_date: value })}
              onOpenScholarship={openTaskApplication}
            />
          )}

          {[NAV_SAVED, NAV_PROGRESS, NAV_RESULTS].includes(activeNav) && (
            <ScholarshipTracker
              view={{ [NAV_SAVED]: "saved", [NAV_PROGRESS]: "progress", [NAV_RESULTS]: "results" }[activeNav]}
              trackers={visibleTrackers}
              workspaces={workspaces.filter((item) => visibleStudentIds.includes(item.student_id))}
              tasks={visibleTasks}
              focusId={scholarshipFocusId}
              onSetStage={setApplicationStage}
              onToggleTask={toggleTask}
              onAddTask={addTask}
              onSaveNotes={(id, text) => updateWorkspace(id, { submission_notes: text })}
              onFindAnswers={openAnswersForReuse}
              onOpenDetails={openWorkspaceScholarship}
              onOpenAwards={() => goTo(NAV_AWARDS)}
              onBrowse={() => goTo(NAV_RESEARCH)}
            />
          )}

          {activeNav === NAV_RESEARCH && (
            <ScholarshipPage
              scholarships={filteredScholarships}
              totalScholarships={scholarships.length}
              activeFamily={activeFamily}
              students={visibleStudents}
              schools={schools}
              filters={filters}
              setFilters={setFilters}
              onImportCsv={canManageFamily ? importCsv : null}
              selectedStudent={scholarshipActionStudent}
              selectedStudentChosenSchoolId={selectedStudentChosenSchoolId}
              selectedStudentChosenSchoolName={selectedStudentChosenSchool?.school?.name || null}
              familyView={false}
              showAllScholarships={showAllScholarships}
              setShowAllScholarships={toggleShowAllScholarships}
              setScholarshipTargetStudentId={selectScholarshipTargetStudent}
              onSaveToStudent={saveScholarshipForStudent}
              onUnsaveFromStudent={unsaveScholarshipForStudent}
              onMarkNotEligible={markScholarshipNotEligible}
              trackers={visibleTrackers}
              onRemoveScholarship={canManageFamily ? removeScholarship : null}
              onUpdateScholarship={canManageFamily ? updateScholarship : null}
              onCreateScholarship={canManageFamily ? createScholarship : null}
              onStartApplication={(tracker) => setApplicationStage(tracker, "preparing")}
              onOpenApplication={resumeApplication}
            />
          )}

          {activeNav === NAV_LEADS && (
            <LocalLeadsPage
              leads={filteredLeads}
              filters={leadFilters}
              setFilters={setLeadFilters}
              leadForm={leadForm}
              setLeadForm={setLeadForm}
              canManage={canManageFamily}
              onSave={saveLead}
              onUpdate={updateLead}
              onArchive={archiveLead}
              onCopyOutreach={copyOutreachMessage}
              onConvert={convertLeadToScholarship}
            />
          )}

          {activeNav === NAV_EMAILS && (
            <FollowUpEmailsPage
              students={visibleStudents}
              scholarships={scholarships}
              leads={localLeads}
              emailTemplates={emailTemplates}
              generatedEmails={generatedEmails}
              canManage={canManageFamily}
              profileName={currentUserLabel}
              onGenerate={generateAndSaveEmail}
              onSaveTemplate={saveEmailTemplateRecord}
              onArchiveTemplate={archiveEmailTemplateRecord}
              onMarkCopied={markGeneratedEmailCopied}
              onMarkSent={markGeneratedEmailSent}
              onDelete={removeGeneratedEmail}
            />
          )}

          {activeNav === NAV_REPORT && (
            <ScholarshipReportPage
              students={visibleStudents}
              trackers={visibleTrackers}
              tasks={visibleTasks}
              leads={localLeads}
              answers={visibleAnswers}
              snippets={visibleSnippets}
              workspaces={visibleWorkspaces}
            />
          )}

          {activeNav === NAV_ANSWERS && (
            <AnswerBankPage
              answers={filteredAnswers}
              snippets={filteredSnippets}
              snippetDrafts={snippetDrafts}
              students={students}
              scholarships={scholarships}
              serviceLogs={visibleServiceLogs}
              filters={filters}
              setFilters={setFilters}
              snippetFilters={snippetFilters}
              setSnippetFilters={setSnippetFilters}
              answerForm={answerForm}
              setAnswerForm={setAnswerForm}
              onSave={saveAnswer}
              onCopy={markAnswerUsed}
              onDuplicate={(answer) => {
                setAnswerForm({
                  student_id: answer.student_id,
                  scholarship_id: "",
                  question_text: answer.question_text,
                  answer_text: answer.answer_text,
                  tags: (answer.tags || []).join(", "),
                  category: answer.category || "Personal Statement",
                  tone: answer.tone || "",
                  application_year: new Date().getFullYear(),
                  quality_rating: answer.quality_rating || 4,
                });
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onDelete={deleteAnswer}
              onCreateSnippets={createSnippetDrafts}
              onUpdateSnippetDraft={updateSnippetDraft}
              onRemoveSnippetDraft={removeSnippetDraft}
              onSaveSnippetDraft={saveSnippetDraft}
              onCopySnippet={copySnippet}
              onUpdateSnippet={updateSnippet}
              onDeleteSnippet={deleteSnippet}
            />
          )}

          {activeNav === NAV_SERVICE && (
            <ServiceLogPage
              students={students}
              serviceLogs={serviceLogs}
              serviceOrganizations={serviceOrganizations}
              serviceAchievements={serviceAchievements}
              canManage={canManageFamily || activeMembership?.role === "student"}
              onSaveLog={saveServiceLogRecord}
              onUpdateLog={updateServiceLogRecord}
              onDeleteLog={deleteServiceLogRecord}
              onSaveOrganization={saveServiceOrganizationRecord}
              onSaveAchievement={saveServiceAchievementRecord}
              onUpdateAchievement={updateServiceAchievementRecord}
              onDeleteAchievement={deleteServiceAchievementRecord}
            />
          )}

          {activeNav === NAV_AWARDS && (
            <AwardsPage
              students={visibleStudents}
              trackers={visibleTrackers}
              personalAwards={visibleStudentAwards}
              onUpdateTracker={updateTracker}
              onSaveAward={saveStudentAwardRecord}
              onUpdateAward={updateStudentAwardRecord}
              onDeleteAward={deleteStudentAwardRecord}
            />
          )}

          {activeNav === NAV_PROFILES && (
            <StudentProfilesPage
              students={visibleStudents}
              scholarships={scholarships}
              schools={schools}
              trackers={visibleTrackers}
              workspaces={visibleWorkspaces}
              answers={visibleAnswers}
              tasks={visibleTasks}
              leads={localLeads}
              projectIdeas={visibleProjectIdeas}
              studentSchoolOptions={visibleStudentSchoolOptions}
              schoolComparisonNotes={visibleSchoolComparisonNotes}
              selectedStudentChosenSchoolId={selectedStudentChosenSchoolId}
              selectedStudentChosenSchoolName={selectedStudentChosenSchool?.school?.name || null}
              snippets={visibleSnippets}
              serviceLogs={visibleServiceLogs}
              onCopySnippet={copySnippet}
              onUpdate={updateStudent}
              onClearAllProfiles={canManageFamily ? clearAllStudentProfiles : null}
              onSaveScholarship={saveScholarshipForStudent}
              onSaveSchoolOption={saveStudentSchoolOption}
              onDeleteSchoolOption={deleteStudentSchoolOptionRecord}
              onSaveSchoolComparisonNote={saveStudentSchoolComparisonNote}
              onDeleteSchoolComparisonNote={deleteStudentSchoolComparisonNoteRecord}
              onStartWorkspace={createWorkspace}
              onMoveBackToPreparing={updateWorkspace}
              onNavigate={goTo}
            />
          )}

          {activeNav === NAV_FAMILY && (
            <>
              <section className="homeSection accountPanel" aria-labelledby="account-heading">
                <h3 id="account-heading">Your account</h3>
                <p>Signed in as {session.user.email}{activeMembership?.role ? ` · ${activeMembership.role.replace("_", " ")}` : ""}</p>
                <button type="button" onClick={signOut}>Sign out</button>
              </section>
              <section className="homeSection supportPanel" aria-labelledby="support-heading">
                <h3 id="support-heading">Find this useful?</h3>
                <p>This app is free. If it helps your family, you're welcome to buy the developer a coffee. It's entirely optional.</p>
                <a className="buttonLike" href="https://venmo.com/u/Chris-Cox-278" target="_blank" rel="noreferrer noopener">Buy me a coffee on Venmo</a>
              </section>
            <FamilySettingsPage
              family={activeFamily}
              students={students}
              memberships={familyMembers.filter((member) => member.family_id === activeFamilyId)}
              invites={familyInvites}
              canManage={canManageFamily}
              currentUserId={session.user.id}
              currentUserEmail={session.user.email}
              onRefresh={loadData}
              onRunAccessCheck={runFamilyAccessCheck}
              onCreateInvite={createInviteRecord}
              onDeleteInvite={deleteInviteRecord}
              onUpdateRole={updateFamilyMemberRoleRecord}
              onRemoveMember={removeFamilyMemberRecord}
            />
            </>
          )}
        </main>
      </div>
      <nav className="mobileBottomNav" aria-label="Primary mobile navigation">
        {DESTINATIONS.map((destination) => (
          <button
            key={destination.key}
            type="button"
            aria-current={destination.key === currentDestination.key ? "page" : undefined}
            className={destination.key === currentDestination.key ? "active" : ""}
            onClick={() => goTo(destination.pages[0].key)}
          >
            {navIcon(destination.icon)}
            <span>{destination.label}</span>
          </button>
        ))}
      </nav>
    </Shell>
  );
}

function ScholarshipPage({
  scholarships,
  totalScholarships,
  activeFamily,
  students,
  schools,
  filters,
  setFilters,
  onImportCsv,
  selectedStudent,
  selectedStudentChosenSchoolId,
  selectedStudentChosenSchoolName,
  familyView,
  showAllScholarships,
  setShowAllScholarships,
  setScholarshipTargetStudentId,
  onSaveToStudent,
  onUnsaveFromStudent,
  onMarkNotEligible,
  trackers,
  onRemoveScholarship,
  onUpdateScholarship,
  onCreateScholarship,
  onStartApplication,
  onOpenApplication,
}) {
  const actionStudent = selectedStudent;
  const [displayCount, setDisplayCount] = useState(30);
  const [toast, setToast] = useState("");
  const visibleScholarships = scholarships.slice(0, displayCount);
  const scholarshipTagSuggestions = useMemo(
    () => uniqueOptions([...SCHOLARSHIP_COMMON_TAGS, ...scholarships.flatMap((scholarship) => scholarship.tags || [])]),
    [scholarships],
  );

  useEffect(() => setDisplayCount(30), [filters]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <>
      <PageHeader title="Browse scholarships" action={onImportCsv && <CsvUpload onFile={onImportCsv} family={activeFamily} />} />
      <section className="scholarshipToolbar">
        <SearchBox value={filters.query} onChange={(query) => setFilters({ ...filters, query })} placeholder="Search scholarships" />
        {!familyView && (
          <label className="checkLine">
            <input type="checkbox" checked={showAllScholarships} onChange={(event) => setShowAllScholarships(event.target.checked)} />
            Show all, even if {selectedStudent?.name || "the student"} may not qualify
          </label>
        )}
      </section>
      <details className="filters compactFilters">
        <summary>Filters</summary>
        <ScholarshipFilters filters={filters} setFilters={setFilters} scholarships={scholarships} />
        <div className="quickFilters actionQuickFilters">
          <button type="button" className={filters.deadlineWindow === "unknown" ? "active" : ""} onClick={() => setFilters({ ...filters, deadlineWindow: filters.deadlineWindow === "unknown" ? "all" : "unknown" })}>Deadline needs checking</button>
          <button type="button" className={filters.quality === "4" ? "active" : ""} onClick={() => setFilters({ ...filters, quality: filters.quality === "4" ? "all" : "4" })}>High priority</button>
          <button type="button" className={filters.status === "Needs Verification" ? "active" : ""} onClick={() => setFilters({ ...filters, status: filters.status === "Needs Verification" ? "all" : "Needs Verification" })}>Needs verification</button>
        </div>
      </details>
      {onCreateScholarship && <AddScholarshipPanel onCreateScholarship={onCreateScholarship} tagSuggestions={scholarshipTagSuggestions} />}
      <div className="list">
        {visibleScholarships.map((scholarship) => (
          <ScholarshipCard
            key={scholarship.id}
            scholarship={scholarship}
            actionStudent={actionStudent}
            tracker={trackers.find((tracker) => tracker.scholarship_id === scholarship.id && tracker.student_id === actionStudent?.id)}
            selectedStudentChosenSchoolId={selectedStudentChosenSchoolId}
            selectedStudentChosenSchoolName={selectedStudentChosenSchoolName}
            tagSuggestions={scholarshipTagSuggestions}
            onSaveToStudent={onSaveToStudent}
            onUnsaveFromStudent={onUnsaveFromStudent}
            onMarkNotEligible={onMarkNotEligible}
            onStartApplication={onStartApplication}
            onOpenApplication={onOpenApplication}
            onRemoveScholarship={onRemoveScholarship}
            onUpdateScholarship={onUpdateScholarship}
          />
        ))}
        {visibleScholarships.length < scholarships.length && (
          <button className="loadMoreButton" onClick={() => setDisplayCount((count) => count + 30)}>
            Load more scholarships
          </button>
        )}
        {!visibleScholarships.length && (
          <div className="empty">
            <h1>{totalScholarships ? "No scholarships match the current view." : "No scholarships loaded."}</h1>
            <p>{totalScholarships ? "Filters or the selected student profile are hiding the scholarships." : "Add or import scholarships to populate this tab."}</p>
            {totalScholarships > 0 && (
              <div className="actions">
                <button onClick={() => {
                  setShowAllScholarships(true);
                  setFilters((current) => resetScholarshipFilterState(current));
                }}>
                  <Search size={16} /> Show all scholarships
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {toast && <div className="successToast">{toast}</div>}
    </>
  );
}

function ScholarshipEditFields({ draft, setDraft, tagSuggestions, full }) {
  const set = (patch) => setDraft({ ...draft, ...patch });
  return (
    <>
      <input value={draft.name} placeholder="Scholarship name" aria-label="Scholarship name" onChange={(event) => set({ name: event.target.value })} required />
      <input value={draft.link} placeholder="Application link" aria-label="Application link" onChange={(event) => set({ link: event.target.value })} />
      <input value={draft.award} placeholder="Award amount (leave blank if it varies)" aria-label="Award amount" onChange={(event) => set({ award: event.target.value })} />
      <label className="selectLabel">
        <span>Application deadline</span>
        <input type="date" value={draft.deadline} onChange={(event) => set({ deadline: event.target.value })} />
      </label>
      <input value={draft.deadline_raw} placeholder="Deadline as written, if not an exact date" aria-label="Deadline as written" onChange={(event) => set({ deadline_raw: event.target.value })} />
      <textarea className="wide" value={draft.eligibility_reason} placeholder="Who is eligible?" aria-label="Eligibility" onChange={(event) => set({ eligibility_reason: event.target.value })} />
      <textarea className="wide" value={draft.notes} placeholder="Notes" aria-label="Notes" onChange={(event) => set({ notes: event.target.value })} />
      <details className="wide moreFields">
        <summary>More fields</summary>
        <div className="scholarshipEditForm">
          <TagPicker label="Tags" value={draft.tags} placeholder="Search tags" suggestions={tagSuggestions} onChange={(tags) => set({ tags })} />
          <label className="selectLabel">
            <span>Last verified (only if you actually checked)</span>
            <input type="date" value={draft.last_verified_at} onChange={(event) => set({ last_verified_at: event.target.value })} />
          </label>
          <input type="number" min="0" max="5" value={draft.priority_score} placeholder="Priority (0-5)" aria-label="Priority" onChange={(event) => set({ priority_score: event.target.value })} />
          <input value={draft.grade_requirement} placeholder="Grade requirement" aria-label="Grade requirement" onChange={(event) => set({ grade_requirement: event.target.value })} />
          <input value={draft.resident_state} placeholder="Resident state requirement" aria-label="Resident state requirement" onChange={(event) => set({ resident_state: event.target.value })} />
          <label className="checkLine"><input type="checkbox" checked={draft.eligible_now} onChange={(event) => set({ eligible_now: event.target.checked })} /> Looks eligible now</label>
          <label className="checkLine"><input type="checkbox" checked={draft.eligible_soon} onChange={(event) => set({ eligible_soon: event.target.checked })} /> May be eligible soon</label>
          <label className="checkLine"><input type="checkbox" checked={draft.is_school_specific} onChange={(event) => set({ is_school_specific: event.target.checked })} /> School-specific</label>
          {draft.is_school_specific && (
            <>
              <input value={draft.school_name} placeholder="School name" aria-label="School name" onChange={(event) => set({ school_name: event.target.value })} />
              <select value={draft.school_type} aria-label="School type" onChange={(event) => set({ school_type: event.target.value })}>
                <option value="">School type</option>
                {SCHOOL_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <label className="checkLine"><input type="checkbox" checked={draft.requires_admission} onChange={(event) => set({ requires_admission: event.target.checked })} /> Requires admission</label>
              <textarea className="wide" value={draft.school_specific_reason} placeholder="Why it is tied to the school" aria-label="Why it is tied to the school" onChange={(event) => set({ school_specific_reason: event.target.value })} />
            </>
          )}
          {full && (
            <>
              <select value={draft.status} aria-label="Scholarship status" onChange={(event) => set({ status: event.target.value })}>
                <option value="">Status</option>
                {(draft.is_school_specific ? SCHOOL_SPECIFIC_SCHOLARSHIP_STATUSES : ["Open", "Researching", "Submitted", "Offered", "Accepted", "Declined"]).map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <input value={draft.decision_bucket} placeholder="Decision bucket" aria-label="Decision bucket" onChange={(event) => set({ decision_bucket: event.target.value })} />
              <input value={draft.scholarship_category} placeholder="Category" aria-label="Category" onChange={(event) => set({ scholarship_category: event.target.value })} />
              <label className="selectLabel"><span>Admission deadline</span><input type="date" value={draft.admission_deadline} onChange={(event) => set({ admission_deadline: event.target.value })} /></label>
              <label className="selectLabel"><span>Scholarship deadline</span><input type="date" value={draft.scholarship_deadline} onChange={(event) => set({ scholarship_deadline: event.target.value })} /></label>
              <label className="checkLine"><input type="checkbox" checked={draft.stackable} onChange={(event) => set({ stackable: event.target.checked })} /> Stackable</label>
              <label className="checkLine"><input type="checkbox" checked={draft.renewable} onChange={(event) => set({ renewable: event.target.checked })} /> Renewable</label>
              <input type="number" min="0" value={draft.renewable_years} placeholder="Renewable years" aria-label="Renewable years" onChange={(event) => set({ renewable_years: event.target.value })} />
              <input value={draft.estimated_total_value} placeholder="Estimated total value" aria-label="Estimated total value" onChange={(event) => set({ estimated_total_value: event.target.value })} />
              <input type="number" value={draft.age_min} placeholder="Age min" aria-label="Age min" onChange={(event) => set({ age_min: event.target.value })} />
              <input type="number" value={draft.age_max} placeholder="Age max" aria-label="Age max" onChange={(event) => set({ age_max: event.target.value })} />
              <input value={draft.source_file} placeholder="Source" aria-label="Source" onChange={(event) => set({ source_file: event.target.value })} />
            </>
          )}
        </div>
      </details>
    </>
  );
}

function AddScholarshipPanel({ onCreateScholarship, tagSuggestions }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(blankScholarship);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    const ok = await onCreateScholarship(draft);
    setSaving(false);
    if (ok) {
      setDraft(blankScholarship);
      setOpen(false);
    }
  }

  return (
    <details className="filters compactFilters" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary><Plus size={16} /> Add a scholarship</summary>
      <form className="scholarshipEditForm" onSubmit={handleSubmit}>
        <ScholarshipEditFields draft={draft} setDraft={setDraft} tagSuggestions={tagSuggestions} full={false} />
        <div className="actions wide">
          <button className="primary" type="submit" disabled={saving}><Plus size={16} /> Add scholarship</button>
          <button type="button" onClick={() => { setDraft(blankScholarship); setOpen(false); }}>Cancel</button>
        </div>
      </form>
    </details>
  );
}

function ScholarshipCard({
  scholarship,
  actionStudent,
  tracker,
  selectedStudentChosenSchoolId,
  selectedStudentChosenSchoolName,
  tagSuggestions,
  onSaveToStudent,
  onUnsaveFromStudent,
  onMarkNotEligible,
  onStartApplication,
  onOpenApplication,
  onRemoveScholarship,
  onUpdateScholarship,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => scholarshipToDraft(scholarship));
  const schoolSpecificVisibility = getScholarshipSchoolSpecificVisibility(scholarship, selectedStudentChosenSchoolId);
  const stage = tracker ? stageOf(tracker.application_status) : null;
  const deadline = deadlineInfo(scholarship, tracker);
  const verification = verificationInfo(scholarship);
  const eligibility = eligibilityInfo(scholarship, tracker);
  const studentName = actionStudent?.name || "student";

  useEffect(() => setDraft(scholarshipToDraft(scholarship)), [scholarship]);

  function nextAction() {
    if (!actionStudent) return null;
    if (!tracker) {
      return <button type="button" className="primary compactAction" onClick={() => onSaveToStudent(actionStudent.id, scholarship)}><Plus size={16} /> Save for {studentName}</button>;
    }
    if (stage.key === "not_eligible") {
      return <button type="button" className="compactAction" onClick={() => onSaveToStudent(actionStudent.id, scholarship)}>Undo “not eligible”</button>;
    }
    if (stage.key === "saved") {
      return <button type="button" className="primary compactAction" onClick={() => onStartApplication(tracker)}>{nextActionFor("saved")}</button>;
    }
    return <button type="button" className="primary compactAction" onClick={() => onOpenApplication(tracker)}>Open application</button>;
  }

  return (
    <article className="scholarshipItem">
      {editing ? (
        <form
          className="scholarshipEditForm"
          onSubmit={(event) => {
            event.preventDefault();
            onUpdateScholarship(scholarship.id, draft);
            setEditing(false);
          }}
        >
          <ScholarshipEditFields draft={draft} setDraft={setDraft} tagSuggestions={tagSuggestions} full />
          <div className="actions wide">
            <button className="primary" type="submit"><ClipboardCheck size={16} /> Save scholarship</button>
            <button type="button" onClick={() => { setDraft(scholarshipToDraft(scholarship)); setEditing(false); }}>Cancel</button>
          </div>
        </form>
      ) : (
        <>
          <div className="itemTop">
            <div>
              <h3>{scholarship.name}</h3>
              <p>
                {amountLabel(scholarship)} · {deadline.known ? `Due ${deadline.label}${deadline.pastDue ? " (past due)" : ""}` : deadline.label}
                {!deadline.known && deadline.raw ? ` (listed as “${deadline.raw}”)` : ""}
              </p>
            </div>
            {stage && <span className={`badge ${stage.key === "not_eligible" ? "red" : "blue"}`}>{stage.label}</span>}
          </div>
          <div className="badges">
            <span className="badge neutral">{eligibility.label}</span>
            <span className={`badge ${verification.verified ? "green" : "yellow"}`}>{verification.label}</span>
            {scholarship.is_school_specific && <span className="badge blue">{scholarship.school?.name ? `Only for ${scholarship.school.name}` : "School-specific"}</span>}
          </div>
          {scholarship.is_school_specific && selectedStudentChosenSchoolName && schoolSpecificVisibility === "not_usable" && (
            <p className="notes">Not usable unless {studentName} chooses {selectedStudentChosenSchoolName}.</p>
          )}
          {(scholarship.eligibility_reason || scholarship.notes) && (
            <p className="notes clampedNotes">{scholarship.eligibility_reason || scholarship.notes}</p>
          )}
          <div className="cardActionsBar">
            <div className="primaryCardActions">
              {nextAction()}
              {scholarship.link && <a className="secondary compactAction" href={externalUrl(scholarship.link)} target="_blank" rel="noreferrer">Website</a>}
            </div>
            <details className="cardMore">
              <summary>More</summary>
              <div className="secondaryCardActions">
                {actionStudent && !tracker && (
                  <button type="button" className="compactAction" onClick={() => onMarkNotEligible(actionStudent.id, scholarship)}>Not eligible for {studentName}</button>
                )}
                {actionStudent && tracker && stage.key === "saved" && (
                  <button type="button" className="compactAction" onClick={() => onUnsaveFromStudent(actionStudent.id, scholarship)}>Remove from saved</button>
                )}
                {onUpdateScholarship && <button type="button" className="compactAction" onClick={() => setEditing(true)}>Edit scholarship</button>}
                {onRemoveScholarship && <button type="button" className="danger compactAction" onClick={() => onRemoveScholarship(scholarship)}><Trash2 size={16} /> Delete from library</button>}
              </div>
            </details>
          </div>
        </>
      )}
    </article>
  );
}

function TaskTemplateSection({ scholarship, templates, canManage, onUseDefault, onSave, onDelete }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    scholarship_id: scholarship.id,
    title: "",
    description: "",
    task_type: "Confirm Eligibility",
    suggested_due_offset_days: 14,
    sort_order: (templates.length + 1) * 10,
    required: true,
  });

  useEffect(() => {
    setDraft((current) => ({ ...current, scholarship_id: scholarship.id, sort_order: (templates.length + 1) * 10 }));
  }, [scholarship.id, templates.length]);

  return (
    <details className="templateBox" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Task Template ({templates.length})</summary>
      <div className="list">
        {templates.map((template) => (
          <TemplateRow key={template.id} template={template} canManage={canManage} onSave={onSave} onDelete={onDelete} />
        ))}
        {!templates.length && <Empty text="No task template saved for this scholarship yet." />}
      </div>
      {canManage && (
        <div className="templateForm">
          <input value={draft.title} placeholder="Task title" onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          <select value={draft.task_type} onChange={(event) => setDraft({ ...draft, task_type: event.target.value })}>
            {TASK_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
          <input type="number" value={draft.suggested_due_offset_days} onChange={(event) => setDraft({ ...draft, suggested_due_offset_days: Number(event.target.value) || 0 })} />
          <input type="number" value={draft.sort_order} onChange={(event) => setDraft({ ...draft, sort_order: Number(event.target.value) || 0 })} />
          <label className="checkLine"><input type="checkbox" checked={draft.required} onChange={(event) => setDraft({ ...draft, required: event.target.checked })} /> Required</label>
          <textarea className="wide" value={draft.description} placeholder="Description" onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          <div className="actions wide">
            <button onClick={() => onUseDefault(scholarship.id)}><ClipboardCheck size={16} /> Use Default Template</button>
            <button onClick={() => {
              if (!draft.title.trim()) return;
              onSave(draft);
              setDraft({ ...draft, title: "", description: "", sort_order: draft.sort_order + 10 });
            }}><Plus size={16} /> Add Template Task</button>
          </div>
        </div>
      )}
    </details>
  );
}

function TemplateRow({ template, canManage, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(template);

  useEffect(() => setDraft(template), [template]);

  if (editing) {
    return (
      <article className="templateRow">
        <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
        <select value={draft.task_type || ""} onChange={(event) => setDraft({ ...draft, task_type: event.target.value })}>
          {TASK_TYPES.map((type) => <option key={type}>{type}</option>)}
        </select>
        <input type="number" value={draft.suggested_due_offset_days || 0} onChange={(event) => setDraft({ ...draft, suggested_due_offset_days: Number(event.target.value) || 0 })} />
        <input type="number" value={draft.sort_order || 0} onChange={(event) => setDraft({ ...draft, sort_order: Number(event.target.value) || 0 })} />
        <label className="checkLine"><input type="checkbox" checked={Boolean(draft.required)} onChange={(event) => setDraft({ ...draft, required: event.target.checked })} /> Required</label>
        <textarea className="wide" value={draft.description || ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
        <div className="actions wide">
          <button onClick={() => { onSave(draft); setEditing(false); }}><ClipboardCheck size={16} /> Save</button>
          <button onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </article>
    );
  }

  return (
    <article className="templateRow compact">
      <div>
        <strong>{template.sort_order}. {template.title}</strong>
        <p>{template.task_type || "Task"} · {template.suggested_due_offset_days || 0} days before deadline · {template.required ? "Required" : "Optional"}</p>
        {template.description && <p className="notes">{template.description}</p>}
      </div>
      {canManage && (
        <div className="actions">
          <button onClick={() => setEditing(true)}><FileText size={16} /> Edit</button>
          <button className="danger" onClick={() => onDelete(template)}><Trash2 size={16} /> Delete</button>
        </div>
      )}
    </article>
  );
}

function LocalLeadsPage({ leads, filters, setFilters, leadForm, setLeadForm, canManage, onSave, onUpdate, onArchive, onCopyOutreach, onConvert }) {
  return (
    <>
      <PageHeader title="Local Scholarship Leads" action={<button onClick={() => navigator.clipboard?.writeText(OUTREACH_MESSAGE)}><Clipboard size={16} /> Copy outreach template</button>} />
      <LeadFilters filters={filters} setFilters={setFilters} />
      {canManage && (
        <Panel title="Add local lead" icon={<MapPinned size={18} />}>
          <form className="leadForm" onSubmit={onSave}>
            <input value={leadForm.title} placeholder="Lead title" onChange={(event) => setLeadForm({ ...leadForm, title: event.target.value })} required />
            <input value={leadForm.organization_name} placeholder="Organization name" onChange={(event) => setLeadForm({ ...leadForm, organization_name: event.target.value })} required />
            <select value={leadForm.organization_type} onChange={(event) => setLeadForm({ ...leadForm, organization_type: event.target.value })}>
              {ORGANIZATION_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
            <select value={leadForm.lead_status} onChange={(event) => setLeadForm({ ...leadForm, lead_status: event.target.value })}>
              {LEAD_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
            <input value={leadForm.contact_name} placeholder="Contact name" onChange={(event) => setLeadForm({ ...leadForm, contact_name: event.target.value })} />
            <input value={leadForm.contact_email} placeholder="Contact email" onChange={(event) => setLeadForm({ ...leadForm, contact_email: event.target.value })} />
            <input value={leadForm.contact_phone} placeholder="Contact phone" onChange={(event) => setLeadForm({ ...leadForm, contact_phone: event.target.value })} />
            <input value={leadForm.city} placeholder="City" onChange={(event) => setLeadForm({ ...leadForm, city: event.target.value })} />
            <input value={leadForm.county} placeholder="County" onChange={(event) => setLeadForm({ ...leadForm, county: event.target.value })} />
            <input value={leadForm.state} placeholder="State" onChange={(event) => setLeadForm({ ...leadForm, state: event.target.value })} />
            <input value={leadForm.possible_fit_tags} placeholder="Fit tags, comma separated" onChange={(event) => setLeadForm({ ...leadForm, possible_fit_tags: event.target.value })} />
            <input value={leadForm.estimated_award} placeholder="Estimated award" onChange={(event) => setLeadForm({ ...leadForm, estimated_award: event.target.value })} />
            <input value={leadForm.typical_deadline} placeholder="Typical deadline" onChange={(event) => setLeadForm({ ...leadForm, typical_deadline: event.target.value })} />
            <label className="selectLabel">
              <span>Follow-up date</span>
              <input type="date" value={leadForm.follow_up_date} onChange={(event) => setLeadForm({ ...leadForm, follow_up_date: event.target.value })} />
            </label>
            <input value={leadForm.website} placeholder="Website" onChange={(event) => setLeadForm({ ...leadForm, website: event.target.value })} />
            <input value={leadForm.application_link} placeholder="Application link" onChange={(event) => setLeadForm({ ...leadForm, application_link: event.target.value })} />
            <label className="checkLine"><input type="checkbox" checked={leadForm.confirmed_scholarship} onChange={(event) => setLeadForm({ ...leadForm, confirmed_scholarship: event.target.checked })} /> Confirmed scholarship</label>
            <textarea className="wide" value={leadForm.notes} placeholder="Notes" onChange={(event) => setLeadForm({ ...leadForm, notes: event.target.value })} />
            <button className="primary wide">Add lead</button>
          </form>
        </Panel>
      )}
      <div className="list">
        {leads.map((lead) => (
          <LocalLeadCard
            key={lead.id}
            lead={lead}
            canManage={canManage}
            onUpdate={onUpdate}
            onArchive={onArchive}
            onCopyOutreach={onCopyOutreach}
            onConvert={onConvert}
          />
        ))}
        {!leads.length && <Empty text="No local leads match these filters." />}
      </div>
    </>
  );
}

function LocalLeadCard({ lead, canManage, onUpdate, onArchive, onCopyOutreach, onConvert }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => leadToDraft(lead));

  useEffect(() => setDraft(leadToDraft(lead)), [lead]);

  if (editing) {
    return (
      <article className="leadCard">
        <div className="leadForm compact">
          <input value={draft.title} disabled={!canManage} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          <input value={draft.organization_name} disabled={!canManage} onChange={(event) => setDraft({ ...draft, organization_name: event.target.value })} />
          <select value={draft.organization_type || ""} disabled={!canManage} onChange={(event) => setDraft({ ...draft, organization_type: event.target.value })}>
            {ORGANIZATION_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
          <select value={draft.lead_status || "To Check"} disabled={!canManage} onChange={(event) => setDraft({ ...draft, lead_status: event.target.value })}>
            {LEAD_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
          <input value={draft.contact_name || ""} disabled={!canManage} placeholder="Contact name" onChange={(event) => setDraft({ ...draft, contact_name: event.target.value })} />
          <input value={draft.contact_email || ""} disabled={!canManage} placeholder="Contact email" onChange={(event) => setDraft({ ...draft, contact_email: event.target.value })} />
          <input value={draft.contact_phone || ""} disabled={!canManage} placeholder="Contact phone" onChange={(event) => setDraft({ ...draft, contact_phone: event.target.value })} />
          <label className="selectLabel">
            <span>Follow-up date</span>
            <input value={draft.follow_up_date || ""} disabled={!canManage} type="date" onChange={(event) => setDraft({ ...draft, follow_up_date: event.target.value })} />
          </label>
          <input value={draft.possible_fit_tags || ""} disabled={!canManage} placeholder="Fit tags" onChange={(event) => setDraft({ ...draft, possible_fit_tags: event.target.value })} />
          <input value={draft.estimated_award || ""} disabled={!canManage} placeholder="Estimated award" onChange={(event) => setDraft({ ...draft, estimated_award: event.target.value })} />
          <input value={draft.typical_deadline || ""} disabled={!canManage} placeholder="Typical deadline" onChange={(event) => setDraft({ ...draft, typical_deadline: event.target.value })} />
          <input value={draft.website || ""} disabled={!canManage} placeholder="Website" onChange={(event) => setDraft({ ...draft, website: event.target.value })} />
          <input value={draft.application_link || ""} disabled={!canManage} placeholder="Application link" onChange={(event) => setDraft({ ...draft, application_link: event.target.value })} />
          <label className="checkLine"><input type="checkbox" disabled={!canManage} checked={draft.confirmed_scholarship} onChange={(event) => setDraft({ ...draft, confirmed_scholarship: event.target.checked })} /> Confirmed scholarship</label>
          <textarea className="wide" value={draft.notes || ""} placeholder="Notes" onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
        </div>
        <div className="actions">
          <button onClick={() => {
            onUpdate(lead.id, normalizeLeadForm(draft));
            setEditing(false);
          }}><ClipboardCheck size={16} /> Save lead</button>
          <button onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </article>
    );
  }

  return (
    <article className="leadCard">
      <div className="itemTop">
        <div>
          <p className="eyebrow">{lead.organization_type || "Local lead"} · {lead.city || lead.county || lead.state || "Iowa"}</p>
          <h3>{lead.title}</h3>
          <p>{lead.organization_name} · Follow up {lead.follow_up_date || "not set"}</p>
        </div>
        <Badge tone={lead.confirmed_scholarship || lead.lead_status === "Confirmed Opportunity" ? "green" : "yellow"}>{lead.lead_status}</Badge>
      </div>
      <TagList tags={lead.possible_fit_tags || []} />
      {lead.notes && <p className="notes">{lead.notes}</p>}
      <div className="copyMeta">
        {lead.contact_name && <span>{lead.contact_name}</span>}
        {lead.contact_email && <span>{lead.contact_email}</span>}
        {lead.contact_phone && <span>{lead.contact_phone}</span>}
        {lead.estimated_award && <span>{lead.estimated_award}</span>}
        {lead.typical_deadline && <span>{lead.typical_deadline}</span>}
      </div>
      <div className="actions">
        {lead.website && <a className="secondary" href={externalUrl(lead.website)} target="_blank" rel="noreferrer">Website</a>}
        {lead.application_link && <a className="secondary" href={externalUrl(lead.application_link)} target="_blank" rel="noreferrer">Application</a>}
        <button className="primary" onClick={() => onCopyOutreach(lead)}><Clipboard size={16} /> Copy outreach</button>
        <button onClick={() => setEditing(true)}><FileText size={16} /> Edit</button>
        {canManage && <button onClick={() => onConvert(lead)}><Plus size={16} /> Convert to scholarship</button>}
        {canManage && <button className="danger" onClick={() => window.confirm("Archive this local lead?") && onArchive(lead)}><Trash2 size={16} /> Archive</button>}
      </div>
    </article>
  );
}

function QuestionEditor({ workspace, question, snippets, onUpdate, onFinalize, onInsertSnippet }) {
  const matchingSnippets = snippets.filter((snippet) => {
    const blob = `${snippet.title} ${snippet.snippet_text} ${snippet.category} ${snippet.topic} ${snippet.theme} ${(snippet.tags || []).join(" ")}`.toLowerCase();
    const prompt = `${question.question_text} ${question.category} ${(question.tags || []).join(" ")}`.toLowerCase();
    return !prompt.trim() || prompt.split(/\s+/).some((word) => word.length > 4 && blob.includes(word));
  }).slice(0, 6);

  return (
    <article className="questionBox">
      <input value={question.question_text} onChange={(event) => onUpdate(question.id, { question_text: event.target.value })} />
      <div className="trackerControls">
        <select value={question.category || ""} onChange={(event) => onUpdate(question.id, { category: event.target.value })}>
          <option value="">Category</option>
          {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
        </select>
        <input value={(question.tags || []).join(", ")} placeholder="tags" onChange={(event) => onUpdate(question.id, { tags: parseTags(event.target.value) })} />
        <label className="checkLine"><input type="checkbox" checked={question.completed} onChange={(event) => onUpdate(question.id, { completed: event.target.checked })} /> Complete</label>
      </div>
      <textarea value={question.draft_answer || ""} placeholder="Draft answer" onChange={(event) => onUpdate(question.id, { draft_answer: event.target.value })} />
      <details className="snippetPicker">
        <summary>Reusable snippets</summary>
        <div className="list">
          {(matchingSnippets.length ? matchingSnippets : snippets.slice(0, 6)).map((snippet) => (
            <article className="snippetMini" key={snippet.id}>
              <div>
                <strong>{snippet.title}</strong>
                <p>{snippet.category || "uncategorized"} · {snippet.word_count} words</p>
              </div>
              <button onClick={() => onInsertSnippet(question, snippet)}><Plus size={16} /> Insert into draft answer</button>
            </article>
          ))}
          {!snippets.length && <Empty text="No reusable snippets saved for this student yet." />}
        </div>
      </details>
      <textarea value={question.final_answer || ""} placeholder="Final answer" onChange={(event) => onUpdate(question.id, { final_answer: event.target.value })} />
      <button onClick={() => onFinalize(workspace, question)}><ClipboardCheck size={16} /> Finalize and save to answer bank</button>
    </article>
  );
}

function AnswerBankPage({
  answers,
  snippets,
  snippetDrafts,
  students,
  scholarships,
  serviceLogs,
  filters,
  setFilters,
  snippetFilters,
  setSnippetFilters,
  answerForm,
  setAnswerForm,
  onSave,
  onCopy,
  onDuplicate,
  onDelete,
  onCreateSnippets,
  onUpdateSnippetDraft,
  onRemoveSnippetDraft,
  onSaveSnippetDraft,
  onCopySnippet,
  onUpdateSnippet,
  onDeleteSnippet,
}) {
  const selectedStudentId = answerForm.student_id || students[0]?.id || "";
  const selectedStudent = students.find((student) => student.id === selectedStudentId) || students[0] || null;
  const selectedStudentServiceLogs = serviceLogs.filter((log) => log.student_id === selectedStudentId);
  const selectedStudentServiceSummary = summarizeServiceLogsForStudent(selectedStudent, selectedStudentServiceLogs);
  const snippetTopicOptions = useMemo(() => uniqueOptions([
    ...snippets.map((snippet) => snippet.topic || ""),
    ...snippetDrafts.map((draft) => draft.topic || ""),
    ...["Military family background", "Leadership", "Service", "Resilience", "Future goals", "Career interest", "Character", "General"],
  ]), [snippetDrafts, snippets]);
  const groupedSnippets = useMemo(() => groupSnippetsByTopic(snippets), [snippets]);

  function useStarterQuestion(starter) {
    const studentId = answerForm.student_id || selectedStudent?.id || "";
    setAnswerForm({
      ...answerForm,
      student_id: studentId,
      scholarship_id: "",
      question_text: starter.prompt,
      answer_text: "",
      tags: starter.tag,
      category: starter.category,
      tone: starter.tone,
      application_year: new Date().getFullYear(),
      quality_rating: 4,
    });
    requestAnimationFrame(() => {
      document.querySelector(".answerForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const [formOpen, setFormOpen] = useState(false);
  useEffect(() => {
    if (answerForm.question_text || answerForm.answer_text) setFormOpen(true);
  }, [answerForm.question_text, answerForm.answer_text]);

  return (
    <>
      <PageHeader title="My answers" action={<button onClick={() => exportAnswers(answers)}><Download size={16} /> Export CSV</button>} />
      <AnswerFilters filters={filters} setFilters={setFilters} />
      <div className="list">
        {answers.map((answer) => <AnswerCard key={answer.id} answer={answer} onCopy={onCopy} onDuplicate={onDuplicate} onDelete={onDelete} onCreateSnippets={onCreateSnippets} />)}
        {!answers.length && <Empty text="No saved answers match this search. Add one below." />}
      </div>
      <details className="filters compactFilters" open={formOpen} onToggle={(event) => setFormOpen(event.currentTarget.open)}>
        <summary><Plus size={16} /> Add an answer</summary>
        <form className="answerForm" onSubmit={onSave}>
          {students.length > 1 && (
            <select value={answerForm.student_id} aria-label="Student" onChange={(event) => setAnswerForm({ ...answerForm, student_id: event.target.value })} required>
              <option value="">Student</option>
              {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
            </select>
          )}
          <select value={answerForm.scholarship_id} aria-label="Scholarship (optional)" onChange={(event) => setAnswerForm({ ...answerForm, scholarship_id: event.target.value })}>
            <option value="">Scholarship (optional)</option>
            {scholarships.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <textarea className="wide" value={answerForm.question_text} placeholder="The question or prompt" aria-label="Question or prompt" onChange={(event) => setAnswerForm({ ...answerForm, question_text: event.target.value })} required />
          <textarea className="wide copyArea" value={answerForm.answer_text} placeholder="Your answer" aria-label="Your answer" onChange={(event) => setAnswerForm({ ...answerForm, answer_text: event.target.value })} required />
          <details className="wide moreFields">
            <summary>More fields</summary>
            <div className="answerForm">
              <select value={answerForm.category} aria-label="Category" onChange={(event) => setAnswerForm({ ...answerForm, category: event.target.value })}>
                {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
              <input value={answerForm.tags} placeholder="Tags separated by commas" aria-label="Tags" onChange={(event) => setAnswerForm({ ...answerForm, tags: event.target.value })} />
              <input value={answerForm.tone} placeholder="Tone, e.g. sincere, confident" aria-label="Tone" onChange={(event) => setAnswerForm({ ...answerForm, tone: event.target.value })} />
              <input type="number" value={answerForm.application_year} aria-label="Application year" onChange={(event) => setAnswerForm({ ...answerForm, application_year: event.target.value })} />
              <input type="number" min="1" max="5" value={answerForm.quality_rating} aria-label="Quality rating (1-5)" onChange={(event) => setAnswerForm({ ...answerForm, quality_rating: event.target.value })} />
            </div>
          </details>
          <button className="primary wide">Save answer</button>
        </form>
      </details>
      <details className="filters compactFilters optionalHelpers">
        <summary>Optional helpers: starter prompts and suggested snippets</summary>
        <p className="helperText">Everything in here is suggested or auto-generated text. Your own saved answers are the ones listed above.</p>
        <ServiceFactsPanel student={selectedStudent} summary={selectedStudentServiceSummary} serviceLogs={selectedStudentServiceLogs} />
        <StarterQuestionsPanel
          starters={STARTER_QUESTIONS}
          students={students}
          selectedStudent={selectedStudent}
          answers={answers}
          onSelectStudent={(studentId) => setAnswerForm({ ...answerForm, student_id: studentId })}
          onUse={useStarterQuestion}
        />
        <SnippetReviewPanel
          drafts={snippetDrafts}
          onUpdate={onUpdateSnippetDraft}
          onRemove={onRemoveSnippetDraft}
          onSave={onSaveSnippetDraft}
        />
        <Panel title="Reusable snippets" icon={<Clipboard size={18} />}>
          <SnippetFilters filters={snippetFilters} setFilters={setSnippetFilters} students={students} />
          <datalist id="snippet-topic-options">{snippetTopicOptions.map((topic) => <option key={topic} value={topic} />)}</datalist>
          <div className="snippetTopicGroups">
            {groupedSnippets.map(([topic, topicSnippets]) => (
              <section className="snippetTopicGroup" key={topic}>
                <div className="sectionHeader snippetTopicHeader">
                  <h3>{topic}</h3>
                  <span>{topicSnippets.length} snippet{topicSnippets.length === 1 ? "" : "s"}</span>
                </div>
                <div className="list">
                  {topicSnippets.map((snippet) => (
                    <SnippetCard key={snippet.id} snippet={snippet} onCopy={onCopySnippet} onUpdate={onUpdateSnippet} onDelete={onDeleteSnippet} />
                  ))}
                </div>
              </section>
            ))}
            {!snippets.length && <Empty text="No reusable snippets match these filters." />}
          </div>
        </Panel>
      </details>
    </>
  );
}

function StarterQuestionsPanel({ starters, students, selectedStudent, answers, onSelectStudent, onUse }) {
  const selectedStudentId = selectedStudent?.id || "";
  return (
    <Panel title="Starter questions" icon={<Lightbulb size={18} />}>
      <div className="starterHeader">
        <div>
          <p className="eyebrow">Pregenerated questions</p>
          <p className="helperText">Use these five reusable prompts to build a first answer bank for each student.</p>
        </div>
        {students.length > 1 && (
          <label className="starterStudentSelect">
            <UserRound size={16} />
            <select value={selectedStudentId} onChange={(event) => onSelectStudent(event.target.value)}>
              {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="starterQuestionGrid">
        {starters.map((starter, index) => {
          const started = answers.some((answer) => (
            answer.student_id === selectedStudentId &&
            ((answer.tags || []).includes(starter.tag) || String(answer.question_text || "").toLowerCase().includes(starter.title.split("/")[0].trim().toLowerCase()))
          ));
          return (
            <article className="starterQuestionCard" key={starter.tag}>
              <div className="starterQuestionTop">
                <span className="starterNumber">{index + 1}</span>
                <Badge tone={started ? "green" : "blue"}>{started ? "Started" : starter.tag}</Badge>
              </div>
              <h3>{starter.title}</h3>
              <p><strong>Why:</strong> {starter.why}</p>
              <p><strong>Include:</strong> {starter.include}</p>
              <p><strong>Use:</strong> {starter.use}</p>
              <div className="actions">
                <button className="primary" disabled={!selectedStudentId} onClick={() => onUse(starter)}><PenLine size={16} /> Draft answer</button>
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}

function SnippetReviewPanel({ drafts, onUpdate, onRemove, onSave }) {
  if (!drafts.length) return null;

  return (
    <Panel title="Review suggested snippets" icon={<ClipboardCheck size={18} />}>
      <div className="snippetGrid">
        {drafts.map((draft) => (
          <article className="snippetEditor" key={draft.local_id}>
            <input value={draft.title} onChange={(event) => onUpdate(draft.local_id, { title: event.target.value })} />
            <textarea value={draft.snippet_text} onChange={(event) => onUpdate(draft.local_id, { snippet_text: event.target.value })} />
            <div className="snippetFields">
              <select value={draft.category || ""} onChange={(event) => onUpdate(draft.local_id, { category: event.target.value })}>
                {SNIPPET_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
              <label className="selectLabel">
                <span>Topic</span>
                <input value={draft.topic || ""} list="snippet-topic-options" placeholder="Leadership, service, family" onChange={(event) => onUpdate(draft.local_id, { topic: event.target.value })} />
              </label>
              <input value={(draft.tags || []).join(", ")} placeholder="Tags" onChange={(event) => onUpdate(draft.local_id, { tags: parseTags(event.target.value) })} />
              <input value={draft.theme || ""} placeholder="Theme" onChange={(event) => onUpdate(draft.local_id, { theme: event.target.value })} />
              <input value={draft.tone || ""} placeholder="Tone" onChange={(event) => onUpdate(draft.local_id, { tone: event.target.value })} />
            </div>
            <label className="checkLine"><input type="checkbox" checked={draft.reusable} onChange={(event) => onUpdate(draft.local_id, { reusable: event.target.checked })} /> Reusable</label>
            <div className="copyMeta"><span>{draft.word_count} words</span><span>{draft.character_count} characters</span></div>
            <div className="actions">
              <button onClick={() => onSave(draft)}><ClipboardCheck size={16} /> Approve and save</button>
              <button className="danger" onClick={() => onRemove(draft.local_id)}><Trash2 size={16} /> Delete suggestion</button>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function SnippetCard({ snippet, onCopy, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => ({
    title: snippet.title,
    snippet_text: snippet.snippet_text,
    category: snippet.category || "personal_statement",
    topic: snippet.topic || "",
    tags: (snippet.tags || []).join(", "),
    theme: snippet.theme || "",
    tone: snippet.tone || "",
    reusable: snippet.reusable,
  }));

  useEffect(() => {
    setDraft({
      title: snippet.title,
      snippet_text: snippet.snippet_text,
      category: snippet.category || "personal_statement",
      topic: snippet.topic || "",
      tags: (snippet.tags || []).join(", "),
      theme: snippet.theme || "",
      tone: snippet.tone || "",
      reusable: snippet.reusable,
    });
  }, [snippet]);

  return (
    <article className="answerCard">
      <div className="itemTop">
        <div>
          <p className="eyebrow">{snippet.student?.name} · {snippet.category || "uncategorized"} · {snippet.topic || "No topic"}</p>
          <h3>{snippet.title}</h3>
          <p>{snippet.word_count} words · {snippet.tone || "tone unset"} · {snippet.reusable ? "Reusable" : "Reference only"}</p>
        </div>
        <div className="badgeStack">
          <Badge tone="blue">{snippet.topic || "No topic"}</Badge>
          <Badge tone={snippet.reusable ? "green" : "neutral"}>{snippet.reusable ? "Reusable" : "Not reusable"}</Badge>
        </div>
      </div>
      {editing ? (
        <div className="snippetEditor">
          <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          <textarea value={draft.snippet_text} onChange={(event) => setDraft({ ...draft, snippet_text: event.target.value })} />
          <div className="snippetFields">
            <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
              {SNIPPET_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
            </select>
            <label className="selectLabel">
              <span>Topic</span>
              <input value={draft.topic} list="snippet-topic-options" placeholder="Leadership, service, family" onChange={(event) => setDraft({ ...draft, topic: event.target.value })} />
            </label>
            <input value={draft.tags} placeholder="Tags" onChange={(event) => setDraft({ ...draft, tags: event.target.value })} />
            <input value={draft.theme} placeholder="Theme" onChange={(event) => setDraft({ ...draft, theme: event.target.value })} />
            <input value={draft.tone} placeholder="Tone" onChange={(event) => setDraft({ ...draft, tone: event.target.value })} />
          </div>
          <label className="checkLine"><input type="checkbox" checked={draft.reusable} onChange={(event) => setDraft({ ...draft, reusable: event.target.checked })} /> Reusable</label>
          <div className="actions">
            <button onClick={() => {
              onUpdate(snippet.id, { ...draft, tags: parseTags(draft.tags) });
              setEditing(false);
            }}><ClipboardCheck size={16} /> Save edits</button>
            <button onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <p className="notes">{snippet.snippet_text}</p>
          <TagList tags={snippet.tags} />
          <div className="actions">
            <button onClick={() => onCopy(snippet)}><Clipboard size={16} /> Copy snippet</button>
            <button onClick={() => setEditing(true)}><FileText size={16} /> Edit</button>
            <button className="danger" onClick={() => onDelete(snippet)}><Trash2 size={16} /> Delete</button>
          </div>
        </>
      )}
    </article>
  );
}

function AnswerCard({ answer, onCopy, onDuplicate, onDelete, onCreateSnippets }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="answerCard">
      <div className="itemTop">
        <div>
          <p className="eyebrow">{answer.student?.name} · {answer.category || "Uncategorized"} · Used in {answer.usage_count || (answer.last_used_at ? 1 : 0)} applications</p>
          <h3>{answer.question_text}</h3>
          <p>{answer.scholarship?.name || "No scholarship"} · {answer.word_count} words · Last used {answer.last_used_at || "never"}</p>
        </div>
        <Badge tone="yellow">Quality {answer.quality_rating || "-"}</Badge>
      </div>
      <p className="notes">{open ? answer.answer_text : `${answer.answer_text.slice(0, 220)}${answer.answer_text.length > 220 ? "..." : ""}`}</p>
      <TagList tags={answer.tags} />
      <div className="actions">
        <button className="primary" onClick={() => onCopy(answer)}><Clipboard size={16} /> Copy</button>
        <button onClick={() => onDuplicate(answer)}><Plus size={16} /> Insert</button>
        <button onClick={() => setOpen(!open)}>{open ? "Close" : "Edit"}</button>
      </div>
      {open && (
        <div className="copyBox">
          <div className="copyMeta">
            <span>{answer.word_count} words</span>
            <span>{answer.character_count} characters</span>
          </div>
          <textarea className="copyArea" readOnly value={answer.answer_text} onFocus={(event) => event.target.select()} />
          <div className="actions">
            <button onClick={() => onCreateSnippets(answer)}><ClipboardCheck size={16} /> Save Snippets</button>
            <button className="danger" onClick={() => window.confirm("Delete this saved answer?") && onDelete(answer)}><Trash2 size={16} /> Delete</button>
          </div>
        </div>
      )}
    </article>
  );
}

function StudentProfilesPage({
  students,
  scholarships,
  schools,
  trackers,
  workspaces,
  answers,
  tasks,
  leads,
  projectIdeas,
  studentSchoolOptions,
  schoolComparisonNotes,
  serviceLogs,
  selectedStudentChosenSchoolId,
  selectedStudentChosenSchoolName,
  snippets,
  onCopySnippet,
  onUpdate,
  onClearAllProfiles,
  onSaveScholarship,
  onSaveSchoolOption,
  onDeleteSchoolOption,
  onSaveSchoolComparisonNote,
  onDeleteSchoolComparisonNote,
  onStartWorkspace,
  onMoveBackToPreparing,
  onNavigate,
}) {
  return (
    <>
      <PageHeader title="Student Profiles" />
      <div className="list studentProfileList">
        {students.map((student) => (
          <StudentProfileCard
            key={student.id}
            student={student}
            serviceLogs={serviceLogs.filter((item) => item.student_id === student.id)}
            onUpdate={onUpdate}
            onNavigate={onNavigate}
            schoolOptionsSection={
              <SchoolOptionsSection
                student={student}
                schools={schools}
                scholarships={scholarships}
                trackers={trackers}
                schoolOptions={studentSchoolOptions.filter((item) => item.student_id === student.id)}
                comparisonNotes={schoolComparisonNotes.filter((item) => item.student_id === student.id)}
                selectedStudentChosenSchoolId={selectedStudentChosenSchoolId}
                selectedStudentChosenSchoolName={selectedStudentChosenSchoolName}
                onSaveSchoolOption={onSaveSchoolOption}
                onDeleteSchoolOption={onDeleteSchoolOption}
                onSaveSchoolComparisonNote={onSaveSchoolComparisonNote}
                onDeleteSchoolComparisonNote={onDeleteSchoolComparisonNote}
              />
            }
          >
            <details className="filters compactFilters">
              <summary>Portfolio summary (generated text, optional)</summary>
            <PortfolioSummarySection
              student={student}
              scholarships={scholarships}
              trackers={trackers.filter((tracker) => tracker.student_id === student.id)}
              workspaces={workspaces.filter((workspace) => workspace.student_id === student.id)}
              answers={answers.filter((answer) => answer.student_id === student.id)}
              snippets={(snippets || []).filter((snippet) => snippet.student_id === student.id)}
              tasks={tasks.filter((task) => task.student_id === student.id)}
              leads={leads}
              projectIdeas={projectIdeas.filter((idea) => idea.student_id === student.id)}
              schoolOptions={studentSchoolOptions.filter((option) => option.student_id === student.id)}
              comparisonNotes={schoolComparisonNotes.filter((note) => note.student_id === student.id)}
            />
            </details>
          </StudentProfileCard>
        ))}
      </div>
      {onClearAllProfiles && (
        <details className="filters compactFilters">
          <summary>Admin tools</summary>
          <div className="filterBody">
            <button className="danger" onClick={onClearAllProfiles}>Clear all profile fields</button>
          </div>
        </details>
      )}
    </>
  );
}

function StudentProfileCard({ student, serviceLogs, onUpdate, onNavigate, children, schoolOptionsSection }) {
  const [draft, setDraft] = useState(() => loadStudentDraft(student));
  const [dirty, setDirty] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const serviceSummary = useMemo(() => summarizeServiceLogsForStudent(student, serviceLogs), [student, serviceLogs]);

  useEffect(() => {
    setDraft(loadStudentDraft(student));
    setDirty(false);
  }, [student]);

  function updateField(key, value) {
    setDraft((current) => {
      return { ...current, [key]: value };
    });
    setDirty(true);
  }

  async function saveProfile() {
    const normalized = {
      residence_state: draft.residence_state || null,
      grade_level: draft.grade_level || null,
      graduation_year: draft.graduation_year === "" ? null : Number(draft.graduation_year) || null,
      gpa: draft.gpa === "" ? null : Number(draft.gpa),
      interests: draft.interests || null,
      activities: draft.activities || null,
      clubs: draft.clubs || null,
      sports: draft.sports || null,
      volunteer_hours: draft.volunteer_hours === "" ? null : Number(draft.volunteer_hours) || null,
      volunteer_work: draft.volunteer_work || null,
      church_involvement: draft.church_involvement || null,
      awards: draft.awards || null,
      work_experience: draft.work_experience || null,
      career_interests: draft.career_interests || null,
      military_family_background: draft.military_family_background || null,
      notes: draft.notes || null,
    };

    await onUpdate(student.id, normalized);
    const nextDraft = { ...draft, ...normalized };
    setDraft(nextDraft);
    setDirty(false);
  }

  return (
    <article className="trackerItem studentProfileCard">
      <div className="studentProfileHeader">
        <div>
          <h3>{student.name}</h3>
          <p>{draft.residence_state || "Residence state not set"} · {draft.grade_level || "Grade not set"} · {draft.graduation_year || "Graduation year not set"}</p>
        </div>
        <button className="primary saveProfileButton" onClick={saveProfile} disabled={!dirty}>
          <ClipboardCheck size={16} /> Save profile
        </button>
      </div>
      <div className="profileTabs">
        <button className={activeTab === "profile" ? "active" : ""} onClick={() => setActiveTab("profile")}>Profile</button>
        <button className={activeTab === "schoolOptions" ? "active" : ""} onClick={() => setActiveTab("schoolOptions")}>School Options</button>
      </div>
      <div className="profileSectionGrid">
        {[
          ["Basic Info", [["residence_state", "Residence state"], ["grade_level", "Grade level"], ["graduation_year", "Graduation year"], ["gpa", "GPA"]]],
          ["Interests", [["interests", "Interests"], ["career_interests", "Career interests"], ["awards", "Awards"]]],
          ["Activities", [["activities", "Activities"], ["clubs", "Clubs"], ["sports", "Sports"], ["church_involvement", "Church involvement"]]],
          ["Work/Volunteer", [["volunteer_hours", "Volunteer hours"], ["volunteer_work", "Volunteer work"], ["work_experience", "Work experience"], ["military_family_background", "Military family background"]]],
          ["Notes", [["notes", "Notes"]]],
        ].map(([sectionTitle, fields]) => (
          <details className="profileSectionCard" key={sectionTitle} open={sectionTitle === "Basic Info"}>
            <summary><h4>{sectionTitle}</h4><span>Edit</span></summary>
            <div className="profileGrid">
              {fields.map(([key, label]) => (
                <label key={key}>
                  <span>{label}</span>
                  {key === "residence_state" ? (
                    <input value={draft[key] || ""} onChange={(event) => updateField(key, event.target.value)} />
                  ) : key === "grade_level" ? (
                    <select value={draft[key] || ""} onChange={(event) => updateField(key, event.target.value || null)}>
                      <option value="">Select grade level</option>
                      {GRADE_LEVEL_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : key === "graduation_year" ? (
                    <input type="number" value={draft[key] || ""} onChange={(event) => updateField(key, event.target.value)} />
                  ) : key === "gpa" ? (
                    <input type="number" step="0.01" min="0" max="5" value={draft[key] || ""} onChange={(event) => updateField(key, event.target.value)} />
                  ) : key === "volunteer_hours" ? (
                    <div className="profileLinkedField">
                      <input type="number" min="0" value={draft[key] || ""} onChange={(event) => updateField(key, event.target.value)} />
                      <div className="linkedFieldMeta">
                        <span>Service Log total: {serviceSummary.totalHoursText}</span>
                        <button type="button" className="ghost linkButton" onClick={() => {
                          updateField(key, String(serviceSummary.totalHours ?? 0));
                        }}>
                          Use Service Log total
                        </button>
                      </div>
                    </div>
                  ) : (
                    <textarea rows={3} value={draft[key] || ""} onChange={(event) => updateField(key, event.target.value)} />
                  )}
                </label>
              ))}
            </div>
          </details>
        ))}
      </div>
      <section className="studentProfileBlock serviceSummaryCard">
        <div className="sectionHeader">
          <h4><Gift size={16} /> Service Log</h4>
          <button className="sectionHeaderCount" onClick={() => onNavigate?.(NAV_SERVICE)}>Open →</button>
        </div>
        <div className="serviceSummaryStats">
          <div><span>Total hours</span><strong>{serviceSummary.totalHoursText}</strong></div>
          <div><span>Leadership hours</span><strong>{serviceSummary.leadershipHoursText}</strong></div>
          <div><span>Top category</span><strong>{serviceSummary.topCategory || "None yet"}</strong></div>
          <div><span>Top organization</span><strong>{serviceSummary.topOrganization || "None yet"}</strong></div>
        </div>
        <div className="serviceHighlightList">
          {serviceSummary.recentHighlights.slice(0, 3).map((highlight) => (
            <article className="serviceHighlight" key={highlight.key}>
              <strong>{highlight.title}</strong>
              <p>{highlight.summary}</p>
            </article>
          ))}
          {!serviceSummary.recentHighlights.length && <Empty text="No service log entries yet." />}
        </div>
      </section>
      <div className="profileSaveBar">
        <span>{dirty ? "Unsaved changes" : "Profile saved"}</span>
        <button className="primary saveProfileButton" onClick={saveProfile} disabled={!dirty}>
          <ClipboardCheck size={16} /> Save profile
        </button>
      </div>
      <div className="studentProfileContent">
        {activeTab === "profile" ? children : schoolOptionsSection}
      </div>
    </article>
  );
}

function ServiceLogPage({
  students,
  serviceLogs,
  serviceOrganizations,
  serviceAchievements,
  canManage,
  onSaveLog,
  onUpdateLog,
  onDeleteLog,
  onSaveOrganization,
  onSaveAchievement,
  onUpdateAchievement,
  onDeleteAchievement,
}) {
  const today = format(new Date(), "yyyy-MM-dd");
  const defaultStudentId = students[0]?.id || "";
  const [filters, setFilters] = useState({
    student_id: "all",
    year: "all",
    category: "all",
    organization: "",
    tag: "",
    leadership_role: "all",
    start_date: "",
    end_date: "",
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);
  const [draft, setDraft] = useState(() => blankServiceLogDraft(defaultStudentId, today));
  const [editingAchievementId, setEditingAchievementId] = useState(null);
  const [achievementDraft, setAchievementDraft] = useState(() => blankServiceAchievementDraft(defaultStudentId, null, today));

  useEffect(() => {
    setDraft((current) => ({
      ...current,
      student_id: students.some((student) => student.id === current.student_id) ? current.student_id : defaultStudentId,
    }));
    setAchievementDraft((current) => ({
      ...current,
      student_id: students.some((student) => student.id === current.student_id) ? current.student_id : defaultStudentId,
    }));
  }, [defaultStudentId, students]);

  const recentOrganizations = useMemo(() => uniqueOptions([
    ...serviceOrganizations.map((item) => item.name),
    ...serviceLogs.map((item) => item.organization_name),
  ]), [serviceLogs, serviceOrganizations]);
  const categoryOptions = useMemo(() => uniqueOptions([...SERVICE_CATEGORIES, ...serviceLogs.map((item) => item.category).filter(Boolean)]), [serviceLogs]);
  const yearOptions = useMemo(() => uniqueOptions(serviceLogs.map((item) => String(new Date(item.activity_date).getFullYear()))), [serviceLogs]);
  const filteredLogs = useMemo(() => filterServiceLogs(serviceLogs, filters), [filters, serviceLogs]);
  const summary = useMemo(() => summarizeServiceFamily(serviceLogs, students), [serviceLogs, students]);
  const latestLogs = [...filteredLogs].slice(0, 12);
  const topAchievements = [...serviceAchievements].slice(0, 6);
  const selectedStudent = students.find((student) => student.id === achievementDraft.student_id) || students[0] || null;
  const latestLogForAchievement = selectedStudent ? serviceLogs.find((item) => item.student_id === selectedStudent.id) || null : null;

  useEffect(() => {
    if (!selectedStudent) return;
    setAchievementDraft((current) => (
      current.student_id === selectedStudent.id ? current : { ...current, student_id: selectedStudent.id }
    ));
  }, [selectedStudent]);

  function openNewLog(prefill = {}) {
    setEditingLogId(null);
    setDraft({
      ...blankServiceLogDraft(defaultStudentId, today),
      ...prefill,
    });
    setSheetOpen(true);
  }

  function editLog(log) {
    setEditingLogId(log.id);
    setDraft(serviceLogToDraft(log));
    setSheetOpen(true);
  }

  function duplicateLog(log) {
    openNewLog({
      ...serviceLogToDraft(log),
      activity_date: today,
    });
  }

  async function saveLog(event) {
    event.preventDefault();
    const payload = { ...draft, student_id: draft.student_id || defaultStudentId };
    const result = editingLogId ? await onUpdateLog(editingLogId, payload) : await onSaveLog(payload);
    if (result) {
      setSheetOpen(false);
      setEditingLogId(null);
      setDraft(blankServiceLogDraft(defaultStudentId, today));
    }
  }

  async function saveAchievement(event) {
    event.preventDefault();
    const payload = { ...achievementDraft };
    const result = editingAchievementId ? await onUpdateAchievement(editingAchievementId, payload) : await onSaveAchievement(payload);
    if (result) {
      setEditingAchievementId(null);
      setAchievementDraft(blankServiceAchievementDraft(defaultStudentId, latestLogForAchievement?.id || null, today));
    }
  }

  function applyLogSuggestion(log) {
    const student = students.find((item) => item.id === log.student_id) || null;
    const summary = summarizeServiceLogs([log], student);
    setEditingAchievementId(null);
    setAchievementDraft({
      ...blankServiceAchievementDraft(log.student_id, log.id, today),
      student_id: log.student_id,
      service_log_id: log.id,
      title: `${log.organization_name} service impact`,
      description: log.impact_description || log.description || "",
      achievement_type: log.leadership_role ? "Leadership" : "Service Milestone",
      date_earned: log.activity_date,
      tags: log.tags.join(", "),
      resume_bullet: buildServiceResumeBullet(summary, [log], student),
      scholarship_angle: buildServiceScholarshipSummary(summary, [log], student),
    });
  }

  return (
    <>
      <PageHeader
        title="Service & activities"
        action={<button className="primary" onClick={() => openNewLog()}><Plus size={16} /> Add Hours</button>}
      />
      <section className="serviceSummaryHero">
        <div className="serviceHeroCard heroTotalCard">
          <span>Total hours</span>
          <strong>{summary.totalHoursText}</strong>
          <p>Logged service across all students.</p>
        </div>
        <div className="serviceHeroGrid">
          {summary.studentTotals.slice(0, 3).map((item) => (
            <article className="serviceMiniStat" key={item.student.id}>
              <span>{item.student.name}</span>
              <strong>{item.totalHoursText}</strong>
              <p>{item.entryCount} entry{item.entryCount === 1 ? "" : "s"}</p>
            </article>
          ))}
        </div>
      </section>
      <details className="filters compactFilters">
        <summary>Filters</summary>
      <section className="serviceFilterShell">
        <div className="serviceFilterRow">
          <Select
            label="Student"
            value={filters.student_id}
            onChange={(student_id) => setFilters((current) => ({ ...current, student_id }))}
            options={[["all", "All students"], ...students.map((student) => [student.id, student.name])]}
          />
          <Select
            label="Year"
            value={filters.year}
            onChange={(year) => setFilters((current) => ({ ...current, year }))}
            options={[["all", "All years"], ...yearOptions.map((year) => [year, year])]}
          />
          <Select
            label="Category"
            value={filters.category}
            onChange={(category) => setFilters((current) => ({ ...current, category }))}
            options={[["all", "All categories"], ...categoryOptions.map((category) => [category, category])]}
          />
          <label className="selectLabel">
            <span>Organization</span>
            <input value={filters.organization} placeholder="Church, school, club..." onChange={(event) => setFilters((current) => ({ ...current, organization: event.target.value }))} />
          </label>
          <label className="selectLabel">
            <span>Tag</span>
            <input value={filters.tag} placeholder="leadership, faith..." onChange={(event) => setFilters((current) => ({ ...current, tag: event.target.value }))} />
          </label>
          <Select
            label="Leadership"
            value={filters.leadership_role}
            onChange={(leadership_role) => setFilters((current) => ({ ...current, leadership_role }))}
            options={[["all", "All entries"], ["true", "Leadership only"], ["false", "Non-leadership only"]]}
          />
          <label className="selectLabel">
            <span>From</span>
            <input type="date" value={filters.start_date} onChange={(event) => setFilters((current) => ({ ...current, start_date: event.target.value }))} />
          </label>
          <label className="selectLabel">
            <span>To</span>
            <input type="date" value={filters.end_date} onChange={(event) => setFilters((current) => ({ ...current, end_date: event.target.value }))} />
          </label>
        </div>
        <div className="serviceCategoryChips">
          {SERVICE_CATEGORIES.map((category) => (
            <button
              key={category}
              className={filters.category === category ? "active" : ""}
              onClick={() => setFilters((current) => ({ ...current, category: current.category === category ? "all" : category }))}
            >
              {category}
            </button>
          ))}
        </div>
      </section>
      </details>
      <details className="filters compactFilters">
        <summary>Totals and breakdowns</summary>
      <section className="serviceSummaryDashboard">
        <article className="serviceStatCard">
          <span>Leadership hours</span>
          <strong>{summary.leadershipHoursText}</strong>
        </article>
        <article className="serviceStatCard">
          <span>Mentoring hours</span>
          <strong>{summary.mentoringHoursText}</strong>
        </article>
        <article className="serviceStatCard">
          <span>Recent organizations</span>
          <strong>{summary.topOrganization || "None yet"}</strong>
        </article>
        <article className="serviceStatCard">
          <span>Impact stories</span>
          <strong>{summary.impactStoryCount}</strong>
        </article>
      </section>
      <section className="serviceBreakdownGrid">
        <article className="serviceBreakdownCard">
          <div className="sectionHeader"><h3>Hours by category</h3></div>
          <div className="compactList">
            {summary.hoursByCategory.map((item) => (
              <article className="matchRow" key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.totalHoursText} · {item.entryCount} entry{item.entryCount === 1 ? "" : "s"}</p>
                </div>
              </article>
            ))}
            {!summary.hoursByCategory.length && <Empty text="No category totals yet." />}
          </div>
        </article>
        <article className="serviceBreakdownCard">
          <div className="sectionHeader"><h3>Hours by year</h3></div>
          <div className="compactList">
            {summary.hoursByYear.map((item) => (
              <article className="matchRow" key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.totalHoursText} · {item.entryCount} entry{item.entryCount === 1 ? "" : "s"}</p>
                </div>
              </article>
            ))}
            {!summary.hoursByYear.length && <Empty text="No year totals yet." />}
          </div>
        </article>
      </section>
      </details>
      <section className="serviceWorkspace">
        <div className="serviceListPanel">
          <div className="sectionHeader">
            <h3>Recent entries</h3>
            <span>{latestLogs.length}</span>
          </div>
          <div className="list serviceLogList">
            {latestLogs.map((log) => (
              <article className="serviceLogCard" key={log.id}>
                <div className="itemTop">
                  <div>
                    <p className="eyebrow">{formatShortDate(log.activity_date)} · {log.hours} hours · {log.student?.name}</p>
                    <h3>{log.organization_name}</h3>
                    <p>{log.activity_title}</p>
                  </div>
                  <Badge tone={log.category === "Mentoring" ? "green" : "blue"}>{log.category || "Other"}</Badge>
                </div>
                <TagList tags={log.tags} />
                <p className="notes">{log.description || log.impact_description || log.reflection || "No notes added."}</p>
                <div className="actions">
                  <button onClick={() => editLog(log)}><ClipboardCheck size={16} /> Edit</button>
                  <button onClick={() => duplicateLog(log)}><Copy size={16} /> Duplicate</button>
                  {log.recurring_activity && <button onClick={() => duplicateLog(log)}><History size={16} /> Log again</button>}
                  {canManage && <button className="danger" onClick={() => window.confirm(`Delete this service log for ${log.organization_name}?`) && onDeleteLog(log.id)}><Trash2 size={16} /> Delete</button>}
                </div>
              </article>
            ))}
            {!latestLogs.length && <Empty text="No service logs match these filters." />}
          </div>
        </div>
        <aside className="serviceSidebar">
          <details className="filters compactFilters">
            <summary>Organizations and impact stories (optional)</summary>
          <section className="serviceTopOrgPanel">
            <div className="sectionHeader">
              <h3>Top organizations</h3>
            </div>
            <div className="compactList">
              {summary.topOrganizations.map((item) => (
                <article className="matchRow" key={item.name}>
                  <div>
                    <strong>{item.name}</strong>
                    <p>{item.totalHoursText} · {item.entryCount} entry{item.entryCount === 1 ? "" : "s"}</p>
                  </div>
                </article>
              ))}
              {!summary.topOrganizations.length && <Empty text="No organizations yet." />}
            </div>
          </section>
          <section className="serviceAchievementPanel">
            <div className="sectionHeader">
              <h3>Impact stories</h3>
              <button onClick={() => applyLogSuggestion(latestLogs[0] || serviceLogs[0])} disabled={!serviceLogs.length}>Draft from latest</button>
            </div>
            <form className="serviceAchievementForm" onSubmit={saveAchievement}>
              <select value={achievementDraft.student_id} onChange={(event) => setAchievementDraft({ ...achievementDraft, student_id: event.target.value })}>
                {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
              </select>
              <select value={achievementDraft.achievement_type} onChange={(event) => setAchievementDraft({ ...achievementDraft, achievement_type: event.target.value })}>
                <option value="">Achievement type</option>
                {SERVICE_ACHIEVEMENT_TYPES.map((type) => <option key={type}>{type}</option>)}
              </select>
              <input value={achievementDraft.title} placeholder="Achievement title" onChange={(event) => setAchievementDraft({ ...achievementDraft, title: event.target.value })} />
              <textarea rows={3} value={achievementDraft.description} placeholder="Short description" onChange={(event) => setAchievementDraft({ ...achievementDraft, description: event.target.value })} />
              <textarea rows={3} value={achievementDraft.resume_bullet} placeholder="Resume bullet" onChange={(event) => setAchievementDraft({ ...achievementDraft, resume_bullet: event.target.value })} />
              <textarea rows={3} value={achievementDraft.scholarship_angle} placeholder="Scholarship angle" onChange={(event) => setAchievementDraft({ ...achievementDraft, scholarship_angle: event.target.value })} />
              <input value={achievementDraft.tags} placeholder="Tags" onChange={(event) => setAchievementDraft({ ...achievementDraft, tags: event.target.value })} />
              <label className="selectLabel">
                <span>Date earned</span>
                <input type="date" value={achievementDraft.date_earned} onChange={(event) => setAchievementDraft({ ...achievementDraft, date_earned: event.target.value })} />
              </label>
              <button className="primary">{editingAchievementId ? <><ClipboardCheck size={16} /> Update impact story</> : <><Plus size={16} /> Save impact story</>}</button>
            </form>
            <div className="compactList">
              {topAchievements.map((achievement) => (
                <article className="serviceAchievementCard" key={achievement.id}>
                  <strong>{achievement.title}</strong>
                  <p>{achievement.achievement_type || "Other"}{achievement.date_earned ? ` · ${formatShortDate(achievement.date_earned)}` : ""}</p>
                  <p className="notes">{achievement.resume_bullet || achievement.description || achievement.scholarship_angle || "No summary yet."}</p>
                  <div className="actions">
                    <button onClick={() => {
                      setEditingAchievementId(achievement.id);
                      setAchievementDraft({
                      ...achievementDraft,
                      student_id: achievement.student_id,
                      service_log_id: achievement.service_log_id || null,
                      title: achievement.title,
                      description: achievement.description || "",
                      achievement_type: achievement.achievement_type || "",
                      date_earned: achievement.date_earned || "",
                      tags: (achievement.tags || []).join(", "),
                      resume_bullet: achievement.resume_bullet || "",
                        scholarship_angle: achievement.scholarship_angle || "",
                      });
                    }}><ClipboardCheck size={16} /> Edit draft</button>
                    {canManage && <button className="danger" onClick={() => window.confirm(`Delete impact story "${achievement.title}"?`) && onDeleteAchievement(achievement.id)}><Trash2 size={16} /> Delete</button>}
                  </div>
                </article>
              ))}
              {!topAchievements.length && <Empty text="No impact stories saved yet." />}
            </div>
          </section>
          </details>
        </aside>
      </section>
      {sheetOpen && (
        <div className="modalBackdrop serviceBackdrop" onClick={() => setSheetOpen(false)}>
          <article className="modalCard serviceSheet" onClick={(event) => event.stopPropagation()}>
            <div className="sectionHeader">
              <h3>{editingLogId ? "Edit hours" : "+ Add Hours"}</h3>
              <button onClick={() => setSheetOpen(false)}><X size={16} /></button>
            </div>
            <form className="serviceSheetForm" onSubmit={saveLog}>
              <select value={draft.student_id} onChange={(event) => setDraft({ ...draft, student_id: event.target.value })} required>
                {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
              </select>
              <label className="selectLabel">
                <span>Date</span>
                <input type="date" value={draft.activity_date} onChange={(event) => setDraft({ ...draft, activity_date: event.target.value })} required />
              </label>
              <label className="selectLabel">
                <span>Hours</span>
                <input type="number" min="0" step="0.25" value={draft.hours} onChange={(event) => setDraft({ ...draft, hours: event.target.value })} required />
              </label>
              <label className="selectLabel">
                <span>Organization</span>
                <input
                  list="service-org-options"
                  value={draft.organization_name}
                  onChange={(event) => setDraft((current) => {
                    const organization_name = event.target.value;
                    const matched = serviceOrganizations.find((item) => item.name.toLowerCase() === organization_name.toLowerCase()) || null;
                    return {
                      ...current,
                      organization_name,
                      category: current.category || matched?.category || "",
                    };
                  })}
                  placeholder="Church, school, club..."
                  required
                />
              </label>
              <input value={draft.activity_title} placeholder="Activity title" onChange={(event) => setDraft({ ...draft, activity_title: event.target.value })} required />
              <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
                <option value="">Category</option>
                {SERVICE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
              <TagPicker label="Tags" value={draft.tags} onChange={(tags) => setDraft({ ...draft, tags })} suggestions={SERVICE_TAGS} placeholder="leadership, faith, mentoring" />
              <textarea rows={3} className="wide" value={draft.description} placeholder="Short description" onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
              <details className="nestedDetails">
                <summary>Advanced fields</summary>
                <div className="serviceAdvancedGrid">
                  <label className="selectLabel"><span>Verification contact name</span><input value={draft.verification_contact_name} onChange={(event) => setDraft({ ...draft, verification_contact_name: event.target.value })} /></label>
                  <label className="selectLabel"><span>Verification contact email</span><input value={draft.verification_contact_email} onChange={(event) => setDraft({ ...draft, verification_contact_email: event.target.value })} /></label>
                  <label className="selectLabel"><span>People served</span><input type="number" min="0" value={draft.people_served} onChange={(event) => setDraft({ ...draft, people_served: event.target.value })} /></label>
                  <TagPicker label="Skills used" value={draft.skills_used} onChange={(skills_used) => setDraft({ ...draft, skills_used })} suggestions={SERVICE_SKILLS} placeholder="leadership, patience, teamwork" />
                  <label className="checkLine"><input type="checkbox" checked={draft.leadership_role} onChange={(event) => setDraft({ ...draft, leadership_role: event.target.checked })} /> Leadership role</label>
                  <label className="checkLine"><input type="checkbox" checked={draft.recurring_activity} onChange={(event) => setDraft({ ...draft, recurring_activity: event.target.checked })} /> Recurring activity</label>
                  <label className="selectLabel"><span>Impact description</span><textarea rows={3} value={draft.impact_description} onChange={(event) => setDraft({ ...draft, impact_description: event.target.value })} /></label>
                  <label className="selectLabel"><span>Reflection</span><textarea rows={3} value={draft.reflection} onChange={(event) => setDraft({ ...draft, reflection: event.target.value })} /></label>
                  <label className="selectLabel"><span>Proof / photo URL</span><input value={draft.proof_url} onChange={(event) => setDraft({ ...draft, proof_url: event.target.value })} /></label>
                </div>
              </details>
              <div className="actions">
                <button className="primary"><ClipboardCheck size={16} /> Save</button>
                <button type="button" onClick={() => setSheetOpen(false)}>Cancel</button>
              </div>
            </form>
            <datalist id="service-org-options">
              {recentOrganizations.map((organization) => <option key={organization} value={organization} />)}
            </datalist>
          </article>
        </div>
      )}
    </>
  );
}

function ServiceFactsPanel({ student, summary, serviceLogs }) {
  const [copiedKey, setCopiedKey] = useState("");

  if (!student) return null;

  async function copyFact(key, text) {
    await navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(""), 1200);
  }

  return (
    <Panel title="Service facts" icon={<Gift size={18} />}>
      <div className="serviceFactsStats">
        <article><span>Total</span><strong>{summary.totalHoursText}</strong></article>
        <article><span>Leadership</span><strong>{summary.leadershipHoursText}</strong></article>
        <article><span>Mentoring</span><strong>{summary.mentoringHoursText}</strong></article>
        <article><span>Entries</span><strong>{serviceLogs.length}</strong></article>
      </div>
      <div className="actions serviceFactsActions">
        <button onClick={() => copyFact("resume", summary.resumeBullet)}>{copiedKey === "resume" ? "Copied" : "Generate Resume Bullet"}</button>
        <button onClick={() => copyFact("scholarship", summary.scholarshipSummary)}>{copiedKey === "scholarship" ? "Copied" : "Generate Scholarship Summary"}</button>
        <button onClick={() => copyFact("recommendation", summary.recommendationNote)}>{copiedKey === "recommendation" ? "Copied" : "Generate Recommendation Note"}</button>
        <button onClick={() => copyFact("interview", summary.interviewTalkingPoint)}>{copiedKey === "interview" ? "Copied" : "Generate Interview Talking Point"}</button>
      </div>
      <textarea className="copyArea" rows={8} readOnly value={summary.summaryText} onFocus={(event) => event.target.select()} />
    </Panel>
  );
}

function PortfolioSummarySection({
  student,
  scholarships,
  trackers,
  workspaces,
  answers,
  snippets,
  tasks,
  leads,
  projectIdeas,
  schoolOptions,
  comparisonNotes,
}) {
  const [copied, setCopied] = useState(false);
  const summary = useMemo(() => buildPortfolioSummaryText({
    student,
    scholarships,
    trackers,
    workspaces,
    answers,
    snippets,
    tasks,
    leads,
    projectIdeas,
    schoolOptions,
    comparisonNotes,
  }), [student, scholarships, trackers, workspaces, answers, snippets, tasks, leads, projectIdeas, schoolOptions, comparisonNotes]);

  async function copySummary() {
    await navigator.clipboard?.writeText(summary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="studentProfileBlock portfolioSummarySection">
      <div className="sectionHeader">
        <h4><FileText size={16} /> Scholarship & Opportunity Summary</h4>
        <button onClick={copySummary}><Clipboard size={16} /> {copied ? "Copied" : "Copy summary"}</button>
      </div>
      <textarea className="wide copyArea" rows={18} readOnly value={summary} onFocus={(event) => event.target.select()} />
    </section>
  );
}

function SchoolOptionsSection({
  student,
  schools,
  scholarships,
  trackers,
  schoolOptions,
  comparisonNotes,
  selectedStudentChosenSchoolId,
  selectedStudentChosenSchoolName,
  onSaveSchoolOption,
  onDeleteSchoolOption,
  onSaveSchoolComparisonNote,
  onDeleteSchoolComparisonNote,
}) {
  const [optionDraft, setOptionDraft] = useState(() => blankSchoolOptionDraft());
  const [editingOptionId, setEditingOptionId] = useState(null);
  const [noteDraft, setNoteDraft] = useState(() => blankSchoolComparisonNoteDraft());

  useEffect(() => {
    setOptionDraft(blankSchoolOptionDraft());
    setEditingOptionId(null);
    setNoteDraft(blankSchoolComparisonNoteDraft());
  }, [student.id]);

  const sortedOptions = useMemo(() => {
    return [...schoolOptions].sort((a, b) => {
      const aChosen = a.interest_level === "Chosen" ? 0 : 1;
      const bChosen = b.interest_level === "Chosen" ? 0 : 1;
      if (aChosen !== bChosen) return aChosen - bChosen;
      return String(a.school?.name || "").localeCompare(String(b.school?.name || ""));
    });
  }, [schoolOptions]);

  const summary = useMemo(() => buildStudentSchoolFinancialSummary(student, schools, scholarships, trackers, schoolOptions, selectedStudentChosenSchoolId), [student, schools, scholarships, trackers, schoolOptions, selectedStudentChosenSchoolId]);
  const comparisonRows = useMemo(() => buildSchoolComparisonRows(scholarships, schoolOptions), [scholarships, schoolOptions]);

  function editOption(option) {
    setEditingOptionId(option.id);
    setOptionDraft({
      school_name: option.school?.name || "",
      school_type: option.school?.school_type || "",
      city: option.school?.city || "",
      state: option.school?.state || "",
      website: option.school?.website || "",
      school_notes: option.school?.notes || "",
      interest_level: option.interest_level || "Considering",
      admission_status: option.admission_status || "Not Applied",
      estimated_cost_of_attendance: option.estimated_cost_of_attendance ?? "",
      estimated_aid: option.estimated_aid ?? "",
      estimated_scholarships: option.estimated_scholarships ?? "",
      estimated_out_of_pocket: option.estimated_out_of_pocket ?? "",
      pros: option.pros || "",
      cons: option.cons || "",
      notes: option.notes || "",
    });
  }

  async function saveOption(event) {
    event.preventDefault();
    const saved = await onSaveSchoolOption(student.id, optionDraft);
    if (saved) {
      setOptionDraft(blankSchoolOptionDraft());
      setEditingOptionId(null);
    }
  }

  async function saveNote(event) {
    event.preventDefault();
    if (!noteDraft.school_id) return;
    const saved = await onSaveSchoolComparisonNote(student.id, noteDraft);
    if (saved) setNoteDraft(blankSchoolComparisonNoteDraft(noteDraft.school_id));
  }

  const comparisonSchools = [...new Map([
    ...schoolOptions.map((option) => [option.school_id, option.school]),
    ...schools.map((school) => [school.id, school]),
  ])]
    .map(([, school]) => school)
    .filter(Boolean);

  return (
    <section className="schoolOptionsPanel">
      <p className="helperText">
        School-specific scholarships are only usable if the student attends that school. These should be compared by school, not added together as total available aid.
      </p>

      <div className="metricGrid">
        <Metric label="General scholarships" value={formatCurrency(summary.general.total)} />
        <Metric label="School-specific scholarships" value={formatCurrency(summary.schoolSpecific.totalPotential)} />
        <Metric label="Confirmed awards" value={formatCurrency(summary.confirmed.total)} />
        <Metric label="Potential awards" value={formatCurrency(summary.potential.total)} />
        <Metric label="Chosen school package" value={formatCurrency(summary.chosenPackage.total)} />
      </div>

      {selectedStudentChosenSchoolName && (
        <div className="notice">
          Chosen school: <strong>{selectedStudentChosenSchoolName}</strong>
        </div>
      )}

      <form className="schoolOptionForm" onSubmit={saveOption}>
        <h4>{editingOptionId ? "Edit school option" : "Add school option"}</h4>
        <div className="profileGrid compact">
          <label>
            <span>School name</span>
            <input value={optionDraft.school_name} list="school-name-options" onChange={(event) => setOptionDraft({ ...optionDraft, school_name: event.target.value })} placeholder="School name" />
          </label>
          <label>
            <span>School type</span>
            <select value={optionDraft.school_type} onChange={(event) => setOptionDraft({ ...optionDraft, school_type: event.target.value })}>
              <option value="">School type</option>
              {SCHOOL_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label>
            <span>City</span>
            <input value={optionDraft.city} onChange={(event) => setOptionDraft({ ...optionDraft, city: event.target.value })} />
          </label>
          <label>
            <span>State</span>
            <input value={optionDraft.state} onChange={(event) => setOptionDraft({ ...optionDraft, state: event.target.value })} />
          </label>
          <label>
            <span>Website</span>
            <input value={optionDraft.website} onChange={(event) => setOptionDraft({ ...optionDraft, website: event.target.value })} />
          </label>
          <label>
            <span>Interest level</span>
            <select value={optionDraft.interest_level} onChange={(event) => setOptionDraft({ ...optionDraft, interest_level: event.target.value })}>
              {SCHOOL_INTEREST_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
            </select>
          </label>
          <label>
            <span>Admission status</span>
            <select value={optionDraft.admission_status} onChange={(event) => setOptionDraft({ ...optionDraft, admission_status: event.target.value })}>
              {SCHOOL_ADMISSION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label>
            <span>Cost of attendance</span>
            <input type="number" value={optionDraft.estimated_cost_of_attendance} onChange={(event) => setOptionDraft({ ...optionDraft, estimated_cost_of_attendance: event.target.value })} />
          </label>
          <label>
            <span>Aid</span>
            <input type="number" value={optionDraft.estimated_aid} onChange={(event) => setOptionDraft({ ...optionDraft, estimated_aid: event.target.value })} />
          </label>
          <label>
            <span>Scholarships</span>
            <input type="number" value={optionDraft.estimated_scholarships} onChange={(event) => setOptionDraft({ ...optionDraft, estimated_scholarships: event.target.value })} />
          </label>
          <label>
            <span>Out of pocket</span>
            <input type="number" value={optionDraft.estimated_out_of_pocket} onChange={(event) => setOptionDraft({ ...optionDraft, estimated_out_of_pocket: event.target.value })} />
          </label>
        </div>
        <textarea className="wide" value={optionDraft.pros} placeholder="Pros" onChange={(event) => setOptionDraft({ ...optionDraft, pros: event.target.value })} />
        <textarea className="wide" value={optionDraft.cons} placeholder="Cons" onChange={(event) => setOptionDraft({ ...optionDraft, cons: event.target.value })} />
        <textarea className="wide" value={optionDraft.notes} placeholder="Notes" onChange={(event) => setOptionDraft({ ...optionDraft, notes: event.target.value })} />
        <textarea className="wide" value={optionDraft.school_specific_reason || ""} placeholder="School notes" onChange={(event) => setOptionDraft({ ...optionDraft, school_specific_reason: event.target.value })} />
        <div className="actions wide">
          <button className="primary" type="submit"><Plus size={16} /> {editingOptionId ? "Save school option" : "Add school option"}</button>
          {editingOptionId && (
            <button type="button" onClick={() => { setEditingOptionId(null); setOptionDraft(blankSchoolOptionDraft()); }}>Cancel edit</button>
          )}
        </div>
      </form>
      <datalist id="school-name-options">
        {schools.map((school) => <option key={school.id} value={school.name} />)}
      </datalist>

      <div className="list">
        {sortedOptions.map((option) => {
          const schoolScholarships = scholarships.filter((scholarship) => scholarship.is_school_specific && scholarshipMatchesSchool(scholarship, option.school));
          const groupedByBucket = groupScholarshipsByDecisionBucket(schoolScholarships);
          const isChosen = option.interest_level === "Chosen" || option.school_id === selectedStudentChosenSchoolId;
          return (
            <article className={`trackerItem ${isChosen ? "chosenSchool" : ""}`} key={option.id}>
              <div className="itemTop">
                <div>
                  <div className="badges">
                    <Badge tone="blue">{option.interest_level}</Badge>
                    <Badge tone="yellow">{option.admission_status}</Badge>
                    {option.school?.school_type && <Badge>{option.school.school_type}</Badge>}
                    {isChosen && <Badge tone="green">Chosen</Badge>}
                  </div>
                  <h3>{option.school?.name || "Unnamed school"}</h3>
                  <p>{option.school?.city || "City TBD"}{option.school?.state ? `, ${option.school.state}` : ""}</p>
                </div>
                <div className="actions">
                  <button onClick={() => editOption(option)}><FileText size={16} /> Edit</button>
                  <button className="danger" onClick={() => onDeleteSchoolOption(option.id)}><Trash2 size={16} /> Delete</button>
                </div>
              </div>
              <div className="metricGrid compact">
                <Metric label="Scholarship opportunities" value={schoolScholarships.length} />
                <Metric label="Estimated value" value={formatCurrency(sumScholarshipValue(schoolScholarships))} />
                <Metric label="Cost of attendance" value={formatMoneyEstimate(option.estimated_cost_of_attendance)} />
                <Metric label="Out of pocket" value={formatMoneyEstimate(option.estimated_out_of_pocket)} />
              </div>
              <div className="badges">
                {option.school && <Badge tone="blue">{option.school.website ? "Website on file" : "No website"}</Badge>}
                {option.school && option.school.notes && <Badge>{option.school.notes}</Badge>}
              </div>
              {schoolScholarships.length > 0 && (
                <div className="schoolBucketList">
                  {Object.entries(groupedByBucket).map(([bucket, bucketItems]) => (
                    <div key={bucket} className="schoolBucket">
                      <strong>{bucket}</strong>
                      <div className="badges">
                        {bucketItems.map((item) => <Badge key={item.id}>{item.name}</Badge>)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="notesGrid">
                <p className="notes"><strong>Pros:</strong> {option.pros || "None noted"}</p>
                <p className="notes"><strong>Cons:</strong> {option.cons || "None noted"}</p>
                <p className="notes"><strong>Notes:</strong> {option.notes || "None noted"}</p>
              </div>
              <div className="schoolTaskBox">
                <strong>Suggested tasks</strong>
                <ul>
                  {generateSchoolTaskLabels(option, schoolScholarships).map((task) => <li key={task}>{task}</li>)}
                </ul>
              </div>
              <div className="schoolNotesList">
                {comparisonNotes.filter((note) => note.school_id === option.school_id).map((note) => (
                  <article key={note.id} className="schoolNoteRow">
                    <strong>{note.category || "Note"}</strong>
                    <p>{note.note}</p>
                    <div className="actions">
                      {note.score && <Badge tone="yellow">Score {note.score}</Badge>}
                      <button className="danger" onClick={() => onDeleteSchoolComparisonNote(note.id)}><Trash2 size={16} /> Delete</button>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          );
        })}
        {!sortedOptions.length && <Empty text="No school options saved yet." />}
      </div>

      <form className="schoolComparisonForm" onSubmit={saveNote}>
        <h4>School comparison notes</h4>
        <div className="profileGrid compact">
          <label>
            <span>School</span>
            <select value={noteDraft.school_id} onChange={(event) => setNoteDraft({ ...noteDraft, school_id: event.target.value })}>
              <option value="">Select school</option>
              {comparisonSchools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
            </select>
          </label>
          <label>
            <span>Category</span>
            <select value={noteDraft.category} onChange={(event) => setNoteDraft({ ...noteDraft, category: event.target.value })}>
              {SCHOOL_COMPARISON_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label>
            <span>Score</span>
            <input type="number" min="1" max="5" value={noteDraft.score} onChange={(event) => setNoteDraft({ ...noteDraft, score: event.target.value })} />
          </label>
        </div>
        <textarea className="wide" value={noteDraft.note} placeholder="Comparison note" onChange={(event) => setNoteDraft({ ...noteDraft, note: event.target.value })} />
        <div className="actions">
          <button className="primary" type="submit"><Plus size={16} /> Save note</button>
        </div>
      </form>

      <div className="comparisonTableWrap">
        <h4>School comparison</h4>
        <table className="comparisonTable">
          <thead>
            <tr>
              <th>School</th>
              <th>Admission Status</th>
              <th>Scholarship Opportunities</th>
              <th>Estimated Scholarship Value</th>
              <th>Cost of Attendance</th>
              <th>Estimated Out-of-Pocket</th>
              <th>Renewable Awards</th>
              <th>Stackable?</th>
              <th>Key Deadlines</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row) => (
              <tr key={row.school_id}>
                <td>{row.school?.name || "Unnamed school"}</td>
                <td>{row.admission_status}</td>
                <td>{row.scholarship_count}</td>
                <td>{formatCurrency(row.estimated_scholarship_value)}</td>
                <td>{formatMoneyEstimate(row.cost_of_attendance)}</td>
                <td>{formatMoneyEstimate(row.out_of_pocket)}</td>
                <td>{row.renewable_awards}</td>
                <td>{row.stackable ? "Yes" : "No"}</td>
                <td>{row.deadlines.join(" · ") || "None"}</td>
                <td>{row.notes || "—"}</td>
              </tr>
            ))}
            {!comparisonRows.length && (
              <tr><td colSpan={10}><Empty text="No school comparison data yet." /></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function loadStudentDraft(student) {
  return { ...student };
}

function ProjectIdeasSection({
  student,
  scholarships,
  projectIdeas,
  onCreateProjectIdea,
  onUpdateProjectIdea,
  onDeleteProjectIdea,
}) {
  const [draft, setDraft] = useState({
    title: "",
    scholarship_id: "",
    description: "",
    status: "idea",
    mentor_name: "",
    notes: "",
  });

  useEffect(() => {
    setDraft({
      title: "",
      scholarship_id: "",
      description: "",
      status: "idea",
      mentor_name: "",
      notes: "",
    });
  }, [student.id]);

  const linkedScholarship = scholarships.find((item) => item.id === draft.scholarship_id) || null;

  async function handleCreate() {
    const nextDraft = {
      ...draft,
      title: draft.title.trim() || (linkedScholarship ? `Project idea: ${linkedScholarship.name}` : "Project idea"),
    };
    const ok = await onCreateProjectIdea(student.id, linkedScholarship, nextDraft);
    if (ok) {
      setDraft((current) => ({
        ...current,
        title: "",
        description: "",
        status: "idea",
        mentor_name: "",
        notes: "",
      }));
    }
  }

  return (
    <section className="studentProfileBlock projectIdeaSection">
      <div className="sectionHeader">
        <h4><Lightbulb size={16} /> Project / essay ideas</h4>
        <span>{projectIdeas.length}</span>
      </div>
      <div className="projectIdeaForm">
        <input value={draft.title} placeholder="Idea title" onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
        <Select
          label="Linked scholarship"
          value={draft.scholarship_id}
          onChange={(scholarship_id) => setDraft({ ...draft, scholarship_id })}
          options={[
            ["", "No linked scholarship"],
            ...scholarships.map((item) => [item.id, item.name]),
          ]}
        />
        <Select
          label="Status"
          value={draft.status}
          onChange={(status) => setDraft({ ...draft, status })}
          options={PROJECT_IDEA_STATUSES.map((status) => [status, projectIdeaStatusLabel(status)])}
        />
        <input value={draft.mentor_name} placeholder="Mentor name" onChange={(event) => setDraft({ ...draft, mentor_name: event.target.value })} />
        <textarea className="wide" value={draft.description} placeholder="Project description or essay plan" onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
        <textarea className="wide" value={draft.notes} placeholder="Notes" onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
        <div className="actions wide">
          <button onClick={handleCreate}><Plus size={16} /> Add project idea</button>
        </div>
      </div>
      <div className="compactList">
        {projectIdeas.map((projectIdea) => (
          <ProjectIdeaRow
            key={projectIdea.id}
            projectIdea={projectIdea}
            scholarships={scholarships}
            onUpdateProjectIdea={onUpdateProjectIdea}
            onDeleteProjectIdea={onDeleteProjectIdea}
          />
        ))}
        {!projectIdeas.length && <Empty text="No project or essay ideas tracked for this student yet." />}
      </div>
    </section>
  );
}

function ProjectIdeaRow({ projectIdea, scholarships, onUpdateProjectIdea, onDeleteProjectIdea }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => ({
    title: projectIdea.title,
    scholarship_id: projectIdea.scholarship_id || "",
    description: projectIdea.description || "",
    status: projectIdea.status || "idea",
    mentor_name: projectIdea.mentor_name || "",
    notes: projectIdea.notes || "",
  }));

  useEffect(() => {
    setDraft({
      title: projectIdea.title,
      scholarship_id: projectIdea.scholarship_id || "",
      description: projectIdea.description || "",
      status: projectIdea.status || "idea",
      mentor_name: projectIdea.mentor_name || "",
      notes: projectIdea.notes || "",
    });
  }, [projectIdea]);

  const scholarship = scholarships.find((item) => item.id === projectIdea.scholarship_id) || null;

  async function handleSave() {
    await onUpdateProjectIdea(projectIdea.id, {
      title: draft.title.trim() || "Project idea",
      scholarship_id: draft.scholarship_id || null,
      description: draft.description || null,
      status: draft.status,
      mentor_name: draft.mentor_name || null,
      notes: draft.notes || null,
    });
    setEditing(false);
  }

  return (
    <article className="projectIdeaCard">
      {editing ? (
        <div className="projectIdeaEdit">
          <input value={draft.title} placeholder="Idea title" onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          <Select
            label="Linked scholarship"
            value={draft.scholarship_id}
            onChange={(scholarship_id) => setDraft({ ...draft, scholarship_id })}
            options={[
              ["", "No linked scholarship"],
              ...scholarships.map((item) => [item.id, item.name]),
            ]}
          />
          <Select
            label="Status"
            value={draft.status}
            onChange={(status) => setDraft({ ...draft, status })}
            options={PROJECT_IDEA_STATUSES.map((status) => [status, projectIdeaStatusLabel(status)])}
          />
          <input value={draft.mentor_name} placeholder="Mentor name" onChange={(event) => setDraft({ ...draft, mentor_name: event.target.value })} />
          <textarea className="wide" value={draft.description} placeholder="Project description or essay plan" onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          <textarea className="wide" value={draft.notes} placeholder="Notes" onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
          <div className="actions wide">
            <button onClick={handleSave}><ClipboardCheck size={16} /> Save idea</button>
            <button onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="itemTop">
            <div>
              <h3>{projectIdea.title}</h3>
              <p>{scholarship?.name || "No linked scholarship"} · {projectIdea.mentor_name || "No mentor noted"}</p>
            </div>
            <Badge tone={projectIdeaStatusTone(projectIdea.status)}>{projectIdeaStatusLabel(projectIdea.status)}</Badge>
          </div>
          {projectIdea.description && <p className="notes">{projectIdea.description}</p>}
          {projectIdea.notes && <p className="notes">{projectIdea.notes}</p>}
          <div className="actions">
            {projectIdea.scholarship_id && scholarship?.link && (
              <a className="secondary" href={externalUrl(scholarship.link)} target="_blank" rel="noreferrer">Open scholarship</a>
            )}
            <button onClick={() => setEditing(true)}><FileText size={16} /> Edit</button>
            <button className="danger" onClick={() => onDeleteProjectIdea(projectIdea)}><Trash2 size={16} /> Delete</button>
          </div>
        </>
      )}
    </article>
  );
}

function projectIdeaStatusLabel(status) {
  return String(status || "").replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function projectIdeaStatusTone(status) {
  return {
    idea: "neutral",
    planning: "blue",
    active: "yellow",
    submitted: "green",
  }[status] || "neutral";
}

function NoFamilyAccess({ message, onReload, onSwitchAccount, onCreateFamily }) {
  const [form, setForm] = useState({ family_name: "", student_name: "", student_grade: "" });
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    await onCreateFamily(form);
    setSaving(false);
  }

  return (
    <Shell>
      <main className="empty">
        <h1>Set up your family</h1>
        <p>Create a private workspace for your student. Only people you invite can see it.</p>
        {message && <p role="status">{message}</p>}
        <form className="onboardingForm" onSubmit={submit}>
          <label className="selectLabel">
            <span>Family name</span>
            <input value={form.family_name} maxLength={80} required placeholder="The Smith Family" onChange={(event) => setForm({ ...form, family_name: event.target.value })} />
          </label>
          <label className="selectLabel">
            <span>First student's name</span>
            <input value={form.student_name} maxLength={80} required placeholder="Student name" onChange={(event) => setForm({ ...form, student_name: event.target.value })} />
          </label>
          <label className="selectLabel">
            <span>Grade (optional)</span>
            <select value={form.student_grade} onChange={(event) => setForm({ ...form, student_grade: event.target.value })}>
              <option value="">Not sure yet</option>
              {GRADE_LEVEL_OPTIONS.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
            </select>
          </label>
          <button className="primary" type="submit" disabled={saving}>{saving ? "Creating..." : "Create my family"}</button>
        </form>
        <p className="inlineHint">Were you invited to an existing family? Open the invite link from your email while signed in with the invited address.</p>
        <div className="actions">
          <button onClick={onReload}>Reload</button>
          <button className="ghost" onClick={onSwitchAccount}>Switch account</button>
        </div>
      </main>
    </Shell>
  );
}

function FamilySwitcher({ families, activeFamilyId, onSelect }) {
  return (
    <label className="profileSwitcher">
      <UserRound size={16} />
      <span className="srOnly">Active family</span>
      <select value={activeFamilyId} onChange={(event) => onSelect(event.target.value)}>
        {families.map((family) => <option key={family.id} value={family.id}>{family.name} ({family.id.slice(0, 8)})</option>)}
      </select>
    </label>
  );
}

function StudentTabs({ students = [], selected, setSelected }) {
  return (
    <nav className="studentTabs">
      <button className={selected === "Family" ? "active" : ""} onClick={() => setSelected("Family")}>Family</button>
      {students.map((student) => (
        <button key={student.id} className={selected === student.name ? "active" : ""} onClick={() => setSelected(student.name)}>{student.name}</button>
      ))}
    </nav>
  );
}

function FamilySettingsPage({ family, students, memberships, invites, canManage, currentUserId, currentUserEmail, onRefresh, onRunAccessCheck, onCreateInvite, onDeleteInvite, onUpdateRole, onRemoveMember }) {
  const [draft, setDraft] = useState({ email: "", role: "parent", student_id: "", expires_at: "" });

  return (
    <>
      <PageHeader title="Family Settings" />
      <Panel title="Family" icon={<Crown size={18} />}>
        <div className="metricGrid">
          <Metric label="Family name" value={family?.name || "Unknown"} />
          <Metric label="Family ID" value={family?.id ? family.id.slice(0, 8) : "Unknown"} />
          <Metric label="Members" value={memberships.length} />
          <Metric label="Pending invites" value={invites.filter((invite) => !invite.accepted_at).length} />
        </div>
        <div className="actions">
          <button onClick={onRunAccessCheck}>Run access check</button>
        </div>
        <p className="notes">{currentUserEmail || currentUserId} · {family?.id || "No active family"}</p>
      </Panel>

      <Panel title="Members" icon={<UserRound size={18} />}>
        <div className="list">
          {memberships.map((member) => (
            <article key={member.id} className="trackerItem">
              <div className="itemTop">
                <div>
                  <h3>{member.student?.name || member.family?.name || member.user_id}</h3>
                  <p>{member.user_id === currentUserId ? "You" : member.user_id}</p>
                </div>
                <Badge tone={member.role === "family_admin" || member.role === "parent" ? "green" : "neutral"}>{member.role}</Badge>
              </div>
              <div className="trackerControls">
                <select value={member.role} disabled={!canManage} onChange={(event) => onUpdateRole(member.id, event.target.value)}>
                  {["family_admin", "parent", "student", "viewer"].map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
                <button className="danger" disabled={!canManage || member.user_id === currentUserId} onClick={() => onRemoveMember(member.id)}>
                  Remove member
                </button>
              </div>
            </article>
          ))}
        </div>
      </Panel>

      <Panel title="Invites" icon={<Mail size={18} />}>
        <div className="list">
          {invites.map((invite) => (
            <article key={invite.id} className="trackerItem">
              <div className="itemTop">
                <div>
                  <h3>{invite.email}</h3>
                  <p>{invite.role}{invite.student_id ? ` · student ${invite.student_id}` : ""}</p>
                </div>
                <Badge tone={invite.accepted_at ? "green" : "yellow"}>{invite.accepted_at ? "Accepted" : "Pending"}</Badge>
              </div>
              <p className="notes">{buildInviteUrl(invite.invite_token)}</p>
              <div className="trackerControls">
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(buildInviteUrl(invite.invite_token));
                  }}
                >
                  Copy link
                </button>
                <button
                  onClick={() => {
                    const subject = encodeURIComponent(`Join ${family?.name || "our family"} in Scholarship Wallet`);
                    const body = encodeURIComponent(`Use this invite link to join ${family?.name || "our family"}:\n\n${buildInviteUrl(invite.invite_token)}`);
                    window.location.href = `mailto:${encodeURIComponent(invite.email)}?subject=${subject}&body=${body}`;
                  }}
                >
                  Draft email
                </button>
                {!invite.accepted_at && canManage && (
                  <button className="danger" onClick={() => onDeleteInvite(invite.id)}>
                    Delete invite
                  </button>
                )}
              </div>
            </article>
          ))}
          {!invites.length && <Empty text="No pending invites." />}
        </div>
        {canManage && (
          <form
            className="leadForm"
            onSubmit={(event) => {
              event.preventDefault();
              onCreateInvite({
                email: draft.email,
                role: draft.role,
                student_id: draft.student_id || null,
                expires_at: draft.expires_at || null,
              });
              setDraft({ email: "", role: "parent", student_id: "", expires_at: "" });
            }}
          >
            <input value={draft.email} placeholder="Invite email" onChange={(event) => setDraft({ ...draft, email: event.target.value })} required />
            <select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })}>
              {["family_admin", "parent", "student", "viewer"].map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
            <select value={draft.student_id} onChange={(event) => setDraft({ ...draft, student_id: event.target.value })}>
              <option value="">Student optional</option>
              {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
            </select>
            <label className="selectLabel">
              <span>Invite expiration date</span>
              <input type="date" value={draft.expires_at} onChange={(event) => setDraft({ ...draft, expires_at: event.target.value })} />
            </label>
            <button className="primary wide">Create invite</button>
          </form>
        )}
        <div className="actions">
          <button onClick={onRefresh}>Refresh</button>
        </div>
      </Panel>
    </>
  );
}

function ScholarshipFilters({ filters, setFilters, scholarships }) {
  const statuses = uniqueOptions(scholarships.map((item) => item.status).filter(Boolean));
  const schools = uniqueSchoolOptions(scholarships);
  const categories = uniqueOptions(scholarships.map((item) => item.scholarship_category).filter(Boolean));
  const activeKeys = ["query", "eligibility", "quality", "status", "schoolId", "renewable", "stackable", "scholarshipCategory", "deadlineWindow", "residentState"];

  return (
    <details className="filters compactFilters">
      <summary><Search size={16} /> Filters <span>{activeFilterCount(filters, activeKeys)} active</span></summary>
      <div className="filterBody scholarshipFilterBody">
        <SearchBox value={filters.query} onChange={(query) => setFilters({ ...filters, query })} placeholder="Search scholarships by name, award, school, notes" />
        <Select label="Eligibility" value={filters.eligibility} onChange={(eligibility) => setFilters({ ...filters, eligibility })} options={[["all", "All"], ["now", "Eligible now"], ["soon", "Eligible soon"]]} />
        <Select label="Priority" value={filters.quality} onChange={(quality) => setFilters({ ...filters, quality })} options={[["all", "Any priority"], ["4", "4+"], ["3", "3+"], ["2", "2+"]]} />
        <Select label="Status" value={filters.status} onChange={(status) => setFilters({ ...filters, status })} options={[["all", "All statuses"], ...statuses.map((status) => [status, status])]} />
        <Select
          label="School"
          value={filters.schoolId}
          onChange={(schoolId) => setFilters({ ...filters, schoolId })}
          options={[
            ["all", "All schools"],
            ["general", "General scholarships"],
            ["school_specific", "School-specific scholarships"],
            ["none", "No school linked"],
            ...schools,
          ]}
        />
        <Select label="Renewable" value={filters.renewable} onChange={(renewable) => setFilters({ ...filters, renewable })} options={[["all", "Any renewable status"], ["true", "Renewable"], ["false", "Not renewable"]]} />
        <Select label="Stackable" value={filters.stackable} onChange={(stackable) => setFilters({ ...filters, stackable })} options={[["all", "Any stackable status"], ["true", "Stackable"], ["false", "Not stackable"]]} />
        <Select label="Category" value={filters.scholarshipCategory} onChange={(scholarshipCategory) => setFilters({ ...filters, scholarshipCategory })} options={[["all", "All categories"], ...categories.map((category) => [category, category])]} />
        <input value={filters.residentState || ""} placeholder="Resident state" onChange={(event) => setFilters({ ...filters, residentState: event.target.value })} />
        <Select label="Deadline" value={filters.deadlineWindow} onChange={(deadlineWindow) => setFilters({ ...filters, deadlineWindow })} options={[["all", "Any deadline"], ["exact", "Exact date set"], ["next30", "Next 30 days"], ["next90", "Next 90 days"], ["past", "Past deadline"], ["unknown", "Unknown deadline"]]} />
        <div className="actions wide">
          <button type="button" onClick={() => setFilters((current) => resetScholarshipFilterState(current))}><X size={16} /> Clear scholarship filters</button>
        </div>
      </div>
    </details>
  );
}

function LeadFilters({ filters, setFilters }) {
  return (
    <details className="filters compactFilters">
      <summary><Search size={16} /> Filters <span>{activeFilterCount(filters, ["query", "status", "organization_type", "quick"])} active</span></summary>
      <div className="filterBody leadFilters">
      <SearchBox value={filters.query} onChange={(query) => setFilters({ ...filters, query })} placeholder="Search local leads" />
      <Select label="Status" value={filters.status} onChange={(status) => setFilters({ ...filters, status })} options={[["all", "All statuses"], ...LEAD_STATUSES.map((item) => [item, item])]} />
      <Select label="Type" value={filters.organization_type} onChange={(organization_type) => setFilters({ ...filters, organization_type })} options={[["all", "All types"], ...ORGANIZATION_TYPES.map((item) => [item, item])]} />
      <div className="quickFilters">
        <button className={filters.quick === "all" ? "active" : ""} onClick={() => setFilters({ ...filters, quick: "all" })}>All</button>
        {LEAD_QUICK_FILTERS.map(([key, label]) => (
          <button key={key} className={filters.quick === key ? "active" : ""} onClick={() => setFilters({ ...filters, quick: key })}>{label}</button>
        ))}
      </div>
      </div>
    </details>
  );
}

function TaskFilters({ filters, setFilters, scholarships }) {
  return (
    <details className="filters compactFilters">
      <summary><Search size={16} /> Filters <span>{activeFilterCount(filters, ["scholarship_id", "task_type", "dueSoon"])} active</span></summary>
      <div className="filterBody taskFilters">
      <Select label="Scholarship" value={filters.scholarship_id} onChange={(scholarship_id) => setFilters({ ...filters, scholarship_id })} options={[["all", "All scholarships"], ...scholarships.map((scholarship) => [scholarship.id, scholarship.name])]} />
      <Select label="Task Type" value={filters.task_type} onChange={(task_type) => setFilters({ ...filters, task_type })} options={[["all", "All types"], ...TASK_TYPES.map((type) => [type, type])]} />
      <label className="checkLine"><input type="checkbox" checked={filters.dueSoon} onChange={(event) => setFilters({ ...filters, dueSoon: event.target.checked })} /> Due soon</label>
      </div>
    </details>
  );
}

function AnswerFilters({ filters, setFilters }) {
  return (
    <details className="filters compactFilters">
      <summary><Search size={16} /> Filters <span>{activeFilterCount(filters, ["query", "tag", "category", "scholarship", "year", "minWords", "maxWords", "quality"])} active</span></summary>
      <div className="filterBody answerSearch">
      <SearchBox value={filters.query} onChange={(query) => setFilters({ ...filters, query })} placeholder="Search by keyword, prompt, answer, or scholarship" />
      <input value={filters.tag} placeholder="Tag" list="tag-options" onChange={(event) => setFilters({ ...filters, tag: event.target.value })} />
      <datalist id="tag-options">{TAGS.map((tag) => <option key={tag} value={tag} />)}</datalist>
      <Select label="Category" value={filters.category} onChange={(category) => setFilters({ ...filters, category })} options={[["all", "All categories"], ...CATEGORIES.map((item) => [item, item])]} />
      <input value={filters.scholarship} placeholder="Scholarship name" onChange={(event) => setFilters({ ...filters, scholarship: event.target.value })} />
      <input value={filters.year} placeholder="Year" onChange={(event) => setFilters({ ...filters, year: event.target.value })} />
      <input type="number" value={filters.minWords} placeholder="Min words" onChange={(event) => setFilters({ ...filters, minWords: event.target.value })} />
      <input type="number" value={filters.maxWords} placeholder="Max words" onChange={(event) => setFilters({ ...filters, maxWords: event.target.value })} />
      <Select label="Quality" value={filters.quality} onChange={(quality) => setFilters({ ...filters, quality })} options={[["all", "Any"], ["5", "5"], ["4", "4+"], ["3", "3+"]]} />
      </div>
    </details>
  );
}

function SnippetFilters({ filters, setFilters, students }) {
  const showStudentFilter = students.length > 1;
  const activeKeys = showStudentFilter ? ["query", "student_id", "category", "topic", "tag", "tone", "reusable"] : ["query", "category", "topic", "tag", "tone", "reusable"];

  return (
    <details className="filters compactFilters">
      <summary><Search size={16} /> Filters <span>{activeFilterCount(filters, activeKeys)} active</span></summary>
      <div className="filterBody snippetSearch">
      <SearchBox value={filters.query} onChange={(query) => setFilters({ ...filters, query })} placeholder="Search snippets by title, text, theme, or source question" />
      {showStudentFilter && <Select label="Student" value={filters.student_id} onChange={(student_id) => setFilters({ ...filters, student_id })} options={[["all", "All students"], ...students.map((student) => [student.id, student.name])]} />}
      <Select label="Category" value={filters.category} onChange={(category) => setFilters({ ...filters, category })} options={[["all", "All categories"], ...SNIPPET_CATEGORIES.map((item) => [item, item])]} />
      <label className="selectLabel">
        <span>Topic</span>
        <input value={filters.topic === "all" ? "" : filters.topic} list="snippet-topic-options" placeholder="All topics" onChange={(event) => setFilters({ ...filters, topic: event.target.value.trim() || "all" })} />
      </label>
      <input value={filters.tag} placeholder="Tag" onChange={(event) => setFilters({ ...filters, tag: event.target.value })} />
      <input value={filters.tone} placeholder="Tone" onChange={(event) => setFilters({ ...filters, tone: event.target.value })} />
      <Select label="Reusable" value={filters.reusable} onChange={(reusable) => setFilters({ ...filters, reusable })} options={[["all", "All"], ["true", "Reusable"], ["false", "Reference only"]]} />
      </div>
    </details>
  );
}

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function DeadlineCalendar({ trackers, tasks }) {
  const [viewDate, setViewDate] = useState(new Date());
  const monthStart = startOfMonth(viewDate);
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(viewDate) });
  const leadingBlanks = getDay(monthStart); // 0=Sun … 6=Sat
  const events = buildCalendarEvents(trackers, tasks);
  const monthEvents = events.filter((item) => {
    const d = parsedDate(item.date);
    return d >= monthStart && d <= endOfMonth(viewDate);
  });

  return (
    <>
      <div className="calendarNav">
        <button className="calNavBtn" onClick={() => setViewDate((d) => subMonths(d, 1))}>&#8249;</button>
        <strong>{format(viewDate, "MMMM yyyy")}</strong>
        <button className="calNavBtn" onClick={() => setViewDate((d) => addMonths(d, 1))}>&#8250;</button>
      </div>
      <div className="calendar">
        {DOW_LABELS.map((label) => (
          <div className="dayHeader" key={label}>{label}</div>
        ))}
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div className="day dayBlank" key={`blank-${i}`} />
        ))}
        {days.map((day) => {
          const matches = events.filter((item) => isSameDay(parsedDate(item.date), day));
          const deadlines = matches.filter((item) => item.type === "deadline");
          const taskItems = matches.filter((item) => item.type === "task");
          const visible = [...deadlines, ...taskItems].slice(0, 2);
          const overflow = matches.length - visible.length;
          const today = isToday(day);
          return (
            <div
              className={["day", matches.length ? "hasItems" : "", today ? "isToday" : ""].filter(Boolean).join(" ")}
              key={day.toISOString()}
            >
              <span>{format(day, "d")}</span>
              {visible.map((item) => (
                <small key={item.key} className={item.type === "deadline" ? "eventDeadline" : "eventTask"}>
                  {item.label}
                </small>
              ))}
              {overflow > 0 && <small className="eventOverflow">+{overflow} more</small>}
            </div>
          );
        })}
      </div>
      <div className="mobileDeadlineList">
        {monthEvents.map((item) => (
          <article key={item.key}>
            <time>{format(parsedDate(item.date), "MMM d")}</time>
            <div>
              <strong>{item.label}</strong>
              <p>{item.subLabel}</p>
            </div>
          </article>
        ))}
        {!monthEvents.length && <Empty text="No deadlines with exact dates this month." />}
      </div>
    </>
  );
}

function PageHeader({ title, action }) {
  return <div className="pageHeader"><h2>{title}</h2>{action}</div>;
}

const BLANK_AWARD_DRAFT = { student_id: "", title: "", category: "", issuing_org: "", date_earned: "", description: "", scholarship_angle: "", tags: "" };

function AwardsPage({ students, trackers, personalAwards, onUpdateTracker, onSaveAward, onUpdateAward, onDeleteAward }) {
  const [tab, setTab] = useState("personal");
  const [draft, setDraft] = useState({ ...BLANK_AWARD_DRAFT, student_id: students[0]?.id || "" });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    setDraft((d) => ({
      ...d,
      student_id: students.some((s) => s.id === d.student_id) ? d.student_id : students[0]?.id || "",
    }));
  }, [students]);

  async function handleSave(e) {
    e.preventDefault();
    if (editingId) {
      await onUpdateAward(editingId, {
        title: draft.title,
        category: draft.category || null,
        issuing_org: draft.issuing_org || null,
        date_earned: draft.date_earned || null,
        description: draft.description || null,
        scholarship_angle: draft.scholarship_angle || null,
        tags: parseTags(draft.tags),
      });
      setEditingId(null);
    } else {
      await onSaveAward(draft);
    }
    setDraft({ ...BLANK_AWARD_DRAFT, student_id: draft.student_id });
  }

  function startEdit(award) {
    setEditingId(award.id);
    setDraft({
      student_id: award.student_id,
      title: award.title || "",
      category: award.category || "",
      issuing_org: award.issuing_org || "",
      date_earned: award.date_earned || "",
      description: award.description || "",
      scholarship_angle: award.scholarship_angle || "",
      tags: (award.tags || []).join(", "),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft({ ...BLANK_AWARD_DRAFT, student_id: draft.student_id });
  }

  const AWARD_STATUSES = ["Won", "Offered", "Accepted"];
  const awardTrackers = trackers.filter((t) => AWARD_STATUSES.includes(t.application_status));
  const scholarshipTotal = awardTrackers.reduce((sum, t) => sum + scholarshipValue(t.scholarship), 0);

  const byStudentScholarship = students.map((student) => ({
    student,
    awards: awardTrackers.filter((t) => t.student_id === student.id),
  })).filter((g) => g.awards.length > 0);

  const byStudentPersonal = students.map((student) => ({
    student,
    awards: (personalAwards || []).filter((a) => a.student_id === student.id),
  })).filter((g) => g.awards.length > 0);

  return (
    <div className="page">
      <PageHeader title="Awards" />

      <div className="profileTabs">
        <button className={tab === "personal" ? "active" : ""} onClick={() => setTab("personal")}>Personal Awards</button>
        <button className={tab === "scholarships" ? "active" : ""} onClick={() => setTab("scholarships")}>Scholarship Wins</button>
      </div>

      {tab === "personal" && (
        <>
          <section className="panel">
            <div className="panelHeader"><h2><Medal size={18} /> {editingId ? "Edit award" : "Add award"}</h2></div>
            <form onSubmit={handleSave}>
              <div className="profileGrid compact">
                <label>
                  <span>Student</span>
                  <select value={draft.student_id} onChange={(e) => setDraft({ ...draft, student_id: e.target.value })}>
                    {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
                <label>
                  <span>Award title</span>
                  <input required value={draft.title} placeholder="e.g. Honor Roll, All-State, 1st Place Science Fair" onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                </label>
                <label>
                  <span>Category</span>
                  <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                    <option value="">Select category</option>
                    {PERSONAL_AWARD_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label>
                  <span>Issuing organization / school</span>
                  <input value={draft.issuing_org} placeholder="e.g. School, State Athletic Assoc." onChange={(e) => setDraft({ ...draft, issuing_org: e.target.value })} />
                </label>
                <label>
                  <span>Date earned</span>
                  <input type="date" value={draft.date_earned} onChange={(e) => setDraft({ ...draft, date_earned: e.target.value })} />
                </label>
                <label>
                  <span>Description</span>
                  <input value={draft.description} placeholder="Brief description" onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                </label>
                <label>
                  <span>Scholarship angle</span>
                  <input value={draft.scholarship_angle} placeholder="How to use this in a scholarship essay" onChange={(e) => setDraft({ ...draft, scholarship_angle: e.target.value })} />
                </label>
                <label>
                  <span>Tags</span>
                  <input value={draft.tags} placeholder="leadership, academic, faith" onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
                </label>
              </div>
              <div className="formActions">
                <button type="submit" className="primary"><Medal size={16} /> {editingId ? "Save changes" : "Add award"}</button>
                {editingId && <button type="button" onClick={cancelEdit}>Cancel</button>}
              </div>
            </form>
          </section>

          {!byStudentPersonal.length && (
            <div className="emptyState">
              <Medal size={32} />
              <p>No personal awards yet. Add academic, athletic, leadership, and other achievements above.</p>
            </div>
          )}

          {byStudentPersonal.map(({ student, awards }) => (
            <section key={student.id} className="panel">
              <div className="panelHeader">
                <h2><GraduationCap size={18} /> {student.name}</h2>
                <span>{awards.length} award{awards.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="awardsList">
                {awards.map((award) => (
                  <article key={award.id} className="awardCard personalAwardCard">
                    <div className="awardCardMain">
                      <Medal size={16} className="awardIcon" />
                      <div>
                        <strong>{award.title}</strong>
                        {award.issuing_org && <span className="awardAmount">{award.issuing_org}</span>}
                      </div>
                    </div>
                    <div className="awardCardMeta">
                      {award.category && <Badge tone="blue">{award.category}</Badge>}
                      {award.date_earned && <span className="metaChip">{formatShortDate(award.date_earned)}</span>}
                      {(award.tags || []).map((tag) => <span key={tag} className="metaChip">{tag}</span>)}
                    </div>
                    {award.description && <p className="awardNote">{award.description}</p>}
                    {award.scholarship_angle && <p className="awardNote scholarshipAngle"><Star size={13} /> {award.scholarship_angle}</p>}
                    <div className="awardCardActions">
                      <button onClick={() => startEdit(award)}><PenLine size={15} /> Edit</button>
                      <button className="danger" onClick={() => onDeleteAward(award.id)}><Trash2 size={15} /> Delete</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      {tab === "scholarships" && (
        <>
          <div className="metricGrid">
            <Metric label="Total awarded" value={formatCurrency(scholarshipTotal)} />
            <Metric label="Scholarships won" value={awardTrackers.length} />
          </div>

          {!awardTrackers.length && (
            <div className="emptyState">
              <Trophy size={32} />
              <p>No scholarship awards yet. When an application is marked <strong>Awarded</strong> under Scholarships, it shows up here.</p>
            </div>
          )}

          {byStudentScholarship.map(({ student, awards }) => (
            <section key={student.id} className="panel">
              <div className="panelHeader">
                <h2><GraduationCap size={18} /> {student.name}</h2>
                <span className="metric" style={{ minWidth: 0 }}>
                  <strong>{formatCurrency(awards.reduce((sum, t) => sum + scholarshipValue(t.scholarship), 0))}</strong>
                </span>
              </div>
              <div className="awardsList">
                {awards.map((tracker) => (
                  <article key={tracker.id} className="awardCard">
                    <div className="awardCardMain">
                      <Trophy size={16} className="awardIcon" />
                      <div>
                        <strong>{tracker.scholarship?.name || "Unnamed scholarship"}</strong>
                        {tracker.scholarship?.award && <span className="awardAmount">{tracker.scholarship.award}</span>}
                      </div>
                    </div>
                    <div className="awardCardMeta">
                      <span className="badge green">{stageOf(tracker.application_status).label}</span>
                      {tracker.scholarship?.deadline && <span className="metaChip">{tracker.scholarship.deadline}</span>}
                      {tracker.scholarship?.school?.name && <span className="metaChip">{tracker.scholarship.school.name}</span>}
                    </div>
                    <div className="awardCardActions">
                      <select aria-label={`Status for ${tracker.scholarship?.name || "scholarship"}`} value={stageOf(tracker.application_status).key} onChange={(e) => onUpdateTracker(tracker.id, { application_status: stageByKey(e.target.value).write })}>
                        {SELECTABLE_STAGES.map((key) => <option key={key} value={key}>{stageByKey(key).label}</option>)}
                      </select>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

function Panel({ title, icon, action, children }) {
  return <section className="panel"><div className="panelHeader"><h2>{icon}{title}</h2>{action}</div>{children}</section>;
}

function Metric({ label, value, onClick }) {
  if (onClick) return <button className="metric metricLink" onClick={onClick}><strong>{value}</strong><span>{label}</span></button>;
  return <div className="metric"><strong>{value}</strong><span>{label}</span></div>;
}

function MiniList({ items, render }) {
  if (!items.length) return <Empty text="Nothing to show yet." />;
  return <div className="miniList">{items.map((item) => <p key={item.id}>{render(item)}</p>)}</div>;
}

function uniqueOptions(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function groupSnippetsByTopic(rows) {
  const groups = rows.reduce((acc, snippet) => {
    const topic = String(snippet.topic || "").trim() || "No topic";
    if (!acc[topic]) acc[topic] = [];
    acc[topic].push(snippet);
    return acc;
  }, {});

  return Object.entries(groups).sort((a, b) => {
    if (a[0] === "No topic") return 1;
    if (b[0] === "No topic") return -1;
    return a[0].localeCompare(b[0]);
  });
}

function uniqueSchoolOptions(scholarships) {
  const schools = new Map();
  scholarships.forEach((scholarship) => {
    if (scholarship.school_id && scholarship.school?.name) {
      schools.set(scholarship.school_id, scholarship.school.name);
    }
  });
  return [...schools.entries()].sort((a, b) => a[1].localeCompare(b[1]));
}

function SearchBox({ value, onChange, placeholder }) {
  return <div className="searchBox"><Search size={18} /><input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></div>;
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="selectLabel">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
      </select>
    </label>
  );
}

function CsvUpload({ onFile, family }) {
  const label = family?.name ? `Import into ${family.name}` : "Import CSV";
  return (
    <label className="upload themedTooltip" data-tooltip={label}>
      <Upload size={16} /> Import CSV{family?.name ? `: ${family.name}` : ""}
      <input type="file" accept=".csv" onChange={(event) => onFile(event.target.files?.[0])} />
    </label>
  );
}

function AuthScreen({ form, setForm, mode, setMode, invite, onSubmit, message }) {
  const invitedEmail = invite?.email || "";

  return (
    <Shell>
      <main className="authGlassScreen">
        <section className="authGlassHero">
          <div className="authGlassCopy">
            <div className="appIcon"><GraduationCap size={22} /></div>
            <p className="eyebrow">Scholarship workspace</p>
            <h1>Sign in to your application workspace.</h1>
            <p>Use your account to continue managing scholarship work.</p>
          </div>
        </section>

        <section className="authGlassPanel">
          <div>
            <p className="eyebrow">Secure workspace</p>
            <h2>{mode === "sign_up" ? "Create account" : "Sign in"}</h2>
            <p>{invite ? `Join ${invite.family_name} with ${invitedEmail}.` : "Use your family scholarship login."}</p>
          </div>
          <form onSubmit={onSubmit}>
            <label>Email<input type="email" value={form.email} disabled={Boolean(invitedEmail)} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
            <label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label>
            <button className="primary">{mode === "sign_up" ? "Create account" : "Sign in"}</button>
            <button className="glassButton" type="button" onClick={() => setMode(mode === "sign_up" ? "sign_in" : "sign_up")}>
              {mode === "sign_up" ? "I already have an account" : "Create an account"}
            </button>
            {message && <p className="formMessage">{message}</p>}
          </form>
        </section>
      </main>
    </Shell>
  );
}

function SetupMissing() {
  return <Shell><div className="empty"><h1>Supabase environment variables are missing.</h1><p>Create `.env.local` from `.env.example`, add your Supabase URL and anon key, then restart the dev server.</p></div></Shell>;
}

function UnlinkedProfile({ session, message, onRefresh, onClaimParent }) {
  return (
    <Shell>
      <div className="empty">
        <h1>No family is linked to this login.</h1>
        <p>This Auth user exists, but it does not belong to any family membership in this Supabase project.</p>
        <p>If this is the first account, create the family and invite members from the SQL migration or the Family Settings page.</p>
        {message && <p>{message}</p>}
        <div className="actions">
          <button className="primary" onClick={onClaimParent}>Retry membership lookup</button>
          <button onClick={onRefresh}>Refresh</button>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return <div className="appShell">{children}</div>;
}

function LoadingState({ label, description }) {
  return (
    <div className="loadingState" role="status" aria-live="polite" aria-busy="true">
      <div className="loadingStateIcon" aria-hidden="true">
        <LoaderCircle size={28} />
      </div>
      <div className="loadingStateCopy">
        <strong>{label}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}

function Badge({ children, tone = "neutral" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function StatusBadge({ status }) {
  const tone = statusTone(status);
  return <Badge tone={tone}>{status}</Badge>;
}

function statusTone(status) {
  return { Submitted: "green", Won: "green", Reviewed: "green", "Saved to Student": "green", Lost: "red", "Not Eligible": "red", Drafting: "blue", "Needs Review": "yellow", "Needs Verification": "yellow", "Ready to Submit": "yellow", Researching: "yellow", Unreviewed: "neutral" }[status] || "neutral";
}

function statusDisplayLabel(status) {
  return status === "Researching" ? "Preparing" : status;
}

function Priority({ score }) {
  return <span className="priority"><FileText size={15} /> Priority {score || 0}</span>;
}

function TagList({ tags = [] }) {
  return <div className="badges">{tags.map((tag) => <Badge key={tag} tone="blue">{tag}</Badge>)}</div>;
}

function TagPicker({ label, value, onChange, suggestions = [], placeholder = "Search tags" }) {
  const containerRef = useRef(null);
  const selectedTags = parseTags(value);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const normalizedSuggestions = useMemo(() => uniqueOptions([...suggestions, ...selectedTags]), [suggestions, selectedTags]);
  const filteredSuggestions = normalizedSuggestions.filter((tag) => {
    const lowerTag = tag.toLowerCase();
    return !selectedTags.some((selected) => selected.toLowerCase() === lowerTag) && (!query.trim() || lowerTag.includes(query.trim().toLowerCase()));
  }).slice(0, 12);

  useEffect(() => {
    function handlePointerDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

  function commitTag(rawTag) {
    const nextTag = String(rawTag || "").trim();
    if (!nextTag) return;
    const nextTags = uniqueOptions([...selectedTags, nextTag]);
    onChange(nextTags.join(", "));
    setQuery("");
    setOpen(true);
  }

  function removeTag(tagToRemove) {
    onChange(selectedTags.filter((tag) => tag !== tagToRemove).join(", "));
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitTag(query);
      return;
    }
    if (event.key === "Backspace" && !query && selectedTags.length) {
      event.preventDefault();
      removeTag(selectedTags[selectedTags.length - 1]);
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <label className="selectLabel tagPicker" ref={containerRef}>
      <span>{label}</span>
      <div className="tagPickerBox" onClick={() => setOpen(true)}>
        <div className="tagPickerChips">
          {selectedTags.map((tag) => (
            <button key={tag} type="button" className="tagPickerChip" onClick={(event) => { event.stopPropagation(); removeTag(tag); }}>
              <span>{tag}</span>
              <X size={12} />
            </button>
          ))}
          <input
            value={query}
            placeholder={selectedTags.length ? "Add another tag" : placeholder}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onKeyDown={handleKeyDown}
          />
        </div>
        {open && (
          <div className="tagPickerDropdown" role="listbox">
            {filteredSuggestions.length ? (
              filteredSuggestions.map((tag) => (
                <button key={tag} type="button" className="tagPickerOption" onClick={() => commitTag(tag)}>
                  <Plus size={14} />
                  <span>{tag}</span>
                </button>
              ))
            ) : (
              <div className="tagPickerEmpty">No matching tags</div>
            )}
          </div>
        )}
      </div>
      <small className="inlineHint">Type, press Enter, or click a tag. Multiple tags are allowed.</small>
    </label>
  );
}

function Empty({ text }) {
  return <div className="emptyState">{text}</div>;
}

function applyMergeFields(template, vars) {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value || ""),
    template,
  );
}

function blankEmailForm() {
  return {
    studentId: "",
    emailType: "scholarship_follow_up",
    templateId: "",
    scholarshipId: "",
    leadId: "",
    recipientName: "",
    recipientEmail: "",
    tone: "polite",
    parentName: "",
    followUpReason: "",
    missingItems: "",
  };
}

function blankEmailTemplate() {
  return {
    name: "",
    category: "scholarship_follow_up",
    subject_template: "",
    body_template: "",
    tone: "polite",
    active: true,
  };
}

function FollowUpEmailsPage({ students, scholarships, leads, emailTemplates, generatedEmails, canManage, profileName, onGenerate, onSaveTemplate, onArchiveTemplate, onMarkCopied, onMarkSent, onDelete }) {
  const [form, setForm] = useState(() => ({ ...blankEmailForm(), studentId: students.length === 1 ? students[0].id : "" }));
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [savedId, setSavedId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [historyFilter, setHistoryFilter] = useState({ studentId: "all", scholarshipId: "all" });
  const [copied, setCopied] = useState("");

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      studentId: students.some((student) => student.id === prev.studentId) ? prev.studentId : students[0]?.id || "",
    }));
  }, [students]);

  const pf = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const filteredTemplates = emailTemplates.filter((t) => t.category === form.emailType);

  const selectedStudent = students.find((s) => s.id === form.studentId);
  const selectedScholarship = scholarships.find((s) => s.id === form.scholarshipId);
  const selectedLead = leads.find((l) => l.id === form.leadId);
  const selectedTemplate = emailTemplates.find((t) => t.id === form.templateId);

  const needsScholarship = ["scholarship_follow_up", "recommendation_follow_up", "document_follow_up", "thank_you", "submission_confirmation"].includes(form.emailType);
  const needsLead = form.emailType === "local_lead_follow_up";

  function buildVars() {
    return {
      student_name: selectedStudent?.name || "",
      scholarship_name: selectedScholarship?.name || "",
      organization_name: selectedLead?.organization_name || selectedScholarship?.name || "",
      recipient_name: form.recipientName || (selectedLead?.contact_name || ""),
      deadline: selectedScholarship?.deadline || selectedLead?.typical_deadline || "",
      parent_name: form.parentName || profileName || "",
      follow_up_reason: form.followUpReason || "",
      missing_items: form.missingItems || "",
    };
  }

  function handleGenerate() {
    if (!selectedTemplate) return;
    const vars = buildVars();
    const resolvedSubject = applyMergeFields(selectedTemplate.subject_template, vars);
    const resolvedBody = applyMergeFields(selectedTemplate.body_template, vars);
    setSubject(resolvedSubject);
    setBody(resolvedBody);
    setSavedId(null);
  }

  useEffect(() => {
    if (!selectedTemplate) {
      setSubject("");
      setBody("");
      setSavedId(null);
      return;
    }
    const vars = buildVars();
    setSubject(applyMergeFields(selectedTemplate.subject_template, vars));
    setBody(applyMergeFields(selectedTemplate.body_template, vars));
    setSavedId(null);
  }, [form, selectedTemplate?.id]);

  async function handleSave() {
    if (!subject || !body) return;
    const saved = await onGenerate({
      templateId: form.templateId,
      studentId: form.studentId,
      scholarshipId: needsScholarship ? form.scholarshipId : null,
      leadId: needsLead ? form.leadId : null,
      recipientName: form.recipientName,
      recipientEmail: form.recipientEmail,
      subject,
      body,
    });
    if (saved) setSavedId(saved.id);
  }

  function copyText(text, label) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(""), 2000);
      if (savedId) onMarkCopied(savedId);
    });
  }

  const visibleHistory = generatedEmails.filter((e) => {
    if (historyFilter.studentId !== "all" && e.student_id !== historyFilter.studentId) return false;
    if (historyFilter.scholarshipId !== "all" && e.scholarship_id !== historyFilter.scholarshipId) return false;
    return true;
  });

  return (
    <div className="pageLayout">
      <div className="pageHeader">
        <h2><Mail size={20} /> Follow-Up Emails</h2>
        <div className="actions">
          {canManage && (
            <button className="btnOutline" onClick={() => { setShowTemplates((v) => !v); setShowHistory(false); }}>
              <PenLine size={16} /> {showTemplates ? "Compose Email" : "Templates"}
            </button>
          )}
          <button className="btnOutline" onClick={() => { setShowHistory((v) => !v); setShowTemplates(false); }}>
            <History size={16} /> {showHistory ? "Compose Email" : "Email History"}
          </button>
        </div>
      </div>

      <p className="helperText">This does not send the email. It creates copy-ready text you can paste into your email client.</p>

      {showTemplates ? (
        <EmailTemplateManager
          templates={emailTemplates}
          canManage={canManage}
          onSave={onSaveTemplate}
          onArchive={onArchiveTemplate}
        />
      ) : showHistory ? (
        <div className="emailHistory">
          <div className="filterRow">
            {students.length > 1 && (
              <select value={historyFilter.studentId} onChange={(e) => setHistoryFilter((p) => ({ ...p, studentId: e.target.value }))}>
                <option value="all">All students</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            <select value={historyFilter.scholarshipId} onChange={(e) => setHistoryFilter((p) => ({ ...p, scholarshipId: e.target.value }))}>
              <option value="all">All scholarships</option>
              {scholarships.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {visibleHistory.length === 0 && <Empty text="No emails generated yet." />}
          {visibleHistory.map((email) => (
            <article key={email.id} className="emailHistoryCard">
              <div className="emailHistoryMeta">
                <strong>{email.subject}</strong>
                <span className="metaChips">
                  {email.student?.name && <span className="chip">{email.student.name}</span>}
                  {email.scholarship?.name && <span className="chip">{email.scholarship.name}</span>}
                  {email.lead?.organization_name && <span className="chip">{email.lead.organization_name}</span>}
                  {email.sent_manually && <span className="chip chipSuccess">Sent</span>}
                  {email.copied_at && !email.sent_manually && <span className="chip">Copied</span>}
                </span>
                <small>{email.recipient_name || email.recipient_email || "No recipient"} · {new Date(email.created_at).toLocaleDateString()}</small>
              </div>
              <div className="emailHistoryActions">
                <button className="btnSm" onClick={() => copyText(`Subject: ${email.subject}\n\n${email.body}`, "history")}>
                  <Copy size={14} /> Copy
                </button>
                {!email.sent_manually && (
                  <button className="btnSm" onClick={() => onMarkSent(email.id)}>
                    <Send size={14} /> Mark Sent
                  </button>
                )}
                <button className="btnSm btnDanger" onClick={() => onDelete(email.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="emailGeneratorLayout">
          <div className="emailForm">
            <p className="eyebrow">Step 1</p>
            <h3>Select template</h3>

            {students.length > 1 && (
              <label>Student
                <select value={form.studentId} onChange={(e) => pf("studentId", e.target.value)}>
                  <option value="">— select student —</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
            )}

            <label>Template type
              <select value={form.emailType} onChange={(e) => { pf("emailType", e.target.value); pf("templateId", ""); }}>
                {EMAIL_CATEGORIES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label>Template
              <select value={form.templateId} onChange={(e) => pf("templateId", e.target.value)}>
                <option value="">— select template —</option>
                {filteredTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>

            {needsScholarship && (
              <><p className="eyebrow formStep">Step 2</p>
              <label>Scholarship
                <select value={form.scholarshipId} onChange={(e) => pf("scholarshipId", e.target.value)}>
                  <option value="">— select scholarship —</option>
                  {scholarships.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label></>
            )}

            {needsLead && (
              <><p className="eyebrow formStep">Step 2</p>
              <label>Local Lead / Organization
                <select value={form.leadId} onChange={(e) => {
                  pf("leadId", e.target.value);
                  const lead = leads.find((l) => l.id === e.target.value);
                  if (lead?.contact_name) pf("recipientName", lead.contact_name);
                  if (lead?.contact_email) pf("recipientEmail", lead.contact_email);
                }}>
                  <option value="">— select lead —</option>
                  {leads.map((l) => <option key={l.id} value={l.id}>{l.organization_name} — {l.title}</option>)}
                </select>
              </label></>
            )}

            <label>Recipient Name
              <input value={form.recipientName} onChange={(e) => pf("recipientName", e.target.value)} placeholder="Contact person's name" />
            </label>

            <label>Recipient Email (optional)
              <input type="email" value={form.recipientEmail} onChange={(e) => pf("recipientEmail", e.target.value)} placeholder="contact@organization.org" />
            </label>

            <label>Your Name (parent/student)
              <input value={form.parentName} onChange={(e) => pf("parentName", e.target.value)} placeholder={profileName || "Your name"} />
            </label>

            {form.emailType === "document_follow_up" && (
              <label>Missing Items
                <textarea
                  rows={3}
                  value={form.missingItems}
                  onChange={(e) => pf("missingItems", e.target.value)}
                  placeholder="List missing documents, one per line"
                />
              </label>
            )}

            {form.emailType === "scholarship_follow_up" && (
              <label>Follow-Up Reason (optional)
                <input value={form.followUpReason} onChange={(e) => pf("followUpReason", e.target.value)} placeholder="e.g. submitted 3 weeks ago" />
              </label>
            )}

            <label>Tone
              <select value={form.tone} onChange={(e) => pf("tone", e.target.value)}>
                {EMAIL_TONES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </label>

            <div className="mergeFieldHint">
              <details>
                <summary>Available merge fields</summary>
                <ul>{EMAIL_MERGE_FIELDS.map((f) => <li key={f}><code>{"{{" + f + "}}"}</code></li>)}</ul>
              </details>
            </div>

            <button
              className="btnPrimary"
              onClick={handleGenerate}
              disabled={!form.templateId}
            >
              Save Email
            </button>
          </div>

          <div className="emailPreview">
            <h3>Preview</h3>
            {!subject && !body && <div className="emptyState">Select a template to preview it here.</div>}
            {(subject || body) && (
              <>
                <label>Subject
                  <input value={subject} onChange={(e) => setSubject(e.target.value)} className="emailSubjectInput" />
                </label>
                <label>Body
                  <textarea
                    className="emailBodyInput"
                    rows={16}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                </label>
                <div className="emailActions">
                  <button className="btnSm" onClick={() => copyText(subject, "subject")}>
                    <Copy size={14} /> {copied === "subject" ? "Copied!" : "Copy Subject"}
                  </button>
                  <button className="btnSm" onClick={() => copyText(body, "body")}>
                    <Copy size={14} /> {copied === "body" ? "Copied!" : "Copy Body"}
                  </button>
                  <button className="btnSm" onClick={() => copyText(`Subject: ${subject}\n\n${body}`, "full")}>
                    <Copy size={14} /> {copied === "full" ? "Copied!" : "Copy Full Email"}
                  </button>
                  {!savedId ? (
                    <button className="btnSm btnSuccess" onClick={handleSave}>
                      <FileText size={14} /> Save to History
                    </button>
                  ) : (
                    <button className="btnSm" onClick={() => onMarkSent(savedId)}>
                      <Send size={14} /> Mark as Sent
                    </button>
                  )}
                </div>
                {savedId && <p className="helperText">Saved to history. Open Email History to view past emails.</p>}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmailTemplateManager({ templates, canManage, onSave, onArchive }) {
  const [draft, setDraft] = useState(blankEmailTemplate());

  function updateDraft(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function saveDraft() {
    const saved = await onSave(draft);
    if (saved) setDraft(blankEmailTemplate());
  }

  return (
    <div className="emailTemplateManager">
      <section className="templateEditorPanel">
        <div className="sectionHeader">
          <h3>New template</h3>
          <span>{EMAIL_MERGE_FIELDS.length} fields</span>
        </div>
        <div className="emailTemplateForm">
          <input value={draft.name} placeholder="Template name" disabled={!canManage} onChange={(event) => updateDraft("name", event.target.value)} />
          <select value={draft.category} disabled={!canManage} onChange={(event) => updateDraft("category", event.target.value)}>
            {EMAIL_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={draft.tone} disabled={!canManage} onChange={(event) => updateDraft("tone", event.target.value)}>
            {EMAIL_TONES.map((tone) => <option key={tone} value={tone}>{tone.charAt(0).toUpperCase() + tone.slice(1)}</option>)}
          </select>
          <input className="wide" value={draft.subject_template} placeholder="Subject template" disabled={!canManage} onChange={(event) => updateDraft("subject_template", event.target.value)} />
          <textarea className="wide" rows={8} value={draft.body_template} placeholder="Body template" disabled={!canManage} onChange={(event) => updateDraft("body_template", event.target.value)} />
          <div className="mergeFieldHint wide">
            <details>
              <summary>Available merge fields</summary>
              <ul>{EMAIL_MERGE_FIELDS.map((field) => <li key={field}><code>{"{{" + field + "}}"}</code></li>)}</ul>
            </details>
          </div>
          <button className="primary wide" disabled={!canManage} onClick={saveDraft}><Plus size={16} /> Add Template</button>
        </div>
      </section>

      <section className="templateEditorPanel">
        <div className="sectionHeader">
          <h3>Active templates</h3>
          <span>{templates.length}</span>
        </div>
        <div className="emailTemplateList">
          {templates.map((template) => (
            <EmailTemplateRow key={template.id} template={template} canManage={canManage} onSave={onSave} onArchive={onArchive} />
          ))}
          {!templates.length && <Empty text="No active email templates saved yet." />}
        </div>
      </section>
    </div>
  );
}

function EmailTemplateRow({ template, canManage, onSave, onArchive }) {
  const [draft, setDraft] = useState(template);
  const [editing, setEditing] = useState(false);

  useEffect(() => setDraft(template), [template]);

  function updateDraft(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function saveDraft() {
    const saved = await onSave(draft);
    if (saved) setEditing(false);
  }

  if (!editing) {
    return (
      <article className="emailTemplateCard">
        <div>
          <strong>{template.name}</strong>
          <p>{emailCategoryLabel(template.category)} · {template.tone || "polite"}</p>
          <p className="notes">{template.subject_template}</p>
        </div>
        {canManage && (
          <div className="actions">
            <button className="btnSm" onClick={() => setEditing(true)}><PenLine size={14} /> Edit</button>
            <button className="btnSm btnDanger" onClick={() => onArchive(template)}><Trash2 size={14} /> Archive</button>
          </div>
        )}
      </article>
    );
  }

  return (
    <article className="emailTemplateCard editing">
      <div className="emailTemplateForm">
        <input value={draft.name} disabled={!canManage} onChange={(event) => updateDraft("name", event.target.value)} />
        <select value={draft.category} disabled={!canManage} onChange={(event) => updateDraft("category", event.target.value)}>
          {EMAIL_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={draft.tone} disabled={!canManage} onChange={(event) => updateDraft("tone", event.target.value)}>
          {EMAIL_TONES.map((tone) => <option key={tone} value={tone}>{tone.charAt(0).toUpperCase() + tone.slice(1)}</option>)}
        </select>
        <input className="wide" value={draft.subject_template} disabled={!canManage} onChange={(event) => updateDraft("subject_template", event.target.value)} />
        <textarea className="wide" rows={8} value={draft.body_template} disabled={!canManage} onChange={(event) => updateDraft("body_template", event.target.value)} />
        <div className="actions wide">
          <button className="btnSm btnSuccess" onClick={saveDraft}><ClipboardCheck size={14} /> Save</button>
          <button className="btnSm" onClick={() => { setDraft(template); setEditing(false); }}>Cancel</button>
        </div>
      </div>
    </article>
  );
}

function emailCategoryLabel(category) {
  return EMAIL_CATEGORIES.find(([value]) => value === category)?.[1] || category;
}

function navIcon(name) {
  const props = { size: 18, "aria-hidden": true };
  if (name === "home") return <LayoutDashboard {...props} />;
  if (name === "scholarships") return <GraduationCap {...props} />;
  if (name === "materials") return <PenLine {...props} />;
  if (name === "settings") return <Settings {...props} />;
  return <UserRound {...props} />;
}

function filterAnswers(rows, filters) {
  return rows.filter((answer) => {
    const blob = `${answer.question_text} ${answer.answer_text} ${answer.scholarship?.name}`.toLowerCase();
    if (filters.query && !blob.includes(filters.query.toLowerCase())) return false;
    if (filters.tag && !(answer.tags || []).some((tag) => tag.toLowerCase().includes(filters.tag.toLowerCase()))) return false;
    if (filters.category !== "all" && answer.category !== filters.category) return false;
    if (filters.scholarship && !String(answer.scholarship?.name || "").toLowerCase().includes(filters.scholarship.toLowerCase())) return false;
    if (filters.year && Number(answer.application_year) !== Number(filters.year)) return false;
    if (filters.minWords && Number(answer.word_count || 0) < Number(filters.minWords)) return false;
    if (filters.maxWords && Number(answer.word_count || 0) > Number(filters.maxWords)) return false;
    if (filters.quality !== "all" && Number(answer.quality_rating || 0) < Number(filters.quality)) return false;
    return true;
  });
}

function activeFilterCount(filters, keys) {
  return keys.reduce((count, key) => {
    const value = filters[key];
    if (value === true) return count + 1;
    if (value === false || value === "" || value == null) return count;
    if (["all", "open"].includes(value)) return count;
    return count + 1;
  }, 0);
}

function resetScholarshipFilterState(current) {
  return {
    ...current,
    query: "",
    eligibility: "all",
    quality: "all",
    status: "all",
    schoolId: "all",
    renewable: "all",
    stackable: "all",
    scholarshipCategory: "all",
    deadlineWindow: "all",
    residentState: "",
  };
}

function filterSnippets(rows, filters) {
  return rows.filter((snippet) => {
    const blob = `${snippet.title} ${snippet.snippet_text} ${snippet.theme} ${snippet.topic} ${snippet.source_question} ${(snippet.tags || []).join(" ")}`.toLowerCase();
    if (filters.query && !blob.includes(filters.query.toLowerCase())) return false;
    if (filters.student_id !== "all" && snippet.student_id !== filters.student_id) return false;
    if (filters.category !== "all" && snippet.category !== filters.category) return false;
    if (filters.topic !== "all" && String(snippet.topic || "").toLowerCase() !== String(filters.topic || "").toLowerCase()) return false;
    if (filters.tag && !(snippet.tags || []).some((tag) => tag.toLowerCase().includes(filters.tag.toLowerCase()))) return false;
    if (filters.tone && !String(snippet.tone || "").toLowerCase().includes(filters.tone.toLowerCase())) return false;
    if (filters.reusable !== "all" && String(Boolean(snippet.reusable)) !== filters.reusable) return false;
    return true;
  });
}

function filterScholarships(rows, filters, student, showAllScholarships, trackers, chosenSchoolId) {
  return rows.filter((scholarship) => {
    const blob = scholarshipSearchBlob(scholarship);
    if (filters.query === "missing grade") {
      if (scholarship.grade_requirement) return false;
    } else if (filters.query && !blob.includes(filters.query.toLowerCase())) return false;
    if (filters.eligibility === "now" && !scholarship.eligible_now) return false;
    if (filters.eligibility === "soon" && !scholarship.eligible_soon) return false;
    if (filters.quality !== "all" && Number(scholarship.priority_score || 0) < Number(filters.quality)) return false;
    if (filters.status !== "all" && scholarship.status !== filters.status) return false;
    if (filters.schoolId === "general" && scholarship.is_school_specific) return false;
    if (filters.schoolId === "school_specific" && !scholarship.is_school_specific) return false;
    if (filters.schoolId === "none" && scholarship.school_id) return false;
    if (filters.schoolId && !["all", "none", "general", "school_specific"].includes(filters.schoolId) && scholarship.school_id !== filters.schoolId) return false;
    if (filters.renewable !== "all" && String(Boolean(scholarship.renewable)) !== filters.renewable) return false;
    if (filters.stackable !== "all" && String(scholarship.stackable !== false) !== filters.stackable) return false;
    if (filters.scholarshipCategory !== "all" && scholarship.scholarship_category !== filters.scholarshipCategory) return false;
    if (filters.residentState && String(scholarship.resident_state || "").toLowerCase() !== filters.residentState.toLowerCase()) return false;
    if (!matchesDeadlineWindow(scholarship, filters.deadlineWindow)) return false;
    if (!showAllScholarships && student) {
      if (scholarship.status === "Not Eligible") return false;
      if (chosenSchoolId && scholarship.is_school_specific && scholarship.school_id && scholarship.school_id !== chosenSchoolId) return false;
      const saved = trackers.find((tracker) => tracker.student_id === student.id && tracker.scholarship_id === scholarship.id);
      if (saved?.application_status === "Not Eligible") return false;
      if (!matchesStudentNextSchoolYearScholarship(student, scholarship)) return false;
    }
    return true;
  });
}

function matchesDeadlineWindow(scholarship, deadlineWindow) {
  if (!deadlineWindow || deadlineWindow === "all") return true;
  const deadline = scholarship.scholarship_deadline || scholarship.deadline;
  if (deadlineWindow === "unknown") return !deadline && !scholarship.deadline_raw;
  if (deadlineWindow === "exact") return Boolean(deadline);
  if (!deadline) return false;

  const parsed = parsedDate(deadline);
  if (!parsed) return false;

  const today = startOfDay(new Date());
  const due = startOfDay(parsed);
  if (deadlineWindow === "past") return due < today;

  const days = { next30: 30, next90: 90 }[deadlineWindow];
  if (!days) return true;
  const end = new Date(today);
  end.setDate(end.getDate() + days);
  return due >= today && due <= end;
}

function scholarshipSearchBlob(scholarship) {
  return `${scholarship.name} ${scholarship.award} ${scholarship.status} ${scholarship.eligibility_reason} ${scholarship.notes} ${scholarship.grade_requirement} ${scholarship.resident_state} ${scholarship.source_file} ${scholarship.decision_bucket} ${scholarship.scholarship_category} ${scholarship.school_specific_reason} ${scholarship.school?.name} ${(scholarship.tags || []).join(" ")}`.toLowerCase();
}

function matchesStudentScholarship(student, scholarship) {
  if (!student) return true;

  const blob = scholarshipSearchBlob(scholarship);
  if (scholarship.grade_requirement && !gradeRequirementMatches(student, scholarship.grade_requirement)) return false;
  if (scholarship.age_min || scholarship.age_max) {
    const age = studentAgeFromProfile(student);
    if (age != null) {
      if (scholarship.age_min != null && age < scholarship.age_min) return false;
      if (scholarship.age_max != null && age > scholarship.age_max) return false;
    }
  }

  if (hasMilitaryEligibility(blob) && !hasMilitaryBackground(student)) return false;

  const interestMatch = findProfileInterestMatch(student, blob);
  if (interestMatch === false) return false;

  return true;
}

function matchesStudentNextSchoolYearScholarship(student, scholarship) {
  if (!student) return true;

  const projectedStudent = projectStudentForNextSchoolYear(student);
  const blob = scholarshipSearchBlob(scholarship);
  if (scholarship.resident_state && !studentResidenceStateMatches(projectedStudent, scholarship.resident_state)) return false;
  if (scholarship.grade_requirement && !gradeRequirementMatches(projectedStudent, scholarship.grade_requirement)) return false;
  if (scholarship.age_min || scholarship.age_max) {
    const age = studentAgeFromProfile(projectedStudent, true);
    if (age != null) {
      if (scholarship.age_min != null && age < scholarship.age_min) return false;
      if (scholarship.age_max != null && age > scholarship.age_max) return false;
    }
  }

  if (hasMilitaryEligibility(blob) && !hasMilitaryBackground(projectedStudent)) return false;

  const interestMatch = findProfileInterestMatch(projectedStudent, blob);
  if (interestMatch === false) return false;

  return true;
}

function projectStudentForNextSchoolYear(student) {
  return {
    ...student,
    grade_level: nextGradeLevel(student.grade_level),
    graduation_year: student.graduation_year ? Number(student.graduation_year) + 1 : null,
  };
}

function studentResidenceStateMatches(student, residentState) {
  return String(student?.residence_state || "").trim().toLowerCase() === String(residentState || "").trim().toLowerCase();
}

function nextGradeLevel(gradeLevel) {
  const normalized = String(gradeLevel || "").toLowerCase();
  const nextGradeMap = {
    "9th grade": "10th Grade",
    "10th grade": "11th Grade",
    "11th grade": "12th Grade",
    "12th grade": "College",
    college: "Graduate",
    graduate: "Graduate",
    other: "Other",
  };
  return nextGradeMap[normalized] || gradeLevel || null;
}

function studentProfileBlob(student) {
  return [
    student.residence_state,
    student.grade_level,
    student.graduation_year,
    student.gpa,
    student.interests,
    student.activities,
    student.clubs,
    student.sports,
    student.volunteer_hours,
    student.volunteer_work,
    student.church_involvement,
    student.awards,
    student.work_experience,
    student.career_interests,
    student.military_family_background,
    student.notes,
  ]
    .filter((value) => value !== null && value !== undefined && value !== "")
    .join(" ")
    .toLowerCase();
}

function gradeRequirementMatches(student, gradeRequirement) {
  const requirement = String(gradeRequirement || "").toLowerCase();
  if (!requirement.trim()) return true;

  const grade = String(student.grade_level || "").toLowerCase();
  const gradYear = Number(student.graduation_year || 0);
  const requirementGrade = parseGradeLevel(requirement);
  const studentGrade = parseGradeLevel(grade);
  const seniorLike = grade.includes("12") || grade.includes("senior") || (gradYear && gradYear <= new Date().getFullYear() + 1);
  const juniorLike = grade.includes("11") || grade.includes("junior");
  const sophomoreLike = grade.includes("10") || grade.includes("sophomore");
  const freshmanLike = grade.includes("9") || grade.includes("freshman");
  const collegeLike = grade.includes("college") || grade.includes("university");

  if (requirementGrade != null && studentGrade != null) {
    if (requirementGrade === 13) return collegeLike;
    if (requirementGrade === 12) return studentGrade >= 12 || seniorLike || collegeLike;
    if (requirementGrade === 11) return studentGrade >= 11 || juniorLike || seniorLike;
    if (requirementGrade === 10) return studentGrade >= 10 || sophomoreLike || juniorLike || seniorLike;
    if (requirementGrade === 9) return studentGrade >= 9 || freshmanLike || sophomoreLike || juniorLike || seniorLike;
  }

  if (requirement.includes("senior") && !seniorLike) return false;
  if (requirement.includes("junior") && !juniorLike) return false;
  if (requirement.includes("sophomore") && !sophomoreLike) return false;
  if (requirement.includes("freshman") && !freshmanLike && !collegeLike) return false;
  if (requirement.includes("high school") && collegeLike) return false;
  if (requirement.includes("college") && !collegeLike && !seniorLike) return false;

  return true;
}

function parseGradeLevel(text) {
  const normalized = String(text || "").toLowerCase();
  if (normalized.includes("college") || normalized.includes("university") || normalized.includes("undergrad")) return 13;
  if (normalized.includes("graduate") || normalized.includes("grad school")) return 14;
  const match = normalized.match(/\b(9|10|11|12)(?:st|nd|rd|th)?\b/);
  return match ? Number(match[1]) : null;
}

function studentAgeFromProfile(student, nextSchoolYear = false) {
  if (!student.graduation_year) return null;
  const currentYear = new Date().getFullYear();
  const projectedAge = 18 + (Number(student.graduation_year) - currentYear) + (nextSchoolYear ? 1 : 0);
  return Number.isFinite(projectedAge) ? projectedAge : null;
}

function hasMilitaryEligibility(blob) {
  return ["military", "veteran", "dependent", "service member", "armed forces"].some((word) => blob.includes(word));
}

function hasMilitaryBackground(student) {
  return Boolean(String(student.military_family_background || "").trim()) || String(student.notes || "").toLowerCase().includes("veteran") || String(student.interests || "").toLowerCase().includes("military");
}

function findProfileInterestMatch(student, blob) {
  const interestBlob = `${student.interests || ""} ${student.career_interests || ""} ${student.activities || ""} ${student.volunteer_work || ""} ${student.church_involvement || ""} ${student.work_experience || ""}`.toLowerCase();
  if (!interestBlob.trim()) return true;

  const words = interestBlob
    .split(/[,;/\n]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .flatMap((value) => value.split(/\s+/).filter((word) => word.length > 3));

  if (!words.length) return true;
  return words.some((word) => blob.includes(word.toLowerCase()));
}

function filterLocalLeads(rows, filters) {
  return rows.filter((lead) => {
    const tags = lead.possible_fit_tags || [];
    const blob = `${lead.title} ${lead.organization_name} ${lead.organization_type} ${lead.city} ${lead.county} ${lead.notes} ${tags.join(" ")}`.toLowerCase();
    if (filters.query && !blob.includes(filters.query.toLowerCase())) return false;
    if (filters.status !== "all" && lead.lead_status !== filters.status) return false;
    if (filters.organization_type !== "all" && lead.organization_type !== filters.organization_type) return false;
    if (filters.quick === "to_check" && lead.lead_status !== "To Check") return false;
    if (filters.quick === "follow_up" && lead.lead_status !== "Follow Up Needed") return false;
    if (filters.quick === "confirmed" && lead.lead_status !== "Confirmed Opportunity" && !lead.confirmed_scholarship) return false;
    if (filters.quick === "military" && !hasLeadTag(tags, ["military", "veteran"])) return false;
    if (filters.quick === "leadership" && !hasLeadTag(tags, ["leadership"])) return false;
    if (filters.quick === "faith" && !hasLeadTag(tags, ["faith", "church"])) return false;
    if (filters.quick === "work_ethic" && !hasLeadTag(tags, ["work ethic", "employment"])) return false;
    if (filters.quick === "local_iowa" && !hasLeadTag(tags, ["local iowa"]) && lead.state !== "Iowa") return false;
    return true;
  });
}

function filterTasks(rows, filters) {
  const today = startOfDay(new Date());
  const soon = new Date(today);
  soon.setDate(soon.getDate() + 14);

  return rows.filter((task) => {
    if (filters.student_id !== "all" && task.student_id !== filters.student_id) return false;
    if (filters.scholarship_id !== "all" && task.scholarship_id !== filters.scholarship_id) return false;
    if (filters.task_type !== "all" && task.task_type !== filters.task_type) return false;
    if (filters.dueSoon) {
      const due = task.due_date ? parseISO(task.due_date) : null;
      if (!due || due < today || due > soon) return false;
    }
    return true;
  });
}

function hasLeadTag(tags, needles) {
  return tags.some((tag) => needles.some((needle) => tag.toLowerCase().includes(needle)));
}

function normalizeLeadForm(lead) {
  return {
    title: lead.title?.trim(),
    organization_name: lead.organization_name?.trim(),
    organization_type: lead.organization_type || null,
    contact_name: lead.contact_name?.trim() || null,
    contact_email: lead.contact_email?.trim() || null,
    contact_phone: lead.contact_phone?.trim() || null,
    address: lead.address?.trim() || null,
    city: lead.city?.trim() || null,
    county: lead.county?.trim() || null,
    state: lead.state?.trim() || "Iowa",
    possible_fit_tags: Array.isArray(lead.possible_fit_tags) ? lead.possible_fit_tags : parseTags(lead.possible_fit_tags),
    lead_status: lead.lead_status || "To Check",
    last_contacted_at: lead.last_contacted_at || null,
    follow_up_date: lead.follow_up_date || null,
    notes: lead.notes?.trim() || null,
    website: lead.website?.trim() || null,
    application_link: lead.application_link?.trim() || null,
    confirmed_scholarship: Boolean(lead.confirmed_scholarship),
    estimated_award: lead.estimated_award?.trim() || null,
    typical_deadline: lead.typical_deadline?.trim() || null,
  };
}

function leadToDraft(lead) {
  return {
    ...lead,
    possible_fit_tags: (lead.possible_fit_tags || []).join(", "),
    last_contacted_at: lead.last_contacted_at || "",
    follow_up_date: lead.follow_up_date || "",
    contact_name: lead.contact_name || "",
    contact_email: lead.contact_email || "",
    contact_phone: lead.contact_phone || "",
    estimated_award: lead.estimated_award || "",
    typical_deadline: lead.typical_deadline || "",
    website: lead.website || "",
    application_link: lead.application_link || "",
    notes: lead.notes || "",
  };
}

function normalizeTaskTemplate(template) {
  return {
    id: template.id,
    scholarship_id: template.scholarship_id,
    title: template.title?.trim(),
    description: template.description?.trim() || null,
    task_type: template.task_type || null,
    suggested_due_offset_days: Number(template.suggested_due_offset_days || 0),
    sort_order: Number(template.sort_order || 0),
    required: Boolean(template.required),
  };
}

function suggestSnippets(answer) {
  const sentences = String(answer.answer_text || "").match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((item) => item.trim()).filter(Boolean) || [];
  if (sentences.length < 2) return [];

  const chunks = [];
  for (let index = 0; index < sentences.length; index += 2) {
    const chunk = sentences.slice(index, index + 3).join(" ").trim();
    const counts = countText(chunk);
    if (counts.words >= 18) chunks.push(chunk);
  }

  const categorized = chunks.map((text) => buildSnippetDraft(answer, text));
  const unique = [];
  const seen = new Set();
  for (const item of categorized.sort((a, b) => scoreSnippet(b) - scoreSnippet(a))) {
    const key = `${item.category}:${item.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= 8) break;
  }

  return unique.slice(0, Math.max(3, Math.min(unique.length, 8)));
}

function buildSnippetDraft(answer, text) {
  const analysis = analyzeSnippetText(text);
  const counts = countText(text);
  return {
    local_id: makeLocalId(),
    answer_id: answer.id,
    student_id: answer.student_id,
    scholarship_id: answer.scholarship_id || null,
    title: analysis.title,
    snippet_text: text,
    category: analysis.category,
    topic: analysis.topic,
    tags: [...new Set([...(answer.tags || []), ...analysis.tags])].slice(0, 8),
    theme: analysis.theme,
    tone: answer.tone || analysis.tone,
    word_count: counts.words,
    character_count: counts.characters,
    source_question: answer.question_text,
    reusable: true,
  };
}

function analyzeSnippetText(text) {
  const lower = text.toLowerCase();
  const rules = [
    ["military_family_background", ["military", "veteran", "service member", "deployment", "army", "navy", "air force", "marine"], "Military family background", "Military family background", ["military family", "veteran dependent"]],
    ["leadership", ["lead", "leader", "captain", "mentor", "organized", "responsible for"], "Leadership example", "Leadership", ["leadership"]],
    ["volunteering", ["volunteer", "community service", "served at", "hours", "nonprofit"], "Volunteer service", "Service", ["volunteer work", "community service"]],
    ["service", ["serve", "service", "helped", "support", "community"], "Service commitment", "Service", ["service", "community"]],
    ["resilience", ["challenge", "overcame", "difficult", "struggle", "resilience", "adapt"], "Resilience example", "Resilience", ["overcoming challenges"]],
    ["goals", ["goal", "future", "plan", "hope to", "want to", "college"], "Future goals", "Future goals", ["career goals"]],
    ["career_interest", ["career", "profession", "major", "stem", "healthcare", "education"], "Career interest", "Career interest", ["career goals"]],
    ["character", ["integrity", "character", "values", "responsibility", "commitment"], "Personal values", "Character", ["character"]],
  ];
  const match = rules.find(([, words]) => words.some((word) => lower.includes(word)));
  const category = match?.[0] || "personal_statement";
  const title = match?.[2] || titleFromText(text);
  const topic = match?.[3] || "General";
  const tags = match?.[4] || ["personal statement"];

  return {
    category,
    title,
    topic,
    tags,
    theme: title.toLowerCase(),
    tone: lower.includes("grateful") || lower.includes("thankful") ? "grateful" : "sincere",
  };
}

function scoreSnippet(snippet) {
  const categoryBoost = snippet.category === "personal_statement" ? 0 : 2;
  return categoryBoost + Math.min(snippet.word_count / 40, 4);
}

function titleFromText(text) {
  const words = text.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean).slice(0, 5);
  return words.length ? words.join(" ") : "Reusable snippet";
}

function normalizeCsvHeader(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeCsvRow(row, sourceFile) {
  const rawDeadline = row.deadline?.trim() || null;
  const rawAdmissionDeadline = row.admission_deadline?.trim() || null;
  const rawScholarshipDeadline = row.scholarship_deadline?.trim() || rawDeadline;
  const isSchoolSpecific = String(row.is_school_specific || "").trim().toLowerCase() === "true";

  return {
    name: row.name?.trim(),
    link: row.link?.trim() || null,
    award: row.award?.trim() || null,
    tags: parseTags(row.tags || row.common_tags || row.possible_fit_tags || ""),
    deadline: toDate(rawDeadline),
    deadline_raw: rawDeadline,
    school_name: row.school_name?.trim() || null,
    school_type: row.school_type?.trim() || null,
    school_specific_reason: row.school_specific_reason?.trim() || null,
    decision_bucket: row.decision_bucket?.trim() || null,
    scholarship_category: row.scholarship_category?.trim() || null,
    is_school_specific: isSchoolSpecific,
    requires_admission: toBool(row.requires_admission),
    stackable: row.stackable_assumption ? toBool(row.stackable_assumption) : true,
    renewable: toBool(row.renewable),
    renewable_years: toInteger(row.renewable_years),
    estimated_total_value: row.estimated_total_value?.trim() || null,
    admission_deadline: toDate(rawAdmissionDeadline),
    scholarship_deadline: toDate(rawScholarshipDeadline),
    status: row.status?.trim() || null,
    source_file: row.source_file?.trim() || sourceFile,
    last_verified_at: toDate(row.last_verified_at),
    eligibility_reason: row.eligibility_reason?.trim() || null,
    age_min: toInteger(row.age_min),
    age_max: toInteger(row.age_max),
    grade_requirement: row.grade_requirement?.trim() || null,
    eligible_now: toBool(row.eligible_now),
    eligible_soon: toBool(row.eligible_soon),
    priority_score: Number(row.priority_score || 0),
    resident_state: row.resident_state?.trim() || null,
    notes: row.notes?.trim() || null,
  };
}

function scholarshipToDraft(scholarship) {
  return {
    name: scholarship.name || "",
    link: scholarship.link || "",
    award: scholarship.award || "",
    tags: (scholarship.tags || []).join(", "),
    deadline: scholarship.deadline || "",
    deadline_raw: scholarship.deadline_raw || "",
    school_name: scholarship.school?.name || "",
    school_type: scholarship.school?.school_type || "",
    is_school_specific: Boolean(scholarship.is_school_specific),
    requires_admission: Boolean(scholarship.requires_admission),
    school_specific_reason: scholarship.school_specific_reason || "",
    decision_bucket: scholarship.decision_bucket || "",
    stackable: scholarship.stackable !== false,
    scholarship_category: scholarship.scholarship_category || "",
    renewable: Boolean(scholarship.renewable),
    renewable_years: scholarship.renewable_years ?? "",
    estimated_total_value: scholarship.estimated_total_value || "",
    admission_deadline: scholarship.admission_deadline || "",
    scholarship_deadline: scholarship.scholarship_deadline || "",
    status: scholarship.status || "",
    source_file: scholarship.source_file || "",
    last_verified_at: scholarship.last_verified_at || "",
    eligibility_reason: scholarship.eligibility_reason || "",
    age_min: scholarship.age_min ?? "",
    age_max: scholarship.age_max ?? "",
    grade_requirement: scholarship.grade_requirement || "",
    eligible_now: Boolean(scholarship.eligible_now),
    eligible_soon: Boolean(scholarship.eligible_soon),
    priority_score: scholarship.priority_score ?? 0,
    resident_state: scholarship.resident_state || "",
    notes: scholarship.notes || "",
  };
}

function normalizeScholarshipForm(scholarship) {
  return {
    name: scholarship.name?.trim(),
    link: scholarship.link?.trim() || null,
    award: scholarship.award?.trim() || null,
    tags: parseTags(scholarship.tags),
    deadline: scholarship.deadline || null,
    deadline_raw: scholarship.deadline_raw?.trim() || null,
    school_name: scholarship.school_name?.trim() || null,
    school_type: scholarship.school_type?.trim() || null,
    is_school_specific: Boolean(scholarship.is_school_specific),
    requires_admission: Boolean(scholarship.requires_admission),
    school_specific_reason: scholarship.school_specific_reason?.trim() || null,
    decision_bucket: scholarship.decision_bucket?.trim() || null,
    stackable: Boolean(scholarship.stackable),
    scholarship_category: scholarship.scholarship_category?.trim() || null,
    renewable: Boolean(scholarship.renewable),
    renewable_years: scholarship.renewable_years === "" ? null : Number(scholarship.renewable_years) || null,
    estimated_total_value: scholarship.estimated_total_value?.trim() || null,
    admission_deadline: scholarship.admission_deadline || null,
    scholarship_deadline: scholarship.scholarship_deadline || null,
    status: scholarship.status?.trim() || null,
    source_file: scholarship.source_file?.trim() || null,
    last_verified_at: scholarship.last_verified_at || null,
    eligibility_reason: scholarship.eligibility_reason?.trim() || null,
    age_min: scholarship.age_min === "" ? null : Number(scholarship.age_min),
    age_max: scholarship.age_max === "" ? null : Number(scholarship.age_max),
    grade_requirement: scholarship.grade_requirement?.trim() || null,
    eligible_now: Boolean(scholarship.eligible_now),
    eligible_soon: Boolean(scholarship.eligible_soon),
    priority_score: Number(scholarship.priority_score || 0),
    resident_state: scholarship.resident_state?.trim() || null,
    notes: scholarship.notes?.trim() || null,
  };
}

function blankSchoolOptionDraft() {
  return {
    school_name: "",
    school_type: "",
    city: "",
    state: "",
    website: "",
    school_notes: "",
    interest_level: "Considering",
    admission_status: "Not Applied",
    estimated_cost_of_attendance: "",
    estimated_aid: "",
    estimated_scholarships: "",
    estimated_out_of_pocket: "",
    pros: "",
    cons: "",
    notes: "",
    school_specific_reason: "",
  };
}

function blankSchoolComparisonNoteDraft(schoolId = "") {
  return {
    school_id: schoolId,
    category: SCHOOL_COMPARISON_CATEGORIES[0],
    note: "",
    score: 3,
  };
}

function getScholarshipSchoolSpecificVisibility(scholarship, chosenSchoolId) {
  if (!scholarship?.is_school_specific) return "general";
  if (!scholarship.school_id) return "school_specific";
  if (!chosenSchoolId) return "school_specific";
  return scholarship.school_id === chosenSchoolId ? "chosen" : "not_usable";
}

function scholarshipMatchesSchool(scholarship, school) {
  if (!scholarship?.is_school_specific || !school) return false;
  if (scholarship.school_id && scholarship.school_id === school.id) return true;
  return String(scholarship.school?.name || "").trim().toLowerCase() === String(school.name || "").trim().toLowerCase();
}

function groupScholarshipsByDecisionBucket(rows) {
  return rows.reduce((groups, scholarship) => {
    const bucket = scholarship.decision_bucket || scholarship.scholarship_category || "General";
    if (!groups[bucket]) groups[bucket] = [];
    groups[bucket].push(scholarship);
    return groups;
  }, {});
}

function generateSchoolTaskLabels(option, schoolScholarships) {
  const labels = [];
  if (option.admission_status === "Not Applied") labels.push("Apply for admission");
  if (option.admission_status === "Applied") labels.push("Check admission status");
  if (schoolScholarships.some((scholarship) => scholarship.requires_admission)) labels.push("Confirm admission requirement");
  const decisionBuckets = [...new Set(schoolScholarships.map((scholarship) => scholarship.decision_bucket).filter(Boolean))];
  decisionBuckets.forEach((bucket) => labels.push(`Review decision bucket: ${bucket}`));
  labels.push("Check school scholarship portal");
  labels.push("Submit FAFSA if required");
  labels.push("Request transcript");
  if (schoolScholarships.some((scholarship) => scholarship.renewable)) labels.push("Check renewable requirements");
  labels.push("Compare award letter");
  labels.push("Decide whether scholarship is usable");
  return [...new Set(labels)];
}

function buildSchoolComparisonRows(scholarships, schoolOptions) {
  return schoolOptions.map((option) => {
    const schoolScholarships = scholarships.filter((scholarship) => scholarshipMatchesSchool(scholarship, option.school));
    const awarded = schoolScholarships.filter((scholarship) => scholarship.is_school_specific);
    const deadlines = [
      ...schoolScholarships.flatMap((scholarship) => [
        scholarship.admission_deadline ? `Admission: ${scholarship.admission_deadline}` : null,
        scholarship.scholarship_deadline ? `Scholarship: ${scholarship.scholarship_deadline}` : null,
      ]),
    ].filter(Boolean);

    return {
      school_id: option.school_id,
      school: option.school,
      admission_status: option.admission_status,
      scholarship_count: schoolScholarships.length,
      estimated_scholarship_value: sumScholarshipValue(awarded),
      cost_of_attendance: option.estimated_cost_of_attendance,
      out_of_pocket: option.estimated_out_of_pocket,
      renewable_awards: awarded.filter((scholarship) => scholarship.renewable).length,
      stackable: awarded.length ? awarded.every((scholarship) => scholarship.stackable !== false) : true,
      deadlines,
      notes: option.notes || option.pros || option.cons || option.school?.notes || "—",
    };
  });
}

function buildStudentSchoolFinancialSummary(student, schools, scholarships, trackers, schoolOptions, chosenSchoolId) {
  const generalScholarships = scholarships.filter((scholarship) => !scholarship.is_school_specific);
  const schoolSpecificScholarships = scholarships.filter((scholarship) => scholarship.is_school_specific);
  const chosenOption = schoolOptions.find((option) => option.school_id === chosenSchoolId) || null;
  const chosenSchoolScholarships = schoolSpecificScholarships.filter((scholarship) => getScholarshipSchoolSpecificVisibility(scholarship, chosenSchoolId) === "chosen");
  const trackerAwards = trackers.filter((tracker) => tracker.student_id === student.id);
  const confirmedAwards = trackerAwards.filter((tracker) => ["Won", "Offered", "Accepted"].includes(tracker.application_status));
  const potentialAwards = trackerAwards.filter((tracker) => !["Won", "Lost", "Not Eligible"].includes(tracker.application_status));
  const chosenPackageScholarshipTotal = chosenSchoolScholarships.reduce((sum, scholarship) => sum + scholarshipValue(scholarship), 0);
  const chosenPackageOptionTotal = chosenOption ? parseMoneyValue(chosenOption.estimated_scholarships) : 0;

  return {
    general: {
      total: generalScholarships.reduce((sum, scholarship) => sum + scholarshipValue(scholarship), 0),
      count: generalScholarships.length,
    },
    schoolSpecific: {
      totalPotential: schoolSpecificScholarships.reduce((sum, scholarship) => sum + scholarshipValue(scholarship), 0),
      count: schoolSpecificScholarships.length,
    },
    confirmed: {
      total: confirmedAwards.reduce((sum, tracker) => sum + scholarshipValue(tracker.scholarship), 0),
      count: confirmedAwards.length,
    },
    potential: {
      total: potentialAwards.reduce((sum, tracker) => sum + scholarshipValue(tracker.scholarship), 0),
      count: potentialAwards.length,
    },
    chosenPackage: {
      total: chosenPackageScholarshipTotal + chosenPackageOptionTotal,
      count: chosenSchoolScholarships.length + (chosenOption ? 1 : 0),
    },
  };
}

function buildPortfolioSummaryText({
  student,
  scholarships,
  trackers,
  workspaces,
  answers,
  snippets,
  tasks,
  leads,
  projectIdeas,
  schoolOptions,
  comparisonNotes,
}) {
  const trackerScholarshipIds = new Set(trackers.map((tracker) => tracker.scholarship_id).filter(Boolean));
  const workspaceScholarshipIds = new Set(workspaces.map((workspace) => workspace.scholarship_id).filter(Boolean));
  const researchedScholarshipIds = new Set([...trackerScholarshipIds, ...workspaceScholarshipIds]);
  const applicationsStarted = trackers.filter((tracker) => !["Not Started", "Not Eligible"].includes(tracker.application_status)).length || workspaces.length;
  const applicationsSubmitted = trackers.filter((tracker) => ["Submitted", "Won", "Lost"].includes(tracker.application_status)).length;
  const tasksCompleted = tasks.filter((task) => task.completed).length;
  const potentialAid = trackers
    .filter((tracker) => !["Lost", "Not Eligible"].includes(tracker.application_status))
    .reduce((sum, tracker) => sum + scholarshipValue(tracker.scholarship), 0);
  const awardedAid = trackers
    .filter((tracker) => ["Won", "Accepted", "Offered"].includes(tracker.application_status))
    .reduce((sum, tracker) => sum + scholarshipValue(tracker.scholarship), 0);
  const contactedLeads = leads.filter((lead) => lead.last_contacted_at || !["To Check", "No Scholarship", "Not a Fit"].includes(lead.lead_status)).length;
  const responseLeads = leads.filter((lead) => ["Follow Up Needed", "Confirmed Opportunity", "No Scholarship", "Not a Fit", "Applied", "Won", "Lost"].includes(lead.lead_status)).length;
  const responseRate = contactedLeads ? Math.round((responseLeads / contactedLeads) * 100) : null;
  const matchedScholarships = scholarships.filter((scholarship) => matchesStudentNextSchoolYearScholarship(student, scholarship)).length;
  const selectedSchoolOptions = schoolOptions.length;
  const profileFocus = summarizeStudentFocus(student);
  const activities = summarizeStudentActivities(student);
  const metrics = [
    `Scholarships researched or tracked: ${researchedScholarshipIds.size || trackers.length}`,
    `Profile-matched opportunities identified: ${matchedScholarships}`,
    `Local leads contacted or advanced: ${contactedLeads}`,
    `Applications started: ${applicationsStarted}`,
    `Applications submitted: ${applicationsSubmitted}`,
    `Reusable answers saved: ${answers.length}`,
    `Reusable snippets saved: ${snippets.length}`,
    `Application tasks completed: ${tasksCompleted}`,
    potentialAid ? `Potential aid tracked: ${formatCurrency(potentialAid)}` : null,
    awardedAid ? `Awarded or offered aid tracked: ${formatCurrency(awardedAid)}` : null,
    responseRate != null ? `Local outreach response rate: ${responseRate}%` : null,
    selectedSchoolOptions ? `School options compared: ${selectedSchoolOptions}` : null,
  ].filter(Boolean);

  const schoolComparisonLine = selectedSchoolOptions
    ? ` I also compared ${selectedSchoolOptions} school option${selectedSchoolOptions === 1 ? "" : "s"} and reviewed scholarship-package details before treating school-specific awards as usable aid.`
    : "";
  const projectLine = projectIdeas.length
    ? ` I also tracked ${projectIdeas.length} project or essay idea${projectIdeas.length === 1 ? "" : "s"} connected to scholarship work.`
    : "";
  const comparisonNoteLine = comparisonNotes.length
    ? ` I documented school comparison notes across categories like cost, fit, campus life, and scholarship packages.`
    : "";

  return `# Scholarship & Opportunity Achievement Portfolio - ${student.name}

## Professional Summary
I designed and managed a full scholarship pipeline from research to submission — without being assigned to. I built a system to filter opportunities by eligibility, fit, and award value, maintained a reusable response bank so strong answers were always ready, and reached out directly to local organizations to find opportunities that were not widely advertised. Every step was self-directed and self-managed.${schoolComparisonLine}${projectLine}

## Student Profile
- Grade level: ${student.grade_level || "Not listed"}
- Graduation year: ${student.graduation_year || "Not listed"}
- Interests: ${profileFocus || "Not listed"}
- Activities and experience: ${activities || "Not listed"}

## Results at a Glance
${metrics.map((item) => `- ${item}`).join("\n")}

## Key Accomplishments
- Independently built and ran a scholarship tracking system — organized by eligibility, deadline, award size, and fit.
- ${researchedScholarshipIds.size || trackers.length} scholarships researched and evaluated; only the strongest matches pursued.
- Initiated direct outreach to ${contactedLeads} local organization${contactedLeads === 1 ? "" : "s"} to uncover opportunities not listed in standard databases.
- Assembled a reusable answer bank of ${answers.length} response${answers.length === 1 ? "" : "s"} and ${snippets.length} snippet${snippets.length === 1 ? "" : "s"} to keep every application sharp and consistent.
- Drove ${applicationsSubmitted} application${applicationsSubmitted === 1 ? "" : "s"} to submission while managing deadlines, requirements, and follow-up independently.
${selectedSchoolOptions ? `- Evaluated ${selectedSchoolOptions} school-specific scholarship package${selectedSchoolOptions === 1 ? "" : "s"} separately from general aid to avoid inflated estimates.` : ""}

## Core Competencies
- **Initiative & Ownership:** Took full responsibility for the process — no one assigned it, tracked it, or followed up. I built the system and ran it.
- **Organization & Systems Thinking:** Maintained a structured pipeline across research, drafting, review, and submission with no dropped deadlines.
- **Communication & Outreach:** Reached out to local organizations proactively and followed up to advance leads through the pipeline.
- **Data-Driven Decision-Making:** Filtered opportunities by profile match and award value instead of applying indiscriminately.
- **Follow-Through & Accountability:** Completed ${tasksCompleted} tracked task${tasksCompleted === 1 ? "" : "s"} across every stage — research, writing, review, and submission.
- **Efficiency & Preparation:** Built reusable systems so effort compounded over time rather than starting from scratch each application.

## Evidence Summary
- ${contactedLeads} local lead${contactedLeads === 1 ? "" : "s"} contacted or advanced — sourcing opportunities beyond standard scholarship databases.
- ${answers.length} reusable answer${answers.length === 1 ? "" : "s"} and ${snippets.length} snippet${snippets.length === 1 ? "" : "s"} built to accelerate future applications without sacrificing quality.
- ${tasksCompleted} application task${tasksCompleted === 1 ? "" : "s"} completed across research, drafting, deadlines, and submission.
${selectedSchoolOptions ? `- ${selectedSchoolOptions} school option${selectedSchoolOptions === 1 ? "" : "s"} evaluated for scholarship packages, cost, and fit — not just rankings.` : ""}${comparisonNoteLine}

## What This Experience Reflects
This work showed me what I can do when I take full ownership of a process. I learned to prioritize ruthlessly, follow through on details, and build systems that make the work sustainable. The habits I built here — structured thinking, proactive outreach, and keeping strong work ready to go — are exactly what I intend to bring to every role I take on.

## Why It Transfers
The skills demonstrated here map directly to what high-performing teams need: the ability to manage complexity without being managed, to communicate proactively, to build systems instead of just completing tasks, and to deliver results. Whether in college, a career, or a leadership role${profileFocus ? ` in ${profileFocus}` : ""} — I know how to take a goal, build a plan, and see it through.`;
}

function summarizeStudentFocus(student) {
  return [student.interests, student.career_interests]
    .filter(Boolean)
    .join("; ")
    .trim();
}

function summarizeStudentActivities(student) {
  return [student.activities, student.clubs, student.sports, student.volunteer_work, student.church_involvement, student.work_experience, student.military_family_background]
    .filter(Boolean)
    .join("; ")
    .trim();
}

function blankServiceLogDraft(studentId = "", activityDate = format(new Date(), "yyyy-MM-dd")) {
  return {
    student_id: studentId,
    activity_date: activityDate,
    hours: "",
    organization_name: "",
    activity_title: "",
    category: "",
    tags: "",
    description: "",
    impact_description: "",
    skills_used: "",
    people_served: "",
    leadership_role: false,
    recurring_activity: false,
    verification_contact_name: "",
    verification_contact_email: "",
    proof_url: "",
    reflection: "",
  };
}

function blankServiceAchievementDraft(studentId = "", serviceLogId = null, dateEarned = format(new Date(), "yyyy-MM-dd")) {
  return {
    student_id: studentId,
    service_log_id: serviceLogId,
    title: "",
    description: "",
    achievement_type: "",
    date_earned: dateEarned,
    tags: "",
    resume_bullet: "",
    scholarship_angle: "",
  };
}

function serviceLogToDraft(log) {
  return {
    student_id: log.student_id,
    activity_date: log.activity_date || format(new Date(), "yyyy-MM-dd"),
    hours: log.hours ?? "",
    organization_name: log.organization_name || "",
    activity_title: log.activity_title || "",
    category: log.category || "",
    tags: (log.tags || []).join(", "),
    description: log.description || "",
    impact_description: log.impact_description || "",
    skills_used: (log.skills_used || []).join(", "),
    people_served: log.people_served ?? "",
    leadership_role: Boolean(log.leadership_role),
    recurring_activity: Boolean(log.recurring_activity),
    verification_contact_name: log.verification_contact_name || "",
    verification_contact_email: log.verification_contact_email || "",
    proof_url: log.proof_url || "",
    reflection: log.reflection || "",
  };
}

function filterServiceLogs(rows, filters) {
  return rows.filter((log) => {
    const blob = `${log.organization_name} ${log.activity_title} ${log.category} ${(log.tags || []).join(" ")} ${(log.skills_used || []).join(" ")}`.toLowerCase();
    if (filters.student_id !== "all" && log.student_id !== filters.student_id) return false;
    if (filters.year !== "all" && String(new Date(log.activity_date).getFullYear()) !== String(filters.year)) return false;
    if (filters.category !== "all" && String(log.category || "") !== String(filters.category)) return false;
    if (filters.organization && !String(log.organization_name || "").toLowerCase().includes(filters.organization.toLowerCase())) return false;
    if (filters.tag && !(log.tags || []).some((tag) => tag.toLowerCase().includes(filters.tag.toLowerCase()))) return false;
    if (filters.leadership_role === "true" && !log.leadership_role) return false;
    if (filters.leadership_role === "false" && log.leadership_role) return false;
    if (filters.start_date && new Date(log.activity_date) < new Date(`${filters.start_date}T00:00:00`)) return false;
    if (filters.end_date && new Date(log.activity_date) > new Date(`${filters.end_date}T23:59:59`)) return false;
    return !filters.query || blob.includes(filters.query.toLowerCase());
  });
}

function summarizeServiceLogsForStudent(student, logs) {
  return summarizeServiceLogs(logs, student);
}

function summarizeServiceFamily(logs, students) {
  const familySummary = summarizeServiceLogs(logs, null);
  const studentTotals = students.map((student) => ({
    student,
    ...summarizeServiceLogs(logs.filter((log) => log.student_id === student.id), student),
  })).sort((a, b) => b.totalHours - a.totalHours);

  return {
    ...familySummary,
    studentTotals,
  };
}

function summarizeServiceLogs(logs, student) {
  const sortedLogs = [...logs].sort((a, b) => new Date(b.activity_date) - new Date(a.activity_date));
  const totalHours = sortedLogs.reduce((sum, log) => sum + Number(log.hours || 0), 0);
  const leadershipHours = sortedLogs.filter((log) => log.leadership_role).reduce((sum, log) => sum + Number(log.hours || 0), 0);
  const mentoringHours = sortedLogs.filter((log) => String(log.category || "").toLowerCase() === "mentoring").reduce((sum, log) => sum + Number(log.hours || 0), 0);
  const hoursByCategory = groupServiceLogHours(sortedLogs, (log) => log.category || "Other");
  const hoursByYear = groupServiceLogHours(sortedLogs, (log) => String(new Date(log.activity_date).getFullYear()));
  const hoursByOrganization = groupServiceLogHours(sortedLogs, (log) => log.organization_name || "Unknown");
  const topCategory = hoursByCategory[0]?.name || null;
  const topOrganization = hoursByOrganization[0]?.name || null;
  const recentHighlights = sortedLogs
    .filter((log) => log.impact_description || log.description || log.reflection)
    .slice(0, 4)
    .map((log) => ({
      key: log.id,
      title: `${formatShortDate(log.activity_date)} · ${log.organization_name}`,
      summary: log.impact_description || log.description || log.reflection || "",
    }));

  return {
    student,
    totalHours,
    totalHoursText: formatServiceHours(totalHours),
    leadershipHours,
    leadershipHoursText: formatServiceHours(leadershipHours),
    mentoringHours,
    mentoringHoursText: formatServiceHours(mentoringHours),
    hoursByCategory,
    hoursByYear,
    hoursByOrganization,
    topCategory,
    topOrganization,
    topOrganizations: hoursByOrganization.slice(0, 4),
    recentHighlights,
    impactStoryCount: recentHighlights.length,
    resumeBullet: buildServiceResumeBullet({
      totalHoursText: formatServiceHours(totalHours),
      leadershipHours,
      leadershipHoursText: formatServiceHours(leadershipHours),
      mentoringHours,
      mentoringHoursText: formatServiceHours(mentoringHours),
      topCategory,
      topOrganization,
    }, sortedLogs, student),
    scholarshipSummary: buildServiceScholarshipSummary({
      totalHoursText: formatServiceHours(totalHours),
      leadershipHoursText: formatServiceHours(leadershipHours),
      mentoringHoursText: formatServiceHours(mentoringHours),
      topOrganization,
    }, sortedLogs, student),
    recommendationNote: buildServiceRecommendationNote({
      totalHoursText: formatServiceHours(totalHours),
      topOrganization,
    }, sortedLogs, student),
    interviewTalkingPoint: buildServiceInterviewTalkingPoint({
      totalHoursText: formatServiceHours(totalHours),
      topOrganization,
    }, sortedLogs, student),
    summaryText: buildServiceImpactSummary({
      totalHoursText: formatServiceHours(totalHours),
      topCategory,
      topOrganization,
    }, sortedLogs, student),
  };
}

function groupServiceLogHours(logs, labelFn) {
  const counts = new Map();
  logs.forEach((log) => {
    const name = labelFn(log);
    if (!name) return;
    const entry = counts.get(name) || { name, totalHours: 0, entryCount: 0 };
    entry.totalHours += Number(log.hours || 0);
    entry.entryCount += 1;
    counts.set(name, entry);
  });

  return [...counts.values()]
    .sort((a, b) => b.totalHours - a.totalHours || b.entryCount - a.entryCount || String(a.name).localeCompare(String(b.name)))
    .map((item) => ({ ...item, totalHoursText: formatServiceHours(item.totalHours) }));
}

function formatServiceHours(hours) {
  const value = Number(hours || 0);
  if (!Number.isFinite(value)) return "0";
  return value % 1 === 0 ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function buildServiceImpactSummary(summary, logs, student) {
  if (!logs.length) {
    return student ? `${student.name} has no service logs recorded yet.` : "No service logs recorded yet.";
  }

  const studentName = student?.name || "This student";
  const category = summary.topCategory || "service";
  const organization = summary.topOrganization || "community organizations";
  const recent = logs[0];
  const highlight = recent.impact_description || recent.description || recent.reflection || "";

  return `${studentName} has logged ${summary.totalHoursText} hours of service, with the strongest concentration in ${category.toLowerCase()} and recurring work at ${organization}. ${highlight ? `Most recent impact note: ${highlight}` : ""}`.trim();
}

function buildServiceResumeBullet(summary, logs, student) {
  if (!logs.length) {
    return student ? `No service hours logged yet for ${student.name}.` : "No service hours logged yet.";
  }

  const category = summary.topCategory || "service";
  const organization = summary.topOrganization || "community organizations";
  const role = summary.leadershipHours > 0 || logs.some((log) => log.leadership_role) ? "leadership" : "service";
  return `Completed ${summary.totalHoursText} hours of ${organization.toLowerCase()} ${category.toLowerCase()} work, supporting others through recurring ${role} and community service.`;
}

function buildServiceScholarshipSummary(summary, logs, student) {
  if (!logs.length) {
    return student ? `${student.name} has no logged service yet.` : "No logged service yet.";
  }

  const studentName = student?.name || "This student";
  return `${studentName} has logged ${summary.totalHoursText} service hours, including ${summary.leadershipHoursText} in leadership roles and ${summary.mentoringHoursText} in mentoring-focused work. Recent entries show consistent service, accountability, and a pattern of helping others.`;
}

function buildServiceRecommendationNote(summary, logs, student) {
  if (!logs.length) {
    return student ? `${student.name} has no logged service yet.` : "No logged service yet.";
  }

  return `Service logs show ${summary.totalHoursText} hours of steady involvement, with repeated service at ${summary.topOrganization || "the same organization"} and clear evidence of responsibility, communication, and follow-through.`;
}

function buildServiceInterviewTalkingPoint(summary, logs, student) {
  if (!logs.length) {
    return student ? `${student.name} can talk about wanting to build a service record.` : "Use the service log to pull a real example.";
  }

  const recent = logs[0];
  const highlight = recent.impact_description || recent.description || recent.reflection || "helping others consistently";
  return `A strong interview talking point: ${summary.totalHoursText} hours of service at ${summary.topOrganization || "a community organization"}, including ${highlight}.`;
}

function scholarshipValue(scholarship) {
  if (!scholarship) return 0;
  return parseMoneyValue(scholarship.estimated_total_value) || parseScholarshipAwardAmount(scholarship.award);
}

function sumScholarshipValue(rows) {
  return rows.reduce((sum, scholarship) => sum + scholarshipValue(scholarship), 0);
}

function parseMoneyValue(value) {
  if (value == null || value === "") return 0;
  const numeric = Number(String(value).replace(/[$,]/g, ""));
  if (Number.isFinite(numeric)) return numeric;
  return parseScholarshipAwardAmount(value);
}

function formatMoneyEstimate(value) {
  const amount = parseMoneyValue(value);
  return amount ? formatCurrency(amount) : "—";
}

function parseTags(value) {
  if (Array.isArray(value)) return value;
  return String(value || "").split(",").map((tag) => tag.trim()).filter(Boolean);
}

function toBool(value) {
  return ["true", "1", "yes", "y"].includes(String(value).trim().toLowerCase());
}

function toInteger(value) {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDate(value) {
  const input = String(value || "").trim();
  if (!input) return null;

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(input)) {
    const [year, month, day] = input.split("-").map(Number);
    return formatDate(year, month, day);
  }

  const slash = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) return formatDate(Number(slash[3]), Number(slash[1]), Number(slash[2]));

  const named = input.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (named) {
    const month = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ].indexOf(named[1].toLowerCase()) + 1;
    if (month) return formatDate(Number(named[3]), month, Number(named[2]));
  }

  return null;
}

function formatDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function withTimeout(promise, message, timeoutMs = 12000) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

function formatSupabaseError(error) {
  return [error.message, error.details, error.hint, error.code].filter(Boolean).join(" | ");
}

function makeLocalId() {
  return window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildInviteUrl(inviteToken) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const path = typeof window === "undefined" ? "" : window.location.pathname;
  return `${origin}${path}?invite=${encodeURIComponent(inviteToken)}`;
}

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function countText(text) {
  const clean = String(text || "").trim();
  return {
    words: clean ? clean.split(/\s+/).length : 0,
    characters: clean.length,
  };
}

function orderStudents(rows) {
  return [...rows].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

function orderSchools(rows) {
  return [...rows].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

function parsedDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return parseISO(value);
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return parseISO(value);
  const monthMatch = String(value).match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i);
  if (!monthMatch) return null;
  const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const month = months.indexOf(monthMatch[1].toLowerCase());
  const dayMatch = String(value).slice(monthMatch.index + monthMatch[0].length).match(/\b([1-2]?\d|3[0-1])(?:st|nd|rd|th)?\b/i);
  const parsed = new Date(new Date().getFullYear(), month, dayMatch ? Number(dayMatch[1]) : 1);
  if (parsed < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) parsed.setFullYear(parsed.getFullYear() + 1);
  return parsed;
}

function deadlineRank(value) {
  const parsed = parsedDate(value);
  return parsed ? parsed.getTime() : Number.MAX_SAFE_INTEGER;
}

function sameMonth(value) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function topTags(answers) {
  const counts = {};
  answers.forEach((answer) => (answer.tags || []).forEach((tag) => { counts[tag] = (counts[tag] || 0) + 1; }));
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([tag]) => tag);
}

function parseScholarshipAwardAmount(value) {
  const text = String(value || "").replace(/,/g, "");
  if (!text.trim()) return 0;

  const match = text.match(/\$?\s*(\d+(?:\.\d+)?)/);
  if (!match) return 0;

  const amount = Number(match[1]);
  return Number.isFinite(amount) ? amount : 0;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function daysUntil(value) {
  const date = parsedDate(value);
  if (!date) return Number.MAX_SAFE_INTEGER;
  const today = startOfDay(new Date());
  return Math.ceil((startOfDay(date) - today) / 86400000);
}

function formatShortDate(value) {
  const date = parsedDate(value);
  if (!date) return value || "TBD";
  return format(date, "MMM d");
}

function externalUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "#";
  if (/^(https?:|mailto:|tel:)/i.test(text)) return text;
  return `https://${text.replace(/^\/+/, "")}`;
}

function buildCalendarEvents(trackers, tasks) {
  const scholarshipEvents = trackers
    .filter((item) => item.deadline)
    .map((item) => ({
      key: `tracker-${item.id}`,
      type: "deadline",
      date: item.deadline,
      label: `${item.student?.name}: ${item.scholarship?.name}`,
      subLabel: item.application_status,
    }));

  const taskEvents = tasks
    .filter((task) => task.due_date)
    .map((task) => ({
      key: `task-${task.id}`,
      type: "task",
      date: task.due_date,
      label: `${task.student?.name || "Student"}: ${task.title}`,
      subLabel: `${task.scholarship?.name || "General"}${task.completed ? " · completed" : ""}`,
    }));

  return [...scholarshipEvents, ...taskEvents].sort((a, b) => deadlineRank(a.date) - deadlineRank(b.date));
}

function exportAnswers(answers) {
  const csv = Papa.unparse(answers.map((answer) => ({
    student: answer.student?.name,
    scholarship: answer.scholarship?.name,
    question_text: answer.question_text,
    answer_text: answer.answer_text,
    tags: (answer.tags || []).join(", "),
    category: answer.category,
    tone: answer.tone,
    word_count: answer.word_count,
    character_count: answer.character_count,
    application_year: answer.application_year,
    quality_rating: answer.quality_rating,
    last_used_at: answer.last_used_at,
  })));
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "answer-bank.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function ScholarshipReportPage({ students, trackers, tasks, leads = [], answers = [], snippets = [], workspaces = [] }) {
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || "");
  const student = students.find((s) => s.id === selectedStudentId) || students[0];
  const studentTrackers = trackers.filter((t) => t.student_id === student?.id && t.application_status !== "Not Started");

  const submitted = studentTrackers.filter((t) => ["Submitted", "Won", "Lost"].includes(t.application_status));
  const won = studentTrackers.filter((t) => t.application_status === "Won");
  const inProgress = studentTrackers.filter((t) => ["Researching", "Drafting", "Needs Review", "Ready to Submit"].includes(t.application_status));
  const wonTotal = won.reduce((sum, t) => sum + scholarshipValue(t.scholarship), 0);

  const studentTasks = tasks.filter((t) => t.student_id === student?.id);
  const completedTasks = studentTasks.filter((t) => t.completed);

  const studentLeads = leads.filter((l) => l.student_id === student?.id);
  const contactedLeads = studentLeads.filter((l) => l.last_contacted_at || !["To Check", "No Scholarship", "Not a Fit"].includes(l.lead_status));
  const studentAnswers = answers.filter((a) => a.student_id === student?.id);
  const studentSnippets = snippets.filter((s) => s.student_id === student?.id);
  const studentWorkspaces = workspaces.filter((w) => w.student_id === student?.id);

  const trackerIds = new Set(studentTrackers.map((t) => t.scholarship_id).filter(Boolean));
  const workspaceIds = new Set(studentWorkspaces.map((w) => w.scholarship_id).filter(Boolean));
  const totalResearched = new Set([...trackerIds, ...workspaceIds]).size || studentTrackers.length;

  const STATUS_ORDER = ["Won", "Submitted", "Ready to Submit", "Needs Review", "Drafting", "Researching", "Lost", "Not Eligible"];
  const sortedTrackers = [...studentTrackers].sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a.application_status);
    const bi = STATUS_ORDER.indexOf(b.application_status);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const generatedDate = format(new Date(), "MMMM d, yyyy");

  const competencies = [
    {
      label: "Initiative & Ownership",
      evidence: "Designed and managed a scholarship pipeline independently — without being assigned to.",
    },
    {
      label: "Organization & Systems Thinking",
      evidence: `Filtered and tracked ${totalResearched} opportunities by eligibility, deadline, award fit, and requirements.`,
    },
    contactedLeads.length > 0 && {
      label: "Communication & Outreach",
      evidence: `Initiated contact with ${contactedLeads.length} local organization${contactedLeads.length === 1 ? "" : "s"} to surface opportunities not widely advertised.`,
    },
    {
      label: "Data-Driven Decision-Making",
      evidence: "Prioritized opportunities by profile match and award value instead of applying indiscriminately.",
    },
    studentTasks.length > 0 && {
      label: "Follow-Through & Accountability",
      evidence: `Completed ${completedTasks.length} of ${studentTasks.length} tracked tasks across research, drafting, and submission steps.`,
    },
    (studentAnswers.length > 0 || studentSnippets.length > 0) && {
      label: "Efficiency & Preparation",
      evidence: `Built a reusable answer bank with ${studentAnswers.length} saved response${studentAnswers.length === 1 ? "" : "s"} and ${studentSnippets.length} reusable snippet${studentSnippets.length === 1 ? "" : "s"}.`,
    },
  ].filter(Boolean);

  return (
    <div className="reportPage">
      <div className="reportToolbar noPrint">
        <PageHeader title="Scholarship Report" />
        <div className="reportActions">
          {students.length > 1 && (
            <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <button className="primary" onClick={() => window.print()}><Printer size={16} /> Print / Save as PDF</button>
        </div>
      </div>

      <div className="reportDocument">
        <div className="reportHeader">
          <div>
            <h1>{student?.name || "Student"}</h1>
            <p className="reportSubtitle">Scholarship &amp; Opportunity Achievement Portfolio</p>
          </div>
          <div className="reportMeta">
            {student?.graduation_year && <span>Class of {student.graduation_year}</span>}
            {student?.gpa && <span>GPA: {student.gpa}</span>}
            <span>Generated: {generatedDate}</span>
          </div>
        </div>

        <div className="reportSummaryGrid">
          <div className="reportSummaryItem">
            <strong>{totalResearched}</strong>
            <span>Scholarships Researched</span>
          </div>
          <div className="reportSummaryItem">
            <strong>{inProgress.length}</strong>
            <span>In Progress</span>
          </div>
          <div className="reportSummaryItem">
            <strong>{submitted.length}</strong>
            <span>Applications Submitted</span>
          </div>
          <div className="reportSummaryItem reportSummaryWon">
            <strong>{won.length}</strong>
            <span>Awards Won</span>
          </div>
          {wonTotal > 0 && (
            <div className="reportSummaryItem reportSummaryWon">
              <strong>{formatCurrency(wonTotal)}</strong>
              <span>Total Awarded</span>
            </div>
          )}
          {studentTasks.length > 0 && (
            <div className="reportSummaryItem">
              <strong>{completedTasks.length}/{studentTasks.length}</strong>
              <span>Tasks Completed</span>
            </div>
          )}
          {contactedLeads.length > 0 && (
            <div className="reportSummaryItem">
              <strong>{contactedLeads.length}</strong>
              <span>Local Leads Contacted</span>
            </div>
          )}
        </div>

        {competencies.length > 0 && (
          <div className="reportSection">
            <h3 className="reportSectionTitle">Competencies Demonstrated</h3>
            <div className="reportCompetencyGrid">
              {competencies.map((c) => (
                <div key={c.label} className="reportCompetencyItem">
                  <strong>{c.label}</strong>
                  <span>{c.evidence}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {sortedTrackers.length === 0 ? (
          <p className="reportEmpty">No scholarship activity tracked yet.</p>
        ) : (
          <div className="reportSection">
            <h3 className="reportSectionTitle">Application Activity</h3>
            <table className="reportTable">
              <thead>
                <tr>
                  <th>Scholarship</th>
                  <th>Award Amount</th>
                  <th>Deadline</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedTrackers.map((tracker) => (
                  <tr key={tracker.id} className={`reportRow reportRow--${(tracker.application_status || "").toLowerCase().replace(/\s+/g, "-")}`}>
                    <td className="reportScholarshipName">
                      {tracker.scholarship?.name || "—"}
                      {tracker.scholarship?.is_school_specific && tracker.scholarship?.school?.name && (
                        <span className="reportSchoolTag"> · {tracker.scholarship.school.name}</span>
                      )}
                    </td>
                    <td>{tracker.scholarship?.award || tracker.scholarship?.estimated_total_value || "—"}</td>
                    <td>{tracker.deadline || tracker.scholarship?.deadline || tracker.scholarship?.deadline_raw || "—"}</td>
                    <td><span className={`reportStatusBadge reportStatus--${(tracker.application_status || "").toLowerCase().replace(/\s+/g, "-")}`}>{tracker.application_status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(student?.activities || student?.volunteer_work || student?.awards || student?.interests || student?.career_interests || student?.clubs || student?.sports || student?.work_experience || student?.military_family_background) && (
          <div className="reportActivities">
            <h3>Background &amp; Experience</h3>
            {student.interests && <p><strong>Interests:</strong> {student.interests}</p>}
            {student.career_interests && <p><strong>Career interests:</strong> {student.career_interests}</p>}
            {student.activities && <p><strong>Activities:</strong> {student.activities}</p>}
            {student.clubs && <p><strong>Clubs &amp; organizations:</strong> {student.clubs}</p>}
            {student.sports && <p><strong>Sports:</strong> {student.sports}</p>}
            {student.volunteer_work && <p><strong>Volunteer work:</strong> {student.volunteer_work}</p>}
            {student.work_experience && <p><strong>Work experience:</strong> {student.work_experience}</p>}
            {student.military_family_background && <p><strong>Military background:</strong> {student.military_family_background}</p>}
            {student.awards && <p><strong>Awards &amp; honors:</strong> {student.awards}</p>}
          </div>
        )}

        <div className="reportFooter">
          <p>This portfolio documents self-directed scholarship research, outreach, and application work completed by {student?.name || "the student"}. It reflects demonstrated initiative, organization, and follow-through — not assigned coursework. Generated {generatedDate}.</p>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

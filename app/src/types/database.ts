export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ApplicationStatus =
  | "Not Started"
  | "Researching"
  | "Drafting"
  | "Needs Review"
  | "Ready to Submit"
  | "Submitted"
  | "Won"
  | "Lost"
  | "Not Eligible";

export type ProfileRole = "parent" | "student";

export type FamilyMemberRole = "family_admin" | "parent" | "student" | "viewer";

export interface Family {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: FamilyMemberRole | string;
  student_id: string | null;
  created_at: string;
}

export interface FamilyInvite {
  id: string;
  family_id: string;
  email: string;
  role: FamilyMemberRole | string;
  student_id: string | null;
  invite_token: string;
  accepted_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export type SchoolType =
  | "University"
  | "Community College"
  | "Trade School"
  | "Private College"
  | "Public College"
  | "Online Program"
  | "Other";

export type StudentSchoolInterestLevel =
  | "Considering"
  | "Strong Fit"
  | "Backup"
  | "Not Interested"
  | "Chosen";

export type StudentSchoolAdmissionStatus =
  | "Not Applied"
  | "Applied"
  | "Accepted"
  | "Waitlisted"
  | "Denied"
  | "Enrolled";

export type SchoolComparisonCategory =
  | "Cost"
  | "Program Fit"
  | "Location"
  | "Faith Fit"
  | "Business Program"
  | "Math Program"
  | "Ministry Opportunity"
  | "Campus Life"
  | "Scholarship Package"
  | "Housing"
  | "Career Outcomes";

export type SchoolSpecificScholarshipStatus =
  | "Researching"
  | "Admission Required"
  | "Apply After Admission"
  | "Applied"
  | "Offered"
  | "Accepted"
  | "Declined"
  | "Not Usable - Different School";

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  role: ProfileRole;
  student_id: string | null;
  selected_student_name: string | null;
  show_all_scholarships: boolean;
  scholarship_target_student_id: string | null;
  created_at: string;
  updated_at: string;
}

export type ProfileInsert = Omit<Profile, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ProfileUpdate = Partial<Omit<Profile, "id" | "created_at">>;

export type LeadStatus =
  | "To Check"
  | "Contacted"
  | "Follow Up Needed"
  | "Confirmed Opportunity"
  | "No Scholarship"
  | "Not a Fit"
  | "Applied"
  | "Won"
  | "Lost";

export type ProjectIdeaStatus = "idea" | "planning" | "active" | "submitted";

export type ScholarshipTaskType =
  | "Review Requirements"
  | "Confirm Eligibility"
  | "Gather Documents"
  | "Request Transcript"
  | "Draft Essay"
  | "Request Recommendation"
  | "Complete FAFSA"
  | "Gather Military Documents"
  | "Parent Review"
  | "Final Review"
  | "Submit Application"
  | "Confirm Submission";

export type SnippetCategory =
  | "military_family_background"
  | "leadership"
  | "service"
  | "volunteering"
  | "resilience"
  | "goals"
  | "character"
  | "challenge"
  | "career_interest"
  | "personal_statement";

export interface AnswerSnippet {
  id: string;
  answer_id: string | null;
  family_id: string;
  student_id: string;
  scholarship_id: string | null;
  title: string;
  snippet_text: string;
  category: SnippetCategory | string | null;
  topic: string | null;
  tags: string[];
  theme: string | null;
  tone: string | null;
  word_count: number;
  character_count: number;
  source_question: string | null;
  reusable: boolean;
  created_at: string;
  updated_at: string;
}

export interface School {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  school_type: SchoolType | string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type SchoolInsert = Omit<School, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type SchoolUpdate = Partial<Omit<School, "id" | "created_at">>;

export interface Scholarship {
  id: string;
  name: string;
  link: string | null;
  award: string | null;
  tags: string[];
  deadline: string | null;
  deadline_raw: string | null;
  school_id: string | null;
  is_school_specific: boolean;
  renewable: boolean;
  renewable_years: number | null;
  estimated_total_value: string | null;
  requires_admission: boolean;
  admission_deadline: string | null;
  scholarship_deadline: string | null;
  stackable: boolean;
  decision_bucket: string | null;
  scholarship_category: string | null;
  school_specific_reason: string | null;
  status: string | null;
  source_file: string | null;
  last_verified_at: string | null;
  eligibility_reason: string | null;
  age_min: number | null;
  age_max: number | null;
  grade_requirement: string | null;
  eligible_now: boolean;
  eligible_soon: boolean;
  priority_score: number;
  notes: string | null;
  resident_state: string | null;
  family_id: string;
  created_at: string;
  updated_at: string;
}

export type ScholarshipInsert = Omit<Scholarship, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ScholarshipUpdate = Partial<Omit<Scholarship, "id" | "created_at">>;

export interface Student {
  id: string;
  family_id: string;
  name: string;
  residence_state: string | null;
  grade_level: string | null;
  graduation_year: number | null;
  gpa: number | null;
  interests: string | null;
  activities: string | null;
  clubs: string | null;
  sports: string | null;
  volunteer_hours: number | null;
  volunteer_work: string | null;
  church_involvement: string | null;
  awards: string | null;
  work_experience: string | null;
  career_interests: string | null;
  military_family_background: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type StudentInsert = Omit<Student, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type StudentUpdate = Partial<Omit<Student, "id" | "created_at">>;

export type ServiceCategory =
  | "Church"
  | "Mentoring"
  | "Youth Work"
  | "Sports"
  | "Community Service"
  | "Event Help"
  | "Teaching"
  | "Leadership"
  | "Volunteer"
  | "Other";

export type ServiceAchievementType =
  | "Leadership"
  | "Mentorship"
  | "Service Milestone"
  | "Event Support"
  | "Responsibility"
  | "Community Impact"
  | "Recognition"
  | "Other";

export interface ServiceLog {
  id: string;
  family_id: string;
  student_id: string;
  activity_date: string;
  hours: number;
  organization_name: string;
  activity_title: string;
  category: string | null;
  tags: string[];
  description: string | null;
  impact_description: string | null;
  skills_used: string[];
  people_served: number | null;
  leadership_role: boolean;
  recurring_activity: boolean;
  verification_contact_name: string | null;
  verification_contact_email: string | null;
  proof_url: string | null;
  reflection: string | null;
  created_at: string;
  updated_at: string;
}

export type ServiceLogInsert = Omit<ServiceLog, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ServiceLogUpdate = Partial<Omit<ServiceLog, "id" | "created_at">>;

export interface ServiceOrganization {
  id: string;
  family_id: string;
  name: string;
  category: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ServiceOrganizationInsert = Omit<ServiceOrganization, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ServiceOrganizationUpdate = Partial<Omit<ServiceOrganization, "id" | "created_at">>;

export interface ServiceAchievement {
  id: string;
  family_id: string;
  student_id: string;
  service_log_id: string | null;
  title: string;
  description: string | null;
  achievement_type: string | null;
  date_earned: string | null;
  tags: string[];
  resume_bullet: string | null;
  scholarship_angle: string | null;
  created_at: string;
  updated_at: string;
}

export type ServiceAchievementInsert = Omit<ServiceAchievement, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ServiceAchievementUpdate = Partial<Omit<ServiceAchievement, "id" | "created_at">>;

export interface StudentSchoolOption {
  id: string;
  family_id: string;
  student_id: string;
  school_id: string;
  interest_level: StudentSchoolInterestLevel | string;
  admission_status: StudentSchoolAdmissionStatus | string;
  estimated_cost_of_attendance: number | null;
  estimated_aid: number | null;
  estimated_scholarships: number | null;
  estimated_out_of_pocket: number | null;
  pros: string | null;
  cons: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type StudentSchoolOptionInsert = Omit<StudentSchoolOption, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type StudentSchoolOptionUpdate = Partial<Omit<StudentSchoolOption, "id" | "created_at">>;

export interface SchoolComparisonNote {
  id: string;
  family_id: string;
  student_id: string;
  school_id: string;
  category: SchoolComparisonCategory | string | null;
  note: string | null;
  score: number | null;
  created_at: string;
}

export type SchoolComparisonNoteInsert = Omit<SchoolComparisonNote, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type SchoolComparisonNoteUpdate = Partial<Omit<SchoolComparisonNote, "id" | "created_at">>;

export type AnswerSnippetInsert = Omit<AnswerSnippet, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type AnswerSnippetUpdate = Partial<Omit<AnswerSnippet, "id" | "created_at">>;

export interface ProjectIdea {
  id: string;
  family_id: string;
  student_id: string;
  scholarship_id: string | null;
  title: string;
  description: string | null;
  status: ProjectIdeaStatus | string;
  mentor_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ProjectIdeaInsert = Omit<ProjectIdea, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ProjectIdeaUpdate = Partial<Omit<ProjectIdea, "id" | "created_at">>;

export interface LocalScholarshipLead {
  id: string;
  family_id: string;
  title: string;
  organization_name: string;
  organization_type: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  city: string | null;
  county: string | null;
  state: string | null;
  possible_fit_tags: string[];
  lead_status: LeadStatus | string;
  last_contacted_at: string | null;
  follow_up_date: string | null;
  notes: string | null;
  website: string | null;
  application_link: string | null;
  confirmed_scholarship: boolean;
  estimated_award: string | null;
  typical_deadline: string | null;
  created_at: string;
  updated_at: string;
}

export type LocalScholarshipLeadInsert = Omit<LocalScholarshipLead, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type LocalScholarshipLeadUpdate = Partial<Omit<LocalScholarshipLead, "id" | "created_at">>;

export interface ScholarshipTaskTemplate {
  id: string;
  scholarship_id: string;
  title: string;
  description: string | null;
  task_type: ScholarshipTaskType | string | null;
  suggested_due_offset_days: number;
  sort_order: number;
  required: boolean;
  created_at: string;
  updated_at: string;
}

export type ScholarshipTaskTemplateInsert = Omit<ScholarshipTaskTemplate, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ScholarshipTaskTemplateUpdate = Partial<Omit<ScholarshipTaskTemplate, "id" | "created_at">>;

export interface Task {
  id: string;
  family_id: string;
  student_id: string;
  scholarship_id: string | null;
  workspace_id: string | null;
  title: string;
  due_date: string | null;
  completed: boolean;
  notes: string | null;
  task_type: ScholarshipTaskType | string | null;
  source_type: string | null;
  source_id: string | null;
  sort_order: number;
  required: boolean;
  created_at: string;
  updated_at: string;
}

export type TaskInsert = Omit<Task, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type TaskUpdate = Partial<Omit<Task, "id" | "created_at">>;

export type EmailTemplateCategory =
  | "scholarship_follow_up"
  | "local_lead_follow_up"
  | "recommendation_follow_up"
  | "document_follow_up"
  | "thank_you"
  | "submission_confirmation";

export type EmailTone = "polite" | "warm" | "direct" | "grateful";

export interface EmailTemplate {
  id: string;
  name: string;
  category: EmailTemplateCategory | string;
  subject_template: string;
  body_template: string;
  tone: EmailTone | string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GeneratedEmail {
  id: string;
  family_id: string;
  student_id: string | null;
  scholarship_id: string | null;
  lead_id: string | null;
  template_id: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  subject: string;
  body: string;
  copied_at: string | null;
  sent_manually: boolean;
  notes: string | null;
  created_at: string;
}

export type GeneratedEmailInsert = Omit<GeneratedEmail, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type GeneratedEmailUpdate = Partial<Omit<GeneratedEmail, "id" | "created_at">>;

export interface Database {
  public: {
    Tables: {
      families: {
        Row: Family;
        Insert: Omit<Family, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Family, "id" | "created_at">>;
      };
      family_members: {
        Row: FamilyMember;
        Insert: Omit<FamilyMember, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<FamilyMember, "id" | "created_at">>;
      };
      family_invites: {
        Row: FamilyInvite;
        Insert: Omit<FamilyInvite, "id" | "created_at" | "accepted_at"> & { id?: string; created_at?: string; accepted_at?: string | null };
        Update: Partial<Omit<FamilyInvite, "id" | "created_at">>;
      };
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      schools: {
        Row: School;
        Insert: SchoolInsert;
        Update: SchoolUpdate;
      };
      students: {
        Row: Student;
        Insert: StudentInsert;
        Update: StudentUpdate;
      };
      service_logs: {
        Row: ServiceLog;
        Insert: ServiceLogInsert;
        Update: ServiceLogUpdate;
      };
      service_organizations: {
        Row: ServiceOrganization;
        Insert: ServiceOrganizationInsert;
        Update: ServiceOrganizationUpdate;
      };
      service_achievements: {
        Row: ServiceAchievement;
        Insert: ServiceAchievementInsert;
        Update: ServiceAchievementUpdate;
      };
      scholarships: {
        Row: Scholarship;
        Insert: ScholarshipInsert;
        Update: ScholarshipUpdate;
      };
      answer_snippets: {
        Row: AnswerSnippet;
        Insert: AnswerSnippetInsert;
        Update: AnswerSnippetUpdate;
      };
      project_ideas: {
        Row: ProjectIdea;
        Insert: ProjectIdeaInsert;
        Update: ProjectIdeaUpdate;
      };
      local_scholarship_leads: {
        Row: LocalScholarshipLead;
        Insert: LocalScholarshipLeadInsert;
        Update: LocalScholarshipLeadUpdate;
      };
      student_school_options: {
        Row: StudentSchoolOption;
        Insert: StudentSchoolOptionInsert;
        Update: StudentSchoolOptionUpdate;
      };
      school_comparison_notes: {
        Row: SchoolComparisonNote;
        Insert: SchoolComparisonNoteInsert;
        Update: SchoolComparisonNoteUpdate;
      };
      scholarship_task_templates: {
        Row: ScholarshipTaskTemplate;
        Insert: ScholarshipTaskTemplateInsert;
        Update: ScholarshipTaskTemplateUpdate;
      };
      tasks: {
        Row: Task;
        Insert: TaskInsert;
        Update: TaskUpdate;
      };
      email_templates: {
        Row: EmailTemplate;
        Insert: Omit<EmailTemplate, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<EmailTemplate, "id" | "created_at">>;
      };
      generated_emails: {
        Row: GeneratedEmail;
        Insert: GeneratedEmailInsert;
        Update: GeneratedEmailUpdate;
      };
    };
    Enums: {
      application_status: ApplicationStatus;
      family_member_role: FamilyMemberRole;
      profile_role: ProfileRole;
      project_idea_status: ProjectIdeaStatus;
      school_type: SchoolType;
    };
  };
}

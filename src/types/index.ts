export type LeadStatus =
  | "NEW_LEAD"
  | "CONTACTED"
  | "APPLICATION_SENT"
  | "DOCS_MVR_REVIEW"
  | "APPROVED_HIRED"
  | "REJECTED_ARCHIVED";

export type LeadSource =
  | "FACEBOOK"
  | "INSTAGRAM"
  | "TELEGRAM"
  | "REFERRAL"
  | "INDEED"
  | "TIKTOK"
  | "DIRECT_CALL"
  | "WEBSITE"
  | "OTHER";

export type CDLType = "CLASS_A" | "CLASS_B" | "CLASS_C" | "NON_CDL";

export type ReminderPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
}

export interface Note {
  id: string;
  content: string;
  tag?: string | null;
  leadId: string;
  authorId?: string | null;
  author?: User | null;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  title: string;
  dueAt: string;
  advanceMinutes: number;
  isCompleted: boolean;
  isNotified: boolean;
  priority: ReminderPriority;
  leadId: string;
  lead?: {
    id: string;
    fullName: string;
    phone: string;
    status: string;
    locationState?: string | null;
  } | null;
  userId?: string | null;
  user?: User | null;
  createdAt: string;
  updatedAt: string;
}

export type FileCategory =
  | "CDL_FRONT"
  | "CDL_BACK"
  | "MED_CARD"
  | "MVR_REPORT"
  | "RESUME"
  | "SSN_CARD"
  | "DRUG_TEST"
  | "APPLICATION"
  | "OTHER";

export interface LeadFile {
  id: string;
  leadId: string;
  name: string;
  fileUrl: string;
  filePath: string;
  fileType: FileCategory | string;
  fileSize: number;
  mimeType?: string | null;
  uploaderId?: string | null;
  uploader?: User | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  leadId: string;
  action: string;
  details: string;
  userName?: string | null;
  createdAt: string;
}

export interface Lead {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  source: LeadSource | string;
  sourceDetails?: string | null;
  status: LeadStatus | string;
  cdlType: CDLType | string;
  experienceYears: number;
  endorsements?: string | null; // JSON string e.g. '["HazMat","Tanker"]'
  driverType?: string | null;
  locationState?: string | null;
  desiredPay?: string | null;
  notesText?: string | null;
  assignedToId?: string | null;
  assignedTo?: User | null;
  notes?: Note[];
  reminders?: Reminder[];
  files?: LeadFile[];
  activityLogs?: ActivityLog[];
  _count?: {
    notes: number;
    reminders: number;
    files?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PipelineColumn {
  id: LeadStatus;
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeBg: string;
  description: string;
}

export const PIPELINE_COLUMNS: PipelineColumn[] = [
  {
    id: "NEW_LEAD",
    title: "New Inbound Leads",
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-50/60 dark:bg-blue-950/20",
    borderColor: "border-blue-200 dark:border-blue-800/60",
    badgeBg: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    description: "Fresh applications awaiting initial call",
  },
  {
    id: "CONTACTED",
    title: "Contacted / Pitching",
    color: "text-amber-700 dark:text-amber-300",
    bgColor: "bg-amber-50/60 dark:bg-amber-950/20",
    borderColor: "border-amber-200 dark:border-amber-800/60",
    badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
    description: "Driver spoken to, discussing lane & pay",
  },
  {
    id: "APPLICATION_SENT",
    title: "Application Sent",
    color: "text-indigo-700 dark:text-indigo-300",
    bgColor: "bg-indigo-50/60 dark:bg-indigo-950/20",
    borderColor: "border-indigo-200 dark:border-indigo-800/60",
    badgeBg: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300",
    description: "Online application or Tenstreet sent",
  },
  {
    id: "DOCS_MVR_REVIEW",
    title: "Docs & MVR Review",
    color: "text-purple-700 dark:text-purple-300",
    bgColor: "bg-purple-50/60 dark:bg-purple-950/20",
    borderColor: "border-purple-200 dark:border-purple-800/60",
    badgeBg: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
    description: "Checking CDL, PSP, drug test & safety",
  },
  {
    id: "APPROVED_HIRED",
    title: "Approved / Hired",
    color: "text-emerald-700 dark:text-emerald-300",
    bgColor: "bg-emerald-50/60 dark:bg-emerald-950/20",
    borderColor: "border-emerald-200 dark:border-emerald-800/60",
    badgeBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
    description: "Orientation completed, assigned to truck",
  },
  {
    id: "REJECTED_ARCHIVED",
    title: "Archived / Disqualified",
    color: "text-zinc-600 dark:text-zinc-400",
    bgColor: "bg-zinc-100/50 dark:bg-zinc-900/30",
    borderColor: "border-zinc-200 dark:border-zinc-800",
    badgeBg: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    description: "Failed MVR, not interested, or archived",
  },
];

export const FILE_CATEGORY_CONFIG: Record<
  string,
  { label: string; badge: string; icon: string }
> = {
  CDL_FRONT: {
    label: "CDL Front Copy",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    icon: "id-card",
  },
  CDL_BACK: {
    label: "CDL Back Copy",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    icon: "id-card",
  },
  MED_CARD: {
    label: "DOT Medical Card",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    icon: "activity",
  },
  MVR_REPORT: {
    label: "MVR / Driving Record",
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    icon: "file-check",
  },
  RESUME: {
    label: "Resume / Work History",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    icon: "file-text",
  },
  SSN_CARD: {
    label: "SSN / ID Document",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    icon: "shield",
  },
  DRUG_TEST: {
    label: "Drug Test / Clearinghouse",
    badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
    icon: "check-circle",
  },
  APPLICATION: {
    label: "Signed Application",
    badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    icon: "file",
  },
  OTHER: {
    label: "Other Document",
    badge: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
    icon: "file",
  },
};

export const SOURCE_CONFIG: Record<
  string,
  { label: string; icon: string; bg: string; text: string; border: string }
> = {
  FACEBOOK: {
    label: "Facebook",
    icon: "facebook",
    bg: "bg-sky-50 dark:bg-sky-950/30",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-200 dark:border-sky-800",
  },
  INSTAGRAM: {
    label: "Instagram",
    icon: "instagram",
    bg: "bg-pink-50 dark:bg-pink-950/30",
    text: "text-pink-700 dark:text-pink-300",
    border: "border-pink-200 dark:border-pink-800",
  },
  TELEGRAM: {
    label: "Telegram",
    icon: "send",
    bg: "bg-cyan-50 dark:bg-cyan-950/30",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-200 dark:border-cyan-800",
  },
  REFERRAL: {
    label: "Driver Referral",
    icon: "users",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  INDEED: {
    label: "Indeed",
    icon: "briefcase",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
  },
  TIKTOK: {
    label: "TikTok",
    icon: "video",
    bg: "bg-neutral-100 dark:bg-neutral-900/60",
    text: "text-neutral-900 dark:text-neutral-100",
    border: "border-neutral-300 dark:border-neutral-700",
  },
  DIRECT_CALL: {
    label: "Direct Call",
    icon: "phone-call",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-800",
  },
  WEBSITE: {
    label: "Website Form",
    icon: "globe",
    bg: "bg-teal-50 dark:bg-teal-950/30",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200 dark:border-teal-800",
  },
  OTHER: {
    label: "Other",
    icon: "help-circle",
    bg: "bg-gray-50 dark:bg-gray-900/40",
    text: "text-gray-700 dark:text-gray-300",
    border: "border-gray-200 dark:border-gray-800",
  },
};

export const CDL_LABELS: Record<string, string> = {
  CLASS_A: "Class A CDL",
  CLASS_B: "Class B CDL",
  CLASS_C: "Class C CDL",
  NON_CDL: "Non-CDL / Box Truck",
};

export const AVAILABLE_ENDORSEMENTS = [
  "HazMat (H)",
  "Tanker (N)",
  "Doubles/Triples (T)",
  "HazMat + Tanker (X)",
  "Passenger (P)",
  "TWIC Card",
  "Clean MVR (3+ Yrs)",
  "Passport / Canada Eligible",
];

export const COMMON_NOTE_TAGS = [
  "General Note",
  "Call Log - Left Voicemail",
  "Call Log - Spoke with Driver",
  "Pay Negotiation",
  "Home Time Preference",
  "Equipment / Truck Preference",
  "MVR / Safety Review",
  "Application Update",
  "Orientation Scheduled",
];

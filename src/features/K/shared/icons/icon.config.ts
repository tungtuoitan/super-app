/**
 * Icon Configuration - Material Design Icons color palette and icon mappings
 * Based on Material Design Icons for Visual Studio Code
 */

import {
    Trash2,
    Folder,
    CheckSquare,
    StickyNote,
    FileText,
    Info,
    Image,
    Video,
    Music,
    User,
    Users,
    Calendar,
    Clock,
    AlertTriangle,
    CheckCircle,
    Star,
    Heart,
    Tag,
    Link,
    Database,
    Lock,
    Wallet,
    Armchair,
    Circle,
    MessageSquare,
    RemoveFormatting,
    Award,
    Table,
    GanttChart,
    LineChart,
    List,
    ListTodo,
    Building2,
    DollarSign,
    Bike,
    Bird,
    Book,
    ListTree,
    CalendarRange,
    Sparkles,
    Bug,
    Cpu,
    Target,
    Hammer,
    Code,
    HeartPulse,
    Dumbbell,
    Repeat,
    CalendarDays,
    GraduationCap,
    Library,
    GitMerge,
    Trophy,
    Scale,
    ListChecks,
    History,
    Lightbulb,
    Ruler,
    SlidersHorizontal,
    // New development icons
    Workflow,
    LayoutDashboard,
    Server,
    ServerCog,
    Monitor,
    Braces,
    Share2,
    ArrowRightLeft,
    Footprints,
    type LucideIcon,
    Computer,
    CopyCheck,
    Atom,
} from "lucide-react";
import { KIconKey } from "./icon.types";

/**
 * Material Design Icons color palette
 * Based on Material Design Icons for Visual Studio Code
 */
export const ICON_COLORS = {
    GREY: "#90A4AE",
    BLUE: "#42A5F5",
    LIGHT_BLUE: "#29B6F6",
    CYAN: "#26C6DA",
    TEAL: "#26A69A",
    GREEN: "#66BB6A",
    LIGHT_GREEN: "#9CCC65",
    LIME: "#D4E157",
    YELLOW: "#FFEE58",
    AMBER: "#FFCA28",
    ORANGE: "#FFA726",
    DEEP_ORANGE: "#FF7043",
    RED: "#EF5350",
    PINK: "#EC407A",
    PURPLE: "#AB47BC",
    DEEP_PURPLE: "#7E57C2",
    INDIGO: "#5C6BC0",
    BROWN: "#8D6E63",
} as const;

export type IconColorKey = keyof typeof ICON_COLORS;
export type IconColorValue = typeof ICON_COLORS[IconColorKey];

/**
 * Icon map with Lucide components
 */
export const ICON_MAP: Record<KIconKey, LucideIcon> = {
    BIN: Trash2,
    FOLDER: Folder,
    TASK: CheckSquare,
    NOTE: FileText,
    FILE: FileText,
    INFORMATION: Info,
    IMAGE: Image,
    VIDEO: Video,
    AUDIO: Music,
    PDF: FileText,
    USER: User,
    USERS: Users,
    CALENDAR: Calendar,
    CLOCK: Clock,
    WARNING: AlertTriangle,
    CHECK: CheckCircle,
    STAR: Star,
    HEART: Heart,
    TAG: Tag,
    LINK: Link,

    PLAN: CalendarRange,
    DETAIL: Info,
    IMPORTANT: Star,
    URGENT: AlertTriangle,

    // New icons
    DATABASE: Database,
    VAULT: Lock,
    WALLET: Wallet,
    ARMCHAIR: Armchair,
    ITEM: Atom,
    CONVERSATION: MessageSquare,
    ATTITUDE: RemoveFormatting,
    AWARD: Award,
    TABLE: Table,
    TIMELINE: GanttChart,
    LINE_CHART: LineChart,
    LIST: List,
    TODO_LIST: ListTodo,
    COMPANY: Building2,
    FINANCE: DollarSign,
    BIKE: Bike,
    BIRD: Bird,
    BOOK: Book,
    SUBTASK: CopyCheck,
    FEATURE: Sparkles,
    BUG: Bug,
    TECH: Cpu,
    SKILL: Hammer,
    CODE: Code,
    HEALTH: HeartPulse,
    // CIRCLE_SMALL: Circle,
    EXERCISE: Dumbbell,
    REPEAT: Repeat,
    MISSION: Target,
    EVENT: CalendarDays,
    LESSON: GraduationCap,
    LIBRARIES: Library,
    LOGIC: GitMerge,
    EXPERIENCE: Trophy,
    RULE: Scale,
    CHECKLIST: ListChecks,
    HISTORY: History,
    RELATIONSHIP: Users,
    IDEA: Lightbulb,
    MEASUREMENT: Ruler,
    ADJUSTMENT: SlidersHorizontal,

    // Development & Technical icons
    PROCEDURE: Workflow,
    UI: LayoutDashboard,
    SERVICE: ServerCog,
    SERVER: Server,
    BACKEND: Computer,
    FRONTEND: Monitor,
    FUNCTION: Braces,
    DIAGRAM: Share2,
    FLOW: ArrowRightLeft,
    STEP: Footprints,
};

/**
 * Icon Groups for categorizing icons in picker
 */
export const ICON_GROUPS = {
    DEVELOPMENT: { id: "development", label: "Development", order: 1 },
    WORK: { id: "work", label: "Work & Tasks", order: 2 },
    DATA: { id: "data", label: "Data & Analytics", order: 3 },
    CONTENT: { id: "content", label: "Content & Media", order: 4 },
    PLANNING: { id: "planning", label: "Planning & Time", order: 5 },
    LIFESTYLE: { id: "lifestyle", label: "Lifestyle & Health", order: 6 },
    LEARNING: { id: "learning", label: "Learning & Growth", order: 7 },
    ORGANIZATION: { id: "organization", label: "Organization", order: 8 },
    OTHER: { id: "other", label: "Other", order: 99 },
} as const;

export type IconGroupId = typeof ICON_GROUPS[keyof typeof ICON_GROUPS]["id"];

/**
 * Icon configuration with keywords, active status, default color, and group
 */
export interface IconConfig {
    keywords: string[];
    isActive: boolean;
    label: string;
    defaultColor: string;
    group: IconGroupId;
}

export const ICON_CONFIG: Record<KIconKey, IconConfig> = {
  // ===== SYSTEM (inactive) =====
  BIN: { keywords: ["trash", "delete", "remove", "garbage", "recycle", "bin", "waste", "thùng rác", "xóa"], isActive: false, label: "Bin", defaultColor: ICON_COLORS.GREY, group: "other" },
  FOLDER: { keywords: ["folder", "directory", "collection", "group", "thư mục", "nhóm"], isActive: false, label: "Folder", defaultColor: ICON_COLORS.GREY, group: "other" },

  // ===== DEVELOPMENT =====
  CODE: { keywords: ["code", "coding", "programming", "development", "script", "mã", "lập trình"], isActive: true, label: "Code", defaultColor: ICON_COLORS.BLUE, group: "development" },
  BUG: { keywords: ["bug", "issue", "defect", "problem", "fix", "lỗi", "vấn đề", "sửa lỗi"], isActive: true, label: "Bug", defaultColor: ICON_COLORS.RED, group: "development" },
  FEATURE: { keywords: ["feature", "functionality", "capability", "tính năng", "chức năng"], isActive: true, label: "Feature", defaultColor: ICON_COLORS.PURPLE, group: "development" },
  TECH: { keywords: ["tech", "technology", "technical", "engineering", "công nghệ", "kỹ thuật"], isActive: true, label: "Tech", defaultColor: ICON_COLORS.CYAN, group: "development" },
  DATABASE: { keywords: ["database", "db", "data", "storage", "cơ sở dữ liệu", "dữ liệu"], isActive: true, label: "Database", defaultColor: ICON_COLORS.CYAN, group: "development" },
  LOGIC: { keywords: ["logic", "algorithm", "reasoning", "thuật toán", "quy trình"], isActive: true, label: "Logic", defaultColor: ICON_COLORS.CYAN, group: "development" },
  LIBRARIES: { keywords: ["libraries", "library", "repository", "collection", "thư viện", "kho lưu trữ"], isActive: true, label: "Libraries", defaultColor: ICON_COLORS.BROWN, group: "development" },
  PROCEDURE: { keywords: ["procedure", "process", "workflow", "quy trình", "thủ tục"], isActive: true, label: "Procedure", defaultColor: ICON_COLORS.INDIGO, group: "development" },
  UI: { keywords: ["ui", "interface", "layout", "design", "giao diện", "thiết kế"], isActive: true, label: "UI", defaultColor: ICON_COLORS.PURPLE, group: "development" },
  SERVICE: { keywords: ["service", "api", "microservice", "dịch vụ"], isActive: true, label: "Service", defaultColor: ICON_COLORS.TEAL, group: "development" },
  SERVER: { keywords: ["server", "host", "backend server", "máy chủ"], isActive: true, label: "Server", defaultColor: ICON_COLORS.GREY, group: "development" },
  BACKEND: { keywords: ["backend", "server-side", "api", "back-end"], isActive: true, label: "Backend", defaultColor: ICON_COLORS.DEEP_PURPLE, group: "development" },
  FRONTEND: { keywords: ["frontend", "client", "ui", "front-end", "giao diện"], isActive: true, label: "Frontend", defaultColor: ICON_COLORS.LIGHT_BLUE, group: "development" },
  FUNCTION: { keywords: ["function", "method", "fn", "hàm", "phương thức"], isActive: true, label: "Function", defaultColor: ICON_COLORS.AMBER, group: "development" },
  DIAGRAM: { keywords: ["diagram", "chart", "schema", "sơ đồ", "biểu đồ"], isActive: true, label: "Diagram", defaultColor: ICON_COLORS.BLUE, group: "development" },
  FLOW: { keywords: ["flow", "flowchart", "process flow", "luồng", "quy trình"], isActive: true, label: "Flow", defaultColor: ICON_COLORS.TEAL, group: "development" },
  STEP: { keywords: ["step", "stage", "phase", "bước", "giai đoạn"], isActive: true, label: "Step", defaultColor: ICON_COLORS.ORANGE, group: "development" },

  // ===== WORK & TASKS =====
  TASK: { keywords: ["task", "todo", "checklist", "action", "work", "job", "assignment", "project", "công việc", "nhiệm vụ"], isActive: true, label: "Task", defaultColor: ICON_COLORS.GREEN, group: "work" },
  SUBTASK: { keywords: ["subtask", "sub-task", "child task", "nested", "công việc con", "nhiệm vụ phụ"], isActive: true, label: "Subtask", defaultColor: ICON_COLORS.GREY, group: "work" },
  TODO_LIST: { keywords: ["todo list", "todolist", "todos", "to-do", "danh sách việc cần làm"], isActive: true, label: "Todo List", defaultColor: ICON_COLORS.GREEN, group: "work" },
  CHECKLIST: { keywords: ["checklist", "check list", "verification", "review", "danh sách kiểm tra"], isActive: true, label: "Checklist", defaultColor: ICON_COLORS.GREEN, group: "work" },
  MISSION: { keywords: ["mission", "goal", "objective", "target", "purpose", "sứ mệnh", "mục tiêu"], isActive: true, label: "Mission", defaultColor: ICON_COLORS.DEEP_PURPLE, group: "work" },
  IMPORTANT: { keywords: ["important", "priority", "key", "highlight", "quan trọng", "ưu tiên"], isActive: true, label: "Important", defaultColor: ICON_COLORS.AMBER, group: "work" },
  URGENT: { keywords: ["urgent", "immediate", "critical", "emergency", "khẩn cấp", "cấp bách"], isActive: true, label: "Urgent", defaultColor: ICON_COLORS.RED, group: "work" },
//   CIRCLE_SMALL: { keywords: ["circle", "small task", "minor", "quick", "vòng tròn", "việc nhỏ"], isActive: true, label: "Small Task", defaultColor: ICON_COLORS.GREY, group: "work" },
  ITEM: { keywords: ["item", "thing", "object", "element", "mục", "vật phẩm"], isActive: true, label: "Item", defaultColor: ICON_COLORS.GREY, group: "work" },
  REPEAT: { keywords: ["repeat", "recurring", "routine", "habit", "loop", "lặp lại", "thói quen"], isActive: true, label: "Repeat", defaultColor: ICON_COLORS.TEAL, group: "work" },

  // ===== DATA & ANALYTICS =====
  TABLE: { keywords: ["table", "grid", "spreadsheet", "matrix", "bảng", "lưới"], isActive: true, label: "Table", defaultColor: ICON_COLORS.TEAL, group: "data" },
  LINE_CHART: { keywords: ["chart", "graph", "analytics", "statistics", "trend", "biểu đồ", "thống kê"], isActive: true, label: "Line Chart", defaultColor: ICON_COLORS.GREEN, group: "data" },
  TIMELINE: { keywords: ["timeline", "gantt", "schedule", "progress", "dòng thời gian", "tiến độ"], isActive: true, label: "Timeline", defaultColor: ICON_COLORS.INDIGO, group: "data" },
  LIST: { keywords: ["list", "listing", "items", "danh sách", "liệt kê"], isActive: true, label: "List", defaultColor: ICON_COLORS.GREY, group: "data" },
  MEASUREMENT: { keywords: ["measurement", "metric", "measure", "size", "đo lường", "số liệu"], isActive: true, label: "Measurement", defaultColor: ICON_COLORS.TEAL, group: "data" },
  HISTORY: { keywords: ["history", "log", "record", "past", "archive", "lịch sử", "nhật ký"], isActive: true, label: "History", defaultColor: ICON_COLORS.GREY, group: "data" },

  // ===== CONTENT & MEDIA =====
  NOTE: { keywords: ["note", "memo", "sticky", "reminder", "draft", "ghi chú", "nhắc nhở"], isActive: true, label: "Note", defaultColor: ICON_COLORS.YELLOW, group: "content" },
  FILE: { keywords: ["file", "document", "text", "report", "article", "tệp", "tài liệu"], isActive: true, label: "File", defaultColor: ICON_COLORS.GREY, group: "content" },
  IMAGE: { keywords: ["image", "photo", "picture", "gallery", "graphic", "design", "hình ảnh", "ảnh"], isActive: true, label: "Image", defaultColor: ICON_COLORS.PURPLE, group: "content" },
  BOOK: { keywords: ["book", "reading", "study", "literature", "sách", "đọc", "học"], isActive: true, label: "Book", defaultColor: ICON_COLORS.BROWN, group: "content" },
  INFORMATION: { keywords: ["info", "information", "about", "help", "description", "thông tin", "hướng dẫn"], isActive: true, label: "Info", defaultColor: ICON_COLORS.LIGHT_BLUE, group: "content" },
  DETAIL: { keywords: ["detail", "details", "description", "breakdown", "chi tiết", "mô tả"], isActive: true, label: "Detail", defaultColor: ICON_COLORS.CYAN, group: "content" },
  LINK: { keywords: ["link", "url", "reference", "resource", "website", "liên kết"], isActive: true, label: "Link", defaultColor: ICON_COLORS.BLUE, group: "content" },
  IDEA: { keywords: ["idea", "concept", "thought", "inspiration", "innovation", "ý tưởng", "cảm hứng"], isActive: true, label: "Idea", defaultColor: ICON_COLORS.YELLOW, group: "content" },
  CONVERSATION: { keywords: ["conversation", "chat", "message", "talk", "discuss", "cuộc trò chuyện", "thảo luận"], isActive: true, label: "Conversation", defaultColor: ICON_COLORS.LIGHT_BLUE, group: "content" },
  VIDEO: { keywords: ["video", "movie", "film", "clip", "media", "phim"], isActive: false, label: "Video", defaultColor: ICON_COLORS.RED, group: "content" },
  AUDIO: { keywords: ["audio", "music", "sound", "song", "podcast", "âm thanh", "nhạc"], isActive: false, label: "Audio", defaultColor: ICON_COLORS.PINK, group: "content" },
  PDF: { keywords: ["pdf", "ebook", "manual", "guide", "tutorial", "tài liệu"], isActive: false, label: "PDF", defaultColor: ICON_COLORS.RED, group: "content" },

  // ===== PLANNING & TIME =====
  PLAN: { keywords: ["plan", "planning", "roadmap", "strategy", "milestone", "kế hoạch", "lộ trình"], isActive: true, label: "Plan", defaultColor: ICON_COLORS.INDIGO, group: "planning" },
  CALENDAR: { keywords: ["calendar", "schedule", "date", "meeting", "appointment", "lịch", "cuộc hẹn"], isActive: true, label: "Calendar", defaultColor: ICON_COLORS.TEAL, group: "planning" },
  EVENT: { keywords: ["event", "occasion", "happening", "activity", "sự kiện", "hoạt động"], isActive: true, label: "Event", defaultColor: ICON_COLORS.PINK, group: "planning" },
  CLOCK: { keywords: ["clock", "time", "timer", "deadline", "thời gian"], isActive: false, label: "Clock", defaultColor: ICON_COLORS.GREY, group: "planning" },

  // ===== LIFESTYLE & HEALTH =====
  HEALTH: { keywords: ["health", "wellness", "medical", "fitness", "sức khỏe", "y tế"], isActive: true, label: "Health", defaultColor: ICON_COLORS.RED, group: "lifestyle" },
  EXERCISE: { keywords: ["exercise", "workout", "gym", "training", "sport", "tập luyện", "thể thao"], isActive: true, label: "Exercise", defaultColor: ICON_COLORS.ORANGE, group: "lifestyle" },
  BIKE: { keywords: ["bike", "bicycle", "cycling", "ride", "xe đạp", "đạp xe"], isActive: true, label: "Bike", defaultColor: ICON_COLORS.LIGHT_GREEN, group: "lifestyle" },
  ARMCHAIR: { keywords: ["armchair", "relax", "rest", "comfort", "leisure", "thư giãn", "nghỉ ngơi"], isActive: true, label: "Armchair", defaultColor: ICON_COLORS.BROWN, group: "lifestyle" },
  BIRD: { keywords: ["bird", "animal", "pet", "nature", "chim", "động vật"], isActive: true, label: "Bird", defaultColor: ICON_COLORS.LIGHT_BLUE, group: "lifestyle" },
  HEART: { keywords: ["heart", "love", "favorite", "saved", "yêu thích"], isActive: false, label: "Heart", defaultColor: ICON_COLORS.PINK, group: "lifestyle" },

  // ===== LEARNING & GROWTH =====
  LESSON: { keywords: ["lesson", "learning", "education", "course", "class", "bài học", "khóa học"], isActive: true, label: "Lesson", defaultColor: ICON_COLORS.INDIGO, group: "learning" },
  SKILL: { keywords: ["skill", "ability", "competency", "expertise", "kỹ năng", "năng lực"], isActive: true, label: "Skill", defaultColor: ICON_COLORS.ORANGE, group: "learning" },
  EXPERIENCE: { keywords: ["experience", "expertise", "knowledge", "kinh nghiệm", "chuyên môn"], isActive: true, label: "Experience", defaultColor: ICON_COLORS.AMBER, group: "learning" },
  AWARD: { keywords: ["award", "prize", "medal", "achievement", "giải thưởng", "thành tựu"], isActive: true, label: "Award", defaultColor: ICON_COLORS.AMBER, group: "learning" },
  ATTITUDE: { keywords: ["attitude", "behavior", "mindset", "approach", "thái độ", "tư duy"], isActive: true, label: "Attitude", defaultColor: ICON_COLORS.PURPLE, group: "learning" },

  // ===== ORGANIZATION =====
  COMPANY: { keywords: ["company", "business", "corporate", "enterprise", "office", "công ty", "doanh nghiệp"], isActive: true, label: "Company", defaultColor: ICON_COLORS.BLUE, group: "organization" },
  FINANCE: { keywords: ["finance", "financial", "money", "budget", "investment", "tài chính", "ngân sách"], isActive: true, label: "Finance", defaultColor: ICON_COLORS.GREEN, group: "organization" },
  WALLET: { keywords: ["wallet", "money", "payment", "ví", "tiền", "thanh toán"], isActive: true, label: "Wallet", defaultColor: ICON_COLORS.GREEN, group: "organization" },
  VAULT: { keywords: ["vault", "secure", "safe", "secret", "private", "bảo mật", "an toàn"], isActive: true, label: "Vault", defaultColor: ICON_COLORS.BROWN, group: "organization" },
  RULE: { keywords: ["rule", "policy", "regulation", "guideline", "standard", "quy tắc", "chính sách"], isActive: true, label: "Rule", defaultColor: ICON_COLORS.DEEP_PURPLE, group: "organization" },
  RELATIONSHIP: { keywords: ["relationship", "connection", "network", "social", "mối quan hệ", "kết nối"], isActive: true, label: "Relationship", defaultColor: ICON_COLORS.PINK, group: "organization" },
  ADJUSTMENT: { keywords: ["adjustment", "setting", "config", "configuration", "điều chỉnh", "cài đặt"], isActive: true, label: "Adjustment", defaultColor: ICON_COLORS.GREY, group: "organization" },
  WARNING: { keywords: ["warning", "alert", "danger", "error", "critical", "cảnh báo", "lỗi"], isActive: true, label: "Warning", defaultColor: ICON_COLORS.ORANGE, group: "organization" },
  USER: { keywords: ["user", "profile", "account", "person", "member", "người dùng"], isActive: false, label: "User", defaultColor: ICON_COLORS.BLUE, group: "organization" },
  USERS: { keywords: ["users", "team", "group", "community", "organization", "nhóm", "đội"], isActive: false, label: "Users", defaultColor: ICON_COLORS.BLUE, group: "organization" },
  TAG: { keywords: ["tag", "label", "category", "keyword", "topic", "thẻ", "nhãn"], isActive: false, label: "Tag", defaultColor: ICON_COLORS.PURPLE, group: "organization" },
  STAR: { keywords: ["star", "favorite", "bookmark", "featured", "đánh dấu", "nổi bật"], isActive: false, label: "Star", defaultColor: ICON_COLORS.AMBER, group: "organization" },
  CHECK: { keywords: ["check", "done", "complete", "approved", "verified", "hoàn thành"], isActive: false, label: "Check", defaultColor: ICON_COLORS.GREEN, group: "organization" },
};

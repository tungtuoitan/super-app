import { IconType } from "@/types/icon.types";
import { fuzzyMatchWithDiacritics } from "@/utils/fuzzy-search.utils";
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
    FileText as PdfIcon,
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
    type LucideIcon,
} from "lucide-react";

type IconProps = {
    type: IconType;
    color?: string;
    size?: number;
};

// Icon map with Lucide components
export const ICON_MAP: Record<IconType, LucideIcon> = {
    BIN: Trash2,
    FOLDER: Folder,
    TASK: CheckSquare,
    NOTE: StickyNote,
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

    /* 🔹 NEW TYPES */
    PLAN: Folder,
    DETAIL: Info,
    IMPORTANT: Star,
    URGENT: AlertTriangle,
};



// Icon configuration with keywords and isActive flag
export interface IconConfig {
    keywords: string[];
    isActive: boolean;
    label: string;
}

export const ICON_CONFIG: Record<IconType, IconConfig> = {
  BIN: {
    keywords: [
      "trash", "delete", "remove", "garbage", "recycle", "bin", "waste",
      "thùng rác", "xóa", "loại bỏ"
    ],
    isActive: false,
    label: "Bin",
  },

  FOLDER: {
    keywords: [
      "folder", "directory", "collection", "group",
      "thư mục", "nhóm"
    ],
    isActive: false,
    label: "Folder",
  },

  TASK: {
    keywords: [
      "task", "todo", "checklist", "action", "work", "job", "assignment", "project",
      "công việc", "nhiệm vụ", "việc làm"
    ],
    isActive: true,
    label: "Task",
  },

  NOTE: {
    keywords: [
      "note", "memo", "sticky", "reminder", "draft",
      "ghi chú", "nhắc nhở"
    ],
    isActive: true,
    label: "Note",
  },

  FILE: {
    keywords: [
      "file", "document", "text", "report", "article",
      "tệp", "tài liệu", "văn bản"
    ],
    isActive: true,
    label: "File",
  },

  INFORMATION: {
    keywords: [
      "info", "information", "about", "help", "description", "readme",
      "thông tin", "hướng dẫn", "giới thiệu"
    ],
    isActive: true,
    label: "Info",
  },

  WARNING: {
    keywords: [
      "warning", "alert", "danger", "error", "critical",
      "cảnh báo", "nguy hiểm", "lỗi"
    ],
    isActive: true,
    label: "Warning",
  },

  LINK: {
    keywords: [
      "link", "url", "reference", "resource", "website",
      "liên kết", "đường dẫn"
    ],
    isActive: true,
    label: "Link",
  },

  CALENDAR: {
    keywords: [
      "calendar", "schedule", "event", "date", "meeting", "appointment", "timeline",
      "lịch", "kế hoạch", "cuộc hẹn", "sự kiện"
    ],
    isActive: true,
    label: "Calendar",
  },

  PLAN: {
    keywords: [
      "plan", "planning", "roadmap", "strategy", "milestone",
      "kế hoạch", "lộ trình", "định hướng"
    ],
    isActive: true,
    label: "Plan",
  },

  DETAIL: {
    keywords: [
      "detail", "details", "description", "breakdown", "specification",
      "chi tiết", "mô tả", "cụ thể"
    ],
    isActive: true,
    label: "Detail",
  },

  IMPORTANT: {
    keywords: [
      "important", "priority", "key", "highlight",
      "quan trọng", "ưu tiên"
    ],
    isActive: true,
    label: "Important",
  },

  URGENT: {
    keywords: [
      "urgent", "immediate", "critical", "emergency",
      "khẩn cấp", "cấp bách"
    ],
    isActive: true,
    label: "Urgent",
  },

  IMAGE: {
    keywords: [
      "image", "photo", "picture", "gallery", "graphic", "design", "art",
      "hình ảnh", "ảnh"
    ],
    isActive: false,
    label: "Image",
  },

  VIDEO: {
    keywords: [
      "video", "movie", "film", "clip", "media",
      "video", "phim"
    ],
    isActive: false,
    label: "Video",
  },

  AUDIO: {
    keywords: [
      "audio", "music", "sound", "song", "podcast", "voice",
      "âm thanh", "nhạc", "ghi âm"
    ],
    isActive: false,
    label: "Audio",
  },

  PDF: {
    keywords: [
      "pdf", "ebook", "book", "manual", "guide", "tutorial",
      "tài liệu", "sách", "hướng dẫn"
    ],
    isActive: false,
    label: "PDF",
  },

  USER: {
    keywords: [
      "user", "profile", "account", "person", "member",
      "người dùng", "tài khoản", "cá nhân"
    ],
    isActive: false,
    label: "User",
  },

  USERS: {
    keywords: [
      "users", "team", "group", "community", "organization",
      "nhóm", "đội"
    ],
    isActive: false,
    label: "Users",
  },

  CLOCK: {
    keywords: [
      "clock", "time", "timer", "deadline", "schedule", "history",
      "thời gian", "lịch sử"
    ],
    isActive: false,
    label: "Clock",
  },

  HEART: {
    keywords: [
      "heart", "love", "favorite", "saved",
      "yêu thích", "đã lưu"
    ],
    isActive: false,
    label: "Heart",
  },

  STAR: {
    keywords: [
      "star", "favorite", "bookmark", "featured", "highlight",
      "đánh dấu", "nổi bật"
    ],
    isActive: false,
    label: "Star",
  },

  TAG: {
    keywords: [
      "tag", "label", "category", "keyword", "topic", "subject",
      "thẻ", "nhãn", "chủ đề"
    ],
    isActive: false,
    label: "Tag",
  },

  CHECK: {
    keywords: [
      "check", "done", "complete", "approved", "verified", "success",
      "hoàn thành", "đã xong"
    ],
    isActive: false,
    label: "Check",
  },
};



// Helper to get active icons only
export function getActiveIcons(): Array<{ type: IconType; Icon: LucideIcon; config: IconConfig }> {
    return Object.entries(ICON_CONFIG)
        .filter(([_, config]) => config.isActive)
        .map(([type, config]) => ({
            type: type as IconType,
            Icon: ICON_MAP[type as IconType],
            config,
        }));
}

// Get all keywords from active icons for autocomplete suggestions
export function getAllIconKeywords(): Array<{ id: string; label: string; iconType: IconType }> {
    const keywords: Array<{ id: string; label: string; iconType: IconType }> = [];

    for (const [iconType, config] of Object.entries(ICON_CONFIG)) {
        if (!config.isActive) continue;

        for (const keyword of config.keywords) {
            // Capitalize first letter for display
            const label = keyword.charAt(0).toUpperCase() + keyword.slice(1);
            keywords.push({
                id: `${iconType}-${keyword}`,
                label,
                iconType: iconType as IconType,
            });
        }
    }

    // Sort alphabetically
    return keywords.sort((a, b) => a.label.localeCompare(b.label));
}


export function getAllIconLabel(): Array<{
  id: IconType;
  label: string;
  iconType: IconType;
}> {
  return (Object.entries(ICON_CONFIG) as [IconType, IconConfig][])
    .filter(([_, config]) => config.isActive)
    .map(([iconType, config]) => ({
      id: iconType,
      label: config.label,
      iconType,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}


/**
 * Find the best matching icon based on folder name
 * Returns null if no good match found (will use default FOLDER icon)
 * Only considers active icons
 * Uses fuzzyMatchWithDiacritics for Vietnamese diacritics support
 */
export function findBestIconMatch(folderName: string): IconType | null {
    if (!folderName || folderName.trim().length < 2) return null;

    const query = folderName.trim();
    let bestMatch: IconType | null = null;
    let bestScore = 0;

    for (const [iconType, config] of Object.entries(ICON_CONFIG)) {
        // Skip inactive icons and special icons (FOLDER, BIN)
        if (!config.isActive || iconType === "FOLDER" || iconType === "BIN") continue;

        for (const keyword of config.keywords) {
            // Use fuzzyMatchWithDiacritics for better Vietnamese support
            const result = fuzzyMatchWithDiacritics(keyword, [query]);
            if (result.match && result.score > bestScore) {
                bestScore = result.score;
                bestMatch = iconType as IconType;
            }
        }
    }

    return bestMatch;
}

type GetIconParams = {
    type: IconType;
    color?: string;
    size?: number;
    className?: string;
};

export function getIconByType({ type, color = "currentColor", size = 20, className }: GetIconParams) {
    const Icon = ICON_MAP[type];
    if (!Icon) return null;

    return <Icon size={size} color={color} className={className} />;
}

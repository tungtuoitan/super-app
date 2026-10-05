/**
 * Link = workspace file item (entityType 4) whose file has mimeType "text/x-uri" and url = external URL.
 * Task #1477.
 */
export const linkConstants = {
    mimeType: "text/x-uri",
    entityTypeFile: 4,
    projectFolderName: "Links",
    maxUrlLength: 1000,
    maxNameLength: 255,
    kinds: {
        github: "github",
        drive: "drive",
        web: "web",
    },
} as const;

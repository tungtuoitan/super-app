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
    /** Custom protocol handled by a script on Tung's machine → opens the repo/file in VS Code (task #1488). */
    localOpenPrefix: "tungroot://open?url=",
    /** First path segments of github.com that are site pages, not an owner (/orgs/x, /settings/tokens…). */
    githubNonRepoOwners: ["orgs", "settings", "users", "apps", "marketplace", "topics", "sponsors", "features", "explore", "notifications", "login"],
    kinds: {
        github: "github",
        drive: "drive",
        web: "web",
    },
} as const;

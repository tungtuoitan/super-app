/**
 * SuperApp API from the extension (TungRoot #1485).
 * Auth = the browser's own SuperApp session: POST /api/auth/refresh with credentials sends the
 * httpOnly refreshToken cookie (extensions with host permission count as same-site) and returns a
 * fresh access token. No password or token is ever typed into or stored by the extension, except
 * the short-lived access token kept in chrome.storage.session (memory only).
 */

const TOKEN_KEY = "accessToken";

export class NeedLoginError extends Error {}

const jwtExpMs = (token) => {
    try {
        const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        return payload.exp * 1000;
    } catch {
        return 0;
    }
};

async function refreshToken(apiBase) {
    const res = await fetch(`${apiBase}/api/auth/refresh`, { method: "POST", credentials: "include" });
    if (res.status === 401) throw new NeedLoginError("Chưa đăng nhập SuperApp trong trình duyệt này");
    if (!res.ok) throw new Error(`refresh HTTP ${res.status}`);
    const body = await res.json();
    const token = body?.user?.token;
    if (!body?.success || !token) throw new NeedLoginError("Refresh không trả token");
    await chrome.storage.session.set({ [TOKEN_KEY]: token });
    return token;
}

async function getToken(apiBase) {
    const { [TOKEN_KEY]: cached } = await chrome.storage.session.get(TOKEN_KEY);
    if (cached && jwtExpMs(cached) - Date.now() > 60000) return cached;
    return refreshToken(apiBase);
}

/** fetch JSON with the access token; one refresh + retry on 401. */
async function call(apiBase, method, path, body) {
    const send = (token) => fetch(`${apiBase}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    let res = await send(await getToken(apiBase));
    if (res.status === 401) res = await send(await refreshToken(apiBase));
    if (res.status === 401) throw new NeedLoginError("Phiên SuperApp đã hết");
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.success === false) {
        const err = new Error(`${method} ${path} → HTTP ${res.status}: ${json?.message ?? ""}`);
        err.status = json?.status ?? res.status;
        throw err;
    }
    return json;
}

/** Tracker task (its description holds the question bank). */
export async function fetchTrackerDescription(apiBase, taskId) {
    const json = await call(apiBase, "GET", `/api/task/${taskId}`);
    const task = json.object ?? json.data?.[0];
    if (!task) throw new Error(`Không đọc được task #${taskId}`);
    return task.description ?? "";
}

/** Record one outcome as a task comment. occurredAt = when the user reacted. */
export function postComment(apiBase, item) {
    return call(apiBase, "POST", "/api/taskcomment", {
        id: 0,
        taskId: item.taskId,
        type: item.type,
        content: item.content,
        occurredAt: item.occurredAt,
    });
}

# super-app (frontend)

Rule viết code đọc theo thứ tự:

1. Rule chung (mã `G*`): skill `code-rules` — `~/.claude/skills/code-rules/SKILL.md`
2. Rule theo stack của module đang sửa (xem `code-rules.json` → `modules`): `react-ts` → `~/.claude/skills/code-rules/stacks/react-ts.md` (mã `R*`); `js`, `test` chỉ rule chung.
3. Bản đồ repo này (thư mục, ranh giới, cụm feature, module kiểm tra): [`STRUCTURE.md`](STRUCTURE.md)

Thư mục nào có luật riêng thì có `code-rules.feature.json` (rule máy đọc) và/hoặc `CLAUDE.md` (ngữ cảnh) trong thư mục đó.

## Kiểm tra

- Pre-commit hook chặn commit có vi phạm mới: rule [script] + ESLint trên bản stage, rồi AI review rule [ai]. Máy mới: `node ~/.claude/skills/code-rules/check/check.js install-hook`.
- Kiểm cả repo: `npm run check:structure` (thêm `-- --all` để xem nợ cũ). Coverage: `node ~/.claude/skills/code-rules/check/check.js coverage`.
- Dọn nợ xong: `node ~/.claude/skills/code-rules/check/check.js lower-baseline` rồi `git add code-rules.baseline.json`.
- Không dùng `git commit --no-verify`; không tự đặt `CODE_RULES_ALLOW_RELAX` / `CODE_RULES_REVIEW_OVERRIDE`.

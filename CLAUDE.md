# super-app (frontend)

**Stack: `react-ts`** — rule viết code đọc theo thứ tự:

1. Rule chung (mã `G*`): skill `code-rules` — `~/.claude/skills/code-rules/SKILL.md`
2. Rule React/TS (mã `R*`): `~/.claude/skills/code-rules/stacks/react-ts.md`
3. Bản đồ repo này (thư mục, ranh giới, cụm feature, cách cắm feature vào shell): [`STRUCTURE.md`](STRUCTURE.md)

Feature nào có luật riêng thì có `CLAUDE.md` trong thư mục feature đó.

## Kiểm tra

- Pre-commit hook chặn commit có vi phạm mới (chỉ xét file trong commit, kèm ESLint). Máy mới: `node ~/.claude/skills/code-rules/check/check.js install-hook`.
- Kiểm cả repo: `npm run check:structure` (thêm `-- --all` để xem nợ cũ). Cấu hình: `code-rules.json`; nợ cũ: `code-rules.baseline.json`.
- Không dùng `git commit --no-verify`.

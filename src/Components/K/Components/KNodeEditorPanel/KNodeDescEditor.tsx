import { useEffect, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Bold, Italic, Underline as UnderlineIcon, List, ListChecks } from "lucide-react";
import "./KNodeDescEditor.css";
import { removeDiacritics } from "../../utils/searchUtils";

// ── helpers ───────────────────────────────────────────────────────────────────

function isHtml(s: string) {
    return /<[a-z][\s\S]*>/i.test(s);
}

function plainToHtml(text: string) {
    return text
        .split("\n")
        .map((l) => `<p>${l || "<br>"}</p>`)
        .join("");
}

/** Normalize plain text or HTML to HTML for Tiptap. Returns undefined for empty → Tiptap creates empty doc. */
function toTiptapContent(value: string | null | undefined): string | undefined {
    if (!value) return undefined;
    return isHtml(value) ? value : plainToHtml(value);
}

// ── BubbleBtn ─────────────────────────────────────────────────────────────────

function BubbleBtn({ onClick, active, title, children }: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onClick(); }}
            title={title}
            className={`p-1 rounded transition-colors ${active ? "bg-zinc-600 text-zinc-100" : "text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"}`}
        >
            {children}
        </button>
    );
}

// ── KNodeDescEditor ───────────────────────────────────────────────────────────

interface KNodeDescEditorProps {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    autoFocus?: boolean;
    onEscape: () => void;
    onCtrlEnter: () => void;
}

export function KNodeDescEditor({ value, onChange, placeholder, autoFocus, onEscape, onCtrlEnter }: KNodeDescEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const bubbleRef = useRef<HTMLDivElement>(null);
    const [showBubble, setShowBubble] = useState(false);
    const [bubblePos, setBubblePos] = useState({ top: 0, left: 0 });

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ heading: { levels: [1, 2] } }),
            Placeholder.configure({ placeholder: placeholder ?? "Description…" }),
            Underline,
            TaskList.configure({ HTMLAttributes: { class: "k-task-list" } }),
            TaskItem.configure({ nested: true, HTMLAttributes: { class: "k-task-item" } }),
        ],
        content: toTiptapContent(value),
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            handleKeyDown: (_view, e) => {
                if (e.key === "Escape") { onEscape(); return true; }
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { onCtrlEnter(); return true; }
                return false;
            },
        },
    });

    // Focus on mount if needed
    useEffect(() => {
        if (autoFocus && editor) {
            editor.commands.focus("end");
        }
    }, [editor, autoFocus]);

    // Bubble menu: track selection and compute position in event handler (never during render)
    useEffect(() => {
        if (!editor) return;

        const onSelectionUpdate = () => {
            const { empty } = editor.state.selection;
            if (empty) { setShowBubble(false); return; }

            const { from, to } = editor.state.selection;
            const start = editor.view.coordsAtPos(from);
            const end = editor.view.coordsAtPos(to);

            // coordsAtPos returns viewport-relative coords — use position:fixed to avoid overflow clipping
            const menuW = 180;
            const left = Math.max(8, (start.left + end.left) / 2 - menuW / 2);
            const spaceAbove = start.top;
            const top = spaceAbove < 44 ? end.bottom + 4 : start.top - 36;

            setBubblePos({ top, left });
            setShowBubble(true);
        };

        const onBlur = () => {
            setTimeout(() => {
                if (!bubbleRef.current?.contains(document.activeElement)) {
                    setShowBubble(false);
                }
            }, 150);
        };

        editor.on("selectionUpdate", onSelectionUpdate);
        editor.on("blur", onBlur);
        return () => {
            editor.off("selectionUpdate", onSelectionUpdate);
            editor.off("blur", onBlur);
        };
    }, [editor]);

    if (!editor) return null;

    return (
        <div ref={containerRef} className="k-node-desc-editor">
            {showBubble && (
                <div
                    ref={bubbleRef}
                    style={{ position: "fixed", top: bubblePos.top, left: bubblePos.left, zIndex: 9999 }}
                    className="flex items-center gap-0.5 px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded shadow-lg"
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <BubbleBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold (Ctrl+B)">
                        <Bold className="w-3 h-3" />
                    </BubbleBtn>
                    <BubbleBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic (Ctrl+I)">
                        <Italic className="w-3 h-3" />
                    </BubbleBtn>
                    <BubbleBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline (Ctrl+U)">
                        <UnderlineIcon className="w-3 h-3" />
                    </BubbleBtn>
                    <div className="w-px h-3.5 bg-zinc-600 mx-0.5" />
                    <BubbleBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
                        <List className="w-3 h-3" />
                    </BubbleBtn>
                    <BubbleBtn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive("taskList")} title="Checklist">
                        <ListChecks className="w-3 h-3" />
                    </BubbleBtn>
                </div>
            )}
            <EditorContent editor={editor} />
        </div>
    );
}

// ── KNodeDescView ─────────────────────────────────────────────────────────────

/** Strip HTML tags → plain text (used for search filtering) */
export function stripHtmlToText(html: string): string {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Inject <mark> highlight into HTML — diacritic-insensitive, operates only on text nodes */
function highlightInHtml(html: string, query: string): string {
    if (!query.trim()) return html;
    const normalizedQuery = removeDiacritics(query.trim()).toLowerCase();
    if (!normalizedQuery) return html;

    return html
        .split(/(<[^>]+>)/)
        .map(part => {
            if (part.startsWith("<")) return part; // HTML tag — leave untouched
            const nfcPart        = part.normalize("NFC");
            const normalizedPart = removeDiacritics(nfcPart).toLowerCase();
            let result = "";
            let i = 0;
            while (i < nfcPart.length) {
                const matchIdx = normalizedPart.indexOf(normalizedQuery, i);
                if (matchIdx === -1) { result += nfcPart.slice(i); break; }
                result += nfcPart.slice(i, matchIdx);
                result += `<mark style="background:rgb(250 204 21/0.8);color:black;border-radius:2px;padding:0 2px">${nfcPart.slice(matchIdx, matchIdx + normalizedQuery.length)}</mark>`;
                i = matchIdx + normalizedQuery.length;
            }
            return result;
        })
        .join("");
}

export function KNodeDescView({ value, highlight }: { value: string | null | undefined; highlight?: string }) {
    if (!value) return null;
    const html = isHtml(value) ? value : plainToHtml(value);
    const displayHtml = highlight ? highlightInHtml(html, highlight) : html;
    return (
        <div
            className="k-node-desc-view text-xs text-zinc-400 leading-relaxed break-words min-h-full"
            dangerouslySetInnerHTML={{ __html: displayHtml }}
        />
    );
}

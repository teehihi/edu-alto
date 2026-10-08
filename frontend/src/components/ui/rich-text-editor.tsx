"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ImagePlus,
  Italic,
  Link,
  List,
  ListOrdered,
  Underline,
} from "lucide-react";
import { sanitizeCourseDescription } from "@/lib/course-description";

type RichTextEditorProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
};

type ToolbarButtonProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
};

function ToolbarButton({ label, active, disabled = false, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`focus-ring inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "bg-primary-soft text-primary-dark" : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  label,
  value,
  onChange,
  disabled = false,
  compact = false,
}: RichTextEditorProps) {
  const editorId = useId();
  const [, setSelectionVersion] = useState(0);
  const [toolbarError, setToolbarError] = useState("");
  const lastSyncedValueRef = useRef(sanitizeCourseDescription(value));
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyleKit,
      Image,
    ],
    content: sanitizeCourseDescription(value),
    editorProps: {
      attributes: {
        "aria-label": label,
        class: `px-5 py-4 text-base leading-7 text-slate-800 outline-none [&_h1]:my-4 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:my-3 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:my-3 [&_h3]:text-xl [&_h3]:font-semibold [&_p]:my-2 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-200 [&_blockquote]:pl-4 [&_blockquote]:text-slate-600 [&_a]:text-primary [&_a]:underline [&_img]:my-4 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg ${
          compact ? "min-h-[140px]" : "min-h-[300px]"
        }`,
      },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      const html = updatedEditor.getHTML();
      lastSyncedValueRef.current = sanitizeCourseDescription(html);
      onChange(html);
    },
    onSelectionUpdate: () => setSelectionVersion((version) => version + 1),
    onTransaction: () => setSelectionVersion((version) => version + 1),
  });

  useEffect(() => {
    if (!editor) return;
    const sanitized = sanitizeCourseDescription(value);
    if (lastSyncedValueRef.current !== sanitized) {
      editor.commands.setContent(sanitized, { emitUpdate: false });
      lastSyncedValueRef.current = sanitized;
    }
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  const updateContent = (action: () => void) => {
    setToolbarError("");
    action();
  };

  const insertLink = () => {
    if (!editor) return;
    const currentUrl = editor.getAttributes("link").href as string | undefined;
    const input = window.prompt("Nhập đường dẫn liên kết", currentUrl ?? "https://");
    if (input === null) return;
    if (!input.trim()) {
      updateContent(() => editor.chain().focus().unsetLink().run());
      return;
    }

    try {
      const url = new URL(input.trim());
      if (!new Set(["http:", "https:", "mailto:"]).has(url.protocol)) throw new Error();
      updateContent(() =>
        editor.chain().focus().extendMarkRange("link").setLink({ href: url.toString() }).run(),
      );
    } catch {
      setToolbarError("Vui lòng nhập liên kết bắt đầu bằng http://, https:// hoặc mailto:.");
    }
  };

  const insertImage = () => {
    if (!editor) return;
    const input = window.prompt("Dán đường dẫn ảnh HTTPS");
    if (input === null || !input.trim()) return;

    try {
      const url = new URL(input.trim());
      if (url.protocol !== "https:") throw new Error();
      updateContent(() => editor.chain().focus().setImage({ src: url.toString() }).run());
    } catch {
      setToolbarError("Đường dẫn ảnh phải bắt đầu bằng https://.");
    }
  };

  const editorDisabled = !editor || disabled;
  const activeAlignment =
    (["left", "center", "right", "justify"] as const).find(
      (alignment) =>
        editor?.isActive("paragraph", { textAlign: alignment }) ||
        editor?.isActive("heading", { textAlign: alignment }),
    ) ?? "left";

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
      <div
        role="toolbar"
        aria-label="Định dạng nội dung mô tả"
        className="flex min-h-[50px] flex-wrap items-center gap-1 border-b border-slate-200 bg-white px-2 py-1.5 shadow-xs"
      >
        <label className="sr-only" htmlFor={`${editorId}-block-style`}>
          Kiểu đoạn văn
        </label>
        <select
          id={`${editorId}-block-style`}
          aria-label="Kiểu đoạn văn"
          disabled={editorDisabled}
          value={
            editor?.isActive("heading", { level: 1 })
              ? "h1"
              : editor?.isActive("heading", { level: 2 })
                ? "h2"
                : editor?.isActive("heading", { level: 3 })
                  ? "h3"
                  : "paragraph"
          }
          onChange={(event) => {
            if (!editor) return;
            updateContent(() => {
              const level = Number(event.target.value.replace("h", ""));
              if (event.target.value === "paragraph") editor.chain().focus().setParagraph().run();
              else
                editor
                  .chain()
                  .focus()
                  .toggleHeading({ level: level as 1 | 2 | 3 })
                  .run();
            });
          }}
          className="focus-ring h-9 max-w-32 rounded-md border-0 bg-white px-2 text-sm text-slate-700 disabled:opacity-40"
        >
          <option value="paragraph">Đoạn văn</option>
          <option value="h1">Tiêu đề 1</option>
          <option value="h2">Tiêu đề 2</option>
          <option value="h3">Tiêu đề 3</option>
        </select>

        <span aria-hidden="true" className="mx-1 h-7 border-l border-slate-200" />
        <label className="sr-only" htmlFor={`${editorId}-font-size`}>
          Cỡ chữ
        </label>
        <select
          id={`${editorId}-font-size`}
          aria-label="Cỡ chữ"
          disabled={editorDisabled}
          value={editor?.getAttributes("textStyle").fontSize ?? "14px"}
          onChange={(event) =>
            editor &&
            updateContent(() => editor.chain().focus().setFontSize(event.target.value).run())
          }
          className="focus-ring h-9 w-[62px] rounded-md border-0 bg-white px-2 text-sm text-slate-700 disabled:opacity-40"
        >
          <option value="12px">12</option>
          <option value="14px">14</option>
          <option value="16px">16</option>
          <option value="18px">18</option>
          <option value="24px">24</option>
          <option value="32px">32</option>
        </select>

        <span aria-hidden="true" className="mx-1 h-7 border-l border-slate-200" />
        <label
          title="Màu chữ"
          className="focus-ring relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-100"
        >
          <span aria-hidden="true" className="border-b-2 border-primary px-1 font-bold">
            A
          </span>
          <input
            type="color"
            aria-label="Màu chữ"
            disabled={editorDisabled}
            value={editor?.getAttributes("textStyle").color ?? "#0f172a"}
            onChange={(event) =>
              editor &&
              updateContent(() => editor.chain().focus().setColor(event.target.value).run())
            }
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
        </label>
        <ToolbarButton
          label="In đậm"
          active={Boolean(editor?.isActive("bold"))}
          disabled={editorDisabled}
          onClick={() => editor && updateContent(() => editor.chain().focus().toggleBold().run())}
        >
          <Bold className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="In nghiêng"
          active={Boolean(editor?.isActive("italic"))}
          disabled={editorDisabled}
          onClick={() => editor && updateContent(() => editor.chain().focus().toggleItalic().run())}
        >
          <Italic className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Gạch chân"
          active={Boolean(editor?.isActive("underline"))}
          disabled={editorDisabled}
          onClick={() =>
            editor && updateContent(() => editor.chain().focus().toggleUnderline().run())
          }
        >
          <Underline className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>

        <span aria-hidden="true" className="mx-1 h-7 border-l border-slate-200" />
        {[
          { value: "left", label: "Căn trái", Icon: AlignLeft },
          { value: "center", label: "Căn giữa", Icon: AlignCenter },
          { value: "right", label: "Căn phải", Icon: AlignRight },
          { value: "justify", label: "Căn đều", Icon: AlignJustify },
        ].map(({ value: alignment, label: alignmentLabel, Icon }) => (
          <ToolbarButton
            key={alignment}
            label={alignmentLabel}
            active={activeAlignment === alignment}
            disabled={editorDisabled}
            onClick={() =>
              editor && updateContent(() => editor.chain().focus().setTextAlign(alignment).run())
            }
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>
        ))}

        <span aria-hidden="true" className="mx-1 h-7 border-l border-slate-200" />
        <ToolbarButton
          label="Danh sách gạch đầu dòng"
          active={Boolean(editor?.isActive("bulletList"))}
          disabled={editorDisabled}
          onClick={() =>
            editor && updateContent(() => editor.chain().focus().toggleBulletList().run())
          }
        >
          <List className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Danh sách đánh số"
          active={Boolean(editor?.isActive("orderedList"))}
          disabled={editorDisabled}
          onClick={() =>
            editor && updateContent(() => editor.chain().focus().toggleOrderedList().run())
          }
        >
          <ListOrdered className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <span aria-hidden="true" className="mx-1 h-7 border-l border-slate-200" />
        <ToolbarButton label="Chèn ảnh" disabled={editorDisabled} onClick={insertImage}>
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Chèn liên kết"
          active={Boolean(editor?.isActive("link"))}
          disabled={editorDisabled}
          onClick={insertLink}
        >
          <Link className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
      {toolbarError ? (
        <p role="alert" className="border-t border-rose-100 px-4 py-2 text-xs text-rose-700">
          {toolbarError}
        </p>
      ) : null}
    </div>
  );
}

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  List,
  ListOrdered,
  Quote,
  CodeSquare,
  Undo,
  Redo,
  RemoveFormatting
} from 'lucide-react';
import { Button } from './button';

interface MenuBarProps {
  editor: any;
}

const MenuBar = ({ editor }: MenuBarProps) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-border bg-muted/40 rounded-t-[1.3rem]">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`h-8 w-8 p-1 rounded-xl transition-all ${
          editor.isActive('bold') ? 'bg-primary/10 text-primary scale-105' : 'text-muted-foreground hover:bg-background'
        }`}
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`h-8 w-8 p-1 rounded-xl transition-all ${
          editor.isActive('italic') ? 'bg-primary/10 text-primary scale-105' : 'text-muted-foreground hover:bg-background'
        }`}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={`h-8 w-8 p-1 rounded-xl transition-all ${
          editor.isActive('strike') ? 'bg-primary/10 text-primary scale-105' : 'text-muted-foreground hover:bg-background'
        }`}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>

      <div className="w-[1px] h-6 bg-border mx-1 self-center" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`h-8 w-8 p-1 rounded-xl transition-all ${
          editor.isActive('heading', { level: 2 }) ? 'bg-primary/10 text-primary scale-105' : 'text-muted-foreground hover:bg-background'
        }`}
        title="Heading"
      >
        <Heading2 className="h-4 w-4" />
      </Button>

      <div className="w-[1px] h-6 bg-border mx-1 self-center" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`h-8 w-8 p-1 rounded-xl transition-all ${
          editor.isActive('bulletList') ? 'bg-primary/10 text-primary scale-105' : 'text-muted-foreground hover:bg-background'
        }`}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`h-8 w-8 p-1 rounded-xl transition-all ${
          editor.isActive('orderedList') ? 'bg-primary/10 text-primary scale-105' : 'text-muted-foreground hover:bg-background'
        }`}
        title="Ordered List"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <div className="w-[1px] h-6 bg-border mx-1 self-center" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`h-8 w-8 p-1 rounded-xl transition-all ${
          editor.isActive('blockquote') ? 'bg-primary/10 text-primary scale-105' : 'text-muted-foreground hover:bg-background'
        }`}
        title="Quote"
      >
        <Quote className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={`h-8 w-8 p-1 rounded-xl transition-all ${
          editor.isActive('codeBlock') ? 'bg-primary/10 text-primary scale-105' : 'text-muted-foreground hover:bg-background'
        }`}
        title="Code Block"
      >
        <CodeSquare className="h-4 w-4" />
      </Button>

      <div className="w-[1px] h-6 bg-border mx-1 self-center" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        className="h-8 w-8 p-1 rounded-xl text-muted-foreground hover:bg-background transition-all"
        title="Clear Formatting"
      >
        <RemoveFormatting className="h-4 w-4" />
      </Button>

      <div className="ml-auto flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="h-8 w-8 p-1 rounded-xl text-muted-foreground hover:bg-background transition-all"
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="h-8 w-8 p-1 rounded-xl text-muted-foreground hover:bg-background transition-all"
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          HTMLAttributes: { class: 'list-disc pl-5 my-2 space-y-1' },
        },
        orderedList: {
          HTMLAttributes: { class: 'list-decimal pl-5 my-2 space-y-1' },
        },
        blockquote: {
          HTMLAttributes: { class: 'pl-4 border-l-4 border-primary/50 text-muted-foreground italic my-2' },
        },
        codeBlock: {
          HTMLAttributes: { class: 'bg-muted p-4 rounded-lg font-mono text-sm my-2 text-foreground overflow-x-auto whitespace-pre-wrap' },
        },
        code: {
          HTMLAttributes: { class: 'bg-muted px-1.5 py-0.5 rounded text-primary font-mono text-xs' },
        },
        heading: {
          levels: [2],
          HTMLAttributes: { class: 'text-2xl font-bold mt-4 mb-2 text-foreground' },
        },
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'min-h-[160px] max-h-[400px] overflow-y-auto px-4 py-3 outline-none text-foreground text-[15px] leading-relaxed tiptap-prose',
      },
    },
  });

  // Effect to sync external content changes (e.g., when the form is cleared)
  // We use editor.setContent so we don't accidentally wipe out user typing if not needed,
  // but if `content` is entirely empty (form reset), we clear it.
  useEffect(() => {
    if (editor && content === '' && editor.getHTML() !== '<p></p>') {
      editor.commands.clearContent(true);
    }
  }, [content, editor]);

  return (
    <div className="bg-background border flex flex-col border-border rounded-2xl focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all shadow-sm">
      <MenuBar editor={editor} />
      <div className="relative">
         {editor && editor.isEmpty && (
           <div className="absolute top-3 left-4 text-muted-foreground pointer-events-none select-none text-[15px]">
             {placeholder || "Nội dung bài viết..."}
           </div>
         )}
         <EditorContent editor={editor} />
      </div>
    </div>
  );
}

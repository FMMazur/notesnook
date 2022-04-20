import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorOptions, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useMemo } from "react";
import { EditorView } from "prosemirror-view";
import Toolbar from "./toolbar";
import TextAlign from "@tiptap/extension-text-align";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import FontSize from "./extensions/font-size";
import TextDirection from "./extensions/text-direction";
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import BulletList from "./extensions/bullet-list";
import OrderedList from "./extensions/ordered-list";
import Highlight from "@tiptap/extension-highlight";
import Color from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "./extensions/table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { ImageNode } from "./extensions/image";
import { ThemeConfig } from "@notesnook/theme/dist/theme/types";
import { useTheme } from "@notesnook/theme";
import { AttachmentNode, AttachmentOptions } from "./extensions/attachment";
import { TaskListNode } from "./extensions/task-list";
import { TaskItemNode } from "./extensions/task-item";
import { Dropcursor } from "./extensions/drop-cursor";

EditorView.prototype.updateState = function updateState(state) {
  if (!(this as any).docView) return; // This prevents the matchesNode error on hot reloads
  (this as any).updateStateInner(state, this.state.plugins != state.plugins);
};

const useTiptap = (
  options: Partial<EditorOptions & ThemeConfig & AttachmentOptions> = {},
  deps?: React.DependencyList
) => {
  const {
    theme,
    accent,
    scale,
    onCreate,
    onDownloadAttachment,
    ...restOptions
  } = options;

  const defaultOptions = useMemo<Partial<EditorOptions>>(
    () => ({
      extensions: [
        TextStyle,
        StarterKit.configure({
          dropcursor: false,
        }),
        Dropcursor.configure({
          class: "drop-cursor",
        }),
        CharacterCount,
        Underline,
        Subscript,
        Superscript,
        FontSize,
        TextDirection,
        FontFamily,
        BulletList,
        OrderedList,
        TaskItemNode.configure({ nested: true }),
        TaskListNode,
        Link,
        Table.configure({
          resizable: true,
          allowTableNodeSelection: true,
        }),
        TableRow,
        TableCell,
        TableHeader,
        Highlight.configure({
          multicolor: true,
        }),
        Color,
        TextAlign.configure({
          types: ["heading", "paragraph"],
          alignments: ["left", "right", "center", "justify"],
          defaultAlignment: "left",
        }),
        Placeholder.configure({
          placeholder: "Start writing your note...",
        }),

        ImageNode,
        AttachmentNode.configure({
          onDownloadAttachment,
        }),
      ],
      onCreate: ({ editor }) => {
        if (theme && accent && scale) {
          editor.storage.theme = useTheme({ theme, accent, scale });
        }
        if (onCreate) onCreate({ editor });
      },
    }),
    [theme, accent, scale, onCreate, onDownloadAttachment]
  );

  const editor = useEditor({ ...defaultOptions, ...restOptions }, deps);

  /**
   * Add editor to global for use in React Native.
   */
  global.editor = editor;
  return editor;
};

export { useTiptap, Toolbar };

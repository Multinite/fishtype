import { useContext, useEffect, useMemo, useState } from "react";

import { Editor, useEditor } from "@tiptap/react";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { TiptapCollabProvider, WebSocketStatus } from "@hocuspocus/provider";
import type { Doc as YDoc } from "yjs";

import { ExtensionKit } from "@/extensions/extension-kit";
import { EditorContext } from "../context/EditorContext";
import { userColors, userNames } from "../lib/constants";
import { randomElement } from "../lib/utils";
import { EditorUser } from "../components/BlockEditor/types";
import { useSidebar } from "./useSidebar";
const initialContent = `<h1>Hello World</h1><p>How are you?</p><p> </p>`;

declare global {
  interface Window {
    editor: Editor | null;
  }
}

export const useBlockEditor = ({
  aiToken,
  ydoc,
  provider,
}: {
  aiToken: string;
  ydoc: YDoc;
  provider?: TiptapCollabProvider | null | undefined;
}) => {
  const leftSidebar = useSidebar();
  const [collabState, setCollabState] = useState<WebSocketStatus>(
    provider ? WebSocketStatus.Connecting : WebSocketStatus.Disconnected
  );
  const { setIsAiLoading, setAiError } = useContext(EditorContext);

  const editor = useEditor(
    {
      immediatelyRender: false,
      autofocus: true,
      onCreate: ({ editor }) => {
        if (provider) {
          provider.on("synced", () => {
            if (editor.isEmpty) {
              editor.commands.setContent(initialContent);
              editor.commands.focus(28, { scrollIntoView: true });
            }
          });
        } else {
          editor.commands.setContent(initialContent);
          // editor.commands.focus("start", { scrollIntoView: true });
          editor.commands.focus(28, { scrollIntoView: true });
        }
      },
      extensions: [
        ...ExtensionKit({
          provider,
        }),
        provider
          ? Collaboration.configure({
              document: ydoc,
            })
          : undefined,
        provider
          ? CollaborationCursor.configure({
              provider,
              user: {
                name: randomElement(userNames),
                color: randomElement(userColors),
              },
            })
          : undefined,
      ].filter((e) => !!e),
      editorProps: {
        attributes: {
          autocomplete: "off",
          autocorrect: "off",
          autocapitalize: "off",
          class: "min-h-full",
        },
      },
    },
    [ydoc, provider]
  );

  const users = useMemo(() => {
    if (!editor?.storage.collaborationCursor?.users) {
      return [];
    }

    return editor.storage.collaborationCursor?.users.map((user: EditorUser) => {
      const names = user.name?.split(" ");
      const firstName = names?.[0];
      const lastName = names?.[names.length - 1];
      const initials = `${firstName?.[0] || "?"}${lastName?.[0] || "?"}`;

      return { ...user, initials: initials.length ? initials : "?" };
    });
  }, [editor?.storage.collaborationCursor?.users]);

  const characterCount = editor?.storage.characterCount || {
    characters: () => 0,
    words: () => 0,
  };

  useEffect(() => {
    provider?.on("status", (event: { status: WebSocketStatus }) => {
      setCollabState(event.status);
    });
  }, [provider]);

  window.editor = editor;

  return { editor, users, characterCount, collabState, leftSidebar };
};

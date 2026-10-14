# File explorer

Code: `src/mainview/components/explorer/`, `src/bun/files.ts` (SKU folder operations, path guard), upload server in `src/bun/index.ts`.

The product, material and part pages show the content of the SKU's system folder. It must be editable like a real file explorer:

- Copy/paste files from the system file explorer into the app.
- Right-click menu with `New folder`, `Rename`, …
- Multi-file selection to drag-and-drop into a folder, delete, or copy.
- Delete.

## v1 scope

- Browse, new folder, rename, duplicate.
- Delete moves to the OS trash.
- Multi-select.
- Internal drag-and-drop to move.
- Drag-in from the OS. The webview only gets `File` objects, not paths, so it posts the bytes to a localhost upload server in the main process.
- Double-click opens with the default app.
- "Open in system explorer" opens the current folder; "Show in system explorer" on a selected item highlights it.

Deferred: OS clipboard Ctrl+C/V.

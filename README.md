# Pixelboard

A small pixel drawing playground built with JavaScript, HTML, and CSS. Choose a **64 × 64**, **40 × 40**, or **25 × 25** pixel canvas, pick a color, and start drawing. You can save drafts and open them again later. No account or backend is required: the **Log in** button is a preview of the Bluesky login and does not connect to a server yet.

## Get started

Install Node.js 20.19+ or 22.12+ (Node 26 also works), then run:

```sh
npm install
npm run dev
```

Open the local URL printed in the terminal. To create a production build, run `npm run build`; `npm run preview` serves that build locally. Run `npm test` to run the unit tests in `tests/`.

## Drawing

- Click or drag to draw; touch and pen also work.
- Tools: Pencil (**P**), Eraser (**E**), and Eyedropper (**I**). The eraser paints white. The eyedropper picks the color of a cell, then changes back to the pencil.
- Click the Pencil or Eraser button to open its brush panel: size (1 up to a quarter of the canvas size) and shape (Square or Round). Each tool keeps its own size and shape. Close the panel with a second click, **Esc**, or a click outside it.
- When the pointer is over the canvas, an outline shows which cells the brush will change.
- Undo/redo with the buttons or **Ctrl/Cmd + Z** / **Ctrl/Cmd + Shift + Z**. Erase all (beside Eraser) clears the current canvas and is undoable too.
- Select a canvas size with **Canvas size** above the canvas. Each size keeps its own drawing and session undo/redo history.
- Toggle the grid or download a PNG at the selected resolution without the grid.
- Focus the canvas with Tab, move with arrow keys, and paint with Space or Enter. Hold Space while pressing or holding arrow keys to draw a continuous path; release Space to finish one undoable stroke. Keyboard painting uses the current brush size and shape.

## Colors

- The preview box shows the selected color and its alpha (opacity).
- **Recently used** shows the last 5 colors you drew with, newest first. Click one to use that color and alpha again.
- **Color wheel** (open by default): drag on the ring to choose the hue, and in the square to choose saturation (left to right) and brightness (bottom to top). Arrow keys also work; hold Shift for bigger steps.
- **Advanced** (closed by default): sliders and number inputs for H, S, V, R, G, B, and A, and a hex input.
- **Swatches** (closed by default): 36 ready-made colors.
- Alpha mixes the pencil color with the color already in the cell, like a thin layer of watercolor. One stroke mixes each cell only one time. Cells never become transparent.

## Drafts

- The Drafts section is on the left of the canvas and is open each time the page opens. You can close it with its title, but it opens again on the next visit. On narrow screens (720px and below), it is below the canvas and the drafts scroll sideways.
- Click **Save draft** to keep a copy of the current canvas. You can save up to **4 drafts**; delete one to make room for another. Drafts show in the Drafts section, newest first, with a thumbnail, the canvas size, and the save time.
- To open a draft, click it once to select it, then click it again. A dialog asks you to confirm. If the current canvas has unsaved work, a second dialog lets you save it first, load without saving, or cancel.
- Loading a draft is one undo step, so **Ctrl/Cmd + Z** brings back the canvas from before the load.

## Saving in the browser

All three drawings and the selected size automatically save in this browser's local storage. Existing 64 × 64 drawings are preserved. Undo history lasts for the current session (up to 100 actions). Drafts, recently used colors, and the open/closed state of the color sections are also kept in local storage. Browser storage can be cleared, so download any drawing you want to keep. Saving drafts to the user's PDS (AT Protocol Personal Data Server) is planned for later work.

Use **Delete** under a draft thumbnail to remove that saved snapshot from this browser. Deleting a draft leaves the current drawing and other drafts intact.

## Login (preview)

The **Log in** button is at the top right of the page. The real Bluesky login is not connected yet: today a stand-in module (`src/authStub.js`) gives a fake session, so the interface can be tried without a network or an account.

- Click **Log in**, type your handle (for example `you.bsky.social`; a leading `@` is removed), and click **Continue** or press **Enter**. The form closes with a second click on **Log in**, **Esc**, or a click outside it.
- When you are logged in, the header shows `@handle` and a **Log out** button.
- The fake session is kept in memory only, so a page reload logs you out. The test handle `fail.test` always fails, to show the error message.
- Drawing, drafts, and colors work the same when you are logged in or logged out.

### Connecting the real login

The interface uses only `initAuth()`, `signIn(handle)`, `signOut()`, and the window event `auth-ended`, the same exports as the OAuth module `auth.js`. When that module is merged:

1. Put it at `src/auth.js`.
2. In `src/pixelEditor.js`, change the import from `./authStub.js` to `./auth.js`. No other UI change is needed.
3. Delete `src/authStub.js`, or keep it for tests only, and add `client-metadata.json`.

If `initAuth()` also returns the user's `handle`, the header shows `@handle`; otherwise it shows a short form of the DID (the user's permanent AT Protocol id).

## Source

- `src/pixelEditor.js` connects the page: drawing, tools, history, and auto-save.
- Drawing: `src/pixels.js` (stroke interpolation so fast drags have no gaps, and cell color lookup), `src/brush.js` (brush footprint math), `src/brushPanel.js` and `src/brushOutline.js` (brush panel and hover outline).
- Colors: `src/color.js` (HSV, RGB, and hex conversion, and alpha blending), `src/pickerGeometry.js`, `src/pickerDrawing.js`, `src/colorPicker.js`, `src/colorChannels.js` (the color picker), `src/colorSections.js` (remembers open sections), `src/numberInput.js`, `src/recentColors.js`, and `src/recentColorsRow.js`.
- Drafts: `src/drafts.js` is the drafts API (`saveDraft`, `listDrafts`, `loadDraft`, `deleteDraft`). Today it uses local storage; a later version can use the PDS without changes to the UI. `src/draftsColumn.js`, `src/dialogs.js`, `src/draftDisplay.js`, and `src/unsaved.js` build the drafts column.
- Login: `src/accountMenu.js` builds the account area in the header. `src/account.js` cleans and checks the handle and makes the name label. `src/authStub.js` is the stand-in login module (the dummy one need to be relaced by `auth.js` after branch merge).
- `src/style.css` provides the responsive layout.

Files with only pure logic (no DOM) have unit tests in `tests/`. Vite provides development serving and production builds; the application has no runtime dependencies.

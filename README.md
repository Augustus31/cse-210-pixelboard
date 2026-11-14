# Pixelboard

A small pixel drawing playground built with JavaScript, HTML, and CSS. Choose a **64 × 64**, **40 × 40**, or **25 × 25** pixel canvas. No account or backend is required.

## Get started

Install Node.js 20.19+ or 22.12+ (Node 26 also works), then run:

```sh
npm install
npm run dev
```

Open the local URL printed in the terminal. To create a production build, run `npm run build`; `npm run preview` serves that build locally. Run `npm test` to check stroke interpolation.

## Drawing

- Click or drag to draw; touch and pen also work.
- Choose from 36 colors or use the custom color picker.
- Use Pencil (**P**) or Eraser (**E**); the eraser paints white.
- Undo/redo with the buttons or **Ctrl/Cmd + Z** / **Ctrl/Cmd + Shift + Z**. Clear is undoable too.
- Select a canvas size under Your canvas. Each size keeps its own drawing and session undo/redo history.
- Toggle the grid or download a PNG at the selected resolution without the grid.
- Focus the canvas with Tab, move with arrow keys, and paint with Space or Enter.

All three drawings and the selected size automatically save in this browser's local storage. Existing 64 × 64 drawings are preserved. Undo history lasts for the current session (up to 100 actions). Browser storage can be cleared, so download any drawing you want to keep. Bluesky login is reserved for later work.

## Source

`src/main.js` handles drawing, tools, history, and browser storage. `src/pixels.js` interpolates strokes so fast drags have no gaps. `src/style.css` provides the responsive layout. Code comments explain the main behaviors. Vite provides development serving and production builds; the application has no runtime dependencies.

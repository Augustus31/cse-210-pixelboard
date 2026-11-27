# Color wheel: iro.js

## Decision

Use [iro.js](https://iro.js.org/) (`@jaames/iro`) for the color wheel and the alpha bar, in place of a color wheel that we build and maintain ourselves. The version is pinned to exactly `5.5.2` in `package.json`, so it does not update automatically.

The wheel is in `src/color/UI/colorWheelUI.js`. It sends each change to `setColor()` in `src/color/main.js`, and it subscribes to the central color, so changes from other places show on the wheel.

## Context

A color wheel needs a lot of math: conversions between HSV, RGB, and hex, the geometry of the hue ring and the saturation/value area, and the mapping from pointer positions to colors. We do not want to write, test, and maintain this math ourselves.

iro.js is an established color wheel library. It includes a wheel and an alpha slider, and it handles mouse and touch input. Version 5.5.2 was released on 2021-07-05, and it has been stable for about 5 years. Thus we can depend on its behavior, and we do not expect breaking changes.

## Alternatives

- **Build our own color wheel.** The project already had a hand-built wheel on a canvas (`colorPicker.js`, `pickerDrawing.js`, `pickerGeometry.js`). It gives full control and no dependency, but we must maintain all of the math, and we must add an alpha bar ourselves.
- **Use the browser `<input type="color">`.** It is simple and has no dependency, but it has no alpha, and it looks different in each browser.

## Consequences

- The project has a runtime dependency. Its license is MPL-2.0.
- iro.js has had no new release since 2021. If a bug occurs in it, we may have to work around it ourselves.
- The wheel has a fixed pixel width (200 px by default, which fits the color panel at all breakpoints in `style.css`). It does not resize by itself. To change its size, call `picker.resize(width)`.
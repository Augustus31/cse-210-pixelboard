# cse-210-pixelboard
CSE 210 Pixel Board

## Setup

Install [Node.js](https://nodejs.org) 24 or newer, then run:

```bash
npm install
```

Currently Node is only used to run development tools.

## Commands

| Command | What it does |
|---|---|
| `npm run lint` | Check the code style |
| `npm run lint:fix` | Fix the style problems that can be fixed automatically |
| `npm test` | Run every `*.test.js` and `*.test.ts` file |

Put each test file next to the file it tests, for example `board.js` and `board.test.js`.

## Commit messages

```
type(scope): short description
```

The scope is optional. Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`.

The format is checked when you commit and again on every pull request, along with the PR title.

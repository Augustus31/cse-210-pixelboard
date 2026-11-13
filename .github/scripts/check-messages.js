// Reads commit message headers from standard input and prints whether
// each one follows the commit message format. Fails if any does not.
import { readFileSync } from "node:fs";
import process from "node:process";
import { isValidCommitMessage } from "./check-commit-message.js";

// File descriptor 0 is standard input
const messages = readFileSync(0, "utf8").split("\n").filter(Boolean);

for (const message of messages) {
  if (isValidCommitMessage(message)) {
    process.stdout.write(`follows the format:         ${message}\n`);
  } else {
    process.stdout.write(`does not follow the format: ${message}\n`);
    process.exitCode = 1;
  }
}

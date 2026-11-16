// exports a function that checks if a commit message is valid
// based on the conventional commit message format

//the allowed types for the header of commit message format: type(scpe): short description
export const ALLOWED_TYPES = ["feat", "fix", "docs", "test", "refactor", "chore", "ci"];

//regex expression for the standardized commit message format
const FORMAT = new RegExp(`^(${ALLOWED_TYPES.join("|")})(\\([^()]+\\))?: \\S.*$`);

// A function that checks if the message matches the format descripbed above in regex
// Returns true if it does, false otherwise
export function isValidCommitMessage(message) {
  const firstLine = message.split("\n")[0].trim();
  return FORMAT.test(firstLine);
}

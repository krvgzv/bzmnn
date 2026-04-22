import { execSync } from "node:child_process";

export type GitDates = {
  published?: Date;
  modified?: Date;
};

function runGitCommand(command: string): string | undefined {
  try {
    const output = execSync(command, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    return output || undefined;
  } catch {
    return undefined;
  }
}

function parseGitDate(value?: string): Date | undefined {
  if (!value) return undefined;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

export function getGitPublishedDate(filePath: string): Date | undefined {
  const output = runGitCommand(
    `git log --diff-filter=A --follow --format=%cI -1 -- "${filePath}"`,
  );

  return parseGitDate(output);
}

export function getGitModifiedDate(filePath: string): Date | undefined {
  const output = runGitCommand(`git log -1 --format=%cI -- "${filePath}"`);

  return parseGitDate(output);
}

export function getGitDates(filePath: string): GitDates {
  const modified = getGitModifiedDate(filePath);
  const published = getGitPublishedDate(filePath) ?? modified;

  return {
    published,
    modified,
  };
}
export interface CommitMessageParts {
  prefix: string;
  description: string;
  ticketId?: string;
}

export function formatCommitMessage(parts: CommitMessageParts): string {
  const { prefix, description, ticketId } = parts;

  let message = '';

  if (prefix) {
    message = prefix.startsWith('[') ? prefix : `[${prefix}]`;
  }

  if (ticketId && !prefix.includes(ticketId)) {
    message += message ? ` ${ticketId}` : `[Support] ${ticketId}`;
  }

  if (description) {
    message += message ? ` ${description}` : description;
  }

  return message;
}

export function parseCommitMessage(message: string): CommitMessageParts {
  // Parse message like "[UserProfile] Add new feature" or "[Support] WLS-1234 fix bug"
  const prefixMatch = message.match(/^\[([^\]]+)\]/);
  const ticketMatch = message.match(/\b([A-Z]+-\d+)\b/i);

  let prefix = prefixMatch ? prefixMatch[1] : '';
  const ticketId = ticketMatch ? ticketMatch[1] : undefined;

  let description = message;
  if (prefixMatch) {
    description = message.substring(prefixMatch[0].length).trim();
  }
  if (ticketId && description.startsWith(ticketId)) {
    description = description.substring(ticketId.length).trim();
  }

  return { prefix, description, ticketId };
}

export function getCommitMessageTemplates(branchName: string): string[] {
  const branchParts = branchName.split('/');
  const branchType = branchParts[0];
  const featureName = branchParts[1] || '';

  const templates: string[] = [];

  if (branchType === 'Feature' && featureName) {
    templates.push(
      `[${featureName}] Implement `,
      `[${featureName}] Add `,
      `[${featureName}] Update `,
      `[${featureName}] Fix `,
      `[${featureName}] Refactor `
    );
  } else if (branchType === 'Support') {
    templates.push(
      '[Support] Fix ',
      '[Support] Update ',
      '[Support] Add ',
      '[Support] Remove '
    );
  } else if (branchType === 'Bugfix' || branchType === 'Hotfix') {
    templates.push(
      `[${branchType}] Fix `,
      `[${branchType}] Resolve `,
      `[${branchType}] Patch `
    );
  } else {
    templates.push(
      'Add ',
      'Update ',
      'Fix ',
      'Remove ',
      'Refactor '
    );
  }

  return templates;
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

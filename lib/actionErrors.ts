export function getActionErrorMessage(action: string) {
  return `Could not ${action}. Please try again.`;
}

export function logActionError(context: string, error: unknown) {
  console.error(`[${context}]`, error);
}

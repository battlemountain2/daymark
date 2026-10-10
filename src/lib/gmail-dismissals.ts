export const GMAIL_DISMISSED_KEY = 'daymark:gmail-dismissed';
export type DismissedMail = {
  account: string;
  id: string;
  subject: string;
  date: string;
  dismissedAt: string;
};

/** Gmail message IDs belong to an account; subjects are never identifiers. */
export function gmailMessageKey(account: string, id: string) {
  return JSON.stringify([account.trim().toLowerCase(), id]);
}

export function visibleGmailMessages<T extends {id: string}>(account: string, messages: T[], dismissed: Record<string, DismissedMail>) {
  return messages.filter(message => !dismissed[gmailMessageKey(account, message.id)]);
}

export function dismissedGmailMessage(account: string, message: {id:string;subject:string;date:string}, now = new Date().toISOString()): DismissedMail {
  return {account:account.trim().toLowerCase(),id:message.id,subject:message.subject,date:message.date,dismissedAt:now};
}

export function gmailMessageUrl(account: string, id: string) {
  return `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(account)}#all/${encodeURIComponent(id)}`;
}

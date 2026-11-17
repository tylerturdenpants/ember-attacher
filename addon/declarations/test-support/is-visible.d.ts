export type AttachmentSelector = string | Element | Window | Document | null | undefined;

export function isVisible(selector: AttachmentSelector, contextEl?: Element | null): boolean;

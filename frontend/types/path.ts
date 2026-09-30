export type UserRole = 'customer' | 'creator';

export type PathDomain =
  | 'Fitness'
  | 'Trading'
  | 'AI & Tech'
  | 'Creator'
  | 'Marketing'
  | 'Lifestyle'
  | 'Business';

export interface CreatorStudioDraft {
  domain: PathDomain;
  sourceType: 'YouTube' | 'Notion' | 'PDF' | 'URL';
  sourceText: string;
  pathTitle: string;
  description: string;
}

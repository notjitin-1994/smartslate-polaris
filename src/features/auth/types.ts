export type IdentifierValue =
  | { kind: 'email'; email: string }
  | { kind: 'unknown'; raw: string }



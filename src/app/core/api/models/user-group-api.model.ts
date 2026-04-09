/** Réponse `GET /api/groups` / entrées `groups` enrichies sur `GET /api/auth/me` (contrat back). */
export interface UserGroupApiDto {
  id?: string;
  name?: string;
  isPreset?: boolean;
  /** Alias éventuel si sérialisation différente */
  preset?: boolean;
  canBookImmobilier?: boolean;
  canBookMobilier?: boolean;
  discountType?: string;
  discountValue?: number;
  discountAppliesTo?: string;
  discountLabel?: string;
  memberCount?: number;
}

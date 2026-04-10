import { UserGroupApiDto } from '../../../core/api/models/user-group-api.model';
import { ReservationPricingGroup } from './resource-pricing.utils';

export function mapUserGroupsApiToPricing(
  rows: UserGroupApiDto[] | null | undefined
): ReservationPricingGroup[] {
  return (rows ?? [])
    .map(g => {
      const id = g.id?.trim();
      if (!id) {
        return null;
      }

      const discountType = (g.discountType ?? 'NONE') as ReservationPricingGroup['discountType'];
      const discountAppliesTo = (g.discountAppliesTo ??
        'ALL') as ReservationPricingGroup['discountAppliesTo'];

      return {
        id,
        name: g.name ?? 'Groupe',
        isPreset: g.isPreset ?? g.preset ?? false,
        canBookImmobilier: g.canBookImmobilier ?? false,
        canBookMobilier: g.canBookMobilier ?? false,
        discountType: ['NONE', 'PERCENTAGE', 'FIXED_AMOUNT', 'FULL_EXEMPT'].includes(discountType)
          ? discountType
          : 'NONE',
        discountValue: typeof g.discountValue === 'number' ? g.discountValue : 0,
        discountAppliesTo: ['ALL', 'IMMOBILIER_ONLY', 'MOBILIER_ONLY'].includes(discountAppliesTo)
          ? discountAppliesTo
          : 'ALL',
        discountLabel: g.discountLabel ?? '',
        memberCount: typeof g.memberCount === 'number' ? g.memberCount : 0,
      } satisfies ReservationPricingGroup;
    })
    .filter((g): g is ReservationPricingGroup => g !== null);
}

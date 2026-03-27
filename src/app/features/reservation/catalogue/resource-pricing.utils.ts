import { ResourceDto } from '../../../core/api/models/resource.model';
import { UserProfile } from '../../../core/auth/auth.model';
import { getResourcePrice } from './resource-presentation.utils';

export interface ReservationPricingGroup {
  id: string;
  name: string;
  isPreset: boolean;
  canBookImmobilier: boolean;
  canBookMobilier: boolean;
  discountType: 'NONE' | 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FULL_EXEMPT';
  discountValue: number;
  discountAppliesTo: 'ALL' | 'IMMOBILIER_ONLY' | 'MOBILIER_ONLY';
  discountLabel: string;
  memberCount: number;
}

export interface ReservationActorOption {
  id: string;
  title: string;
  subtitle: string;
  priceCents: number;
  discountLabel: string | null;
  discountBadge: string | null;
  isDepositExempt: boolean;
  summaryName: string;
}

export interface ResolvedResourcePricing {
  basePriceCents: number;
  finalPriceCents: number;
  discountCents: number;
  depositAmountCents: number;
  isDepositExempt: boolean;
  discountLabel: string | null;
  summaryName: string;
}

export function isAdministrativeReservationUser(user: UserProfile | null): boolean {
  return !!user && (user.role === 'SECRETARY_ADMIN' || user.role === 'DELEGATE_ADMIN');
}

export function canGroupBookResource(
  group: ReservationPricingGroup,
  resource: ResourceDto
): boolean {
  return resource.resourceType === 'IMMOBILIER' ? group.canBookImmobilier : group.canBookMobilier;
}

export function buildReservationActorOptions(
  resource: ResourceDto,
  user: UserProfile,
  groups: ReservationPricingGroup[]
): ReservationActorOption[] {
  const basePriceCents = getResourcePrice(resource) * 100;
  const options: ReservationActorOption[] = [
    {
      id: 'personal',
      title: 'A titre personnel',
      subtitle: `Tarif plein - ${formatPriceCents(basePriceCents)}`,
      priceCents: basePriceCents,
      discountLabel: null,
      discountBadge: null,
      isDepositExempt: false,
      summaryName: `${user.firstName} ${user.lastName}`,
    },
  ];

  if (isAdministrativeReservationUser(user) && user.exemptions.mandate) {
    options.push({
      id: 'council',
      title: 'Conseil Municipal',
      subtitle: 'Exoneration totale - 0€',
      priceCents: 0,
      discountLabel: 'Exoneration mandat electif',
      discountBadge: '-100%',
      isDepositExempt: isDepositCovered(resource),
      summaryName: 'Conseil Municipal',
    });
  }

  for (const group of groups) {
    const option = buildGroupReservationOption(group, resource, basePriceCents);
    if (option) {
      options.push(option);
    }
  }

  return options;
}

export function resolveResourcePricing(
  resource: ResourceDto,
  user: UserProfile | null,
  groups: ReservationPricingGroup[]
): ResolvedResourcePricing {
  const basePriceCents = getResourcePrice(resource) * 100;
  const depositAmountCents = resource.depositAmountCents ?? 0;

  if (!user) {
    return {
      basePriceCents,
      finalPriceCents: basePriceCents,
      discountCents: 0,
      depositAmountCents,
      isDepositExempt: false,
      discountLabel: null,
      summaryName: 'A titre personnel',
    };
  }

  const bestOption =
    buildReservationActorOptions(resource, user, groups).sort(compareReservationOptions)[0] ?? null;

  if (!bestOption) {
    return {
      basePriceCents,
      finalPriceCents: basePriceCents,
      discountCents: 0,
      depositAmountCents,
      isDepositExempt: false,
      discountLabel: null,
      summaryName: `${user.firstName} ${user.lastName}`,
    };
  }

  return {
    basePriceCents,
    finalPriceCents: bestOption.priceCents,
    discountCents: Math.max(0, basePriceCents - bestOption.priceCents),
    depositAmountCents,
    isDepositExempt: bestOption.isDepositExempt,
    discountLabel: bestOption.discountLabel,
    summaryName: bestOption.summaryName,
  };
}

function buildGroupReservationOption(
  group: ReservationPricingGroup,
  resource: ResourceDto,
  basePriceCents: number
): ReservationActorOption | null {
  if (!canGroupBookResource(group, resource)) {
    return null;
  }

  if (group.discountType === 'FULL_EXEMPT' && doesDiscountApplyToResource(group, resource)) {
    return {
      id: group.id,
      title: group.name,
      subtitle: 'Exoneration totale - 0€',
      priceCents: 0,
      discountLabel: group.discountLabel,
      discountBadge: '-100%',
      isDepositExempt: isDepositCovered(resource),
      summaryName: group.name,
    };
  }

  if (group.discountType === 'PERCENTAGE' && doesDiscountApplyToResource(group, resource)) {
    const discountedPrice = Math.max(
      0,
      Math.round(basePriceCents - (basePriceCents * group.discountValue) / 100)
    );

    return {
      id: group.id,
      title: group.name,
      subtitle: `${group.discountLabel} - ${formatPriceCents(discountedPrice)}`,
      priceCents: discountedPrice,
      discountLabel: group.discountLabel,
      discountBadge: `-${group.discountValue}%`,
      isDepositExempt: discountedPrice === 0 && isDepositCovered(resource),
      summaryName: group.name,
    };
  }

  if (group.discountType === 'FIXED_AMOUNT' && doesDiscountApplyToResource(group, resource)) {
    const discountedPrice = Math.max(0, basePriceCents - group.discountValue * 100);

    return {
      id: group.id,
      title: group.name,
      subtitle: `${group.discountLabel} - ${formatPriceCents(discountedPrice)}`,
      priceCents: discountedPrice,
      discountLabel: group.discountLabel,
      discountBadge: null,
      isDepositExempt: discountedPrice === 0 && isDepositCovered(resource),
      summaryName: group.name,
    };
  }

  return {
    id: group.id,
    title: group.name,
    subtitle: `Tarif groupe - ${formatPriceCents(basePriceCents)}`,
    priceCents: basePriceCents,
    discountLabel: null,
    discountBadge: null,
    isDepositExempt: false,
    summaryName: group.name,
  };
}

function compareReservationOptions(
  left: ReservationActorOption,
  right: ReservationActorOption
): number {
  if (left.priceCents !== right.priceCents) {
    return left.priceCents - right.priceCents;
  }

  if (left.isDepositExempt !== right.isDepositExempt) {
    return left.isDepositExempt ? -1 : 1;
  }

  return left.title.localeCompare(right.title);
}

function doesDiscountApplyToResource(
  group: ReservationPricingGroup,
  resource: ResourceDto
): boolean {
  if (group.discountAppliesTo === 'ALL') {
    return true;
  }

  return (
    (group.discountAppliesTo === 'IMMOBILIER_ONLY' && resource.resourceType === 'IMMOBILIER') ||
    (group.discountAppliesTo === 'MOBILIER_ONLY' && resource.resourceType === 'MOBILIER')
  );
}

function isDepositCovered(resource: ResourceDto): boolean {
  return resource.resourceType === 'IMMOBILIER';
}

function formatPriceCents(amountCents: number): string {
  return `${Math.round(amountCents / 100)}€`;
}

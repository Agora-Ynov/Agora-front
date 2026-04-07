import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';

interface QuotaInfoItemDto {
  label: string;
  description: string;
}

interface QuotaItemDto {
  id: string;
  quotaType:
    | 'user_monthly'
    | 'group_monthly'
    | 'max_duration'
    | 'min_advance'
    | 'max_advance';
  title: string;
  value: number;
  unit: string;
  description: string;
  scopeType: 'global' | 'group' | 'resource';
  groupId: string | null;
  resourceId: string | null;
}

interface AdminQuotasResponse {
  infoItems: QuotaInfoItemDto[];
  quotas: QuotaItemDto[];
}

interface GroupMockDto {
  id: string;
  name: string;
}

interface ResourceMockDto {
  id: string;
  name: string;
}

interface ResourcesResponse {
  content: ResourceMockDto[];
}

@Component({
  selector: 'app-admin-quotas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-quotas.component.html',
  styleUrl: './admin-quotas.component.scss',
})
export class AdminQuotasComponent {
  private readonly api = inject(ApiService);

  readonly loading = signal(true);
  readonly infoItems = signal<QuotaInfoItemDto[]>([]);
  readonly quotas = signal<QuotaItemDto[]>([]);
  readonly groups = signal<GroupMockDto[]>([]);
  readonly resources = signal<ResourceMockDto[]>([]);

  readonly enrichedQuotas = computed(() =>
    this.quotas().map(quota => ({
      ...quota,
      scopeLabel: this.buildScopeLabel(quota),
      displayValue: `${quota.value} ${quota.unit}`,
    }))
  );

  constructor() {
    forkJoin({
      quotas: this.api.get<AdminQuotasResponse>('/api/admin/quotas'),
      groups: this.api.get<GroupMockDto[]>('/api/admin/groups'),
      resources: this.api.get<ResourcesResponse>('/api/resources'),
    })
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: ({ quotas, groups, resources }) => {
          this.infoItems.set(quotas.infoItems);
          this.quotas.set(quotas.quotas);
          this.groups.set(groups);
          this.resources.set(resources.content);
          this.loading.set(false);
        },
        error: () => {
          this.infoItems.set([]);
          this.quotas.set([]);
          this.groups.set([]);
          this.resources.set([]);
          this.loading.set(false);
        },
      });
  }

  scopeClass(scopeType: QuotaItemDto['scopeType']): string {
    switch (scopeType) {
      case 'group':
        return 'quota-tag--group';
      case 'resource':
        return 'quota-tag--resource';
      case 'global':
      default:
        return 'quota-tag--global';
    }
  }

  private buildScopeLabel(quota: QuotaItemDto): string {
    if (quota.scopeType === 'global') {
      return 'Global - toutes ressources';
    }

    if (quota.scopeType === 'group') {
      const group = this.groups().find(item => item.id === quota.groupId);
      return group?.name ?? 'Groupe cible';
    }

    const resource = this.resources().find(item => item.id === quota.resourceId);
    return resource?.name ?? 'Ressource cible';
  }
}

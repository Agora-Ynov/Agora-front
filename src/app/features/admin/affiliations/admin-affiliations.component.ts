import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Les workflows de traitement des demandes d'affiliation / exonération ne sont pas
 * décrits dans la spec API (`agora_api_endpoints_version_final.md`). Pas de liste ni
 * d'actions admin branchées ici : éviter les données factices en production.
 */
@Component({
  selector: 'app-admin-affiliations',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-affiliations.component.html',
  styleUrl: './admin-affiliations.component.scss',
})
export class AdminAffiliationsComponent {}

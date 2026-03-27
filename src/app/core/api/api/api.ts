export * from './authController.service';
import { AuthControllerService } from './authController.service';
export * from './ressources.service';
import { RessourcesService } from './ressources.service';
export const APIS = [AuthControllerService, RessourcesService];

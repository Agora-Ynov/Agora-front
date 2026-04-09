export * from './authController.service';
import { AuthControllerService } from './authController.service';
export * from './reservationsController.service';
import { ReservationsControllerService } from './reservationsController.service';
export * from './ressources.service';
import { RessourcesService } from './ressources.service';
export const APIS = [AuthControllerService, ReservationsControllerService, RessourcesService];

import { SetMetadata } from '@nestjs/common';
import type { RoleMarly } from './auth.service';

export const CLE_ROLES = 'rolesAutorises';

// Réserve une route à certains rôles, par exemple @Roles('RESPONSABLE', 'COMPTABLE')
export const Roles = (...roles: RoleMarly[]) => SetMetadata(CLE_ROLES, roles);
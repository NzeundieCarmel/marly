import { SetMetadata } from '@nestjs/common';

export const CLE_ROUTE_PUBLIQUE = 'routePublique';

export const Public = () => SetMetadata(CLE_ROUTE_PUBLIQUE, true);
import { TokenPayload } from '../src/auth/auth.interface';
import {
  GetResourcesOptionsFilter,
  GetResourcesOptionsPagination,
} from '../src/resources/resources.service';

declare global {
  namespace Express {
    export interface Request {
      user: TokenPayload;
      fileMetaData: { width?: number; height?: number };
      sort: string;
      filter: GetResourcesOptionsFilter;
      pagination: GetResourcesOptionsPagination;
    }
  }
}

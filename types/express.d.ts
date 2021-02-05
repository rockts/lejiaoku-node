import { TokenPayload } from '../src/auth/auth.interface';
import {
  GetPostOptionsFilter,
  GetPostOptionsPagination,
} from '../src/post/post.service';

declare global {
  namespace Express {
    export interface Request {
      user: TokenPayload;
      fileMetaData: { width?: number; height?: number };
      sort: string;
      filter: GetPostOptionsFilter;
      pagination: GetPostOptionsPagination;
    }
  }
}

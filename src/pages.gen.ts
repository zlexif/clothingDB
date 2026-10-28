// deno-fmt-ignore-file
// biome-ignore format: generated types do not need formatting
// prettier-ignore
import type { GetConfigResponse, PathsForPages, SearchCodecsForPages } from 'waku/router';
// prettier-ignore
import type { getConfig as File_Root_getConfig } from './pages/_root';
// prettier-ignore
import type { getConfig as File_AppBrowseCategory_getConfig } from './pages/(app)/browse/[category]';
// prettier-ignore
import type { getConfig as File_AppBrowseIndex_getConfig } from './pages/(app)/browse/index';
// prettier-ignore
import type { getConfig as File_AppChangelog_getConfig } from './pages/(app)/changelog';
// prettier-ignore
import type { getConfig as File_AppCreator_getConfig } from './pages/(app)/creator';
// prettier-ignore
import type { getConfig as File_DocsSlugs_getConfig } from './pages/docs/[...slugs]';
// prettier-ignore
import type { getConfig as File_Index_getConfig } from './pages/index';
// prettier-ignore
import type { getConfig as File_Render_getConfig } from './pages/render';

// prettier-ignore
type Page =
  | ({ path: '/browse/[category]' } & GetConfigResponse<typeof File_AppBrowseCategory_getConfig>)
  | ({ path: '/browse' } & GetConfigResponse<typeof File_AppBrowseIndex_getConfig>)
  | ({ path: '/changelog' } & GetConfigResponse<typeof File_AppChangelog_getConfig>)
  | ({ path: '/creator' } & GetConfigResponse<typeof File_AppCreator_getConfig>)
  | ({ path: '/_root' } & GetConfigResponse<typeof File_Root_getConfig>)
  | ({ path: '/docs/[...slugs]' } & GetConfigResponse<typeof File_DocsSlugs_getConfig>)
  | ({ path: '/' } & GetConfigResponse<typeof File_Index_getConfig>)
  | ({ path: '/render' } & GetConfigResponse<typeof File_Render_getConfig>);

// prettier-ignore
type Layout = { path: '/' } | { path: '/docs' };

// prettier-ignore
declare module 'waku/router' {
  interface RouteConfig {
    paths: PathsForPages<Page>;
  }
  interface CreatePagesConfig {
    pages: Page;
    layouts: Layout;
  }
  interface SearchCodecsConfig extends SearchCodecsForPages<Page> {}
}

export const dynamic = 'force-dynamic';

import { makeGenerateMetadata, makeArticlePage } from '../../../lib/articlePage.js';

export const generateMetadata = makeGenerateMetadata('guides');
export default makeArticlePage('guides');
// step0-rebuild-marker

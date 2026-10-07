export const dynamic = 'force-dynamic';

import { makeGenerateMetadata, makeArticlePage } from '../../../lib/articlePage.js';

export const generateMetadata = makeGenerateMetadata('topics');
export default makeArticlePage('topics');
// step0-rebuild-marker

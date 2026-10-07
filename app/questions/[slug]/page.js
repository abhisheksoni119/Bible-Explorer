export const dynamic = 'force-dynamic';

import { makeGenerateMetadata, makeArticlePage } from '../../../lib/articlePage.js';

export const generateMetadata = makeGenerateMetadata('questions');
export default makeArticlePage('questions');
// step0-rebuild-marker

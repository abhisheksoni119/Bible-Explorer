export const dynamic = 'force-dynamic';

import { makeGenerateMetadata, makeArticlePage } from '../../../lib/articlePage.js';

export const generateMetadata = makeGenerateMetadata('bible-characters');
export default makeArticlePage('bible-characters');
// step0-rebuild-marker

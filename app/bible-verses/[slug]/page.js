export const dynamic = 'force-dynamic';

import { makeGenerateMetadata, makeArticlePage } from '../../../lib/articlePage.js';

export const generateMetadata = makeGenerateMetadata('bible-verses');
export default makeArticlePage('bible-verses');
// step0-rebuild-marker

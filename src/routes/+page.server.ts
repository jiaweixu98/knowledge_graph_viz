import { EmbeddingName } from 'src/types';
import { loadEmbedding, loadNeighbors, loadCollaborators} from 'src/embedding';
import { typify } from 'src/components/recommendation/utils';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const embeddingName = EmbeddingName.TKG;
  const embedding = await loadEmbedding(embeddingName);
  const neighbors = await loadNeighbors(embeddingName);
  const collaboratorsdict = await loadCollaborators();
  return typify({ embedding, embeddingName, neighbors ,collaboratorsdict});
};

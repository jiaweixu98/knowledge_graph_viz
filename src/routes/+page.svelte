<script lang="ts">
  import Atlas from 'src/components/Atlas.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>
<!-- embedding here no neighbors, have metadata and corrdinates -->
<Atlas embedding={data.embedding} embeddingName={data.embeddingName} embeddingNeighbors={data.neighbors} collaboratorsdict={data.collaboratorsdict} />

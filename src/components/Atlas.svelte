<script lang="ts">
  import { browser } from '$app/environment';

  import { onMount } from 'svelte';

  import type { EmbeddingName } from 'src/types';
  import type { Embedding } from '../routes/embedding';
  import AnimeDetails from './AnimeDetails.svelte';
  import { AtlasViz, ColorBy, getDefaultColorBy } from './AtlasViz';
  import { DEFAULT_PROFILE_SOURCE, ProfileSource } from './recommendation/conf';
  import Search from './Search.svelte';
  import VizControls from './VizControls.svelte';
  import Header from './recommendation/Header.svelte';

  let publicationRange: [number, number] = [0, 0];
  let selectedPublicationRange: [number, number] = [0, 0];
  export let embeddingName: EmbeddingName;
  export let embedding: Embedding;
  export let embeddingNeighbors;
  // what if directly read neighbors here
  export let collaboratorsdict;
  export let username: string | undefined = undefined;
  export let maxWidth: number | undefined = undefined;
  export let disableEmbeddingSelection: boolean = true;
  export let disableUsernameSearch: boolean = false;
  export let profileSource: ProfileSource = DEFAULT_PROFILE_SOURCE;

  // console.log('embeddingNeighbors:', embeddingNeighbors);
  let viz: AtlasViz | null = null;
  let selectedNodeID: number | null = null; // Support Bioentity
  let selectedAnimeID: number | null = null;
  $: selectedDatum = selectedAnimeID === null || !viz ? null : viz.embeddedPointByID.get(selectedAnimeID)!;

  $: if (viz) {
    viz.setMaxWidth(maxWidth);
  }

  let colorBy = browser ? getDefaultColorBy() : ColorBy.Number_NIHindexed;
  // console.log("Current colorBy setting:", colorBy);

  const setColorBy = (newColorBy: ColorBy) => {
    colorBy = newColorBy;
    viz?.setColorBy(colorBy);
  };

  // add range filter
  let minPub = 0;
  let showTooltip = false;

  const loadMALProfile = (id: number) => {
    if (!viz) {
      console.error('Tried to load MAL profile before Atlas viz was loaded.');
      return;
    }
    // console.log('id:', id);
    // # important, we directly get collaborators for id Header, may reuse this.
    const collaboratorIds = collaboratorsdict[id] || [];
    // console.log('collaboratorIds:', id, collaboratorIds);
    const collaboratorObjects = collaboratorIds.map((id) => ({ node: { id } }));
    // given the id, return a list of id like below; they are the true collborators or users before.
    // const testArray = [{ node: { id: 100000093 } }, { node: { id: 12120856 } }, { node: { id: 12118846 } }];
    // console.log(Array.isArray(testArray), testArray);
    viz?.displayMALUser(collaboratorObjects);
    // viz?.displayMALUser([{node:{id:100000093}}])
    // console.error('Loading MAL profile for', `/${profileSource}-profile?username=${username}`);
    // fetch(`/${profileSource}-profile?username=${username}`)
    //   .then((res) => res.json())
    //   .then((profile) => {
    //     viz?.displayMALUser(profile);
    //   });
  };

  onMount(() => {
    import('../pixi').then((mod) => {
      const setSelectedAnimeID = (newSelectedAnimeID: number | null) => {
        selectedAnimeID = newSelectedAnimeID;
      };
      viz = new AtlasViz(mod, 'viz', embedding, setSelectedAnimeID, maxWidth);
      viz.setColorBy(colorBy);
      viz?.setCollaboratorsDict(collaboratorsdict);
      const embeddingNeighborsPromise = Promise.resolve(embeddingNeighbors);
      embeddingNeighborsPromise.then((neighbors) => {
        viz?.setNeighbors(neighbors);
      });
      // 💡 Add：Based on all authors to calculate and initialize paperNum
      const paperNums = embedding.filter((d) => d.metadata.IsAuthor).map((d) => d.metadata.PaperNum);

      const minPub = Math.min(...paperNums);
      const maxPub = Math.max(...paperNums);

      publicationRange = [minPub, maxPub];
      selectedPublicationRange = [minPub, maxPub];

      // 💡 Add：pass initialize data to AtlasViz
      viz?.setPublicationRange(minPub, maxPub);
    });
    // console.log('we have get the neighbors done.')

    return () => {
      viz?.dispose();
      viz = null;
    };
  });

  function updatePublicationRange() {
    if (viz) {
      viz.setPublicationRange(minPub, Infinity); // 或 minPub, Infinity if 你只想篩「下限」
    }
  }
</script>

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=PT+Sans" rel="stylesheet" />
</svelte:head>

<div class="root">
  <canvas id="viz" />
</div>
{#if viz}
  <Search {embedding} onSubmit={(id) => viz?.flyTo(id)} suggestionsStyle="top: 50px;" />
  <VizControls
    {colorBy}
    {setColorBy}
    {disableEmbeddingSelection}
    {disableUsernameSearch}
    {embedding}
    onSubmit={(id) => {
      loadMALProfile(id);
      viz?.setCollabID(id);
    }}
    suggestionsStyle="top: 30px;"
  />
{/if}
<div id="atlas-viz-legend" />

<!-- new：Publication range filter -->
<div class="pub-range-filter">
  <label for="pubRange" style="margin-bottom: 22px; display: inline-block;">Filter by # of Publications:</label>
  <input
    id="pubRange"
    type="range"
    min={publicationRange[0]}
    max={publicationRange[1]}
    step="1"
    bind:value={minPub}
    on:input={updatePublicationRange}
    on:mouseenter={() => (showTooltip = true)}
    on:mouseleave={() => (showTooltip = false)}
  />
  {#if showTooltip}
    <div
      class="slider-tooltip"
      style="left: {((minPub - publicationRange[0]) / (publicationRange[1] - publicationRange[0])) * 100}%"
    >
      {minPub}
    </div>
  {/if}
  <div class="range-caption">
    Showing authors with ≥ <strong>{minPub}</strong> papers
  </div>
</div>

<div
  id="toast-container"
  style="
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  display: none;
  z-index: 9999;
  transition: opacity 0.3s ease;
"
></div>
{#if selectedDatum !== null && viz}
  <AnimeDetails
    id={selectedDatum.metadata.id}
    datum={selectedDatum}
    {embedding}
    {embeddingNeighbors}
    {viz}
    {collaboratorsdict}
  />
{/if}

<style lang="css">
  .root {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
  }

  .pub-range-filter {
    position: absolute;
    top: 180px; /* position */
    right: 12px;
    width: 280px; /* legend width */
    padding: 10px;
    background-color: rgba(0, 0, 0, 0.4);
    border: 1px solid #333;
    border-radius: 6px;
    color: white;
    font-size: 14px;
    z-index: 1;
  }

  .pub-range-filter input[type='range'] {
    width: 100%;
    margin-top: 6px;
  }

  .range-caption {
    text-align: right;
    font-size: 13px;
    margin-top: 4px;
  }

  .slider-tooltip {
    position: absolute;
    top: 30px;
    transform: translateX(-50%);
    background: #444;
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
    white-space: nowrap;
    pointer-events: none;
    transition: opacity 0.2s ease;
  }

  #atlas-viz-legend {
    position: absolute;
    top: 0;
    right: 16px;
    z-index: 1;
    background-color: #11111188;
  }

  @media (max-width: 800px) {
    #atlas-viz-legend {
      /* Scale to 83% but keep it aligned to the right of the screen */
      transform: scale(0.83);
      transform-origin: right top;
      right: 8px;
    }
  }

  @media (max-width: 600px) {
    #atlas-viz-legend {
      top: 106px;
      right: 0;
      background: rgba(0, 0, 0, 0.8);
      padding: 4px;
    }
  }
</style>

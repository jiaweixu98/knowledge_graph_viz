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

  const loadMALProfile = (id: number) => {
    if (!viz) {
      console.error('Tried to load MAL profile before Atlas viz was loaded.');
      return;
    }
    // console.log('id:', id);
    // # important, we directly get collaborators for id Header, may reuse this.
    const collaboratorIds = collaboratorsdict[id] || [];
    // console.log('collaboratorIds:', id, collaboratorIds);
    const collaboratorObjects = collaboratorIds.map(id => ({ node: { id } }));
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
    // const usernameToLoad = username ?? new URLSearchParams(window.location.search).get('username');
    // const userProfilePromise =
    //   usernameToLoad && fetch(`/${profileSource}-profile?username=${usernameToLoad}`).then((res) => res.json());
    // const neighborsPromise: Promise<{ neighbors: number[][] }> = fetch(`/neighbors?embedding=${embeddingName}`).then(
    //   (res) => res.json()
    // );
//     const neighborsPromise: Promise<number[][]> = fetch(`/neighbors?embedding=tkg_ebd_34k`).then(
//   async (res) => {
//     if (!res.ok) {
//       // Handle the error response, possibly returning an empty array or rethrowing an error
//       const errorText = await res.text(); // Read the error message
//       console.error(`Error fetching neighbors: ${errorText}`);
//       throw new Error(`Failed to fetch neighbors: ${errorText}`);
//     }
//     // If the response is ok, proceed with parsing the JSON
//     return res.json();
//   }
// );
    // console.log('Neighbors fetched ok or not (for vercel):', neighborsPromise);
    import('../pixi').then((mod) => {
      const setSelectedAnimeID = (newSelectedAnimeID: number | null) => {
        selectedAnimeID = newSelectedAnimeID;
      };
      viz = new AtlasViz(mod, 'viz', embedding, setSelectedAnimeID, maxWidth);
      viz.setColorBy(colorBy);
      viz?.setCollaboratorsDict(collaboratorsdict);
      const embeddingNeighborsPromise = Promise.resolve(embeddingNeighbors);
      embeddingNeighborsPromise.then((neighbors) => {
        // console.log('Neighbors fetched:', neighbors);
        viz?.setNeighbors(neighbors);
        // console.log('Neighbors set in AtlasViz');
        // if (userProfilePromise) {
        //   userProfilePromise.then((profile) => {
        //     viz?.displayMALUser(profile);
        //   });
        // }
      });
    });
    // console.log('we have get the neighbors done.')

    return () => {
      viz?.dispose();
      viz = null;
    };
  });
</script>

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=PT+Sans" rel="stylesheet" />
</svelte:head>

<div class="root">
  <canvas id="viz" />
</div>
{#if viz}
  <Search {embedding} onSubmit={(id) => viz?.flyTo(id)} suggestionsStyle="top: 50px;" />
  <VizControls {colorBy} {setColorBy} {disableEmbeddingSelection} {disableUsernameSearch} {embedding} onSubmit={(id) => {loadMALProfile(id); viz?.setCollabID(id)}} suggestionsStyle="top: 30px;" />

{/if}
<div id="atlas-viz-legend" />
{#if selectedDatum !== null && viz}
  <AnimeDetails id={selectedDatum.metadata.id} datum={selectedDatum} embedding={embedding} embeddingNeighbors={embeddingNeighbors} {viz} collaboratorsdict={collaboratorsdict}/>
{/if}

<style lang="css">
  .root {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
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

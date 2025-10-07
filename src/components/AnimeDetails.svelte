<script context="module" lang="ts">
  const buildMALLink = (animeID: number) => `https://myanimelist.net/anime/${animeID}`;
</script>

<script lang="ts">
  import type { AnimeDetails } from '../malAPI';
  import type { EmbeddedPointWithIndex } from './AtlasViz';
  import type { Embedding } from '../routes/embedding';

  export let id: number;
  export let datum: EmbeddedPointWithIndex;
  export let embedding: Embedding;
  export let embeddingNeighbors;
  export let viz: { flyTo: (id: number) => void };
  export let collaboratorsdict;

  let explanations = {};
  let fetchingExplanations = {};

  async function handleWhyRecommendClick(focalId, neighborId) {
    const key = `${focalId}_${neighborId}`;
    // Check if we are already fetching an explanation for this neighbor
    if (fetchingExplanations[key]) return;

    fetchingExplanations = { ...fetchingExplanations, [key]: true };
    explanations = { ...explanations, [key]: '' };

    try {
      const focalInfo = await getAuthorInfo(focalId);
      const neighborInfo = await getAuthorInfo(neighborId);
      const neighbors = collaboratorsdict[focalId] || [];
      const collaborators = collaboratorsdict[embeddedPointByID.get(neighborId).metadata.id] || [];
      const intersection = neighbors.filter((neighbor) => collaborators.includes(neighbor));
      const payload = {
        info_a: focalInfo,
        info_b: neighborInfo,
        shared_coauthors: intersection,
      };

      // Call the backend API route
      const response = await fetch('/api/why-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();
      const explanation = data.explanation;

      explanations = { ...explanations, [key]: explanation };
    } catch (error) {
      console.error('Error fetching explanation:', error);
      explanations = { ...explanations, [key]: 'Sorry, there was an error generating the explanation.' };
    } finally {
      fetchingExplanations = { ...fetchingExplanations, [key]: false };
    }
  }

  async function handleWhyRecommendClickDataset(focalId, neighborId) {
    const key = `${focalId}_${neighborId}`;
    // Check if we are already fetching an explanation for this neighbor
    if (fetchingExplanations[key]) return;

    fetchingExplanations = { ...fetchingExplanations, [key]: true };
    explanations = { ...explanations, [key]: '' };

    try {
      const dataset = embeddedPointByID.get(focalId)?.metadata;
      const focalInfo = `
Dataset Name: ${dataset.FullName}
Dataset URL ${dataset.Data_url}
Dataset Description ${dataset.Data_Description}`;
      const neighborInfo = await getAuthorInfo(neighborId);
      const payload = {
        info_a: focalInfo,
        info_b: neighborInfo,
      };

      // Call the backend API route
      const response = await fetch('/api/why-recommend-dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();
      const explanation = data.explanation;

      explanations = { ...explanations, [key]: explanation };
    } catch (error) {
      console.error('Error fetching explanation:', error);
      explanations = { ...explanations, [key]: 'Sorry, there was an error generating the explanation.' };
    } finally {
      fetchingExplanations = { ...fetchingExplanations, [key]: false };
    }
  }

  async function getAuthorInfo(authorId) {
    const author = embeddedPointByID.get(authorId)?.metadata;
    if (!author) return 'Information not available.';

    const pub_string = author.Representative_papers;
    const pubData = await fetchPubData(pub_string);

    // Format each paper's information clearly
    const papersList = pubData.data
      .map(
        (paper, index) => `
    Paper ${index + 1}:
      Title: ${paper.title}
      Year: ${paper.year}
      Journal: ${paper.journal}
      Authors: ${paper.authors}
      Citation Count: ${paper.citation_count}
  `
      )
      .join('\n');

    const info = `
Author Name: ${author.FullName}
Author Affiliation: ${author.Affiliation}
Author Career Begin Year: ${author.BeginYear}
Number of Papers Published (Indexed by PubMed): ${author.PaperNum}
Recent Papers and Publications by ${author.FullName}:
${papersList}
`;

    return info.trim();
  }

  async function fetchPubData(pub_string) {
    try {
      const response = await fetch(
        `https://icite.od.nih.gov/api/pubs?pmids=${pub_string}&fl=pmid,year,title,journal,authors,citation_count`
      );
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Fetch error:', error);
      return { data: [] };
    }
  }

  let embeddedPointByID: Map<number, EmbeddedPointWithIndex> = new Map(embedding.map((p) => [+p.metadata.id, p]));

  let details: { id: number; details: Promise<AnimeDetails> } = {
    id: -1,
    details: new Promise((_resolve) => {}),
  };

  $: {
    if (details.id !== id) {
      details = { id, details: fetch(`/anime?id=${id}`).then((res) => res.json()) };
    }
  }
  // console.log('print fetch details: ',details);

  let navigationStack = []; // Stack to track history

  function navigateTo(id) {
    if (datum.metadata && datum.metadata.id) {
      navigationStack.push(datum.metadata.id); // Push current ID to the stack before navigating
    }
    viz?.flyTo(id); // Fly to the new node
  }

  function goBack() {
    if (navigationStack.length > 0) {
      const previousId = navigationStack.pop(); // Get the last visited node ID from the stack
      viz?.flyTo(previousId); // Fly back to the previous node
    }
  }

  // let focalData = null;  // This will store the data returned from the API

  // // Define the function to fetch data
  // async function fetchPubData(pub_string) {
  //   try {
  //     const response = await fetch(`https://icite.od.nih.gov/api/pubs?pmids=${pub_string}&fl=pmid,year,title,journal,authors,citation_count`);
  //     if (!response.ok) throw new Error('Network response was not ok');
  //     const data = await response.json();
  //     focalData = data; // Update the component's state with the fetched data
  //   } catch (error) {
  //     console.error('Fetch error:', error);
  //   }
  // }
  // fetchPubData(datum.metadata.Representative_papers);
</script>

<div class="root">
  <div class="details">
    <div class="info">
      {#if datum.metadata.IsAuthor}
        <h2>
          <a
            href="https://aimed.uab.edu/apex/r/tkg/ckg/author-details?p10_aid={datum.metadata.id}"
            target="_blank"
            onClick={() => navigateTo(datum.metadata.id)}
          >
            {datum.metadata.FullName}
          </a>
        </h2>
        <p><strong>Institution:</strong> {datum.metadata.Affiliation}</p>
        <p><strong>Career Begin Year:</strong> {datum.metadata.BeginYear}</p>
        <p><strong>Number of Papers:</strong> {datum.metadata.PaperNum}</p>
        <button
          class="rec_button"
          on:click={() => window.open(`https://cm4aiteaming.streamlit.app/?aid=${datum.metadata.id}`)}
        >
          MATRIX Interactive Recommendation.
        </button> <br />
        <span style="font-size: 14px;">
          MATRIX: <b>M</b>ulti-<b>A</b>gent <b>T</b>eaming <b>R</b>ecommendation through <b>I</b>nteractive
          <b>E</b>xpertise Gap <b>I</b>dentification.
        </span>
        <br />
        <button
          class="rec_button"
          on:click={() =>
            window.open(`https://aimed.uab.edu/apex/r/tkg/ckg/author-details?p10_aid=${datum.metadata.id}`)}
        >
          Details
        </button>
        <button
          class="rec_button"
          on:click={() =>
            window.open(`https://www.google.com/search?q=${datum.metadata.FullName} ${datum.metadata.Affiliation}`)}
        >
          Google
        </button>
        <!-- <button class="rec_button" onclick="window.open('https://www.google.com/search?q=' + encodeURIComponent('{datum.metadata.FullName} {datum.metadata.Affiliation}'));">
        Find Talents by Typing down the Needs.
      </button> -->
        <br /><br />
        <h3>Potential Future Collaborators: ({embeddingNeighbors[datum.index].length})</h3>
      {/if}
      {#if !datum.metadata.IsAuthor}
        <h2>
          <a href={datum.metadata.Data_url} target="_blank">
            {datum.metadata.FullName}
            <br />
          </a>
        </h2>
        <!-- <p>Source: {datum.metadata.Data_Source}<p> -->
        <p>
          <strong>Dataset Source:</strong>
          {datum.metadata.Data_Source}
        </p>
        <p><strong>Description:</strong> {datum.metadata.Data_Description}</p>
        <p>
          <strong>Dataset URL:</strong>
          <a href={datum.metadata.Data_url} target="_blank">{datum.metadata.Data_url}</a>
        </p>

        <p>
          About the dataset (by {datum.metadata.Data_Source}):
        </p>
        <p>{datum.metadata.Data_Description}.</p>
        <a href={datum.metadata.Data_url} target="_blank">{datum.metadata.Data_url}</a>
        <br /><br />
        <button
          class="rec_button"
          onclick="window.open('https://www.google.com/search?q=' + encodeURIComponent('{datum.metadata.FullName} {datum
            .metadata.Data_Description}'));"
        >
          Google
        </button>
        <br />
        <h3>Potential Future Users ({embeddingNeighbors[datum.index].length})</h3>
      {/if}

      <!-- List of potential users or collaborators -->

      <!-- <p>Click a name below to show details</p> -->
      <!-- <button class="go-back" on:click={goBack}>Back</button> -->
      <button class="go-back" on:click={() => viz?.flyTo(id)}>Back</button>
      <ul>
          {#each embeddingNeighbors[datum.index]
            // Sort by BeginYear in descending order (later years first)
            .sort((a, b) => embeddedPointByID.get(b)?.metadata?.BeginYear - embeddedPointByID.get(a)?.metadata?.BeginYear) as neighborId, i (neighborId)}
            {#if embeddedPointByID.get(neighborId)}
              <li>
                <a
                  href="javascript:void(0);"
                  on:click={() => navigateTo(embeddedPointByID.get(neighborId).metadata.id)}
                >
                  <p style="font-size: 15px;">
                    {i + 1}.
                    {embeddedPointByID.get(neighborId).metadata.FullName}
                  </p>
                  <span style="font-size: 12px;">
                    {embeddedPointByID.get(neighborId).metadata.Affiliation}<br />
                    {embeddedPointByID.get(neighborId).metadata.BeginYear}<br />
                    {(() => {
                      const neighbors = collaboratorsdict[datum.metadata.id] || [];
                      const collaborators = collaboratorsdict[embeddedPointByID.get(neighborId).metadata.id] || [];
                      const intersection = neighbors.filter((neighbor) => collaborators.includes(neighbor));

                      if (intersection.length === 0) {
                        return '';
                      } else if (datum.metadata.IsAuthor == false) {
                        return '';
                      } else if (intersection.length === 1) {
                        return `Shared coauthor: ${embeddedPointByID.get(intersection[0]).metadata.FullName}`;
                      } else {
                        return `Shared coauthors: ${intersection.length} (${embeddedPointByID.get(intersection[0]).metadata.FullName}, etc.)`;
                      }
                    })()}
                  </span>
                </a>
                <br />

                {#if datum.metadata.IsAuthor}
                  <button
                    class="small_button"
                    on:click={() => handleWhyRecommendClick(datum.metadata.id, neighborId)}
                    disabled={fetchingExplanations[`${datum.metadata.id}_${neighborId}`]}
                  >
                    Why Recommend? (ChatGPT)
                  </button>
                {/if}

                {#if datum.metadata.IsAuthor == false}
                  <button
                    class="small_button"
                    on:click={() => handleWhyRecommendClickDataset(datum.metadata.id, neighborId)}
                    disabled={fetchingExplanations[`${datum.metadata.id}_${neighborId}`]}
                  >
                    Why Recommend? (ChatGPT)
                  </button>
                {/if}
                <button
                  class="rec_button"
                  onclick="window.open('https://aimed.uab.edu/apex/r/tkg/ckg/author-details?p10_aid=' + encodeURIComponent('{embeddedPointByID.get(
                    neighborId
                  ).metadata.id}'));"
                >
                  Details
                </button>

                <button
                  class="small_button"
                  onclick="window.open('https://www.google.com/search?q=' + encodeURIComponent('{embeddedPointByID.get(
                    neighborId
                  ).metadata.FullName} {embeddedPointByID.get(neighborId).metadata.Affiliation}'));"
                >
                  Google
                </button>

                {#if fetchingExplanations[`${datum.metadata.id}_${neighborId}`]}
                  <p>Searching in the Knowledge Graph and Reasoning ...</p>
                {:else if explanations[`${datum.metadata.id}_${neighborId}`]}
                  <p>{explanations[`${datum.metadata.id}_${neighborId}`]}</p>
                {/if}
              </li>
            {/if}
          {/each}
        </ul>
      <!-- Go Back Button -->
    </div>
  </div>
</div>

<style lang="css">
  .root {
    padding: 16px;
    box-sizing: border-box;
    background: #222;
    border: 1px solid #444;
    border-radius: 6px;
    position: absolute;
    bottom: 0;
    left: 0;
    width: calc(min(30vw, 400px));
    height: calc(max(40vh, 550px));
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .details {
    width: 100%;
    display: flex;
    flex-direction: column;
    margin-bottom: 8px;
    gap: 8px;
  }

  h2 {
    margin-top: 4px;
    margin-bottom: 8px;
    font-size: 18px;
    text-align: left;
    line-height: 22px;
  }

  h2 a {
    color: #fff;
    text-decoration: none;
    transition: color 0.3s;
  }

  h2 a:hover {
    color: #aaf;
  }

  p {
    font-size: 14px;
    font-weight: 500;
    margin: 4px 0;
    color: #ccc;
    padding: 4px 0;
  }

  h3 {
    margin-top: 8px;
    margin-bottom: 8px;
    font-size: 18px;
    color: #ddd;
  }

  ul {
    list-style-type: none;
    padding: 0;
    margin: 0;
    width: 100%;
  }

  ul li {
    background-color: #333;
    padding: 6px 10px;
    margin-bottom: 6px;
    border-radius: 4px;
    transition: background-color 0.3s;
  }

  ul li:hover {
    background-color: #555;
  }

  ul li a {
    color: #ddd;
    text-decoration: none;
    font-size: 14px;
    transition: color 0.3s;
  }

  ul li a:hover {
    color: #aaf;
  }

  .rec_button {
    font-size: 12px;
    margin-top: 8px;
    margin-bottom: 8px;
    padding: 8px 12px;
    background-color: #444;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s;
    text-align: left;
  }

  .small_button {
    font-size: 10px;
    margin-top: 8px;
    margin-bottom: 8px;
    padding: 8px 12px;
    background-color: #444;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s;
    text-align: left;
  }

  .go-back {
    font-size: 10px;
    margin-top: 8px;
    margin-bottom: 8px;
    padding: 8px 12px;
    background-color: #444;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s;
  }

  .go-back:hover {
    background-color: #555;
  }
</style>

<script lang="ts">
  import Fuse from 'fuse.js';

  // export let embedding: { metadata: { id: number; title: string; title_english: string } }[];
  export let embedding: { metadata: { id: number; FullName: string; Data_Description: string;} }[];
  export let onSubmit: (id: number, FullName: string) => void;
  export let style: string | undefined = undefined;
  export let inputStyle: string | undefined = undefined;
  export let suggestionsStyle: string | undefined = undefined;
  export let blurredValue: string | undefined = undefined;

  let value = '';
  const fuse = new Fuse(embedding, {
    // keys: ['metadata.title', 'metadata.title_english'],
    keys: ['metadata.FullName', 'metadata.Data_Description'],

  });

  let isFocused = false;
  $: suggestions = value && isFocused ? fuse.search(value, { limit: 8 }) : [];

  const handleInputChange = (evt: any) => {
    value = evt.target.value;
  };
</script>

<div class="root">
  <label for="potential-collaborators">Navigate to a talent or dataset: (input the name)</label>
  <input
  id="potential-collaborators"
    type="text"
    value={isFocused ? value : blurredValue || value}
    placeholder={isFocused ? undefined : value || 'Input the name of a talent or a dataset'}

    on:input={handleInputChange}
    on:blur={() => {
      isFocused = false;
    }}
    on:focus={() => {
      isFocused = true;
    }}
  />

  {#if suggestions.length > 0}
    <div class="suggestions-container" style={suggestionsStyle}>
      {#each suggestions as suggestion (suggestion.item.metadata.id)}
        <div
          role="button"
          tabindex={0}
          class="suggestion"
          on:mousedown={() => {
            onSubmit(
              suggestion.item.metadata.id,
              suggestion.item.metadata.FullName,
            );
            value = suggestion.item.metadata.FullName;
          }}
        >
          {suggestion.item.metadata.FullName}

        </div>
      {/each}
    </div>
  {/if}
</div>

<style lang="css">
  .root {
    box-sizing: border-box;
    width: calc(min(100vw, 400px));
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    background-color: #050505;
    box-sizing: border-box;
    font-size: 14px;
    width: 400px;
    border: 1px solid #444;
    flex-direction: column;
  }

  @media (max-width: 600px) {
    .root {
      width: 100vw;
    }
  }

  label {
    font-size: 16px;
    margin-bottom: 4px;
  }

  input {
    font-size: 16px;
    padding: 2px 5px;
    box-sizing: border-box;
    width: 100%;
    height: 30px;
  }

  .suggestions-container {
    position: absolute;
    top: 50px;
    width: 100%;
    z-index: 2;
  }

  .suggestion {
    z-index: 2;
    cursor: pointer;
    font-size: 17px;
    padding: 6px 8px;
    border-bottom: 1px solid #888;
    background-color: #080808;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>
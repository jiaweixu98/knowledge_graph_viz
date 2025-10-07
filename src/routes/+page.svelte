<script lang="ts">
  import { onMount } from 'svelte';
  import Atlas from 'src/components/Atlas.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
  
  console.log('[DEBUG] +page.svelte - Component script loaded');
  console.log('[DEBUG] +page.svelte - Data prop received:', data);

  let loading = true;
  let loadingProgress = 0;
  let embedding: any = null;
  let neighbors: any = null;
  let collaboratorsdict: any = {}; // Empty initially, loaded on-demand
  let error: string | null = null;

  // Smooth progress animation during long operations
  let progressInterval: ReturnType<typeof setInterval> | null = null;
  
  
  const simulateProgress = (start: number, end: number, duration: number) => {
    const startTime = Date.now();
    const range = end - start;
    
    if (progressInterval) clearInterval(progressInterval);
    
    progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out function for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      loadingProgress = start + (range * eased);
      
      if (progress >= 1) {
        loadingProgress = end;
        if (progressInterval) clearInterval(progressInterval);
      }
    }, 50);
  };

  // Fallback: fetch data in pages and merge on client to avoid large single response
  const fetchAllPaginated = async (limit: number = 10000) => {
    const allEmbedding: any[] = [];
    const allNeighbors: any[] = [];
    let page = 0;
    let hasMore = true;
    const start = 30;
    const end = 90;
    let total = 90000; // default estimate; will replace with server-reported total if available

    while (hasMore) {
      const url = `/api/data?page=${page}&limit=${limit}`;
      console.log('[DEBUG] +page.svelte - Fallback fetching:', url);
      const r = await fetch(url);
      if (!r.ok) {
        const t = await r.text();
        console.error('[ERROR] +page.svelte - Fallback page failed:', r.status, r.statusText, t);
        throw new Error(`Paginated fetch failed: ${r.status} ${r.statusText}`);
      }
      const data = await r.json();
      if (Array.isArray(data.embedding)) allEmbedding.push(...data.embedding);
      if (Array.isArray(data.neighbors)) allNeighbors.push(...data.neighbors);
      if (data.pagination && typeof data.pagination.total === 'number') total = data.pagination.total;
      hasMore = !!(data.pagination ? data.pagination.hasMore : (Array.isArray(data.embedding) && data.embedding.length === limit));
      page += 1;

      // Update progress smoothly based on items loaded vs total
      const ratio = Math.min(1, total > 0 ? allEmbedding.length / total : 0);
      loadingProgress = start + ratio * (end - start);
    }

    return { embedding: allEmbedding, neighbors: allNeighbors };
  };

  onMount(async () => {
    try {
      console.log('[DEBUG] +page.svelte - Starting onMount');
      console.log('[DEBUG] +page.svelte - Data object:', data);
      console.log('[DEBUG] +page.svelte - EmbeddingName from data:', data?.embeddingName);
      console.time('[timing] client fetch data');
      
      // Initial connection
      loadingProgress = 5;
      simulateProgress(5, 25, 2000); // Simulate progress while connecting
      
      // Load ALL authors data with Pro plan capabilities
      console.log('[DEBUG] +page.svelte - About to fetch /api/data?page=0&limit=999999');
      console.log('[DEBUG] +page.svelte - Current URL:', window.location.href);
      console.log('[DEBUG] +page.svelte - Fetch URL will be:', '/api/data?page=0&limit=999999');
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('[DEBUG] +page.svelte - Request timeout after 5 minutes');
        controller.abort();
      }, 300000); // 5 minute timeout
      
      console.log('[DEBUG] +page.svelte - Making fetch request...');
      let response = await fetch('/api/data?page=0&limit=999999', {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      console.log('[DEBUG] +page.svelte - Fetch request completed');
      
      clearTimeout(timeoutId);
      console.log('[DEBUG] +page.svelte - Fetch completed, response status:', response.status);
      console.log('[DEBUG] +page.svelte - Response headers:', Object.fromEntries(response.headers.entries()));
      if (progressInterval) clearInterval(progressInterval);
      loadingProgress = 30;
      
      if (!response.ok) {
        console.error('[ERROR] +page.svelte - Response not OK:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('[ERROR] +page.svelte - Error response body:', errorText);

        // Fallback to paginated merge to avoid huge single response
        console.log('[DEBUG] +page.svelte - Falling back to paginated fetching...');
        if (progressInterval) clearInterval(progressInterval);
        loadingProgress = 30;
        try {
          const { embedding: eAll, neighbors: nAll } = await fetchAllPaginated(10000);
          embedding = eAll;
          neighbors = nAll;
          loadingProgress = 100;
          loading = false;
          console.timeEnd('[timing] client fetch data');
          console.log('[timing] client loaded via fallback:', { embeddingItems: embedding.length, neighborsItems: neighbors.length });
          return;
        } catch (fallbackErr) {
          console.error('[ERROR] +page.svelte - Fallback paginated fetching failed:', fallbackErr);
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
      }
      
      // Track download progress using Content-Length if available
      const contentLength = response.headers.get('Content-Length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      console.log('[DEBUG] +page.svelte - Content-Length:', contentLength, 'Total bytes:', total);
      
      let receivedLength = 0;
      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      console.log('[DEBUG] +page.svelte - Reader available:', !!reader);
      
      if (reader && total > 0) {
        console.log('[DEBUG] +page.svelte - Starting download with progress tracking');
        // Download with real progress tracking
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('[DEBUG] +page.svelte - Download completed, total received:', receivedLength);
            break;
          }
          
          chunks.push(value);
          receivedLength += value.length;
          
          // Map download progress from 30% to 65%
          loadingProgress = 30 + (receivedLength / total) * 35;
          
          // Log progress every 10MB
          if (receivedLength % (10 * 1024 * 1024) < value.length) {
            console.log(`[DEBUG] +page.svelte - Downloaded: ${(receivedLength / (1024 * 1024)).toFixed(1)}MB / ${(total / (1024 * 1024)).toFixed(1)}MB`);
          }
        }
      } else if (reader) {
        console.log('[DEBUG] +page.svelte - Starting download without Content-Length');
        // No Content-Length header, simulate progress
        simulateProgress(30, 60, 5000); // 5 seconds estimated for 95MB (was 20s for 425MB)
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('[DEBUG] +page.svelte - Download completed without Content-Length, total received:', receivedLength);
            break;
          }
          chunks.push(value);
          receivedLength += value.length;
        }
        
        if (progressInterval) clearInterval(progressInterval);
      } else {
        console.log('[DEBUG] +page.svelte - No reader available, using response.text()');
        // Fallback to response.text() if no reader
        const text = await response.text();
        console.log('[DEBUG] +page.svelte - Text length:', text.length);
        const result = JSON.parse(text);
        console.log('[DEBUG] +page.svelte - JSON parse completed via text()');
        
        embedding = result.embedding;
        neighbors = result.neighbors;
        loadingProgress = 100;
        loading = false;
        
        console.timeEnd('[timing] client fetch data');
        console.log('[timing] client loaded:', {
          embeddingItems: embedding.length,
          neighborsItems: neighbors.length
        });
        return;
      }
      
      loadingProgress = 65;
      
      // Combine chunks and decode
      console.log('[DEBUG] +page.svelte - Combining chunks, total chunks:', chunks.length);
      const totalChunkSize = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      console.log('[DEBUG] +page.svelte - Total chunk size:', totalChunkSize);
      
      const chunksAll = new Uint8Array(totalChunkSize);
      let position = 0;
      for (const chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
      }
      console.log('[DEBUG] +page.svelte - Chunks combined, final size:', chunksAll.length);
      
      loadingProgress = 70;
      simulateProgress(70, 90, 3000); // Simulate progress during JSON parsing (much faster with smaller payload!)
      
      console.log('[DEBUG] +page.svelte - Decoding text from chunks');
      const text = new TextDecoder('utf-8').decode(chunksAll);
      loadingProgress = 85;
      console.log('[DEBUG] +page.svelte - Text length:', text.length);
      console.log('[DEBUG] +page.svelte - Text preview (first 200 chars):', text.substring(0, 200));
      
      console.log('[DEBUG] +page.svelte - Starting JSON parse');
      const result = JSON.parse(text);
      console.log('[DEBUG] +page.svelte - JSON parse completed');
      console.log('[DEBUG] +page.svelte - Result keys:', Object.keys(result));
      if (progressInterval) clearInterval(progressInterval);
      loadingProgress = 95;
      
      embedding = result.embedding;
      neighbors = result.neighbors;
      // Collaborators are now loaded on-demand per author
      
      loadingProgress = 100;
      loading = false;
      
      console.timeEnd('[timing] client fetch data');
      console.log('[timing] client loaded:', {
        embeddingItems: embedding.length,
        neighborsItems: neighbors.length
      });
      console.log('[timing] Collaborators will be loaded on-demand when authors are selected');
    } catch (e) {
      console.error('[ERROR] +page.svelte - Failed to load data:', e);
      console.error('[ERROR] +page.svelte - Error type:', typeof e);
      console.error('[ERROR] +page.svelte - Error name:', e instanceof Error ? e.name : 'Unknown');
      console.error('[ERROR] +page.svelte - Error message:', e instanceof Error ? e.message : 'Unknown error');
      console.error('[ERROR] +page.svelte - Error stack:', e instanceof Error ? e.stack : 'No stack trace');
      
      // Check if it's an AbortError
      if (e instanceof Error && e.name === 'AbortError') {
        console.error('[ERROR] +page.svelte - Request was aborted (timeout)');
        error = 'Request timeout - the data is too large to load. Please try with a smaller dataset.';
      } else {
        error = e instanceof Error ? e.message : 'Unknown error';
      }
      
      loading = false;
      if (progressInterval) clearInterval(progressInterval);
    }
  });
</script>

{#if loading}
  <div class="loading-container">
    <div class="loading-content">
      <div class="spinner"></div>
      <h2>Loading Knowledge Graph Visualization</h2>
      <div class="progress-bar">
        <div class="progress-fill" style="width: {loadingProgress}%"></div>
      </div>
      <p class="progress-text">{Math.round(loadingProgress)}%</p>
      <p class="status-text">{
        loadingProgress < 30 ? 'Connecting to server...' :
        loadingProgress < 65 ? 'Downloading data (~95 MB)...' :
        loadingProgress < 90 ? 'Parsing JSON data...' :
        'Almost ready...'
      }</p>
    </div>
  </div>
{:else if error}
  <div class="error-container">
    <h2>Error Loading Data</h2>
    <p>{error}</p>
    <button on:click={() => window.location.reload()}>Retry</button>
  </div>
{:else if embedding && neighbors && collaboratorsdict}
  <Atlas 
    {embedding} 
    embeddingName={data.embeddingName} 
    embeddingNeighbors={neighbors} 
    {collaboratorsdict} 
  />
{/if}

<style>
  .loading-container, .error-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .loading-content {
    text-align: center;
    padding: 2rem;
    max-width: 500px;
    width: 100%;
  }

  .error-container {
    text-align: center;
    padding: 2rem;
    max-width: 500px;
  }

  .spinner {
    width: 60px;
    height: 60px;
    margin: 0 auto 2rem;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  h2 {
    font-size: 1.75rem;
    margin-bottom: 2rem;
    font-weight: 600;
    line-height: 1.3;
  }

  .progress-bar {
    width: 100%;
    height: 12px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    overflow: hidden;
    margin: 1.5rem 0 0.5rem;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.9), white);
    transition: width 0.1s ease-out;
    border-radius: 6px;
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
  }

  .progress-text {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0.75rem 0 0.25rem;
    opacity: 1;
  }

  .status-text {
    font-size: 1rem;
    opacity: 0.9;
    margin: 0.5rem 0;
    font-weight: 500;
  }

  .optimization-note {
    font-size: 0.875rem;
    opacity: 0.8;
    margin-top: 1rem;
    font-style: italic;
  }

  button {
    margin-top: 1.5rem;
    padding: 0.75rem 2rem;
    font-size: 1rem;
    background: white;
    color: #667eea;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  }

  button:active {
    transform: translateY(0);
  }
</style>

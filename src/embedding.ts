import * as fs from 'fs';
import { parse } from 'csv-parse';
import path from 'path';
import { DATA_DIR } from './conf';
import type { Embedding } from './routes/embedding';
import { EmbeddingName } from './types';
import { AnimeMediaType } from './malAPI';
import { inflate } from 'pako'; // 新增這行

interface RawEmbedding {
  points: { [index: string]: { x: number; y: number } };
  neighbors: { neighbors: { [index: string]: number[] } };
  ids: number[];
}
//  id	FullName	BeginYear	PaperNum
export interface Metadatum {
  id: number;
  FullName: string;
  BeginYear: number;
  PaperNum: number;
  IsAuthor: boolean;
  color_category: number;
  Affiliation: string;
  Data_Source: string;
  Data_Description: string;
  Data_url: string;
  Representative_papers: string;
  // average_rating: number;
  // aired_from_year: number;
  // media_type: AnimeMediaType;
}

const CachedRawEmbeddings: Map<EmbeddingName, RawEmbedding> = new Map();
const CachedEmbeddings: Map<EmbeddingName, Embedding> = new Map();
const CachedNeighbors: Map<EmbeddingName, number[][]> = new Map();


type CollaboratorDict = Record<number, number[]>;
const DATA_GZ_URL = '/work/data/author_collab_dataset_bioentity.json.gz';

export const loadCollaborators = async (): Promise<CollaboratorDict> => {
  try {
    const res = await fetch(DATA_GZ_URL);
    const buffer = await res.arrayBuffer();
    const decompressed = inflate(new Uint8Array(buffer), { to: 'string' });
    const parsedData = JSON.parse(decompressed);

    // Convert keys from string to number
    const collaboratorsDict: CollaboratorDict = {};
    for (const key in parsedData) {
      if (Object.hasOwnProperty.call(parsedData, key)) {
        collaboratorsDict[+key] = parsedData[key];
      }
    }

    return collaboratorsDict;
  } catch (error) {
    console.error('Error loading collaborators data:', error);
    throw error;
  }
};


// HEADERS: 
const METADATA_FILE_NAME = path.resolve('work/data/author_dataset_bio_entity.csv');

// id: number;ver
// FullName: string;
// BeginYear: number;
// PaperNum: number;
// IsAuthor: boolean;
export const loadMetadata = async () => {
  //const metadata = new Map<number, Metadatum>();
  const metadataById = new Map<number, Metadatum>(); // metadataById
  await new Promise((resolve) =>
    fs
      .createReadStream(METADATA_FILE_NAME)
      .pipe(parse({ delimiter: ',', columns: true })) // load CSV
      .on('data', (row) => {
        // Skip header row
        // const id = +row[0];
        // if (Number.isNaN(id)) {
        //   if (metadata.size === 0) {
        //     return;
        //   } else {
        //     console.error('Missing id for row ' + metadata.size);
        //   }
        // }
        const id = +row['id'];
        if (Number.isNaN(id)) return;
        const metadatum: Metadatum = {
          id,
          FullName: row['FullName'],
          BeginYear: +row['BeginYear'],
          PaperNum: +row['PaperNum'],
          IsAuthor: row['is_author'] === '1', // 確保是 boolean
          color_category: +row['color_category'],
          Affiliation: row['Affiliation'],
          Data_Source: row['Data_Source'],
          Data_Description: row['Data_Description'],
          Data_url: row['Data_url'],
          Representative_papers: row['pmids_string'],
        };
        metadataById.set(id, metadatum); // store in metadatByID
      })
      .on('end', () => {
        resolve(metadataById);
      })
  );
  return { metadataById };
};

const EmbeddingFilenameByName: { [K in EmbeddingName]: string } = {
  [EmbeddingName.TEST11]: 'projected_embedding_ggvec_top40_4d_order2.json',
  [EmbeddingName.TKG]: 'tkg_ebd_34k.json',
  [EmbeddingName.TKG_DATA]: 'tkg_ebd_34k_dataset.json',
  [EmbeddingName.TKG_DATA_SET_BIOENTITY]: 'tkg_ebd_34k_dataset_bioentity.json',

};

const AllValidEmbeddingNames = new Set(Object.keys(EmbeddingFilenameByName) as EmbeddingName[]);

export const validateEmbeddingName = (name: string | null | undefined): EmbeddingName | null =>
  AllValidEmbeddingNames.has(name as EmbeddingName) ? (name as EmbeddingName) : null;

const loadRawEmbedding = async (embeddingName: EmbeddingName): Promise<RawEmbedding> => {
  const cached = CachedRawEmbeddings.get(embeddingName);
  if (cached) {
    return cached;
  }

  // function listDirectoryContents(dir: string): void {
  //   const items = fs.readdirSync(dir);

  //   items.forEach(item => {
  //     const fullPath = path.join(dir, item);
  //     const stats = fs.statSync(fullPath);

  //     if (stats.isDirectory()) {
  //       console.log(`Directory: ${fullPath}`);
  //       listDirectoryContents(fullPath);
  //     } else {
  //       console.log(`File: ${fullPath}`);
  //     }
  //   });
  // }
  // console.log('\nDirectory structure:');
  // listDirectoryContents(process.cwd());
  // console.log('Current directory:', process.cwd());
  // console.log('File path:', path.resolve('work/data/tkg_ebd_34k.json'));

  const embeddingFilename = EmbeddingFilenameByName[embeddingName];
  // console.log('loading embedding from ', `${DATA_DIR}/${embeddingFilename}`);
  return new Promise((resolve) =>
    fs.readFile(path.resolve('work/data/tkg_ebd_34k_dataset_bioentity.json'), (err, data) => {
      if (err) {
        throw err;
      }

      const embedding = JSON.parse(data.toString());
      const entries = Object.entries(embedding.points);
      if (embedding.ids.length !== entries.length) {
        throw new Error(`Have ${entries.length} embedding entries, but ${embedding.ids.length} ids`);
      }

      CachedRawEmbeddings.set(embeddingName, embedding);

      resolve(embedding);
    })
  );
};

const buildDummyMetadatum = (id: number): Metadatum => ({
  id,
  FullName: 'Unknown',
  BeginYear: 0,
  PaperNum: 0,
  IsAuthor: false, // ensure `IsAuthor` exist
  color_category: 0, // set up default value
  Affiliation: 'Unknown', // set up default as 'Unknown'
  Data_Source: 'N/A', // avoid undefined error msg
  Data_Description: 'No data available',
  Data_url: '',
  Representative_papers: '',
});

export const loadEmbedding = async (embeddingName: EmbeddingName): Promise<Embedding> => {
  const cached = CachedEmbeddings.get(embeddingName);
  if (cached) {
    return cached;
  }

  //const metadata = await loadMetadata();
  const { metadataById } = await loadMetadata(); // destruct metadataById

  const rawEmbedding = await loadRawEmbedding(embeddingName);
  const entries = Object.entries(rawEmbedding.points);

  const embedding: Embedding = [];
  for (const [index, point] of entries) {
    const i = +index;
    const id = +rawEmbedding.ids[i];
    let metadatum = metadataById.get(id) // ensure recieve msg from metadataById
    if (!metadatum) {
      console.warn(`Missing metadata for ID ${id}, creating placeholder.`);
      metadatum = {
        id,
        FullName: 'Unknown',
        BeginYear: 0,
        PaperNum: 0,
        IsAuthor: false,
        color_category: 0,
        Affiliation: 'Unknown',
        Data_Source: 'N/A',
        Data_Description: 'No data available',
        Data_url: '',
        Representative_papers: '',
      }; // Implement Bioentity
    }

    embedding.push({
      vector: { x: point.x * 5, y: point.y * 5 },
      metadata: metadatum!,
    });
  }
  // did not work?
  embedding.sort((a, b) => {
    if (b.metadata.PaperNum !== a.metadata.PaperNum) {
      return b.metadata.PaperNum - a.metadata.PaperNum;
    }
    return b.metadata.id - a.metadata.id;
  });

  CachedEmbeddings.set(embeddingName, embedding);
  return embedding;
};


export const loadNeighbors = async (embeddingName: EmbeddingName): Promise<number[][]> => {
  const cached = CachedNeighbors.get(embeddingName);
  if (cached) {
    return cached;
  }

  const rawEmbedding = await loadRawEmbedding(embeddingName);
  const embedding = await loadEmbedding(embeddingName);

  const idByOriginalIndex = rawEmbedding.ids;
  const originalIndexByID = new Map<number, number>();
  for (let i = 0; i < idByOriginalIndex.length; i++) {
    originalIndexByID.set(+idByOriginalIndex[i], i);
  }

  const neighbors = embedding.map(({ metadata: { id } }) => {
    const originalIndex = originalIndexByID.get(+id);
    // console.log('errors?: ', originalIndex)
    if (originalIndex === undefined) {
      console.error('Missing original index for id ' + id);
      return [];
    }
    const neighbors = rawEmbedding.neighbors.neighbors[originalIndex];
    if (!neighbors) {
      throw new Error('Missing neighbors for original index ' + originalIndex);
    }

    return neighbors.map((neighborIndex) => +idByOriginalIndex[neighborIndex]);
  });

  CachedNeighbors.set(embeddingName, neighbors);
  return neighbors;
};
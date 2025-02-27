import * as fs from 'fs';
import { parse } from 'csv-parse';
import path from 'path';
import { DATA_DIR } from './conf';
import type { Embedding } from './routes/embedding';
import { EmbeddingName } from './types';
import { AnimeMediaType} from './malAPI';

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
const DATA_FILE_NAME = path.resolve('work/data/author_collab_dataset.json');
export const loadCollaborators = async (): Promise<CollaboratorDict> => {
  try {
    const data = await fs.promises.readFile(DATA_FILE_NAME, 'utf-8');
    const parsedData = JSON.parse(data);

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
  const metadata = new Map<number, Metadatum>();
  await new Promise((resolve) =>
    fs
      .createReadStream(METADATA_FILE_NAME)
      .pipe(parse({ delimiter: ',' }))
      .on('data', (row) => {
        // Skip header row
        const id = +row[0];
        if (Number.isNaN(id)) {
          if (metadata.size === 0) {
            return;
          } else {
            console.error('Missing id for row ' + metadata.size);
          }
        }
        metadata.set(id, {
          id,
          FullName: row[1],
          BeginYear: +row[2],
          PaperNum: +row[3],
          IsAuthor: +row[7] === 1,
          color_category: +row[9],
          Affiliation: row[10],
          Data_Source: row[11],
          Data_Description: row[12],
          Data_url: row[13],
          Representative_papers: row[14],
          
          // aired_from_year: +row[5],
          // media_type: 'movie' as AnimeMediaType,
        });
      })
      .on('end', () => {
        resolve(metadata);
      })
  );
  return metadata;
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
  // title_english: 'Unknown',
  // rating_count: 0,
  // average_rating: 0,
  // aired_from_year: 0,
  // media_type: AnimeMediaType.Unknown,
});

export const loadEmbedding = async (embeddingName: EmbeddingName): Promise<Embedding> => {
  const cached = CachedEmbeddings.get(embeddingName);
  if (cached) {
    return cached;
  }

  const metadata = await loadMetadata();

  const rawEmbedding = await loadRawEmbedding(embeddingName);
  const entries = Object.entries(rawEmbedding.points);

  const embedding: Embedding = [];
  for (const [index, point] of entries) {
    const i = +index;
    const id = +rawEmbedding.ids[i];
    let metadatum = metadata.get(id);
    if (!metadatum) {
      console.error(`Missing metadata for id ${id}; fetching from MAL`);
      try {
        // const [datum] = await getAnimesByID([id]);
        // if (datum) {
        //   throw new Error('Missing metadata for id but it is fetched from MAL');
        // } else {
        //   throw new Error('Missing metadata for id and it is not fetched from MAL');
        // }
      } catch (e) {
        console.error(`Failed to fetch metadata for id ${id}; embedding probably needs to be updated`);
        metadatum = buildDummyMetadatum(id);
      }
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
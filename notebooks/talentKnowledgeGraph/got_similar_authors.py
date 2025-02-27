import csv
import gzip
from tqdm import tqdm
import numpy as np
import concurrent.futures
import pandas as pd
import pickle
import gzip

with gzip.open("author_collaborators.pkl.gz", "rb") as f:
    author_collab = pickle.load(f)

with gzip.open("author_embeddings.pkl.gz", "rb") as f:
    author_ebd = pickle.load(f)

paper_author_2m = pd.read_csv('/data/jx4237data/TKG/TKG_JCDL/Bridge2AI_2m/paper_author.csv.gz')

aids_with_recent_pubs = set(paper_author_2m[paper_author_2m['PubYear'] > 2018]['AID'])


def get_top_n_similar_authors(author_id):
    # Check if the author_id exists in the dictionary
    if author_id not in author_ebd:
        raise ValueError(f"Author ID {author_id} not found in the author embeddings.")
    
    # Get the embedding of the target author
    target_embedding = author_ebd[author_id]
    
    # Initialize a list to store similarities
    similarities = []
    
    # Compute cosine similarity between the target author and all other authors
    for other_id, other_embedding in author_ebd.items():
        if other_id != author_id and other_id in aids_with_recent_pubs and other_id not in author_collab[author_id]:  # Exclude the target author from the comparison
            cosine_similarity = np.dot(target_embedding, other_embedding) / (np.linalg.norm(target_embedding) * np.linalg.norm(other_embedding))
            similarities.append((other_id, cosine_similarity))
    
    # Sort the list by similarity in descending order and get the top N
    similarities.sort(key=lambda x: x[1], reverse=True)
    top_n_similar_authors = [author_id for author_id, _ in similarities[:30]]
    
    return (author_id, top_n_similar_authors)

# Set max_workers to control the number of parallel processes
max_workers = 30

# Use a ProcessPoolExecutor to parallelize the computation
with gzip.open('author_recommendations.csv.gz', 'wt', newline='') as gzfile:
    writer = csv.writer(gzfile)
    writer.writerow(['AID', 'Recommended AID'])

    with concurrent.futures.ProcessPoolExecutor(max_workers=max_workers) as executor:
        # Map the get_top_n_similar_authors function to each author in parallel
        results = list(tqdm(executor.map(get_top_n_similar_authors, author_collab.keys()), total=len(author_collab)))

        # Write the results to the gzip-compressed CSV
        for author_id, recommended_authors in results:
            for recommended_id in recommended_authors:
                writer.writerow([author_id, recommended_id])

## Tech

The site is written in TypeScript and built with [SvelteKit](https://kit.svelte.dev/) using the Node.JS adapter.

See the `notebooks` directory for experiments, research, and notebooks used for the embedding generation process.

The web portion of the atlas is built with [PixiJS](https://pixijs.com/), a WebGL-powered 2D graphics framework for interactive web apps.

## Deploying to Vercel

- Data files in `work/data` are copied to `static/data` during build via the `prebuild` script.
- Runtime will read from filesystem first; if unavailable (serverless), it fetches from `/data/...`.
- You can override the HTTP base with env var `PUBLIC_DATA_BASE_URL` (e.g. to a CDN).

## Acknowledgment 
Our code is modified from https://github.com/Ameobea/sprout. Huge shout outs to the original authors!

## Citation

If you use this work, please cite:


```bibtex
@inproceedings{xu2025interactive,
  author    = {Xu, Jiawei and Chen, Juichien and Ye, Yilin and Sembay, Zhandos and Thaker, Swathi and Payne-Foster, Pamela and Chen, Jake and Ding, Ying},
  title     = {Interactive Graph Visualization and Teaming Recommendation in an Interdisciplinary Project's Talent Knowledge Graph},
  booktitle = {Proceedings of the 88th Annual Meeting of the Association for Information Science \& Technology (ASIS\&T)},
  year      = {2025},
  pages     = {1142--1147},
  address   = {Washington, DC, USA},
  month     = nov,
}

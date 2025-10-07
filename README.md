# Knowledge Graph Visualization & Teaming Recommendation System

An interactive web application for visualizing talent knowledge graphs and providing intelligent teaming recommendations in interdisciplinary research projects. Built with modern web technologies and powered by advanced embedding techniques.

## Features

- **Interactive Graph Visualization**: Explore talent networks with WebGL-powered 2D graphics
- **Intelligent Teaming Recommendations**: AI-powered suggestions for optimal team formation
- **Real-time Collaboration Analysis**: Discover potential collaborators and research connections
- **Multi-dimensional Embedding Support**: Visualize high-dimensional author embeddings in 2D/3D space
- **Responsive Web Interface**: Modern, accessible UI built with SvelteKit
- **Performance Optimized**: Handles large datasets (90k+ authors) with efficient data streaming

## Live Demo

[View the live application](https://cm4aikg.vercel.app/)

## Technology Stack

### Frontend
- **[SvelteKit](https://kit.svelte.dev/)** - Full-stack web framework
- **[PixiJS](https://pixijs.com/)** - WebGL-powered 2D graphics for interactive visualizations
- **[D3.js](https://d3js.org/)** - Data visualization and manipulation
- **[Carbon Design System](https://carbondesignsystem.com/)** - UI components and design system
- **TypeScript** - Type-safe development

### Backend & Data
- **Node.js** - Server runtime
- **SvelteKit API Routes** - Server-side endpoints
- **JSON Data Streaming** - Efficient handling of large datasets
- **Embedding Models** - High-dimensional author representations

### Deployment
- **Vercel** - Serverless deployment platform
- **GitHub Actions** - CI/CD pipeline

## Dataset

The system works with talent knowledge graphs containing:
- **90,000+ authors** from interdisciplinary research projects
- **Collaboration networks** and co-authorship relationships
- **Research embeddings** in high-dimensional space
- **Metadata** including affiliations, research areas, and publication history

## Project Structure

```
knowledge_graph_viz/
├── src/
│   ├── components/           # Svelte components
│   │   ├── Atlas.svelte     # Main visualization component
│   │   ├── AtlasViz.ts      # Visualization logic
│   │   └── interactiveRecommender/  # Recommendation system
│   ├── routes/              # SvelteKit routes
│   │   ├── api/             # API endpoints
│   │   │   ├── data/        # Data serving endpoints
│   │   │   └── collaborators/  # Collaboration analysis
│   │   └── talent/          # Main application pages
│   ├── embedding.ts         # Embedding utilities
│   └── types.ts            # TypeScript definitions
├── notebooks/              # Research notebooks and experiments
│   ├── talentKnowledgeGraph/  # Main research notebooks
│   └── add_bio_entities/   # Bio-entity analysis
├── static/data/            # Static data files (excluded from git)
├── scripts/                # Build and utility scripts
└── work/data/              # Working data directory (excluded from git)
```

## Quick Start

### Prerequisites

- **Node.js** >= 20.0.0
- **npm** or **yarn**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jiaweixu98/knowledge_graph_viz.git
   cd knowledge_graph_viz
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up data files**
   ```bash
   # Copy your data files to work/data/ directory
   # The build process will automatically copy them to static/data/
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

### Building for Production

```bash
# Build the application
npm run build

# Preview the production build
npm run preview
```

## Citation

If you use this work in your research, please cite:

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
```

## Acknowledgments

Our code is modified from [Sprout](https://github.com/Ameobea/sprout). Huge shoutouts to the original authors for the excellent foundation!

## Support

For questions, issues, or contributions:
- **Issues**: [GitHub Issues](https://github.com/jiaweixu98/knowledge_graph_viz/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jiaweixu98/knowledge_graph_viz/discussions)

---

**Built for the research community**
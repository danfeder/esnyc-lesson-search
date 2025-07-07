# ESNYC Lesson Search Interface

A modern, responsive web application for searching and filtering 831 tagged Edible Schoolyard NYC lesson plans. This interface provides powerful search capabilities across 16 different metadata categories to help teachers find the perfect lessons for their needs.

## 🌟 Features

- **Advanced Search**: Full-text search across titles, summaries, ingredients, skills, and more
- **Smart Filtering**: 16 categories of filters including grade levels, themes, seasons, cultural heritage
- **Hierarchical Cultural Search**: Search by region (e.g., "Asian") to find all related cultures
- **Ingredient Grouping**: Search "butternut squash" also finds "Winter squash" lessons
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Export Functionality**: Download filtered results as CSV for Excel/Google Sheets
- **Fast Performance**: All filtering happens client-side for instant results

## 🚀 Quick Start

### Option 1: Python (Simplest)
```bash
# Clone or download this repository
cd esnyc-lesson-search
python3 -m http.server 8000
# Visit http://localhost:8000
```

### Option 2: Node.js
```bash
# Install dependencies
npm install

# Start server
npm start
# Visit http://localhost:3000
```

### Option 3: Live Development
```bash
npm install
npm run dev
# Auto-refreshing server at http://localhost:8000
```

## 📦 Deployment Options

### Deploy to Netlify (Recommended)
1. Fork/clone this repository
2. Connect to Netlify via GitHub
3. Deploy with one click
4. Or drag and drop the folder to [Netlify Drop](https://app.netlify.com/drop)

### Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow the prompts
```

### Deploy to GitHub Pages
1. Push to GitHub repository
2. Go to Settings → Pages
3. Select source: "Deploy from a branch"
4. Select branch: main (or master)
5. Select folder: / (root)
6. Save and wait for deployment

### Deploy to Firebase Hosting
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Initialize project
firebase init hosting

# Deploy
firebase deploy
```

### Custom Server Deployment
```bash
# On your server
git clone [your-repo]
cd esnyc-lesson-search
npm install
npm start

# Use PM2 for production
npm install -g pm2
pm2 start server.js --name "esnyc-search"
```

## 📁 Project Structure

```
esnyc-lesson-search/
├── index.html          # Main HTML file
├── styles.css          # All styling
├── search.js           # Search and filter logic
├── data/
│   └── consolidated_lessons.json  # Lesson database
├── server.js           # Node.js server (optional)
├── package.json        # NPM configuration
├── netlify.toml        # Netlify deployment config
├── vercel.json         # Vercel deployment config
└── README.md           # This file
```

## 🔍 Using the Search Interface

### Basic Search
- Type keywords in the search box
- Searches across: titles, summaries, ingredients, skills, themes, etc.
- Use quotes for exact phrases: "companion planting"

### Filters
**Main Filters (Always Visible)**
- **Grade Level**: 3K through 8th grade with grouped options
- **Thematic Category**: 7 main educational themes
- **Season & Timing**: Seasons plus special timing options
- **Core Competencies**: 6 ESNYC educational priorities
- **Location**: Indoor, Outdoor, or Both
- **Activity Type**: Cooking, Garden, or No Cooking Required

**Advanced Filters**
- **Cultural Heritage**: Hierarchical selection by region or specific culture
- **Lesson Format**: Standalone, Multi-session, Double period, etc.

### Special Features
- **"Include year-round lessons"**: When searching by season, also includes "All Seasons" lessons
- **Cultural Hierarchy**: Selecting "Latin American" includes Mexican, Dominican, etc.
- **Smart Ingredients**: Search recognizes ingredient categories

### Export Results
- Click "Export CSV" to download current filtered results
- Includes all metadata for each lesson
- Compatible with Excel, Google Sheets, and other spreadsheet apps

## 🛠️ Customization

### Changing Brand Colors
Edit `styles.css` and modify the CSS variables:
```css
:root {
    --primary-green: #2c5530;  /* ESNYC brand green */
    --accent-orange: #ff6b35;  /* ESNYC brand orange */
}
```

### Adding New Filters
1. Add filter HTML in `index.html`
2. Add filter logic in `search.js` `applyFilters()` function
3. Update filter counting in `updateFilterCounts()`

### Modifying Data Structure
The lesson data is stored in `data/consolidated_lessons.json`. Each lesson has:
- Basic info: lessonId, title, summary, fileLink
- Grade levels array
- Metadata object with all categorizations
- Confidence scores

## 📊 Data Updates

To update the lesson data:
1. Replace `data/consolidated_lessons.json` with new data
2. Ensure the data structure matches existing format
3. Test locally before deploying

## 🔧 Troubleshooting

**"Error loading lessons" message**
- Ensure you're running a web server (not opening index.html directly)
- Check that `data/consolidated_lessons.json` exists
- Check browser console for specific errors

**Filters not working**
- Clear browser cache
- Check console for JavaScript errors
- Ensure data file is valid JSON

**Slow performance**
- The data file is ~3MB, initial load may take a moment
- Consider using a CDN for the data file
- Enable gzip compression on your server

## 📈 Performance Optimization

The app is optimized for performance:
- All filtering happens client-side (no server requests)
- Efficient DOM updates using document fragments
- Debounced search input
- Lazy loading of results (20 at a time)

For production deployments:
- Enable gzip compression (included in Node.js server)
- Use a CDN for static assets
- Set appropriate cache headers (included in deployment configs)

## 🤝 Contributing

To contribute:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License. The lesson content belongs to Edible Schoolyard NYC.

## 🙏 Acknowledgments

- Edible Schoolyard NYC for the lesson content
- Teachers and educators who use these resources
- Contributors to the tagging and categorization effort

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Contact ESNYC directly for lesson content questions
- Check the browser console for technical errors

---

Built with ❤️ for ESNYC educators
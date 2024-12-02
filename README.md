# Heatmap Web Crawler with Visual Site Mapping

A desktop application that crawls websites and generates visual site maps with screenshots. Built with Electron, Express, and Mermaid.js.

## Features

- Crawl websites and generate interactive site maps
- Capture full-page screenshots of each page
- Highlight specific HTML elements during crawl
- Configurable crawl depth
- Visual flowchart representation of site structure
- Customizable storage location for crawl data

## Quick Start (Mac App)

1. Download the latest release from the Releases page
2. Open the DMG file
3. Drag the Web Crawler app to your Applications folder
4. Launch the app from Applications

Note: On first launch, you may need to right-click the app and select "Open" to bypass Mac security settings.

## Building From Source

### Prerequisites

- Node.js (v14 or higher)
- npm (usually comes with Node.js)
- Git

### Installation Steps

1. Clone the repository:
```bash
git clone https://github.com/yourusername/web-crawler-visual
cd web-crawler-visual
```

2. Install dependencies:
```bash
npm install
```

3. Install additional required dependencies:
```bash
npm install electron express axios cheerio puppeteer
```

4. Start the application in development mode:
```bash
npm start
```

### Building the Application

To create a distributable version:

```bash
npm run make
```

The packaged application will be available in the `out` directory.

## Usage

1. Launch the application
2. Enter a starting URL in the "Starting URL" field
3. (Optional) Set the maximum number of URLs to crawl
4. (Optional) Enter CSS selectors for elements to highlight, separated by commas
5. (Optional) Choose a highlight color
6. Click "Start Crawling"
7. Wait for the crawl to complete and view the generated site map

### Configuring Storage Location

By default, crawl data is stored in the application's user data directory. To change this:

1. Click "Choose Directory"
2. Select your preferred storage location
3. To revert to the default location, click "Reset to Default"

## Project Structure

```
web-crawler-visual/
├── src/
│   ├── client.js        # Frontend JavaScript
│   ├── server.js        # Backend Express server
│   └── index.html       # Main application window
├── public/
│   └── crawls/          # Default storage for crawl data
└── package.json         # Project configuration
```

## Technical Details

- **Frontend**: HTML, CSS, JavaScript with Mermaid.js for diagrams
- **Backend**: Express.js server running in Electron
- **Crawling**: Uses Puppeteer for page screenshots and Cheerio for HTML parsing
- **Storage**: File-based storage for crawl data and screenshots
- **Visualization**: Mermaid.js for flowchart generation

## Troubleshooting

### Common Issues

1. **"Error: Failed to launch browser"**
   - Ensure you have enough disk space
   - Try running with elevated privileges

2. **"Error rendering diagram"**
   - Check the browser console for specific error messages
   - Ensure the crawl completed successfully
   - Try reducing the maximum number of URLs to crawl

3. **"Permission denied" when saving files**
   - Ensure you have write permissions for the selected directory
   - Try using the default storage location

### Debug Logs

The application creates logs in the following locations:
- Mac: `~/Library/Logs/web-crawler-visual/`
- Windows: `%USERPROFILE%\AppData\Roaming\web-crawler-visual\logs\`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

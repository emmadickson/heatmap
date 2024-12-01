const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const puppeteer = require('puppeteer');
const url = require('url');

const app = express();
const port = 3000;
const CRAWLS_DIR = path.join(__dirname, 'public', 'crawls');

// Middleware

app.use(express.json());
app.use(express.static('public'));

//memory storage for highlight status and color
let highlightStatus = 'off';
let highlightColor = '#FF0000';
let itemList = [];

class Page {
    constructor(url) {
        this.url = url;
        this.children = [];
        this.screenshot = null;
    }

    toJSON() {
        return {
            url: this.url,
            screenshot: this.screenshot,
            children: this.children.map(child => child.toJSON())
        };
    }
}

async function crawlSite(startUrl, maxUrls = 100, browser = null, highlightElements = null, highlightColor = '#ff0000', exportData = false) {
    console.log('crawlSite function called with:');
    console.log('Start URL:', startUrl);
    console.log('Max URLs:', maxUrls);
    console.log('Highlight Elements:', highlightElements);
    console.log('Highlight Color:', highlightColor);
    console.log('Export Data:', exportData);

    const visited = new Set();
    const toVisit = [[startUrl, null]]; // [url, parentPage]
    const baseDomain = new URL(startUrl).hostname;
    const rootPage = new Page(startUrl);
    const pages = new Map([[startUrl, rootPage]]);

    while (toVisit.length > 0 && visited.size < maxUrls) {
        const [currentUrl, parentPage] = toVisit.shift();

        if (!visited.has(currentUrl)) {
            console.log(`Crawling: ${currentUrl}`);
            visited.add(currentUrl);

            try {
                const response = await axios.get(currentUrl);
                if (response.status === 200) {
                    const $ = cheerio.load(response.data);

                    let currentPage = pages.get(currentUrl);
                    if (!currentPage) {
                        currentPage = new Page(currentUrl);
                        pages.set(currentUrl, currentPage);
                    }

                    if (parentPage) {
                        parentPage.children.push(currentPage);
                    }

                    if (browser && exportData) {
                        console.log('Taking screenshot for:', currentUrl);
                        console.log('Highlight Elements:', highlightElements);
                        console.log('Highlight Color:', highlightColor);
                        currentPage.screenshot = await takeScreenshot(browser, currentUrl, baseDomain, highlightElements, highlightColor, exportData);
                    }

                    // Process regular <a> links
                    $('a[href]').each((_, element) => {
                        processLink($(element).attr('href'), currentUrl, baseDomain, visited, toVisit, currentPage);
                    });

                    // Process <area> tags within <map> elements
                    $('area[href]').each((_, element) => {
                        processLink($(element).attr('href'), currentUrl, baseDomain, visited, toVisit, currentPage);
                    });

                    // Process <frame> and <iframe> elements
                    $('frame[src], iframe[src]').each((_, element) => {
                        processLink($(element).attr('src'), currentUrl, baseDomain, visited, toVisit, currentPage);
                    });
                }
            } catch (error) {
                console.error(`Error crawling ${currentUrl}: ${error.message}`);
            }
        }
    }

    return rootPage;
}

function processLink(href, currentUrl, baseDomain, visited, toVisit, parentPage) {
    try {
        const fullUrl = new URL(href, currentUrl).href;
        if (new URL(fullUrl).hostname === baseDomain && !visited.has(fullUrl) && !toVisit.some(([url]) => url === fullUrl)) {
            toVisit.push([fullUrl, parentPage]);
        }
    } catch (error) {
        console.error(`Error processing link ${href}: ${error.message}`);
    }
}


async function takeScreenshot(browser, url, baseDomain, highlightElements, highlightColor, exportData) {
    console.log('takeScreenshot function called for URL:', url);
    console.log('Highlight Elements:', highlightElements);
    console.log('Highlight Color:', highlightColor);

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        await page.goto(url, { waitUntil: 'networkidle0' });

        if (highlightElements && highlightElements.length > 0) {
            await page.evaluate(createHighlightJs(), highlightElements, highlightColor);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        if (exportData) {
            // Create base domain directory under public/crawls
            const domainPath = path.join(CRAWLS_DIR, baseDomain);
            // Create screenshots subdirectory
            const screenshotsFolder = path.join(domainPath, 'screenshots');
            await fs.mkdir(screenshotsFolder, { recursive: true });

            const filename = `screenshot_${new URL(url).pathname.replace(/\//g, '_') || 'root'}.png`;
            const filepath = path.join(screenshotsFolder, filename);

            await page.waitForNetworkIdle({ idleTime: 1000 });

            await page.screenshot({
                path: filepath,
                fullPage: true,
                timeout: 30000
            });

            await page.evaluate(() => {
                console.log('Overlays present:', document.querySelectorAll('.overlay-div, .overlay-diva').length);
            });

            await page.close();
            console.log('Screenshot saved:', filepath);

            // Return the public URL path for the screenshot
            return `/crawls/${baseDomain}/screenshots/${filename}`;
        } else {
            console.log('Screenshot not saved (exportData is false)');
            return null;
        }
    } catch (error) {
        console.error(`Error taking screenshot of ${url}: ${error.message}`);
        return null;
    }
}

async function saveSiteStructure(structure, startUrl) {
    const domain = new URL(startUrl).hostname;
    // Save structure.json in the domain directory, not in screenshots
    const domainPath = path.join(CRAWLS_DIR, domain);
    await fs.mkdir(domainPath, { recursive: true });

    const filepath = path.join(domainPath, 'structure.json');
    await fs.writeFile(filepath, JSON.stringify(structure, null, 2));

    // Return the public URL path
    return `/crawls/${domain}/structure.json`;
}

app.get(':domain', async (req, res) => {
    const domain = req.params.domain;
    console.log(`Looking for structure file for domain: ${domain}`);
    // Look for structure.json in the domain directory
    const structureFile = path.join(CRAWLS_DIR, domain, 'structure.json');

    try {
        console.log(`Attempting to read from: ${structureFile}`);
        const data = await fs.readFile(structureFile, 'utf8');
        console.log('Successfully read structure file');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error(`Error reading structure file: ${error.message}`);
        console.error(`Attempted to read from: ${structureFile}`);
        res.status(404).json({ error: 'Structure file not found' });
    }
});

function createHighlightJs() {
    return `
    (elements, color) => {
        console.log('createHighlightJs function executed in browser');
        console.log('Elements:', elements);
        console.log('Color:', color);

        function hexToRgba(hex) {
            hex = hex.replace('#', '');
            const bigint = parseInt(hex, 16);
            const r = (bigint >> 16) & 255;
            const g = (bigint >> 8) & 255;
            const b = bigint & 255;
            return \`rgba(\${r}, \${g}, \${b}, 0.5)\`;
        }

        const highlightColor = color ? hexToRgba(color) : 'rgba(255, 0, 0, 0.5)';
        console.log('Computed highlight color:', highlightColor);

        // Handle image maps
        document.querySelectorAll('img[usemap]').forEach(img => {
            const mapName = img.getAttribute('usemap').replace('#', '');
            const map = document.querySelector(\`map[name="\${mapName}"]\`);
            const rect = img.getBoundingClientRect();

            const overlayDiv = document.createElement('div');
            overlayDiv.classList.add('overlay-div');
            overlayDiv.style.position = 'absolute';
            overlayDiv.style.pointerEvents = 'none';
            overlayDiv.style.zIndex = '10000';
            overlayDiv.style.opacity = '0.5';
            overlayDiv.style.left = \`\${rect.left + window.scrollX}px\`;
            overlayDiv.style.top = \`\${rect.top + window.scrollY}px\`;
            overlayDiv.style.width = \`\${rect.width}px\`;
            overlayDiv.style.height = \`\${rect.height}px\`;
            document.body.appendChild(overlayDiv);

            if (map) {
                map.querySelectorAll('area').forEach(area => {
                    const coords = area.coords.split(',').map(Number);

                    if (area.shape.toLowerCase() === 'rect') {
                        const [left, top, right, bottom] = coords;
                        const overlayLink = document.createElement('a');
                        overlayLink.style.position = 'absolute';
                        overlayLink.style.left = \`\${left}px\`;
                        overlayLink.style.top = \`\${top}px\`;
                        overlayLink.style.width = \`\${right - left}px\`;
                        overlayLink.style.height = \`\${bottom - top}px\`;
                        overlayLink.style.backgroundColor = highlightColor;
                        overlayLink.href = area.href;
                        overlayLink.target = area.target;
                        overlayLink.title = area.alt;
                        overlayDiv.appendChild(overlayLink);
                    } else if (area.shape.toLowerCase() === 'polygon') {
                        let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
                        for (let i = 0; i < coords.length; i += 2) {
                            minX = Math.min(minX, coords[i]);
                            maxX = Math.max(maxX, coords[i]);
                            minY = Math.min(minY, coords[i+1]);
                            maxY = Math.max(maxY, coords[i+1]);
                        }
                        const width = maxX - minX;
                        const height = maxY - minY;

                        const overlayLink = document.createElement('a');
                        overlayLink.style.position = 'absolute';
                        overlayLink.style.left = \`\${minX}px\`;
                        overlayLink.style.top = \`\${minY}px\`;
                        overlayLink.style.width = \`\${width}px\`;
                        overlayLink.style.height = \`\${height}px\`;
                        overlayLink.style.backgroundColor = highlightColor;
                        overlayLink.href = area.href;
                        overlayLink.target = area.target;
                        overlayLink.title = area.alt;
                        overlayDiv.appendChild(overlayLink);
                    }
                });
            }
        });

        // Handle other elements
        if (elements && Array.isArray(elements)) {
            elements.forEach(selector => {
                if (selector !== 'map') {
                    const els = document.querySelectorAll(selector);
                    if (els.length > 0) {
                        els.forEach(el => {
                            const overlayDiv = document.createElement('div');
                            overlayDiv.classList.add('overlay-diva');
                            overlayDiv.style.position = 'absolute';
                            overlayDiv.style.left = \`\${el.offsetLeft}px\`;
                            overlayDiv.style.top = \`\${el.offsetTop}px\`;
                            overlayDiv.style.width = \`\${el.offsetWidth}px\`;
                            overlayDiv.style.height = \`\${el.offsetHeight}px\`;
                            overlayDiv.style.backgroundColor = highlightColor;
                            overlayDiv.style.zIndex = '9999';
                            document.body.appendChild(overlayDiv);
                        });
                    }
                }
            });
        }
    }
    `;
}

async function saveSiteStructure(structure, startUrl) {
    const domain = new URL(startUrl).hostname;
    // Save in public/crawls/<domain>/
    const domainPath = path.join(CRAWLS_DIR, domain);
    await fs.mkdir(domainPath, { recursive: true });

    const filepath = path.join(domainPath, 'structure.json');
    await fs.writeFile(filepath, JSON.stringify(structure, null, 2));

    // Return the public URL path that matches how it will be accessed
    return `/crawls/${domain}/structure.json`;
}

// Routes

app.get('/api/status', (req, res) => {
    res.json({ status: highlightStatus });
});

app.post('/api/toggle', (req, res) => {
    highlightStatus = req.body.status;
    res.json({ status: highlightStatus });
});

app.post('/api/updateColor', (req, res) => {
    highlightColor = req.body.color;
    res.json({ color: highlightColor });
});

app.post('/api/updateItems', (req, res) => {
    itemList = req.body.itemList;
    res.json({ itemList: itemList });
});

app.get('/api/highlight', (req, res) => {
    res.json({
        status: highlightStatus,
        color: highlightColor,
        itemList: itemList
    });
});

app.post('/crawl', async (req, res) => {
    console.log('Received crawl request:', req.body);
    const { startUrl, maxUrls, highlightElements, highlightColor, exportData } = req.body;

    const browser = await puppeteer.launch({
    headless: 'new',  // Use new headless mode
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage'
    ]
});
  try {
        const rootPage = await crawlSite(startUrl, maxUrls, browser, highlightElements, highlightColor, exportData);
        const siteStructure = rootPage.toJSON();

        let structurePath = null;
        if (exportData) {
            structurePath = await saveSiteStructure(siteStructure, startUrl);
        }

        res.json({
            message: `Site structure created with ${siteStructure.children.length} top-level pages.`,
            structurePath: structurePath,
            siteStructure: siteStructure
        });
    } catch (error) {
        console.error('Crawl error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        await browser.close();
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
// After the server starts
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    // Add debug information about the crawls directory
    console.log(`Serving static files from: ${path.resolve('public')}`);
    console.log(`Crawls directory: ${CRAWLS_DIR}`);
});

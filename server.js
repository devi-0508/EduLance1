import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist'), {
  extensions: ['html'],
  index: 'index.html'
}));

// Fallback to index.html for any other request that doesn't match a file
app.get('*', (req, res) => {
  const urlPath = req.path;
  if (urlPath === '/') {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  } else if (!urlPath.includes('.')) {
    // Try to serve the .html file
    const htmlFile = path.join(__dirname, 'dist', `${urlPath}.html`);
    res.sendFile(htmlFile, (err) => {
      if (err) {
        // Fallback to index.html
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
      }
    });
  } else {
    // If it has an extension and wasn't served by express.static, it's a 404
    res.status(404).send('File not found');
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});

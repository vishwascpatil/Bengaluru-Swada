const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8321;
const IMAGE_PATH = path.join(__dirname, '..', 'src', 'assets', 'food-pin.png');

const server = http.createServer((req, res) => {
    if (req.url === '/') {
        // Serve HTML page with Canvas manipulation code
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Process Food Pin Image</title>
            </head>
            <body>
                <h2>Processing image...</h2>
                <canvas id="canvas" style="display:none;"></canvas>
                <div id="status">Loading image...</div>
                <script>
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.getElementById('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);
                        
                        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const data = imgData.data;
                        
                        // Replace white/off-white pixels with transparent ones
                        for (let i = 0; i < data.length; i += 4) {
                            const r = data[i];
                            const g = data[i+1];
                            const b = data[i+2];
                            
                            // Threshold for white background (very high R, G, B)
                            if (r > 240 && g > 240 && b > 240) {
                                data[i+3] = 0; // Set alpha to 0 (transparent)
                            }
                        }
                        
                        ctx.putImageData(imgData, 0, 0);
                        
                        // Send data back to server
                        const dataUrl = canvas.toDataURL('image/png');
                        fetch('/save', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ image: dataUrl })
                        })
                        .then(response => response.text())
                        .then(text => {
                            document.getElementById('status').innerText = 'Success: ' + text;
                            console.log('Success:', text);
                        })
                        .catch(err => {
                            document.getElementById('status').innerText = 'Error saving image: ' + err;
                            console.error('Error:', err);
                        });
                    };
                    img.onerror = function() {
                        document.getElementById('status').innerText = 'Error loading image.';
                    };
                    img.src = '/image';
                </script>
            </body>
            </html>
        `);
    } else if (req.url === '/image') {
        // Serve the source food-pin.png image
        fs.readFile(IMAGE_PATH, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Image not found');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'image/png' });
            res.end(data);
        });
    } else if (req.url === '/save' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                const base64Data = payload.image.replace(/^data:image\/png;base64,/, "");
                
                fs.writeFileSync(IMAGE_PATH, base64Data, 'base64');
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('Image saved successfully!');
                
                console.log('Image saved successfully. Shutting down server...');
                setTimeout(() => {
                    process.exit(0);
                }, 1000);
            } catch (err) {
                res.writeHead(500);
                res.end('Failed to save image: ' + err.message);
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});

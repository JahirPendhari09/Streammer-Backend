const express = require('express');
const fs = require('fs');
const path = require('path');

const VideoRouter = express.Router();

const cleanTitle = (rawName) => {
    return rawName
        .replace(/[-_]/g, " ")       
        .replace(/\s+/g, " ")        
        .trim()
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
};


// LIST OF VIDEOS
VideoRouter.get('/list', (req, res) => {
    const videoDir = path.join(__dirname, '../videos');
    const imageDir = path.join(__dirname, '../images');

    const imageFiles = fs.readdirSync(imageDir);

    fs.readdir(videoDir, (err, files) => {
        if (err) return res.status(500).json({ error: "Error reading videos" });

        const videoFiles = files.map((file, index) => {
            const nameWithoutExt = path.parse(file).name;

            // try to find a matching image for the video
            const poster = imageFiles.find(img =>
                img.startsWith(nameWithoutExt)
            );

            return {
                id: index + 1,
                name: cleanTitle(nameWithoutExt), 
                filename: file,                     
                url: `${req.protocol}://${req.get('host')}/videos/stream/${encodeURIComponent(file)}`,
                poster: poster
                    ? `${req.protocol}://${req.get('host')}/images/${poster}`
                    : null
            };
        });

        res.json(videoFiles);
    });

});


// STREAM A VIDEO
VideoRouter.get('/stream/:filename', (req, res) => {
    const filename = req.params.filename;
    const videoPath = path.join(__dirname, '../videos', filename);

    if (!fs.existsSync(videoPath)) {
        return res.status(404).send("Video not found.");
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;

    const range = req.headers.range;
    if (!range) {
        return res.writeHead(200, {
            "Content-Type": "video/mp4",
            "Content-Length": fileSize
        }).end(fs.readFileSync(videoPath));
    }

    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize) {
        return res.status(416).send(`Requested range not satisfiable\nFile size: ${fileSize}`);
    }

    const chunkSize = (end - start) + 1;
    const file = fs.createReadStream(videoPath, { start, end });

    res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": "video/mp4"
    });

    file.pipe(res);
});


module.exports = VideoRouter;

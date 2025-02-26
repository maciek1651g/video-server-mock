const express = require("express");
const cors = require("cors");
const path = require("path");
const stream = require("stream");

const app = express();
const PORT = process.env.PORT || 3000;

// Network simulation settings (can be changed via API)
const networkSettings = {
	delay: 0, // delay in ms
	packetLoss: 0, // probability of packet loss (0-1)
	chunkSize: 64 * 1024, // 64KB chunks
};

// Middleware for simulating network delay
const simulateDelay = (req, res, next) => {
	if (networkSettings.delay > 0) {
		setTimeout(next, networkSettings.delay);
	} else {
		next();
	}
};

// Middleware for simulating packet loss for video chunks
const simulatePacketLoss = (req, res, next) => {
	// Only apply to video files
	if (!req.path.match(/\.(mp4|webm)$/)) {
		return next();
	}

	const originalPipe = res.pipe;
	res.pipe = function (destination) {
		const transformStream = new stream.Transform({
			transform(chunk, encoding, callback) {
				if (Math.random() >= networkSettings.packetLoss) {
					// Packet goes through
					this.push(chunk);
				} else {
					console.log("Simulating packet loss");
					// Packet is "lost" - we don't push it
				}
				callback();
			},
		});

		return originalPipe.call(res, transformStream).pipe(destination);
	};

	next();
};

// API endpoints for controlling network simulation
app.get("/api/network", (req, res) => {
	res.json(networkSettings);
});

app.post("/api/network", express.json(), (req, res) => {
	const { delay, packetLoss } = req.body;

	if (typeof delay === "number" && delay >= 0) {
		networkSettings.delay = delay;
	}

	if (typeof packetLoss === "number" && packetLoss >= 0 && packetLoss <= 1) {
		networkSettings.packetLoss = packetLoss;
	}

	res.json(networkSettings);
});

// Disable CORS restrictions completely
app.use(
	cors({
		origin: "*",
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: "*",
		credentials: true,
	})
);

// Apply network simulation middleware
app.use(simulateDelay);
app.use(simulatePacketLoss);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "../public")));

// Video metadata
const videoContent = {
	id: 14,
	name: "(DASH) Big Bunny Dark Truth",
	requiresAuth: false,
	url: "/videos/bbb-dark-truths/dash.mpd",
	poster: "https://i.ytimg.com/vi/aqz-KE-bpKQ/hq720.jpg",
	widthResolution: [1252, 1002, 834, 626, 418],
	heightResolution: [720, 576, 480, 360, 240],
	audio: ["en"],
	manifest: "DASH",
	container: ["MP4", "WEBM"],
};

// API endpoint to get video metadata
app.get("/api/video", (req, res) => {
	res.json(videoContent);
});

// Serve the video player page
app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
	const url = `http://localhost:${PORT}`;
	console.log(`Server is running at ${url}`);
	console.log(`Open ${url} in your browser to view the video player`);
});

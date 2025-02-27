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
	bandwidth: 0, // bandwidth limit in bytes per second (0 means no limit)
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
	// Log every request that passes through this middleware
	console.log(`[PacketLoss] Processing request for: ${req.path}`);

	// Only apply to video files
	if (!req.path.match(/\.(mp4|webm|m4s|mpd)$/)) {
		console.log(`[PacketLoss] Skipping non-video file: ${req.path}`);
		return next();
	}

	console.log(
		`[PacketLoss] Current packet loss setting: ${networkSettings.packetLoss}`
	);

	// If packet loss is 100%, we should return an error response
	if (networkSettings.packetLoss >= 1) {
		console.log(
			`[PacketLoss] Blocking request to ${req.path} due to 100% packet loss`
		);
		return res
			.status(503)
			.send("Service unavailable due to simulated network failure");
	}

	// Store the original end method
	const originalEnd = res.end;
	const originalWrite = res.write;

	// Override the pipe method
	const originalPipe = res.pipe;
	res.pipe = function (destination) {
		console.log(`[PacketLoss] Pipe called for ${req.path}`);

		const transformStream = new stream.Transform({
			transform(chunk, encoding, callback) {
				const random = Math.random();
				console.log(
					`[PacketLoss] Processing chunk of size ${chunk.length} bytes`
				);

				if (random >= networkSettings.packetLoss) {
					// Packet goes through
					console.log(
						`[PacketLoss] Chunk passed through (random: ${random.toFixed(
							4
						)}, threshold: ${networkSettings.packetLoss})`
					);
					this.push(chunk);
				} else {
					console.log(
						`[PacketLoss] Simulating packet loss for ${
							req.path
						} (random: ${random.toFixed(4)}, threshold: ${
							networkSettings.packetLoss
						})`
					);
					// Packet is "lost" - we don't push it
				}
				callback();
			},
		});

		// Make sure we're properly handling errors
		transformStream.on("error", (err) => {
			console.error(
				`[PacketLoss] Error in transform stream: ${err.message}`
			);
		});

		return originalPipe.call(res, transformStream).pipe(destination);
	};

	// Also handle direct write operations for non-piped responses
	res.write = function (chunk, encoding, callback) {
		if (Math.random() >= networkSettings.packetLoss) {
			return originalWrite.apply(res, arguments);
		} else {
			console.log(
				`[PacketLoss] Dropping chunk in write() for ${req.path}`
			);
			// Simulate successful write but drop the data
			if (typeof callback === "function") callback();
			return true;
		}
	};

	next();
};

// Middleware for bandwidth throttling
const throttleBandwidth = (req, res, next) => {
	if (!req.path.match(/\.(mp4|webm)$/) || networkSettings.bandwidth <= 0) {
		return next();
	}

	const originalPipe = res.pipe;
	res.pipe = function (destination) {
		let lastChunkTime = Date.now();
		const throttleStream = new stream.Transform({
			transform(chunk, encoding, callback) {
				const now = Date.now();
				const timeSinceLastChunk = now - lastChunkTime;
				const desiredTime =
					(chunk.length / networkSettings.bandwidth) * 1000;
				const waitTime = Math.max(0, desiredTime - timeSinceLastChunk);

				setTimeout(() => {
					this.push(chunk);
					lastChunkTime = Date.now();
					callback();
				}, waitTime);
			},
		});

		return originalPipe.call(res, throttleStream).pipe(destination);
	};

	next();
};

// API endpoints for controlling network simulation
app.get("/api/network", (req, res) => {
	res.json(networkSettings);
});

app.post("/api/network", express.json(), (req, res) => {
	const { delay, packetLoss, bandwidth } = req.body;

	if (typeof delay === "number" && delay >= 0) {
		networkSettings.delay = delay;
	}

	if (typeof packetLoss === "number" && packetLoss >= 0 && packetLoss <= 1) {
		networkSettings.packetLoss = packetLoss;
	}

	if (typeof bandwidth === "number" && bandwidth >= 0) {
		networkSettings.bandwidth = bandwidth;
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
app.use(throttleBandwidth);

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

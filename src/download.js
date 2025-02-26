const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Get concurrent downloads limit from command line argument or environment variable
const CONCURRENT_DOWNLOADS =
	parseInt(process.argv[2]) ||
	parseInt(process.env.CONCURRENT_DOWNLOADS) ||
	3;

const BASE_URL =
	"https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths";
const PUBLIC_DIR = path.join(__dirname, "../public");
const VIDEOS_DIR = path.join(PUBLIC_DIR, "videos");
const OUTPUT_DIR = path.join(VIDEOS_DIR, "bbb-dark-truths");

const files = [
	// MP4 files
	"v-0144p-0100k-libx264.mp4",
	"v-0240p-0400k-libx264.mp4",
	"v-0360p-0750k-libx264.mp4",
	"v-0480p-1000k-libx264.mp4",
	"v-0576p-1400k-libx264.mp4",
	"v-0720p-2500k-libx264.mp4",
	"a-eng-0128k-aac-2c.mp4",
	// WEBM files
	"v-0144p-0100k-vp9.webm",
	"v-0240p-0300k-vp9.webm",
	"v-0360p-0550k-vp9.webm",
	"v-0480p-0750k-vp9.webm",
	"v-0576p-1000k-vp9.webm",
	"v-0720p-1800k-vp9.webm",
	"a-eng-0096k-libopus-2c.webm",
	// Manifest
	"dash.mpd",
];

async function ensureDirectoryExists(dir) {
	try {
		await fs.promises.mkdir(dir, { recursive: true });
	} catch (error) {
		if (error.code !== "EEXIST") {
			throw error;
		}
	}
}

async function downloadFile(filename) {
	const url = `${BASE_URL}/${filename}`;
	const outputPath = path.join(OUTPUT_DIR, filename);

	console.log(`Downloading ${filename}...`);

	try {
		const response = await axios({
			method: "get",
			url: url,
			responseType: "stream",
		});

		const writer = fs.createWriteStream(outputPath);
		response.data.pipe(writer);

		return new Promise((resolve, reject) => {
			writer.on("finish", () => {
				console.log(`Successfully downloaded ${filename}`);
				resolve();
			});
			writer.on("error", reject);
		});
	} catch (error) {
		console.error(`Error downloading ${filename}:`, error.message);
		throw error;
	}
}

async function downloadInBatches(files, batchSize) {
	const results = [];
	for (let i = 0; i < files.length; i += batchSize) {
		const batch = files.slice(i, i + batchSize);
		const batchPromises = batch.map((file) => downloadFile(file));

		try {
			await Promise.all(batchPromises);
			results.push(...batch);
			console.log(
				`Batch completed (${results.length}/${files.length} files)`
			);
		} catch (error) {
			console.error(`Error in batch starting at index ${i}:`, error);
			throw error;
		}
	}
	return results;
}

async function main() {
	try {
		console.log(
			`Starting download with ${CONCURRENT_DOWNLOADS} concurrent downloads...`
		);

		// Create all necessary directories
		console.log("Creating directories...");
		await ensureDirectoryExists(PUBLIC_DIR);
		await ensureDirectoryExists(VIDEOS_DIR);
		await ensureDirectoryExists(OUTPUT_DIR);
		console.log("Directories created successfully!");

		// Download all files in batches
		await downloadInBatches(files, CONCURRENT_DOWNLOADS);

		console.log("All files downloaded successfully!");
	} catch (error) {
		console.error("Download failed:", error);
		process.exit(1);
	}
}

main();

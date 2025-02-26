# Video Streaming Server

A simple video streaming server using Node.js and Shaka Player for DASH video playback.

## Features

-   DASH video streaming support
-   Responsive video player
-   Cross-browser compatibility
-   Adaptive bitrate streaming

## Prerequisites

-   Node.js (v14 or higher)
-   npm (Node Package Manager)

## Installation

1. Clone the repository:

```bash
git clone [repository-url]
cd video-server
```

2. Install dependencies:

```bash
npm install
```

## Usage

1. Start the server:

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

2. Open your browser and navigate to:

```
http://localhost:3000
```

## Technical Details

-   The server runs on port 3000 by default
-   Video content is served via DASH manifest
-   Uses Shaka Player v4.3.8 for video playback
-   CORS is enabled for all routes

## Example Content

The server comes pre-configured with a demo video:

-   "Big Bunny Dark Truth" (DASH)
-   Multiple resolution options
-   English audio track
-   MP4 and WEBM container support

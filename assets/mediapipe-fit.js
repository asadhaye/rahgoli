/**
 * Rahgoli MediaPipe Fit Finder Logic
 * Uses MediaPipe Pose to estimate body dimensions.
 */

import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0';

let poseLandmarker = undefined;
let runningMode = 'VIDEO';
let webcamRunning = false;
const video = document.getElementById('webcam');
const canvasElement = document.getElementById('canvas-overlay');
const canvasCtx = canvasElement.getContext('2d');
const startBtn = document.getElementById('start-btn');
const scanBtn = document.getElementById('scan-btn');
const resultDisplay = document.getElementById('fit-result');
const loadingOverlay = document.getElementById('loading');

/**
 * Initialize Pose Landmarker
 */
const createPoseLandmarker = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm',
  );
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
      delegate: 'GPU',
    },
    runningMode: runningMode,
    numPoses: 1,
  });
  loadingOverlay.style.display = 'none';
};
createPoseLandmarker();

/**
 * Enable Webcam
 */
startBtn.addEventListener('click', () => {
  if (!poseLandmarker) return;

  if (webcamRunning === true) {
    webcamRunning = false;
    startBtn.innerText = 'Start Camera';
    const stream = video.srcObject;
    const tracks = stream.getTracks();
    tracks.forEach((track) => track.stop());
    video.srcObject = null;
    scanBtn.disabled = true;
  } else {
    webcamRunning = true;
    startBtn.innerText = 'Stop Camera';

    const constraints = { video: true };
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      video.srcObject = stream;
      video.addEventListener('loadeddata', predictWebcam);
      scanBtn.disabled = false;
      scanBtn.style.opacity = '1';
    });
  }
});

let lastVideoTime = -1;
async function predictWebcam() {
  canvasElement.style.height = video.videoHeight;
  canvasElement.style.width = video.videoWidth;
  canvasElement.width = video.videoWidth;
  canvasElement.height = video.videoHeight;

  if (runningMode === 'IMAGE') {
    runningMode = 'VIDEO';
    await poseLandmarker.setOptions({ runningMode: 'VIDEO' });
  }

  let startTimeMs = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    poseLandmarker.detectForVideo(video, startTimeMs, (result) => {
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      const drawingUtils = new DrawingUtils(canvasCtx);

      for (const landmark of result.landmarks) {
        drawingUtils.drawLandmarks(landmark, {
          radius: (data) => DrawingUtils.lerp(data.from.z, -0.15, 0.1, 5, 1),
        });
        drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);

        // Example: Track shoulders for scan
        window.currentLandmarks = landmark;
      }
    });
  }

  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}

/**
 * Perform Build Scan
 */
scanBtn.addEventListener('click', () => {
  if (!window.currentLandmarks) {
    resultDisplay.innerText = 'Error: Please stand in full view.';
    return;
  }

  const landmarks = window.currentLandmarks;
  // Key points: left_shoulder (11), right_shoulder (12)
  const leftS = landmarks[11];
  const rightS = landmarks[12];

  // Calculate relative shoulder width
  const shoulderWidth = Math.abs(leftS.x - rightS.x);

  // Heuristic Logic (This would be tuned with actual data)
  let recommendation = 'Analyzing...';
  if (shoulderWidth < 0.15) recommendation = 'Size Suggestion: Small (Petite)';
  else if (shoulderWidth < 0.22) recommendation = 'Size Suggestion: Medium (Standard)';
  else if (shoulderWidth < 0.28) recommendation = 'Size Suggestion: Large (Classic)';
  else recommendation = 'Size Suggestion: XL (Generous)';

  resultDisplay.innerText = recommendation;
  resultDisplay.style.color = 'var(--color-secondary)';
});

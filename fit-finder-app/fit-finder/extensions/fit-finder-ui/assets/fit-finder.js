/**
 * Rahgoli MediaPipe Fit Finder Logic (App Extension Version)
 * Uses MediaPipe Pose to estimate body dimensions.
 */

import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0';

class FitFinder {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.poseLandmarker = undefined;
    this.runningMode = 'VIDEO';
    this.webcamRunning = false;
    this.video = this.container.querySelector('#webcam');
    this.canvasElement = this.container.querySelector('#canvas-overlay');
    this.canvasCtx = this.canvasElement.getContext('2d');
    this.startBtn = this.container.querySelector('#start-btn');
    this.scanBtn = this.container.querySelector('#scan-btn');
    this.resultDisplay = this.container.querySelector('#fit-result');
    this.loadingOverlay = this.container.querySelector('#loading');
    this.currentLandmarks = null;

    this.init();
  }

  async init() {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm',
    );
    this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
        delegate: 'GPU',
      },
      runningMode: this.runningMode,
      numPoses: 1,
    });
    this.loadingOverlay.style.display = 'none';
    this.bindEvents();
  }

  bindEvents() {
    this.startBtn.addEventListener('click', () => this.toggleWebcam());
    this.scanBtn.addEventListener('click', () => this.performScan());
  }

  toggleWebcam() {
    if (!this.poseLandmarker) return;

    if (this.webcamRunning === true) {
      this.webcamRunning = false;
      this.startBtn.innerText = 'Start Camera';
      const stream = this.video.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      this.video.srcObject = null;
      this.scanBtn.disabled = true;
    } else {
      this.webcamRunning = true;
      this.startBtn.innerText = 'Stop Camera';

      const constraints = { video: true };
      navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        this.video.srcObject = stream;
        this.video.addEventListener('loadeddata', () => this.predictWebcam());
        this.scanBtn.disabled = false;
      });
    }
  }

  async predictWebcam() {
    this.canvasElement.style.height = this.video.videoHeight;
    this.canvasElement.style.width = this.video.videoWidth;
    this.canvasElement.width = this.video.videoWidth;
    this.canvasElement.height = this.video.videoHeight;

    let lastVideoTime = -1;
    const predict = async () => {
      if (this.webcamRunning && this.video.currentTime !== lastVideoTime) {
        lastVideoTime = this.video.currentTime;
        this.poseLandmarker.detectForVideo(this.video, performance.now(), (result) => {
          this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
          const drawingUtils = new DrawingUtils(this.canvasCtx);

          for (const landmark of result.landmarks) {
            drawingUtils.drawLandmarks(landmark, {
              radius: (data) => DrawingUtils.lerp(data.from.z, -0.15, 0.1, 5, 1),
              color: '#6B0D0D',
            });
            drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS, {
              color: '#6B0D0D',
            });
            this.currentLandmarks = landmark;
          }
        });
      }
      if (this.webcamRunning) {
        window.requestAnimationFrame(predict);
      }
    };
    predict();
  }

  performScan() {
    if (!this.currentLandmarks) {
      this.resultDisplay.innerText = 'Error: Please stand in full view.';
      return;
    }

    const landmarks = this.currentLandmarks;
    const leftS = landmarks[11];
    const rightS = landmarks[12];
    const shoulderWidth = Math.abs(leftS.x - rightS.x);

    let recommendation = 'Analyzing...';
    if (shoulderWidth < 0.15) recommendation = 'Size Suggestion: Small (Petite)';
    else if (shoulderWidth < 0.22) recommendation = 'Size Suggestion: Medium (Standard)';
    else if (shoulderWidth < 0.28) recommendation = 'Size Suggestion: Large (Classic)';
    else recommendation = 'Size Suggestion: XL (Generous)';

    this.resultDisplay.innerText = recommendation;
    this.resultDisplay.style.color = '#6B0D0D';
  }
}

// Initialize for all blocks on the page
document.querySelectorAll('.fit-finder-wrapper').forEach((container) => {
  new FitFinder(container.id);
});

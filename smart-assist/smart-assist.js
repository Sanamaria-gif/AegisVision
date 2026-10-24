"use strict";

(() => {
  const uploadInput = document.getElementById("videoUpload");
  const sourceVideo = document.getElementById("sourceVideo");
  const overlayCanvas = document.getElementById("overlayCanvas");
  const videoStage = document.getElementById("videoStage");
  const fileName = document.getElementById("fileName");

  const assistMode = document.getElementById("assistMode");
  const visionProfile = document.getElementById("visionProfile");
  const showBoxes = document.getElementById("showBoxes");

  const detectButton = document.getElementById("detectButton");
  const stopButton = document.getElementById("stopButton");
  const downloadVideoButton = document.getElementById("downloadVideoButton");
  const modelStatus = document.getElementById("modelStatus");
  const message = document.getElementById("message");

  const detectionCount = document.getElementById("detectionCount");
  const detectionList = document.getElementById("detectionList");

  const ctx = overlayCanvas.getContext("2d");

  let detector = null;
  let detectorLoading = false;
  let detectionActive = false;
  let detectionBusy = false;
  let animationFrameId = null;
  let lastDetectionTime = 0;
  let latestPredictions = [];
  let currentVideoUrl = null;
  let videoGeneration = 0;

  // Avoid overloading a laptop or browser with excessive inference.
  const DETECTION_INTERVAL_MS = 450;
  const MIN_CONFIDENCE = 0.45;
  const MAX_DETECTIONS = 15;

  function setMessage(text) {
    message.textContent = text;
  }

  function setModelStatus(text, statusClass = "") {
    modelStatus.textContent = text;
    modelStatus.className = "status";

    if (statusClass) {
      modelStatus.classList.add(statusClass);
    }
  }

function updateButtons() {
  detectButton.disabled =
    !sourceVideo.src ||
    !sourceVideo.videoWidth ||
    detectionActive;

  stopButton.disabled = !detectionActive;

  if (!sourceVideo.src || !sourceVideo.videoWidth || isExporting) {
    downloadVideoButton.disabled = true;
  } else {
    downloadVideoButton.disabled = false;
  }
}

  async function loadDetector() {
    if (detector) return detector;
    if (detectorLoading) return null;

    if (!window.tf || !window.cocoSsd) {
      setModelStatus("Libraries unavailable", "error");
      setMessage(
        "The detection libraries could not load. Check your internet connection and reload this page."
      );
      return null;
    }

    detectorLoading = true;
    setModelStatus("Loading model…");
    setMessage("Loading the object-detection model. This may take a moment.");

    try {
      await window.tf.ready();

      // The COCO-SSD model identifies common objects in video frames.
      detector = await window.cocoSsd.load({
        base: "lite_mobilenet_v2"
      });

      setModelStatus("Detector ready", "ready");
      setMessage(
        "Model ready. Upload a video and select Start object detection."
      );

      updateButtons();
      return detector;
    } catch (error) {
      console.error("Could not load the object detector:", error);
      setModelStatus("Model failed", "error");
      setMessage(
        "The object detector failed to load. Check your connection and browser console, then reload the page."
      );
      return null;
    } finally {
      detectorLoading = false;
    }
  }

  function clearOverlay() {
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  }

  function resizeOverlay() {
    if (!sourceVideo.videoWidth || !sourceVideo.videoHeight) return;

    // Canvas coordinates match the original video-frame coordinates.
    overlayCanvas.width = sourceVideo.videoWidth;
    overlayCanvas.height = sourceVideo.videoHeight;

    drawOverlay();
  }

  function getModeAllowedClasses() {
    const mode = assistMode.value;

    if (mode === "vegetable") {
      return new Set([
        "broccoli",
        "carrot",
        "banana",
        "apple",
        "orange",
        "sandwich"
      ]);
    }

    if (mode === "traffic") {
      return new Set([
        "person",
        "bicycle",
        "car",
        "motorcycle",
        "bus",
        "train",
        "truck",
        "traffic light",
        "stop sign"
      ]);
    }

    return null;
  }

  function getFilteredPredictions() {
    const allowedClasses = getModeAllowedClasses();

    return latestPredictions
      .filter((prediction) => prediction.score >= MIN_CONFIDENCE)
      .filter((prediction) => {
        return !allowedClasses || allowedClasses.has(prediction.class);
      })
      .slice(0, MAX_DETECTIONS);
  }

function drawOverlay() {
  clearOverlay();

  // Always update the detection list independently of box visibility.
  const predictions = getFilteredPredictions();
  renderDetectionList(predictions);

  if (!showBoxes.checked || !overlayCanvas.width) {
    return;
  }

  const canvasWidth = overlayCanvas.width;
  const canvasHeight = overlayCanvas.height;

  ctx.lineWidth = Math.max(2, canvasWidth / 400);
  ctx.font = `bold ${Math.max(14, canvasWidth / 48)}px sans-serif`;
  ctx.textBaseline = "top";

  predictions.forEach((prediction) => {
    const [x, y, width, height] = prediction.bbox;
    const safeX = Math.max(0, Math.min(x, canvasWidth));
    const safeY = Math.max(0, Math.min(y, canvasHeight));
    const safeWidth = Math.max(0, Math.min(width, canvasWidth - safeX));
    const safeHeight = Math.max(0, Math.min(height, canvasHeight - safeY));

    ctx.strokeStyle = "#00E5A8";
    ctx.fillStyle = "#063B2D";
    ctx.strokeRect(safeX, safeY, safeWidth, safeHeight);

    const label = `${prediction.class} ${Math.round(prediction.score * 100)}%`;
    const labelWidth = ctx.measureText(label).width + 12;
    const labelHeight = Math.max(24, canvasWidth / 35);
    const labelY = Math.max(0, safeY - labelHeight);

    ctx.fillRect(
      safeX,
      labelY,
      Math.min(labelWidth, canvasWidth - safeX),
      labelHeight
    );

    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(label, safeX + 6, labelY + 4);
  });
}

  function renderDetectionList(predictions) {
    detectionCount.textContent = String(predictions.length);
    detectionList.replaceChildren();

    if (!predictions.length) {
      const empty = document.createElement("li");
      empty.className = "empty-result";

      if (!showBoxes.checked) {
        empty.textContent = "Object labels are hidden.";
      } else if (latestPredictions.length) {
        empty.textContent =
          "No objects matched this mode's filters with sufficient confidence.";
      } else {
        empty.textContent = "No objects detected yet.";
      }

      detectionList.appendChild(empty);
      return;
    }

    predictions.forEach((prediction) => {
      const item = document.createElement("li");
      item.className = "detection-item";

      const name = document.createElement("span");
      name.className = "detection-name";
      name.textContent = prediction.class;

      const confidence = document.createElement("span");
      confidence.className = "detection-confidence";
      confidence.textContent = `${Math.round(prediction.score * 100)}%`;

      item.append(name, confidence);
      detectionList.appendChild(item);
    });
  }

  async function detectionLoop(timestamp) {
    if (!detectionActive) return;

    animationFrameId = requestAnimationFrame(detectionLoop);

    if (
      sourceVideo.paused ||
      sourceVideo.ended ||
      !sourceVideo.videoWidth ||
      !sourceVideo.videoHeight
    ) {
      drawOverlay();
      return;
    }

    if (
      detectionBusy ||
      timestamp - lastDetectionTime < DETECTION_INTERVAL_MS
    ) {
      drawOverlay();
      return;
    }

    detectionBusy = true;
    lastDetectionTime = timestamp;

    const generationAtStart = videoGeneration;

    try {
      const predictions = await detector.detect(sourceVideo);

      // Ignore results from a previous video if the user changed files.
      if (generationAtStart !== videoGeneration) return;

      latestPredictions = predictions;
      drawOverlay();
} catch (error) {
  console.error("Frame detection failed:", error);
  setMessage("Detection error: " + (error.message || String(error)));
  setModelStatus("Detection error", "error");
}
      finally {
      detectionBusy = false;
    }
  }

async function startDetection() {
  if (!sourceVideo.src || !sourceVideo.videoWidth) {
    setMessage("Please upload a video and wait for it to load.");
    return;
  }

  // Load the detector if it has not loaded yet.
  if (!detector) {
    setMessage("Loading the object detection model...");
    const loadedDetector = await loadDetector();

    if (!loadedDetector) {
      setMessage(
        "Model unavailable. Check your internet connection and reload the page."
      );
      return;
    }
  }

  stopDetection();

  detectionActive = true;
  detectionBusy = false;
  lastDetectionTime = 0;
  latestPredictions = [];

  updateButtons();
  setMessage("Starting detection...");

  // Start the detection loop.
  animationFrameId = requestAnimationFrame(detectionLoop);

  // Start video playback automatically.
  try {
    await sourceVideo.play();
    setMessage("Detecting objects in the video...");
  } catch (error) {
    console.error("Video playback failed:", error);
    setMessage(
      "Detection is ready, but playback was blocked. Press Play on the video."
    );
  }
}

  function stopDetection() {
    detectionActive = false;

    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    updateButtons();
  }

  function applyVisionProfile() {
    sourceVideo.classList.remove(
      "profile-protanopia",
      "profile-deuteranopia",
      "profile-tritanopia"
    );

    const profile = visionProfile.value;

    if (profile !== "normal") {
      sourceVideo.classList.add(`profile-${profile}`);
    }
  }

  function handleModeChange() {
    drawOverlay();

    const mode = assistMode.value;

    if (mode === "vegetable") {
      setMessage(
        "Vegetable Assist filters for a small set of recognizable object classes. It cannot assess freshness, ripeness, or food safety."
      );
    } else if (mode === "traffic") {
      setMessage(
        "Traffic mode highlights selected road-related objects. It does not interpret signal state or determine whether crossing is safe."
      );
    } else {
      setMessage(
        "General Smart Assist displays the common objects recognized in the current video."
      );
    }
  }

  uploadInput.addEventListener("change", () => {
    const file = uploadInput.files && uploadInput.files[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setMessage("Please select a video file.");
      uploadInput.value = "";
      return;
    }

    stopDetection();
    videoGeneration += 1;
    latestPredictions = [];
    clearOverlay();
    renderDetectionList([]);

    if (currentVideoUrl) {
      URL.revokeObjectURL(currentVideoUrl);
    }

    currentVideoUrl = URL.createObjectURL(file);
    sourceVideo.src = currentVideoUrl;
    downloadVideoButton.disabled=true;
    sourceVideo.load();

    fileName.textContent = file.name;
    videoStage.hidden = false;

    setMessage("Video selected. Waiting for the video to load…");
    updateButtons();
  });

  sourceVideo.addEventListener("loadedmetadata", () => {
    resizeOverlay();
    applyVisionProfile();
    updateButtons();
    downloadVideoButton.disabled=false;

    setMessage(
      "Video ready. Start detection, then press Play to analyze frames."
    );
  });

  sourceVideo.addEventListener("play", () => {
    if (detectionActive && animationFrameId === null) {
      animationFrameId = requestAnimationFrame(detectionLoop);
    }
  });

  sourceVideo.addEventListener("pause", () => {
    drawOverlay();
  });

  sourceVideo.addEventListener("seeked", () => {
    drawOverlay();
  });

  sourceVideo.addEventListener("ended", () => {
    drawOverlay();
    setMessage("Video ended. Replay it to inspect the detections again.");
  });

  detectButton.addEventListener("click", startDetection);

  stopButton.addEventListener("click", () => {
    stopDetection();
    setMessage("Detection stopped. You can restart it at any time.");
  });

  assistMode.addEventListener("change", handleModeChange);

  visionProfile.addEventListener("change", applyVisionProfile);

  showBoxes.addEventListener("change", drawOverlay);

  window.addEventListener("resize", resizeOverlay);

  window.addEventListener("beforeunload", () => {
    stopDetection();

    if (currentVideoUrl) {
      URL.revokeObjectURL(currentVideoUrl);
    }
  });

  // Start loading the model immediately.
  loadDetector();
  // ---------- Improved video export and download ----------

let exportCanvas = document.createElement("canvas");
let exportCtx = exportCanvas.getContext("2d");
let exportAnimationId = null;
let exportRecorder = null;
let exportChunks = [];
let exportStream = null;
let exportAudioStream = null;
let isExporting = false;

function getExportFilter() {
  switch (visionProfile.value) {
    case "protanopia":
      return "sepia(0.18) hue-rotate(325deg) saturate(0.9)";
    case "deuteranopia":
      return "sepia(0.14) hue-rotate(300deg) saturate(0.92)";
    case "tritanopia":
      return "sepia(0.12) hue-rotate(35deg) saturate(0.92)";
    default:
      return "none";
  }
}

function drawExportFrame() {
  if (!isExporting || !sourceVideo.videoWidth) return;

  exportCtx.clearRect(
    0, 0, exportCanvas.width, exportCanvas.height
  );

  // Include the selected illustrative color filter in the exported frames.
  exportCtx.save();
  exportCtx.filter = getExportFilter();
  exportCtx.drawImage(
    sourceVideo, 0, 0, exportCanvas.width, exportCanvas.height
  );
  exportCtx.restore();

  // Include labels and bounding boxes if enabled.
  if (showBoxes.checked && overlayCanvas.width && overlayCanvas.height) {
    exportCtx.drawImage(
      overlayCanvas, 0, 0, exportCanvas.width, exportCanvas.height
    );
  }

  exportAnimationId = requestAnimationFrame(drawExportFrame);
}

function getSupportedVideoMimeType() {
  if (!window.MediaRecorder) return "";

  const types = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm"
  ];

  return types.find(type => MediaRecorder.isTypeSupported(type)) || "";
}

function finishVideoExport() {
  isExporting = false;

  if (exportAnimationId !== null) {
    cancelAnimationFrame(exportAnimationId);
    exportAnimationId = null;
  }

  downloadVideoButton.disabled = false;
  downloadVideoButton.textContent = "Download Improved Video";
}

function downloadRecordedVideo() {
  const blob = new Blob(exportChunks, {
    type: exportRecorder?.mimeType || "video/webm"
  });

  if (!blob.size) {
    setMessage("The export was empty. Please try recording again.");
    finishVideoExport();
    return;
  }

  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = "chromaassist-improved-video.webm";
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Keep the URL alive briefly so the browser can begin the download.
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 60000);

  setMessage("Your improved video is ready and the download has started.");
  finishVideoExport();
}

async function exportImprovedVideo() {
  if (isExporting) return;

  if (!sourceVideo.src || !sourceVideo.videoWidth) {
    setMessage("Please upload a video and wait for it to load first.");
    return;
  }

  if (!window.MediaRecorder || !exportCanvas.captureStream) {
    setMessage(
      "Video export is not supported by this browser. Try a recent version of Chrome or Edge."
    );
    return;
  }

  const mimeType = getSupportedVideoMimeType();

  if (!mimeType) {
    setMessage(
      "This browser does not support a compatible WebM recording format."
    );
    return;
  }

  try {
    // Set the export dimensions to the source video's native resolution.
    exportCanvas.width = sourceVideo.videoWidth;
    exportCanvas.height = sourceVideo.videoHeight;

    // Make sure a detection loop is running so labels update during export.
    if (detector && !detectionActive) {
      startDetection();
    }

    // Capture the video audio when the browser supports captureStream().
    exportAudioStream = null;
    const captureSource =
      sourceVideo.captureStream || sourceVideo.mozCaptureStream;

    if (captureSource) {
      try {
        exportAudioStream = captureSource.call(sourceVideo);
      } catch (audioError) {
        console.warn("Audio capture is unavailable:", audioError);
      }
    }

    // Record the combined processed canvas and available audio tracks.
    exportStream = exportCanvas.captureStream(24);

    if (exportAudioStream) {
      exportAudioStream.getAudioTracks().forEach(track => {
        exportStream.addTrack(track);
      });
    }

    exportChunks = [];
    exportRecorder = new MediaRecorder(exportStream, { mimeType });
    isExporting = true;

    downloadVideoButton.disabled = true;
    downloadVideoButton.textContent = "Preparing video…";

    exportRecorder.addEventListener("dataavailable", event => {
      if (event.data && event.data.size > 0) {
        exportChunks.push(event.data);
      }
    });

    exportRecorder.addEventListener("error", event => {
      console.error("Video export failed:", event);
      setMessage("Video export failed. Please try a shorter video.");
      finishVideoExport();
    });

    exportRecorder.addEventListener("stop", () => {
      downloadRecordedVideo();

      if (exportStream) {
        exportStream.getTracks().forEach(track => track.stop());
        exportStream = null;
      }

      // Do not stop tracks on the source video itself.
      exportAudioStream = null;
    });

    exportRecorder.start(1000);

    // Export from the beginning, in real time.
    sourceVideo.currentTime = 0;
    await sourceVideo.play();

    drawExportFrame();

    sourceVideo.addEventListener("ended", handleExportVideoEnded, {
      once: true
    });

    setMessage(
      "Recording the improved video in real time. Keep this page open until the download begins."
    );
    downloadVideoButton.textContent = "Recording video…";
  } catch (error) {
    console.error("Could not export video:", error);

    if (exportRecorder && exportRecorder.state !== "inactive") {
      exportRecorder.stop();
    } else {
      finishVideoExport();
    }

    setMessage(
      "Could not start the export. Try pressing Play first, then try again."
    );
  }
}

function handleExportVideoEnded() {
  if (exportRecorder && exportRecorder.state !== "inactive") {
    exportRecorder.stop();
  }
}

downloadVideoButton.addEventListener("click", exportImprovedVideo);
})();
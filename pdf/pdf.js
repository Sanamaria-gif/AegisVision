
const pdfInput = document.getElementById("pdfInput");
const uploadZone = document.getElementById("uploadZone");
const fileDetails = document.getElementById("fileDetails");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");
const processBtn = document.getElementById("processBtn");
const processHint = document.getElementById("processHint");
const errorMessage = document.getElementById("errorMessage");

let selectedProfile = "Protanopia";
let selectedFile = null;

// Select a colour profile.
document.querySelectorAll("[data-profile]").forEach((card) => {
  card.addEventListener("click", () => {
    document.querySelectorAll("[data-profile]").forEach((item) => {
      item.classList.remove("active");
    });

    card.classList.add("active");
    selectedProfile = card.dataset.profile;
  });
});

// Display a selected PDF.
function showFile(file) {
  errorMessage.classList.add("hidden");

  if (!file) return;

  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    selectedFile = null;
    pdfInput.value = "";
    fileDetails.classList.add("hidden");
    fileDetails.classList.remove("flex");
    processBtn.disabled = true;
    processHint.textContent = "Please select a PDF file.";
    errorMessage.textContent = "Please choose a PDF document.";
    errorMessage.classList.remove("hidden");
    return;
  }

  selectedFile = file;
  fileName.textContent = file.name;
  fileSize.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

  fileDetails.classList.remove("hidden");
  fileDetails.classList.add("flex");
  processBtn.disabled = false;
  processHint.textContent = "Your PDF is ready to process.";
}

pdfInput.addEventListener("change", () => {
  showFile(pdfInput.files[0]);
});

// Drag-and-drop upload.
["dragenter", "dragover"].forEach((eventName) => {
  uploadZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    uploadZone.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  uploadZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    uploadZone.classList.remove("dragging");
  });
});

uploadZone.addEventListener("drop", (event) => {
  const file = event.dataTransfer.files[0];
  if (!file) return;

  // Assign the dropped file to the file input.
  const transfer = new DataTransfer();
  transfer.items.add(file);
  pdfInput.files = transfer.files;
  showFile(file);
});

// Remove the selected PDF.
document.getElementById("removeFile").addEventListener("click", () => {
  selectedFile = null;
  pdfInput.value = "";
  fileDetails.classList.add("hidden");
  fileDetails.classList.remove("flex");
  processBtn.disabled = true;
  processHint.textContent = "Upload a PDF above to enable processing.";
  errorMessage.classList.add("hidden");
});

// Update the DPI label.
const dpiInput = document.getElementById("dpiInput");
const dpiValue = document.getElementById("dpiValue");

function updateDpiLabel() {
  dpiValue.textContent = `${dpiInput.value} DPI`;
}

dpiInput.addEventListener("input", updateDpiLabel);

// Update the severity label.
const severityInput = document.getElementById("severityInput");
const severityValue = document.getElementById("severityValue");

severityInput.addEventListener("input", () => {
  severityValue.textContent = `${severityInput.value}%`;
});

// Processing is connected in the next step.

processBtn.addEventListener("click", async () => {
  if (!selectedFile) return;

  errorMessage.classList.add("hidden");

  // Get the selected settings.
  const settings = window.chromaAssistPdfSettings();

  // Prepare the PDF and settings for the backend.
  const formData = new FormData();
  formData.append("file", selectedFile);
  formData.append("profile", settings.profile.toLowerCase());
  formData.append("dpi", settings.dpi);
  formData.append("max_pages", settings.maxPages);
  formData.append("severity", settings.severity);

  // Prevent duplicate submissions while processing.
  processBtn.disabled = true;
  processBtn.textContent = "Processing PDF...";
  processHint.textContent = "Please wait while your PDF is processed.";

  try {
    const response = await fetch(
      "http://127.0.0.1:8000/process-pdf",
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || "Unable to process the PDF."
      );
    }

    // Receive the processed PDF.
    const pdfBlob = await response.blob();
    const downloadUrl = URL.createObjectURL(pdfBlob);

    // Download the result.
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "chromaassist-result.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();

    // Release the temporary download URL.
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

    processHint.textContent = "PDF processed successfully!";
  } catch (error) {
    errorMessage.textContent = error.message;
    errorMessage.classList.remove("hidden");
    processHint.textContent = "Processing failed. Please try again.";
  } finally {
    processBtn.disabled = !selectedFile;
    processBtn.textContent = "Process PDF";
  }
});


// Keep these settings accessible for the backend integration step.
window.chromaAssistPdfSettings = () => ({
  profile: selectedProfile,
  dpi: Number(dpiInput.value),
  maxPages: Number(document.getElementById("pagesInput").value),
  severity: Number(severityInput.value),
});

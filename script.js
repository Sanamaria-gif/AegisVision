javascript
const imageInput = document.getElementById("imageInput");

const uploadSection = document.getElementById("uploadSection");
const editorSection = document.getElementById("editorSection");

const originalCanvas = document.getElementById("originalCanvas");
const resultCanvas = document.getElementById("resultCanvas");

const originalCtx = originalCanvas.getContext("2d");
const resultCtx = resultCanvas.getContext("2d");

const strengthSlider = document.getElementById("strengthSlider");
const strengthValue = document.getElementById("strengthValue");

const downloadBtn = document.getElementById("downloadBtn");
const resetBtn = document.getElementById("resetBtn");

const profileButtons = document.querySelectorAll(".profile-btn");

let selectedProfile = "deuteranopia";
let originalImage = null;


// ================================
// IMAGE UPLOAD
// ================================

imageInput.addEventListener("change", function () {

    const file = imageInput.files[0];

    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.onload = function (event) {

        const image = new Image();

        image.onload = function () {

            originalImage = image;

            originalCanvas.width = image.width;
            originalCanvas.height = image.height;

            resultCanvas.width = image.width;
            resultCanvas.height = image.height;

            originalCtx.drawImage(
                image,
                0,
                0
            );

            resultCtx.drawImage(
                image,
                0,
                0
            );

            uploadSection.classList.add("hidden");
            editorSection.classList.remove("hidden");

            applyTransformation();
        };

        image.src = event.target.result;
    };

    reader.readAsDataURL(file);
});


// ================================
// PROFILE SELECTION
// ================================

profileButtons.forEach(button => {

    button.addEventListener("click", function () {

        profileButtons.forEach(btn => {
            btn.classList.remove(
                "border-violet-500",
                "bg-violet-500/10"
            );
        });

        button.classList.add(
            "border-violet-500",
            "bg-violet-500/10"
        );

        selectedProfile = button.dataset.profile;

        applyTransformation();
    });

});


// ================================
// STRENGTH SLIDER
// ================================

strengthSlider.addEventListener("input", function () {

    const strength = strengthSlider.value;

    strengthValue.textContent = `${strength}%`;

    applyTransformation();
});


// ================================
// TRANSFORMATION
// ================================

function applyTransformation() {

    if (!originalImage) {
        return;
    }

    /*
        Transformation will be implemented here.

        For now, simply copy the original image.
    */

    resultCtx.drawImage(
        originalImage,
        0,
        0
    );
}


// ================================
// DOWNLOAD
// ================================

downloadBtn.addEventListener("click", function () {

    const link = document.createElement("a");

    link.download = "chromaassist-result.png";

    link.href = resultCanvas.toDataURL("image/png");

    link.click();
});


// ================================
// RESET
// ================================

resetBtn.addEventListener("click", function () {

    originalImage = null;

    imageInput.value = "";

    originalCtx.clearRect(
        0,
        0,
        originalCanvas.width,
        originalCanvas.height
    );

    resultCtx.clearRect(
        0,
        0,
        resultCanvas.width,
        resultCanvas.height
    );

    editorSection.classList.add("hidden");
    uploadSection.classList.remove("hidden");

    strengthSlider.value = 50;
    strengthValue.textContent = "50%";

    profileButtons.forEach(button => {
        button.classList.remove(
            "border-violet-500",
            "bg-violet-500/10"
        );
    });
});
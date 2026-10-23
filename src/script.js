
console.log("ChromaAssist loaded");

// ============================================
// 1. EXISTING HTML ELEMENTS — NO HTML CHANGES
// ============================================

const imageInput = document.getElementById("imageInput");
const uploadSection = document.getElementById("uploadSection");
const editorSection = document.getElementById("editorSection");

const originalCanvas = document.getElementById("originalCanvas");
const simulationCanvas = document.getElementById("simulationCanvas");
const resultCanvas = document.getElementById("resultCanvas");

const originalCtx = originalCanvas.getContext("2d", {
    willReadFrequently: true
});
const simulationCtx = simulationCanvas.getContext("2d");
const resultCtx = resultCanvas.getContext("2d");

const strengthSlider = document.getElementById("strengthSlider");
const strengthValue = document.getElementById("strengthValue");
const downloadBtn = document.getElementById("downloadBtn");
const resetBtn = document.getElementById("resetBtn");

const profileButtons = document.querySelectorAll(".profile-btn");

let selectedProfile = "deuteranopia";
let originalImage = null;

// ============================================
// 2. BRETTEL 1997 SIMULATION PARAMETERS
// Adapted for modern sRGB displays.
// ============================================

const brettel = {
    protanopia: {
        plane1: [
            0.14980, 1.19548, -0.34528,
            0.10764, 0.84864, 0.04372,
            0.00384, -0.00540, 1.00156
        ],
        plane2: [
            0.14570, 1.16172, -0.30742,
            0.10816, 0.85291, 0.03892,
            0.00386, -0.00524, 1.00139
        ],
        normal: [0.00048, 0.00393, -0.00441]
    },

    deuteranopia: {
        plane1: [
            0.36477, 0.86381, -0.22858,
            0.26294, 0.64245, 0.09462,
            -0.02006, 0.02728, 0.99278
        ],
        plane2: [
            0.37298, 0.88166, -0.25464,
            0.25954, 0.63506, 0.10540,
            -0.01980, 0.02784, 0.99196
        ],
        normal: [-0.00281, -0.00611, 0.00892]
    },

    tritanopia: {
        plane1: [
            1.01277, 0.13548, -0.14826,
            -0.01243, 0.86812, 0.14431,
            0.07589, 0.80500, 0.11911
        ],
        plane2: [
            0.93678, 0.18979, -0.12657,
            0.06154, 0.81526, 0.12320,
            -0.37562, 1.12767, 0.24796
        ],
        normal: [0.03901, -0.02788, -0.01113]
    }
};

// ============================================
// 3. COLOR CONVERSION HELPERS
// ============================================

// Convert an 8-bit sRGB channel to linear RGB.
function srgbToLinear(value) {
    value /= 255;

    if (value <= 0.04045) {
        return value / 12.92;
    }

    return Math.pow((value + 0.055) / 1.055, 2.4);
}

// Convert linear RGB back to an 8-bit sRGB channel.
function linearToSrgb(value) {
    value = Math.max(0, Math.min(1, value));

    if (value <= 0.0031308) {
        return 255 * 12.92 * value;
    }

    return 255 * (
        1.055 * Math.pow(value, 1 / 2.4) - 0.055
    );
}

function clamp(value) {
    return Math.round(Math.max(0, Math.min(255, value)));
}

// Apply a 3x3 matrix to an RGB triplet.
function applyMatrix(rgb, matrix) {
    return [
        matrix[0] * rgb[0] +
            matrix[1] * rgb[1] +
            matrix[2] * rgb[2],

        matrix[3] * rgb[0] +
            matrix[4] * rgb[1] +
            matrix[5] * rgb[2],

        matrix[6] * rgb[0] +
            matrix[7] * rgb[1] +
            matrix[8] * rgb[2]
    ];
}

// Convert an sRGB pixel into linear RGB.
function pixelToLinear(r, g, b) {
    return [
        srgbToLinear(r),
        srgbToLinear(g),
        srgbToLinear(b)
    ];
}

// Convert linear RGB into 8-bit sRGB.
function linearToPixel(rgb) {
    return [
        clamp(linearToSrgb(rgb[0])),
        clamp(linearToSrgb(rgb[1])),
        clamp(linearToSrgb(rgb[2]))
    ];
}

// ============================================
// 4. BRETTEL-BASED CVD SIMULATION
// ============================================

function simulatePixel(r, g, b, profile) {
    const params = brettel[profile];

    // The published projection matrices operate in linear RGB.
    const rgb = pixelToLinear(r, g, b);

    // Select the projection plane for this color.
    const normal = params.normal;

    const dot =
        rgb[0] * normal[0] +
        rgb[1] * normal[1] +
        rgb[2] * normal[2];

    const matrix = dot >= 0
        ? params.plane1
        : params.plane2;

    const simulated = applyMatrix(rgb, matrix);

    // Convert the simulated color back to display RGB.
    return linearToPixel(simulated);
}

// ============================================
// 5. ACCESSIBILITY ENHANCEMENT
//
// Separate from the simulation.
// Redistributes some simulated color-loss error
// into other channels to make differences more
// visible. This is a basic Daltonization-style
// correction, not a validated clinical method.
// ============================================

function enhancePixel(r, g, b, profile, strength) {
    if (strength <= 0) {
        return [r, g, b];
    }

    const original = pixelToLinear(r, g, b);

    const simulatedPixel = simulatePixel(
        r, g, b, profile
    );

    const simulated = pixelToLinear(
        simulatedPixel[0],
        simulatedPixel[1],
        simulatedPixel[2]
    );

    // Estimate the color information lost in simulation.
    const error = [
        original[0] - simulated[0],
        original[1] - simulated[1],
        original[2] - simulated[2]
    ];

    let correction;

    // Redistribute error toward other color channels.
    // These are heuristic mappings, not a universal
    // solution for every image or person.
    if (profile === "protanopia") {
        correction = [
            0,
            0.7 * error[0] + 0.7 * error[1],
            error[0] + error[1]
        ];
    } else if (profile === "deuteranopia") {
        correction = [
            0.7 * error[0] + 0.7 * error[1],
            0,
            error[0] + error[1]
        ];
    } else {
        correction = [
            0.7 * error[2],
            0.7 * error[2],
            0
        ];
    }

    const enhanced = [
        original[0] + correction[0] * strength,
        original[1] + correction[1] * strength,
        original[2] + correction[2] * strength
    ];

    return linearToPixel(enhanced);
}

// ============================================
// 6. IMAGE UPLOAD
// ============================================

imageInput.addEventListener("change", function () {
    const file = imageInput.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file.");
        imageInput.value = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = function (event) {
        const image = new Image();

        image.onload = function () {
            originalImage = image;

            // Limit dimensions to reduce browser memory usage.
            const maxDimension = 1200;

            const scale = Math.min(
                1,
                maxDimension / Math.max(
                    image.naturalWidth,
                    image.naturalHeight
                )
            );

            const width = Math.max(
                1,
                Math.round(image.naturalWidth * scale)
            );

            const height = Math.max(
                1,
                Math.round(image.naturalHeight * scale)
            );

            [
                originalCanvas,
                simulationCanvas,
                resultCanvas
            ].forEach(canvas => {
                canvas.width = width;
                canvas.height = height;
            });

            originalCtx.clearRect(0, 0, width, height);
            originalCtx.drawImage(image, 0, 0, width, height);

            uploadSection.classList.add("hidden");
            editorSection.classList.remove("hidden");

            applyTransformation();
        };

        image.onerror = function () {
            alert("Unable to load this image. Try another file.");
            imageInput.value = "";
        };

        image.src = event.target.result;
    };

    reader.onerror = function () {
        alert("Unable to read this file. Please try again.");
        imageInput.value = "";
    };

    reader.readAsDataURL(file);
});

// ============================================
// 7. PROCESS ALL THREE CANVASES
// ============================================

function applyTransformation() {
    if (!originalImage) return;

    const width = originalCanvas.width;
    const height = originalCanvas.height;

    if (!width || !height) return;

    const source = originalCtx.getImageData(
        0, 0, width, height
    );

    const simulation = simulationCtx.createImageData(
        width, height
    );

    const result = resultCtx.createImageData(
        width, height
    );

    const input = source.data;
    const simulated = simulation.data;
    const enhanced = result.data;

    const strength = Number(strengthSlider.value) / 100;

    for (let i = 0; i < input.length; i += 4) {
        const r = input[i];
        const g = input[i + 1];
        const b = input[i + 2];
        const a = input[i + 3];

        // Preserve transparency.
        if (a === 0) {
            simulated[i + 3] = 0;
            enhanced[i + 3] = 0;
            continue;
        }

        // Canvas 2: simulated color vision deficiency.
        const simulatedRGB = simulatePixel(
            r, g, b, selectedProfile
        );

        simulated[i] = simulatedRGB[0];
        simulated[i + 1] = simulatedRGB[1];
        simulated[i + 2] = simulatedRGB[2];
        simulated[i + 3] = a;

        // Canvas 3: accessibility-oriented enhancement.
        const enhancedRGB = enhancePixel(
            r, g, b, selectedProfile, strength
        );

        enhanced[i] = enhancedRGB[0];
        enhanced[i + 1] = enhancedRGB[1];
        enhanced[i + 2] = enhancedRGB[2];
        enhanced[i + 3] = a;
    }

    simulationCtx.putImageData(simulation, 0, 0);
    resultCtx.putImageData(result, 0, 0);
}

// ============================================
// 8. PROFILE SELECTION
// ============================================

function selectProfile(button) {
    const profile = button.dataset.profile;

    if (!brettel[profile]) return;

    selectedProfile = profile;

    profileButtons.forEach(btn => {
        const active = btn === button;

        btn.classList.toggle(
            "border-violet-500", active
        );

        btn.classList.toggle(
            "bg-violet-500/10", active
        );

        btn.setAttribute(
            "aria-pressed",
            String(active)
        );
    });

    applyTransformation();
}

profileButtons.forEach(button => {
    button.addEventListener("click", function () {
        selectProfile(button);
    });
});

// ============================================
// 9. STRENGTH SLIDER
// ============================================

strengthSlider.addEventListener("input", function () {
    strengthValue.textContent =
        `${strengthSlider.value}%`;

    applyTransformation();
});

// ============================================
// 10. DOWNLOAD ENHANCED IMAGE
// ============================================

downloadBtn.addEventListener("click", function () {
    if (!originalImage) {
        alert("Please upload an image first.");
        return;
    }

    resultCanvas.toBlob(function (blob) {
        if (!blob) {
            alert("Unable to export the image.");
            return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "chromaassist-enhanced.png";

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
});

// ============================================
// 11. RESET
// ============================================

resetBtn.addEventListener("click", function () {
    originalImage = null;
    imageInput.value = "";

    [
        originalCanvas,
        simulationCanvas,
        resultCanvas
    ].forEach(canvas => {
        const context = canvas.getContext("2d");

        context.clearRect(
            0, 0, canvas.width, canvas.height
        );
    });

    strengthSlider.value = 50;
    strengthValue.textContent = "50%";

    editorSection.classList.add("hidden");
    uploadSection.classList.remove("hidden");

    const defaultButton = document.querySelector(
        '.profile-btn[data-profile="deuteranopia"]'
    );

    if (defaultButton) {
        selectProfile(defaultButton);
    }
});

// ============================================
// 12. INITIAL SETTINGS
// ============================================

strengthValue.textContent = `${strengthSlider.value}%`;

const initialButton = document.querySelector(
    '.profile-btn[data-profile="deuteranopia"]'
);

if (initialButton) {
    selectProfile(initialButton);
}

console.log("ChromaAssist initialized.");

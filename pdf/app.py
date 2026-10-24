import io

import numpy as np
import pymupdf
import streamlit as st
from PIL import Image
from colorspacious import cspace_convert


# ==================================================
# 1. PAGE CONFIGURATION
# ==================================================

st.set_page_config(
    page_title="ChromaAssist | Document Studio",
    page_icon="📘",
    layout="wide",
    initial_sidebar_state="collapsed",
)


# ==================================================
# 2. CHROMAASSIST UI — LAVENDER THEME
# ==================================================

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

:root {
    --purple: #9271ff;
    --purple-dark: #7654e8;
    --lavender: #f5efff;
    --ink: #2d2744;
    --muted: #77758c;
    --border: #e7ddff;
}

/* Global page */
html, body, [class*="css"] {
    font-family: 'DM Sans', sans-serif !important;
}

.stApp {
    background:
        radial-gradient(ellipse at 8% 12%,
            rgba(207, 188, 255, .42), transparent 34%),
        radial-gradient(ellipse at 96% 22%,
            rgba(218, 198, 255, .42), transparent 34%),
        radial-gradient(ellipse at 50% 100%,
            rgba(240, 229, 255, .55), transparent 40%),
        linear-gradient(135deg, #ffffff 0%, #fcfaff 48%, #f5efff 100%);
    background-attachment: fixed;
    color: var(--ink);
}

/* Hide Streamlit chrome */
header[data-testid="stHeader"] {
    background: transparent !important;
}

div[data-testid="stToolbar"] {
    visibility: hidden !important;
    height: 0 !important;
}

#MainMenu {
    visibility: hidden !important;
}

footer {
    visibility: hidden !important;
}

div[data-testid="stStatusWidget"] {
    visibility: hidden !important;
}

/* Page width */
.block-container {
    max-width: 1180px;
    padding-top: 2rem;
    padding-bottom: 3rem;
}

/* Brand header */
.brand-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 44px;
}

.brand-icon {
    width: 48px;
    height: 48px;
    border-radius: 16px;
    background: linear-gradient(135deg, #9c7bff, #8060ed);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 25px;
    box-shadow: 0 8px 20px rgba(146, 113, 255, .25);
}

.brand-name {
    font-family: 'Space Grotesk', sans-serif;
    color: var(--ink);
    font-size: 21px;
    font-weight: 700;
    line-height: 1.2;
}

.brand-caption {
    color: var(--purple-dark);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 2.5px;
    margin-top: 4px;
}

/* Hero */
.eyebrow {
    color: var(--purple-dark);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 3px;
    text-transform: uppercase;
    margin-bottom: 18px;
}

.hero-title {
    font-family: 'Space Grotesk', sans-serif;
    color: var(--ink);
    font-size: clamp(36px, 4.4vw, 56px);
    font-weight: 700;
    letter-spacing: -2px;
    line-height: 1.12;
    margin: 0 0 18px;
}

.hero-title span {
    background: linear-gradient(100deg, #8260f4, #bd91f5);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}

.hero-subtitle {
    color: var(--muted);
    font-size: 15px;
    line-height: 1.8;
    max-width: 760px;
    margin-bottom: 28px;
}

/* Sections */
.step-label {
    color: var(--purple-dark);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    margin: 10px 0 15px;
}

.section-title {
    font-family: 'Space Grotesk', sans-serif;
    color: var(--ink);
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -.7px;
    margin: 0 0 8px;
}

.section-description {
    color: var(--muted);
    font-size: 13px;
    line-height: 1.7;
    margin-bottom: 20px;
}

/* Cards */
div[data-testid="stVerticalBlockBorderWrapper"] {
    background: rgba(255, 255, 255, .76) !important;
    border: 1px solid rgba(224, 210, 255, .9) !important;
    border-radius: 22px !important;
    box-shadow: 0 12px 38px rgba(90, 64, 145, .055);
}

/* All text */
h1, h2, h3 {
    font-family: 'Space Grotesk', sans-serif !important;
    color: var(--ink) !important;
}

p, label {
    color: #625c75;
}

div[data-testid="stWidgetLabel"] p {
    color: #625c75 !important;
    font-size: 13px !important;
    font-weight: 500 !important;
}

/* Dropdown — remove black background */
div[data-baseweb="select"] > div {
    background: #ffffff !important;
    border: 1px solid #e4d9ff !important;
    border-radius: 13px !important;
    min-height: 46px;
    box-shadow: none !important;
}

div[data-baseweb="select"] *,
div[data-baseweb="input"] *,
div[data-baseweb="base-input"] * {
    color: var(--ink) !important;
}

div[data-baseweb="popover"],
div[data-baseweb="menu"],
ul[role="listbox"] {
    background: #ffffff !important;
    border: 1px solid var(--border) !important;
    border-radius: 12px !important;
}

li[role="option"] {
    background: #ffffff !important;
    color: var(--ink) !important;
}

li[role="option"]:hover {
    background: #f3edff !important;
}

/* File uploader — lavender instead of black */
div[data-testid="stFileUploader"] {
    background: rgba(250, 247, 255, .9) !important;
    border: 1.5px dashed #c8b3ff !important;
    border-radius: 20px !important;
    padding: 18px !important;
    transition: background .2s ease, border-color .2s ease;
}

div[data-testid="stFileUploader"]:hover {
    background: #f4edff !important;
    border-color: var(--purple) !important;
}

div[data-testid="stFileUploaderDropzone"] {
    background: transparent !important;
    border: none !important;
}

div[data-testid="stFileUploaderDropzone"] * {
    color: #625879 !important;
}

div[data-testid="stFileUploaderDropzone"] button {
    background: linear-gradient(110deg, #9271ff, #b18aff) !important;
    color: #ffffff !important;
    border: none !important;
    border-radius: 11px !important;
}

/* Number input */
div[data-testid="stNumberInput"] input {
    background: #ffffff !important;
    color: var(--ink) !important;
    border: 1px solid #e4d9ff !important;
    border-radius: 12px !important;
}

div[data-testid="stNumberInput"] button {
    background: #f4efff !important;
    border-color: #e4d9ff !important;
    color: var(--purple-dark) !important;
}

/* Sliders */
div[data-testid="stSlider"] [data-baseweb="slider"] div[role="slider"] {
    background: var(--purple) !important;
    border-color: var(--purple) !important;
    box-shadow: 0 0 0 4px rgba(146, 113, 255, .12) !important;
}

div[data-testid="stSlider"] [data-testid="stTickBar"] {
    background: #e8dfff !important;
}

div[data-testid="stSlider"] [data-testid="stSliderTrack"] {
    background: linear-gradient(90deg, #9271ff, #c09aff) !important;
}

/* Buttons */
.stButton > button,
.stDownloadButton > button {
    background: linear-gradient(110deg, #9271ff, #b18aff) !important;
    color: #ffffff !important;
    border: none !important;
    border-radius: 13px !important;
    min-height: 46px;
    padding: 11px 22px !important;
    font-weight: 700 !important;
    box-shadow: 0 7px 18px rgba(146, 113, 255, .2);
    transition: transform .2s ease, box-shadow .2s ease;
}

.stButton > button:hover,
.stDownloadButton > button:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 24px rgba(146, 113, 255, .3);
}

/* Alerts */
div[data-testid="stAlert"] {
    background: rgba(239, 232, 255, .82) !important;
    border: 1px solid #ded0ff !important;
    border-radius: 15px !important;
    color: var(--ink) !important;
}

div[data-testid="stAlert"] * {
    color: var(--ink) !important;
}

/* Progress */
div[data-testid="stProgress"] > div > div {
    background: linear-gradient(90deg, #9271ff, #c09aff) !important;
}

/* Preview images */
div[data-testid="stImage"] img {
    border-radius: 16px;
    border: 1px solid #e8defb;
    box-shadow: 0 8px 25px rgba(55, 35, 95, .08);
}

/* Divider */
hr {
    border-color: #e8defb !important;
}

/* Footer branding */
.custom-footer {
    text-align: center;
    margin-top: 55px;
    padding: 22px 0 5px;
    color: #9991b1;
    font-size: 12px;
}

.custom-footer strong {
    color: var(--purple-dark);
    letter-spacing: 1px;
}

/* Mobile */
@media (max-width: 700px) {
    .block-container {
        padding: 1.3rem 1rem 2.5rem;
    }

    .brand-row {
        margin-bottom: 32px;
    }

    .hero-title {
        font-size: 36px;
        letter-spacing: -1px;
    }
}
</style>
""", unsafe_allow_html=True)


# ==================================================
# 3. BRAND HEADER AND HERO
# ==================================================

st.markdown("""
<div class="brand-row">
    <div class="brand-icon">◎</div>
    <div>
        <div class="brand-name">ChromaAssist</div>
        <div class="brand-caption">COLOUR ACCESSIBILITY</div>
    </div>
</div>

<div class="eyebrow">DOCUMENT STUDIO · COLOUR ACCESSIBILITY</div>

<div class="hero-title">
    See your documents in a <span>new light.</span>
</div>

<div class="hero-subtitle">
    Upload your textbook, explore colour-vision simulations,
    preview the processed page, and create a colour-adjusted PDF
    using your selected settings.
</div>
""", unsafe_allow_html=True)

st.info(
    "Experimental prototype: this tool simulates colour-vision "
    "deficiency. It does not guarantee improved accessibility "
    "or provide a medical diagnosis."
)


# ==================================================
# 4. COLOUR-VISION PROFILES
# ==================================================

profiles = {
    "Protanopia": "protanomaly",
    "Deuteranopia": "deuteranomaly",
    "Tritanopia": "tritanomaly",
}

st.markdown("""
<div class="step-label">STEP 01 · COLOUR PROFILE</div>
<div class="section-title">Choose a colour profile</div>
<div class="section-description">
    Select the colour-vision profile to use for your document.
</div>
""", unsafe_allow_html=True)

selected_profile = st.selectbox(
    "Choose a colour-vision profile",
    list(profiles.keys()),
)


# ==================================================
# 5. UPLOAD DOCUMENT
# ==================================================

st.markdown("""
<div class="step-label">STEP 02 · UPLOAD DOCUMENT</div>
<div class="section-title">Upload your textbook</div>
<div class="section-description">
    Choose a PDF to create a colour-adjusted version.
</div>
""", unsafe_allow_html=True)

uploaded_pdf = st.file_uploader(
    "Upload your textbook PDF",
    type=["pdf"],
    help="Choose a PDF file from your device.",
)

if uploaded_pdf is not None:
    st.caption(
        f"Selected: {uploaded_pdf.name} · "
        f"{uploaded_pdf.size / (1024 * 1024):.2f} MB"
    )


# ==================================================
# 6. PROCESSING SETTINGS
# ==================================================

st.markdown("""
<div class="step-label">STEP 03 · PROCESSING SETTINGS</div>
<div class="section-title">Customise your output</div>
<div class="section-description">
    Balance image quality and processing time.
</div>
""", unsafe_allow_html=True)

dpi = st.select_slider(
    "Processing quality (DPI)",
    options=[90, 120, 150],
    value=120,
)

left, right = st.columns(2)

with left:
    max_pages = st.number_input(
        "Maximum pages to process",
        min_value=1,
        max_value=1000,
        value=30,
        step=10,
        help="Start with 30 pages to test the output.",
    )

with right:
    severity = st.slider(
        "Simulation severity",
        min_value=50,
        max_value=100,
        value=100,
        help="This controls simulation severity, not the percentage of colour removed.",
    )

st.caption("Tip: Try a smaller page limit first when testing a large textbook.")


# ==================================================
# 7. COLOUR MAPPING AND ENHANCEMENT
# ==================================================

def map_to_displayable_rgb(simulated):
    """Map simulated RGB colours into the displayable range."""

    simulated = np.asarray(simulated, dtype=np.float32)

    simulated = np.nan_to_num(
        simulated,
        nan=0.0,
        posinf=1.0,
        neginf=0.0,
    )

    neutral = np.clip(
        np.mean(simulated, axis=-1, keepdims=True),
        0.0,
        1.0,
    )

    low = np.zeros_like(neutral)
    high = np.ones_like(neutral)

    for _ in range(16):
        mid = (low + high) / 2.0
        candidate = neutral + mid * (simulated - neutral)

        fits = np.all(
            (candidate >= 0.0) & (candidate <= 1.0),
            axis=-1,
            keepdims=True,
        )

        low = np.where(fits, mid, low)
        high = np.where(fits, high, mid)

    mapped = neutral + low * (simulated - neutral)

    return np.clip(mapped, 0.0, 1.0)


def enhance_colour_accessibility(image, cvd_type, severity=100):
    """Experimental profile-specific colour adjustment."""

    original = (
        np.asarray(image.convert("RGB"), dtype=np.float32) / 255.0
    )

    cvd_space = {
        "name": "sRGB1+CVD",
        "cvd_type": cvd_type,
        "severity": int(severity),
    }

    simulated = cspace_convert(original, "sRGB1", cvd_space)
    simulated = map_to_displayable_rgb(simulated)
    error = original - simulated

    matrices = {
        "protanomaly": [
            [0.0, 0.0, 0.0],
            [0.7, 1.0, 0.0],
            [0.7, 0.0, 1.0],
        ],
        "deuteranomaly": [
            [1.0, 0.7, 0.0],
            [0.0, 0.0, 0.0],
            [0.0, 0.7, 1.0],
        ],
        "tritanomaly": [
            [1.0, 0.0, 0.7],
            [0.0, 1.0, 0.7],
            [0.0, 0.0, 0.0],
        ],
    }

    if cvd_type not in matrices:
        raise ValueError(f"Unknown profile: {cvd_type}")

    matrix = np.asarray(matrices[cvd_type], dtype=np.float32)
    correction = error @ matrix.T

    maximum = original.max(axis=2)
    minimum = original.min(axis=2)
    brightness = original.mean(axis=2)

    chromatic_mask = (
        ((maximum - minimum) > 0.10)
        & (brightness > 0.10)
        & (brightness < 0.92)
    )

    enhanced = original.copy()
    enhanced[chromatic_mask] = (
        original[chromatic_mask]
        + 0.50 * correction[chromatic_mask]
    )

    enhanced = np.clip(enhanced, 0.0, 1.0)

    return Image.fromarray(
        np.round(enhanced * 255).astype(np.uint8),
        mode="RGB",
    )


# ==================================================
# 8. PROCESS PDF
# ==================================================

st.markdown("""
<div class="step-label">STEP 04 · GENERATE DOCUMENT</div>
<div class="section-title">Process your PDF</div>
<div class="section-description">
    Apply your selected settings and generate the output document.
</div>
""", unsafe_allow_html=True)

process_clicked = st.button(
    "✨  Process textbook",
    type="primary",
    use_container_width=True,
    disabled=(uploaded_pdf is None),
)

if uploaded_pdf is None:
    st.caption("Upload a PDF above to enable processing.")

if process_clicked:
    try:
        pdf_bytes = uploaded_pdf.getvalue()

        with pymupdf.open(
            stream=pdf_bytes,
            filetype="pdf",
        ) as doc:

            total_pages = len(doc)

            if total_pages == 0:
                st.error("This PDF contains no pages.")
                st.stop()

            pages_to_process = min(total_pages, int(max_pages))

            output_pdf = pymupdf.open()
            first_original = None
            first_processed = None

            progress = st.progress(0)
            status = st.empty()

            try:
                for index in range(pages_to_process):
                    page = doc[index]

                    pix = page.get_pixmap(
                        dpi=int(dpi),
                        colorspace=pymupdf.csRGB,
                        alpha=False,
                    )

                    original = Image.frombytes(
                        "RGB",
                        (pix.width, pix.height),
                        pix.samples,
                    )

                    processed = enhance_colour_accessibility(
                        original,
                        profiles[selected_profile],
                        severity=severity,
                    )

                    if index == 0:
                        first_original = original.copy()
                        first_processed = processed.copy()

                    image_buffer = io.BytesIO()
                    processed.save(
                        image_buffer,
                        format="PNG",
                        optimize=True,
                    )

                    new_page = output_pdf.new_page(
                        width=page.rect.width,
                        height=page.rect.height,
                    )

                    new_page.insert_image(
                        new_page.rect,
                        stream=image_buffer.getvalue(),
                    )

                    progress.progress((index + 1) / pages_to_process)
                    status.write(
                        f"Processing page {index + 1} of {pages_to_process}..."
                    )

                result_bytes = output_pdf.tobytes(
                    garbage=3,
                    deflate=True,
                )

            finally:
                output_pdf.close()

        st.session_state["result_pdf"] = result_bytes
        st.session_state["original_preview"] = first_original
        st.session_state["processed_preview"] = first_processed
        st.session_state["processed_profile"] = selected_profile
        st.session_state["processed_filename"] = uploaded_pdf.name
        st.session_state["processed_page_count"] = pages_to_process
        st.session_state["processed_total_pages"] = total_pages

        status.empty()
        st.success("Your PDF has been processed successfully!")

        if pages_to_process < total_pages:
            st.warning(
                f"Processed {pages_to_process} of {total_pages} pages. "
                "Increase the page limit to include more pages."
            )

    except Exception as exc:
        st.error(
            "Could not process the PDF. Check that the file is valid "
            "and that all required packages are installed."
        )
        st.caption(f"Technical details: {type(exc).__name__}: {exc}")


# ==================================================
# 9. PREVIEW AND DOWNLOAD
# ==================================================

if "result_pdf" in st.session_state:
    st.divider()

    st.markdown("""
    <div class="step-label">STEP 05 · REVIEW YOUR RESULT</div>
    <div class="section-title">Compare your pages</div>
    <div class="section-description">
        Review the first page before downloading your processed document.
    </div>
    """, unsafe_allow_html=True)

    left, right = st.columns(2)

    with left:
        st.markdown("**Original page**")
        st.image(
            st.session_state["original_preview"],
            use_container_width=True,
        )

    with right:
        st.markdown(
            f"**Processed · {st.session_state['processed_profile']}**"
        )
        st.image(
            st.session_state["processed_preview"],
            use_container_width=True,
        )

    st.download_button(
        label="⬇️  Download processed PDF",
        data=st.session_state["result_pdf"],
        file_name=(
            f"{st.session_state['processed_profile'].lower()}_"
            "textbook.pdf"
        ),
        mime="application/pdf",
        type="primary",
        use_container_width=True,
    )

    st.warning(
        "This prototype rasterizes PDF pages. Text may no longer be "
        "selectable or searchable, and links, bookmarks, forms, and "
        "other PDF features are not preserved. Colour simulation is "
        "not the same as proven accessibility enhancement."
    )


# ==================================================
# 10. FOOTER
# ==================================================

st.markdown("""
<div class="custom-footer">
    <strong>CHROMAASSIST</strong> · Document Studio
    <br><br>
    An experimental colour-accessibility project
</div>
""", unsafe_allow_html=True)

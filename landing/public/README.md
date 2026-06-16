# Checklist: Image Assets for Statsparrot Landing Page

This document lists all the image assets you need to add to the `public/` directory (or other paths of your choice) to complete the landing page.

---

## 1. Brand Logo (Required immediately)

- **Filename**: `logo.png`
- **Location**: `public/logo.png`
- **Usage**:
  - Main navbar logo: [SiteHeader.jsx](file:///Users/adriantucicovenco/Proiecte/sentry-data/landing/src/sections/SiteHeader.jsx)
  - Footer logo: [SiteFooter.jsx](file:///Users/adriantucicovenco/Proiecte/sentry-data/landing/src/sections/SiteFooter.jsx)
  - Page favicon: [index.html](file:///Users/adriantucicovenco/Proiecte/sentry-data/landing/index.html)
- **Recommended Specs**: Transparent background PNG, square aspect ratio (e.g., `128x128` pixels), desaturated or white color theme.

---

## 2. Visual Section Slideshow Images (Optional / Swappable)

In [VisualSection.jsx](file:///Users/adriantucicovenco/Proiecte/sentry-data/landing/src/sections/VisualSection.jsx), the visualizer slides every 6 seconds between the interactive diagram and 2 screenshots.

Add your images to `public/` and reference them in the constants at the top of the file:
```javascript
const SLIDE_IMAGE_1 = "/schema-modeler.png";
const SLIDE_IMAGE_2 = "/realtime-streams.png";
```

### Slide 1: Data Schema Modeler Screenshot
- **Recommended Filename**: `schema-modeler.png`
- **Usage**: Displays during slide 1 rotation.
- **Specs**: Landscape `16:9` dashboard mockup screenshot showing data tables, pipelines, or mappings in dark mode.

### Slide 2: Real-Time Data Streams Screenshot
- **Recommended Filename**: `realtime-streams.png`
- **Usage**: Displays during slide 2 rotation.
- **Specs**: Landscape `16:9` screenshot of live streams, charts, or terminal metrics.

---

## 3. Feature Section Scroll Mockups (Optional / Swappable)

In [FeatureScrollSection.jsx](file:///Users/adriantucicovenco/Proiecte/sentry-data/landing/src/sections/FeatureScrollSection.jsx), you can replace the placeholder mockups with screenshots by adding the image paths to the `imageUrl` properties in the `CATEGORIES` array.

- **Category 1: Agents**
  - **Recommended Filename**: `features-agents.png`
  - **Reference in code**: `imageUrl: "/features-agents.png"` inside `category-1` block.
- **Category 2: Mind Map**
  - **Recommended Filename**: `features-mindmap.png`
  - **Reference in code**: `imageUrl: "/features-mindmap.png"` inside `category-2` block.
- **Category 3: Analytics**
  - **Recommended Filename**: `features-analytics.png`
  - **Reference in code**: `imageUrl: "/features-analytics.png"` inside `category-3` block.
- **Category 4: Connectors**
  - **Recommended Filename**: `features-connectors.png`
  - **Reference in code**: `imageUrl: "/features-connectors.png"` inside `category-4` block.

**Recommended Specs**: Rounded mockups, cropped landscape slices (e.g., `800x420` pixels), high quality, dark mode.

---

## 4. Call-To-Action (CTA) Background Image (Optional)

- **Recommended Filename**: `abstract-cta-bg.jpg`
- **Location**: `public/abstract-cta-bg.jpg`
- **Usage**: Set as background of the bottom CTA.
- **How to apply**: In [BottomCtaSection.css](file:///Users/adriantucicovenco/Proiecte/sentry-data/landing/src/sections/BottomCtaSection.css), uncomment the background-image rule (line 21):
  ```css
  background-image: url('/abstract-cta-bg.jpg');
  ```
- **Recommended Specs**: High resolution abstract wallpaper, blue/teal color profile, with blurred or soft motion visual details.

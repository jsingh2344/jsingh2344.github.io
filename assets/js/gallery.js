/**
 * Create a slideshow section.
 * @param {string[]} images - Array of image paths.
 * @param {string[]} captions - Array of captions (same length as images).
 * @param {string} targetSelector - Where to insert the slideshow.
 */
function createSlideshow(images, captions, targetSelector) {
  const target = document.querySelector(targetSelector);
  if (!target) return;

  // Fallback: if captions not given or shorter, fill with empty strings
  if (!Array.isArray(captions)) captions = [];
  captions = images.map((_, i) => captions[i] || "");

  // Build aside thumbnails
  let asideHTML = images.map((src, i) => `
    <a href="#c${i+1}" class="slidesshow__dot">
      <img src="${src}" class="slidesshow__thumbnail" alt="${captions[i]}">
    </a>
  `).join("");

  // Build main slides with captions
  let slidesHTML = images.map((src, i) => `
    <figure id="c${i+1}" class="slidesshow__slide">
      <img src="${src}" alt="${captions[i]}">
      ${captions[i] ? `<figcaption class="slidesshow__caption">${captions[i]}</figcaption>` : ""}
    </figure>
  `).join("");

  // Full markup
  const slideshowHTML = `
    <section>
      <div class="section">
        <div class="slidesshow">
          <aside class="slidesshow__aside">
            <div class="slidesshow__sticky">
              ${asideHTML}
            </div>
          </aside>
          <div class="slidesshow__track">
            <div class="slidesshow__container">
              ${slidesHTML}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  target.innerHTML = slideshowHTML;
}

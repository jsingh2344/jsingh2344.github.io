/**
 * Create a slideshow section.
 * @param {string[]} images - Array of image paths.
 * @param {string[]} captions - Array of captions (can be shorter or have empty entries).
 * @param {string} targetSelector - Where to insert the slideshow.
 */
function createSlideshow(images, captions, targetSelector) {
  const target = document.querySelector(targetSelector);
  if (!target) return;

  // Build aside thumbnails
  let asideHTML = images.map((src, i) => `
    <a href="#c${i+1}" class="slidesshow__dot">
      <img src="${src}" class="slidesshow__thumbnail" alt="${captions?.[i] || ''}">
    </a>
  `).join("");

  // Build main slides with optional captions
  let slidesHTML = images.map((src, i) => `
    <figure class="slidesshow__slide">
      <img id="c${i+1}" src="${src}" alt="${captions?.[i] || ''}">
      ${captions && captions[i] ? `<figcaption class="slidesshow__caption">${captions[i]}</figcaption>` : ""}
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

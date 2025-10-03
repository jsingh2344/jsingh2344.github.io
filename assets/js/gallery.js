/**
 * Create a slideshow section.
 * @param {string[]} images - Array of image paths.
 * @param {string} targetSelector - Where to insert the slideshow.
 */
function createSlideshow(images, targetSelector) {
  const target = document.querySelector(targetSelector);
  if (!target) return;

  // Build aside thumbnails
  let asideHTML = images.map((src, i) => `
    <a href="#c${i+1}" class="slidesshow__dot">
      <img src="${src}" class="slidesshow__thumbnail">
    </a>
  `).join("");

  // Build main slides
  let slidesHTML = images.map((src, i) => `
    <img id="c${i+1}" src="${src}" class="slidesshow__slide">
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

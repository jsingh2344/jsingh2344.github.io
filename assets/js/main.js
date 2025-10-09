(function($) {

	var $window = $(window),
		$head = $('head'),
		$body = $('body');

	// Breakpoints.
	breakpoints({
		xlarge:   [ '1281px',  '1680px' ],
		large:    [ '981px',   '1280px' ],
		medium:   [ '737px',   '980px'  ],
		small:    [ '481px',   '736px'  ],
		xsmall:   [ '361px',   '480px'  ],
		xxsmall:  [ null,      '360px'  ],
		'xlarge-to-max': '(min-width: 1681px)',
		'small-to-xlarge': '(min-width: 481px) and (max-width: 1680px)'
	});

	// Stops animations/transitions until page has loaded.
	$window.on('load', function() {
		window.setTimeout(function() {
			$body.removeClass('is-preload');
		}, 100);
	});

	// Stops animations during resize.
	var resizeTimeout;
	$window.on('resize', function() {
		$body.addClass('is-resizing');
		clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(function() {
			$body.removeClass('is-resizing');
		}, 100);
	});

	// Fixes for object-fit images.
	if (!browser.canUse('object-fit') || browser.name == 'safari')
		$('.image.object').each(function() {
			var $this = $(this),
				$img = $this.children('img');

			$img.css('opacity', '0');
			$this
				.css('background-image', 'url("' + $img.attr('src') + '")')
				.css('background-size', $img.css('object-fit') ? $img.css('object-fit') : 'cover')
				.css('background-position', $img.css('object-position') ? $img.css('object-position') : 'center');
		});

	// Sidebar fetch + initialization
	fetch("/sidebar")
		.then(response => response.text())
		.then(data => {

			document.getElementById("sidebar_standin").innerHTML = data;
			const sidebar = document.getElementById("sidebar");
			const toggle = document.getElementById("sidebar-toggle");

			// Start hidden
			if (sidebar) sidebar.classList.remove("active");

			// Toggle click
			if (toggle && sidebar) {
				toggle.addEventListener("click", (e) => {
					e.stopPropagation();
					sidebar.classList.toggle("active");
				});

				// Close when clicking outside
				document.addEventListener("click", (e) => {
					if (
						sidebar.classList.contains("active") &&
						!sidebar.contains(e.target) &&
						e.target !== toggle
					) {
						sidebar.classList.remove("active");
					}
				});
			}

		})
		.catch(error => console.error("Error loading sidebar:", error));

})(jQuery);

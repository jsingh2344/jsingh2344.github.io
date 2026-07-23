(() => {
	"use strict";

	const DATA_URL = "assets/data/listening-atlas.json";
	const palette = ["#f56a6a", "#3d4449", "#7f888f"];
	const dashPatterns = [
		[],
		[8, 5],
		[2, 4],
		[12, 4, 2, 4],
		[4, 3],
		[14, 3],
		[1, 3, 6, 3],
		[6, 2, 1, 2],
		[10, 2],
		[3, 2, 9, 2],
	];
	const charts = [];

	const formatNumber = (value, digits = 0) =>
		new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);

	const formatMonth = (month) =>
		new Intl.DateTimeFormat("en-US", {
			month: "short",
			year: "numeric",
			timeZone: "UTC",
		}).format(new Date(`${month}-01T00:00:00Z`));

	const formatDate = (date) =>
		new Intl.DateTimeFormat("en-US", {
			month: "short",
			year: "numeric",
			timeZone: "UTC",
		}).format(new Date(`${date}T00:00:00Z`));

	const formatFullDate = (date) =>
		new Intl.DateTimeFormat("en-US", {
			month: "long",
			day: "numeric",
			year: "numeric",
			timeZone: "UTC",
		}).format(new Date(`${date}T00:00:00Z`));

	const escapeHtml = (value) =>
		String(value)
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;")
			.replaceAll('"', "&quot;")
			.replaceAll("'", "&#039;");

	const niceMaximum = (value) => {
		if (value <= 5) return 5;
		const magnitude = 10 ** Math.floor(Math.log10(value));
		const normalized = value / magnitude;
		const step = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
		return step * magnitude;
	};

	class LineChart {
		constructor({ canvas, tooltip, legend, months, series, labelFor }) {
			this.canvas = canvas;
			this.context = canvas.getContext("2d");
			this.tooltip = tooltip;
			this.legend = legend;
			this.months = months;
			this.series = series;
			this.labelFor = labelFor;
			this.active = new Set(
				this.series.slice(0, 10).map((entry, index) => index),
			);
			this.isolated = null;
			this.hoverIndex = null;
			this.buildLegend();
			this.bindEvents();
			this.draw();
		}

		buildLegend() {
			this.legend.innerHTML = this.series
				.map((entry, index) => {
					const styleIndex = index % (palette.length * dashPatterns.length);
					const color = palette[styleIndex % palette.length];
					const pattern = dashPatterns[Math.floor(styleIndex / palette.length)];
					const lineStyle = pattern.length ? "dashed" : "solid";
					const label = this.labelFor(entry);
					return `
						<div
							class="legend-entry"
							style="--line-color:${color};--line-style:${lineStyle}"
						>
							<button
								class="legend-toggle"
								type="button"
								aria-pressed="${index < 10}"
								data-index="${index}"
							><span class="legend-rank">${index + 1}</span><span>${escapeHtml(
								label,
							)}</span></button>
							<button
								class="legend-isolate"
								type="button"
								aria-pressed="false"
								aria-label="Show only ${escapeHtml(label)}"
								title="Show only this line"
								data-index="${index}"
							><span aria-hidden="true">↗</span></button>
						</div>
					`;
				})
				.join("");

			this.legend.addEventListener("click", (event) => {
				const isolateButton = event.target.closest(".legend-isolate[data-index]");
				if (isolateButton) {
					const index = Number(isolateButton.dataset.index);
					this.isolated = this.isolated === index ? null : index;
					this.legend.querySelectorAll(".legend-isolate").forEach((entry) => {
						entry.setAttribute(
							"aria-pressed",
							String(Number(entry.dataset.index) === this.isolated),
						);
					});
					this.draw();
					return;
				}

				const button = event.target.closest(".legend-toggle[data-index]");
				if (!button) return;
				const index = Number(button.dataset.index);
				if (this.active.has(index)) this.active.delete(index);
				else this.active.add(index);
				this.legend.querySelectorAll(".legend-toggle").forEach((entry) => {
					entry.setAttribute(
						"aria-pressed",
						String(this.active.has(Number(entry.dataset.index))),
					);
				});
				this.draw();
			});
		}

		bindEvents() {
			this.canvas.addEventListener("pointermove", (event) => {
				const bounds = this.canvas.getBoundingClientRect();
				const plotLeft = 58;
				const plotRight = bounds.width - 20;
				const ratio = Math.max(
					0,
					Math.min(1, (event.clientX - bounds.left - plotLeft) / (plotRight - plotLeft)),
				);
				this.hoverIndex = Math.round(ratio * (this.months.length - 1));
				this.showTooltip(event, bounds);
				this.draw();
			});

			this.canvas.addEventListener("pointerleave", () => {
				this.hoverIndex = null;
				this.tooltip.classList.remove("is-visible");
				this.draw();
			});
		}

		showTooltip(event, bounds) {
			const visible = this.series
				.map((entry, index) => ({
					entry,
					index,
					value: entry.values[this.hoverIndex] || 0,
				}))
				.filter((item) =>
					this.isolated === null
						? this.active.has(item.index)
						: item.index === this.isolated,
				)
				.sort((a, b) => b.value - a.value)
				.slice(0, 5);

			this.tooltip.innerHTML = `
				<strong>${escapeHtml(formatMonth(this.months[this.hoverIndex]))}</strong><br>
				${
					visible.length
						? visible
								.map(
									(item) =>
										`#${item.index + 1} ${escapeHtml(
											this.labelFor(item.entry),
										)}: ${formatNumber(item.value, 1)} hr`,
								)
								.join("<br>")
						: "No highlighted series"
				}
			`;
			this.tooltip.style.left = `${Math.min(event.clientX - bounds.left + 12, bounds.width - 190)}px`;
			this.tooltip.style.top = `${Math.max(8, event.clientY - bounds.top - 12)}px`;
			this.tooltip.classList.add("is-visible");
		}

		draw() {
			const bounds = this.canvas.getBoundingClientRect();
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			const width = bounds.width;
			const height = bounds.height;
			const left = 58;
			const right = 20;
			const top = 20;
			const bottom = 42;
			const plotWidth = width - left - right;
			const plotHeight = height - top - bottom;
			const context = this.context;

			this.canvas.width = Math.round(width * dpr);
			this.canvas.height = Math.round(height * dpr);
			context.setTransform(dpr, 0, 0, dpr, 0, 0);
			context.clearRect(0, 0, width, height);

			const maxObserved = Math.max(
				...this.series.flatMap((entry) => entry.values),
				1,
			);
			const maxY = niceMaximum(maxObserved);
			const xFor = (index) => left + (index / (this.months.length - 1)) * plotWidth;
			const yFor = (value) => top + plotHeight - (value / maxY) * plotHeight;

			context.font = "11px Open Sans, sans-serif";
			context.textBaseline = "middle";
			for (let tick = 0; tick <= 4; tick += 1) {
				const value = (maxY * tick) / 4;
				const y = yFor(value);
				context.beginPath();
				context.moveTo(left, y);
				context.lineTo(width - right, y);
				context.strokeStyle =
					tick === 0 ? "rgba(61,68,73,0.45)" : "rgba(127,136,143,0.20)";
				context.lineWidth = tick === 0 ? 1.2 : 1;
				context.setLineDash([]);
				context.stroke();
				context.fillStyle = "#7f888f";
				context.textAlign = "right";
				context.fillText(`${formatNumber(value, 0)}h`, left - 9, y);
			}

			const seenYears = new Set();
			this.months.forEach((month, index) => {
				const year = month.slice(0, 4);
				if (seenYears.has(year)) return;
				seenYears.add(year);
				const x = xFor(index);
				context.fillStyle = "#7f888f";
				context.textAlign = index === 0 ? "left" : "center";
				context.textBaseline = "top";
				context.fillText(year, x, height - bottom + 14);
			});

			this.series.forEach((entry, index) => {
				const styleIndex = index % (palette.length * dashPatterns.length);
				const isActive =
					this.isolated === null
						? this.active.has(index)
						: index === this.isolated;
				context.beginPath();
				entry.values.forEach((value, pointIndex) => {
					const x = xFor(pointIndex);
					const y = yFor(value);
					if (pointIndex === 0) context.moveTo(x, y);
					else context.lineTo(x, y);
				});
				context.strokeStyle = palette[styleIndex % palette.length];
				context.globalAlpha = isActive ? 0.9 : 0.1;
				context.lineWidth = isActive ? 2.2 : 1;
				context.lineJoin = "round";
				context.lineCap = "round";
				context.setLineDash(
					dashPatterns[Math.floor(styleIndex / palette.length)],
				);
				context.stroke();
				context.globalAlpha = 1;
			});

			if (this.hoverIndex !== null) {
				const x = xFor(this.hoverIndex);
				context.beginPath();
				context.moveTo(x, top);
				context.lineTo(x, top + plotHeight);
				context.strokeStyle = "#3d4449";
				context.lineWidth = 1;
				context.setLineDash([3, 3]);
				context.stroke();
			}
		}
	}

	const buildPlaces = (data) => {
		document.querySelector(".place-list").innerHTML = data.chapters
			.map((chapter) => {
				const artist = chapter.artists[0];
				const track = chapter.tracks[0];
				return `
					<article class="place-row">
						<time>${escapeHtml(formatDate(chapter.start))}<br>to ${escapeHtml(
							formatDate(chapter.end),
						)}</time>
						<div>
							<h3>${escapeHtml(chapter.place)}</h3>
						</div>
						<div class="place-row__music">
							<small>Most heard</small>
							<strong>${escapeHtml(artist.name)}</strong>
							<a href="${track.url}" target="_blank" rel="noopener noreferrer">
								${escapeHtml(track.name)}
							</a>
							<span class="track-artist">— ${escapeHtml(track.artist)}</span>
						</div>
						<strong class="place-row__hours">${formatNumber(chapter.hours)} hr</strong>
					</article>
				`;
			})
			.join("");
	};

	const buildYears = (data) => {
		document.querySelector(".year-table tbody").innerHTML = data.years
			.map((year) => {
				const artist = year.artists[0];
				const track = year.tracks[0];
				return `
					<tr>
						<td>${year.year}</td>
						<td>${escapeHtml(artist.name)}</td>
						<td>
							<a href="${track.url}" target="_blank" rel="noopener noreferrer">
								${escapeHtml(track.name)}
							</a>
							<span class="track-artist">— ${escapeHtml(track.artist)}</span>
						</td>
						<td>${formatNumber(year.hours)}</td>
					</tr>
				`;
			})
			.join("");
	};

	const buildDaily = (data) => {
		const calendar = document.querySelector(".daily-calendar");
		const minutesByDate = new Map(data.days.map((day) => [day.date, day.minutes]));
		const firstYear = Number(data.overview.start.slice(0, 4));
		const lastYear = Number(data.overview.end.slice(0, 4));
		const monthLabels = [
			"Jan",
			"Feb",
			"Mar",
			"Apr",
			"May",
			"Jun",
			"Jul",
			"Aug",
			"Sep",
			"Oct",
			"Nov",
			"Dec",
		];
		const rows = [];

		for (let year = firstYear; year <= lastYear; year += 1) {
			const start = new Date(`${year}-01-01T00:00:00Z`);
			const end = new Date(`${year}-12-31T00:00:00Z`);
			const cells = Array.from({ length: start.getUTCDay() }, () => "<span></span>");

			for (
				let cursor = new Date(start);
				cursor <= end;
				cursor.setUTCDate(cursor.getUTCDate() + 1)
			) {
				const date = cursor.toISOString().slice(0, 10);
				if (date < data.overview.start || date > data.overview.end) {
					cells.push('<span class="daily-cell is-outside"></span>');
					continue;
				}

				const minutes = minutesByDate.get(date) || 0;
				const level =
					minutes === 0
						? 0
						: minutes < 30
							? 1
							: minutes < 90
								? 2
								: minutes < 180
									? 3
									: minutes < 360
										? 4
										: 5;
				const label = `${formatFullDate(date)}: ${formatNumber(minutes)} minutes`;
				cells.push(
					`<span class="daily-cell" data-level="${level}" title="${escapeHtml(
						label,
					)}"></span>`,
				);
			}

			rows.push(`
				<div class="daily-year">
					<h3>${year}</h3>
					<div>
						<div class="daily-month-labels">
							${monthLabels.map((month) => `<span>${month}</span>`).join("")}
						</div>
						<div class="daily-grid">${cells.join("")}</div>
					</div>
				</div>
			`);
		}

		calendar.innerHTML = rows.join("");
	};

	const init = async () => {
		try {
			const data =
				window.LISTENING_ATLAS_DATA ||
				(await fetch(DATA_URL).then((response) => {
					if (!response.ok) throw new Error(`Data request failed: ${response.status}`);
					return response.json();
				}));

			buildPlaces(data);
			buildYears(data);
			buildDaily(data);

			const months = data.months.map((month) => month.month);
			charts.push(
				new LineChart({
					canvas: document.querySelector("#artist-chart"),
					tooltip: document.querySelector("#artist-tooltip"),
					legend: document.querySelector("#artist-legend"),
					months,
					series: data.artistSeries.slice(0, 30),
					labelFor: (entry) => entry.artist,
				}),
				new LineChart({
					canvas: document.querySelector("#album-chart"),
					tooltip: document.querySelector("#album-tooltip"),
					legend: document.querySelector("#album-legend"),
					months,
					series: data.albumSeries.slice(0, 30),
					labelFor: (entry) => `${entry.album} — ${entry.artist}`,
				}),
				new LineChart({
					canvas: document.querySelector("#track-chart"),
					tooltip: document.querySelector("#track-tooltip"),
					legend: document.querySelector("#track-legend"),
					months,
					series: data.vocalTrackSeries.slice(0, 30),
					labelFor: (entry) => `${entry.track} — ${entry.artist}`,
				}),
			);

			window.addEventListener(
				"resize",
				() => charts.forEach((chart) => chart.draw()),
				{ passive: true },
			);
		} catch (error) {
			console.error(error);
			document.querySelector(".atlas-intro").insertAdjacentHTML(
				"afterbegin",
				'<p class="atlas-error">The listening summary could not be loaded.</p>',
			);
		}
	};

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();

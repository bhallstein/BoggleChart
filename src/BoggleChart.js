import bar_chart from './charts/bar';
import line_chart from './charts/line';
import pie_chart from './charts/pie';
import radar_chart from './charts/radar';

import helpers from './helpers';
import math from './math';


// createCanvas
// -----------------------------------

function createCanvas(el_container) {
	var el_canvas = document.createElement('canvas');

	var get_pixel_ratio = (function() {
		var testcanv = null;
		return function() {
			if (testcanv === null) {
				testcanv = document.createElement("canvas")
			}
			var c = testcanv.getContext('2d');
			var dpr = window.devicePixelRatio || 1;
			var bsr = c.webkitBackingStorePixelRatio ||
          c.mozBackingStorePixelRatio ||
          c.msBackingStorePixelRatio ||
          c.oBackingStorePixelRatio ||
          c.backingStorePixelRatio || 1;
			return dpr / bsr;
		};
	})();

	function setCanvasSize(canvas, w, h, pixel_ratio) {
    canvas.width  = w * pixel_ratio;
    canvas.height = h * pixel_ratio;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
		canvas.pixel_ratio = pixel_ratio;
	  // canvas.getContext('2d').setTransform(pixel_ratio, 0, 0, pixel_ratio, 0, 0);
		// canvas.getContext('2d').scale(pixel_ratio, pixel_ratio);
	}

	function handleResize(ev, suppress_onwards_event) {
		var computed_styles = getComputedStyle(el_container),
				containerW = parseInt(computed_styles.width),
				containerH = parseInt(computed_styles.height);
		if (!containerW || !containerH) return;
		setCanvasSize(el_canvas, containerW, containerH, get_pixel_ratio());
		if (!suppress_onwards_event) {
			el_canvas.dispatchEvent(new CustomEvent('BoggleChart:resize'));
		}
	}
	window.addEventListener('resize', handleResize);
	el_canvas.addEventListener('force_resize', function() { handleResize(null, true); });
	el_container.appendChild(el_canvas);
	setTimeout(handleResize, 0);

  return el_canvas;
}


export {
	createCanvas,
	helpers,
	math,

	bar_chart,
	line_chart,
	pie_chart,
	radar_chart,
};


import bar_chart from './charts/bar';
import line_chart from './charts/line';
import pie_chart from './charts/pie';
import radar_chart from './charts/radar';
import roadmap from './visualizations/roadmap';

import helpers from './helpers/helpers';
import math from './helpers/math';


// create_canvas
// -----------------------------------

function create_canvas(el_container) {
  const el_canvas = document.createElement('canvas');
  const test_canvas = document.createElement('canvas');

  function get_pixel_ratio() {
    const context = test_canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const bsr = (
      context.webkitBackingStorePixelRatio ||
      context.mozBackingStorePixelRatio ||
      context.msBackingStorePixelRatio ||
      context.oBackingStorePixelRatio ||
      context.backingStorePixelRatio || 1
    );
    return dpr / bsr;
  }

  function set_canvas_size(canvas, w, h, pixel_ratio) {
    canvas.width        = w * pixel_ratio;
    canvas.height       = h * pixel_ratio;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    canvas.pixel_ratio  = pixel_ratio;
  }

  function handle_resize(ev, suppress_onwards_event) {
    const s = getComputedStyle(el_container);
    const container_w = parseInt(s.width);
    const container_h = parseInt(s.height);

    if (container_w && container_h) {
      set_canvas_size(el_canvas, container_w, container_h, get_pixel_ratio());

      if (!suppress_onwards_event) {
        el_canvas.dispatchEvent(new CustomEvent('BoggleChart:resize'));
      }
    }
  }

  window.addEventListener('resize', ev => handle_resize(ev, false));
  el_canvas.addEventListener('force_resize', ev => handle_resize(null, true));

  el_container.appendChild(el_canvas);
  setTimeout(handle_resize, 0);

  return el_canvas;
}


export {
  create_canvas,
  helpers,
  math,

  bar_chart,
  line_chart,
  pie_chart,
  radar_chart,

  roadmap,
};


import helpers from '../helpers/helpers';
import math from '../helpers/math';


const default_opts = {
  stream_line_width: (g) => Math.min(8, g.h * 0.015),
  stream_title_fontsize: (g) => Math.min(18, g.h * 0.042),

  padding_h: 10,
};

const stream_defaults = {
  color: 'black',
};


function roadmap(el_canvas, streams, options) {
  const c = el_canvas.getContext('2d');
  let o;    // Current calculated options;


  // Events
  // ----------------------------------------------------------

  el_canvas.addEventListener('BoggleChart:resize', draw_all);
  function unbind() {
    el_canvas.removeEventListener('BoggleChart:resize', draw_all);
  }



  // Drawing
  // ----------------------------------------------------------

  function m(x) { return g.pr * x; }

  const g = {
    regen() {
      g.pr = el_canvas.pixel_ratio;
      g.w  = el_canvas.width;
      g.h  = el_canvas.height;
    },
  };


  function draw_streams() {
    const vertical_space_per_stream = g.h / streams.length;

    (streams || []).forEach((stream, i) => {
      const y = (i + 1) / (streams.length + 1) * g.h;
      const s = helpers.get_opts(stream_defaults, stream);

      // Titles
      if (stream.name) {
        c.beginPath();
        c.fillStyle = s.color;
        c.font = `400 ${m(o.stream_title_fontsize)}px Roboto`;
        c.textBaseline = 'bottom';
        c.textAlign = 'left';
        c.fillText(stream.name, o.padding_h, y - o.stream_title_fontsize/2);
        c.closePath();
      }

      // Main lines
      c.beginPath();
      c.strokeStyle = s.color;
      c.lineWidth = m(o.stream_line_width);
      c.lineCap = 'round';
      c.moveTo(o.padding_h, y);
      c.lineTo(g.w - o.padding_h, y);
      c.stroke();
      c.closePath();
    });
  }

  function draw_all() {
    g.regen();
    o = helpers.get_opts(default_opts, options, g);

    c.clearRect(0, 0, g.w, g.h);
    draw_streams();
  }


  return {

  };
}

export default roadmap;


import AnimQueue from '../helpers/anim-queue';
import helpers from '../helpers/helpers';
import math from '../helpers/math';


const default_opts = {
  min: 0,
  max: 100,
  step: (g, opts) => (opts.max - opts.min) / 5,

  x_axis:       true,
  x_axis_width: 1,
  x_axis_color: 'black',

  top_x_axis:       false,
  top_x_axis_width: 1,
  top_x_axis_color: 'black',

  y_axis:       true,
  y_axis_width: 1,
  y_axis_color: 'black',

  right_y_axis:       false,
  right_y_axis_width: 1,
  right_y_axis_color: 'black',

  labels_y:             true,
  labels_y_padding:     10,
  labels_y_fontsize:    (g) => 0.035 * g.h,
  labels_y_color:       'black',
  labels_y_labelOrigin: true,
  labels_y_labelMax:    true,
  labels_y_unit:        '',

  labels_x:          true,
  labels_x_padding:  (g) => 0.02 * g.h,
  labels_x_fontsize: (g) => 0.04 * g.h,
  labels_x_color:    'black',

  gridlines_x:       false,   // NB gridlines_x can be false while _ticks
  gridlines_x_ticks: false,   //    can be true
  gridlines_x_color: 'black',
  gridlines_x_width: 0.75,
  gridlines_x_style: 'solid',
  gridlines_x_divisor: null,

  gridlines_y:       false,
  gridlines_y_ticks: false,
  gridlines_y_color: 'black',
  gridlines_y_width: 0.75,
  gridlines_y_style: 'solid',

  interactions:                 false,
  hover_dropline_width:         1,
  hover_dropline_color:         'black',
  hover_value_background_color: '#ddd',
  hover_value_foreground_color: 'black',
  hover_value_draw_callback:    null,
};


function line_chart(el_canvas, data, options, category_labels) {
  const c = el_canvas.getContext('2d');


  // Line animation
  // ----------------------------------------------------------

  const animQueue = AnimQueue();
  animQueue.setDefaultDrawTask(draw_all);
  data.forEach(d => d.progress_points = 0);
  data.forEach(d => d.progress = 0);


  // Mouse events
  // ----------------------------------------------------------

  if (options.interactions) {
    el_canvas.addEventListener('mousemove', mouse_move);
    el_canvas.addEventListener('mouseenter', mouse_enter);
    el_canvas.addEventListener('mouseleave', mouse_leave);
  }
  let hover_x;  // NB relative to axis_frame.l
  function mouse_enter() { }
  function mouse_leave() {
    hover_x = null;
    animQueue.triggerDraw();
  }
  function mouse_move(ev) {
    const p = helpers.getOffset_canv(ev, el_canvas);
    hover_x = p.x - axis_frame.l;
    animQueue.triggerDraw();
  }
  function unbind() {
    el_canvas.removeEventListener('BoggleChart:resize', cb_drawall);
    el_canvas.removeEventListener('mousemove', mouse_move);
    el_canvas.removeEventListener('mouseenter', mouse_enter);
    el_canvas.removeEventListener('mouseleave', mouse_leave);
  }
  el_canvas.addEventListener('BoggleChart:resize', draw_all);


  // Options
  // ----------------------------------------------------------

  let o;   // Current calculated options
  function get_opts() {
    const opts = Object.assign({}, default_opts, options);

    // Process function options
    Object.keys(opts)
      .filter(k => typeof opts[k] === 'function')
      .forEach(k => opts[k] = opts[k](g, opts));

    return opts;
  }


  // Drawing
  // ----------------------------------------------------------

  function m(x) { return g.pr * x; }

  // Cache pixel ratio, canvas dimensions for convenience/performance
  const g = {
    pr: null,
    w:  null,
    h:  null,

    regen: function() {
      g.pr = el_canvas.pixel_ratio,
      g.w = el_canvas.width;
      g.h = el_canvas.height;
    },
  };

  const axis_frame = {
    regen: function() {
      axis_frame.l = max_label_width() + o.labels_y_padding + label_padding_left();
      axis_frame.r = m(4);
      axis_frame.b = btm_section_height();
      axis_frame.t = top_section_height();
    },
  };


  // helpers

  function set_y_label_font() {
    const fontsize = Math.min(0.048 * g.h, m(17));
    c.font = '200 ' + fontsize + 'px Roboto';
    c.textBaseline = 'middle';
    c.textAlign = 'end';
  }

  function max_label_width() {
    set_y_label_font();

    let max = 0;
    for (let i = o.min; i <= o.max; i += o.step) {
      const txt = i.toString() + o.labels_y_unit;
      max = Math.max(max, c.measureText(txt).width);
    }

    return max;
  }

  function label_padding_left() {
    return o.labels_y_padding * 0.5;
  }

  function btm_section_height() {
    return o.labels_x ? o.labels_x_fontsize * 2 : m(2);
  }

  function top_section_height() {
    return (o.labels_y && o.labels_y_labelMax) ? o.labels_y_fontsize : m(2);
  }


  function draw_axes() {
    const y1 = g.h - axis_frame.b;
    const x1 = axis_frame.l;
    const x2 = g.w - axis_frame.r;
    const y2 = axis_frame.t;

    if (o.x_axis) {
      c.beginPath();
      c.moveTo(x1, y1);
      c.strokeStyle = o.x_axis_color;
      c.lineWidth = o.x_axis_width;
      c.lineTo(x2, y1);
      c.stroke();
    }

    if (o.top_x_axis) {
      c.beginPath();
      c.moveTo(x1, y2);
      c.strokeStyle = o.top_x_axis_color;
      c.lineWidth = o.top_x_axis_width;
      c.lineTo(x2, y2);
      c.stroke();
    }

    if (o.y_axis) {
      c.beginPath();
      c.moveTo(x1, y1);
      c.strokeStyle = o.y_axis_color;
      c.lineWidth = o.y_axis_width;
      c.lineTo(x1, y2);
      c.stroke();
    }

    if (o.right_y_axis) {
      c.beginPath();
      c.moveTo(x2, y1);
      c.strokeStyle = o.right_y_axis_color;
      c.lineWidth = o.right_y_axis_width;
      c.lineTo(x2, y2);
      c.stroke();
    }
  }


  function draw_valueLabels() {
    if (!o.labels_y) {
      return;
    }

    const h         = g.h - axis_frame.t - axis_frame.b;
    const increment = o.step * h / (o.max - o.min);
    const x         = axis_frame.l - o.labels_y_padding;

    set_y_label_font();
    c.textBaseline = 'middle';
    c.textAlign    = 'end';
    c.fillStyle    = o.labels_y_color;

    const min = o.labels_y_labelOrigin ? o.min : o.min + o.step;
    const max = o.labels_y_labelMax ? o.max : o.max - o.step;

    for (let i = min; i <= max; i += o.step) {
      const txt = i.toString() + o.labels_y_unit;

      const y_rel = (i - o.min) / (o.max - o.min);
      const y = g.h - axis_frame.b - h + (1 - y_rel) * h;

      c.fillText(txt, x, y);
    }
  }


  function draw_categoryLabels() {
    if (!o.labels_x) {
      return;
    }

    c.beginPath();
    c.fillStyle = o.labels_x_color;

    c.font = '400 ' + o.labels_x_fontsize + 'px Roboto';
    c.textBaseline = 'top';
    c.textAlign = 'center';

    const w = g.w - axis_frame.l - axis_frame.r;
    const h_increment = w / (data[0].data.length - 1);
    const y = g.h - 1.5 * o.labels_x_fontsize;

    let labels;
    if (typeof category_labels === 'function') {
      labels = data[0].data
        .slice(0)
        .map((_, i) => category_labels(i));
    }
    else {
      labels = category_labels.slice(0);
    }

    labels.filter(x => !!x).forEach((lbl, i) => {
      const x = axis_frame.l + i * h_increment;
      c.moveTo(x, y);
      c.fillText(lbl, x, y);
    });
  }


  function draw_gridlines() {
    if (o.gridlines_y || o.gridlines_y_ticks) {
      function draw_gridlines_y(x_left, x_right, dashed) {
        c.beginPath();
        c.lineWidth   = o.gridlines_y_width;
        c.strokeStyle = o.gridlines_y_color;
        if (dashed) {
          c.setLineDash([ m(2), m(5), ]);
        }

        const h         = g.h - axis_frame.t - axis_frame.b;
        const increment = o.step * h / (o.max - o.min);
        const max       = o.top_x_axis ? o.max - 1 : o.max;

        let y = g.h - axis_frame.b;
        for (let i = o.min + o.step; i <= max; i += o.step) {
          y -= increment;
          c.moveTo(x_left, y);
          c.lineTo(x_right, y);
        }

        c.stroke();
        c.setLineDash([]);
      }

      if (o.gridlines_y_ticks) {
        draw_gridlines_y(axis_frame.l - m(6), axis_frame.l, false);
      }
      if (o.gridlines_y) {
        draw_gridlines_y(g.w - axis_frame.r, axis_frame.l, o.gridlines_y_style === 'dashed');
      }
    }

    if (o.gridlines_x || o.gridlines_x_ticks) {
      function draw_gridlines_x(y_btm, y_top, dashed) {
        c.beginPath();
        c.lineWidth   = o.gridlines_x_width;
        c.strokeStyle = o.gridlines_x_color;
        if (dashed) {
          c.setLineDash([ m(2), m(5) ]);
        }

        const w         = g.w - axis_frame.l - axis_frame.r;
        const increment = w / (data[0].data.length - 1);
        const min       = o.y_axis ? 1 : 0;
        const max       = o.right_y_axis ? 2 : 1;

        for (let i = min; i <= data[0].data.length - max; ++i) {
          if (o.gridlines_x_divisor && i%gridlines_x_divisor !== 0) {
            continue;
          }
          const x = axis_frame.l + increment * i;
          c.moveTo(x, y_btm);
          c.lineTo(x, y_top);
        }
        c.stroke();
        c.setLineDash([]);
      }

      if (o.gridlines_x_ticks) {
        draw_gridlines_x(g.h - axis_frame.b + m(6), g.h - axis_frame.b, false);
      }
      if (o.gridlines_x) {
        draw_gridlines_x(g.h - axis_frame.b, axis_frame.t, o.gridlines_x_style === 'dashed');
      }
    }
  }


  function draw_dataLine(line) {
    const line_width = m(line.lineWidth || 1.75);
    c.lineWidth = line_width;

    const d         = line.data;
    const w         = g.w - axis_frame.l - axis_frame.r;
    const increment = w / (d.length - 1);
    let cur_x       = axis_frame.l;
    const tension   = line.tension || 0.32;

    function ny(y) {
      const y_range = g.h - axis_frame.t - axis_frame.b;
      const y_norm = y / o.max * y_range;
      return g.h - axis_frame.b - y_norm;
    }

    // Lines
    if (line.drawLines !== false) {
      c.beginPath();
      c.strokeStyle = line.color || 'black';

      const arr = d.reduce((accum, di, i) => {
        accum.push(axis_frame.l + i * increment, ny(di));
        return accum;
      }, [ ]);

      const line_segments = math.bezCurve(c, arr, tension);
      const top_clip =
        axis_frame.t +
        (o.top_x_axis ? o.top_x_axis_width/2 : 0) +
        line_width/2;

      for (let i = 0, l = line_segments.length * line.progress/100; i < l; i += 2) {
        c.lineTo(line_segments[i], Math.max(line_segments[i+1], top_clip));
      }
      c.stroke();
    }

    // Points
    if (line.drawPoints) {
      c.beginPath();
      c.fillStyle = line.pointColor || 'black';
      c.globalAlpha = line.progress_points / 100;
      cur_x = axis_frame.l;
      for (let i = 0; i < d.length; ++i, cur_x += increment) {
        const y = ny(d[i]);
        c.moveTo(cur_x, y);
        c.arc(cur_x, y, m(line.pointRadius || 3.5), 0, 2*Math.PI);
      }
      c.fill();
      c.globalAlpha = 1;
    }
  }


  function draw_hover() {
    if (!hover_x) {
      return;
    }

    // Lock position to x value corresponding to horizontally-nearest data point
    const d      = data[0].data;
    const w      = g.w - axis_frame.l - axis_frame.r;
    const x_norm = hover_x / w;
    const x_ind  = parseInt(x_norm * (d.length - 1) + 0.5);

    if (x_ind < 0 || x_ind >= d.length) {
      return;
    }

    const value = d[x_ind];

    // Semitransparent overlay
    const rx = axis_frame.l;
    const ry = axis_frame.t;
    const rw = x_ind * w / (d.length - 1);
    const rh = g.h - axis_frame.t - axis_frame.b;
    c.beginPath();
    c.fillStyle = 'rgba(0,0,255,0.1)';
    c.rect(rx, ry, rw, rh);
    c.fill();

    // Vertical drop-line
    const x  = axis_frame.l + rw;
    const y1 = g.h - axis_frame.b;
    const y2 = 0;

    c.beginPath();
    c.lineWidth   = o.hover_dropline_width;
    c.strokeStyle = o.hover_dropline_color;
    c.moveTo(x, y1);
    c.lineTo(x, y2);
    c.stroke();

    // // Value
    const vx = x + o.hover_dropline_width/2;
    const vy = y2;
    if (typeof o.hover_value_draw_callback === 'function') {
      o.hoverValueDraw_callback(c, x_ind, vx, vy, g.w, g.h, g.pr);
    }
    else {
      const fontsize = Math.min(0.08 * g.h, m(15));
      c.font = '400 ' + fontsize + 'px Roboto';
      c.textBaseline = 'top';
      c.textAlign = 'start';
      const v_hpad = m(8);
      const v_vpad = m(4);
      const lbl    = math.format_number(value, 0);
      const txt_sz = c.measureText(lbl);
      const vw     = txt_sz.width + m(v_hpad);
      const vh     = fontsize + v_vpad;

        let _vx = vx;
      if (vx + vw >= axis_frame.l + w + axis_frame.r - m(3)) {
        _vx -= vw + o.hover_dropline_width;
      }

      c.beginPath();
      c.fillStyle = o.hover_value_background_color;
      c.rect(_vx, vy, vw, vh);
      c.fill();

      c.fillStyle = o.hover_value_foreground_color;
      c.fillText(lbl, _vx + v_hpad/2, vy + v_vpad/2);
    }
  }


  function draw_frame() {
    c.clearRect(0, 0, g.w, g.h);

    draw_gridlines(data, options);
    draw_axes(data, options);
    draw_valueLabels();
    draw_categoryLabels();
  }


  function draw_all() {
    g.regen();
    o = get_opts();
    axis_frame.regen();

    el_canvas.dispatchEvent(new CustomEvent('force_resize'));

    draw_frame();
    data.forEach(line => draw_dataLine(line));
    draw_hover();
  }


  function animTask_drawLine(line) {
    let n = 0;

    return function() {
      n = Math.min(n + 3, 100);
      line.progress = n;
      draw_all();

      if (n === 100) {
        animQueue.finishTask();
      }
    };
  }


  function animTask_drawPoints(line) {
    let n = 0;

    return function() {
      n = Math.min(n + 7, 100);
      line.progress_points = n;
      draw_all();

      if (n === 100) {
        animQueue.finishTask();
      }
    };
  }


  function draw() {
    animQueue.reset();

    data.forEach(line => {
      if (line.drawPoints && line.animPoints) {
        animQueue.add(animTask_drawPoints(line));
      }
      animQueue.add(animTask_drawLine(line));
    });

    animQueue.start();
  }


  return {
    draw,
    drawFrame: function() {
      el_canvas.dispatchEvent(new CustomEvent('force_resize'));
      draw_frame();
    },
    tearDown: function() {  // Give the garbage collector a fighting chance
      unbind();
      animQueue.reset();
      animQueue = null;
      el_canvas = null;
      c = null;
    },
  };
}

export default line_chart;


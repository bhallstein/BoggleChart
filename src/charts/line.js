import AnimQueue from '../helpers/anim-queue';
import helpers from '../helpers/helpers';
import math from '../helpers/math';
import draw from '../helpers/draw';


const default_opts = {
  min: 0,
  max: 100,
  step: (g, opts) => (opts.max - opts.min) / 5,

  x_axis:             true,
  x_axis_width:       1,
  x_axis_color:       'black',
  x_axis_extend_left: false,

  top_x_axis:       false,
  top_x_axis_width: 1,
  top_x_axis_color: 'black',

  y_axis:       true,
  y_axis_width: 1,
  y_axis_color: 'black',

  y_axis_name:          false,    // false or string
  y_axis_name_fontsize: 12,
  y_axis_name_color:    'black',
  y_axis_name_padding:  20,

  right_y_axis:       false,
  right_y_axis_width: 1,
  right_y_axis_color: 'black',

  labels_x:              true,
  labels_x_padding:      12,
  labels_x_fontsize:     12,
  labels_x_color:        'black',
  labels_x_every:        1,
  labels_x_every_offset: 0,
  labels_x_origin:       true,

  labels_y:          true,
  labels_y_padding:  12,
  labels_y_fontsize: 12,
  labels_y_color:    'black',
  labels_y_origin:   true,
  labels_y_max:      true,
  labels_y_unit:     '',

  gridlines_x:         false,   // NB gridlines_x can be false while _ticks
  gridlines_x_ticks:   false,   //    is true - they're drawn separately
  gridlines_x_color:   'black',
  gridlines_x_width:   0.75,
  gridlines_x_style:   'solid',  // 'solid', 'dashed', or [ Number, Number, ... ]
  gridlines_x_divisor: null,

  gridlines_y:       false,
  gridlines_y_ticks: false,     // NB drawn separately as with gridlines_x
  gridlines_y_color: 'black',
  gridlines_y_width: 0.75,
  gridlines_y_style: 'solid',   // 'solid', 'dashed', or [ Number, Number, ... ]

  legend:          false,
  legend_fontsize: 12,
  legend_color:    'black',

  interactions:                 false,
  hover_dropline_width:         1,
  hover_dropline_color:         'black',
  hover_value_background_color: '#ddd',
  hover_value_foreground_color: 'black',
  hover_value_draw_callback:    null,

  __function_opts_not_to_process_as_functions: [
    'hover_value_draw_callback',
  ],
};


function line_chart(el_canvas, data, options, category_labels) {
  const c = el_canvas.getContext('2d');
  let o;   // Current calculated options


  // Line animation
  // ----------------------------------------------------------

  const animQueue = AnimQueue();
  animQueue.setDefaultDrawTask(draw_all);
  data.forEach(d => d.progress_points = 0);
  data.forEach(d => d.progress = 0);


  // Events
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
    const p = helpers.get_offset_in_canvas(ev, el_canvas);
    hover_x = p.x - axis_frame.l;
    animQueue.triggerDraw();
  }
  function unbind() {
    el_canvas.removeEventListener('BoggleChart:resize', draw_all);
    el_canvas.removeEventListener('mousemove', mouse_move);
    el_canvas.removeEventListener('mouseenter', mouse_enter);
    el_canvas.removeEventListener('mouseleave', mouse_leave);
  }
  el_canvas.addEventListener('BoggleChart:resize', draw_all);


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

  const axis_frame = {
    regen() {
      axis_frame.l =
        line_chart.max_label_width(c, g, o) +
        o.labels_y_padding +
        line_chart.label_padding_left(o) +
        line_chart.y_axis_name_width(o, g);
      axis_frame.r = m(2);
      axis_frame.w = g.w - axis_frame.l - axis_frame.r;

      axis_frame.b = line_chart.btm_section_height(o, g);
      axis_frame.t = line_chart.top_section_height(c, g, axis_frame, o, data);
      axis_frame.h = g.h - axis_frame.t - axis_frame.b;
    },
  };


  function draw_labels_x() {
    if (!o.labels_x) {
      return;
    }

    const w           = g.w - axis_frame.l - axis_frame.r;
    const h_increment = w / (data[0].data.length - 1);
    const y           = g.h - 0.8 * m(o.labels_x_fontsize);
    const font        = `400 ${m(o.labels_x_fontsize)}px Roboto`;

    let labels;
    if (typeof category_labels === 'function') {
      labels = data[0].data.map((_, i) => [i, category_labels(i)]);
    }
    else {
      labels = (category_labels || [ ]).map((label, i) => [i, label]);
    }

    labels.filter(x => !!x[1]).forEach(item => {
      const i = item[0];

      if (i === 0 && !o.labels_x_origin) {
        return;
      }

      if ((i - o.labels_x_every_offset)%o.labels_x_every === 0) {
        const label = item[1];
        const x = axis_frame.l + i * h_increment;
        draw.text(c, label, x, y, o.labels_x_color, font, 'center', 'middle');
      }
    });
  }


  function draw_series_line(line) {
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
    if (line.draw_lines !== false) {
      c.beginPath();
      c.strokeStyle = line.color || 'black';

      const arr = d.reduce((accum, di, i) => {
        accum.push(axis_frame.l + i * increment, ny(di));
        return accum;
      }, [ ]);

      const line_segments = math.bezier_curve(c, arr, tension);
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
    if (line.draw_points) {
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
    draw.line(c, x, y1, x, y2, o.hover_dropline_color, o.hover_dropline_width);

    // Value
    const vx = x + o.hover_dropline_width/2;
    const vy = y2;
    if (typeof o.hover_value_draw_callback === 'function') {
      o.hover_value_draw_callback(c, x_ind, vx, vy, g.w, g.h, g.pr);
    }
    else {
      const fontsize = Math.min(0.08 * g.h, m(15));
      c.font         = `400 ${fontsize}px Roboto`;
      c.textBaseline = 'top';
      c.textAlign    = 'left';
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


  function draw_all() {
    g.regen();
    o = helpers.get_opts(default_opts, options, g);
    axis_frame.regen();

    el_canvas.dispatchEvent(new CustomEvent('force_resize'));

    c.clearRect(0, 0, g.w, g.h);

    line_chart.draw_gridlines(c, g, axis_frame, o, data);
    line_chart.draw_axes(c, g, axis_frame, o);
    line_chart.draw_labels_y(c, g, axis_frame, o);
    line_chart.draw_y_axis_name(c, g, axis_frame, o);
    draw_labels_x();
    data.forEach(draw_series_line);
    draw_hover();
    line_chart.draw_legend(c, g, axis_frame, o, data);
  }


  function animtask__line(line) {
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


  function animtask__points(line) {
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


  function do_draw() {
    animQueue.reset();

    data.forEach(line => {
      if (line.draw_points) {
        if (line.animate_points) { animQueue.add(animtask__points(line)); }
        else                     { line.progress_points = 100; }
      }

      if (line.draw_line !== false) {
        if (line.animate_line) { animQueue.add(animtask__line(line)); }
        else                   { line.progress = 100; }
      }
    });

    animQueue.start();
  }


  return {
    draw: do_draw,
    drawFrame() {
      el_canvas.dispatchEvent(new CustomEvent('force_resize'));
      draw_frame();
    },
    tearDown() {  // Give the garbage collector a fighting chance
      unbind();
      animQueue.reset();
      animQueue = null;
      el_canvas = null;
      c = null;
    },
  };
}


// Functions for sharing with bar chart
// ----------------------------------------------------------

// helpers

line_chart.max_label_width = function(c, g, o) {
  line_chart.set_y_label_font(c, g, o);

  let max = 0;
  for (let i = o.min; i <= o.max; i += o.step) {
    const txt = i.toString() + o.labels_y_unit;
    max = Math.max(max, c.measureText(txt).width);
  }

  return max;
};

line_chart.label_padding_left = function(o) {
  return o.labels_y_padding * 0.5;
};

line_chart.btm_section_height = function(o, g) {
  return g.pr * (o.labels_x ? o.labels_x_fontsize * 2 : 2);
};

line_chart.top_section_height = function(c, g, axis_frame, o, data) {
  let h = g.pr * 2;

  const has_top_label = o.labels_y && o.labels_y_max;
  const has_top_legend = o.legend;

  if (has_top_label) {
    h += o.labels_y_fontsize * g.pr;
  }
  if (has_top_legend) {
    h += line_chart.draw_legend(c, g, axis_frame, o, data, true).height;
  }

  return h;
};

line_chart.y_axis_name_width = function(o, g) {
  return o.y_axis_name ? g.pr * (1.5 * o.y_axis_name_fontsize + o.y_axis_name_padding) : 0;
};

line_chart.get_y_label_font = function(c, g, o) {
  const fontsize = g.pr * Math.min(o.labels_y_fontsize, 17);
  return `400 ${fontsize}px Roboto`;
};

line_chart.set_y_label_font = function(c, g, o) {
  c.font = line_chart.get_y_label_font(c, g, o);
  c.textBaseline = 'middle';
  c.textAlign = 'end';
};


// Drawing

line_chart.draw_axes = function(c, g, axis_frame, o) {
  const y1   = g.h - axis_frame.b;
  const x1_x = o.x_axis_extend_left ? 0 : axis_frame.l;
  const x1_y = axis_frame.l;
  const x2   = g.w - axis_frame.r;
  const y2   = axis_frame.t;

  if (o.x_axis) {
    draw.line(c, x1_x, y1, x2, y1, o.x_axis_color, o.x_axis_width);
  }

  if (o.top_x_axis) {
    draw.line(c, x1_x, y2, x2, y2, o.top_x_axis_color, o.top_x_axis_width);
  }

  if (o.y_axis) {
    draw.line(c, x1_y, y1, x1_y, y2, o.y_axis_color, o.y_axis_width);
  }

  if (o.right_y_axis) {
    draw.line(c, x2, y1, x2, y2, o.right_y_axis_color, o.right_y_axis_width);
  }
};


function dash_style(d, g) {
  if (d.constructor === Array) {
    return d.map(i => i * g.pr);
  }
  if (d === 'dashed') {
    return [ 2 * g.pr, 5 * g.pr ];
  }
  return [ ];
}


line_chart.draw_gridlines = function(c, g, axis_frame, o, data) {
  const m = (x) => g.pr * x;

  function draw_gridlines_y(x_left, x_right, dash) {
    const h         = g.h - axis_frame.t - axis_frame.b;
    const increment = o.step * h / (o.max - o.min);
    const max       = o.top_x_axis ? o.max - 1 : o.max;
    const d         = dash_style(dash, g);

    let y = g.h - axis_frame.b;
    for (let i = o.min + o.step; i <= max; i += o.step) {
      y -= increment;
      draw.line(c, x_left, y, x_right, y, o.gridlines_y_color, o.gridlines_y_width, null, d);
    }
  }

  function draw_gridlines_x(y_btm, y_top, dash) {
    const w         = g.w - axis_frame.l - axis_frame.r;
    const increment = w / (data[0].data.length - 1);
    const min       = o.y_axis && !o.x_axis_extend_left ? 1 : 0;
    const max       = o.right_y_axis ? 2 : 1;
    const d         = dash_style(dash, g);

    for (let i = min; i <= data[0].data.length - max; ++i) {
      if (o.gridlines_x_divisor && i%o.gridlines_x_divisor !== 0) {
        continue;
      }
      const x = axis_frame.l + increment * i;
      draw.line(c, x, y_btm, x, y_top, o.gridlines_x_color, o.gridlines_x_width, null, d);
    }
  }

  if (o.gridlines_y || o.gridlines_y_ticks) {
    if (o.gridlines_y_ticks) {
      draw_gridlines_y(axis_frame.l - m(6), axis_frame.l, false);
    }
    if (o.gridlines_y) {
      draw_gridlines_y(g.w - axis_frame.r, axis_frame.l, o.gridlines_y_style);
    }
  }

  if (o.gridlines_x || o.gridlines_x_ticks) {
    if (o.gridlines_x_ticks) {
      draw_gridlines_x(g.h - axis_frame.b + m(6), g.h - axis_frame.b, false);
    }
    if (o.gridlines_x) {
      draw_gridlines_x(g.h - axis_frame.b, axis_frame.t, o.gridlines_x_style);
    }
  }
};


line_chart.draw_labels_y = function(c, g, axis_frame, o) {
  if (!o.labels_y) {
    return;
  }

  const h         = g.h - axis_frame.t - axis_frame.b;
  const increment = o.step * h / (o.max - o.min);
  const x         = axis_frame.l - o.labels_y_padding;
  const font      = line_chart.get_y_label_font(c, g, o);

  const min = o.labels_y_origin ? o.min : o.min + o.step;
  const max = o.labels_y_max ? o.max : o.max - o.step;

  for (let i = min; i <= max; i += o.step) {
    const y_rel = (i - o.min) / (o.max - o.min);
    const y = g.h - axis_frame.b - h + (1 - y_rel) * h;

    const txt = i.toString() + o.labels_y_unit;
    draw.text(c, txt, x, y, o.labels_y_color, font, 'end', 'middle');
  }
};


line_chart.draw_y_axis_name = function(c, g, axis_frame, o) {
  if (!o.y_axis_name) {
    return;
  }

  const fs   = g.pr * o.y_axis_name_fontsize;
  const x    = 1.25 * fs;
  const y    = g.h - axis_frame.b - axis_frame.h/2;
  const font = `400 ${fs}px Roboto`;

  c.save();
  c.translate(x, y);
  c.rotate(-Math.PI/2);

  draw.text(c, o.y_axis_name, 0, 0, o.y_axis_name_color, font, 'center', 'middle');
  c.restore();
};


line_chart.draw_legend = function(c, g, axis_frame, o, data, measure_rows) {
  if (!o.legend) {
    return;
  }

  const w = axis_frame.w;
  const font = `400 ${g.pr * o.legend_fontsize}px Roboto`;
  const half_fs = g.pr * o.legend_fontsize / 2;
  const legend_item_spacing = g.pr * o.legend_fontsize * 1.9;
  const legend_icon_size    = g.pr * o.legend_fontsize * 0.6;
  const legend_icon_spacing = g.pr * o.legend_fontsize * 0.9;
  const legend_v_spacing    = g.pr * o.legend_fontsize * 1.6;

  function item_width(item) {
    return draw.text(c, item.title, g.w/2, g.h/2, o.legend_color, font, 0, 0, true).width + legend_icon_size + legend_icon_spacing;
  }

  data.forEach(item => item.__width = item_width(item));


  // Get legend item positions - flow them into the available space, right-aligned
  const rows = data.reduce((rows, item) => {
    const cur_line = rows[rows.length - 1];
    const cur_line_width =
      cur_line.reduce((carry, item) => (carry + item.__width + legend_item_spacing), 0) -
      (cur_line.length ? legend_item_spacing : 0);

    const would_overflow = cur_line_width + legend_item_spacing + item.__width >= w;

    if (would_overflow) {
      rows.push([ item ]);
    }
    else {
      cur_line.push(item);
    }

    return rows;
  }, [ [] ]);

  if (measure_rows) {
    return {
      height: rows.length * legend_v_spacing,
    };
  }

  rows.forEach((row, i_row) => {
    let x_offset = 0;
    const y = i_row * legend_v_spacing;
    const rrow = row.slice(0).reverse();

    rrow.forEach((item, i) => {
      const x = g.w - axis_frame.r - x_offset - item.__width;
      item.__legend_x = x;
      item.__legend_y = y;

      x_offset += item.__width + legend_item_spacing;
    });
  });

  data.forEach(item => {
    const x = item.__legend_x;
    const y = item.__legend_y;

    draw.circle(c, x + half_fs, y + half_fs, legend_icon_size/2, item.color);
    draw.text(c, item.title, x + legend_icon_spacing + legend_icon_size, y, o.legend_color, font, 'left', 'top');
  });
};


export default line_chart;


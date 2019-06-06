import anim_queue from '../helpers/anim-queue';
import helpers from '../helpers/helpers';
import math from '../helpers/math';
import draw from '../helpers/draw';
import line_chart from './line';


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

  right_y_axis:       false,
  right_y_axis_width: 1,
  right_y_axis_color: 'black',

  labels_x:          true,
  labels_x_padding:  (g) => 0.02 * g.h,
  labels_x_fontsize: (g) => 0.04 * g.h,
  labels_x_color:    'black',

  labels_y:             true,
  labels_y_padding_l:   10,
  labels_y_padding_r:   10,
  labels_y_fontsize:    (g) => 0.035 * g.h,
  labels_y_color:       'black',
  labels_y_labelOrigin: true,
  labels_y_labelMax:    true,
  labels_y_unit:        '',

  gridlines_y:       false,     // NB gridlines can be false while _ticks
  gridlines_y_ticks: false,     //    is true
  gridlines_y_color: 'black',
  gridlines_y_width: 0.75,
  gridlines_y_style: 'solid',

  bar_width: 0.03,
  bar_spacing: 0.02,
};


function bar_chart(el_canvas, data, options, category_labels) {
  const c = el_canvas.getContext('2d');
  let o;   // Current calculated options


  // Bars animation queue
  // ----------------------------------------------------------

  const animQueue = anim_queue();
  animQueue.setDefaultDrawTask(draw_all);


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
      g.pr = el_canvas.pixel_ratio,
      g.w  = el_canvas.width;
      g.h  = el_canvas.height;
    },
  };

  const axis_frame = {
    regen() {
      axis_frame.l = line_chart.max_label_width(c, g, o) +
        m(o.labels_y_padding_l) +
        m(o.labels_y_padding_r);
      axis_frame.r = m(4);
      axis_frame.b = line_chart.btm_section_height(o, g);
      axis_frame.t = line_chart.top_section_height(c, g, axis_frame, o, data);
    },
  };

  const highlight = {
    item: null,
    progress: null,
  };


  function draw_categories() {
    let n = data.length;                // n is the number of categories
    let m = data[0].data.length;        // m is the number of items
    let b = o.bar_width;                // b is the width of a bar
    let s = o.bar_spacing;              // s is the spacing between bars within items
    let q = n*b + (n-1)*s;              // q is the total width of an item group
    let a = (1 - m*q) / m;              // a is the space between item groups
    let usable_width  = g.w - axis_frame.l - axis_frame.r;
    let usable_height = g.h - axis_frame.b - axis_frame.t;
    const min_alpha = 0.3;

    b *= usable_width;
    s *= usable_width;
    q *= usable_width;
    a *= usable_width;

    for (let i = 0, _i = 0; i < data.length; ++i) {
      const cat = data[i];
      const cat_data = cat.data;
      const line_w = (cat.outlineWidth || 1) * g.pr;
      let alpha;

      if (highlight.item === null)   { alpha = 1; }
      else if (highlight.item === i) { alpha = 1; }
      else                           { alpha = (1 - highlight.progress) * (1 - min_alpha) + min_alpha; }

      c.beginPath();
      c.globalAlpha = alpha;
      c.fillStyle   = cat.color || 'black';
      c.strokeStyle = cat.outline || 'black';
      c.lineWidth   = line_w;
      for (let j = 0; j < cat_data.length; ++j, ++_i) {
        const value = cat_data[j];
        const x = (a/2 + j*(q + a) + i*(b + s)) + line_w/2 + axis_frame.l;
        const h = value / options.max * usable_height;
        const w = b - line_w;
        const y = g.h - axis_frame.b - h - line_w/2;
        c.rect(x, y, w, h + line_w/4);
      }
      c.fill();
      c.stroke();
      c.closePath();
    }
    c.globalAlpha = 1;
  }

  function draw_labels_x() {
    if (!o.labels_x) {
      return;
    }

    const font = `400 ${o.labels_x_fontsize}px Roboto`;
    const y    = g.h - 1.5 * o.labels_x_fontsize;

    const n = data.length;          // n is the number of categories
    const m = data[0].data.length;  // m is the number of items
    for (let i = 0; i < category_labels.length; ++i) {
      const b = o.bar_width;
      const s = o.bar_spacing;
      const q = n*b + (n-1)*s;  // q is the total width of an item group
      const a = (1 - m*q) / m;  // a is the space between item groups

      let x = a/2 + a*i + q*(i+1/2);
      x = x * (g.w - axis_frame.l - axis_frame.r) + axis_frame.l;

      draw.text(c, category_labels[i], x, y, o.labels_x_color, font, 'center', 'top');
    }
  }


  function draw_all() {
    g.regen();
    o = helpers.get_opts(default_opts, options, g);
    axis_frame.regen();

    c.clearRect(0, 0, g.w, g.h);

    line_chart.draw_gridlines(c, g, axis_frame, o);
    draw_categories();
    line_chart.draw_axes(c, g, axis_frame, o);

    draw_labels_x();
    line_chart.draw_labels_y(c, g, axis_frame, o);
  }


  // Animation tasks
  // ----------------------------------------------------------

  function animtask__from_zero() {
    const data_new = data;
    data = helpers.clone(data).map(item => {  // zero out current data
      item.data = item.data.map(x => 0);
      return item;
    });

    return animtask__new_values(data_new);
  }


  function animtask__new_values(new_categories, fn_easing) {
    fn_easing = fn_easing || math.ease_out_cubic_simple;

    let frame = 0;
    const t = 60;      // duration of an individual segment animation
    const n_segments = data.length * data[0].data.length;
    const overlap = (n_segments*t - 100) / (n_segments - 1);

    const data_prev = helpers.clone(data);
    const data_new = helpers.clone(data).map((item, i) => {
      item.data = helpers.clone(new_categories[i].data);
      return item;
    });

    return function() {
      frame = Math.min(frame + 4, 100);

      let i = 0;
      for (let i_cat = 0; i_cat < data.length; ++i_cat) {
        const cat = data[i_cat].data;
        const cat_orig = data_prev[i_cat].data;
        const cat_new = data_new[i_cat].data;

        for (let i_value = 0; i_value < cat.length; ++i_value, ++i) {
          const t_start = i * (t - overlap);
          const t_end = t_start + t;
          const progress = math.clamp((frame - t_start) / t, 0, 1);
          const progress_eased = fn_easing(progress);
          const delta = (cat_new[i_value] - cat_orig[i_value]);

          cat[i_value] = delta * progress_eased + cat_orig[i_value];
        }
      }

      draw_all();
      if (frame >= 100) {
        animQueue.finishTask();
      }
    };
  }


  function animtask__highlight(ind) {
    let frame = 0;
    const is_removing = (ind === -1);

    return function() {
      frame = Math.min(frame + 5, 100);
      highlight.item = is_removing ? highlight.item : ind;

      const t = math.ease_out_cubic_simple(frame / 100);
      highlight.progress = is_removing ? 1 - t : t;

      if (frame >= 100) {
        highlight.progress = 1;
        if (is_removing) {
          highlight.item = null;
        }
        animQueue.finishTask();
      }
      draw_all();
    };
  }


  return {
    draw() {
      animQueue.add(animtask__from_zero());
      animQueue.start();
    },
    update_data(new_categories) {
      if (new_categories.length != data.length) {
        console.log('BarChart.update_data() - wrong number of new_categories');
        return;
      }
      animQueue.add(animtask__new_values(new_categories, math.ease_in_out_cubic_simple));
      animQueue.start();
    },
    set_highlight(title) {
      const ind = helpers.find(data, item => item.title === title)
      animQueue.add(animtask__highlight(ind));
      animQueue.start();
    },
    tear_down() {
      unbind();
      animQueue.reset();
      animQueue = null;
      el_canvas = null;
      c = null;
    },
  };
}

export default bar_chart;


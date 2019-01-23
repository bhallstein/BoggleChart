import anim_queue from '../helpers/anim-queue';
import helpers from '../helpers/helpers';
import math from '../helpers/math';
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

  gridlines_y:       false,     // NB gridlines can be false while _ticks
  gridlines_y_ticks: false,     //    is true
  gridlines_y_color: 'black',
  gridlines_y_width: 0.75,
  gridlines_y_style: 'solid',

  bar_width: 0.03,
  bar_spacing: 0.02,
};


function bar_chart(el_canvas, data, options, category_labels) {
  var c = el_canvas.getContext('2d');
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

  var dvals = {
    highlighted_item: null,
    highlight_progress: null,

    labelROffset: function() {
      return 4 * g.pr;
    },

    axisColour_x: function() {
      return options.axisColorX || 'black';
    },
    axisColour_xtop: function() {
      return options.axisColorXTop || 'black';
    },

    axisWidth_x: function() {
      return (options.axisWidthX || 1) * g.pr;
    },
    axisWidth_xtop: function() {
      return (options.axisWidthXTop || 1) * g.pr;
    },

    catLabel_paddingTop: function() {
      return (
        options.categoryLabels_padding ?
        options.categoryLabels_padding * g.pr :
        g.h * 0.02
      );
    },
    // catLabel_paddingBtm: function() {
    //   // return dvals.catLabel_fontsize() * 0.5;
    // },
    catLabel_fontsize: function() {
      return (
        options.categoryLabels_fontsize ?
        options.categoryLabels_fontsize * g.pr :
        g.h * 0.04
      );
    },
    // catLabel_ypos: function() {
    //   return g.h - dvals.catLabel_paddingBtm() - dvals.catLabel_fontsize() -
    //     (options.extra_b_padding || 0)*g.pr;
    // },

    opt_valueLabels_labelMax: function() {
      if (typeof options.valueLabels_labelMax == 'undefined') return true;
      return options.valueLabels_labelMax;
    },

    // btm_section_height: function() {
    //   if (!options.categoryLabels) return 2 * g.pr;
    //   return dvals.catLabel_paddingTop() +
    //     dvals.catLabel_fontsize() +
    //     dvals.catLabel_paddingBtm();
    // },
    // top_section_height: function() {
    //   if (options.valueLabels && dvals.opt_valueLabels_labelMax()) {
    //     return dvals.valueLabel_fontsize();
    //   }
    //   return 2*g.pr;
    // },

    valueLabel_fontsize: function() {
      return (
        options.valueLabels_fontsize ?
        options.valueLabels_fontsize * g.pr :
        g.h * 0.035
      );
    },
    valueLabel_paddingR: function() { return (options.valueLabels_padding || 4) * g.pr; },
    valueLabel_paddingL: function() { return dvals.valueLabel_paddingR() * 0.5; },
    valueLabel_maxWidth: function() {
      draw_setValueLblFont();
      var max = 0;
      for (var i=options.min; i <= options.max; i += (options.step || 1)) {
        var w = c.measureText(i).width;
        if (w > max) max = w;
      }
      return max;
    },
  };


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
      axis_frame.l = line_chart.max_label_width(c, g, o) + o.labels_y_padding + line_chart.label_padding_left(o);
      axis_frame.r = m(4);
      axis_frame.b = line_chart.btm_section_height(o, g);
      axis_frame.t = line_chart.top_section_height(o, g);
    },
  };


  function draw_categories() {
    let n = data.length;                // n is the number of categories
    let m = data[0].data.length;        // m is the number of items
    let b = o.bar_width;                // b is the width of a bar
    let s = o.bar_spacing;              // s is the spacing between bars within items
    let q = n*b + (n-1)*s;              // q is the total width of an item group
    let a = (1 - m*q) / m;              // a is the space between item groups
    let usable_width = g.w - axis_frame.l - axis_frame.r;
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

      if (dvals.highlighted_item === null)   { alpha = 1; }
      else if (dvals.highlighted_item === i) { alpha = 1; }
      else                                   { alpha = (1 - dvals.highlight_progress) * (1 - min_alpha) + min_alpha; }

      c.beginPath();
      c.globalAlpha = alpha;
      c.fillStyle = cat.color || 'black';
      c.strokeStyle = cat.outline || 'black';
      c.lineWidth = line_w;
      for (let j = 0; j < cat_data.length; ++j, ++_i) {
        var value = cat_data[j];
        var x = (a/2 + j*(q + a) + i*(b + s)) + line_w/2 + axis_frame.l;
        var h = value / options.max * usable_height;
        var w = b - line_w;
        var y = g.h - axis_frame.b - h - line_w/2;
        c.rect(x, y, w, h + line_w/4);
      }
      c.fill();
      c.stroke();
      c.closePath();
    }
    c.globalAlpha = 1;
  };

  function draw_labels_x() {
    if (!options.labels_x) {
      return;
    }

    c.beginPath();
    c.fillStyle = o.labels_x_color;

    c.font = '400 ' + o.labels_x_fontsize + 'px Roboto';
    c.textBaseline = 'top';
    c.textAlign = 'center';

    const y = g.h - 1.5 * o.labels_x_fontsize;

    const n = data.length;          // n is the number of categories
    const m = data[0].data.length;  // m is the number of items
    for (let i = 0; i < category_labels.length; ++i) {
      const b = o.bar_width;
      const s = o.bar_spacing;
      const q = n*b + (n-1)*s;  // q is the total width of an item group
      const a = (1 - m*q) / m;  // a is the space between item groups

      let x = a/2 + a*i + q*(i+1/2);
      x = x * (g.w - axis_frame.l - axis_frame.r) + axis_frame.l;

      c.fillText(category_labels[i], x, y);
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

  function animTask_animateBarsIn() {
    var zero_data = [ ],
        data_new = data;
    for (var i=0; i < data.length; ++i) {
      var cat_copy = helpers.clone(data[i]);
      for (var j=0; j < cat_copy.data.length; ++j) {
        cat_copy.data[j] = 0;
      }
      zero_data.push(cat_copy);
    }
    data = zero_data;
    return animTask_animateDataTo(data_new);
  }
  function animTask_animateDataTo(new_categories, fn_easing) {
    fn_easing = fn_easing || math.easeOutCubic_Simple;
    var _n = 0,
        max = 100,
        step = 4,
        t = 60,      // The duration of an individual segment animation
        n_segments = data.length * data[0].data.length,
        overlap = (n_segments*t - 100) / (n_segments - 1),
        data_prev = helpers.clone(data),
        data_new = helpers.clone(data);

    for (var i=0; i < data.length; ++i) {
      data_new[i].data = helpers.clone(new_categories[i].data);
    }

    return function() {
      _n = Math.min(_n+step, max);

      for (var i=0, n=0; i < data.length; ++i) {
        var cat = data[i].data,
            cat_orig = data_prev[i].data,
            cat_new = data_new[i].data;

        for (var j=0; j < cat.length; ++j, ++n) {
          var t_start = n * (t - overlap),
              t_end = t_start + t,
              progress = math.clamp((_n - t_start) / t, 0, 1),
              progress_eased = fn_easing(progress),
              delta = (cat_new[j] - cat_orig[j]);
          cat[j] = delta * progress_eased + cat_orig[j];
        }
      }

      draw_all();
      if (_n >= max) {
        animQueue.finishTask();
      }
    };
  }

  function animTask_applyHighlight(ind) {
    var _n = 0,
        max = 10,
        step = 0.5,
        temp_highlight_ind = dvals.highlighted_item,
        is_removing = (ind == -1);

    return function() {
      // if (ind == temp_highlight_ind) {
      //   animQueue.finishTask();
      //   return;
      // }
      _n += step;
      dvals.highlighted_item = is_removing ? dvals.highlighted_item : ind;

      var t = math.easeOutCubic_Simple(_n/max);
      dvals.highlight_progress = is_removing ? 1 - t : t;

      if (_n >= max) {
        if (is_removing) {
          dvals.highlighted_item = null;
        }
        dvals.highlight_progress = 1;
        animQueue.finishTask();
      }
      draw_all();
    };
  }


  return {
    draw() {
      animQueue.add(animTask_animateBarsIn());
      animQueue.start();
    },
    updateData(new_categories) {
      if (new_categories.length != data.length) {
        console.log('BarChart.updateData() - wrong number of new_categories');
        return;
      }
      animQueue.add(animTask_animateDataTo(new_categories, math.easeInOutCubic_Simple));
      animQueue.start();
    },
    setHighlightedItem(title) {
      var ind = (function() {
        for (var i=0; i < data.length; ++i) {
          if (data[i].title == title)
            return i;
        }
        return -1;
      })();
      // if (dvals.highlighted_item !== null) {
      //   animQueue.add(animTask_applyHighlight());
      // }
      animQueue.add(animTask_applyHighlight(ind));
      animQueue.start();
    },
    tearDown() {
      unbind();
      animQueue.reset();
      animQueue = null;
      el_canvas = null;
      c = null;
    },
  };
}

export default bar_chart;


import anim_queue from '../helpers/anim-queue';
import helpers from '../helpers/helpers';
import math from '../helpers/math';


function bar_chart(el_canvas, data, options, category_labels) {
  var c = el_canvas.getContext('2d');
  options = options || { };

  // Event bindings
  el_canvas.addEventListener('BoggleChart:resize', cb_drawAll);
  // el_canvas.addEventListener('mousemove', mouse_move);
  // el_canvas.addEventListener('mouseenter', mouse_enter);
  // el_canvas.addEventListener('mouseleave', mouse_leave);
  function cb_drawAll() {
    Draw.All();
  }
  function unbind() {
    el_canvas.removeEventListener('BoggleChart:resize', cb_drawAll);
  }

  // Mouse events
  // ----------------------------------------------------------
  // function mouse_enter() { }
  // function mouse_leave() {
  //   gstate.hover_x = null;
  //   animQueue.triggerDraw();
  // }
  // function mouse_move(ev) {
  //   var p = BoggleChart.getOffset_canv(ev, el_canvas),
  //       usable_width = gstate.width_pr - gstate.offsets.l - gstate.offsets.r;
  //   p.x -= gstate.offsets.l;
  //   gstate.hover_x = p.x;
  //   animQueue.triggerDraw();
  // }


  // Drawing
  // ----------------------------------------------------------
  var Draw = { };

  var dvals = {
    highlighted_item: null,
    highlight_progress: null,

    labelROffset: function() {
      return 4 * gstate.pr;
    },

    axisColour_x: function() {
      return options.axisColorX || 'black';
    },
    axisColour_xtop: function() {
      return options.axisColorXTop || 'black';
    },

    axisWidth_x: function() {
      return (options.axisWidthX || 1) * gstate.pr;
    },
    axisWidth_xtop: function() {
      return (options.axisWidthXTop || 1) * gstate.pr;
    },

    catLabel_paddingTop: function() {
      return (
        options.categoryLabels_padding ?
        options.categoryLabels_padding * gstate.pr :
        gstate.h * 0.02
      );
    },
    catLabel_paddingBtm: function() {
      return dvals.catLabel_fontsize() * 0.5;
    },
    catLabel_fontsize: function() {
      return (
        options.categoryLabels_fontsize ?
        options.categoryLabels_fontsize * gstate.pr :
        gstate.h * 0.04
      );
    },
    catLabel_ypos: function() {
      return gstate.h - dvals.catLabel_paddingBtm() - dvals.catLabel_fontsize() -
        (options.extra_b_padding || 0)*gstate.pr;
    },

    opt_valueLabels_labelMax: function() {
      if (typeof options.valueLabels_labelMax == 'undefined') return true;
      return options.valueLabels_labelMax;
    },

    btm_section_height: function() {
      if (!options.categoryLabels) return 2 * gstate.pr;
      return dvals.catLabel_paddingTop() +
        dvals.catLabel_fontsize() +
        dvals.catLabel_paddingBtm();
    },
    top_section_height: function() {
      if (options.valueLabels && dvals.opt_valueLabels_labelMax()) {
        return dvals.valueLabel_fontsize();
      }
      return 2*gstate.pr;
    },

    valueLabel_fontsize: function() {
      return (
        options.valueLabels_fontsize ?
        options.valueLabels_fontsize * gstate.pr :
        gstate.h * 0.035
      );
    },
    valueLabel_paddingR: function() { return (options.valueLabels_padding || 4) * gstate.pr; },
    valueLabel_paddingL: function() { return dvals.valueLabel_paddingR() * 0.5; },
    valueLabel_maxWidth: function() {
      Draw.SetValueLblFont();
      var max = 0;
      for (var i=options.min; i <= options.max; i += (options.step || 1)) {
        var w = c.measureText(i).width;
        if (w > max) max = w;
      }
      return max;
    },
  };

  var gstate = {
    pr: null,
    w:  null,
    h:  null,
    offsets:   null,

    regen: function() {
      gstate.pr        = el_canvas.pixel_ratio,
      gstate.w  = el_canvas.width;
      gstate.h = el_canvas.height;
      gstate.offsets = {
        l: dvals.valueLabel_maxWidth() + dvals.valueLabel_paddingL() + dvals.valueLabel_paddingR() + (options.extra_l_padding || 0)*gstate.pr,
        r: 2 * gstate.pr,
        t: dvals.top_section_height(),
        b: dvals.btm_section_height() + (options.extra_b_padding || 0)*gstate.pr,
      };
    },
  };

  var animQueue = anim_queue();
  animQueue.setDefaultDrawTask(Draw.All);

  Draw.SetValueLblFont = function() {
    c.font = '400 ' + dvals.valueLabel_fontsize() + 'px Roboto';
  };

  Draw.Categories = function() {
    function bar_spacing() {
      return (typeof options.bar_spacing == 'undefined' ? '0.02' : options.bar_spacing);
    }

    var n = data.length,          // n is the number of categories
        m = data[0].data.length,  // m is the number of items
        b = (options.bar_width || 0.03),    // b is the width of a bar
        s = bar_spacing(),  // s is the spacing between bars within items
        q = n*b + (n-1)*s,  // q is the total width of an item group
        a = (1 - m*q) / m,  // a is the space between item groups
        usable_width = gstate.w - gstate.offsets.l - gstate.offsets.r,
        usable_height = gstate.h - gstate.offsets.b - gstate.offsets.t;

    b *= usable_width;
    s *= usable_width;
    q *= usable_width;
    a *= usable_width;
    var min_alpha = 0.3;

    for (var i=0, _i=0; i < data.length; ++i) {
      var cat = data[i],
          cat_data = cat.data,
          line_w = (cat.outlineWidth || 1) * gstate.pr,
          alpha;

      if (dvals.highlighted_item === null)   { alpha = 1; }
      else if (dvals.highlighted_item === i) { alpha = 1; }
      else                                      { alpha = (1 - dvals.highlight_progress) * (1 -min_alpha) + min_alpha; }

      c.beginPath();
      c.globalAlpha = alpha;
      c.fillStyle = cat.color || 'black';
      c.strokeStyle = cat.outline || 'black';
      c.lineWidth = line_w;
      for (var j=0; j < cat_data.length; ++j, ++_i) {
        var value = cat_data[j];
        var x = (a/2 + j*(q + a) + i*(b + s)) + line_w/2 + gstate.offsets.l;
        var h = value / options.max * usable_height;
        var w = b - line_w;
        var y = gstate.h - gstate.offsets.b - h - line_w/2;
        c.rect(x, y, w, h + line_w/4);
      }
      c.fill();
      c.stroke();
      c.closePath();
    }
    c.globalAlpha = 1;
  };

  Draw.Axes = function() {
    var base_y = gstate.h - gstate.offsets.b;
    var base_x = (options.valueLabels_inside ? 0 : gstate.offsets.l);
    var max_x = gstate.w - gstate.offsets.r;
    var max_y = gstate.offsets.t;

    if (options.axisX) {
      c.beginPath();
      c.moveTo(base_x, base_y);
      c.strokeStyle = options.axisColorX || '#222';
      c.lineWidth = dvals.axisWidth_x();
      c.lineTo(max_x, base_y);
      c.stroke();
    }

    if (options.axisXTop) {
      c.beginPath();
      c.moveTo(base_x, max_y);
      c.strokeStyle = options.axisColorXTop || '#222';
      c.lineWidth = dvals.axisWidth_xtop();
      c.lineTo(max_x, max_y);
      c.stroke();
    }
  };

  Draw.gridlines = function() {
    if (!options.gridlines) return;

    if (options.gridlines.horizontal) {
      var usable_height = gstate.h - gstate.offsets.t - gstate.offsets.b,
          increment     = options.step * usable_height / (options.max - options.min),
          x             = gstate.offsets.l,
          x_right       = x + gstate.w - gstate.offsets.l - gstate.offsets.r,
          x_left        = x - (options.gridlines.ticks_horizontal ? 6*gstate.pr : 0);

      c.beginPath();
      c.lineWidth = (options.gridlines.width_h || 0.75) * gstate.pr;
      c.strokeStyle = (options.gridlines.col_h || '#222');
      if (options.gridlines.style_horizontal == 'dashed') {
        c.setLineDash([ 2*gstate.pr, 5*gstate.pr, ]);
      }

      var y = gstate.h - gstate.offsets.b;
      var max = options.axisXTop ? options.max - 1 : options.max;
      for (var i = options.min + options.step; i <= max; i += options.step) {
        y -= increment;
        c.moveTo(x_left, y);
        c.lineTo(x_right, y);
      }
      c.stroke();
    }
    c.setLineDash([])

    if (options.gridlines.vertical) {
      var usable_width = gstate.w - gstate.offsets.l - gstate.offsets.r,
          h_increment = usable_width / (data[0].data.length - 1),
          x = gstate.offsets.l,
          y_top = gstate.offsets.t,
          y_btm = gstate.h - gstate.offsets.b + (options.gridlines.ticks_vertical ? 6*gstate.pr : 0);

      c.beginPath();
      c.lineWidth = (options.gridlines.width_v || 0.75) * gstate.pr;
      c.strokeStyle = (options.gridlines.col_v || '#222');
      if (options.gridlines.style_v == 'dashed') {
        c.setLineDash([ 2*gstate.pr, 5*gstate.pr, ]);
      }

      var min = options.axisY ? 1 : 0;
      var max = options.axisYRight ? 2 : 1;
      for (var i=min; i <= data[0].data.length - max; ++i) {
        c.moveTo(x, y_btm);
        c.lineTo(x, y_top);
        x += h_increment;
      }
      c.stroke();
    }
    c.setLineDash([])
  };

  Draw.ValueLabels = function() {
    if (!options.valueLabels) return;

    var usable_height = gstate.h - gstate.offsets.t - gstate.offsets.b;
    var increment     = options.step * usable_height / (options.max - options.min);
    var x_right       = gstate.offsets.l - dvals.valueLabel_paddingR();

    Draw.SetValueLblFont();
    c.textBaseline = 'middle';
    c.textAlign    = 'end';
    c.fillStyle    = options.valueLabels_color || 'black';

    var step = options.step || 1;
    var min = options.valueLabels_labelOrigin ? options.min : options.min + step;
    var max = dvals.opt_valueLabels_labelMax() ? options.max : options.max - step;

    for (var i=min; i <= max; i += step) {
      var y_rel = (i - options.min) / (options.max - options.min);
      var y = gstate.h - gstate.offsets.b - usable_height + (1 - y_rel) * usable_height;
      c.fillText(i, x_right, y);
    }
  };

  Draw.CategoryLabels = function() {
    if (!options.categoryLabels) return;

    c.beginPath();
    c.fillStyle = options.categoryLabels_color || 'black';

    c.font = '400 ' + dvals.catLabel_fontsize() + 'px Roboto';
    c.textBaseline = 'top';
    c.textAlign = 'center';

    var y = dvals.catLabel_ypos();
    for (var i=0; i < category_labels.length; ++i) {
      var n = data.length,          // n is the number of categories
          m = data[0].data.length,  // m is the number of items
          b = (options.bar_width || 0.03),    // b is the width of a bar
          s = (options.bar_spacing || 0.02),  // s is the spacing between bars within items
          q = n*b + (n-1)*s,  // q is the total width of an item group
          a = (1 - m*q) / m;  // a is the space between item groups

      var x = a/2 + a*i + q*(i+1/2);
      x = x * (gstate.w - gstate.offsets.l - gstate.offsets.r) + gstate.offsets.l;

      c.fillText(category_labels[i], x, y);
    }

  };

  Draw.All = function() {
    gstate.regen();
    c.clearRect(0, 0, gstate.w, gstate.h);
    Draw.gridlines();
    Draw.Categories();
    Draw.Axes();
    Draw.CategoryLabels();
    Draw.ValueLabels();
  };


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

      Draw.All();
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
      Draw.All();
    };
  }

  function rsz() {

  }

  var exp = {
    draw: function() {
      animQueue.add(animTask_animateBarsIn());
      animQueue.start();
    },
    updateData: function(new_categories) {
      if (new_categories.length != data.length) {
        console.log('BarChart.updateData() - wrong number of new_categories');
        return;
      }
      animQueue.add(animTask_animateDataTo(new_categories, math.easeInOutCubic_Simple));
      animQueue.start();
    },
    setHighlightedItem: function(title) {
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
    tearDown: function() {
      unbind();
      animQueue.reset();
      animQueue = null;
      el_canvas = null;
      c = null;
    },
  };

  return exp;
}

export default bar_chart;


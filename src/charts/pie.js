var AnimQueue = require('../AnimQueue'),
    helpers = require('../helpers'),
    math = require('../math');

function pie_chart(el_canvas, data, options, click_callback) {
  var c = el_canvas.getContext('2d');

  el_canvas.addEventListener('BoggleChart:resize', _draw);
  if (options.enableInteractions) {
    el_canvas.addEventListener('mouseenter', mouse_enter);
    el_canvas.addEventListener('mouseleave', mouse_leave);
    el_canvas.addEventListener('mousemove', mouse_move);
    el_canvas.addEventListener('mousedown', mouse_down);
    el_canvas.addEventListener('mouseup', mouse_up);
  }

  // Mouse events
  // ----------------------------------------------------------

  var mouse_is_over = false;
  function mouse_enter() { mouse_is_over = true; }
  function mouse_leave() { mouse_is_over = false; }
  function mouse_move(ev) {
    var ind = item_for_ev(ev),
        prev = gstate.hovered_item;
    gstate.hovered_item = (ind >= 0 ? ind : null);
    if (gstate.hovered_item !== prev) {
      animQueue.triggerDraw();
    }
    if (gstate.hovered_item !== null) {
      el_canvas.style.cursor = 'pointer';
    }
    else {
      el_canvas.style.cursor = 'default';
    }
  }
  function mouse_down(ev) {
    var ind = item_for_ev(ev);
    if (ind >= 0) {
      gstate.active_item = ind;
      setTimeout(_draw, 0);
    }
    if (click_callback) {
      click_callback(ind >= 0 ? data[ind] : null);
    }
  }
  function mouse_up(ev) {
    gstate.active_item = null;
    setTimeout(_draw, 0);
  }
  function item_for_ev(ev) {
    var p = helpers.getOffset_canv(ev, el_canvas);
    p.x -= gstate.width_pr / 2;
    p.y -= gstate.height_pr / 2;

    var r_pie_outer = diam_outerPie() / 2,
        r_pie_inner = diam_innerLine() / 2,
        r_ev = Math.sqrt(p.x*p.x + p.y*p.y);

    if (r_ev < r_pie_inner || r_ev > r_pie_outer) {
      return -1;
    }

    var ind = 0,
        p_angle = math.angle_from_vertical(p.x, -p.y);

    for (var i=0; i < drawvals.angles.length; ++i) {
      var i_ang = drawvals.angles[i] + Math.PI/2;
      ind = i;
      if (i_ang > p_angle) break;
    }
    return ind;
  }
  function ind_for_title(title) {
    for (var i=0; i < data.length; ++i) {
      if (data[i].title === title)
        return i;
    }
    return -1;
  }

  // Drawing
  // ----------------------------------------------------------
  var Draw = { };

  // Draw settings
  var drawvals = {
    outerPadding: function() { return 4 * gstate.pr; },

    // Store the ending angles for each data item
    angles: null,
    regen_angles: function() {
      drawvals.angles = [ ];
      var data_total = get_data_total();
      for (var i=0, cur_angle=-Math.PI/2; i < data.length; ++i) {
        cur_angle += 2*Math.PI * data[i].value/data_total;
        drawvals.angles.push(cur_angle);
      }
    },


  };

  var gstate = {
    p_centre: null,
    width_pr: null,
    height_pr: null,
    pr : null,
    outer_padding: null,
    hovered_item: null,
    active_item: null,

    alphas: null,

    regen: function() {
      gstate.pr = el_canvas.pixel_ratio;
      gstate.width_pr = el_canvas.width;
      gstate.height_pr = el_canvas.height;
      gstate.p_centre = {
        x: gstate.width_pr / 2,
        y: gstate.height_pr / 2 + 0.5,
      };
      gstate.outer_padding = drawvals.outerPadding() * gstate.pr;
    }
  };
  function diam_outerLine() {
    return gstate.width_pr - gstate.outer_padding;
  }
  function diam_outerPie() {
    var linew = (options.w_outer_line || 0) * gstate.pr * 2;
    return diam_outerLine() - linew;
  }
  function diam_innerLine() {
    var linew = (options.w_inner_line || 0) * gstate.pr * 2,
        pie_diam = diam_outerPie()
    return pie_diam * (1 - (options.cutout_radius || 0)) + linew;
  }
  function diam_innerCutout() {
    var linew = (options.w_inner_line || 0) * gstate.pr * 2;
    return diam_innerLine() - linew;
  }
  function moveToCentre() {
    c.moveTo(gstate.p_centre.x, gstate.p_centre.y);
  }
  function get_data_total() {
    return helpers.totalData(data, 'value');
  }
  function get_clean_alphas() {
    var arr = [ ];
    for (var i=0; i < data.length; ++i) arr.push(1);
    return arr;
  }
  function each_data_item(cb) {
    var radius = diam_outerPie(),
        prev_angle = -Math.PI / 2;

    for (var i=0, n = data.length; i < n; ++i) {
      var item = data[i],
          start_angle = prev_angle,
          end_angle = (i == n-1 ? Math.PI * 3/2 : drawvals.angles[i]),
          prev_angle = end_angle,
          overlap_radians = 0.00125;

      if (i == 0)       { end_angle += overlap_radians; }
      else if (i < n-1) { start_angle -= overlap_radians; end_angle += overlap_radians; }
      else              { start_angle -= overlap_radians; }

      cb(start_angle, end_angle, radius, item, i);
    }
  }

  Draw.OuterLine = function() {
    if (!options.w_outer_line || options.w_outer_line <= 0) {
      return;
    }
    c.beginPath();
    moveToCentre();
    c.fillStyle = (options.col_outer_line || '#222');

    c.arc(gstate.p_centre.x, gstate.p_centre.y, diam_outerLine()/2, 0, Math.PI*2);
    c.fill();
  };
  Draw.InnerLine = function() {
    if (!options.w_inner_line || options.w_inner_line <= 0 ||
        !options.cutout_radius || options.cutout_radius <= 0) {
      return;
    }
    c.beginPath();
    moveToCentre();
    c.fillStyle = (options.col_inner_line || '#222');
    c.arc(gstate.p_centre.x, gstate.p_centre.y, diam_innerLine()/2, 0, Math.PI*2);
    c.fill();
  };
  Draw.Cutout = function() {
    if ((options.cutout_radius || 0) <= 0) return;
    c.beginPath();
    moveToCentre();
    c.fillStyle = (options.col_background || 'pink');
    c.arc(gstate.p_centre.x, gstate.p_centre.y, diam_innerCutout()/2, 0, Math.PI*2);
    c.fill();
  };
  Draw.DataSegment = function(start_angle, end_angle, radius, item, i) {
    c.beginPath();
    moveToCentre();

    if (gstate.alphas !== null && gstate.alphas.length >= i) {
      c.globalAlpha = gstate.alphas[i];
    }
    c.fillStyle = item.color || 'black';
    start_angle = Math.max(start_angle, -Math.PI / 2);
    end_angle = Math.min(end_angle, Math.PI * 6/4);
    c.arc(gstate.p_centre.x, gstate.p_centre.y, diam_outerPie()/2, start_angle, end_angle);
    c.fill();
    c.globalAlpha = 1;

    if (i === gstate.hovered_item || i === gstate.active_item) {
      c.beginPath();
      moveToCentre();
      var col;
      if (item.color == 'black' || item.color == '#000') {
        col = (i === gstate.active_item ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)');
      }
      else {
        col = (i === gstate.active_item ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)');
      }
      c.fillStyle = col;
      c.arc(gstate.p_centre.x, gstate.p_centre.y, diam_outerPie()/2, start_angle, end_angle)
      c.fill();
    }
  };
  Draw.DataSegments = function() {
    c.beginPath();
    c.fillStyle = 'black';
    c.arc(gstate.p_centre.x, gstate.p_centre.y, diam_outerPie()/2, 0, Math.PI*2);
    c.fill();
    each_data_item(Draw.DataSegment);
  };
  Draw.InnerLabel = function() {
    if (innerLabel === null) return;

    var fontsize = 14 * gstate.pr;
    c.font = '500 ' + fontsize + 'px Roboto';
    c.textBaseline = 'middle';
    c.textAlign = 'center';
    c.fillStyle = options.innerLabel_color  || 'black';
    c.globalAlpha = innerLabel_opac;
    c.fillText(innerLabel,
               gstate.width_pr / 2,
               gstate.height_pr / 2);
    c.globalAlpha = 1;
  };

  // Animation tasks
  // ----------------------------------------------------------
  var animQueue = AnimQueue();
  animQueue.setDefaultDrawTask(_draw);

  var innerLabel = null,
      innerLabel_opac = 1;

  function animTask_animateIn() {
    var data_orig = [ ],
        data_total = get_data_total(),
        initial_skewed_data = [ ]

    for (var i=0, n = data.length; i < n; ++i) {
      var item = data[i],
          reduction = i/n;
      data_orig.push(item.value);
      initial_skewed_data.push({
        title: item.title,
        value: item.value + reduction * item.value,
        color: item.color,
      });
    }
    data = initial_skewed_data;

    return animTask_animateValuesTo(data_orig);
  }
  function animTask_animateValuesTo(new_data, fn_easing) {
    // new_data is in the form [ value, value, ... ]
    fn_easing = fn_easing || math.easeOutCubic_Simple;
    var _n = 0,
        max = 100,
        step = 4,
        data_prev = helpers.clone(data),
        data_new = helpers.clone(data);

    for (var i=0; i < data.length; ++i) {
      data_new[i].value = new_data[i];
    }

    return function() {
      _n = Math.min(_n+step, max);
      var progr = fn_easing(_n / max);

      for (var i=0; i < data.length; ++i) {
        var val_orig = data_prev[i].value,
            val_new = data_new[i].value,
            delta = (val_new - val_orig);
        data[i].value = delta * progr + val_orig;
      }
      _draw();

      if (_n >= max) {
        data = data_new;
        animQueue.finishTask();
      }
    };
  }
  function animTask_hideLabel() {
    var _n = 0, max = 10, step = 2.5;
    return function() {
      _n += step;
      innerLabel_opac = math.clamp(1 - (_n / max), 0, 1);
      _draw();
      if (_n >= max + 4) {
        animQueue.finishTask();
      }
    };
  }
  function animTask_showLabel(txt) {
    var _n = 0, max = 20, step = 3;
    return function() {
      _n += step;
      innerLabel = txt;
      innerLabel_opac = (_n / max);
      _draw();
      if (_n >= max) {
        animQueue.finishTask();
      }
    };
  }
  function animTask_setItemAlphas(new_alphas) {
    var _n = 0,
        max = 10,
        step = 2,
        prev_alphas = null;

    return function() {
      if (_n == 0) {
        prev_alphas = gstate.alphas ? helpers.clone(gstate.alphas) : get_clean_alphas();
      }
      _n = Math.min(_n+step, max);

      var temp_alphas = [ ];
      for (var i=0; i < data.length; ++i) {
        var delta = new_alphas[i] - prev_alphas[i],
            new_val = delta * _n/max;
        temp_alphas.push(prev_alphas[i] + new_val);
      }
      gstate.alphas = temp_alphas;
      if (_n >= max) {
        animQueue.finishTask();
        gstate.alphas = new_alphas;
      }
      _draw();
    };
  }
  function animTask_applyHighlight(ind) {
    var new_alphas = [ ];
    for (var i=0; i < data.length; ++i) {
      if (ind == -1) new_alphas.push(1);
      else {
        if (i == ind) new_alphas.push(1);
        else          new_alphas.push(0.3);
      }
    }
    return animTask_setItemAlphas(new_alphas);
  }

  function _draw() {
    el_canvas.dispatchEvent(new CustomEvent('force_resize'));
    if (el_canvas.width == 0 || el_canvas.height == 0) return;
    c.clearRect(0, 0, el_canvas.width, el_canvas.height);
    gstate.regen();
    drawvals.regen_angles();
    Draw.OuterLine();
    Draw.DataSegments();
    Draw.InnerLine();
    Draw.Cutout();
    Draw.InnerLabel();
  }

  var exp = {
    draw: function() {
      animQueue.add(animTask_animateIn());
      animQueue.start();
    },
    updateData: function(new_vals) {  // [ value, value, value, ... ]
      if (new_vals.length != data.length) {
        console.log('PieChart.updateData() - new_vals wrong length');
        return;
      }
      animQueue.add(animTask_animateValuesTo(new_vals, math.easeInOutCubic_Simple));
      animQueue.start();
    },
    setInnerLabel: function(txt) {
      if (txt === innerLabel) return;
      if (innerLabel === null) {
        animQueue.add(animTask_showLabel(txt));
      }
      else {
        animQueue.add(animTask_hideLabel());
        animQueue.add(animTask_showLabel(txt));
      }
      animQueue.start();
    },
    setHighlightedItem: function(title) {
      var ind = ind_for_title(title);
      animQueue.add(animTask_applyHighlight(ind));
    },
    triggerClick: function(item_title) {
      var i = ind_for_title(item_title);
      if (i != -1 && click_callback) {
        click_callback(data[i]);
      }
    },
  };

  return exp;
}

export default pie_chart;


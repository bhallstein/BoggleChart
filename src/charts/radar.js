import anim_queue from '../helpers/anim-queue';
import helpers from '../helpers/helpers';
import math from '../helpers/math';


function radar_chart(el_canvas, data, options) {
  var c = el_canvas.getContext('2d');

  el_canvas.addEventListener('BoggleChart:resize', cb_drawAll);
  function cb_drawAll() {
    Draw.All();
  }
  function unbind() {
    el_canvas.removeEventListener('BoggleChart:resize', cb_drawAll);
  }

  // Drawing
  // ----------------------------------------------------------
  var Draw = { };

  var gstate = {
    pr: null,
    w: null,
    h: null,
    fontsz: null,
    max_radius: null,

    regen: function() {
      gstate.pr = el_canvas.pixel_ratio;
      gstate.w = el_canvas.width;
      gstate.h = el_canvas.height;
      gstate.fontsz = (options.label_font_size || 12) * gstate.pr;
      gstate.max_radius = (function() {
        var wh = Math.min(gstate.w, gstate.h);
        wh -= (options.exterior_padding || 0) * 2 * gstate.h * gstate.pr;
        if (options.labels) {
          wh -= gstate.fontsz * 2;
        }
        return wh / 2;
      })();
    },
  };

  function each_data_item(cb) {
    var p_centre = {
      x: gstate.w/2 - 0.5,
      y: gstate.h/2 - 0.5,
    },
    angle = Math.PI * 2 / data.data.length;

    for (var i=0; i < data.data.length; ++i) {
      var p_from = {
        x: Math.sin(angle * i),
        y: Math.sin(Math.PI*0.5 - angle*i),
      };
      p_from.x = p_centre.x + p_from.x * gstate.max_radius;
      p_from.y = p_centre.y - p_from.y * gstate.max_radius;
      cb(p_from, p_centre, angle, data.data[i], i);
    }
  }

  Draw.Axes = function() {
    if (options.disableAxes) return;
    each_data_item(function(point, p_centre, angle, dataitem, i) {
      c.beginPath();
      if (options.axisNHighlight && i%options.axisNHighlight == 0) {
        c.lineWidth = (options.axisNWidth || 2) * gstate.pr;
        c.strokeStyle = (options.axisNColor || 'black');
        if (options.axisStyle == 'dashed') {
          c.setLineDash([ 2*gstate.pr, 5*gstate.pr, ]);
        }
      }
      else {
        c.lineWidth = (options.axisWidth || 1) * gstate.pr;
        c.strokeStyle = (options.axisColor || 'black');
      }
      c.beginPath();
      c.moveTo(p_centre.x, p_centre.y);
      c.lineTo(point.x, point.y);
      c.stroke();
    });
  };

  Draw.DataSegment = function(point, p_centre, angle, dataitem, i, scale_factor) {
    if (typeof scale_factor === 'undefined') scale_factor = 1;

    var start_angle = -Math.PI*0.5 + angle*i,
        end_angle = -Math.PI*0.5 + angle*(i+1),
        r_sq = dataitem.value * Math.pow(gstate.max_radius, 2) / data.max,
        r = Math.sqrt(r_sq) * scale_factor;

    // If need proportional to radius rather than area, then more simply:
    //   r = dataitem.value / data.max * gstate.max_radius * scale_factor;

    c.beginPath();
    c.moveTo(p_centre.x, p_centre.y);
    c.fillStyle = dataitem.color;
    c.arc(p_centre.x, p_centre.y, r, start_angle, end_angle);
    c.fill();
  };

  Draw.DataSegments = function() {
    each_data_item(Draw.DataSegment);
  };

  Draw.Label = function(point, p_centre, angle, dataitem, i) {
    var lbl_mod_denom = (options.label_every || 1);
    var lbl_mod_numerator = i + (options.label_every_offset || 0);
    if (lbl_mod_numerator%lbl_mod_denom !== 0) return;
    c.font = '400 ' + (''+gstate.fontsz) + 'px Roboto';
    c.fillStyle = options.label_col || 'black';
    c.textBaseline = 'middle';
    c.textAlign = 'center';
    c.translate(gstate.w/2, gstate.h/2);
    c.rotate(angle * (i + (options.label_position == 'segment' ? 0.5: 0)));
    c.translate(-gstate.w/2, -gstate.h/2);

    var x = p_centre.x;
    var y = gstate.h/2 - gstate.max_radius - 1.5*gstate.fontsz;

    c.fillText(dataitem.title, x, y);
    c.setTransform(1, 0, 0, 1, 0, 0);
  };

  Draw.Labels = function() {
    if (options.labels) {
      each_data_item(Draw.Label);
    }
  };

  Draw.All = function() {
    el_canvas.dispatchEvent(new CustomEvent('force_resize'));
    gstate.regen();
    c.clearRect(0, 0, gstate.w, gstate.h);
    Draw.DataSegments();
    Draw.Axes();
    Draw.Labels();
  };

  var animQueue = anim_queue();
  animQueue.setDefaultDrawTask(Draw.All);
  function animTask_drawSegmentsSequentially() {
    var _n = 0,
        step = 2,
        max = 100,
        t = 18,      // This is the duration of an individual segment animation
        n_segments = data.data.length,
        overlap = (n_segments*t - max) / (n_segments - 1);

    return function() {
      _n = Math.min(_n+step, max);
      el_canvas.dispatchEvent(new CustomEvent('force_resize'));
      gstate.regen();
      c.clearRect(0, 0, gstate.w, gstate.h);

      each_data_item(function(point, p_centre, angle, dataitem, i) {
        var t_start = i * (t - overlap),
            t_end = t_start + t,
            progress = math.clamp((_n - t_start) / t, 0, 1),
            progress_eased = math.ease_out_cubic(0, progress, 0, 1, 1);

        if (progress > 0) {
          Draw.DataSegment.apply(this, [].slice.call(arguments).concat(progress_eased));
        }
      });
      Draw.Axes();

      c.globalAlpha = Math.min(_n*5 / max, max);
      Draw.Labels();
      c.globalAlpha = 1;

      if (_n >= max) {
        c.globalAlpha = 1;
        animQueue.finishTask();
      }
    };
  }

  function draw() {
    animQueue.reset();
    animQueue.add(animTask_drawSegmentsSequentially());
    animQueue.start();
  }

  function rsz() {

  }

  var exp = {
    draw: draw,
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

export default radar_chart;


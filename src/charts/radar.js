import anim_queue from '../helpers/anim-queue';
import helpers from '../helpers/helpers';
import math from '../helpers/math';
import draw from '../helpers/draw';


const default_opts = {
  axis:      true,
  axis_width: 1,
  axis_color: 'black',
  axis_style: 'normal',

  axis_highlight_every: null,
  axis_highlight_width: 2,
  axis_highlight_color: 'black',
  axis_highlight_style: 'normal',  // or 'dashed'

  labels:             false,
  label_every:        1,
  label_every_offset: 0,
  label_position:     'axis',  // or 'segment'
  label_font_size:    14,
  label_font_weight:  400,
  label_font:         '"Helvetica Neue", Helvetica',
  label_color:        'black',

  padding: 0,
};


function radar_chart(el_canvas, data, options) {
  const c = el_canvas.getContext('2d');
  let o;


  // Animation
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
      g.pr = el_canvas.pixel_ratio;
      g.w  = el_canvas.width;
      g.h  = el_canvas.height;
      g.center = {
        x: g.w / 2 - 0.5,
        y: g.h / 2 - 0.5,
      };
    },
  };

  function max_radius() {
    const diam = Math.min(g.w, g.h)
      - 2 * m(o.padding)
      - (o.labels ? m(o.label_font_size) * 3 : 0);

    return diam / 2;
  }

  function each_data_item(cb) {
    const slice_angle = Math.PI * 2 / data.data.length;

    data.data.forEach((item, i) => {
      const vx = Math.sin(slice_angle * i);
      const vy = Math.sin(Math.PI*0.5 - slice_angle*i);

      const p = {
        x: g.center.x + vx * max_radius(),
        y: g.center.y - vy * max_radius(),
      };

      cb(p, slice_angle, item, i);
    });
  }

  function line_dash() {
    return o.axis_style === 'dashed' ? [ m(2), m(5) ] : null;
  }
  function highlight_line_dash() {
    return o.axis_highlight_style === 'dashed' ? [ m(2), m(5) ] : null;
  }


  function draw_data_segment(point, slice_angle, item, i) {
    if (item.draw_progress === undefined) {
      item.draw_progress = 1;
    }

    const start_angle = -Math.PI/2 + slice_angle*i;
    const end_angle   = -Math.PI/2 + slice_angle*(i+1);

    // The item is scaled by radial area
    const r_sq = item.value * Math.pow(max_radius(), 2) / data.max;
    const r = Math.sqrt(r_sq) * math.ease_out_cubic_simple(item.draw_progress);

    // NB to make proportional to radius rather than area, simpler:
    //   r = item.value / data.max * gstate.max_radius * scale_factor;

    draw.circle(c, g.center.x, g.center.y, r, item.color, null, null, start_angle, end_angle);
  }


  function draw_axes() {
    if (!o.axis) {
      return;
    }
    each_data_item(function(point, slice_angle, item, i) {
      if (o.axis_highlight_every && i%o.axis_highlight_every === 0) {
        draw.line(c, g.center.x, g.center.y, point.x, point.y, o.axis_highlight_color, m(o.axis_highlight_width), null, highlight_line_dash());
      }
      else {
        draw.line(c, g.center.x, g.center.y, point.x, point.y, o.axis_color, m(o.axis_width), null, line_dash());
      }
    });
  }


  function draw_label(point, slice_angle, item, i) {
    if (!o.labels) {
      return;
    }

    if ((i - o.label_every_offset)%o.label_every !== 0) {
      return;
    }

    const font = `${o.label_font_weight} ${o.label_font_size}px ${o.label_font}`;

    c.translate(g.center.x, g.center.y);
    c.rotate(slice_angle * (i + (o.label_position === 'segment' ? 0.5: 0)));
    c.translate(-g.center.x, -g.center.y);

    const x = g.center.x;
    const y = g.center.y - max_radius() - o.label_font_size;

    draw.text(c, item.title, x, y, o.label_color, font, 'center', 'middle');

    c.setTransform(1, 0, 0, 1, 0, 0);
  }


  function draw_all() {
    g.regen();
    o = helpers.get_opts(default_opts, options, g);

    el_canvas.dispatchEvent(new CustomEvent('force_resize'));

    c.clearRect(0, 0, g.w, g.h);

    each_data_item(draw_data_segment);
    draw_axes();
    each_data_item(draw_label);
  }


  function animtask__animate_in() {
    let n = 0;

    return function() {
      n = Math.min(n + 0.02, 1);

      const time_progress = math.delayed_time_series(data.data.length, 0.2, 0.05, n);
      data.data.forEach((item, i) => item.draw_progress = time_progress[i]);

      draw_all();

      if (n === 1) {
        animQueue.finishTask();
      }
    };
  }


  function _draw() {
    animQueue.reset();
    animQueue.add(animtask__animate_in());
    animQueue.start();
  }


  return {
    draw: _draw,
    tear_down: function() {
      unbind();
      animQueue.reset();
    },
  };
}

export default radar_chart;


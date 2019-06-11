import anim_queue from '../helpers/anim-queue';
import helpers from '../helpers/helpers';
import math from '../helpers/math';
import draw from '../helpers/draw';


const default_opts = {
  outer_line_width: 0,
  outer_line_color: 'black',

  inner_line_width: 0,
  inner_line_color: 'black',

  cutout_radius: 0,
  outer_padding: 4,

  label_color: 'black',
  label_fontsize: 14,
  label_font: '"Helvetica Neue", Helvetica',
  label_weight: 600,

  interactions: false,
  click_callback: null,

  __opts_not_to_process_as_functions: [
    'click_callback',
  ],
};


const segment_defaults = {
  color: 'black',
};


function pie_chart(el_canvas, data, options) {
  const c = el_canvas.getContext('2d');
  let o;


  // Animation
  // ----------------------------------------------------------

  const animQueue = anim_queue();
  animQueue.setDefaultDrawTask(draw_all);


  // Events
  // ----------------------------------------------------------

  if (options.interactions) {
    el_canvas.addEventListener('mousemove', mouse_move);
    el_canvas.addEventListener('mousedown', mouse_down);
  }
  el_canvas.addEventListener('BoggleChart:resize', draw_all);

  function unbind() {
    el_canvas.removeEventListener('BoggleChart:resize', draw_all);
    if (options.interactions) {
      el_canvas.removeEventListener('mousemove', mouse_move);
      el_canvas.removeEventListener('mousedown', mouse_down);
    }
  }
  function mouse_move(ev) {
    const prev = state.hovered_item;
    state.hovered_item = item_for_ev(ev);

    if (state.hovered_item !== prev) {
      animQueue.triggerDraw();
    }

    el_canvas.style.cursor = state.hovered_item === null ? 'default' : 'pointer';
  }
  function mouse_down(ev) {
    const item = item_for_ev(ev);

    select_item(item);
  }

  function item_for_ev(ev) {
    if (!angles || angles.a.length === 0) {
      return null;
    }

    const p = (p => ({
      x: p.x - g.w / 2,
      y: p.y - g.h / 2,
    }))(helpers.get_offset_in_canvas(ev, el_canvas));

    const r_ev = Math.sqrt(p.x*p.x + p.y*p.y);
    if (r_ev < radius__cutout() || r_ev > radius__outer()) {
      return null;
    }

    const p_angle = math.angle_from_vertical(p.x, -p.y);
    return helpers.find(angles.a, a => a > p_angle);
  }

  function find_by_title(title_or_regex) {
    const result = helpers.find(data, item => {
      if (title_or_regex.constructor === RegExp) {
        return item.title && item.title.match(title_or_regex);
      }
      return item.title === title;
    });
    return result === -1 ? null : result;
  }

  function select_item(i) {
    if (i === state.active_item) {
      i = null;
    }

    state.active_item = i;

    animQueue.add(animtask__hide_label());
    animQueue.add(animtask__show_label(i === null ? null : data[i].title))
    animQueue.start();

    if (o.click_callback) {
      o.click_callback(i !== null ? data[i] : null);
    }
  }


  // Drawing
  // ----------------------------------------------------------

  function m(x) { return g.pr * x; }

  const g = {
    regen() {
      g.pr  = el_canvas.pixel_ratio;
      g.w   = el_canvas.width;
      g.h   = el_canvas.height;
      g.min = Math.min(g.w, g.h);
      g.center = {
        x: g.w / 2,
        y: g.h / 2 + 0.5,
      };
    },
  };


  const angles = {
    regen() {
      const sum = data_total();

      angles.a = data.reduce((carry, item, i) => {
        const value = 2*Math.PI * item.value/sum + (carry[i - 1] || 0);
        return carry.concat([value]);
      }, [ ]);
    }
  };


  const state = {
    hovered_item: null,
    active_item:  null,
    active_item_progress: 0,

    label: {
      value: null,
      opacity: 1,
    },
  };


  function data_total() {
    return math.sum(data, 'value');
  }

  function radius__outer() {
    return (g.min - 2 * m(o.outer_padding)) / 2;
  }

  function radius__cutout() {
    return radius__outer() * o.cutout_radius;
  }

  function each_data_item(cb) {
    const overlap = 0.00125;

    data.forEach((item, i) => {
      let end_angle   = overlap  - Math.PI/2 + angles.a[i];
      let start_angle = -overlap - Math.PI/2 + (_ => {
        const x = angles.a[i-1];
        return x === undefined ? 0 : x;
      })();

      cb(start_angle, end_angle, item, i);
    });
  }

  function draw_data_segment(start_angle, end_angle, item, i) {
    const s = helpers.get_opts(segment_defaults, item);

    const is_active  = i === state.active_item;
    const is_hovered = i === state.hovered_item;

    const stroke_width = radius__outer() - radius__cutout();
    const r = radius__cutout() + stroke_width / 2;

    const draw_args = [ c, g.center.x, g.center.y, r, null, s.color, stroke_width, start_angle, end_angle, true];

    if (state.active_item !== null && !is_active) {
      const min_alpha = 0.3;
      c.globalAlpha = state.active_item_progress * (1 - min_alpha) + min_alpha;
    }
    draw.circle(...draw_args);
    c.globalAlpha = 1;

    if (is_hovered) {
      draw_args[5] = (_ => {
        if (item.color === 'black' || item.color.match(/^#0+$/)) {
          return `rgba(255,255,255,${is_active ? 0.3 : 0.1})`;
        }
        else {
          return `rgba(0,0,0,${is_active ? 0.3 : 0.1})`;
        }
      })();

      draw.circle(...draw_args);
    }
  }

  function draw_inner_line() {
    if (o.inner_line_width && o.cutout_radius) {
      draw.circle(c, g.center.x, g.center.y, radius__cutout(), null, o.inner_line_color, m(o.inner_line_width), 0, null, true);
    }
  }

  function draw_outer_line() {
    if (o.outer_line_width) {
      draw.circle(c, g.center.x, g.center.y, radius__outer(), null, o.outer_line_color, m(o.outer_line_width), 0, null, true);
    }
  }

  function draw_inner_label() {
    if (o.label || state.label.value) {
      const font = `${o.label_weight} ${m(o.label_fontsize)}px ${o.label_font}`;

      c.globalAlpha = state.label.opacity;
      draw.text(c, state.label.value || o.label, g.center.x, g.center.y, o.label_color, font, 'center', 'middle');
      c.globalAlpha = 1;
    }
  }


  function draw_all() {
    g.regen();
    o = helpers.get_opts(default_opts, options, g);
    angles.regen();

    if (!g.w || !g.h) {
      return;
    }

    el_canvas.dispatchEvent(new CustomEvent('force_resize'));

    c.clearRect(0, 0, g.w, g.h);

    each_data_item(draw_data_segment);
    draw_outer_line();
    draw_inner_line();
    draw_inner_label();
  }


  // Animation tasks
  // ----------------------------------------------------------

  function animtask__animate_in() {
    const data_saved = data.map(item => item.value);

    data.forEach((item, i) => {
      const reduction = i / data.length * item.value;
      item.value += reduction;
    });

    return animtask__new_values(data_saved);
  }

  function animtask__new_values(new_data) {    // new_data is a flat array of values
    const data_prev = helpers.clone(data);
    const data_new = helpers.clone(data).map((item, i) => {
      item.value = new_data[i];
      return item;
    });

    let progress = 0;

    return function() {
      progress = Math.min(progress + 0.04, 1);
      const t = math.ease_out_cubic_simple(progress);

      data_new.forEach((value_new, i) => {
        const value_orig = data_prev[i].value;
        const delta = value_new.value - value_orig;

        data[i].value = value_orig + delta * t;
      });

      draw_all();

      if (progress === 1) {
        data = data_new;
        animQueue.finishTask();
      }
    };
  }

  function animtask__hide_label() {
    let progress = 0;
    return function() {
      progress = Math.min(progress + 0.25, 1);
      state.label.opacity = 1 - progress;
      draw_all();

      if (progress === 1) {
        animQueue.finishTask();
      }
    };
  }

  function animtask__show_label(txt) {
    let progress = 0;

    return function() {
      progress = Math.min(progress + 0.06, 1);

      state.label.value = txt === o.label ? null : txt;
      state.label.opacity = progress;
      draw_all();

      if (progress === 1) {
        animQueue.finishTask();
      }
    };
  }

  function animtask__select_item(i) {
    state.active_item_progress = 0;

    return function() {
      state.active_item_progress = Math.min(state.active_item_progress + 0.2, 1);
      draw_all();

      if (state.active_item_progress === 1) {
        animQueue.finishTask();
      }
    };
  }


  const exp = {
    draw: draw_all,

    draw__animate_in() {
      animQueue.add(animtask__animate_in());
      animQueue.start();
    },

    tear_down() {
      unbind();
      animQueue.reset();
    },

    set_label(txt) {
      if (txt === state.label.value) {
        return;
      }

      if (!state.label.value) {
        animQueue.add(animtask__show_label(txt));
      }
      else {
        animQueue.add(animtask__hide_label());
        animQueue.add(animtask__show_label(txt));
      }

      animQueue.start();
    },

    set_data: function(new_vals) {  // [ value, value, ... ]
      if (new_vals.length !== data.length) {
        throw Error('BoggleChart: pie_chart.update_data(): new_vals has wrong length');
      }
      animQueue.add(animtask__new_values(new_vals));
      animQueue.start();
    },

    highlight: function(title_or_regex, trigger_click) {
      const i = find_by_title(title_or_regex);
      select_item(i);

      if (trigger_click) {
        o.click_callback(data[i]);
      }
    },
  };

  return exp;
}

export default pie_chart;


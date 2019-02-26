import AnimQueue from '../helpers/anim-queue';
import helpers from '../helpers/helpers';
import math from '../helpers/math';
import draw from '../helpers/draw';


// Default opts
// ----------------------------------------------------------

const default_opts = {
  start: () => first_of_this_month(),
  end:   (g, opts) => roadmap.add_days(opts.start, n_days_this_year() - 1),

  gridlines: false,
  gridlines_every: 'month',  // or 'week'
  gridlines_width: 0.5,
  gridlines_color: '#ccc',
  gridlines_style: 'solid',

  stream_title_color:    '#333',
  stream_line_width:     (g) => Math.min(8, g.h * 0.015),
  stream_title_fontsize: (g) => Math.min(16, g.h * 0.032),
  stream_date_fontsize:  (g) => Math.min(15, g.h * 0.032),

  popup_title_font: '"Helvetica Neue", Helvetica, Arial',
  popup_title_weight: 900,
  popup_title_color: 'black',
  popup_title_size: 18,
  popup_date_font: '"Helvetica Neue", Helvetica, Arial',
  popup_date_weight: 900,
  popup_date_color: 'aaa',
  popup_date_size: 18,

  padding_h: 10,
};

const stream_defaults = {
  color: 'black',

  start: null,
  end:   null,
};


function roadmap(el_canvas, streams, options) {
  const c = el_canvas.getContext('2d');
  let o;    // Current calculated options;


  // Events
  // ----------------------------------------------------------

  el_canvas.addEventListener('BoggleChart:resize', draw_all);
  el_canvas.addEventListener('mousemove', mouse_move);
  el_canvas.addEventListener('mousedown', mouse_down);
  el_canvas.addEventListener('mouseup', mouse_up);

  function unbind() {
    el_canvas.removeEventListener('BoggleChart:resize', draw_all);
    el_canvas.removeEventListener('mousemove', mouse_move);
    el_canvas.removeEventListener('mousedown', mouse_down);
    el_canvas.removeEventListener('mouseup', mouse_up);
  }

  function mouse_move(ev) {
    const d = deliverable_for_event(ev);
    if (!d) {
      el_canvas.style.cursor = 'default';
      return;
    }

    el_canvas.style.cursor = 'pointer';
  }
  function mouse_down(ev) {
    const d = deliverable_for_event(ev);
    anim_queue.add(animtask__select_deliverable(d));
    anim_queue.start();
  }
  function mouse_up(ev) {

  }

  function deliverable_for_event(ev) {
    const p = helpers.get_offset_in_canvas(ev, el_canvas);
    return deliverable_for_position(p);
  }

  function deliverable_for_position(p) {
    const delivs = all_deliverables().filter(x => x.__position);
    const rr = Math.pow(o.stream_line_width * 3, 2);

    const i = helpers.find(delivs, d => {
      const dx = d.__position[0] - p.x;
      const dy = d.__position[1] - p.y;
      return dx*dx + dy*dy <= rr;
    });

    return i > -1 ? delivs[i] : null;
  }

  function all_deliverables() {
    return streams.reduce((accum, stream) => {
      const delivs = stream.deliverables || [ ];
      delivs.forEach(d => d.__color = stream.color);
      return accum.concat(delivs);
    }, [ ]);
  }


  // Drawing
  // ----------------------------------------------------------

  const anim_queue = AnimQueue();
  const highlight = {
    item: null,
    progress: 0,
  };

  const selection = {
    deliverable: null,   // index in roadmap
    progress: 0,
  };

  function m(x) { return g.pr * x; }

  const g = {
    regen() {
      g.pr = el_canvas.pixel_ratio;
      g.w  = el_canvas.width;
      g.h  = el_canvas.height;
    },
  };


  function draw_gridlines() {
    if (!o.gridlines) {
      return;
    }

    // Month-aligned gridlines between start & end dates
    const w = g.w - 2 * o.padding_h;
    const a = align_to_month_boundary(o.start);
    const b = align_to_month_boundary(o.end, true);

    const n_months = (_ => {
      let n = (b.getFullYear() - a.getFullYear()) * 12 - a.getMonth() + 1 + b.getMonth();
      return Math.max(0, n) + 1;
    })();

    for (let i = 0; i < n_months; ++i) {
      const d = new Date(a);
      d.setMonth(a.getMonth() + i);

      const x = o.padding_h + w * date_as_fraction_of_date_range(d, [o.start, o.end]);

      draw.line(c, x, g.h, x, 0, o.gridlines_color, m(o.gridlines_width));
    }
  }


  function draw_streams() {
    const vertical_space_per_stream = g.h / streams.length;
    const w = g.w - 2 * o.padding_h;

    const min_alpha = 0.3;

    (streams || []).forEach((stream, i) => {
      const y = (i + 1) / (streams.length + 1) * g.h;
      const s = helpers.get_opts(stream_defaults, stream);

      const date_ranges = s.dates || [ ];
      if (s.start && s.end) {
        date_ranges.push({start: s.start, end: s.end});
      }

      let alpha;
      if (highlight.item === null)   { alpha = 1; }
      else if (highlight.item === i) { alpha = 1; }
      else                           { alpha = (1 - highlight.progress) * (1 - min_alpha) + min_alpha; }

      // Stream lines
      date_ranges.forEach(r => {
        const d_start = r.start;
        const d_end   = r.end;

        const df_start = date_as_fraction_of_date_range(d_start, [o.start, o.end]);
        const df_end   = date_as_fraction_of_date_range(d_end, [o.start, o.end]);

        const x1 = o.padding_h + w * df_start;
        const x2 = o.padding_h + w * df_end;
        const x2_actual = (x2 - x1) * math.ease_out_cubic_simple(s.draw_progress) + x1;

        draw.line(c, x1, y, x2_actual, y, s.color, m(o.stream_line_width), 'round', undefined, alpha);
      });


      // // Titles
      // if (stream.name) {
      //   c.beginPath();
      //   c.fillStyle    = o.stream_title_color;
      //   c.font         = `400 ${m(o.stream_title_fontsize)}px Roboto`;
      //   c.textBaseline = 'bottom';
      //   c.textAlign    = 'left';
      //   c.fillText(stream.name, x1, y - o.stream_title_fontsize/2);
      //   c.closePath();
      // }

      // Deliverables
      (s.deliverables || [ ]).forEach(deliv => {
        const df = date_as_fraction_of_date_range(deliv.date, [o.start, o.end]);
        const x = o.padding_h + w * df;

        const r = o.stream_line_width;
        const rk = 1 + (deliv !== selection.deliverable ? 0 : math.ease_out_cubic_simple(selection.progress) * 0.6);
        const rj = math.ease_out_cubic_simple(deliv.draw_progress || 0);
        const stroke = 5/8 * o.stream_line_width * rk;

        deliv.__position = [x, y];

        c.beginPath();
        c.arc(x, y, m(r) * rk * rj || 0, 0, 2 * Math.PI);
        c.fillStyle = 'white';
        c.fill();

        c.globalAlpha = alpha;
        c.strokeStyle = s.color;
        c.lineWidth   = m(stroke);
        c.stroke();
        c.closePath();
        c.globalAlpha = 1;
      });
    });
  }


  function draw_selected_deliverable() {
    if (!selection.deliverable) {
      return;
    }

    const d = selection.deliverable;
    const p = d.__position;

    const fontsize__title = m(o.popup_title_size);
    const fontsize__date = m(o.popup_date_size);
    const font__title = `${o.popup_title_weight} ${fontsize__title}px ${o.popup_title_font}`;
    const font__date  = `${o.popup_date_weight} ${fontsize__date}px ${o.popup_date_font}`;

    // Calculate popup size
    const targs__title = [
      c, d.name || '[no name]', 0, 0,  o.popup_title_color, font__title, 0, 'top'
    ];
    const targs__date = [
      c, friendly_date_string(d.date), 0, fontsize__title * 1.4, o.popup_date_color, font__date, 0, 'top'
    ];
    const textsize__title = draw.text(...targs__title, true);
    const textsize__date  = draw.text(...targs__date, true);
    const txt_w = Math.max(textsize__title.width, textsize__date.width);

    const popup_padding = m(28);
    const popup_stroke = m(4);
    const popup_radius = m(13);
    const popup_w = popup_padding + txt_w + popup_padding*3;
    const popup_h = 2*popup_padding + 1.5 * fontsize__title + fontsize__date;


    const popup_args = [ c, p[0], p[1] + m(4), popup_w, popup_h, g.w, g.h, popup_radius, 'white' ];
    const bounds = draw.popup_box(...popup_args, true);
    const stroke_bounds = (_ => {
      const s = bounds.pointer_side;
      const out = Object.assign({}, bounds);
      out.y += s === draw.TOP ? popup_stroke : 0;
      out.y += s === draw.BOTTOM ? -popup_stroke : 0;
      out.x += s === draw.LEFT ? popup_stroke : 0;
      out.x += s === draw.RIGHT ? -popup_stroke : 0;
      return out;
    })();

    function shadow_on(opacity) {
      c.save()
      c.shadowColor = `rgba(207,207,207,${opacity})`;
      c.shadowBlur = m(9);
      c.shadowOffsetY = m(2);
    }
    function shadow_off() {
      c.restore();
    }

    const shadow_progress = math.clamp((selection.progress - 0.5)/0.5, 0, 1);
    const main_progress = math.clamp(selection.progress/0.5, 0, 1);
    console.log('shadow', shadow_progress, 'main', main_progress);

    c.globalAlpha = main_progress;

    shadow_on(shadow_progress);
    draw.popup_box(...popup_args, false, d.__color);
    shadow_off();

    targs__title[2] = bounds.x + popup_padding;
    targs__title[3] = bounds.y + popup_padding - m(3);

    targs__date[2] = bounds.x + popup_padding;
    targs__date[3] += bounds.y + popup_padding - m(3);

    draw.text(...targs__title);
    draw.text(...targs__date);

    c.globalAlpha = 1;
  }


  function draw_all() {
    g.regen();
    o = helpers.get_opts(default_opts, options, g);

    c.clearRect(0, 0, g.w, g.h);
    draw_gridlines();
    draw_streams();
    draw_selected_deliverable();
  }


  function do_draw() {
    anim_queue.reset();
    anim_queue.add(animtask__delayed_time_series(all_deliverables(), 0.2, 0.1, 0.025));
    anim_queue.add(animtask__delayed_time_series(streams, 0.3, 0.2, 0.03));
    anim_queue.start();
  }


  function animtask__delayed_time_series(arr, time_for_item, overlap, time_increment) {
    let progress = 0;

    return function() {
      const time_progress = math.delayed_time_series(arr.length, time_for_item, overlap, progress);
      arr.forEach((item, i) => item.draw_progress = time_progress[i]);

      draw_all();

      progress = Math.min(progress + time_increment, 1);
      if (progress === 1) {
        anim_queue.finishTask();
        arr.forEach(item => item.draw_progress = 1);
        draw_all();
      }
    };
  }


  function animtask__select_deliverable(d) {
    selection.deliverable = d;
    selection.progress = 0;

    if (!d) {
      return function() {
        anim_queue.finishTask();
        draw_all();
      }
    }

    return function() {
      draw_all();

      selection.progress = Math.min(selection.progress + 0.08, 1);
      if (selection.progress === 1) {
        anim_queue.finishTask();
        draw_all();
      }
    }
  }


  return {
    draw: do_draw,
  };
}


// Date helpers
// ----------------------------------------------------------

function first_of_this_month() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function days_in_month(year, month) {
  const is_28 = (new Date(year, month, 29)).getMonth() !== month;
  const is_29 = (new Date(year, month, 30)).getMonth() !== month;
  const is_30 = (new Date(year, month, 31)).getMonth() !== month;
  return is_28 ? 28 :
    is_29 ? 29 :
    is_30 ? 30 : 31;
}

function n_days_this_year() {
  const d = new Date();
  const days_in_feb = days_in_month(d.getFullYear(), 1);
  return days_in_feb === 28 ? 365 : 366;
}

roadmap.add_days = function(d, days) {
  const d2 = new Date(d.getTime());
  d2.setDate(d2.getDate() + days);
  return d2;
};

function increment_month(d) {
  const d2 = roadmap.add_days(d, 1);
  return align_to_month_boundary(d2);
}

function align_to_month_boundary(d, align_prev) {
  if (d.getDate() === 1) {
    return new Date(d.getTime());
  }

  const d2 = new Date(d.getFullYear(), d.getMonth(), 1);

  if (!align_prev) {
    const days_to_add = days_in_month(d.getFullYear(), d.getMonth());
    return roadmap.add_days(d2, days_to_add);
  }

  else {
    const month = d.getMonth();
    const year = d.getFullYear();
    const days_to_remove = d === 0 ?
      days_in_month(year - 1, 11) :
      days_in_month(year, month - 1);
    return roadmap.add_days(d2, days_to_remove);
  }
}

function date_as_fraction_of_date_range(d, range) {
  const x = d.getTime();
  const a = range[0].getTime();
  const b = range[1].getTime();

  return (x - a) / (b - a);
}

function friendly_date_string(d) {
  return `${d.toLocaleDateString('en-EN', {day: 'numeric', month: 'long'})}, ${d.getFullYear()}`;
}


export default roadmap;


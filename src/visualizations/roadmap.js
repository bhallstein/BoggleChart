import AnimQueue from '../helpers/anim-queue';
import helpers from '../helpers/helpers';
import math from '../helpers/math';
import draw from '../helpers/draw';
import date from '../helpers/date';


// Default opts
// ----------------------------------------------------------

const default_opts = {
  start: date.first_of_this_month,
  end:   (g, opts) => date.add_days(opts.start, date.n_days_this_year() - 1),

  gridlines:       false,
  gridlines_width: 1,
  gridlines_color: '#ccc',
  gridlines_style: 'solid',
  gridlines_minor:       false,
  gridlines_minor_width: 1,
  gridlines_minor_color: '#ccc',
  gridlines_minor_style: 'dashed',

  header:                 false,
  header_fontsize:        (g) => Math.min(18, g.h * 0.03),
  header_font:            '"Helvetica Neue", Helvetica, Arial',
  header_color:           '#a9a9a9',
  header_weight:          600,
  header_vpadding:        (g) => Math.min(12, g.h * 0.015),
  header_show_year:       true,
  header_gridlines_color: '#a9a9a9',
  header_gridlines_width: 2,

  stream_title_font:     '"Helvetica Neue", Helvetica, Arial',
  stream_title_color:    '#333',
  stream_title_weight:   600,
  stream_title_fontsize: (g) => Math.min(16, g.h * 0.032),
  stream_line_width:     (g) => Math.min(10, g.h * 0.015),
  stream_date_fontsize:  (g) => Math.min(16, g.h * 0.032),

  popup_title_font:   '"Helvetica Neue", Helvetica, Arial',
  popup_title_weight: 900,
  popup_title_color:  'black',
  popup_title_size:   18,
  popup_date_font:    '"Helvetica Neue", Helvetica, Arial',
  popup_date_weight:  900,
  popup_date_color:   '#a9a9a9',
  popup_date_size:    18,

  padding_h: 40,
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
    el_canvas.style.cursor = d ? 'pointer' : 'default';
  }
  function mouse_down(ev) {
    const d = deliverable_for_event(ev);
    select_deliverable(d);
  }
  function mouse_up(ev) {

  }

  function select_deliverable(d) {
    anim_queue.add(animtask__select_deliverable(d));
    anim_queue.start();
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

  const selection = {
    deliverable: null,
    stream: null,
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


  function header_height() {
    return o.header ? m(o.header_fontsize) + m(o.header_vpadding * 2) : 0;
  }


  function iterate_quarters(f) {
    const a = o.start_aligned;
    const b = o.end_aligned;

    const months = Array.apply(null, {length: o.n_months - 1})
      .map((_, i) => date.increment_month(a, i));

    const quarter_boundary_months = [new Date(a)].concat(months)
      .filter(date.is_quarter_boundary);

    quarter_boundary_months.slice(0, -1).forEach((d, i) => {
      const next = quarter_boundary_months[i + 1];
      const last = i === quarter_boundary_months.length - 2;
      const x1 = o.padding_h + o.w * date.fraction_of_date_range(d, [o.start, o.end]);
      const x2 = o.padding_h + o.w * date.fraction_of_date_range(next, [o.start, o.end]);

      f(d, Math.floor(x1) + 0.5, Math.floor(x2) + 0.5, last);
    });
  }


  function draw_header_section() {
    if (!o.header) {
      return;
    }

    const font = `${o.header_weight} ${m(o.header_fontsize)}px ${o.header_font}`;

    function divider(x) {
      const y1 = m(o.header_vpadding);
      const y2 = y1 + m(o.header_fontsize);
      draw.line(c, x, y1, x, y2, o.header_gridlines_color, m(o.header_gridlines_width));
    }

    iterate_quarters((d, x1, x2, is_last) => {
      const text = `Q${date.quarter_name(d)}` + (o.header_show_year ? ` ${d.getFullYear()}` : '');

      draw.text(c, text, (x1 + x2) / 2, o.header_vpadding, o.header_color, font, 'center', 'top');

      divider(x1);
      if (is_last) {
        divider(x2);
      }
    });
  }


  function draw_gridlines() {
    if (!o.gridlines) {
      return;
    }

    const y_top = header_height();
    const quarter_lines = [ ];

    // Quarter gridlines
    iterate_quarters((d, x1, x2, is_last) => {
      quarter_lines.push(x1);
      draw.line(c, x1, g.h, x1, y_top + m(1), o.gridlines_color, m(o.gridlines_width));

      if (is_last) {
        quarter_lines.push(x2);
        draw.line(c, x2, g.h, x2, y_top + m(1), o.gridlines_color, m(o.gridlines_width));
      }
    });

    // Minor (month) gridlines
    if (o.gridlines_minor) {
      const a = o.start_aligned;
      const b = o.end_aligned;
      const dash = o.gridlines_minor_style === 'dashed' ? [ m(2), m(5) ] : null;

      for (let i = 0; i < o.n_months; ++i) {
        const d = new Date(a);
        d.setMonth(a.getMonth() + i);

        const x = Math.floor(o.padding_h + o.w * date.fraction_of_date_range(d, [o.start, o.end])) + 0.5;
        if (!quarter_lines.includes(x)) {
          draw.line(c, x, g.h, x, y_top + m(1), o.gridlines_minor_color, m(o.gridlines_minor_width), null, dash);
        }
      }
    }
  }


  function draw_streams() {
    const vertical_space_per_stream = g.h / streams.length;

    const min_alpha = 0.3;

    (streams || []).forEach((stream, i) => {
      const y = (i + 1) / (streams.length + 1) * g.h;
      const s = helpers.get_opts(stream_defaults, stream);

      const date_ranges = s.dates || [ ];
      if (s.start && s.end) {
        date_ranges.push({start: s.start, end: s.end});
      }

      let alpha = 1;
      // if (selection.deliverable === null)                 { alpha = 1; }
      // else if (selection.deliverable.__stream === stream) { alpha = 1; }
      // else                                                { alpha = (1 - selection.progress) * (1 - min_alpha) + min_alpha; }

      // Stream lines
      date_ranges.forEach(r => {
        const d_start = r.start;
        const d_end   = r.end;

        const df_start = date.fraction_of_date_range(d_start, [o.start, o.end]);
        const df_end   = date.fraction_of_date_range(d_end, [o.start, o.end]);

        const x1 = o.padding_h + o.w * df_start;
        const x2 = o.padding_h + o.w * df_end;
        const x2_actual = (x2 - x1) * math.ease_out_cubic_simple(s.draw_progress) + x1;

        draw.line(c, x1, y, x2_actual, y, s.color, m(o.stream_line_width), 'round', undefined, o.alpha);

        if (r.name) {
          const font = `${o.stream_title_weight} ${o.stream_title_fontsize}px ${o.stream_title_font}`;
          draw.text(c, r.name, x1, y - m(o.stream_line_width) * 1.5, o.stream_title_color, font);
        }
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
        const df = date.fraction_of_date_range(deliv.date, [o.start, o.end]);
        const x = o.padding_h + o.w * df;

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
      c, date.friendly_date_string(d.date), 0, fontsize__title * 1.4, o.popup_date_color, font__date, 0, 'top'
    ];
    const textsize__title = draw.text(...targs__title, true);
    const textsize__date  = draw.text(...targs__date, true);
    const txt_w = Math.max(textsize__title.width, textsize__date.width);

    const popup_padding = m(28);
    const popup_stroke = m(4);
    const popup_radius = m(13);
    const popup_w = popup_padding + txt_w + popup_padding*3;
    const popup_h = 2*popup_padding + 1.5 * fontsize__title + fontsize__date;


    const popup_args = [ c, p[0], p[1], popup_w, popup_h, g.w, g.h, popup_radius, 'white' ];
    const bounds = draw.popup_box(...popup_args, true);

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
    const main_progress   = math.clamp(selection.progress/0.5, 0, 1);

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
    o.w             = g.w - 2 * m(o.padding_h);
    o.start_aligned = date.align_to_month_boundary(o.start);
    o.end_aligned   = date.align_to_month_boundary(o.end, true);
    o.n_months      = date.full_months_between(o.start_aligned, o.end_aligned);

    c.clearRect(0, 0, g.w, g.h);
    draw_header_section();
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
      progress = Math.min(progress + time_increment, 1);

      const time_progress = math.delayed_time_series(arr.length, time_for_item, overlap, progress);
      arr.forEach((item, i) => item.draw_progress = time_progress[i]);

      draw_all();

      if (progress === 1) {
        anim_queue.finishTask();
      }
    };
  }


  function animtask__select_deliverable(d) {
    if (d) {
      selection.deliverable = d;
      selection.progress = 0;
    }

    const increment = 0.090909;

    return function() {
      draw_all();

      if (d) {
        selection.progress = Math.min(selection.progress + increment, 1);
      }
      else {
        selection.progress = Math.max(selection.progress - increment, 0);
      }

      if (selection.progress === (d ? 1 : 0)) {
        anim_queue.finishTask();
        draw_all();

        if (!d) {
          selection.deliverable = null;
        }
      }
    }
  }


  return {
    draw: do_draw,

    all_deliverables,
    select_deliverable,
  };
}


// Date helpers
// ----------------------------------------------------------


export default roadmap;


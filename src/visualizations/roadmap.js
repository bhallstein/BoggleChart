import helpers from '../helpers/helpers';
import math from '../helpers/math';
import {draw_line} from '../helpers/draw';


// Default opts
// ----------------------------------------------------------

const default_opts = {
  start_date: () => first_of_this_month(),
  end_date:   (g, opts) => roadmap.add_days(opts.start_date, n_days_this_year() - 1),

  gridlines: false,
  gridlines_every: 'month',  // or 'week'
  gridlines_width: 0.5,
  gridlines_color: '#ccc',
  gridlines_style: 'solid',

  stream_title_color: '#333',
  stream_line_width: (g) => Math.min(8, g.h * 0.015),
  stream_title_fontsize: (g) => Math.min(16, g.h * 0.032),

  padding_h: 10,
};

const stream_defaults = {
  color: 'black',

  start_date: null,
  end_date: null,
};


function roadmap(el_canvas, streams, options) {
  const c = el_canvas.getContext('2d');
  let o;    // Current calculated options;


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
    },
  };


  function draw_gridlines() {
    if (!o.gridlines) {
      return;
    }

    // Month-aligned gridlines between start & end dates
    const w = g.w - 2 * o.padding_h;
    const a = align_to_month_boundary(o.start_date);
    const b = align_to_month_boundary(o.end_date, true);

    const n_months = (_ => {
      let n = (b.getFullYear() - a.getFullYear()) * 12 - a.getMonth() + 1 + b.getMonth();
      return Math.max(0, n) + 1;
    })();

    for (let i = 0; i < n_months; ++i) {
      const d = new Date(a);
      d.setMonth(a.getMonth() + i);

      const x = o.padding_h + w * date_as_fraction_of_date_range(d, [o.start_date, o.end_date]);

      draw_line(c, x, g.h, x, 0, o.gridlines_color, m(o.gridlines_width));
    }
  }


  function draw_streams() {
    const vertical_space_per_stream = g.h / streams.length;
    const w = g.w - 2 * o.padding_h;

    (streams || []).forEach((stream, i) => {
      const y = (i + 1) / (streams.length + 1) * g.h;
      const s = helpers.get_opts(stream_defaults, stream);

      const date_ranges = s.dates || [ ];
      if (s.start_date && s.end_date) {
        date_ranges.push({start_date: s.start_date, end_date: s.end_date});
      }

      date_ranges.forEach(r => {
        const d_start = r.start_date;
        const d_end   = r.end_date;

        const df_start = date_as_fraction_of_date_range(d_start, [o.start_date, o.end_date]);
        const df_end   = date_as_fraction_of_date_range(d_end, [o.start_date, o.end_date]);

        const x1 = o.padding_h + w * df_start;
        const x2 = o.padding_h + w * df_end;

        // Main lines
        draw_line(c, x1, y, x2, y, s.color, m(o.stream_line_width), 'round');
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
        const df = date_as_fraction_of_date_range(deliv.date, [o.start_date, o.end_date]);
        const x = o.padding_h + w * df;

        const r = o.stream_line_width;
        const stroke = 5/8 * o.stream_line_width;

        c.beginPath();
        c.arc(x, y, m(r), 0, 2 * Math.PI);
        c.fillStyle = 'white';
        c.fill();

        c.strokeStyle = s.color;
        c.lineWidth = m(stroke);
        c.stroke();
        c.closePath();
      });
    });
  }



  function draw_all() {
    g.regen();
    o = helpers.get_opts(default_opts, options, g);

    c.clearRect(0, 0, g.w, g.h);
    draw_gridlines();
    draw_streams();
  }


  return {

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


export default roadmap;


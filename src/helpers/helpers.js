
// general helpers
// -------------------------------

function get_opts(default_opts, options, g) {
  const opts = Object.assign({}, default_opts, options);

  // Process function options
  Object.keys(opts)
    .filter(k => typeof opts[k] === 'function')
    .forEach(k => opts[k] = opts[k](g, opts));

  return opts;
}


function get_offset(ev, el) {
  const rect = el.getBoundingClientRect();
  return {
    x: ev.clientX - rect.left,
    y: ev.clientY - rect.top,
  };
}


function get_offset_in_canvas(ev, canvas) {
  const p = get_offset(ev, canvas);
  p.x = p.x * canvas.pixel_ratio;
  p.y = p.y * canvas.pixel_ratio;
  return p;
}


function clone(obj) {
  return JSON.parse(JSON.stringify(obj));  // :/
}


function find(arr, f) {
  const ind = arr.reduce((accum, item, i) => {
    if (accum === -1 && f(item, i)) {
      accum = i;
    }
    return accum;
  }, -1);
  return ind;
}


function totalData(arr, summation_property) {
  return arr.reduce((accum, x, i) => accum + x[summation_property], 0);
}


const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const months_short = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
function monthName(date, short) {
  return (short ? months_short : months)[date.getMonth()];
}


function getJSON(url, cb_success, cb_err, cb_progr) {
  const xhr = new XMLHttpRequest;
  xhr.addEventListener('progress', cb_progr);
  xhr.addEventListener('error', cb_err);
  xhr.addEventListener('abort', cb_err);
  xhr.open('get', url, true);
  xhr.addEventListener('readystatechange', function() {
    if (xhr.readyState == 4) {
      if (xhr.responseText) { cb_success(xhr.responseText); }
      else                  { cb_err(); }
    }
  });
  xhr.send();
}


export default {
  get_opts,
  get_offset,
  get_offset_in_canvas,
  clone,
  find,
  totalData,
  monthName,
  getJSON,
};


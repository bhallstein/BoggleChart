
// general helpers
// -------------------------------


function getOffset(ev, el) {
  var rect = el.getBoundingClientRect();
  return {
    x: ev.clientX - rect.left,
    y: ev.clientY - rect.top,
  };
}


function getOffset_canv(ev, el) {
  var p = getOffset(ev, el);
  p.x = p.x * el.pixel_ratio;
  p.y = p.y * el.pixel_ratio;
  return p;
}


function clone(obj) {
  return JSON.parse(JSON.stringify(obj));  // :/
}


function totalData(arr, summation_property) {
  return arr.reduce((accum, x, i) => accum + x[summation_property], 0);
}


const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const months_short = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];
function monthName(date, short) {
  return (short ? months_short : months)[date.getMonth()];
}


function getJSON(url, cb_success, cb_err, cb_progr) {
  var xhr = new XMLHttpRequest;
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
  getOffset,
  getOffset_canv,
  clone,
  totalData,
  monthName,
  getJSON,
};


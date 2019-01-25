
// math helpers
// -------------------------------


function clamp(x, min, max) {
  return Math.min(Math.max(x, min), max);
}


function ease_out_cubic(x, t, start_value, delta, duration) {
  t = t/duration - 1;
  return delta * (t*t*t + 1) + start_value;
}


function ease_out_cubic_simple(t) {
  return ease_out_cubic(0, t, 0, 1, 1);
}


function ease_in_out_cubic_simple(t) {
  return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1
}


function bezier_curve(ctx, points, tension, numOfSeg, close) {
  if (typeof points === 'undefined' || points.length < 2) {
    return new Float32Array(0);
  }

  // options or defaults
  tension = typeof tension === 'number' ? tension : 0.5;
  numOfSeg = typeof numOfSeg === 'number' ? numOfSeg : 25;

  let pts = points.slice(0),
    i = 1,
    l = points.length,
    rPos = 0,
    rLen = (l-2) * numOfSeg + 2 + (close ? 2 * numOfSeg: 0),
    res = new Float32Array(rLen),
    cache = new Float32Array((numOfSeg + 2) << 2),
    cachePtr = 4;

  if (close) {
    pts.unshift(points[l - 1]);                 // insert end point as first point
    pts.unshift(points[l - 2]);
    pts.push(points[0], points[1]);             // first point as last point
  }
  else {
    pts.unshift(points[1]);                     // copy 1. point and insert at beginning
    pts.unshift(points[0]);
    pts.push(points[l - 2], points[l - 1]);     // duplicate end-points
  }

  // cache inner-loop calculations as they are based on t alone
  cache[0] = 1;                            // 1,0,0,0

  for ( ; i < numOfSeg; i++) {
    var st = i / numOfSeg,
      st2 = st * st,
      st3 = st2 * st,
      st23 = st3 * 2,
      st32 = st2 * 3;

    cache[cachePtr++] = st23 - st32 + 1;       // c1
    cache[cachePtr++] = st32 - st23;           // c2
    cache[cachePtr++] = st3 - 2 * st2 + st;    // c3
    cache[cachePtr++] = st3 - st2;             // c4
  }

  cache[++cachePtr] = 1;                       // 0,1,0,0

  // calc. points
  parse(pts, cache, l, tension);

  if (close) {
    pts = [];
    pts.push(points[l - 4], points[l - 3],
         points[l - 2], points[l - 1],               // second last and last
         points[0], points[1],
         points[2], points[3]);                 // first and second
    parse(pts, cache, 4, tension);
  }

  function parse(pts, cache, l, tension) {
    for (var i = 2, t; i < l; i += 2) {
      var pt1 = pts[i],
        pt2 = pts[i+1],
        pt3 = pts[i+2],
        pt4 = pts[i+3],

        t1x = (pt3 - pts[i-2]) * tension,
        t1y = (pt4 - pts[i-1]) * tension,
        t2x = (pts[i+4] - pt1) * tension,
        t2y = (pts[i+5] - pt2) * tension,
        c = 0, c1, c2, c3, c4;

      for (t = 0; t < numOfSeg; t++) {
        c1 = cache[c++];
        c2 = cache[c++];
        c3 = cache[c++];
        c4 = cache[c++];

        res[rPos++] = c1 * pt1 + c2 * pt3 + c3 * t1x + c4 * t2x;
        res[rPos++] = c1 * pt2 + c2 * pt4 + c3 * t1y + c4 * t2y;
      }
    }
  }

  // add last point
  l = close ? 0 : points.length - 2;
  res[rPos++] = points[l++];
  res[rPos] = points[l];

  return res;
}


function quadrant(x, y) {
  if (x == 0 && y == 0) {
    return 0;
  }
  if (x > 0) {
    return y > 0 ? 1 : 2;
  }
  return y > 0 ? 4 : 3;
}


function angle_from_vertical(x, y) {
  var q = quadrant(x, y);
  if (q == 0) { return 0; }
  if (q == 1) { return Math.atan(x/y); }
  if (q == 2) { return Math.PI - Math.atan(-x/y); }
  if (q == 3) { return Math.PI + Math.atan(x/y); }
  return Math.PI * 3/2 + Math.atan(-y/x);
}


function format_number(x, n_decimals) {
  n_decimals = n_decimals === undefined ? -1 : n_decimals;

  const parts = x.toString().split('.');
  if (parts.length === 2 && n_decimals >= 0) {
    if (n_decimals == 0) {
      parts.pop();
    }
    else {
      const leading_zeros_m = parts[1].match(/^0+/);
      const leading_zeros = leading_zeros_m ? leading_zeros_m[0] : '';
      const frac = parseFloat(parts[1]);

      parts[1] = Math.round(frac / Math.pow(10, parts[1].length - n_decimals));
      parts[1] = leading_zeros + parts[1].toString().replace(/0+$/, '');

      if (parts[1].match(/^0+$/)) {
        parts = parts.slice(0,1);
      }
    }
  }
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}


export default {
  clamp,
  ease_out_cubic,
  ease_out_cubic_simple,
  ease_in_out_cubic_simple,
  bezier_curve,
  quadrant,
  angle_from_vertical,
  format_number,
};


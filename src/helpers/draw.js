
// drawing helpers
// -------------------------------

const LEFT   = 1;
const RIGHT  = 2;
const TOP    = 3;
const BOTTOM = 4;

const NEAR = 10;
const FAR  = 20;


function line(context, from_x, from_y, to_x, to_y, color, width, line_cap, dash, alpha) {
  context.beginPath();
  context.strokeStyle = color;
  context.lineWidth   = width;
  context.lineCap     = line_cap || 'butt';
  if (dash) {
    context.setLineDash(dash);
  }
  if (alpha !== undefined) {
    context.globalAlpha = alpha;
  }

  context.moveTo(from_x, from_y);
  context.lineTo(to_x, to_y);
  context.stroke();
  context.closePath();

  context.setLineDash([]);
  context.globalAlpha = 1;
}


function circle(context, x, y, radius, fill, stroke, stroke_width, start_angle, end_angle) {
  const start = start_angle === undefined ? 0 : start_angle;
  const end   = end_angle   === undefined ? 2 * Math.PI : end_angle;

  context.beginPath();
  context.moveTo(x, y);
  context.fillStyle   = fill || 'transparent';
  context.strokeStyle = stroke || 'transparent';
  context.lineWidth   = stroke_width;

  context.arc(x, y, radius, start, end);
  context.fill();
  context.stroke();

  context.closePath();
}


function text(context, text, x, y, color, font, h_align, v_align, measure) {
  if (!measure) {
    context.beginPath();
  }

  context.fillStyle    = color;
  context.font         = font;
  context.textBaseline = v_align || 'bottom';
  context.textAlign    = h_align || 'left';

  if (measure) {
    return context.measureText(text);
  }

  context.fillText(text, x, y);
  context.closePath();
}


function round_rect(context, x, y, w, h, radius, color) {
  context.beginPath();
  context.moveTo(x + radius, y);

  context.arcTo(x+w, y,   x+w,        y+radius,   radius);
  context.arcTo(x+w, y+h, x+w-radius, y+h,        radius);
  context.arcTo(x,   y+h, x,          y+h-radius, radius);
  context.arcTo(x,   y,   x+radius,   y,          radius);

  context.fillStyle = color;
  context.fill();
  context.closePath();
}


function popup_box(context, x, y, w, h, canvas_w, canvas_h, radius, color, measure) {
  // draw a popup box focused on (x,y) - i.e. with a 'pointer triangle' pointing to that point
  const triangle_height = radius * 1.35;
  const triangle_width  = radius * 2.2;

  const triangle_hpos__near = w / 3;
  const triangle_hpos__far  = 2 * triangle_hpos__near;
  const triangle_vpos__near = h / 4;
  const triangle_vpos__far  = triangle_vpos__near;

  let bounds = {
    x: x - triangle_width/2 - triangle_hpos__near,
    y: y + triangle_height,
  };

  const x_in_left_half = x <= canvas_w/2;
  const y_in_top_half  = y <= canvas_h/2;

  const triangle_box_side = (function() {
    if (bounds.y + h > canvas_h) { return BOTTOM; }
    if (bounds.x + w > canvas_w) { return RIGHT; }
    if (bounds.x < 0) { return LEFT; }
    return TOP;
  })();

  const triangle_near_or_far = (function() {
    if (triangle_box_side === TOP)    { return x_in_left_half ? NEAR : FAR;  }
    if (triangle_box_side === BOTTOM) { return x_in_left_half ? FAR  : NEAR; }
    if (triangle_box_side === RIGHT)  { return y_in_top_half ? NEAR : FAR; }
    return y_in_top_half ? FAR : NEAR;
  })();

  // Recalculate bounds now that we know where the triangle is positioned
  bounds = {
    [TOP + NEAR]: {  x: x - triangle_hpos__near,  y: y + triangle_height  },
    [TOP + FAR]:  {  x: x - triangle_hpos__far,   y: y + triangle_height  },

    [BOTTOM + NEAR]: {  x: x - triangle_width/2 - triangle_hpos__far,   y: y - triangle_height - h  },
    [BOTTOM + FAR]:  {  x: x - triangle_width/2 - triangle_hpos__near,  y: y - triangle_height - h  },

    [RIGHT + NEAR]: {  x: x - triangle_height - w,  y: y - triangle_width/2 - triangle_vpos__near  },
    [RIGHT + FAR]:  {  x: x - triangle_height - w,  y: y - triangle_width/2 - triangle_vpos__far   },

    [LEFT + NEAR]:  {  x: x + triangle_height,  y: y - triangle_width/2 - triangle_vpos__far  },
    [LEFT + FAR]:   {  x: x + triangle_height,  y: y - triangle_width/2 - triangle_vpos__near },
  }[triangle_box_side + triangle_near_or_far];

  bounds.pointer_side = triangle_box_side;

  if (measure) {
    return bounds;
  }


  function draw_vertical_triangle(px, py, direction) {
    const k = direction === TOP ? 1 : -1;

    context.lineTo(px - triangle_width/2, py + k * triangle_height);
    context.lineTo(px, py);
    context.lineTo(px + triangle_width/2, py + k * triangle_height);
  }

  function draw_horizontal_triangle(px, py, direction) {
    const k = direction === LEFT ? 1 : -1;

    context.lineTo(px + k * triangle_height, py - triangle_width/2);
    context.lineTo(px, py);
    context.lineTo(px + k * triangle_height, py + triangle_width/2);
  }

  context.beginPath();
  context.moveTo(bounds.x + radius, bounds.y);

  if (triangle_box_side === TOP) { draw_vertical_triangle(x, y, triangle_box_side); }
  context.arcTo(bounds.x+w, bounds.y, bounds.x+w, bounds.y+radius, radius);

  if (triangle_box_side === RIGHT) { draw_horizontal_triangle(x, y, triangle_box_side); }
  context.arcTo(bounds.x+w, bounds.y+h, bounds.x + w - radius, bounds.y+h, radius);

  if (triangle_box_side === BOTTOM) { draw_vertical_triangle(x, y, triangle_box_side); }
  context.arcTo(bounds.x, bounds.y+h, bounds.x, bounds.y + h - radius, radius);

  if (triangle_box_side === LEFT) { draw_horizontal_triangle(x, y, triangle_box_side); }
  context.arcTo(bounds.x, bounds.y, bounds.x+radius, bounds.y, radius);

  context.fillStyle = color;
  context.fill();
  context.closePath();

  return bounds;
}


export default {
  line,
  circle,
  text,
  round_rect,
  popup_box,

  LEFT,
  RIGHT,
  BOTTOM,
  TOP,
};

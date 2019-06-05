
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
  context.textAlign    = h_align || 'left';
  context.textBaseline = v_align || 'bottom';

  if (measure) {
    return context.measureText(text);
  }

  context.fillText(text, x, y);
  context.closePath();
}


function rect(context, x, y, w, h, color) {
  context.beginPath();
  context.moveTo(x, y);

  context.rect(x, y, w, h);
  context.fillStyle = color;
  context.fill();

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


function popup_box(context, x, y, w, h, canvas_w, canvas_h, radius, color, measure, stroke_color) {
  // draw a popup box focused on (x,y) - i.e. with a 'pointer triangle' pointing to that point
  const triangle_height = radius * 1.35;
  const triangle_width  = radius * 2.2;

  const triangle_hpos__near = w / 3.5;
  const triangle_hpos__far  = w - triangle_hpos__near;
  const triangle_vpos__near = h / 4;
  const triangle_vpos__far  = triangle_vpos__near;


  // Calculate bounds
  function inside_canvas(xy) {
    return xy.x >= 0 && xy.x + w < canvas_w && xy.y >= 0 && xy.y + h < canvas_h;
  }

  let bounds = {
    [TOP + NEAR]    : { x: x - triangle_hpos__near,                     y: y + triangle_height                         },
    [TOP + FAR]     : { x: x - triangle_hpos__far,                      y: y + triangle_height                         },
    [BOTTOM + NEAR] : { x: x - triangle_width/2 - triangle_hpos__far,   y: y - triangle_height - h                     },
    [BOTTOM + FAR]  : { x: x - triangle_width/2 - triangle_hpos__near,  y: y - triangle_height - h                     },
    [LEFT + NEAR]   : { x: x + triangle_height,                         y: y - triangle_width/2 - triangle_vpos__far   },
    [LEFT + FAR]    : { x: x + triangle_height,                         y: y - triangle_width/2 - triangle_vpos__near  },
    [RIGHT + NEAR]  : { x: x - triangle_height - w,                     y: y - triangle_width/2 - triangle_vpos__near  },
    [RIGHT + FAR]   : { x: x - triangle_height - w,                     y: y - triangle_width/2 - triangle_vpos__far   },
  };

  const [pointer_side, pointer_near_far] = (_ => {
    return (
      inside_canvas(bounds[TOP    + NEAR]) ? [ TOP,    NEAR ] :
      inside_canvas(bounds[TOP    + FAR])  ? [ TOP,    FAR  ] :
      inside_canvas(bounds[BOTTOM + NEAR]) ? [ BOTTOM, NEAR ] :
      inside_canvas(bounds[BOTTOM + FAR])  ? [ BOTTOM, FAR  ] :
      inside_canvas(bounds[LEFT   + NEAR]) ? [ LEFT,   NEAR ] :
      inside_canvas(bounds[LEFT   + FAR])  ? [ LEFT,   FAR  ] :
      inside_canvas(bounds[RIGHT  + NEAR]) ? [ RIGHT,  NEAR ] :
      [ RIGHT, FAR ]
    );
  })();

  bounds = Object.assign(bounds[pointer_side + pointer_near_far], {pointer_side});

  if (measure) {
    return bounds;
  }


  // Draw
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

  if (pointer_side === TOP) { draw_vertical_triangle(x, y, pointer_side); }
  context.arcTo(bounds.x+w, bounds.y, bounds.x+w, bounds.y+radius, radius);

  if (pointer_side === RIGHT) { draw_horizontal_triangle(x, y, pointer_side); }
  context.arcTo(bounds.x+w, bounds.y+h, bounds.x + w - radius, bounds.y+h, radius);

  if (pointer_side === BOTTOM) { draw_vertical_triangle(x, y, pointer_side); }
  context.arcTo(bounds.x, bounds.y+h, bounds.x, bounds.y + h - radius, radius);

  if (pointer_side === LEFT) { draw_horizontal_triangle(x, y, pointer_side); }
  context.arcTo(bounds.x, bounds.y, bounds.x+radius, bounds.y, radius);

  context.fillStyle = color;
  context.fill();
  context.closePath();


  if (stroke_color && pointer_side !== BOTTOM) {
    const stroke_width = 4 * context.canvas.pixel_ratio;
    const y_stroketop = bounds.y + h - stroke_width;
    context.save();
    context.shadowColor = 'transparent';

    context.beginPath();
    context.moveTo(bounds.x, bounds.y + h - radius);
    context.arcTo(bounds.x, bounds.y + h, bounds.x + radius, bounds.y + h, radius);
    context.arcTo(bounds.x + w, bounds.y + h, bounds.x + w, bounds.y + h - radius, radius);
    context.arcTo(bounds.x + w, y_stroketop, bounds.x + radius, y_stroketop, radius - 1);
    context.arcTo(bounds.x, y_stroketop, bounds.x, bounds.y + h - radius, radius - 1);

    context.fillStyle = stroke_color,
    context.fill();
    context.closePath();

    context.restore();
  }

  return bounds;
}


export default {
  line,
  circle,
  text,
  rect,
  round_rect,
  popup_box,
};


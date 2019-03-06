
// drawing helpers
// -------------------------------

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


export default {
  line,
  circle,
  text,
  round_rect,
};


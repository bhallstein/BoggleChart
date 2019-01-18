var AnimQueue = require('../AnimQueue'),
		helpers = require('../helpers'),
		math = require('../math');

function line_chart(el_canvas, data, options, category_labels) {
	var c = el_canvas.getContext('2d');

	if (options.enableInteractions) {
		el_canvas.addEventListener('BoggleChart:resize', cb_drawAll );
		el_canvas.addEventListener('mousemove', mouse_move);
		el_canvas.addEventListener('mouseenter', mouse_enter);
		el_canvas.addEventListener('mouseleave', mouse_leave);
	}
	function cb_drawAll() {
		Draw.All();
	}

	// Mouse events
	// ----------------------------------------------------------
	function mouse_enter() { }
	function mouse_leave() {
		gstate.hover_x = null;
		animQueue.triggerDraw();
	}
	function mouse_move(ev) {
		var p = helpers.getOffset_canv(ev, el_canvas),
				usable_width = gstate.w - gstate.offsets.l - gstate.offsets.r;
		p.x -= gstate.offsets.l;
		gstate.hover_x = p.x;
		animQueue.triggerDraw();
	}
	function unbind() {
		el_canvas.removeEventListener('BoggleChart:resize', cb_drawAll);
		el_canvas.removeEventListener('mousemove', mouse_move);
		el_canvas.removeEventListener('mouseenter', mouse_enter);
		el_canvas.removeEventListener('mouseleave', mouse_leave);
	}


  // Drawing
	// ----------------------------------------------------------
	var Draw = { };
	var dvals = {
		labelROffset: function() {
			return 4 * gstate.pr;
		},

		axisWidth_x: function() {
			return (options.axisWidthX || 1) * gstate.pr;
		},
		axisWidth_xtop: function() {
			return (options.axisWidthXTop || 1) * gstate.pr;
		},

		catLabel_paddingTop: function() {
			return (
				options.categoryLabels_padding ?
				options.categoryLabels_padding * gstate.pr :
				gstate.h * 0.02
			);
		},
		catLabel_paddingBtm: function() {
			return dvals.catLabel_fontsize() * 0.5;
		},
		catLabel_fontsize: function() {
			return (
				options.categoryLabels_fontsize ?
				options.categoryLabels_fontsize * gstate.pr :
				gstate.h * 0.04
			);
		},

		btm_section_height: function() {
			if (!options.categoryLabels) return 2 * gstate.pr;
			return dvals.catLabel_paddingTop() +
				dvals.catLabel_fontsize() +
				dvals.catLabel_paddingBtm();
		},
		top_section_height: function() {
			if (options.valueLabels && options.valueLabels_labelMax) {
				return dvals.valueLabel_fontsize();
			}
			return 2*gstate.pr;
		},

		valueLabel_fontsize: function() {
			return (
				options.valueLabels_fontsize ?
				options.valueLabels_fontsize * gstate.pr :
				gstate.h * 0.035
			);
		},
		valueLabel_paddingR: function() { return (options.valueLabels_padding || 4) * gstate.pr; },
		valueLabel_paddingL: function() { return dvals.valueLabel_paddingR() * 0.5; },
		valueLabel_maxWidth: function() {
			Draw.SetValueLblFont();
			var max = 0;
			for (var i=options.min; i <= options.max; i += (options.step || 1)) {
				var txt = i.toString();
				if (options.valueLabels_appendUnit) txt += options.valueLabels_appendUnit;
				var w = c.measureText(txt).width;
				if (w > max) max = w;
			}
			return max;
		},
	};
	var gstate = {
		pr: null,
		w:  null,
		h:  null,
		offsets: null,
		hover_x: null,  // relative to the inner graph area

		regen: function() {
			gstate.pr = el_canvas.pixel_ratio,
			gstate.w = el_canvas.width;
			gstate.h = el_canvas.height;
			gstate.offsets = {
				l: dvals.valueLabel_maxWidth() + dvals.valueLabel_paddingL() + dvals.valueLabel_paddingR(),//  - 0.5,
				r: 4 * gstate.pr,//t - 0.5,
				b: dvals.btm_section_height(),//- 0.5,
				t: dvals.top_section_height(),
			};
		},
	};

	Draw.c_setLblFont = function() {
		var fontsize = 0.048 * gstate.h;
		if (fontsize > 17 * gstate.pr) {
			fontsize = 17 * gstate.pr;
		}
		c.font = '200 ' + fontsize + 'px Roboto';
		c.textBaseline = 'middle';
		c.textAlign = 'end';
	};

	Draw.Axes = function(data, opts) {
		var base_y = gstate.h - gstate.offsets.b,
				base_x = (options.valueLabels_inside ? 0 : gstate.offsets.l),
		    max_x = gstate.w - gstate.offsets.r,
				max_y = gstate.offsets.t;

		// X axis
		c.beginPath();
		c.moveTo(base_x, base_y);
		c.strokeStyle = options.axisColorX || '#222';
		c.lineWidth = dvals.axisWidth_x();
		c.lineTo(max_x, base_y);
		c.stroke();

		// Top X axis
		if (options.axisXTop) {
			c.beginPath();
			c.moveTo(base_x, max_y);
			c.strokeStyle = options.axisColorXTop || '#222';
			c.lineWidth = dvals.axisWidth_xtop();
			c.lineTo(max_x, max_y);
			c.stroke();
		}

		// Y axis
		c.beginPath();
		c.moveTo(base_x, base_y);
		c.strokeStyle = options.axisColorY || '#222';
		c.lineWidth = (options.axisWidthY || 1) * gstate.pr;
		c.lineTo(base_x, max_y);
		c.stroke();

		// Right Y axis
		c.beginPath();
		c.moveTo(max_x, base_y);
		c.strokeStyle = options.axisColorYRight || '#222';
		c.lineWidth = (options.axisWidthYRight || 1) * gstate.pr;
		c.lineTo(max_x, max_y);
		c.stroke();
	};

	Draw.SetValueLblFont = function() {
		c.font = '400 ' + dvals.valueLabel_fontsize() + 'px Roboto';
	};
	Draw.ValueLabels = function() {
		if (!options.valueLabels) return;

		var usable_height = gstate.h - gstate.offsets.t - gstate.offsets.b,
		    increment     = options.step * usable_height / (options.max - options.min),
		    x_right       = gstate.offsets.l - dvals.valueLabel_paddingR();

		Draw.SetValueLblFont();
		c.textBaseline = 'middle';
		c.textAlign = 'end';
		c.fillStyle = (options.valueLabels_color || 'black');

		var step = options.step || 1,
		    min = options.valueLabels_labelOrigin ? options.min : options.min + step,
		    max = options.valueLabels_labelMax ? options.max : options.max - step;
		for (var i=min; i <= max; i += step) {
			var txt = i;
			if (options.valueLabels_appendUnit) txt += options.valueLabels_appendUnit;
			var y_rel = (i - options.min) / (options.max - options.min),
			    y = gstate.h - gstate.offsets.b - usable_height + (1 - y_rel) * usable_height;
			c.fillText(txt, x_right, y);
		}
	};
	Draw.CategoryLabels = function() {
		if (!options.categoryLabels) return;

		c.beginPath();
		c.fillStyle = options.categoryLabels_color || 'black';

		c.font = '400 ' + dvals.catLabel_fontsize() + 'px Roboto';
		c.textBaseline = 'top';
		c.textAlign = 'center';

		var usable_width = gstate.w - gstate.offsets.l - gstate.offsets.r,
		    h_increment = usable_width / (data[0].data.length - 1),
		    y = gstate.h - dvals.catLabel_paddingBtm() - dvals.catLabel_fontsize();

		if (typeof category_labels == 'function') {
			for (var i=0, n = data[0].data.length; i < n; ++i) {
				var lbl = category_labels(i);
				if (lbl === false || lbl === null) continue;

				var x = gstate.offsets.l + i * h_increment;
				c.moveTo(x, y);
				c.fillText(lbl, x, y);
			}
		}
		else {
			for (var i=0, n = category_labels.length; i < n; ++i) {
				if (!category_labels[i]) continue;
				var x = gstate.offsets.l + i * h_increment;
				c.moveTo(x, y);
				c.fillText(category_labels[i], x, y);
			}
		}
	};

	Draw.gridLines = function(data, opts) {
		if (!opts.gridLines) return;

		if (opts.gridLines.horizontal) {
			var usable_height = gstate.h - gstate.offsets.t - gstate.offsets.b,
					increment     = opts.step * usable_height / (opts.max - opts.min),
			    x             = gstate.offsets.l,
			    x_right       = x + gstate.w - gstate.offsets.l - gstate.offsets.r,
					x_left        = x - (opts.gridLines.ticks_h ? 6*gstate.pr : 0);

			c.beginPath();
			c.lineWidth = (opts.gridLines.width_h || 0.75) * gstate.pr;
			c.strokeStyle = (opts.gridLines.col_h || '#222');
			if (options.gridLines.style_h == 'dashed') {
				c.setLineDash([ 2*gstate.pr, 5*gstate.pr, ]);
			}

			var y = gstate.h - gstate.offsets.b;
			var max = opts.axisXTop ? opts.max - 1 : opts.max;
			for (var i = opts.min + opts.step; i <= max; i += opts.step) {
				y -= increment;
				c.moveTo(x_left, y);
				c.lineTo(x_right, y);
			}
			c.stroke();
		}
		c.setLineDash([])

		if (opts.gridLines.vertical) {
			var usable_width = gstate.w - gstate.offsets.l - gstate.offsets.r,
			    h_increment = usable_width / (data[0].data.length - 1),
			    x = gstate.offsets.l,
					y_top = gstate.offsets.t,
					y_btm = gstate.h - gstate.offsets.b + (opts.gridLines.x_ticks ? 6*gstate.pr : 0);

			c.beginPath();
			c.lineWidth = (opts.gridLines.width_v || 0.75) * gstate.pr;
			c.strokeStyle = (opts.gridLines.col_v || '#222');
			if (options.gridLines.style_v == 'dashed') {
				c.setLineDash([ 2*gstate.pr, 5*gstate.pr, ]);
			}

			var min = opts.axisY ? 1 : 0;
			var max = opts.axisYRight ? 2 : 1;
			for (var i=min; i <= data[0].data.length - max; ++i, x += h_increment) {
				if (opts.gridLines.divisor_v && i%opts.gridLines.divisor_v !== 0) {
					continue;
				}
				c.moveTo(x, y_btm);
				c.lineTo(x, y_top);
			}
			c.stroke();
		}
		c.setLineDash([])
	};

	Draw.DataLine = function(dataset, opts, percent_to_draw, points_fade) {
		var lineWidth = (dataset.lineWidth || 1.75) * gstate.pr;
		c.lineWidth = lineWidth;

		var d = dataset.data,
		    usable_width = gstate.w - gstate.offsets.l - gstate.offsets.r,
		    h_increment = usable_width / (d.length - 1),
		    cur_x = gstate.offsets.l,
		    tension = dataset.tension || 0.32;

		function ny(y) {
			var y_range = gstate.h - gstate.offsets.t - gstate.offsets.b;
			y = y / opts.max * y_range;
			return gstate.h - gstate.offsets.b - y;
		}

		// Lines
		if (dataset.drawLines !== false) {
			c.beginPath();
			c.strokeStyle = dataset.color || 'blue';

			var arr = [ ];
			for (var i=0; i < d.length; ++i) {
				arr.push(cur_x, ny(d[i]));
				cur_x += h_increment;
			}
			var line_segments = math.bezCurve(c, arr, tension);
			var topClip =
				gstate.offsets.t +
				(options.axisXTop ? dvals.axisWidth_xtop()/2 : 0) +
				lineWidth/2;
			for (var i=0, l=line_segments.length * percent_to_draw/100; i < l; i += 2) {
				c.lineTo(line_segments[i], Math.max(line_segments[i+1], topClip));
			}
			c.stroke();
		}

		// Points
		if (dataset.drawPoints) {
			points_fade = points_fade/100 || 1;
			c.beginPath();
			c.fillStyle = dataset.pointColor || '#222';
			c.globalAlpha = points_fade;
			cur_x = gstate.offsets.l;
			for (var i=0; i < d.length; ++i, cur_x += h_increment) {
				var y = ny(d[i]);
				c.moveTo(cur_x, y);
				c.arc(cur_x, y, gstate.pr * (dataset.pointRadius || 3.5), 0, 2*Math.PI);
			}
			c.fill();
			c.globalAlpha = 1;
		}
	};

	Draw.Hover = function() {
		if (gstate.hover_x === null) return;

		// Lock position to x value corresponding to nearest data point
		var item_points = data[0].data,
		    n_datapoints = item_points.length,
		    usable_width = gstate.w - gstate.offsets.l - gstate.offsets.r,
				x_norm = gstate.hover_x / usable_width;

		if (x_norm < 0 || x_norm > 1) return;
		var x_ind = parseInt(x_norm * (n_datapoints-1) + 0.5),
		    hover_x = x_ind * usable_width / (n_datapoints - 1),
				value = item_points[x_ind];

		// Semitransparent overlay
		var rx = gstate.offsets.l,
				ry = gstate.offsets.t,
				rw = hover_x,
				rh = gstate.h - gstate.offsets.t - gstate.offsets.b;
		c.beginPath();
		c.fillStyle = 'rgba(255,255,255, 0.08)';
		c.rect(rx, ry, rw, rh);
		c.fill();

		// Line
		var x  = hover_x + gstate.offsets.l,
		    y1 = gstate.h - gstate.offsets.b,
		    y2 = 0,
		    lineWidth = (options.axisWidthX || 1) * gstate.pr;
		c.beginPath();
		c.lineWidth = lineWidth;
		c.strokeStyle = 'white';
		c.moveTo(x, y1);
		c.lineTo(x, y2);
		c.stroke();

		// Value
		var vx = x + lineWidth/2,
		    vy = y2;
		if (options.hoverValueDraw_callback &&
				typeof options.hoverValueDraw_callback === 'function')
		{
			options.hoverValueDraw_callback(c,
			                                x_ind,
			                                vx,
			                                vy,
			                                gstate.w,
			                                gstate.h,
			                                gstate.pr);
		}
		else {
			var fontsize = 0.08 * gstate.h;
			if (fontsize > 15 * gstate.pr) {
				fontsize = 15 * gstate.pr;
			}
			c.font = '400 ' + fontsize + 'px Roboto';
			c.textBaseline = 'top';
			c.textAlign = 'start';
			var v_hpad = 8 * gstate.pr,
			    v_vpad = 4 * gstate.pr,
			    lbl = math.format_number(value, 0),
			    txt_sz = c.measureText(lbl),
			    vw = txt_sz.width + v_hpad * gstate.pr,
			    vh = fontsize + v_vpad;

			if (vx + vw >= gstate.offsets.l + usable_width + gstate.offsets.r - gstate.pr*3) {
				vx -= vw + lineWidth;
			}

			c.beginPath();
			c.fillStyle = '#a63a4f';
			c.rect(vx, vy, vw, vh);
			c.fill();

			c.fillStyle = 'white';
			c.fillText(lbl, vx + v_hpad/2, vy + v_vpad/2);
		}
	};

	Draw.Frame = function() {
		gstate.regen();
		c.clearRect(0, 0, gstate.w, gstate.h);

		Draw.gridLines(data, options);
		Draw.Axes(data, options);
		Draw.ValueLabels();
		Draw.CategoryLabels();
	};

	Draw.All = function() {
		el_canvas.dispatchEvent(new CustomEvent('force_resize'));
		Draw.Frame();
		for (var i = 0; i < data.length; ++i) {
			Draw.DataLine(data[i], options, 100);
		}
		Draw.Hover();
	};

	var animQueue = AnimQueue();
	animQueue.setDefaultDrawTask(Draw.All);
	// Animation tasks that can be added to the queue
	function animTask_drawLine(dataset_ind_animated, dataset_inds_shown) {
		var _n = 0,
		    step = 3,
		    max = 100;
		return function() {
			el_canvas.dispatchEvent(new CustomEvent('force_resize'));
			Draw.Frame();
			_n = Math.min(_n+step, max);

			for (var i = 0; i < data.length; ++i) {
				if (i == dataset_ind_animated)                 Draw.DataLine(data[i], options, _n);
				else if (dataset_inds_shown.indexOf(i) != -1)  Draw.DataLine(data[i], options, 100);
			}
			if (_n == max) {
				animQueue.finishTask();
			}
		};
	}
	function animTask_drawPoints(dataset_ind_animated, dataset_inds_shown) {
		var _n = 0;
		return function() {
			el_canvas.dispatchEvent(new CustomEvent('force_resize'));
			Draw.Frame();
			_n = Math.min(_n + 7, 100);

			for (var i = 0; i < data.length; ++i) {
				if (i == dataset_ind_animated)                 Draw.DataLine(data[i], options, 0, _n);
				else if (dataset_inds_shown.indexOf(i) != -1)  Draw.DataLine(data[i], options, 100);
			}
			if (_n == 100) {
				animQueue.finishTask();
			}
		};
	}

	function draw() {
		animQueue.reset();
		var shown_lines = [ ];
		for (var i=0; i < data.length; ++i) {
			var previously_shown = shown_lines.slice(0);
			if (data[i].drawPoints && data[i].animPoints) {
				animQueue.add(animTask_drawPoints(i, previously_shown));
			}
			animQueue.add(animTask_drawLine(i, previously_shown));
			shown_lines.push(i);
		}
		animQueue.start();
	}

	function rsz() {

	}

	var exp = {
		draw: draw,
		drawFrame: function() {
			el_canvas.dispatchEvent(new CustomEvent('force_resize'));
			Draw.Frame();
		},
		tearDown: function() {  // Give the garbage collector a fighting chance
			unbind();
			animQueue.reset();
			animQueue = null;
			el_canvas = null;
			c = null;
		},
	};

	return exp;
}

export default line_chart;


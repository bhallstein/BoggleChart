// Choropleth -- work in progress

module.exports.Choropleth = function(el_ctnr) {

	var s_svg = BoggleChart.SVGs.USA();
	el_ctnr.innerHTML = s_svg;
	var el_svg = el_ctnr.getElementsByTagName('svg')[0];
	el_svg.style.width = '100%';
	el_svg.style.height = '100%';
	var svg_id = 'BoggleChart_svg_' + Math.floor(Math.random() * 100000);
	el_svg.setAttribute('id', svg_id);

	var el_style = document.createElement('style');
	el_style.innerHTML =
		'#' + svg_id + ' .state {' +
			'cursor: pointer;' +
			'transition: fill 0.08s ease-in;' +
		'}' +
		'#' + svg_id + ' .state:hover {' +
			'fill:blue;'
		'}';

		el_ctnr.appendChild(el_style);

	return;

	var d = {
		data: null,
		min_ts: null,
		max_ts: null,
		resolution: null,
	};
	var l = {
		el_loadDiv: document.createElement('div'),
		progress: 0,
		loaded: false,
	};
	var g = {
		border: 0.08,
		circle_size: 0.01,

		pr: 1,
		w_img: 0,
		h_img: 0,
		w_canv: 0,
		h_canv: 0,
		img_l: 0,
		img_t: 0,

		el_canv : null,
		el_img : null,

		intvl: null,
	};



	// Loading
	// ------------------------------------------------------

	function cb_error() {
		console.log('error', arguments);
	}
	function cb_progress(ev) {
		if (ev && ev.loaded && ev.total) {
			l.progress = ev.loaded / ev.total;
			draw_load();
		}
	}

	function create_load_div() {
		l.el_loadDiv.style.backgroundColor = '#a53a4e';
		l.el_loadDiv.style.opacity = 0.3;
		l.el_loadDiv.style.position = 'absolute';
		l.el_loadDiv.style.top = '48%';
		l.el_loadDiv.style.height = '5px';
		l.el_loadDiv.style.width = '100%';
		l.el_loadDiv.style.transform = 'scaleX(0)';
		l.el_loadDiv.style.transition = 'transform 0.2s ease-in-out, opacity 0.2s linear';
		el_ctnr.appendChild(l.el_loadDiv);
	}
	function remove_load_div() {
		l.el_loadDiv.style.opacity = 0;
		setTimeout(function() {
			l.el_loadDiv.parentNode.removeChild(l.el_loadDiv);
		}, 240);
	}
	function draw_load() {
		l.el_loadDiv.style.transform = 'scaleX(' + l.progress + ')';
		l.el_loadDiv.style.opacity = (1 - 0.3) * l.progress + 0.3;
	}

	function load() {
		create_load_div();
		BoggleChart.getJSON(data_url, cb_success, cb_error, cb_progress);
	}

	function cb_success(str) {
		remove_load_div();
		eval(str);
		d.data = data;
		d.min_ts = ts_start;
		d.max_ts = ts_end;
		d.resolution = resolution;

		set_up_draw_elements();

		exp.reset();
	}



	// Handle resize
	// ------------------------------------------------------
	function rsz() {
		var el_mapWrap = g.el_canv.parentNode;
		g.el_canv.dispatchEvent(new CustomEvent('force_resize'));
		g.pr = g.el_canv.pixel_ratio;

		g.w_canv = parseInt(g.el_canv.style.width);
		g.h_canv = parseInt(g.el_canv.style.height);

		// Calculate image size
		var ar_img = area == 'usa' ? 1.591 : 0.627,
				ar_canv = g.w_canv / g.h_canv;
		if (ar_img > ar_canv) {
			g.w_img = g.w_canv * (1 - 2*g.border);
			g.h_img = g.w_img / ar_img;
		}
		else {
			g.h_img = g.h_canv * (1 - 2*g.border);
			g.w_img = g.h_img * ar_img;
		}

		g.el_img.style.left   = (g.img_l = (g.w_canv - g.w_img) / 2) + 'px';
		g.el_img.style.top    = (g.img_t = (g.h_canv - g.h_img) / 2) + 'px';
		g.el_img.style.width  = g.w_img + 'px';
		g.el_img.style.height = g.h_img + 'px';
	}
	window.addEventListener('resize', rsz);
	document.addEventListener('DOMContentLoaded', rsz);


	// Drawing
	// ------------------------------------------------------

	var points = [ ];

	function set_up_draw_elements() {
		// Create bg image
		g.el_img = document.createElement('img');
		if (area == 'usa') {
			g.el_img.src = 'assets/img/worldmap_fill1b_strokeWhite-0.25.svg';
		}
		else if (area == 'uk') {
			g.el_img.src = 'assets/img/ukmap_fill1b_strokeWhite-0.34.svg';
		}
		g.el_img.style.zIndex = 1;
		g.el_img.style.opacity = 0;
		g.el_img.style.transition = 'opacity 0.4s linear';
		el_ctnr.appendChild(g.el_img);

		// Create canvas
		g.el_canv = BoggleChart.create_canvas(el_ctnr);
		g.el_canv.style.position = 'relative';
		g.el_canv.style.zIndex = 2;
		g.el_canv.style.opacity = 0;
		g.el_canv.style.transition = 'opacity 0.4s linear';

		// Fade in when loaded
		g.el_img.onload = function() {
			g.el_img.style.position = 'absolute';
			setTimeout(function() {
				setTimeout(rsz);
				g.el_img.style.opacity = 1;
				g.el_canv.style.opacity = 1;
			}, 300);
		};
	}

	function draw() {
		var _w = g.el_canv.width,
				_h = g.el_canv.height,
				_w_img = g.w_img * g.pr,
		    _h_img = g.h_img * g.pr,
				_l_img = g.img_l * g.pr,
				_t_img = g.img_t * g.pr,
				_circsz = g.circle_size * _w;

		var c = g.el_canv.getContext('2d');
		c.clearRect(0, 0, _w, _h);
		c.beginPath();
		c.globalCompositeOperation = 'lighter';
		var inds_for_removal = [ ],
		    _points = [ ],
		    circle_speed = 5,
		    circle_col = { r:170, g:50, b:50 };

		for (var i=0; i < points.length; ++i) {
			c.beginPath();
			var p = points[i];
			var x = p[0] * _w_img + _l_img,
					y = p[1] * _h_img + _t_img,
					progress = points[i][2] / 100;

			if (progress >= 1) {
				continue;
			}

			points[i][2] += circle_speed;
			var radius = BoggleChart.ease_out_cubic(0, progress, 0, 1, 1) * _circsz;
			var col = circle_col;
			c.fillStyle = 'rgba(' + col.r+','+col.g+','+col.b+',' + ((1-progress)*.5) + ')';
			c.moveTo(x, y);
			c.arc(x, y, radius, 0, Math.PI*2);
			c.fill();

			_points.push(points[i]);
		}

		points = _points;
	}

	function pad_zero(x) {
		if (x < 10) return '0' + x;
		return x;
	}

	function addLatLongUSA(lat,long) {
		var x = (function(long) {
			if (long <= -96) return -0.043 + (long + 125) / (125 - 96) * (0.527 + 0.043);
			else             return  0.527 + (long +  96) / ( 96 - 65) * ( 1.07 - 0.527);
		})(long);
		var y = (function(lat) {
			if (lat >= 30) return -0.061 + (50 - lat) / (50 - 30) * (0.712 + 0.061);
			else           return  0.712 + (30 - lat) / (30 - 24) * (1.078 - 0.712);
		})(lat);
		points.push([ x, y, 0 ]);
	}
	function addLatLongUK(lat, long) {
		var x = (function(long) {
			return (long + 8.6) / (1.7 + 8.6);
		})(long);
		var y = (function(lat) {
			return (lat - 59.2) / (50.1 - 59.2);
		})(lat);
		points.push([ x, y, 0]);
	}
	var addLatLong = (area == 'usa' ? addLatLongUSA : addLatLongUK);

	var t_prev,
	    ms_elapsed,
	    last_index_used,
	    total_datatime_length_s,
			realtime_anim_length_s;

	function reset() {
		t_prev = new Date;
		ms_elapsed = 0;
		last_index_used = 0;
		points = [ ];
		total_datatime_length_s = d.max_ts - d.min_ts;
		realtime_anim_length_s = 90;
	}
	reset();

	function dequeue_items(from_ind, to_ts) {
		while (from_ind < d.data.length && d.data[from_ind][0] <= to_ts) {
			var x = d.data[from_ind];
			addLatLong(x[2], x[1]);
			++from_ind;
		}
		return from_ind;
	}

	function tick() {
		var frame_time = ((new Date) - t_prev);
		if (frame_time > 100) frame_time = 100;
		ms_elapsed += frame_time;
		t_prev = new Date;

		var max_ts_val = d.resolution * ms_elapsed / (realtime_anim_length_s*1000) + 1;
		last_index_used = dequeue_items(last_index_used, max_ts_val);

		if (el_clock) {
			var t_seconds_from_data_start = max_ts_val / d.resolution * total_datatime_length_s;
			var t = new Date(d.min_ts*1000 + t_seconds_from_data_start*1000);
			el_clock.innerHTML =
				'<span class="timeClock_component">' + pad_zero(t.getUTCFullYear()) + '</span> | ' +
				'<span class="timeClock_component">' + pad_zero(t.getUTCMonth()+1) + '</span> | ' +
				'<span class="timeClock_component">' + pad_zero(t.getUTCDate()) + '</span>';
		}

		if (last_index_used >= d.data.length && points.length == 0) {
			exp.pause();
		}

		draw();
	}

	function start_anim() {
		g.intvl = setInterval(tick, 40);
	}

	var exp = {
		begin: function() {
			if (!l.loaded) {
				l.loaded = true;
				load();
			}
			else {
				start_anim();
			}
		},
		pause: function() {
			clearInterval(g.intvl);
			g.intvl = null;
		},
		reset: function() {
			reset();
			exp.begin();
		},
	};

	return exp;
};

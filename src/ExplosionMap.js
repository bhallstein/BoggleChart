// ExplosionMap -- not yet converted for npm

BoggleChart.ExplosionMap = function(el_ctnr, el_clock, data_url, area, el_lowPerf) {
	if (data_url.match(/^https?\:/)) {
		return null;
	}

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
		if (!g.el_canv) return;

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
		    _circsz = g.circle_size * _w,
		    low_perf_mode = !!BoggleChart.ExplosionMap.low_perf_mode;

		var c = g.el_canv.getContext('2d');
		c.clearRect(0, 0, _w, _h);
		c.globalCompositeOperation = 'lighter';
		var inds_for_removal = [ ],
		    _points = [ ],
		    circle_speed = 5,
		    circle_col = { r:170, g:50, b:50 };

		for (var i=0; i < points.length; ++i) {
			var p = points[i];
			var x = p[0] * _w_img*0.97 + _l_img + (p[0] < 0.2 && p[1] < 0.2 ? 0.06*_w_img : 0),
					y = p[1] * _h_img*0.97 + _t_img,
					progress = points[i][2] / 100;

			if (progress >= 1) {
				continue;
			}

			points[i][2] += circle_speed;
			var radius = BoggleChart.easeOutCubic(0, progress, 0, 1, 1) * _circsz;
			var col = circle_col;
			c.beginPath();
			c.fillStyle = 'rgba(' + col.r+','+col.g+','+col.b+',' + ((1-progress)*.5) + ')';
			c.moveTo(x, y);
			if (low_perf_mode) {
				var d = radius * 1.3;
				c.fillRect(x-d/2, y-d/2, d, d);
			}
			else {
				c.arc(x, y, radius, 0, Math.PI*2);
				c.fill();
			}

			_points.push(points[i]);
		}

		points = _points;
	}

	function pad_zero(x) {
		if (x < 10) return '0' + x;
		return x;
	}

	function addLatLongUSA(lat,long) {
		var p = triangulate(triangulation_data_usa, lat, long);
		points.push(p);
	}
	function addLatLongUK(lat, long) {
		var x = (function(long) {
			return (long + 8.6) / (1.7 + 8.6);
		})(long);
		var y = (function(lat) {
			return (lat - 59.2) / (50.1 - 59.2);
		})(lat);
		points.push([ x, y, 0]);

		// var p = triangulate(triangulation_data_uk, lat, long);
		// points.push(p);
	}
	var addLatLong = (area == 'usa' ? addLatLongUSA : addLatLongUK);

	var triangulation_data_usa = {
		lats: [
			48.386557,46.225746,42.006366,38.899093,34.501848,31.323463,29.005229,25.94753,29.610763,29.183188,29.633217,28.866986,26.880662,25.116344,27.70173,30.143903,34.730973,37.833022,41.66815,44.78394,43.332451,56.527811,49.003032,40.232365,36.888627,69.739718,54.659076,52.917358,68.306451,18.893807,21.818661
		],
		longs: [
			-124.722561,-123.997264,-124.169551,-123.652772,-120.60156,-111.025847,-103.259258,-97.2338856,-93.875483,-89.07112,-85.274124,-82.665304,-82.277855,-81.089679,-80.387853,-81.398595,-76.499919,-76.007716,-70.066702,-67.096196,-78.621763,-84.265725,-103.989891,-102.029357,-113.970795,-141.085998,-130.627014,-168.519163,-166.440847,-155.684751,-160.233094
		],
		x: [
			0.05560927394,0.04980768818,0.01611551602,0.003008229657,0.0313930252,0.2036786351,0.3607297106,0.4856786781,0.5557489417,0.6533659941,0.7384988934,0.7931412364,0.8080319732,0.8366316423,0.8543801973,0.8158103956,0.8935946196,0.8915533209,0.9676615312,0.9990115817,0.8060981113,0.614710243,0.3813360837,0.4001160317,0.1688046585,0.1226713079,0.1924407486,0.0309203034,0.04690689529,0.308902211,0.2225660199
		],
		y: [
			0.01152964522,0.09220294913,0.2484176674,0.3653905368,0.5530124192,0.7403948134,0.8611310685,0.988196654,0.8407403606,0.8494987855,0.8237366999,0.8545622498,0.9214478771,0.9732457491,0.9039310274,0.7914057956,0.5815799377,0.4559512813,0.2750008553,0.1381162544,0.2752745561,0.1297341681,0.08861062643,0.4379554552,0.5083991926,0.7797050874,0.9509733484,0.9821752369,0.7913031578,0.9930548428,0.8750555955
		],
	};
	var triangulation_data_uk = {
		lats: [
			50.660814,49.966274,50.198915,50.737359,50.598093,50.813779,50.727801,50.738231,51.156992,51.455016,51.49734,52.725843,52.870469,54.876382,56.265485,57.735545,58.60319,55.294608,54.626007,54.956967,54.040784,52.808131,51.882386,51.418107,51.036137,54.452286,54.645586,54.26625
		],
		longs: [
			-1.556482,-5.203943,-3.74276 ,-2.885828,-1.973963,-1.347742,-0.788818,0.238404 ,1.389222 ,0.750721 ,-0.339266,1.650437 ,0.073896 ,-1.361229,-2.589913,-3.131404,-3.042192,-5.669298,-4.85631 ,-3.238573,-3.188273,-4.760312,-5.301094,-3.188273,-4.49621 ,-8.168493,-5.571458,-4.613481
		],
		x: [
			0.6588118048,0.2739021411,0.4070275831,0.5242396965,0.6273066289,0.6944962387,0.7503054073,0.8626310037,0.9824471163,0.9043271395,0.7985276153,0.9973638526,0.8158233138,0.6618015817,0.5316016203,0.5177779207,0.4821899312,0.2249726741,0.3128978332,0.4859191153,0.4817720054,0.3244711631,0.2643541439,0.4948562978,0.3490644892,0.0006751109111,0.2337491159,0.3423455282
		],
		y: [
			0.9299737956,0.9992541826,0.9651279984,0.9174360008,0.9277161863,0.9038903447,0.9099778271,0.9052811933,0.8540213667,0.8260431365,0.8314855876,0.704898206,0.6760733723,0.4739367063,0.3235033259,0.1777464221,0.07325136061,0.4287442048,0.5009473896,0.4664382181,0.5609352953,0.6979641201,0.7965732715,0.8460995767,0.8880870792,0.5152791776,0.4853255392,0.5383592018,
		],
	};

	function triangulate(dataset, p_lat, p_long) {
		// The idea here is we find a quad of known points roughly around P,
		// then estimate the location of P by averageing estimates from each side of the quad.
		// - Triangulation is a bit of a misnomer for this process but its meaning is clear
		//   at least.

		// Find 4 triangulation points closest to P
		var n_tpoints = triangulation_data_usa.lats.length;
		var closest_4 = [[-1, 1000000], [-1, 1000000], [-1, 1000000], [-1, 1000000]];
		var closest_4_min_long = [ -1, 1000000 ],
		    closest_4_max_long = [ -1, -1000000 ],
		    closest_4_min_lat  = [ -1, 1000000 ],
		    closest_4_max_lat  = [ -1, -1000000 ];
		for (var i=0; i < n_tpoints; ++i) {
			var t_long = triangulation_data_usa.longs[i],
			    t_lat = triangulation_data_usa.lats[i],
			    dist_sq = (t_lat-p_lat) * (t_lat-p_lat) + (t_long-p_long)*(t_long-p_long);

			for (var j=0; j < 4; j++) {
				var val_prev = closest_4[j][1];
				if (dist_sq <= val_prev) {
					closest_4.splice(j, 0, [i, dist_sq]);
					closest_4 = closest_4.slice(0, 4);
					if      (t_long <= closest_4_min_long[1]) closest_4_min_long = [ i, t_long ];
					else if (t_long >  closest_4_max_long[1]) closest_4_max_long = [ i, t_long ];
					if      (t_lat <= closest_4_min_lat[1])   closest_4_min_lat = [ i, t_lat ];
					else if (t_lat >  closest_4_max_lat[1])   closest_4_max_lat = [ i, t_lat ];

					break;
				}
			}
		}

		var ind_A = closest_4[0][0],
		    ind_B = closest_4[1][0],
		    ind_C = closest_4[2][0],
		    ind_D = closest_4[3][0];

		var Ax = triangulation_data_usa.x[ind_A], Along = triangulation_data_usa.longs[ind_A],
		    Ay = triangulation_data_usa.y[ind_A], Alat  = triangulation_data_usa.lats[ind_A],
		    Bx = triangulation_data_usa.x[ind_B], Blong = triangulation_data_usa.longs[ind_B],
		    By = triangulation_data_usa.y[ind_B], Blat  = triangulation_data_usa.lats[ind_B],
		    Cx = triangulation_data_usa.x[ind_C], Clong = triangulation_data_usa.longs[ind_C],
		    Cy = triangulation_data_usa.y[ind_C], Clat  = triangulation_data_usa.lats[ind_C],
		    Dx = triangulation_data_usa.x[ind_D], Dlong = triangulation_data_usa.longs[ind_D],
		    Dy = triangulation_data_usa.y[ind_D], Dlat  = triangulation_data_usa.lats[ind_D];

		var x1 = (p_long - Along) / (Blong - Along) * (Bx - Ax) + Ax,
		    x2 = (p_long - Clong) / (Dlong - Clong) * (Dx - Cx) + Cx,
		    x = (x1 + x2) / 2,
		    y1 = (p_lat - Alat) / (Clat - Alat) * (Cy - Ay) + Ay,
		    y2 = (p_lat - Blat) / (Dlat - Blat) * (Dy - By) + By,
		    y = (y1 + y2) / 2;

		return [ x, y, 0 ];
	}


	var t_prev,
	    ms_elapsed,
	    last_index_used,
	    total_datatime_length_s,
			realtime_anim_length_s;

	function reset() {
		clearInterval(g.intvl);
		g.intvl = null;
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

	var n_consec_frames_slow = 0;
	function enable_low_perf_mode() {
		if (BoggleChart.ExplosionMap.low_perf_mode) {
			return;
		}
		BoggleChart.ExplosionMap.low_perf_mode = true;
		if (el_lowPerf) {
			el_lowPerf.innerHTML = 'Low performance mode enabled.';
		}
	}

	function tick() {
		var frame_time = ((new Date) - t_prev);
		if (frame_time > 100) {
			frame_time = 100;
			++n_consec_frames_slow;
		}
		else {
			n_consec_frames_slow = 0;
		}
		ms_elapsed += frame_time;
		t_prev = new Date;

		if (n_consec_frames_slow > 15) {
			enable_low_perf_mode();
		}

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
		is_running: function() {
			return !!g.intvl;
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

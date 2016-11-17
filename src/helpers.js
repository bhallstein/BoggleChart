

var getOffset = module.exports.getOffset = function(ev, el) {
	var rect = el.getBoundingClientRect();
	return {
		x: ev.clientX - rect.left,
		y: ev.clientY - rect.top,
	};
};
module.exports.getOffset_canv = function(ev, el) {
	var p = getOffset(ev, el);
	p.x = p.x * el.pixel_ratio;
	p.y = p.y * el.pixel_ratio;
	return p;
};

module.exports.clone = function(obj) {
	return JSON.parse(JSON.stringify(obj));  // :/
};

module.exports.totalData = function(arr, summation_property) {
	return arr.reduce(function(accum, x, i) { return accum + x[summation_property]; }, 0);
};

module.exports.monthName = (function() {
	var months = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];
	var months_short = [
		'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
		'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
	];
	return function(date, short) {
		return (short ? months_short : months)[date.getMonth()];
	};
})();

module.exports.getJSON = function(url, cb_success, cb_err, cb_progr) {
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
};

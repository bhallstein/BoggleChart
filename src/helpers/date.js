
// date helpers
// -------------------------------

function first_of_this_month() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}


function days_in_month(year, month) {
  const is_28 = (new Date(year, month, 29)).getMonth() !== month;
  const is_29 = (new Date(year, month, 30)).getMonth() !== month;
  const is_30 = (new Date(year, month, 31)).getMonth() !== month;
  return is_28 ? 28 :
    is_29 ? 29 :
    is_30 ? 30 : 31;
}


function n_days_this_year() {
  const d = new Date();
  const days_in_feb = days_in_month(d.getFullYear(), 1);
  return days_in_feb === 28 ? 365 : 366;
}


function add_days(d, days) {
  const d2 = new Date(d.getTime());
  d2.setDate(d2.getDate() + days);
  return d2;
}


function increment_month(d, n) {
  n = n || 1;

  let d2 = new Date(d);
  for (let i = 0; i < n; ++i) {
    d2 = add_days(d2, 1);
    d2 = align_to_month_boundary(d2);
  }
  return d2;
}


function align_to_month_boundary(d, align_prev) {
  if (d.getDate() === 1) {
    return new Date(d.getTime());
  }

  const d2 = new Date(d.getFullYear(), d.getMonth(), 1);

  if (!align_prev) {
    const days_to_add = days_in_month(d.getFullYear(), d.getMonth());
    return add_days(d2, days_to_add);
  }

  else {
    const month = d.getMonth();
    const year = d.getFullYear();
    const days_to_remove = d === 0 ?
      days_in_month(year - 1, 11) :
      days_in_month(year, month - 1);
    return add_days(d2, days_to_remove);
  }
}


function fraction_of_date_range(d, range) {
  const x = d.getTime();
  const a = range[0].getTime();
  const b = range[1].getTime();

  return (x - a) / (b - a);
}


function full_months_between(d1, d2) {
  let n = (d2.getFullYear() - d1.getFullYear()) * 12 - d1.getMonth() + 1 + d2.getMonth();
  return Math.max(0, n) + 1;
}


function is_quarter_boundary(d) {
  const day = d.getDate();
  const month = d.getMonth();

  return day === 1 && month%3 === 0;
}


function friendly_date_string(d) {
  return `${d.toLocaleDateString('en-EN', {day: 'numeric', month: 'long'})}, ${d.getFullYear()}`;
}


function quarter_name(d) {
  const month = d.getMonth();
  return {
    '0' : '1',
    '3' : '2',
    '6' : '3',
    '9' : '4',
  }[month] || '√-1';
}


export default {
  first_of_this_month,
  days_in_month,
  n_days_this_year,
  add_days,
  increment_month,
  align_to_month_boundary,
  fraction_of_date_range,
  full_months_between,
  is_quarter_boundary,
  friendly_date_string,
  quarter_name,
};


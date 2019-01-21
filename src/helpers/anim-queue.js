
// anim-queue
// -------------------------------

export default function anim_queue() {
  var queue = [ ],
      cur   = null,
      intvl = null,
      dflt  = null;

  var exp = {
    add: function(animTask) {
      queue.push(animTask);
    },
    start: function() {
      if (intvl) return;
      if (queue.length > 0) {
        cur = queue.shift();
        intvl = setInterval(cur, 35);
      }
    },
    reset: function() {
      clearInterval(intvl);
      intvl = null;
      cur = null;
      queue = [ ];
    },
    finishTask: function() {
      clearInterval(intvl);
      intvl = null;
      cur = null;
      setTimeout(exp.start);
    },
    triggerDraw: function() {
      if (queue.length === 0 && cur === null && dflt !== null) {
        setTimeout(dflt);
      }
    },
    setDefaultDrawTask: function(task) {
      dflt = task;
    },
  };
  return exp;
};


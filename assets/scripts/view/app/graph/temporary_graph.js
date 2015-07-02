(function() {

  var Y_LABELS_INSET = 40;
  var X_LABELS_INSET = 35;
  var RIGHT_SIDE_INSET = 20;
  var TOP_INSET = 20;
  var BAR_SPACING = 10;
  var MAX_BUCKET_COUNT = 20;

  function TemporaryGraph() {
    this._$element = $('<div id="temporary-graph"></div>').css({
      height: '100%'
    });
    $('#graph').prepend(this._$element);
    this._buckets = [];
    for (var i = 15000; i <= 30000; i += 1000) {
      this._buckets.push({time: i, count: 0});
    }
    this._modelTicket = null;
    this._updateFromModel();
    this._registerModelEvents();
  }

  TemporaryGraph.prototype.layout = function(width) {
    this._$element.css({width: width});
    this._generateSVG();
  };

  TemporaryGraph.prototype._generateSVG = function() {
    var width = this._$element.width();
    var height = this._$element.height();

    if (!width || !height || this._buckets.length === 0) {
      return;
    }

    var sourceCode = '<svg viewBox="0 0 ' + width + ' ' + height + '" ' +
      'class="flavor-text">';

    var usableWidth = width - (Y_LABELS_INSET + RIGHT_SIDE_INSET);
    var usableHeight = height - (TOP_INSET + X_LABELS_INSET);
    var maximumCount = 0;
    for (var i = 0, len = this._buckets.length; i < len; ++i) {
      maximumCount = Math.max(maximumCount, this._buckets[i].count);
    }

    var divisibilityRule = Math.ceil(maximumCount / 5);
    maximumCount = divisibilityRule * Math.ceil(maximumCount /
      divisibilityRule);

    var barHeightOverCount = usableHeight / maximumCount;
    var barWidth = (usableWidth-BAR_SPACING*(this._buckets.length)) /
      this._buckets.length;

    if (barWidth < 1) {
      barWidth = 1;
    }

    // Generate the x-axis labels.
    sourceCode += '<g fill="#999">'
    var xLabelY = height - 5;
    for (var i = 0, len = this._buckets.length; i < len; ++i) {
      var time = window.app.formatSeconds(this._buckets[i].time);
      var xValue = Math.round(Y_LABELS_INSET + i*(barWidth+BAR_SPACING) +
        BAR_SPACING/2);
      sourceCode += '<text x="' + xValue + '" y="' + xLabelY + '" ' +
        'text-anchor="middle" font-size="17" font-weight="100">' + time +
        '</text>';
      sourceCode += '<rect fill="#f0f0f0" x="' + (xValue-1) + '" y="' +
        (height-X_LABELS_INSET+1) + '" width="2" height="7" />';
    }
    
    // Generate the y-axis labels.
    for (var y = 0; y <= maximumCount; y += divisibilityRule) {
      var altitude = Math.round(barHeightOverCount * y);
      var yValue = Math.round(height - altitude - X_LABELS_INSET);
      sourceCode += '<rect fill="#f0f0f0" x="' + Y_LABELS_INSET +
        '" y="' + (yValue) + '" width="' +
        (width-Y_LABELS_INSET) + '" height="2" />';
      sourceCode += '<text x="' + (Y_LABELS_INSET/2) + '" y="' + (yValue+7) +
        '" font-weight="100" ' + 'font-size="17" text-anchor="middle">' +
        y + '</text>';
    }
    sourceCode += '</g>';

    sourceCode += '<g fill="currentColor">';
    for (var i = 0, len = this._buckets.length; i < len; ++i) {
      var bucket = this._buckets[i];
      var barHeight = Math.round(barHeightOverCount * bucket.count);
      var xVal = Math.round(Y_LABELS_INSET + BAR_SPACING +
        (barWidth+BAR_SPACING)*i)  ;
      var yVal = Math.round(height - (barHeight + X_LABELS_INSET));
      var rect = '<rect x="' + xVal + '" y="' + yVal + '" width="' +
        Math.round(barWidth) + '" height="' + barHeight + '" />';
      sourceCode += rect;
    }
    sourceCode += '</g></svg>';

    this._$element.empty();
    this._$element.html(sourceCode);
  };

  TemporaryGraph.prototype._gotSolves = function(err, solves) {
    if (err) {
      this._$element.empty();
      this._$element.text('Could not load solves.');
      return;
    }

    var lowestBucket = Infinity;
    var highestBucket = -Infinity;
    var times = {};
    for (var i = 0, len = solves.length; i < len; ++i) {
      var solve = solves[i];
      if (!solve.dnf) {
        var time = window.app.solveTime(solve);
        var bucket = 1000 * Math.floor(time / 1000);
        if (!times[bucket]) {
          times[bucket] = 1;
        } else {
          ++times[bucket];
        }
        lowestBucket = Math.min(lowestBucket, bucket);
        highestBucket = Math.max(highestBucket, bucket);
      }
    }

    this._buckets = [];
    for (var i = lowestBucket; i <= highestBucket; i += 1000) {
      var count = times[i] || 0;
      this._buckets.push({time: i, count: count});
    }

    while (this._buckets.length > MAX_BUCKET_COUNT) {
      var newBuckets = [];
      for (var i = 0; i < this._buckets.length; i += 2) {
        var b1 = this._buckets[i];
        var newBucket = {time: b1.time, count: b1.count};
        if (i < this._buckets.length-1) {
          newBucket.count += this._buckets[i+1].count;
        }
        newBuckets.push(newBucket);
      }
      this._buckets = newBuckets;
    }

    this._generateSVG();
  };

  TemporaryGraph.prototype._registerModelEvents = function() {
    var events = ['addedPuzzle', 'addedSolve', 'deletedSolve', 'modifiedSolve',
      'remoteChange', 'switchedPuzzle'];
    for (var i = 0, len = events.length; i < len; ++i) {
      window.app.store.on(events[i], this._updateFromModel.bind(this));
    }
  };

  TemporaryGraph.prototype._updateFromModel = function() {
    if (this._modelTicket) {
      this._modelTicket.cancel();
    }
    var count = window.app.store.getSolveCount();
    this._modelTicket = window.app.store.getSolves(0, count,
      this._gotSolves.bind(this));
  };

  window.app.TemporaryGraph = TemporaryGraph;

})();

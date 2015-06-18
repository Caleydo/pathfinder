define(['d3'], function (d3) {

  function median(data, n) {
    if (n == 0)
      return NaN;

    var middle = Math.floor(n / 2);

    if (n % 2 == 1) {
      return data[middle];
    } else {
      return (data[middle - 1] + data[middle]) * 0.5;
    }
  }

  function percentile(data, n, percentile) {
    if (n == 0)
      return NaN;

    var k = (n - 1) * percentile;
    var f = Math.floor(k);
    var c = Math.ceil(k);
    if (f == c) {
      return data[f];
    } else {
      var d0 = data[f] * (c - k);
      var d1 = data[c] * (k - f);
      return d0 + d1;
    }
  }

  return {

    statisticsOf: function (data) {

      var stats = {
        min: NaN,
        max: NaN,
        nans: 0,
        median: NaN,
        mean: NaN,
        sd: NaN,
        quartile25: NaN,
        quartile75: NaN,
        iqrMin: NaN,
        iqrMax: NaN,
        numElements: data.length
      };

      var sortedData = Object.create(data);
      sortedData.sort(function (a, b) {
        return isNaN(a) && isNaN(b) ? 0 : isNaN(a) ? 1 : isNaN(b) ? -1 : d3.ascending(a, b);
      });

      var n = 0;
      var variance = 0;
      sortedData.forEach(function (d) {
        if (isNaN(d)) {
          stats.nans++;
        } else {

          n++;
          if (isNaN(stats.min) || d < stats.min) {
            stats.min = d;
          }
          if (isNaN(stats.max) || d > stats.max) {
            stats.max = d;
          }
          if (n == 1) {
            stats.mean = d;
          } else {
            var prevMean = stats.mean;
            stats.mean = stats.mean + (d - stats.mean) / n;
            variance = variance + (d - prevMean) * (d - stats.mean);
          }
        }
      });
      variance = variance/(n-1);

      var lengthWithoutNaNs = sortedData.length - stats.nans;

      stats.std = Math.sqrt(variance);

      stats.median = median(sortedData, lengthWithoutNaNs);
      stats.quartile25 = percentile(sortedData, lengthWithoutNaNs, 0.25);
      stats.quartile75 = percentile(sortedData, lengthWithoutNaNs, 0.75);

      var lowerIQRBounds = stats.quartile25 - (stats.quartile75 - stats.quartile25) * 1.5;
      var upperIQRBounds = stats.quartile75 + (stats.quartile75 - stats.quartile25) * 1.5;

      for (var i = 0; i < lengthWithoutNaNs; i++) {
        if (sortedData[i] >= lowerIQRBounds && sortedData[i] <= stats.quartile25) {
          stats.iqrMin = sortedData[i];
          break;
        }
      }

      for (var i = lengthWithoutNaNs - 1; i >= 0; i--) {
        if (sortedData[i] <= upperIQRBounds && sortedData[i] >= stats.quartile75) {
          stats.iqrMax = sortedData[i];
          break;
        }
      }

      return stats;
    }

  };
});

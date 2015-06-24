define(["d3"], function (d3) {
  var colorScheme = Object.create(colorbrewer.Set1[9]);
  //remove orange color to avoid conflict with highlighting
  colorScheme.splice(4, 1);
  //var scheme = Object.create(d3.scale.category10().domain());
  //scheme.splice(1, 1);

  var scale = d3.scale.ordinal()
    .domain(d3.range(8))
    .range(colorScheme);
  var numTypes = -1;

  return {
    nextColor: function () {
      numTypes++;
      return scale(numTypes);
    }
  };

});

define(["d3"], function (d3) {
  var paired =colorbrewer.Paired[12];
  var colorScheme = [paired[5], paired[1], paired[3], paired[9], paired[11], paired[4], paired[0], paired[2], paired[8]];
  //var scheme = Object.create(d3.scale.category10().domain());
  //scheme.splice(1, 1);

  var scale = d3.scale.ordinal()
    .domain(d3.range(9))
    .range(colorScheme);
  var numTypes = -1;

  return {
    nextColor: function () {
      numTypes++;
      this.colorsLeft--;
      return scale(numTypes);
    },

    maxNumColors: 9,
    colorsLeft: 9
  };

});

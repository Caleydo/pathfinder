define(["d3"], function (d3) {
  var  scheme=colorbrewer.Set1[9];
  //var paired =colorbrewer.Paired[12];
  var colorScheme = [scheme[0], scheme[1], scheme[2], scheme[3], scheme[6],  scheme[7], scheme[8]];
  //var colorScheme = [paired[5], paired[1], paired[3], paired[9], paired[11], paired[8], paired[0],  paired[4], paired[2]];
  //var scheme = Object.create(d3.scale.category10().domain());
  //scheme.splice(1, 1);

  var scale = d3.scale.ordinal()
    .domain(d3.range(colorScheme.length))
    .range(colorScheme);
  var numTypes = -1;

  return {
    nextColor: function () {
      numTypes++;
      this.colorsLeft--;
      return scale(numTypes);
      //return "gray";
    },

    maxNumColors: colorScheme.length,
    colorsLeft: colorScheme.length
  };

});

define(['d3', './queryview', '../listoverlay'], function (d3, queryView, ListOverlay) {

  var listOverlay = new ListOverlay();

  return {
    createAddNodeFilterButton: function (parent, svg, constraintType, text, x, y) {
      $(parent[0]).mouseenter(function () {
        var button = parent.append("g")
          .classed("overlayButton", true)
          .attr({
            transform: "translate(" + x + "," + y + ")"
          });

        //button.append("rect")
        //  .attr({
        //    x: x,
        //    y: y,
        //    width: 16,
        //    height: 16
        //  });

        button.append("text")
          .attr({
            x: 7,
            y: 16
          })
          .text("\uf0b0");

        button.on("click.filter", function () {

          var coordinates = [0, 0];
          coordinates = d3.mouse(svg[0][0]);
          var x = coordinates[0];
          var y = coordinates[1];

          listOverlay.show(svg, [{
            text: "Must contain",
            callback: function() {
              queryView.addNodeFilter(constraintType, text, false);
            }
          },
            {
              text: "Must not contain",
              callback: function() {
                queryView.addNodeFilter(constraintType, text, true);
              }
            }
          ], x, y);

          parent.selectAll("g.overlayButton").remove();
        })
      });

      $(parent[0]).mouseleave(function () {
        parent.selectAll("g.overlayButton").remove();
      });
    }
  }
});

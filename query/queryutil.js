define(['d3', './queryview', '../listoverlay', '../uiutil', '../setinfo', '../config'], function (d3, queryView, ListOverlay, uiUtil, setInfo, config) {

  //var listOverlay = new ListOverlay();

  return {
    getFilterOverlayItems: function (constraintType, text) {
      function getConstraintInfo() {
        switch (constraintType) {
          case "name":
            return {label: text, value: text, category: "Name"};
            break;
          case "type":
            return {label: text, value: text, category: "Type"};
            break;
          case "set":
            return {
              label: setInfo.getSetLabel(text),
              value: text,
              id: text,
              setNodeLabel: config.getSetNodeLabel(setInfo.get(text)),
              category: "Set"
            };
            break;
          default:
            return;
        }
      }

      return [{
        text: "Must contain",
        icon: "\uf0b0",
        callback: function () {
          queryView.addNodeFilter(getConstraintInfo(), false);
        }
      },
        {
          text: "Must not contain",
          icon: "\uf0b0",
          callback: function () {
            queryView.addNodeFilter(getConstraintInfo(), true);
          }
        }
      ]
    },

    createAddNodeFilterButton: function (parent, svg, constraintType, text, x, y, small) {




      //$(parent[0]).mouseenter(function () {
      //  var button = uiUtil.addOverlayButton(parent, x, y, small ? 10 : 16, small ? 10 : 16, "\uf0b0", 7, small ? 10 : 16, "rgb(30, 30, 30)", false);
      //
      //
      //  //parent.append("g")
      //  //  .classed("overlayButton", true)
      //  //  .classed("smallButton", small)
      //  //  .attr({
      //  //    transform: "translate(" + x + "," + y + ")"
      //  //  });
      //  //
      //  //
      //  //button.append("text")
      //  //  .attr({
      //  //    x: 7,
      //  //    y: small ? 10 : 16
      //  //  })
      //  //  .text("\uf0b0");
      //
      //  button.classed("smallButton", small)
      //    .on("click.filter", function () {
      //
      //      var coordinates = [0, 0];
      //      coordinates = d3.mouse(svg[0][0]);
      //      var x = coordinates[0];
      //      var y = coordinates[1];
      //
      //
      //
      //
      //
      //      listOverlay.show(svg, x, y);
      //
      //      parent.selectAll("g.overlayButton").remove();
      //    })
      //});
      //
      //$(parent[0]).mouseleave(function () {
      //  parent.selectAll("g.overlayButton").remove();
      //});
    }
  }
});

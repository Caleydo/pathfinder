define(["d3", "jquery", "./listoverlay"], function (d3, $, ListOverlay) {


  var listOverlay = new ListOverlay();

  return {
    getClampedText: function (text, maxLength) {
      if (text.length > maxLength) {
        return text.substring(0, maxLength);
      }
      return text;
    },

    formatNumber: function (num, maxDecimals) {

      maxDecimals = maxDecimals === 0 ? 0 : (maxDecimals || 4);


      var match = ('' + num).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
      if (!match) {
        return 0;
      }
      var decimals = Math.max(
        0,
        // Number of digits right of decimal point.
        (match[1] ? match[1].length : 0)
          // Adjust for scientific notation.
        - (match[2] ? +match[2] : 0));

      var formatter = d3.format("." + Math.min(decimals, maxDecimals) + "f");
      return formatter(num);
    },


    createTemporalOverlayButton: function (parent, svg, callBack, text, x, y, small) {
      var that = this;

      $(parent[0]).mouseenter(function () {
        var button = that.addOverlayButton(parent, x, y, small ? 10 : 16, small ? 10 : 16, text, 7, small ? 10 : 16, "rgb(30, 30, 30)", false);

        button.classed("smallButton", small)
          .on("click.overlay", function () {
            callBack();

            parent.selectAll("g.overlayButton").remove();
          })
      });

      $(parent[0]).mouseleave(function () {
        parent.selectAll("g.overlayButton").remove();
      });
    },

    createTemporalMenuOverlayButton: function (parent, svg, x, y, small, items) {
      this.createTemporalOverlayButton(parent, svg, function () {

        if (typeof items === "function") {
          listOverlay.setItems(items());
        } else {
          listOverlay.setItems(items);
        }

        listOverlay.show(svg, 0, 0);
        //listOverlay.show(svg, coordinates[0], coordinates[1]);
      }, "\uf013", x, y, small);
    },

    showListOverlay: function(items) {
      if (typeof items === "function") {
        listOverlay.setItems(items());
      } else {
        listOverlay.setItems(items);
      }

      listOverlay.show();
    },

    addOverlayButton: function (parent, x, y, width, height, buttonText, textX, textY, color, showBg) {

      var button = parent.append("g")
        .classed("overlayButton", true)
        .attr({
          transform: "translate(" + (x) + "," + (y) + ")"
        });

      if (showBg) {
        button.append("rect")
          .attr({
            x: 0,
            y: 0,
            width: width,
            height: height
          });
      }

      button.append("text")
        .attr({
          x: textX,
          y: textY
        })
        .style({
          fill: color
        })
        .text(buttonText);

      return button;
    }


  }
});

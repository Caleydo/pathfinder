define(['jquery', 'd3'], function ($, d3) {

  var ITEM_HEIGHT = 18;
  var ITEM_WIDTH = 120;


  function ListOverlay() {
    this.isShown = false;

  }

  ListOverlay.prototype = {
    //data must be in format [{text: string, callback: function()},...]
    show: function (domParent, data, x, y) {
      if (this.isShown) {
        this.hide();
      }
      this.isShown = true;

      var that = this;

      this.rootElement = domParent.append("g")
        .classed("listOverlay", true)
        .attr("transform", "translate(" + x + "," + y + ")");

      var listItem = this.rootElement.selectAll("g.listItem")
        .data(data)
        .enter()
        .append("g")
        .classed("listItem", true);

      listItem.append("rect")
        .attr({
          x: 0,
          y: function (d, i) {
            return i * ITEM_HEIGHT;
          },
          width: ITEM_WIDTH,
          height: ITEM_HEIGHT
        });

      listItem.append("text")
        .attr({
          x: 0,
          y: function (d, i) {
            return (i + 1) * ITEM_HEIGHT-4;
          }
        })
        .text(function (d) {
          return d.text;
        });

      listItem.on({
          mouseover: function () {
            d3.select(this).classed("hovered", true);
          },

          mouseout: function() {
            d3.select(this).classed("hovered", false);
          },

          click: function(d) {
            that.hide();
            d.callback();
          }
        }

      );


    },

    hide: function () {
      this.rootElement.remove();
    }
  };

  return ListOverlay;

});

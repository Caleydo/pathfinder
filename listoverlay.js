define(['jquery', 'd3'], function ($, d3) {

  var ITEM_HEIGHT = 18;
  var ITEM_ICON_WIDTH = 18;
  var ITEM_WIDTH = 120;


  function ListOverlay() {
    this.isShown = false;
    this.items = [];
    var that = this;
    //console.log("here");

    window.addEventListener('keyup', function (e) {
      if (e.keyCode === 27) {
        that.hide();
      }
    }, false);

    //window.onkeyup = function (e) {
    //  var key = e.keyCode ? e.keyCode : e.which;
    //
    //  if (key === 27) {
    //    that.hide();
    //  }
    //}

  }

  ListOverlay.prototype = {

    //items must be in format [{text: string, icon: string, callback: function()},...]
    setItems: function (items) {
      this.items = items;
    },

    addItem: function (item) {
      this.items.push(item);
    },

    show: function (domParent, x, y) {
      var that = this;

      if (this.isShown) {
        this.hide();
      }
      this.isShown = true;

      var coordinates = d3.mouse(d3.select("body")[0][0]);
      var svg = d3.select("#overlaySVG")
        .style({
          display: "inline",
          position: "absolute",
          left: coordinates[0],
          top: coordinates[1],
          width: ITEM_WIDTH,
          height: that.items.length * ITEM_HEIGHT
        }
      );

      var that = this;

      this.rootElement = svg.append("g")
        .classed("listOverlay", true);
        //.attr("transform", "translate(" + x + "," + y + ")");

      var listItem = this.rootElement.selectAll("g.listItem")
        .data(this.items)
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
        .classed("icon", true)
        .attr({
          x: 8,
          y: function (d, i) {
            return (i + 1) * ITEM_HEIGHT - 4;
          }
        })
        .text(function (d) {
          if (d.icon) {
            return d.icon;
          }
          return "";
        });

      listItem.append("text")
        .attr({
          x: ITEM_ICON_WIDTH,
          y: function (d, i) {
            return (i + 1) * ITEM_HEIGHT - 4;
          }
        })
        .text(function (d) {
          return d.text;
        });

      listItem.on({
          mouseover: function () {
            d3.select(this).classed("hovered", true);
          },

          mouseout: function () {
            d3.select(this).classed("hovered", false);
          },

          click: function (d) {
            that.hide();
            d.callback();
          }
        }
      );


    },

    hide: function () {

      var svg = d3.select("#overlaySVG")
        .style({
          display: "none"
        }
      );
      if (typeof this.rootElement !== "undefined") {
        this.rootElement.remove();
      }
      this.isShown = false;
    }
  }
  ;

  return ListOverlay;

})
;

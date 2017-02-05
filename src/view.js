/**
 * Created by Christian on 23.02.2015.
 */
define(['jquery', 'd3'],
  function ($, d3) {

    var DEFAULT_WIDTH = 800;
    var DEFAULT_HEIGHT = 800;

    function View(parentSelector) {
      this.parentSelector = parentSelector;
      this.grabHSpace = true;
      this.grabVSpace = false;
    }

    View.prototype = {
      init: function () {
        var svg = d3.select(this.parentSelector).append("svg");
        var that = this;
        this.updateViewSize();

        $(window).on('resize.updatev', function (e) {
          that.updateViewSize();
        });

        //var svg = d3.select(this.parentSelector + " svg");
        //svg.attr("width", "100%");
        ////svg.attr("height", "100%");
        //svg.style({
        //  "-webkit-flex": 1,
        //  "flex": 1
        //});
      },

      getMinSize: function () {
        return {width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT}
      },

      updateViewSize: function () {
        var minSize = this.getMinSize();
        var svg = d3.select(this.parentSelector + " svg");
        //var parent = $(this.parentSelector)[0];
        //var pw = $(this.parentSelector)[0].offsetWidth;
        //var p = $(this.parentSelector);
        var p = $(this.parentSelector)[0];
        if(typeof p === "undefined") {
          return;
        }
        var height = 0;
        if (p.offsetHeight > minSize.height && this.grabVSpace) {
          svg.style({
            "-webkit-flex": 1,
            "flex": 1
          });
          svg.attr("height", null);
        } else {
          svg.attr("height", minSize.height);
          //height = minSize.height;
        }


        svg.attr("width", $(this.parentSelector)[0].offsetWidth > minSize.width && this.grabHSpace ? "100%" : minSize.width);
        svg.style("width", $(this.parentSelector)[0].offsetWidth > minSize.width && this.grabHSpace ? "100%" : minSize.width);

      }

    };

    return View;


  });

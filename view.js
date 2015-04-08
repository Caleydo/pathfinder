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

        $(window).on('resize', function (e) {
          that.updateViewSize();
        });

      },

      getMinSize: function () {
        return {width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT}
      },

      updateViewSize: function () {
        var minSize = this.getMinSize();
        var svg = d3.select(this.parentSelector + " svg");
        //var parent = $(this.parentSelector)[0];
        //var pw = $(this.parentSelector)[0].offsetWidth;
        var p = $(this.parentSelector);
        var p2 = $(this.parentSelector)[0];
        var height = 0;
        if ($(this.parentSelector)[0].offsetHeight > minSize.height && this.grabVSpace) {
          height = "100%";
        } else {
          height = minSize.height;
        }


        svg.attr("width", $(this.parentSelector)[0].offsetWidth > minSize.width && this.grabHSpace ? "100%" : minSize.width);
        svg.attr("height", height);
      }

    };

    return View;


  });

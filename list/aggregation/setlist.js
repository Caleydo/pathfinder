define(['jquery', '../../../../bower_components/d3/d3', '../../listeners', '../pathlist', '../../sorting', '../../setinfo', '../../selectionutil', '../../pathUtil', '../../config', './aggregatesorting', './setcombinations', './noaggregationlist'],
  function ($, d3, listeners, pathList, sorting, setInfo, selectionUtil, pathUtil, config, aggregateSorting, SetComboList, NoAggregationList) {
    'use strict';

    var sortingManager = aggregateSorting.sortingManager;


    function AggregateView() {
      this.aggregateList = new SetComboList();
    }

    AggregateView.prototype = {

      addUpdateListener: function (l) {
        this.aggregateList.addUpdateListener(l);
      },

      getSize: function () {
        return this.aggregateList.getSize();
      },

      init: function () {
        this.aggregateList.init();
      },

      destroy: function () {
        this.aggregateList.destroy();
      },


      addPath: function (path) {
        this.aggregateList.addPath(path);
      },

      setPaths: function (paths) {
        this.aggregateList.setPaths(paths);
      },


      render: function (parent) {
        this.aggregateList.render(parent);
      }

    };


    return AggregateView;


  }
);

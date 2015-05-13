define(['jquery', 'd3', '../../listeners', '../pathlist', '../../sorting', '../../setinfo', '../../selectionutil', '../../pathUtil', '../../config', './aggregatesorting', './aggregate'],
  function ($, d3, listeners, PathList, sorting, setInfo, selectionUtil, pathUtil, config, aggregateSorting, aggregate) {
    'use strict';

    function NoAggregationList(listView) {
      aggregate.AggregateList.call(this, listView);
      this.pathList = new PathList(listView);
    }

    NoAggregationList.prototype = Object.create(aggregate.AggregateList.prototype);


    NoAggregationList.prototype.getSize = function () {

      return this.pathList.getSize();
    };

    NoAggregationList.prototype.init = function () {
      this.pathList.init();
    };

    NoAggregationList.prototype.addUpdateListener = function (l) {
      this.pathList.addUpdateListener(l);
    }

    NoAggregationList.prototype.destroy = function () {
      this.pathList.destroy();
    };

    NoAggregationList.prototype.removePaths = function () {
      this.pathList.removePaths();
    };

    NoAggregationList.prototype.addPath = function (path) {
      this.pathList.addPath(path);
    };

    NoAggregationList.prototype.setPaths = function (paths) {
      this.pathList.setPaths(paths);
    };


    NoAggregationList.prototype.render = function (parent) {
      this.pathList.render(parent);
    };


    return NoAggregationList;

  }
);

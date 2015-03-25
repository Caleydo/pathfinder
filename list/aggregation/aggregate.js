define(['../pathlist'], function (PathList) {

  var currentAggregateId = 0;

  function Aggregate(pathUpdateListener) {
    this.id = currentAggregateId++;
    this.paths = [];
    this.pathList = new PathList();
    this.pathList.init();
    this.pathList.addUpdateListener(pathUpdateListener);
  }


  Aggregate.prototype = {
    addPath: function (path) {
      this.paths.push(path);
      this.pathList.addPath(path);
    }
  };


  function AggregateList() {
    this.aggregates = [];
    this.selectionListeners = [];
    this.updateListeners = [];

  }

  AggregateList.prototype = {
    addUpdateListener: function (l) {
      this.updateListeners.push(l);
    },

    notifyUpdateListeners: function () {
      var that = this;
      this.updateListeners.forEach(function (l) {
        l(that);
      })
    },

    getSize: function () {
      return {width: 100, height: 100};
    },

    clearAggregates: function () {
      var that = this;
      this.aggregates.forEach(function (agg) {
        agg.pathList.destroy();
      });
      this.aggregates = [];
      currentAggregateId = 0;
    },

    init: function () {

    },

    destroy: function () {

    },

    addPath: function (path) {

    },

    setPaths: function (paths) {

    },

    render: function (parent) {

    }

  };

  return {
    AggregateList: AggregateList,
    Aggregate: Aggregate
  };

});

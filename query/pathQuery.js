define(['../listeners', './querymodel', '../datastore', '../pathutil'], function (listeners, q, dataStore, pathUtil) {

  var currentQuery = new q.PathQuery();

  var remainingPathIds = {};

  var remainingNodeIds = {};
  var remainingNodeSetIds = {};
  var remainingEdgeIds = {};
  var remainingEdgeSetIds = {};

  function filterPath(path) {
    if (currentQuery.match(path)) {
      remainingPathIds[path.id] = true;

      path.nodes.forEach(function (node) {
        remainingNodeIds[node.id] = true;
        pathUtil.forEachNodeSet(node, function (setType, setId) {
          remainingNodeSetIds[setId] = true;
        });
      });

      path.edges.forEach(function (edge) {
        remainingEdgeIds[edge.id] = true;
        pathUtil.forEachEdgeSet(edge, function (setType, setId) {
          remainingEdgeSetIds[setId] = true;
        });
      });

    }
  }


  return {

    addPath: function (path) {
      filterPath(path);
    },

    getQuery: function () {
      return currentQuery;
    },

    setQuery: function (query) {
      currentQuery = query;
      this.update();
      listeners.notify(listeners.updateType.QUERY_UPDATE, query);
    },

    update: function () {
      this.resetPaths();

      dataStore.paths.forEach(function (path) {
        filterPath(path);
      });
    },

    resetPaths: function () {
      remainingPathIds = {};

      remainingNodeIds = {};
      remainingNodeSetIds = {};
      remainingEdgeIds = {};
      remainingEdgeSetIds = {};
    },

    getRemainingPathIds: function () {
      return Object.keys(remainingPathIds);
    },

    isPathFiltered: function (id) {
      return !(remainingPathIds[id]);
    },

    getRemainingNodeIds: function () {
      return Object.keys(remainingNodeIds);
    },

    isNodeFiltered: function (id) {
      return !(remainingNodeIds[id]);
    },

    getRemainingEdgeIds: function () {
      return Object.keys(remainingEdgeIds);
    },

    isEdgeFiltered: function (id) {
      return !(remainingEdgeIds[id]);
    },

    getRemainingNodeSetIds: function () {
      return Object.keys(remainingNodeSetIds);
    },

    isNodeSetFiltered: function (id) {
      return !(remainingNodeSetIds[id]);
    },

    getRemainingEdgeSetIds: function () {
      return Object.keys(remainingEdgeSetIds);
    },

    isEdgeSetFiltered: function (id) {
      return !(remainingEdgeSetIds[id]);
    }

  }

});

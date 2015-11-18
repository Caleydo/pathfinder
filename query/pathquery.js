define(['../listeners', './querymodel', '../datastore', '../pathutil', '../config'], function (listeners, q, dataStore, pathUtil, config) {

  var currentQuery = new q.PathQuery();
  var isRemoteQuery = false;

  var remainingPathIds = {};

  var remainingNodeIds = {};
  var remainingNodeSetIds = {};
  var remainingEdgeIds = {};
  var remainingEdgeSetIds = {};

  function filterPath(path) {
    if (currentQuery.match(path)) {
      var allNetWorkEdges = true;
      if (justNetworkEdges) {
        for (var i = 0; i < path.edges.length; i++) {
          if (!config.isNetworkEdge(path.edges[i])) {
            allNetWorkEdges = false;
            break;
          }
        }
      }

      if (!justNetworkEdges || allNetWorkEdges) {
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
  }

  var removeFilteredPaths = true;
  var justNetworkEdges = false;


  return {

    addPaths: function (paths) {
      paths.forEach(function (path) {
        filterPath(path);
      });
      //console.log("nodes: " + Object.keys(remainingNodeIds).length + ", sets: " + Object.keys(remainingNodeSetIds).length + ", edgesets: " + Object.keys(remainingEdgeSetIds).length);
    },

    getQuery: function () {
      return currentQuery;
    },

    isRemoteQuery: function () {
      return isRemoteQuery;
    },

    setJustNetworkEdges: function (isJustNetworkEdges) {
      justNetworkEdges = isJustNetworkEdges;
      isRemoteQuery = false;
      this.update();
      listeners.notify(listeners.updateType.QUERY_UPDATE, this);
    },

    isJustNetworkEdges: function () {
      return justNetworkEdges;
    },

    setQuery: function (query, isRemQuery) {
      currentQuery = query;
      isRemoteQuery = isRemQuery || false;
      this.update();
      listeners.notify(listeners.updateType.QUERY_UPDATE, this);
    },

    setRemoveFilteredPaths: function (remove) {
      removeFilteredPaths = remove;
      listeners.notify(listeners.updateType.REMOVE_FILTERED_PATHS_UPDATE, remove);
    },

    isRemoveFilteredPaths: function () {
      return removeFilteredPaths;
    },

    update: function () {
      this.resetPaths();

      dataStore.getPaths().forEach(function (path) {
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

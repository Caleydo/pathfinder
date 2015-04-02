define(['./listeners', './query/pathquery'], function (listeners, pathQuery) {

  var paths = [];

  function pathExists(path) {
    for(var i = 0; i < paths.lenght; i++) {
      var edges = paths[i].edges;
      //checking edge ids should be enough to check for path equality
      if(edges.length === path.edges.length) {
        var allEdgesEqual = true;
        for(var j = 0; j < edges.length; j++) {
          if(edges[j].id !== path.edges[j].id) {
            allEdgesEqual = false;
          }
        }
        if(allEdgesEqual) {
          return true;
        }
      }
    }
    return false;
  }

  return {

    init: function() {
      listeners.add(function (pathQuery) {
          if (pathQuery.isRemoteQuery()) {

            for (var i = 0; i < paths.length; i++) {
              var path = paths[i];
              if (pathQuery.isPathFiltered(path.id)) {
                paths.splice(i, 1);
                i--;
              }
            }
          }
        },
        listeners.updateType.QUERY_UPDATE);
    },

    getPaths: function() {
      return paths;
    },

    addPath: function(path) {
      if(!pathExists(path)) {
        paths.push(path);
        return true;
      }
      return false;
    },

    reset: function() {
      paths = [];
    }
  }

});

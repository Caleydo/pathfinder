define(['../listeners', './querymodel'], function (listeners, q) {

  var currentQuery = new q.PathQuery();

  return {
    get: function () {
      return currentQuery;
    },

    set: function (query) {
      currentQuery = query;
      listeners.notify(listeners.updateType.QUERY_UPDATE, query);
    }
  }

});

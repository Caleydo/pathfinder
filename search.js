/**
 * Created by sam on 13.03.2015.
 */
define(['../caleydo/main', '../caleydo/event'],function(C, events) {
  'use strict';

  function ServerSearch() {
    events.EventHandler.call(this);
    this._socket = null;
    this._initialMessage = [];

    this.search_cache = {};
  }
  C.extendClass(ServerSearch, events.EventHandler);

  ServerSearch.prototype.onMessage = function(msg) {
    this.fire(msg.type, msg.data);
  };
  function asMessage(type, msg) {
    return JSON.stringify({type: type, data: msg});
  }
  ServerSearch.prototype.send = function(type, msg) {
    var that = this;
    if (!this._socket) {
      that._initialMessage.push(asMessage(type,msg));

      var s = new WebSocket('ws://' + document.domain + ':' + location.port + '/api/pathway/query');
      that.fire('ws_open');
      s.onmessage = function (msg) {
        //console.log('got message', msg);
        that.onMessage(JSON.parse(msg.data));
      };
      s.onopen = function() {
        that._socket = s;
        that._initialMessage.forEach(function(msg) {
          s.send(msg);
        });
        that._initialMessage = [];
        that.fire('ws_ready');
      };
      s.onclose = function () {
        that._socket = null; //clear socket upon close
        that.fire('ws_closed');
      };

    } else if (this._socket.readyState !== WebSocket.OPEN) {
      //not yet open cache it
      that._initialMessage.push(asMessage(type, msg));
    } else {
      //send directly
      this._socket.send(asMessage(type, msg));
    }
  };

  ServerSearch.prototype.loadQuery = function(query, k, maxDepth, just_network_edges) {
    var msg = {
      k : k || 10,
      maxDepth : maxDepth || 10,
      query : query ? query.serialize() : null,
      just_network_edges : just_network_edges || false
    };
    this.send('query', msg);
  };

  ServerSearch.prototype.loadNeighbors = function(node_id, just_network_edges) {
    var msg = {
      node : node_id,
      just_network_edges : just_network_edges || false
    };
    this.send('neighbor', msg);
  };

  ServerSearch.prototype.clearSearchCache = function() {
    this.search_cache = {};
  };

  /**
   * server search for auto completion
   * @param query the query to search
   * @param prop the property to look in
   * @param nodeType the node type to look in
   */
  ServerSearch.prototype.search = function(query, prop, nodeType) {
    prop = prop || 'name';
    nodeType = nodeType || '_Network_Node';
    var cache = this.search_cache[nodeType+'.'+prop];
    if (!cache) {
      cache = {};
      this.search_cache[nodeType+'.'+prop] = cache;
    }
    if (cache && query in cache) {
      return C.resolved(cache[query]);
    }
    return C.getAPIJSON('/pathway/search', {q: query, prop: prop, label: nodeType}).then(function (data) {
      cache[query] = data.results;
      return data.results;
    });
  };

  return new ServerSearch();
});

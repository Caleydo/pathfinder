/**
 * Created by sam on 13.03.2015.
 */
define(['jquery','jquery-ui'],function($, io) {
  'use strict';

  function SearchPath(selector) {
    var that = this;
    $(selector).load('search/search.html', function() {
      that.init();
    });
    this.query = null;
    this.onMsg = {};
    this._socket = null;
    this._initialMessage = [];
  }
  SearchPath.prototype.onMessage = function(msg) {
    var l = this.onMsg[msg.type];
    if (l) {
      l(msg.data);
    }
  };
  SearchPath.prototype.send = function(type, msg) {
    var that = this;
    if (!this._socket) {
      that._initialMessage.push({ type: type, data: msg});

      var s = new WebSocket('ws://' + document.domain + ':' + location.port + '/api/pathway/query');
      s.onmessage = function (msg) {
        console.log('got message', msg);
        that.onMessage(JSON.parse(msg.data));
      };
      s.onopen = function() {
        that._socket = s;
        that._initialMessage.forEach(function(msg) {
          s.send(JSON.stringify(msg));
        });
        that._initialMessage = [];
      };
      s.onclose = function () {
        that._socket = null; //clear socket upon close
      };

    } else if (this._socket.readyState !== WebSocket.OPEN) {
      that._initialMessage.push({ type: type, data: msg});
    } else {
      this._socket.send(JSON.stringify({type: type, data: msg}));
    }
  };
  SearchPath.prototype.init = function() {
    var that = this;
    //this.enableAutocomplete();

    $('#search_form').on('submit', this.handleSubmit.bind(this));
  };
  SearchPath.prototype.loadQuery = function(query, k, maxDepth, onPathDone, onPathsDone) {
    var msg = {
      k : k || 10,
      maxDepth : maxDepth || 10,
      query : query ? query.serialize() : null
    };
    this.onMsg.path = onPathDone;
    this.onMsg.done = onPathsDone;
    this.send('query', msg);
  };
  SearchPath.prototype.updateQuery = function(query, trigger) {
    trigger = trigger || false;
    this.query = query;
    if (trigger) {
      $('#search_form').submit();
    }
  };
  SearchPath.prototype.handleSubmit = function(event) {
    var $this = $(this);
    var k = + $('#at_most_k').val();
    var maxDepth = + $('#longest_path').val();

    var $progress = $('#loadProgress').show()
      .attr("max", k)
      .attr("value", 0);

    $this.trigger('reset');

    event.preventDefault();
    event.stopPropagation();

    var count = 0;
    this.loadQuery(this.query, k, maxDepth, function (path) {
      console.log('got path', path);
      $this.trigger('addPath', path);
      count++;
      $progress.attr("value", count);
    }, function (paths) {
      $progress.hide();
      console.log('got paths', paths);
    });

    return false; //no real submit
  };

  return SearchPath;
});

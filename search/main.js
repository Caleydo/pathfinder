/**
 * Created by sam on 13.03.2015.
 */
define(['jquery','jquery-ui'],function($, io) {
  'use strict';

  function SearchPath(selector) {
    var that = this;
    this.search_cache = {};
    $(selector).load('search/search.html', function() {
      that.init();
    });
    this.query = null;
    this.socket = new WebSocket('ws://' + document.domain + ':' + location.port+'/api/pathway/query');
    this.onMsg = {};
    this.socket.onmessage = function(msg) {
      that.onMessage(JSON.parse(msg));
    }
  }
  SearchPath.prototype.onMessage = function(msg) {
    var l = this.onMsg[msg.type];
    if (l) {
      l(msg.data);
    }
  };
  SearchPath.prototype.send = function(type, msg) {
    this.socket.send(JSON.stringify({ type : type, data: msg}));
  };
  SearchPath.prototype.enableAutocomplete = function() {
    var that = this;
    $('#from_node, #to_node').autocomplete({
      minLength: 3,
      source: function( request, response ) {
        var term = request.term;
        if ( term in that.search_cache ) {
          response( that.search_cache[ term ] );
          return;
        }
        $.getJSON('/api/pathway/search', { q : term}).then(function(data) {
          that.search_cache[ term ] = data.results;
          response( data.results );
        });
      }
    });
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
      paths = JSON.parse(paths);
      $progress.hide();
      console.log('got paths', paths);
    });

    return false; //no real submit
  };

  return SearchPath;
});

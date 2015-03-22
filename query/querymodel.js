define(['d3', '../pathutil'], function (d3, pathUtil) {

  //Indices are always node indices within the path, for edges, it is the index of the lower node
  function MatchRegion(minIndex, maxIndex) {
    this.minIndex = minIndex;
    this.maxIndex = maxIndex || minIndex;
  }

  MatchRegion.prototype = {};

  function PathQuery() {

  }

  PathQuery.prototype = {
    match: function (path) {
      return this.getMatchRegions(path, true).length > 0;
    },

    getMatchRegions: function (path, getFirstOnly) {
      return path.nodes.map(function (node, i) {
        return [new MatchRegion(i, i)];
      });
    },
    serialize: function () {
      return {};
    }
  };


  function Constraint() {
  }

  Constraint.prototype = {
    match: function (o) {
      return true;
    },
    serialize: function () {
      return {};
    }
  };

  function AndConstraint(constraint1, constraint2) {
    Constraint.call(this);
    this.constraint1 = constraint1;
    this.constraint2 = constraint2;
  }

  AndConstraint.prototype = Object.create(Constraint.prototype);
  AndConstraint.prototype.match = function (o) {
    return this.constraint1.match(o) && this.constraint2.match(o);
  };
  AndConstraint.prototype.serialize = function () {
    return {'$and': [this.constraint1.serialize(), this.constraint2.serialize()]}
  };

  function OrConstraint(constraint1, constraint2) {
    this.constraint1 = constraint1;
    this.constraint2 = constraint2;
  }

  OrConstraint.prototype = Object.create(Constraint.prototype);
  OrConstraint.prototype.match = function (o) {
    return this.constraint1.match(o) || this.constraint2.match(o);
  };
  OrConstraint.prototype.serialize = function () {
    return {'$or': [this.constraint1.serialize(), this.constraint2.serialize()]}
  };

  function NodeIdConstraint(nodeId) {
    Constraint.call(this);
    this.nodeId = nodeId;
  }

  NodeIdConstraint.prototype = Object.create(Constraint.prototype);
  NodeIdConstraint.prototype.match = function (node) {
    return node.id === this.nodeId;
  };
  NodeIdConstraint.prototype.serialize = function () {
    return {context: 'node', prop: 'id', '$eq': this.nodeId}
  };

  function NodeNameConstraint(nodeName) {
    Constraint.call(this);
    this.nodeName = nodeName;
  }

  NodeNameConstraint.prototype = Object.create(Constraint.prototype);
  NodeNameConstraint.prototype.match = function (node) {
    return node.properties["name"] === this.nodeName;
  };
  NodeNameConstraint.prototype.serialize = function () {
    return {context: 'node', 'prop': 'name', '$eq': this.nodeName}
  };

  function NodeTypeConstraint(nodeType) {
    Constraint.call(this);
    this.nodeType = nodeType;
  }

  NodeTypeConstraint.prototype = Object.create(Constraint.prototype);
  NodeTypeConstraint.prototype.match = function (node) {
    return pathUtil.getNodeType(node) === this.nodeType;
  };
  NodeTypeConstraint.prototype.serialize = function () {
    return {context: 'node', '$contains': this.nodeType}
  };

  function NodeSetPresenceConstraint(setId) {
    Constraint.call(this);
    this.setId = setId;
  }

  NodeSetPresenceConstraint.prototype = Object.create(Constraint.prototype);
  NodeSetPresenceConstraint.prototype.match = function (node) {
    var propertyKeys = Object.keys(node.properties);
    for (var j = 0; j < propertyKeys.length; j++) {
      var key = propertyKeys[j];
      if (pathUtil.isNodeSetProperty(key)) {
        var property = node.properties[key];
        if (property instanceof Array) {
          for (var k = 0; k < property.length; k++) {
            if (property[k] === this.setId) {
              return true;
            }
          }
        } else if (property === this.setId) {
          return true;
        }
      }
    }
    return false;
  };
  NodeSetPresenceConstraint.prototype.serialize = function () {
    //FIXME hard coded
    return {context: 'node', 'prop': 'pathways', '$contains': this.setId};
  };

  function EdgeSetPresenceConstraint(setId) {
    Constraint.call(this);
    this.setId = setId;
  }

  EdgeSetPresenceConstraint.prototype = Object.create(Constraint.prototype);

  EdgeSetPresenceConstraint.prototype.match = function (edge) {
    var propertyKeys = Object.keys(edge.properties);
    for (var j = 0; j < propertyKeys.length; j++) {
      var key = propertyKeys[j];
      if (pathUtil.isEdgeSetProperty(key)) {
        var property = edge.properties[key];
        if (property instanceof Array) {
          for (var k = 0; k < property.length; k++) {
            if (property[k] === this.setId) {
              return true;
            }
          }
        } else if (property === this.setId) {
          return true;
        }
      }
    }
    EdgeSetPresenceConstraint.prototype.serialize = function () {
      //FIXME hard coded
      return {context: 'rel', 'prop': 'pathways', '$contains': this.setId};
    };

    return false;
  };


  function NodeMatcher(constraint) {
    this.constraint = constraint;
    //a bit hacky
    this.isStartNode = false;
    this.isEndNode = false;
  }

  NodeMatcher.prototype = Object.create(PathQuery.prototype);

  NodeMatcher.prototype.setStartNode = function (isStartNode) {
    this.isStartNode = isStartNode;
  };

  NodeMatcher.prototype.setEndNode = function (isEndNode) {
    this.isEndNode = isEndNode;
  };

  NodeMatcher.prototype.getMatchRegions = function (path, getFirstOnly) {
    var matchRegions = [];

    for (var i = 0; i < path.nodes.length; i++) {
      if (this.constraint.match(path.nodes[i])) {
        matchRegions.push(new MatchRegion(i, i));
        if (getFirstOnly) {
          return matchRegions;
        }
      }
    }
    return matchRegions;
  };
  NodeMatcher.prototype.serialize = function () {
    var r = this.constraint.serialize();
    if (this.isStartNode) {
      r.isStart = true;
    }
    if (this.isEndNode) {
      r.isEnd = true;
    }
    return r;
  };


  function EdgeMatcher(constraint) {
    this.constraint = constraint;
  }


  EdgeMatcher.prototype = Object.create(PathQuery.prototype);

  EdgeMatcher.prototype.getMatchRegions = function (path, getFirstOnly) {
    var matchRegions = [];

    for (var i = 0; i < path.edges.length; i++) {
      if (this.constraint.match(path.edges[i])) {
        matchRegions.push(new MatchRegion(i, i));
        if (getFirstOnly) {
          return matchRegions;
        }
      }
    }
    return matchRegions;
  };
  EdgeMatcher.prototype.serialize = function () {
    return this.constraint.serialize();
  };


  function And(query1, query2) {
    PathQuery.call(this);
    this.query1 = query1;
    this.query2 = query2;
  }

  And.prototype = Object.create(PathQuery.prototype);

  And.prototype.match = function (path) {
    return this.query1.match(path) && this.query2.match(path);
  };

  And.prototype.getMatchRegions = function (path, getFirstOnly) {
    var matchRegions1 = this.query1.getMatchRegions(path);
    if (matchRegions1.length <= 0) {
      return [];
    }

    var matchRegions2 = this.query2.getMatchRegions(path);
    if (matchRegions2.length <= 0) {
      return [];
    }
    //Not sure if concat is correct but And will probably not be used when regions are required, MatchRegionRelations will be used in that case
    return matchRegions1.concat(matchRegions2);
  };
  And.prototype.serialize = function () {
    return {'$and': [this.query1.serialize(), this.query2.serialize()]};
  };

  function Or(query1, query2) {
    PathQuery.call(this);
    this.query1 = query1;
    this.query2 = query2;
  }

  Or.prototype = Object.create(PathQuery.prototype);

  Or.prototype.match = function (path) {
    return this.query1.match(path) || this.query2.match(path);
  };

  Or.prototype.getMatchRegions = function (path, getFirstOnly) {
    var matchRegions1 = this.query1.getMatchRegions(path);
    var matchRegions2 = this.query2.getMatchRegions(path);
    return matchRegions1.concat(matchRegions2);
  };
  Or.prototype.serialize = function () {
    return {'$or': [this.query1.serialize(), this.query2.serialize()]};
  };


  function Not(query) {
    PathQuery.call(this);
    this.query = query;
  }

  Not.prototype = Object.create(PathQuery.prototype);

  Not.prototype.match = function (path) {
    return !this.query.match(path);
  };

  Not.prototype.getMatchRegions = function (path, getFirstOnly) {
    var matchRegions = this.query.getMatchRegions(path);

    var usedIndices = [];

    matchRegions.forEach(function (region) {
      usedIndices.concat(d3.range(region.minIndex, region.maxIndex));
    });

    var unusedIndices = [];

    for (var i = 0; i < path.nodes.length; i++) {
      if (usedIndices.indexOf(i) !== -1) {
        unusedIndices.push(i);
      }
    }
    return unusedIndices;
  };

  Not.prototype.serialize = function () {
    return {'$not': [this.query.serialize()]};
  };

  function RegionMatcher(query, region, relativeToEnd, regionRelation) {
    PathQuery.call(this);
    this.query = query;
    this.region = region;
    this.relativeToEnd = relativeToEnd;
    this.regionRelation = regionRelation;
  }

  RegionMatcher.prototype = Object.create(PathQuery.prototype);

  RegionMatcher.prototype.getMatchRegions = function (path, getFirstOnly) {
    var myRegion = this.region;
    if (this.relativeToEnd) {
      myRegion = new MatchRegion(path.nodes.length - 1 - this.region.minIndex, path.nodes.length - 1 - this.region.maxIndex);
    }
    var matchRegions = this.query.getMatchRegions(path);
    var validRegions = [];
    for (var i = 0; i < matchRegions.length; i++) {
      if (this.regionRelation(matchRegions[i], myRegion)) {
        validRegions.push(matchRegions[i]);
        if(getFirstOnly) {
          return validRegions;
        }
      }
    }
    return validRegions;
  };
  RegionMatcher.prototype.serialize = function () {
    var r = this.query.serialize();
    var reg = [this.region.minIndex, this.region.maxIndex];
    if (this.relativeToEnd) {
      reg = [-1 - this.region.minIndex, -1 - this.region.maxIndex];
    }
    r['$region'] = reg;
    r['$relate'] = this.regionRelation.name;
    return r;
  };

  var MatchRegionRelations = {
    subsequent: function subsequent(region1, region2) {
      return region2.minIndex === (region1.maxIndex + 1);
    },
    equal: function equal(region1, region2) {
      return region1.minIndex === region2.minIndex && region1.maxIndex === region2.maxIndex;
    },

    unequal: function equal(region1, region2) {
      return region1.minIndex !== region2.minIndex && region1.maxIndex !== region2.maxIndex;
    },

    max1EqualsMin2: function max1EqualsMin2(region1, region2) {
      return region1.maxIndex === region2.minIndex;
    },

    greater: function greater(region1, region2) {
      return region1.maxIndex > region2.minIndex;
    },

    less: function less(region1, region2) {
      return region1.maxIndex < region2.minIndex;
    }
  };


  function QueryMatchRegionRelation(query1, query2, regionRelation) {
    PathQuery.call(this);
    this.query1 = query1;
    this.query2 = query2;
    this.regionRelation = regionRelation;
  }

  QueryMatchRegionRelation.prototype = Object.create(PathQuery.prototype);

  QueryMatchRegionRelation.prototype.getMatchRegions = function (path, getFirstOnly) {


    var matchRegions1 = this.query1.getMatchRegions(path);
    if (matchRegions1.length <= 0) {
      return [];
    }

    var matchRegions2 = this.query2.getMatchRegions(path);
    if (matchRegions2.length <= 0) {
      return [];
    }

    var mergedMatchRegions = [];

    for (var i = 0; i < matchRegions1.length; i++) {
      var region1 = matchRegions1[i];
      for (var j = 0; j < matchRegions2.length; j++) {
        var region2 = matchRegions2[j];
        if (this.regionRelation(region1, region2)) {
          mergedMatchRegions.push(new MatchRegion(Math.min(region1.minIndex, region2.minIndex), Math.max(region1.maxIndex, region2.maxIndex)));
          if (getFirstOnly) {
            return mergedMatchRegions;
          }
        }
      }
    }
    return mergedMatchRegions;
  };
  QueryMatchRegionRelation.prototype.serialize = function () {
    var r = {};
    r['$relate'] = this.regionRelation.name;
    r['a'] = this.query1.serialize();
    r['b'] = this.query2.serialize();
    return r;
  };

  return {
    MatchRegion: MatchRegion,
    Constraint: Constraint,
    PathQuery: PathQuery,
    AndConstraint: AndConstraint,
    OrConstraint: OrConstraint,
    NodeIdConstraint: NodeIdConstraint,
    NodeNameConstraint: NodeNameConstraint,
    NodeTypeConstraint: NodeTypeConstraint,
    NodeSetPresenceConstraint: NodeSetPresenceConstraint,
    EdgeSetPresenceConstraint: EdgeSetPresenceConstraint,
    NodeMatcher: NodeMatcher,
    EdgeMatcher: EdgeMatcher,
    And: And,
    Or: Or,
    Not: Not,
    RegionMatcher: RegionMatcher,
    QueryMatchRegionRelation: QueryMatchRegionRelation,
    MatchRegionRelations: MatchRegionRelations
  }

})
;

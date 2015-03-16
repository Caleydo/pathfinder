define(['../pathutil'], function (pathUtil) {

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
      return [];
    }
  };


  function Constraint() {
  }

  Constraint.prototype = {
    match: function (o) {
      return true;
    }
  };

  function AndConstraint(constraint1, constraint2) {
    this.constraint1 = constraint1;
    this.constraint2 = constraint2;
  }

  AndConstraint.prototype = Object.create(Constraint.prototype);
  AndConstraint.prototype.match = function (o) {
    return this.constraint1.match(o) && this.constraint2.match(o);
  };

  function OrConstraint(constraint1, constraint2) {
    this.constraint1 = constraint1;
    this.constraint2 = constraint2;
  }

  OrConstraint.prototype = Object.create(Constraint.prototype);
  OrConstraint.prototype.match = function (o) {
    return this.constraint1.match(o) || this.constraint2.match(o);
  };

  function NodeIdConstraint(nodeId) {
    Constraint.call(this);
    this.nodeId = nodeId;
  }

  NodeIdConstraint.prototype = Object.create(Constraint.prototype);
  NodeIdConstraint.prototype.match = function (node) {
    return node.id === this.nodeId;
  };

  function NodeNameConstraint(nodeName) {
    Constraint.call(this);
    this.nodeName = nodeName;
  }

  NodeNameConstraint.prototype = Object.create(Constraint.prototype);
  NodeNameConstraint.prototype.match = function (node) {
    return node.properties["name"] === this.nodeName;
  };

  function NodeTypeConstraint(nodeType) {
    Constraint.call(this);
    this.nodeType = nodeType;
  }

  NodeTypeConstraint.prototype = Object.create(Constraint.prototype);
  NodeTypeConstraint.prototype.match = function (node) {
    return pathUtil.getNodeType(node) === this.nodeType;
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

  function EdgeSetPresenceConstraint(setId) {
    Constraint.call(this);
    this.setId = setId;
  }

  EdgeSetPresenceConstraint.prototype = Object.create(PathQuery.prototype);

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

    return false;
  };


  function NodeMatcher(constraint) {
    this.constraint = constraint;
  }

  NodeMatcher.prototype = Object.create(PathQuery.prototype);

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
  }


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
  }

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
  }

  function RegionMatcher(query, region, relativeToEnd) {
    PathQuery.call(this);
    this.query = query;
    this.region = region;
    this.relativeToEnd = relativeToEnd;
  }

  RegionMatcher.prototype = Object.create(PathQuery.prototype);

  RegionMatcher.prototype.getMatchRegions = function (path, getFirstOnly) {
    var myRegion = this.region;
    if (this.relativeToEnd) {
      myRegion = new MatchRegion(path.nodes.length - 1 - this.region.minIndex, path.nodes.length - 1 - this.region.maxIndex);
    }
    var matchRegions = this.query.getMatchRegions(path);
    for (var i = 0; i < matchRegions.length; i++) {
      if (MatchRegionRelations.equal(matchRegions[i], myRegion)) {
        return [myRegion];
      }
    }
    return [];
  };

  var MatchRegionRelations = {
    subsequent: function (region1, region2) {
      return region2.minIndex === (region1.maxIndex + 1);
    },
    equal: function (region1, region2) {
      return region1.minIndex === region2.minIndex && region1.maxIndex == region2.maxIndex;
    },
    max1EqualsMin2: function (region1, region2) {
      return region1.maxIndex === region2.minIndex;
    },

    greater: function (region1, region2) {
      return region2.minIndex > region1.maxIndex;
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
    RegionMatcher: RegionMatcher,
    QueryMatchRegionRelation: QueryMatchRegionRelation,
    MatchRegionRelations: MatchRegionRelations
  }

})
;

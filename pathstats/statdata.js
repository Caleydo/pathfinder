define(['../hierarchyelements', '../listeners', '../list/pathsorting', '../query/pathquery', '../config', '../setinfo', '../settings/visibilitysettings', '../query/queryutil', '../selectionutil', '../pathutil'],
  function (hierarchyElements, listeners, pathSorting, pathQuery, config, setInfo, visibilitySettings, queryUtil, selectionUtil, pathUtil) {

    var HierarchyElement = hierarchyElements.HierarchyElement;

    var LEVEL1_HIERARCHY_ELEMENT_HEIGHT = 24;
    var LEVEL2_HIERARCHY_ELEMENT_HEIGHT = 16;
    var HIERARCHY_ELEMENT_HEIGHT = 12;

    function BaseHierarchyElement(parentElement) {
      HierarchyElement.call(this, parentElement);
    }

    BaseHierarchyElement.prototype = Object.create(HierarchyElement.prototype);
    BaseHierarchyElement.prototype.getBaseHeight = function () {
      return HIERARCHY_ELEMENT_HEIGHT;
    };

    BaseHierarchyElement.prototype.getColor = function () {
      return "gray";
    };

    function Level1HierarchyElement(parentElement) {
      HierarchyElement.call(this, parentElement);
    }

    Level1HierarchyElement.prototype = Object.create(HierarchyElement.prototype);
    Level1HierarchyElement.prototype.getBaseHeight = function () {
      return LEVEL1_HIERARCHY_ELEMENT_HEIGHT;
    };

    function NodeWrapper(parentElement, node) {
      BaseHierarchyElement.call(this, parentElement);
      this.id = node.id;
      this.node = node;
      this.pathIds = [];
    }

    NodeWrapper.prototype = Object.create(BaseHierarchyElement.prototype);

    NodeWrapper.prototype.addPath = function (path) {
      if (this.pathIds.indexOf(path.id) === -1) {
        this.pathIds.push(path.id);
      }
    };

    NodeWrapper.prototype.removePath = function (path) {
      var index = this.pathIds.indexOf(path.id);
      if (index !== -1) {
        this.pathIds.splice(index, 1);
      }
    };

    NodeWrapper.prototype.onDoubleClick = function () {
      //pathSorting.sortingManager.addOrReplace(pathSorting.sortingStrategies.getNodePresenceStrategy([this.node.id]));
      pathSorting.addSelectionBasedSortingStrategy(new pathSorting.NodePresenceSortingStrategy(selectionUtil.selections["node"]["selected"]));
      //pathSorting.sortingStrategies.selectionSortingStrategy.setNodeIds([this.node.id]);
      listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
    };

    NodeWrapper.prototype.getLabel = function () {
      return this.node.properties[config.getNodeNameProperty(this.node)];
    };

    NodeWrapper.prototype.hasOverlayItems = function () {
      return true;
    };

    NodeWrapper.prototype.getOverlayMenuItems = function () {
      return pathUtil.getDefaultNodeOverlayItems(this.node)
    };

    //NodeWrapper.prototype.getNodeConstraintType = function () {
    //  return "name";
    //};

    //NodeWrapper.prototype.getFilterText = function () {
    //  return this.getLabel();
    //};

    NodeWrapper.prototype.isFiltered = function () {
      return pathQuery.isNodeFiltered(this.node.id);
    };

    NodeWrapper.prototype.getTooltip = function () {
      return this.pathIds.length + " paths contain node " + this.getLabel();
    };

    function NodeTypeWrapper(parentElement, type) {
      this.id = type;
      BaseHierarchyElement.call(this, parentElement);
      this.type = type;
      this.nodeWrapperDict = {};
      this.pathIds = [];
    }

    NodeTypeWrapper.prototype = Object.create(BaseHierarchyElement.prototype);

    NodeTypeWrapper.prototype.getBaseHeight = function () {
      return LEVEL2_HIERARCHY_ELEMENT_HEIGHT;
    };

    NodeTypeWrapper.prototype.addNode = function (node, path) {
      var nodeWrapper = this.nodeWrapperDict[node.id.toString()];

      if (this.pathIds.indexOf(path.id) === -1) {
        this.pathIds.push(path.id);
      }

      if (typeof nodeWrapper === "undefined") {
        nodeWrapper = new NodeWrapper(this, node);
        this.nodeWrapperDict[node.id.toString()] = nodeWrapper;
        this.children.push(nodeWrapper);
      }
      nodeWrapper.addPath(path);
    };

    NodeTypeWrapper.prototype.removeNode = function (node) {
      var nodeWrapper = this.nodeWrapperDict[node.id.toString()];
      if (typeof nodeWrapper === "undefined") {
        return;
      }
      delete this.nodeWrapperDict[node.id.toString()];

      var index = this.children.indexOf(nodeWrapper);
      if (index !== -1) {
        this.children.splice(index, 1);
      }
    };

    NodeTypeWrapper.prototype.getLabel = function () {
      return this.type;
    };

    NodeTypeWrapper.prototype.isFiltered = function () {
      for (var i = 0; i < this.children.length; i++) {
        if (!this.children[i].isFiltered()) {
          return false;
        }
      }

      return true;
    };

    NodeTypeWrapper.prototype.getOverlayMenuItems = function () {
      return queryUtil.getFilterOverlayItems("type", this.type);
    };
    //
    NodeTypeWrapper.prototype.hasOverlayItems = function () {
      return true;
    };
    //
    //NodeTypeWrapper.prototype.getNodeConstraintType = function () {
    //  return "type";
    //};
    //
    //NodeTypeWrapper.prototype.getFilterText = function () {
    //  return this.type;
    //};

    NodeTypeWrapper.prototype.removePath = function (path) {
      var index = this.pathIds.indexOf(path.id);
      if (index !== -1) {
        this.pathIds.splice(index, 1);
      }

      this.children.forEach(function (child) {
        child.removePath(path);
      });
    };

    NodeTypeWrapper.prototype.getTooltip = function () {
      return this.pathIds.length + " paths contain nodes of type " + this.getLabel();
    };

    function SetWrapper(parentElement, setId) {
      this.id = setId;
      BaseHierarchyElement.call(this, parentElement);
      this.setId = setId;
      this.pathIds = [];
      this.nodeIds = {};
      this.edgeIds = {};
    }

    SetWrapper.prototype = Object.create(BaseHierarchyElement.prototype);

    SetWrapper.prototype.addNode = function (node, path) {
      if (this.pathIds.indexOf(path.id) === -1) {
        this.pathIds.push(path.id);
      }

      var pathIdsForNode = this.nodeIds[node.id.toString()];

      if (typeof pathIdsForNode === "undefined") {
        pathIdsForNode = [];
        this.nodeIds[node.id.toString()] = pathIdsForNode;
      }

      pathIdsForNode.push(path.id);

    };

    SetWrapper.prototype.removePath = function (path) {
      var index = this.pathIds.indexOf(path.id);
      if (index !== -1) {
        this.pathIds.splice(index, 1);
      }
      var that = this;

      path.nodes.forEach(function (node) {
        var pathIdsForNode = that.nodeIds[node.id.toString()];

        if (typeof pathIdsForNode !== "undefined") {
          var i = pathIdsForNode.indexOf(path.id);
          if (i !== -1) {
            pathIdsForNode.splice(i, 1);
          }
          if (pathIdsForNode.length <= 0) {
            delete that.nodeIds[node.id.toString()];
          }
        }
      });

      path.edges.forEach(function (edge) {
        var pathIdsForEdge = that.edgeIds[edge.id.toString()];

        if (typeof pathIdsForEdge !== "undefined") {
          var i = pathIdsForEdge.indexOf(path.id);
          if (i !== -1) {
            pathIdsForEdge.splice(i, 1);
          }

          if (pathIdsForEdge.length <= 0) {
            delete that.edgeIds[edge.id.toString()];
          }
        }
      });

    };

    SetWrapper.prototype.addEdge = function (edge, path) {
      if (this.pathIds.indexOf(path.id) === -1) {
        this.pathIds.push(path.id);
      }

      var pathIdsForEdge = this.edgeIds[edge.id.toString()];

      if (typeof pathIdsForEdge === "undefined") {
        pathIdsForEdge = [];
        this.edgeIds[edge.id.toString()] = pathIdsForEdge;
      }

      pathIdsForEdge.push(path.id);
    };

    SetWrapper.prototype.isFiltered = function () {
      return pathQuery.isNodeSetFiltered(this.setId) && pathQuery.isEdgeSetFiltered(this.setId);
    };

    SetWrapper.prototype.canBeShown = function () {
      return visibilitySettings.isShowNonEdgeSets() || Object.keys(this.edgeIds).length > 0;
    };

    SetWrapper.prototype.onDoubleClick = function () {
      //pathSorting.sortingManager.addOrReplace(pathSorting.sortingStrategies.getSetPresenceStrategy([this.setId]));
      //pathSorting.sortingStrategies.selectionSortingStrategy.setSetIds([this.setId]);

      pathSorting.addSelectionBasedSortingStrategy(new pathSorting.SetPresenceSortingStrategy(selectionUtil.selections["set"]["selected"]));

      listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
    };

    SetWrapper.prototype.getLabel = function () {
      return setInfo.getSetLabel(this.setId);
    };

    SetWrapper.prototype.getColor = function () {
      return config.getSetColorFromSetTypePropertyName(this.parent.type)
    };

    SetWrapper.prototype.getOverlayMenuItems = function () {

      var setNode = setInfo.get(this.setId);

      if (typeof setNode === "undefined") {
        return [];
      }

      var items = queryUtil.getFilterOverlayItems("set", this.setId);
      var linkItem = setInfo.getLinkOverlayItem(this.setId);
      if (linkItem) {
        items.push(linkItem);
      }
      return items;
    };

    SetWrapper.prototype.hasOverlayItems = function () {
      return true;
    };

    SetWrapper.prototype.getTooltip = function () {
      return this.pathIds.length + " paths contain set " + this.getLabel();
    };

    //SetWrapper.prototype.getNodeConstraintType = function () {
    //  return "set";
    //};
    //
    //SetWrapper.prototype.getFilterText = function () {
    //  return this.setId;
    //};

    function SetTypeWrapper(parentElement, type) {
      this.id = type;
      BaseHierarchyElement.call(this, parentElement);
      this.type = type;
      this.setWrapperDict = {};
      this.pathIds = [];
      //this.nodeIds = [];
      //this.edgeIds = [];
    }


    SetTypeWrapper.prototype = Object.create(BaseHierarchyElement.prototype);

    SetTypeWrapper.prototype.getBaseHeight = function () {
      return LEVEL2_HIERARCHY_ELEMENT_HEIGHT;
    };

    SetTypeWrapper.prototype.addNode = function (setId, node, path) {
      var setWrapper = this.setWrapperDict[setId.toString()];

      if (this.pathIds.indexOf(path.id) === -1) {
        this.pathIds.push(path.id);
      }

      if (typeof setWrapper === "undefined") {
        setWrapper = new SetWrapper(this, setId);
        this.setWrapperDict[setId.toString()] = setWrapper;
        this.children.push(setWrapper);
      }
      setWrapper.addNode(node, path);
    };

    SetTypeWrapper.prototype.getLabel = function () {
      return config.getSetTypeFromSetPropertyName(this.type);
    };

    SetTypeWrapper.prototype.getColor = function () {
      return config.getSetColorFromSetTypePropertyName(this.type)
    };

    SetTypeWrapper.prototype.hasOverlayItems = function () {
      return false;
    };

    SetTypeWrapper.prototype.getOverlayMenuItems = function () {
      return [];
    };

    SetTypeWrapper.prototype.isFiltered = function () {
      for (var i = 0; i < this.children.length; i++) {
        if (!this.children[i].isFiltered()) {
          return false;
        }
      }

      return true;
    };

    SetTypeWrapper.prototype.removeSet = function (setId) {
      var setWrapper = this.setWrapperDict[setId.toString()];
      if (typeof setWrapper === "undefined") {
        return;
      }
      delete this.setWrapperDict[setId.toString()];

      var index = this.children.indexOf(setWrapper);
      if (index !== -1) {
        this.children.splice(index, 1);
      }

      //var pathsToRemove = [];
      //var that = this;
      //
      //this.pathIds.forEach(function (pathId) {
      //  var removePath = true;
      //  for (var i = 0; i < that.children.length; i++) {
      //    var pathWrapper = that.children[i];
      //    if (pathWrapper.pathIds.indexOf(pathId) !== -1) {
      //      removePath = false;
      //    }
      //  }
      //
      //  if (removePath) {
      //    pathsToRemove.push(pathId);
      //  }
      //});
      //
      //pathsToRemove.forEach(function(pathId) {
      //  var index = that.pathIds.indexOf(pathId);
      //  if (index !== -1) {
      //    that.pathIds.splice(index, 1);
      //  }
      //});
    };

    SetTypeWrapper.prototype.removePath = function (path) {
      var index = this.pathIds.indexOf(path.id);
      if (index !== -1) {
        this.pathIds.splice(index, 1);
      }

      this.children.forEach(function (child) {
        child.removePath(path);
      });
    };

    SetTypeWrapper.prototype.addEdge = function (setId, edge, path) {
      var setWrapper = this.setWrapperDict[setId.toString()];

      if (this.pathIds.indexOf(path.id) === -1) {
        this.pathIds.push(path.id);
      }

      if (typeof setWrapper === "undefined") {
        setWrapper = new SetWrapper(this, setId);
        this.setWrapperDict[setId.toString()] = setWrapper;
        this.children.push(setWrapper);
      }
      setWrapper.addEdge(edge, path);
    };

    SetTypeWrapper.prototype.getTooltip = function () {
      return this.pathIds.length + " paths contain sets of type " + this.getLabel();
    };

    return {
      NodeWrapper: NodeWrapper,
      NodeTypeWrapper: NodeTypeWrapper,
      SetWrapper: SetWrapper,
      SetTypeWrapper: SetTypeWrapper,
      Level1HierarchyElement: Level1HierarchyElement
    }

  });

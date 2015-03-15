define(['../hierarchyelements', '../listeners', '../pathsorting'], function(hierarchyElements, listeners, pathSorting) {

  var HierarchyElement = hierarchyElements.HierarchyElement;

  var currentNodeWrapperId = 0;
  var currentNodeTypeWrapperId = 0;
  var currentSetWrapperId = 0;
  var currentSetTypeWrapperId = 0;

  var LEVEL1_HIERARCHY_ELEMENT_HEIGHT = 18;
  var HIERARCHY_ELEMENT_HEIGHT = 12;

  function BaseHierarchyElement(parentElement) {
    HierarchyElement.call(this, parentElement);
  }

  BaseHierarchyElement.prototype = Object.create(HierarchyElement.prototype);
  BaseHierarchyElement.prototype.getBaseHeight = function () {
    return HIERARCHY_ELEMENT_HEIGHT;
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
    this.id = currentNodeWrapperId++;
    this.node = node;
    this.pathIds = [];
  }

  NodeWrapper.prototype = Object.create(BaseHierarchyElement.prototype);

  NodeWrapper.prototype.addPath = function (path) {
    if (this.pathIds.indexOf(path.id) === -1) {
      this.pathIds.push(path.id);
    }
  };

  NodeWrapper.prototype.onDoubleClick = function () {
    pathSorting.sortingManager.addOrReplace(pathSorting.sortingStrategies.getNodePresenceStrategy([this.node.id]));
    listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
  };

  NodeWrapper.prototype.getLabel = function () {
    return this.node.properties["name"];
  };

  function NodeTypeWrapper(parentElement, type) {
    this.id = currentNodeTypeWrapperId++;
    BaseHierarchyElement.call(this, parentElement);
    this.type = type;
    this.nodeWrapperDict = {};
    this.pathIds = [];
  }

  NodeTypeWrapper.prototype = Object.create(BaseHierarchyElement.prototype);

  NodeTypeWrapper.prototype.addNode = function (node, path) {
    var nodeWrapper = this.nodeWrapperDict[node.id.toString()];

    if (this.pathIds.indexOf(path.id) === -1) {
      this.pathIds.push(path.id);
    }

    if (typeof nodeWrapper === "undefined") {
      nodeWrapper = new NodeWrapper(this, node);
      this.nodeWrapperDict[node.id.toString()] = nodeWrapper;
      this.childElements.push(nodeWrapper);
    }
    nodeWrapper.addPath(path);
  };

  function SetWrapper(parentElement, setId) {
    this.id = currentSetWrapperId++;
    BaseHierarchyElement.call(this, parentElement);
    this.setId = setId;
    this.pathIds = [];
    this.nodeIds = [];
    this.edgeIds = [];
  }

  SetWrapper.prototype = Object.create(BaseHierarchyElement.prototype);

  SetWrapper.prototype.addNode = function (node, path) {
    if (this.pathIds.indexOf(path.id) === -1) {
      this.pathIds.push(path.id);
    }

    if (this.nodeIds.indexOf(node.id) === -1) {
      this.nodeIds.push(node.id);
    }
  };

  SetWrapper.prototype.addEdge = function (edge, path) {
    if (this.pathIds.indexOf(path.id) === -1) {
      this.pathIds.push(path.id);
    }

    if (this.edgeIds.indexOf(edge.id) === -1) {
      this.edgeIds.push(edge.id);
    }
  };

  SetWrapper.prototype.onDoubleClick = function () {
    pathSorting.sortingManager.addOrReplace(pathSorting.sortingStrategies.getSetPresenceStrategy([this.setId]));
    listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
  };

  SetWrapper.prototype.getLabel = function () {
    return this.setId;
  };

  function SetTypeWrapper(parentElement, type) {
    this.id = currentSetTypeWrapperId++;
    BaseHierarchyElement.call(this, parentElement);
    this.type = type;
    this.setWrapperDict = {};
    this.pathIds = [];
    this.nodeIds = [];
    this.edgeIds = [];
  }

  SetTypeWrapper.prototype = Object.create(BaseHierarchyElement.prototype);

  SetTypeWrapper.prototype.addNode = function (setId, node, path) {
    var setWrapper = this.setWrapperDict[setId.toString()];

    if (this.pathIds.indexOf(path.id) === -1) {
      this.pathIds.push(path.id);
    }

    if (typeof setWrapper === "undefined") {
      setWrapper = new SetWrapper(this, setId);
      this.setWrapperDict[setId.toString()] = setWrapper;
      this.childElements.push(setWrapper);
    }
    setWrapper.addNode(node, path);
  };

  SetTypeWrapper.prototype.addEdge = function (setId, edge, path) {
    var setWrapper = this.setWrapperDict[setId.toString()];

    if (this.pathIds.indexOf(path.id) === -1) {
      this.pathIds.push(path.id);
    }

    if (typeof setWrapper === "undefined") {
      setWrapper = new SetWrapper(this, setId);
      this.setWrapperDict[setId.toString()] = setWrapper;
      this.childElements.push(setWrapper);
    }
    setWrapper.addEdge(edge, path);
  };

  return {
    NodeWrapper: NodeWrapper,
    NodeTypeWrapper: NodeTypeWrapper,
    SetWrapper: SetWrapper,
    SetTypeWrapper: SetTypeWrapper,
    Level1HierarchyElement: Level1HierarchyElement
  }

})

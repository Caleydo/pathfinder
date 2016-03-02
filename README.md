Pathfinder
==========
Pathfinder is a Caleydo Web plugin for the visual exploration of paths in large graphs.

## Installation
Make sure to have Caleydo web Installed (see [https://github.com/Caleydo/caleydo_web_container](https://github.com/Caleydo/caleydo_web_container)). Run the following commands in the caleydo_web_container directory within the virtual machine.

~~~bash
 ./manage.sh clone Caleydo/pathfinder
 ./manage.sh clone_deps pathfinder
 ./manage.sh resolve
~~~

To install our test graph databases, change to the folder of the pathfinder_graph plugin and run the deployment script:

~~~bash
 cd plugins/pathfinder_graph/_deploy
 ./setup_pathfinder_graph.sh setup
~~~

To run the database services, run:
~~~bash
 sudo ~/neo4j_dblp start
 sudo ~/neo4j_pathways start
~~~

## Running Pathfinder
Make sure that the web server and the graph databases are running. Then you can access Pathfinder via [http://localhost:9000/pathfinder/](http://localhost:9000/pathfinder/). You may want to use Google Chrome for best compatibility.

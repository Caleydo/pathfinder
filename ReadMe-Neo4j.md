# Configuring Neo4j

requires: up and running system including python, neo4j and a vagrant_data shared folder

use the shared config file

```
sudo rm /var/lib/neo4j/conf/neo4j-server.properties

sudo ln -s /vagrant_data/neo4j-server.properties /var/lib/neo4j/conf/neo4j-server.properties
```
will setup everything for the plugin as well as change the data storage to /vagrant_data/neo4j -> one place to store the database.


link the k-shortest paths plugin
```
sudo ln -s /vagrant_data/neo4j-k-shortest-paths-plugin-0.0.1-SNAPSHOT.jar /var/lib/neo4j/plugins/k-shortest-paths.jar
```

restart neo4j server
```
sudo service neo4j-service restart
```

access and play around using:
http://localhost:7474/browser/

e.g. `MATCH (p:_Network_Node) RETURN p LIMIT 200`

start python server as usual and play around with pathfinder:

http://127.0.0.1:9000/caleydo-pathfinder/

e.g. from: 446 to 578 get at most 20

-> incremental is prepared but not used within pathfinder. see app.js
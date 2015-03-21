Pathfinder / Kute 
==========
Kute is a Caleydo Web plugin, i.e., you need to install Caleydo Web client and server:

## Pre-conditions: 
Server-side:
 * Install [caleydo-web-server](https://github.com/Caleydo/caleydo-web-server). This will set up a virtual machine that you can run through Vagrant. For details see documentation of caleydo-web-server.
 * Install neo4j (see [instructions](ReadMe-Neo4j.md))
 * What's the process fo the deta
 
Client-side:
 * Install [caleydo-web](https://github.com/Caleydo/caleydo-web)
 * Install this repository in the claeydo-web/external folder

## Running Kute
* Go to claeydo-web-server directory and run `vagrant up`
* SSH into vagrant using `vagrant ssh`
* Go to folder `/vagrant/` (the caleydo-web-server directory)
* To update: pull in this direcotry
* Start neo4j with `sudo service neo4j-service start`
* Run `source /vagrant/run.sh`
* Go to [localhost:9000/caleydo-pathfinder/](localhost:9000/caleydo-pathfinder/)
# TICHU SERVER #

## OVERVIEW ##

Server for my favorite card game: http://en.wikipedia.org/wiki/Tichu

## INSTALL ##

- [mysql](http://dev.mysql.com/downloads/mysql/)

- [node.js](http://nodejs.org/)

- [npm](https://npmjs.org/)

- Install required node packages
```
cd tichu
npm install
```

- Install nodemon and iced globally
```
npm install -g nodemon iced-coffee-script
```

- create a mysql db called 'tichu' and give user ''@'localhost' permissions
```
mysql> CREATE DATABASE tichu;
mysql> GRANT ALL ON tichu.* TO ''@'localhost';
```

## RUN ##
```
$ cd tichu
$ ./dev.sh
$ npm start
24 Aug 17:38:21 - [nodemon] v0.7.8
24 Aug 17:38:21 - [nodemon] to restart at any time, enter `rs`
24 Aug 17:38:21 - [nodemon] watching: /Users/joyzhang/Desktop/joy/git/tichu
24 Aug 17:38:21 - [nodemon] starting `iced /Users/joyzhang/Desktop/joy/git/tichu/scripts/../server/index.iced`
new TichuPlayer
new TichuPlayer
new TichuPlayer
new TichuPlayer
Server has started.
```

Visit http://localhost:8888 or http://localhost:8888/quadcopter.html

Eventually these steps will be reflected in scripts/setup_dev

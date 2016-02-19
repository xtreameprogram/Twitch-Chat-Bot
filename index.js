var irc = require("irc");
var winston = require("winston");
var fs = require("fs");
var readline = require("readline");
var request = require("request");
var express = require("express");
var bodyParser = require('body-parser');
var path = require('path');
//Template
/******************************
 ******************************/

/******************************

This part replaces the files file with default values in case of error.

******************************/

fs.readFile('config.json', "utf-8", function(err, data) {
  if (err) {
    fs.writeFile('config.json', '{}', function(err) {
      if (err) return console.log(err);
    });
  }
  if (!data) {
    fs.writeFile('config.json', '{}', function(err) {
      if (err) return console.log(err);
    });
  }
});

//*****

fs.readFile('mod.json', "utf-8", function(err, data) {
  if (err) {
    fs.writeFile('mod.json', '{}', function(err) {
      if (err) return console.log(err);
    });
  }
  if (!data) {
    fs.writeFile('mod.json', '{}', function(err) {
      if (err) return console.log(err);
    });
  }
});

//******

fs.readFile('.foreverignore', "utf-8", function(err, data) {
  if (err) {
    fs.writeFile('.foreverignore', '!bot.json', function(err) {
      if (err) return console.log(err);
    });
  }
  if (!data) {
    fs.writeFile('.foreverignore', '!bot.json', function(err) {
      if (err) return console.log(err);
    });
  }
});

// *******

fs.readFile('bot.json', "utf-8", function(err, data) {

  if (err) {
    fs.writeFile('bot.json', '{"channels": ["CHANNELS TO MONITOR: AND ARRAY"],"bot": {"username": "username","password": "OAUTH VERIFICATION KEY"}}', function(err) {
      if (err) return console.log(err);
    });
    console.log('Restart script after filing in required data in bot.json');
    process.exit(0);
  }
  if (!data) {
    fs.writeFile('bot.json', '{"channels": ["CHANNELS TO MONITOR: AND ARRAY"],"bot": {"username": "username","password": "OAUTH VERIFICATION KEY"}}', function(err) {
      if (err) return console.log(err);
    });
  }
});

/******************************

Define config files that are needed

 ******************************/

setTimeout(function() {
  var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
  var botConf = JSON.parse(fs.readFileSync('bot.json', 'utf8'));


  /******************************

  This part is going to intialize all settings and loggers the bot is going to use.

  ******************************/

  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  var settings = {
    channels: botConf.channels,
    server: "irc.twitch.tv",
    username: botConf.bot.username,
    nick: botConf.bot.username,
    password: botConf.bot.password,
    sasl: true,
  };

  var logger = new(winston.Logger)({
    transports: [
      new(winston.transports.Console)({
        colorize: true,
        level: 'debug'
      }),
      new(winston.transports.File)({
        level: 'info',
        timestamp: true,
        filename: 'twitchChat.log',
        json: false
      })
    ]
  });

  //Part below intializes main bot. mbot is used but now deprecated (Don't bother with it, used to be used for reload function: Deprecated)

  var mbot = new irc.Client(settings.server, settings.nick, {
    channels: [settings.channels + " " + settings.password],
    debug: true,
    password: settings.password,
    username: settings.nick
  });


  /******************************

  This Part handles all the express (webserver) functionality.

  ******************************/

  var app = express();
  app.use(bodyParser.json()); // support json encoded bodies
  app.use(bodyParser.urlencoded({
    extended: true
  }));

    app.use(express.static(path.join(__dirname, 'public')));


  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });


  app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
  // app.post('/', function(req, res) {
  //   reloadConfig();
  //   res.status(04).send("Hi!");
  //   // console.log('test');
  //   var command = req.body.command;
  //   var channels = botConf.channels;
  //   res.send('Recieved! Determining action now.');
  //
  //   if (command == 'reload') {
  //     reloadConfig();
  //   } else if (command == 'add') {
  //     channels.push(req.body.person);
  //     botConf.channels = channels;
  //     // console.log(config.channels);
  //     fs.writeFile('bot.json', JSON.stringify(botConf), function(err) {
  //       if (err) return console.log(err);
  //     });
  //     reloadConfig();
  //   } else if (command == 'remove') {
  //     var bb = Array.prototype.slice.call(channels);
  //     var index = bb.indexOf(req.body.person);
  //     bb.splice(index, 1);
  //     // res.send(channels);
  //
  //     // console.log(bb);
  //     // console.log(Array.isArray(config.channels));
  //     botConf.channels = bb;
  //     fs.writeFile('bot.json', JSON.stringify(bb), function(err) {
  //       if (err) return console.log(err);
  //     });
  //
  //     reloadConfig();
  //   }
  // });


  /******************************

  This returns the user passed with the '#' removed

  ******************************/

  function getUser(channel) {
    var channelSplit = channel.split('');
    if (channelSplit[0] == '#') {
      var channelAlt = '';
      for (var i = 1; i < channelSplit.length; i++) {
        channelAlt += channelSplit[i];
      }
      return channelAlt;
    } else {
      return channel;
    }
  }

  /******************************

  Sends a request to a link depending on the channel and then sets the mod file. The checkMod function looks at the
  file and returns true or false depending whether the person specified is in the mod.json file.

  ******************************/

  function getMods(chanel) {
    var channel = getUser(chanel);
    try {
      var modsFile = JSON.parse(fs.readFileSync('mod.json', 'utf8'));
    } catch (err) {
      var def = "{}";
      fs.writeFile('mod.json', JSON.stringify(def), function(err) {
        if (err) return console.log(err);
      });
    }

    request('http://tmi.twitch.tv/group/user/' + channel + '/chatters', function(error, response, body) {
      if (!error && response.statusCode == 200) {
        if (!(modsFile[channel])) {
          modsFile[channel] = {
            "mods": []
          };
        }

        // This is probably over complicated way to remove duplicates from a merged array. Then writes the file

        var moderatorsJSON = JSON.parse(body);
        var currentMods = moderatorsJSON.chatters.moderators;
        var moderatorsListFromFile = modsFile[channel].mods;
        var moderatorsComplete = moderatorsListFromFile.concat(currentMods);
        moderatorsComplete.sort();

        for (var i = 0; i < moderatorsComplete.length; i++) {
          if (moderatorsComplete[i] === moderatorsComplete[i - 1] || moderatorsComplete[i] === moderatorsComplete[i + 1]) {
            var index = moderatorsComplete.indexOf(moderatorsComplete[i]);
            moderatorsComplete.splice(index, 1);
          }
        }

        modsFile[channel].mods = moderatorsComplete;

        fs.writeFile('mod.json', JSON.stringify(modsFile), function(err) {
          if (err) return console.log(err);
        });

      }
    });


  }


  function checkMod(person, chanel) {
    var channel = getUser(chanel);
    var modsFile = JSON.parse(fs.readFileSync('mod.json', 'utf8'));
    if (!modsFile[channel]) {
      modsFile[channel] = {
        "mods": []
      };
    }
    var modsList = modsFile[channel].mods;
    for (var i = 0; i < modsList.length; i++) {
      if (person == modsList[i]) {
        return true;
      }
    }
    return false;
  }



  // Listen for joins
  // bot.addListener("join", function(channel, who) {
  //     // Welcome them in!
  //     global.channel = channel;
  //     bot.say(channel, "Hello! I am a ChatBot designed for Twitch. I have many functionalities and type !help to begin. However, I may not be able to do a couple things without being mod.");
  // });




  /******************************

  This function takes a funfact from an API (not mine) and returns it in chat

  ******************************/

  function funfact(channel, bot) {
    // console.log("fact");
    var trivia = ['math', 'trivia', 'date', 'year'];
    var rand = getRandomInt(0, trivia.length - 1);
    var numb = trivia[rand];

    request('http://numbersapi.com/random/' + numb, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        bot.say(channel, body);
      }
    });
  }

  /******************************

  Connects to API(not mine) and determins how long a user has been following then returns it in chat.
  User is the user specified

  ******************************/

  function followage(user, channel, bot) {
    request('https://api.rtainc.co/twitch/followers/length?channel=' + getUser(channel) + '&name=' + user, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        bot.say(channel, user + ' has been following ' + getUser(channel) + ' for ' + body);
      }
    });
  }

  /******************************

  Returns a random number between two numbers.

  ******************************/

  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /******************************

  This funciton (if has customapi in it) will return the value of the response. Basically customapi handlers

  ******************************/

  function customapi(bot, to, apiLink, stringToSay) {
    request(apiLink, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        stringToSay = stringToSay.replace(/(\%customapi\s[\S]+\%)/, body);
        if (body.length < 400) {
          bot.say(to, stringToSay);
        } else {
          bot.say("Sorry, the link returns WAY too much data.");
        }
      }
    });
  }

  /******************************

  The main function, listens and logs chat, calls functions, and 90% of functionality comes from THIS function.
  Does the custom commands and calls the shots

  ******************************/

  function message(bot) {
    bot.addListener("message", function(from, to, text) {
      config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
      // console.log(settings.channels);
      getMods(to);
      var isMod = checkMod(from, to);

      var textSplitOrig = text.split(' ');
      var command = textSplitOrig[1];
      var textSplit = [];

      for (i = 0; i < textSplitOrig.length; i++) {
        textSplit.push(textSplitOrig[i].toLowerCase());
      }

      // var isVariables = (text.search(/\%([a-zA-Z]+)\%/) > -1) ? true : false; Unecessary

      // console.log(config.xtreameprogram2["!test"]);
      var messToSet = '';
      for (var i = 2; i < textSplit.length; i++) {
        messToSet += " " + textSplit[i];
      }

      logger.info('[From: ' + from + ', Channel: ' + to + '] Message: ' + text);
      if (textSplit[0] == '!add') {
        // console.log(global.isMod);
        if (isMod) {
          setTimeout(function() {
            if (!(config[to])) {
              config[to] = {
                "commands": {}
              };
              config[to].commands[textSplit[1]] = {
                response: messToSet,
                lvl: "user"
              };
              setTimeout(function() {
                return;
              }, 5000);
            }
            //  console.log(Object.keys(config.xtreameprogram2));
            else {
              config[to].commands[textSplit[1]] = {
                response: messToSet,
                lvl: "user"
              };
            }
            var commandSplit = command.split('');
            var lvl = command.split('=')[1];
            if (commandSplit[0] == '-' && commandSplit[1] == 'u' && commandSplit[2] == 'l' && commandSplit[3] == '=') {
              // console.log(lvl);
              delete config[to].commands[textSplit[1]];

              messToSet = '';
              for (var i = 3; i < textSplit.length; i++) {
                messToSet += " " + textSplit[i];
              }

              config[to].commands[textSplit[2]] = {
                response: messToSet,
                lvl: lvl
              };
              if (lvl != 'user' && lvl != 'mod' && lvl != 'owner') {
                bot.say(to, from + ': Error, invalid synax');
                delete config[to].commands[textSplit[2]];
              }
            }
            bot.say(to, from + ": Command will be added if no errors");
            fs.writeFile('config.json', JSON.stringify(config), function(err) {
              if (err) return console.log(err);
            });
            setTimeout(function() {
              return;
            }, 5000);
          }, 500);

        }
      } else if (textSplit[0] == '!del') {
        if (isMod) {
          setTimeout(function() {
            if (!(config[to].commands[textSplit[1]])) {
              bot.say(to, from + ": Command does not exist");
            } else {
              delete config[to].commands[textSplit[1]];
              bot.say(to, from + ": Command deleted");
            }

            fs.writeFile('config.json', JSON.stringify(config), function(err) {
              if (err) return console.log(err);
            });
            setTimeout(function() {
              return;
            }, 5000);
          }, 500);
        }
      } else if (textSplit[0] == '!fact') {
        setTimeout(function() {
          funfact(to, bot);
          setTimeout(function() {
            return;
          }, 5000);
        }, 500);
      } else if (textSplit[0] == '!list') {
        var commands = Object.keys(config[to].commands);
        var message = 'The commands are: ' + commands;

        bot.say(to, message);
      } else if (textSplit[0] == '!howlong') {
        if (!command) {
          followage(from, to, bot);
        } else {
          followage(command, to, bot);
        }
      } else {
        if (config[to]) {
          setTimeout(function() {
            var string = '';
            var commands = Object.keys(config[to].commands);
            for (var r = 0; r < commands.length; r++) {
              if (commands[r] == textSplit[0]) {
                // This part may seem confusing but it is using regex to replace certain keywords to make a command more dynamic
                if (config[to].commands[commands[r]].lvl == 'user') {
                  config[to].commands[commands[r]].response = config[to].commands[commands[r]].response.replace(/\%touser\%/, command);
                  config[to].commands[commands[r]].response = config[to].commands[commands[r]].response.replace(/\%user\%/, from);
                  if (config[to].commands[commands[r]].response.search(/\%\$([0-9]{1,2})\%/) > -1) {
                    config[to].commands[commands[r]].response = config[to].commands[commands[r]].response.replace(/(\%\$[0-9]{1,2}\%)/, textSplitOrig[/\%\$([0-9]{1,2})\%/.exec(config[to].commands[commands[r]].response)[1]]);
                  }

                  if (config[to].commands[commands[r]].response.search(/\%customapi\s([\S]+)\%/) > -1) {
                    customapi(bot, to, /\%customapi\s([\S]+)\%/.exec(config[to].commands[commands[r]].response)[1], config[to].commands[commands[r]].response);
                  } else {
                    bot.say(to, config[to].commands[commands[r]].response);
                  }
                  break;
                } else if (config[to].commands[commands[r]].lvl == 'mod') {
                  if (isMod === true) {
                    config[to].commands[commands[r]].response = config[to].commands[commands[r]].response.replace(/\%touser\%/, command);
                    config[to].commands[commands[r]].response = config[to].commands[commands[r]].response.replace(/\%user\%/, from);
                    if (config[to].commands[commands[r]].response.search(/\%\$([0-9]{1,2})\%/) > -1) { // This part checks to see if it asks for a variable and if it does return it, the other methods used do NOT work
                      config[to].commands[commands[r]].response = config[to].commands[commands[r]].response.replace(/(\%\$[0-9]{1,2}\%)/, textSplitOrig[/\%\$([0-9]{1,2})\%/.exec(config[to].commands[commands[r]].response)[1]]);
                    }
                    bot.say(to, config[to].commands[commands[r]].response);
                    break;
                  }
                } else if (config[to].commands[commands[r]].lvl == 'owner') {
                  if (getUser(to) == from) {
                    config[to].commands[commands[r]].response = config[to].commands[commands[r]].response.replace(/\%touser\%/, command);
                    config[to].commands[commands[r]].response = config[to].commands[commands[r]].response.replace(/\%user\%/, from);
                    if (config[to].commands[commands[r]].response.search(/\%\$([0-9]{1,2})\%/) > -1) {
                      config[to].commands[commands[r]].response = config[to].commands[commands[r]].response.replace(/(\%\$[0-9]{1,2}\%)/, textSplitOrig[/\%\$([0-9]{1,2})\%/.exec(config[to].commands[commands[r]].response)[1]]);
                    }
                    bot.say(to, config[to].commands[commands[r]].response);
                    break;
                  }
                }
              }
            }
            setTimeout(function() {
              return;
            }, 5000);
          }, 500);
        }
      }
    });
  }
  message(mbot);


  // Work on custom API here
  // Maybe make it a function


  /******************************

  On quit, this should quit server so it does not keeping socket running

  ******************************/

//   process.stdin.resume(); //so the program will not close instantly
//
//   function exitHandler(options, err) {
//     if (options.cleanup) console.log('clean');
//     if (err) console.log(err.stack);
//     if (options.exit) process.exit();
//     server.close();
//   }
//
//   //do something when app is closing
//   process.on('exit', exitHandler.bind(null, {
//     cleanup: true
//   }));
//
//   //catches ctrl+c event
//   process.on('SIGINT', exitHandler.bind(null, {
//     exit: true
//   }));
//
//   //catches uncaught exceptions
//   process.on('uncaughtException', exitHandler.bind(null, {
//     exit: true
//   }));
//
//   server.close();
//
}, 1000);

/******************************

End

******************************/

//Deprecated:
// function reloadConfig() {
//   bot = null;
//   try {
//     mods = JSON.parse(fs.readFileSync('mod.json', 'utf8'));
//     config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
//   } catch (err) {
//     console.log(err);
//   }
//    settings = {
//     channels: botConf.channels,
//     server: "irc.twitch.tv",
//     username: botConf.bot.username,
//     nick: botConf.bot.username,
//     password: botConf.bot.password,
//     sasl: true,
//     orange: 'asd'
//   };
//
//    rbot = new irc.Client(settings.server, settings.nick, {
//     channels: [settings.channels + " " + settings.password],
//     debug: true,
//     password: settings.password,
//     username: settings.nick
//   });
// message(rbot);
// }

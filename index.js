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


//********


fs.readFile('chatModConf.json', "utf-8", function(err, data) {

  if (err) {
    fs.writeFile('chatModConf.json', '{}', function(err) {
      if (err) return console.log(err);
    });
    console.log('Restart script after filing in required data in bot.json');
    process.exit(0);
  }
  if (!data) {
    fs.writeFile('chatModConf.json', '{}', function(err) {
      if (err) return console.log(err);
    });
  }
});

//********

//Going to add more functionality here(Add webserver files here)

/******************************

Define config files that are needed

 ******************************/

setTimeout(function() {
  var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
  var botConf = JSON.parse(fs.readFileSync('bot.json', 'utf8'));
  var chatModConf = JSON.parse(fs.readFileSync('chatModConf.json', 'utf8'));

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


  app.get('/', function(req, res) {
    res.send(200);
  });

  var port = 3001;
  app.listen(port, function() {
    console.log('Webserver running on port ' + port + '!');
  });

  app.post('/', function(req, res) {

    var command = req.body.command;
    var person;
    var add = '';
    // console.log(command);
    if (command === 'reload') {
      add = 'Reloading';
      res.status(200).send('Recieved Command. Determining now.\n' + add);
      process.exit(0);
    } else if (command === 'add') {
      person = req.body.person;
      add = 'Adding ' + person;
      botConf.channels.push('#' + getUser(person));

      fs.writeFile('bot.json', JSON.stringify(botConf), function(err) {
        if (err) return console.log(err);
      });

      res.status(200).send('Recieved Command. Determining now.\n' + add);
      setTimeout(function() {
        process.exit(0);
      }, 2000);
    } else if (command === 'remove') {
      person = req.body.person;

      botConf.channels.splice(botConf.channels.indexOf('#' + getUser(person)), 1);
      add = 'Removeing ' + person;
      fs.writeFile('bot.json', JSON.stringify(botConf), function(err) {
        if (err) return console.log(err);
      });
      res.status(200).send('Recieved Command. Determining now.\n' + add);
      setTimeout(function() {
        process.exit(0);
      }, 2000);
    }

  });


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

This function is going to check for banned words etc.

  ******************************/

  function filter(bot, from, to, text) {
    text += '';
    var textUpper = text.toUpperCase();
    fs.readFile("chatModConf.json", "utf8", function(err, data) {
      chatModConf = JSON.parse(data);
      if (chatModConf.blockPhrases) {
      try {
        for (var i = 0; i < chatModConf.bannedPhrases.length; i++) {
          if (chatModConf.timeoutTime === undefined) {
            chatModConf.timeoutTime = 300;
          }
          if (text.toLowerCase().search(chatModConf.bannedPhrases[i]) > -1) {
            bot.say(to, "/timeout " + from + " " + chatModConf.timeoutTime);
          }
        }
      } catch (error) {
        console.log(error);
      }
    } if (chatModConf.banLinks) {
      var re = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])|((.AAA|\.AARP|\.ABB|\.ABBOTT|\.ABOGADO|\.AC|\.ACADEMY|\.ACCENTURE|\.ACCOUNTANT|\.ACCOUNTANTS|\.ACO|\.ACTIVE|\.ACTOR|\.AD|\.ADAC|\.ADS|\.ADULT|\.AE|\.AEG|\.AERO|\.AF|\.AFL|\.AG|\.AGENCY|\.AI|\.AIG|\.AIRFORCE|\.AIRTEL|\.AL|\.ALIBABA|\.ALIPAY|\.ALLFINANZ|\.ALSACE|\.AM|\.AMICA|\.AMSTERDAM|\.ANALYTICS|\.ANDROID|\.AO|\.APARTMENTS|\.APP|\.APPLE|\.AQ|\.AQUARELLE|\.AR|\.ARAMCO|\.ARCHI|\.ARMY|\.ARPA|\.ARTE|\.AS|\.ASIA|\.ASSOCIATES|\.AT|\.ATTORNEY|\.AU|\.AUCTION|\.AUDI|\.AUDIO|\.AUTHOR|\.AUTO|\.AUTOS|\.AW|\.AX|\.AXA|\.AZ|\.AZURE|\.BA|\.BAIDU|\.BAND|\.BANK|\.BAR|\.BARCELONA|\.BARCLAYCARD|\.BARCLAYS|\.BARGAINS|\.BAUHAUS|\.BAYERN|\.BB|\.BBC|\.BBVA|\.BCN|\.BD|\.BE|\.BEATS|\.BEER|\.BENTLEY|\.BERLIN|\.BEST|\.BET|\.BF|\.BG|\.BH|\.BHARTI|\.BI|\.BIBLE|\.BID|\.BIKE|\.BING|\.BINGO|\.BIO|\.BIZ|\.BJ|\.BLACK|\.BLACKFRIDAY|\.BLOOMBERG|\.BLUE|\.BM|\.BMS|\.BMW|\.BN|\.BNL|\.BNPPARIBAS|\.BO|\.BOATS|\.BOEHRINGER|\.BOM|\.BOND|\.BOO|\.BOOK|\.BOOTS|\.BOSCH|\.BOSTIK|\.BOT|\.BOUTIQUE|\.BR|\.BRADESCO|\.BRIDGESTONE|\.BROADWAY|\.BROKER|\.BROTHER|\.BRUSSELS|\.BS|\.BT|\.BUDAPEST|\.BUGATTI|\.BUILD|\.BUILDERS|\.BUSINESS|\.BUY|\.BUZZ|\.BV|\.BW|\.BY|\.BZ|\.BZH|\.CA|\.CAB|\.CAFE|\.CAL|\.CALL|\.CAMERA|\.CAMP|\.CANCERRESEARCH|\.CANON|\.CAPETOWN|\.CAPITAL|\.CAR|\.CARAVAN|\.CARDS|\.CARE|\.CAREER|\.CAREERS|\.CARS|\.CARTIER|\.CASA|\.CASH|\.CASINO|\.CAT|\.CATERING|\.CBA|\.CBN|\.CC|\.CD|\.CEB|\.CENTER|\.CEO|\.CERN|\.CF|\.CFA|\.CFD|\.CG|\.CH|\.CHANEL|\.CHANNEL|\.CHAT|\.CHEAP|\.CHLOE|\.CHRISTMAS|\.CHROME|\.CHURCH|\.CI|\.CIPRIANI|\.CIRCLE|\.CISCO|\.CITIC|\.CITY|\.CITYEATS|\.CK|\.CL|\.CLAIMS|\.CLEANING|\.CLICK|\.CLINIC|\.CLINIQUE|\.CLOTHING|\.CLOUD|\.CLUB|\.CLUBMED|\.CM|\.CN|\.CO|\.COACH|\.CODES|\.COFFEE|\.COLLEGE|\.COLOGNE|\.COM|\.COMMBANK|\.COMMUNITY|\.COMPANY|\.COMPARE|\.COMPUTER|\.COMSEC|\.CONDOS|\.CONSTRUCTION|\.CONSULTING|\.CONTACT|\.CONTRACTORS|\.COOKING|\.COOL|\.COOP|\.CORSICA|\.COUNTRY|\.COUPON|\.COUPONS|\.COURSES|\.CR|\.CREDIT|\.CREDITCARD|\.CREDITUNION|\.CRICKET|\.CROWN|\.CRS|\.CRUISES|\.CSC|\.CU|\.CUISINELLA|\.CV|\.CW|\.CX|\.CY|\.CYMRU|\.CYOU|\.CZ|\.DABUR|\.DAD|\.DANCE|\.DATE|\.DATING|\.DATSUN|\.DAY|\.DCLK|\.DE|\.DEALER|\.DEALS|\.DEGREE|\.DELIVERY|\.DELL|\.DELOITTE|\.DELTA|\.DEMOCRAT|\.DENTAL|\.DENTIST|\.DESI|\.DESIGN|\.DEV|\.DIAMONDS|\.DIET|\.DIGITAL|\.DIRECT|\.DIRECTORY|\.DISCOUNT|\.DJ|\.DK|\.DM|\.DNP|\.DO|\.DOCS|\.DOG|\.DOHA|\.DOMAINS|\.DOWNLOAD|\.DRIVE|\.DUBAI|\.DURBAN|\.DVAG|\.DZ|\.EARTH|\.EAT|\.EC|\.EDEKA|\.EDU|\.EDUCATION|\.EE|\.EG|\.EMAIL|\.EMERCK|\.ENERGY|\.ENGINEER|\.ENGINEERING|\.ENTERPRISES|\.EPSON|\.EQUIPMENT|\.ER|\.ERNI|\.ES|\.ESQ|\.ESTATE|\.ET|\.EU|\.EUROVISION|\.EUS|\.EVENTS|\.EVERBANK|\.EXCHANGE|\.EXPERT|\.EXPOSED|\.EXPRESS|\.FAGE|\.FAIL|\.FAIRWINDS|\.FAITH|\.FAMILY|\.FAN|\.FANS|\.FARM|\.FASHION|\.FAST|\.FEEDBACK|\.FERRERO|\.FI|\.FILM|\.FINAL|\.FINANCE|\.FINANCIAL|\.FIRESTONE|\.FIRMDALE|\.FISH|\.FISHING|\.FIT|\.FITNESS|\.FJ|\.FK|\.FLICKR|\.FLIGHTS|\.FLORIST|\.FLOWERS|\.FLSMIDTH|\.FLY|\.FM|\.FO|\.FOO|\.FOOTBALL|\.FORD|\.FOREX|\.FORSALE|\.FORUM|\.FOUNDATION|\.FOX|\.FR|\.FRESENIUS|\.FRL|\.FROGANS|\.FRONTIER|\.FUND|\.FURNITURE|\.FUTBOL|\.FYI|\.GA|\.GAL|\.GALLERY|\.GALLUP|\.GAME|\.GARDEN|\.GB|\.GBIZ|\.GD|\.GDN|\.GE|\.GEA|\.GENT|\.GENTING|\.GF|\.GG|\.GGEE|\.GH|\.GI|\.GIFT|\.GIFTS|\.GIVES|\.GIVING|\.GL|\.GLASS|\.GLE|\.GLOBAL|\.GLOBO|\.GM|\.GMAIL|\.GMO|\.GMX|\.GN|\.GOLD|\.GOLDPOINT|\.GOLF|\.GOO|\.GOOG|\.GOOGLE|\.GOP|\.GOT|\.GOV|\.GP|\.GQ|\.GR|\.GRAINGER|\.GRAPHICS|\.GRATIS|\.GREEN|\.GRIPE|\.GROUP|\.GS|\.GT|\.GU|\.GUCCI|\.GUGE|\.GUIDE|\.GUITARS|\.GURU|\.GW|\.GY|\.HAMBURG|\.HANGOUT|\.HAUS|\.HDFCBANK|\.HEALTH|\.HEALTHCARE|\.HELP|\.HELSINKI|\.HERE|\.HERMES|\.HIPHOP|\.HITACHI|\.HIV|\.HK|\.HM|\.HN|\.HOCKEY|\.HOLDINGS|\.HOLIDAY|\.HOMEDEPOT|\.HOMES|\.HONDA|\.HORSE|\.HOST|\.HOSTING|\.HOTELES|\.HOTMAIL|\.HOUSE|\.HOW|\.HR|\.HSBC|\.HT|\.HU|\.HYUNDAI|\.IBM|\.ICBC|\.ICE|\.ICU|\.ID|\.IE|\.IFM|\.IINET|\.IL|\.IM|\.IMMO|\.IMMOBILIEN|\.IN|\.INDUSTRIES|\.INFINITI|\.INFO|\.ING|\.INK|\.INSTITUTE|\.INSURANCE|\.INSURE|\.INT|\.INTERNATIONAL|\.INVESTMENTS|\.IO|\.IPIRANGA|\.IQ|\.IR|\.IRISH|\.IS|\.ISELECT|\.IST|\.ISTANBUL|\.IT|\.ITAU|\.IWC|\.JAGUAR|\.JAVA|\.JCB|\.JE|\.JETZT|\.JEWELRY|\.JLC|\.JLL|\.JM|\.JMP|\.JO|\.JOBS|\.JOBURG|\.JOT|\.JOY|\.JP|\.JPRS|\.JUEGOS|\.KAUFEN|\.KDDI|\.KE|\.KFH|\.KG|\.KH|\.KI|\.KIA|\.KIM|\.KINDER|\.KITCHEN|\.KIWI|\.KM|\.KN|\.KOELN|\.KOMATSU|\.KP|\.KPN|\.KR|\.KRD|\.KRED|\.KW|\.KY|\.KYOTO|\.KZ|\.LA|\.LACAIXA|\.LAMBORGHINI|\.LAMER|\.LANCASTER|\.LAND|\.LANDROVER|\.LANXESS|\.LASALLE|\.LAT|\.LATROBE|\.LAW|\.LAWYER|\.LB|\.LC|\.LDS|\.LEASE|\.LECLERC|\.LEGAL|\.LEXUS|\.LGBT|\.LI|\.LIAISON|\.LIDL|\.LIFE|\.LIFEINSURANCE|\.LIFESTYLE|\.LIGHTING|\.LIKE|\.LIMITED|\.LIMO|\.LINCOLN|\.LINDE|\.LINK|\.LIVE|\.LIVING|\.LIXIL|\.LK|\.LOAN|\.LOANS|\.LOL|\.LONDON|\.LOTTE|\.LOTTO|\.LOVE|\.LR|\.LS|\.LT|\.LTD|\.LTDA|\.LU|\.LUPIN|\.LUXE|\.LUXURY|\.LV|\.LY|\.MA|\.MADRID|\.MAIF|\.MAISON|\.MAKEUP|\.MAN|\.MANAGEMENT|\.MANGO|\.MARKET|\.MARKETING|\.MARKETS|\.MARRIOTT|\.MBA|\.MC|\.MD|\.ME|\.MED|\.MEDIA|\.MEET|\.MELBOURNE|\.MEME|\.MEMORIAL|\.MEN|\.MENU|\.MEO|\.MG|\.MH|\.MIAMI|\.MICROSOFT|\.MIL|\.MINI|\.MK|\.ML|\.MM|\.MMA|\.MN|\.MO|\.MOBI|\.MOBILY|\.MODA|\.MOE|\.MOI|\.MOM|\.MONASH|\.MONEY|\.MONTBLANC|\.MORMON|\.MORTGAGE|\.MOSCOW|\.MOTORCYCLES|\.MOV|\.MOVIE|\.MOVISTAR|\.MP|\.MQ|\.MR|\.MS|\.MT|\.MTN|\.MTPC|\.MTR|\.MU|\.MUSEUM|\.MUTUELLE|\.MV|\.MW|\.MX|\.MY|\.MZ|\.NA|\.NADEX|\.NAGOYA|\.NAME|\.NATURA|\.NAVY|\.NC|\.NE|\.NEC|\.NET|\.NETBANK|\.NETWORK|\.NEUSTAR|\.NEW|\.NEWS|\.NEXUS|\.NF|\.NG|\.NGO|\.NHK|\.NI|\.NICO|\.NIKON|\.NINJA|\.NISSAN|\.NL|\.NO|\.NOKIA|\.NORTON|\.NOWRUZ|\.NP|\.NR|\.NRA|\.NRW|\.NTT|\.NU|\.NYC|\.NZ|\.OBI|\.OFFICE|\.OKINAWA|\.OM|\.OMEGA|\.ONE|\.ONG|\.ONL|\.ONLINE|\.OOO|\.ORACLE|\.ORANGE|\.ORG|\.ORGANIC|\.ORIGINS|\.OSAKA|\.OTSUKA|\.OVH|\.PA|\.PAGE|\.PAMPEREDCHEF|\.PANERAI|\.PARIS|\.PARS|\.PARTNERS|\.PARTS|\.PARTY|\.PE|\.PET|\.PF|\.PG|\.PH|\.PHARMACY|\.PHILIPS|\.PHOTO|\.PHOTOGRAPHY|\.PHOTOS|\.PHYSIO|\.PIAGET|\.PICS|\.PICTET|\.PICTURES|\.PID|\.PIN|\.PING|\.PINK|\.PIZZA|\.PK|\.PL|\.PLACE|\.PLAY|\.PLAYSTATION|\.PLUMBING|\.PLUS|\.PM|\.PN|\.POHL|\.POKER|\.PORN|\.POST|\.PR|\.PRAXI|\.PRESS|\.PRO|\.PROD|\.PRODUCTIONS|\.PROF|\.PROMO|\.PROPERTIES|\.PROPERTY|\.PROTECTION|\.PS|\.PT|\.PUB|\.PW|\.PWC|\.PY|\.QA|\.QPON|\.QUEBEC|\.QUEST|\.RACING|\.RE|\.READ|\.REALTOR|\.REALTY|\.RECIPES|\.RED|\.REDSTONE|\.REDUMBRELLA|\.REHAB|\.REISE|\.REISEN|\.REIT|\.REN|\.RENT|\.RENTALS|\.REPAIR|\.REPORT|\.REPUBLICAN|\.REST|\.RESTAURANT|\.REVIEW|\.REVIEWS|\.REXROTH|\.RICH|\.RICOH|\.RIO|\.RIP|\.RO|\.ROCHER|\.ROCKS|\.RODEO|\.ROOM|\.RS|\.RSVP|\.RU|\.RUHR|\.RUN|\.RW|\.RWE|\.RYUKYU|\.SA|\.SAARLAND|\.SAFE|\.SAFETY|\.SAKURA|\.SALE|\.SALON|\.SAMSUNG|\.SANDVIK|\.SANDVIKCOROMANT|\.SANOFI|\.SAP|\.SAPO|\.SARL|\.SAS|\.SAXO|\.SB|\.SBS|\.SC|\.SCA|\.SCB|\.SCHAEFFLER|\.SCHMIDT|\.SCHOLARSHIPS|\.SCHOOL|\.SCHULE|\.SCHWARZ|\.SCIENCE|\.SCOR|\.SCOT|\.SD|\.SE|\.SEAT|\.SECURITY|\.SEEK|\.SELECT|\.SENER|\.SERVICES|\.SEVEN|\.SEW|\.SEX|\.SEXY|\.SFR|\.SG|\.SH|\.SHARP|\.SHELL|\.SHIA|\.SHIKSHA|\.SHOES|\.SHOW|\.SHRIRAM|\.SI|\.SINGLES|\.SITE|\.SJ|\.SK|\.SKI|\.SKIN|\.SKY|\.SKYPE|\.SL|\.SM|\.SMILE|\.SN|\.SNCF|\.SO|\.SOCCER|\.SOCIAL|\.SOFTBANK|\.SOFTWARE|\.SOHU|\.SOLAR|\.SOLUTIONS|\.SONG|\.SONY|\.SOY|\.SPACE|\.SPIEGEL|\.SPOT|\.SPREADBETTING|\.SR|\.SRL|\.ST|\.STADA|\.STAR|\.STARHUB|\.STATEFARM|\.STATOIL|\.STC|\.STCGROUP|\.STOCKHOLM|\.STORAGE|\.STORE|\.STUDIO|\.STUDY|\.STYLE|\.SU|\.SUCKS|\.SUPPLIES|\.SUPPLY|\.SUPPORT|\.SURF|\.SURGERY|\.SUZUKI|\.SV|\.SWATCH|\.SWISS|\.SX|\.SY|\.SYDNEY|\.SYMANTEC|\.SYSTEMS|\.SZ|\.TAB|\.TAIPEI|\.TAOBAO|\.TATAMOTORS|\.TATAR|\.TATTOO|\.TAX|\.TAXI|\.TC|\.TCI|\.TD|\.TEAM|\.TECH|\.TECHNOLOGY|\.TEL|\.TELECITY|\.TELEFONICA|\.TEMASEK|\.TENNIS|\.TF|\.TG|\.TH|\.THD|\.THEATER|\.THEATRE|\.TICKETS|\.TIENDA|\.TIFFANY|\.TIPS|\.TIRES|\.TIROL|\.TJ|\.TK|\.TL|\.TM|\.TMALL|\.TN|\.TO|\.TODAY|\.TOKYO|\.TOOLS|\.TOP|\.TORAY|\.TOSHIBA|\.TOURS|\.TOWN|\.TOYOTA|\.TOYS|\.TR|\.TRADE|\.TRADING|\.TRAINING|\.TRAVEL|\.TRAVELERS|\.TRAVELERSINSURANCE|\.TRUST|\.TRV|\.TT|\.TUBE|\.TUI|\.TUNES|\.TUSHU|\.TV|\.TVS|\.TW|\.TZ|\.UA|\.UBS|\.UG|\.UK|\.UNICOM|\.UNIVERSITY|\.UNO|\.UOL|\.US|\.UY|\.UZ|\.VA|\.VACATIONS|\.VANA|\.VC|\.VE|\.VEGAS|\.VENTURES|\.VERISIGN|\.VERSICHERUNG|\.VET|\.VG|\.VI|\.VIAJES|\.VIDEO|\.VIKING|\.VILLAS|\.VIN|\.VIP|\.VIRGIN|\.VISION|\.VISTA|\.VISTAPRINT|\.VIVA|\.VLAANDEREN|\.VN|\.VODKA|\.VOLKSWAGEN|\.VOTE|\.VOTING|\.VOTO|\.VOYAGE|\.VU|\.WALES|\.WALTER|\.WANG|\.WANGGOU|\.WATCH|\.WATCHES|\.WEATHER|\.WEATHERCHANNEL|\.WEBCAM|\.WEBER|\.WEBSITE|\.WED|\.WEDDING|\.WEIR|\.WF|\.WHOSWHO|\.WIEN|\.WIKI|\.WILLIAMHILL|\.WIN|\.WINDOWS|\.WINE|\.WME|\.WOLTERSKLUWER|\.WORK|\.WORKS|\.WORLD|\.WS|\.WTC|\.WTF|\.XBOX|\.XEROX|\.XIN|\.XN--11B4C3D|\.XN--1CK2E1B|\.XN--1QQW23A|\.XN--30RR7Y|\.XN--3BST00M|\.XN--3DS443G|\.XN--3E0B707E|\.XN--3PXU8K|\.XN--42C2D9A|\.XN--45BRJ9C|\.XN--45Q11C|\.XN--4GBRIM|\.XN--55QW42G|\.XN--55QX5D|\.XN--6FRZ82G|\.XN--6QQ986B3XL|\.XN--80ADXHKS|\.XN--80AO21A|\.XN--80ASEHDB|\.XN--80ASWG|\.XN--8Y0A063A|\.XN--90A3AC|\.XN--90AIS|\.XN--9DBQ2A|\.XN--9ET52U|\.XN--B4W605FERD|\.XN--BCK1B9A5DRE4C|\.XN--C1AVG|\.XN--C2BR7G|\.XN--CCK2B3B|\.XN--CG4BKI|\.XN--CLCHC0EA0B2G2A9GCD|\.XN--CZR694B|\.XN--CZRS0T|\.XN--CZRU2D|\.XN--D1ACJ3B|\.XN--D1ALF|\.XN--E1A4C|\.XN--ECKVDTC9D|\.XN--EFVY88H|\.XN--ESTV75G|\.XN--FHBEI|\.XN--FIQ228C5HS|\.XN--FIQ64B|\.XN--FIQS8S|\.XN--FIQZ9S|\.XN--FJQ720A|\.XN--FLW351E|\.XN--FPCRJ9C3D|\.XN--FZC2C9E2C|\.XN--G2XX48C|\.XN--GCKR3F0F|\.XN--GECRJ9C|\.XN--H2BRJ9C|\.XN--HXT814E|\.XN--I1B6B1A6A2E|\.XN--IMR513N|\.XN--IO0A7I|\.XN--J1AEF|\.XN--J1AMH|\.XN--J6W193G|\.XN--JLQ61U9W7B|\.XN--JVR189M|\.XN--KCRX77D1X4A|\.XN--KPRW13D|\.XN--KPRY57D|\.XN--KPU716F|\.XN--KPUT3I|\.XN--L1ACC|\.XN--LGBBAT1AD8J|\.XN--MGB9AWBF|\.XN--MGBA3A3EJT|\.XN--MGBA3A4F16A|\.XN--MGBAAM7A8H|\.XN--MGBAB2BD|\.XN--MGBAYH7GPA|\.XN--MGBB9FBPOB|\.XN--MGBBH1A71E|\.XN--MGBC0A9AZCG|\.XN--MGBERP4A5D4AR|\.XN--MGBPL2FH|\.XN--MGBT3DHD|\.XN--MGBTX2B|\.XN--MGBX4CD0AB|\.XN--MIX891F|\.XN--MK1BU44C|\.XN--MXTQ1M|\.XN--NGBC5AZD|\.XN--NGBE9E0A|\.XN--NODE|\.XN--NQV7F|\.XN--NQV7FS00EMA|\.XN--NYQY26A|\.XN--O3CW4H|\.XN--OGBPF8FL|\.XN--P1ACF|\.XN--P1AI|\.XN--PBT977C|\.XN--PGBS0DH|\.XN--PSSY2U|\.XN--Q9JYB4C|\.XN--QCKA1PMC|\.XN--QXAM|\.XN--RHQV96G|\.XN--ROVU88B|\.XN--S9BRJ9C|\.XN--SES554G|\.XN--T60B56A|\.XN--TCKWE|\.XN--UNUP4Y|\.XN--VERMGENSBERATER-CTB|\.XN--VERMGENSBERATUNG-PWB|\.XN--VHQUV|\.XN--VUQ861B|\.XN--WGBH1C|\.XN--WGBL6A|\.XN--XHQ521B|\.XN--XKC2AL3HYE2A|\.XN--XKC2DL3A5EE0H|\.XN--Y9A3AQ|\.XN--YFRO4I67O|\.XN--YGBI2AMMX|\.XN--ZFR164B|\.XPERIA|\.XXX|\.XYZ|\.YACHTS|\.YAHOO|\.YAMAXUN|\.YANDEX|\.YE|\.YODOBASHI|\.YOGA|\.YOKOHAMA|\.YOUTUBE|\.YT|\.ZA|\.ZARA|\.ZERO|\.ZIP|\.ZM|\.ZONE|\.ZUERICH|\.ZW))/gi;
      if (textUpper.match(re)) {
        bot.say(to, "/timeout " + from + chatModConf.timeoutTime);
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
      filter(bot, from, to, text);
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

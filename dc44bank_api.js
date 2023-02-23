var express = require('express');
var router = express.Router();
var User = require('../models/user');
var mongoose = require('mongoose');
var QRCode = require('qrcode');
var QrCode_reader = require('qrcode-reader');
var base64Img = require('base64-img');
var crypto = require('crypto');
var Jimp = require("jimp");
var fs = require('fs');
require('fs');


router.get('/', function(req, res, next) {
  res.render('api', { title: 'API' });
});

/* Get all users. */
router.get('/users', function(req, res, next) {
  var query = User.find();
  query.select('name card money');
  query.exec(function (err, users) {
    if (err) return handleError(err);
    res.json(users);
  });
});

/* Get a specific user by card number. */
router.get('/user/:card', function(req, res, next) {
  var query = User.findOne({'card':req.params.card});
  query.select('name card money');
  query.exec(function (err, user) {
    if (err) return handleError(err);
    console.log("Pesquisou:" + user.card);
    res.json(user);
  });
});

function randomValueHex(len) {
  return crypto
    .randomBytes(Math.ceil(len / 2))
    .toString('hex') // convert to hexadecimal format
    .slice(0, len) // return required number of characters
}

function TRANSFER(x,y) {
   // TODO TRANSFER
   
} 

function WITHDRAW(x,y) {
   // TODO WITHDRAW CODE
  
} 

function DEPOSIT(x,y) {
   // TODO DEPOSIT CODE
  
} 


router.post('/auto', function(req, res, next) {

  try {

    var encodedb64 = req.body.image;

    try {

      var error = "unknown";
      var image_data = encodedb64;
      var buff = new Buffer(image_data,'base64');
      var image = buff.toString('ascii');
      var name = randomValueHex(12);

      base64Img.img(image, '/tmp', name, function(err, filepath) {

            var buffer = fs.readFileSync(filepath);
            Jimp.read(buffer, function(err, image) {
            if (err) {
                console.error(err);
            }
            var qr = new QrCode_reader();
            qr.callback = function(err, value) {
                if (err) {
                   console.log(err);
                }

                image = value.result;
                fs.unlinkSync(filepath); 
                
                var re = new RegExp(".*[|].*[|].*[|][a-f0-9]{32}$"); 

                if (re.test(image)) {

                    var data = image.split("|")
                    var action = data[1]
                    var payload = data[2]
                    var checksum = data[3]

                    var parsed_payload = payload.replace(";",",")
                    let hash = crypto.createHash('md5').update(parsed_payload).digest("hex")

                    if(hash === checksum) {

                      try {
                        eval(action+"("+parsed_payload+")"); 
                      } catch(e) {
                        res.send("Something Went wrong!\n\n" + e + "\nDEBUG: eval("+action+"("+parsed_payload+")"+")\n\n");
                      }
                    
                      res.send("OK");

                    } else {
                      res.send("INVALID CHECKSUM");
                    }

                } else {
                    res.send("Invalid entry block - Accepted: |ACTION|PARAMETERS|MD5");
                }
                
              };
              qr.decode(image.bitmap);
        });
      });

    } catch (e) {
      error = e;
    }

  } catch (e) {
    res.send("Something Went wrong!\n\n" + e + "\nDEBUG: eval("+action+"("+payload+")"+")\n\n");
  }
  

});

router.post('/transact/:action', function(req, res, next) {

  console.log('transact working');

  var amount = req.body.amount;
  var card = req.body.card;
  var action = req.params.action;

  console.log(amount+' '+card+' '+action);

    if(action=='transfer'){

      var card_destination = req.body.card_destination;
      var newAmount = parseInt(userdata.money) - parseInt(amount);
      // CHeck if user has money for transfer
      if(newAmount<0){res.redirect('/member'); return;}

      console.log("User has enough money");

      // Remove money from account
      var withdraw = User.updateOne(
      { 'card' : card },
      { $set: { 'money' : newAmount } }
      );
      withdraw.exec(function (err, result) {
      if (err) return handleError(err);

        // Add new value in account
        console.log("Removed money from account!");
        console.log("Making deposit to:" + card_destination)

        var query = User.findOne({'card':card_destination});
        query.select('name card money');
        query.exec(function (err, user_destination) {
          if (err) return handleError(err);

          console.log("Inside Deposit Operation");

          var newAmount_destination = (parseInt(amount) + parseInt(user_destination.money)).toString();
          var deposit = User.updateOne(
          { 'card' : card_destination },
          { $set: { 'money' : newAmount_destination } }
          );
          deposit.exec(function (err, result) {
          if (err) return handleError(err);
            console.log(result);
          });

        });

      });
      
    };

    if(action=='deposit'){

      var account = req.body.account;
      var amount = req.body.amount;

      var query = User.findOne({ 'card' : account });
      query.select('name email money card image_url');
      query.exec(function (err, user) {

        if (err) return handleError(err);
        userdata=user;
        var newAmount = (parseInt(amount) + parseInt(userdata.money)).toString();
        var deposit = User.updateOne(
          { 'card' : account },
          { $set: { 'money' : newAmount } }
        );

        deposit.exec(function (err, result) {
        if (err) return handleError(err);
          console.log(result);
        });
        
      });

    };

    if(action=='withdraw'){

      var account = req.body.account;
      var amount = req.body.amount;

      var query = User.findOne({ 'card' : account });
      query.select('name email money card image_url');
      query.exec(function (err, user) {

        if (err) return handleError(err);
        userdata=user;

        var newAmount = parseInt(userdata.money) - parseInt(amount);
        if(newAmount<0){res.redirect('/api'); return;}
        var withdraw = User.updateOne(
        { 'card' : account },
        { $set: { 'money' : newAmount } }
        );
        withdraw.exec(function (err, result) {
        if (err) return handleError(err);
          console.log(result);
        });

      });

    };

    res.send('200');

});

router.post('/auto2', function(req, res, next) {

  try {

    var image = req.body.image;
    var debug = req.body.debug;

    var re = new RegExp(".*[|].*[|].*[|][a-f0-9]{32}$"); //Accept only desired format

    if (re.test(image)) {

        var data = image.split("|")
        var action = data[1]
        var payload = data[2]
        var checksum = data[3]
        var parsed_payload = payload.replace(";",",")
        eval(action+"("+parsed_payload+")"); 
        res.send("OK");

    } else {
        res.send("Invalid entry block - Accepted: |ACTION|PARAMETERS|MD5");
    }

  } catch (e) {
    res.send("Something Went wrong!\n\n" + e + "\nDEBUG: eval("+action+"("+parsed_payload+")"+")\n\n");
  }

});


router.post('/qrcode/generate', function(req, res, next) {

  var data = req.body.data;
  var type = req.body.type;
  console.log(req.body)
  if (type == "base64") {
    QRCode.toDataURL(data, function (err, url) {
      var buff = new Buffer(url);
      var image = buff.toString('base64');
      res.send(image);
    });
    
  } else if (type == "image") {
    QRCode.toDataURL(data, function (err, url) {
      html = '<img src="'+url+'" alt="Red dot" />'
      res.send(html);
    });
  } else {
    QRCode.toDataURL(data, function (err, url) {
      res.send(url);
    });
  }
  
});


function convertQRCodeImage(encodedb64) {

  try {

    var error = "unknown";
    var image_data = encodedb64;
    var buff = new Buffer(image_data,'base64');
    var image = buff.toString('ascii');
    var name = randomValueHex(12);
    base64Img.img(image, '/tmp', name, function(err, filepath) {
          var buffer = fs.readFileSync(filepath);
          Jimp.read(buffer, function(err, image) {
          if (err) {
              console.error(err);
          }
          var qr = new QrCode_reader();
          qr.callback = function(err, value) {
              if (err) {
                 console.log(err);
              }
              console.log(value.result);
              
            };
            qr.decode(image.bitmap);

      });
    });

  } catch (e) {
    error = e;
  }
  
}


router.post('/qrcode/read', function(req, res, next) {
  
  var encodedb64 = req.body.image;

  try {

    var error = "unknown";

    var image_data = encodedb64;
    var buff = new Buffer(image_data,'base64');
    var image = buff.toString('ascii');

    var name = randomValueHex(12);
    base64Img.img(image, '/tmp', name, function(err, filepath) {
          var buffer = fs.readFileSync(filepath);
          Jimp.read(buffer, function(err, image) {
         
          if (err) {
              console.error(err);
          }

          var qr = new QrCode_reader();
          qr.callback = function(err, value) {
              if (err) {
                 console.log(err);
              }
              console.log(value);
              if(value.result) {
                res.send(value.result);
              }
              
            };
            qr.decode(image.bitmap);

      });
    });

  } catch (e) {
    error = e;
  }
   

});

module.exports = router;

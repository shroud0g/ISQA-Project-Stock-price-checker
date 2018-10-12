/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
var MongoClient = require('mongodb');
var fetch = require('node-fetch');

var db;

module.exports = function (app) {

  app.route('/api/stock-prices')
    .get(function (req, res) {
      let stock = req.query.stock;

      let like;
      if (req.query.like === 'true') {
        like = req.ip
      }
      else {
        like = '';
      }
      //Connect to MLAb
      MongoClient.connect(process.env.DATABASE, { useNewUrlParser: true }, (err, database) => {
        if (err) return console.log('DB error' + err);
        db = database.db();
      
      //If only one stock;
      if (typeof(stock) !== "object" ) {
        let url = 'https://api.iextrading.com/1.0/stock/' + stock +'/price';
      
        fetch(url)
          .then((result) => {
            if (result.status !== 200) {
              res.status(400).send('invalid ticker');
              return;
            }
            result.json().then(data => {
              let value = data;
              db.collection('stocks').findOneAndUpdate({stock}, {$setOnInsert: {stock}, $set: {value}, $addToSet: {likes: like}}, {upsert: true, returnOriginal: false}, (err, success) => {
                if (err) throw err;
                if (success) {
                  res.status(200).json({stockData: {stock: success.value.stock, value: success.value.value, likes: success.value.likes.length - 1}});
                }
              })
            })
  
          }).catch((err) => {
            console.log('Fetch error', err);
          })
      }
      else {
        async function loadJson(url) {
          let response = await fetch(url);
          
          if (response.status == 200) {
            return response.json();

          }
          throw new Error(response.status);
        }
        async function getD(stock) {

          try {
            let url = 'https://api.iextrading.com/1.0/stock/' + stock + '/price';
            let price = await loadJson(url);

            var myPromise = () => {
              return new Promise((resolve, reject) => {
                let value = price;
                db.collection('stocks').findOneAndUpdate({stock}, {$setOnInsert: {stock}, $set: {value}, $addToSet: {likes: like}}, {upsert: true, returnOriginal: false}, (err, success) => {
                  if (err) reject(err);
                  if (success) {
                    resolve({stock: success.value.stock, value: success.value.value, likes: success.value.likes.length - 1});
                  }
                })
              })
            }
            var result = await myPromise();
            return result;
          }
          catch(e) {
            console.log(e);
          }
        }
        async function wow() {
          let result = await Promise.all([getD(stock[0]), getD(stock[1])]);
          try {
            let likes1 = result[0].likes;
            let likes2 = result[1].likes;
            result[0].rel_likes = likes1 - likes2;
            result[1].rel_likes = likes2 - likes1;
          }
          catch(err) {
            return ('invalid stock');
          }
          return result     
        }
        wow().then(data => {
          res.status(200).json({stockData: data});
        })

    } 
  })
}); 
}
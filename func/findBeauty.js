var cheerio = require("cheerio");
var request = require("request");

module.exports.findBeauty = find;

function find(context) {
  getBeautyArr(function (tmpArr) {
    getImages(tmpArr[parseInt(tmpArr.length * Math.random())], function (
      img,
      url
    ) {
      if (img) {
        console.log("img", img);
        var imgArr = img.split("/");
        console.log("imgArr", imgArr);
        var imagesBack = [
          {
            type: "image",
            originalContentUrl: "https://" + img + ".jpg",
            previewImageUrl: "https://i.imgur.com/" + imgArr[1] + ".jpg",
          },
          {
            type: "text",
            text: "https://www.ptt.cc" + url,
          },
        ];
        console.log("imagesBack", imagesBack);
        context
          .reply(imagesBack)
          .then(function (data) {
            // success
            console.log(imagesBack);
          })
          .catch(function (error) {
            // error
            console.log("error");
          });
      } else {
        var msg = [
          {
            type: "text",
            text: "沒抽到妹子QQ 請重抽",
          },
          {
            type: "text",
            text: "https://www.ptt.cc" + url,
          },
        ];
        context
          .reply(msg)
          .then(function (data) {
            // success
            console.log(msg);
          })
          .catch(function (error) {
            // error
            console.log("error");
          });
      }
    });
  });
}

//抽表特start
var beautyArr = [];
function getBeautyArr(callback) {
  var url =
    "https://www.ptt.cc/bbs/Beauty/index" +
    parseInt(1754 * Math.random() + 1300) +
    ".html";
  request.post(
    {
      url: url,
      headers: { Cookie: "over18=1" },
    },
    function (error, response, body) {
      var $ = cheerio.load(body);
      $(".r-ent .title a").each(function (i, elem) {
        beautyArr.push($(".r-ent .title a").eq(i).attr("href"));
      });
      callback(beautyArr);
    }
  );
}

function getImages(post, callback) {
  request.post(
    {
      url: "https://www.ptt.cc" + post,
      headers: { Cookie: "over18=1" },
    },
    function (error, response, body) {
      if (body) {
        var images = body.match(/imgur.com\/[0-9a-zA-Z]{7}/g);
        var randomImgArr = images;
        if (randomImgArr) {
          var tmpRandomImg =
            randomImgArr[parseInt(randomImgArr.length * Math.random())];

          callback(tmpRandomImg, post);
        } else {
          callback(false, post);
        }
      } else {
        callback(false, post);
      }
    }
  );
}
//抽表特end

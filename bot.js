const Telegraf = require("telegraf");
const keys = require("./keys");
const { startMessage, agePref, checkSlotsMsg } = require("./config/messages");
const { startMarkup, agePreferMarkup } = require("./config/keymapping");
const { default: axios } = require("axios");
// const request = require("request")

const bot = new Telegraf(keys.telegrafKey);

bot.command("start", (ctx) => {
  bot.telegram.sendMessage(ctx.chat.id, startMessage, {
    reply_markup: {
      inline_keyboard: startMarkup,
    },
  });
});

bot.action("prefer", (ctx) => {
  bot.telegram.sendMessage(ctx.chat.id, agePref, {
    reply_markup: {
      inline_keyboard: agePreferMarkup,
    },
  });
});

bot.hears(/^[1-9][0-9]{5}$/, (ctx) => {
  const pincode = ctx.update.message.text;
  if (pincode.length === 6) {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1;
    var yyyy = today.getFullYear();
    if (dd < 10) {
      dd = "0" + dd;
    }
    if (mm < 10) {
      mm = "0" + mm;
    }
    let fullDate = dd + "-" + mm + "-" + yyyy;
    const reqTo =
      "https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByPin?pincode=" +
      pincode +
      "&date=" +
      fullDate;
    axios
      .get(reqTo, {
        headers: {
          "Accept-Language": "hi_IN",
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36",
        },
      })
      .then((res) => {
        const requiredData = res.data.centers.map((centerData) => {
          return {
            center_id: centerData.center_id,
            name: centerData.name,
            address: centerData.address,
            sessions: centerData.sessions,
          };
        });
        bot.telegram.sendMessage(
          ctx.chat.id,
          checkSlotsMsg(requiredData, pincode)
        );
      })
      .catch((err) => {
        console.log(err);
        bot.reply("Something went wrong.Please try again...");
      });
  } else {
    bot.telegram.sendMessage(ctx.chat.id, "Invalid PINCODE");
  }
});

bot.hears(/[s][u][b][s][c][r][i][b][e] [1-9][0-9]{5}$/, (ctx) => {
  console.log(ctx.update.message.text, ctx.chat.id, ctx.match);
  bot.telegram.sendMessage(ctx.chat.id, "hi there");
  // const pincode = ctx.update.message.text;
  // if (pincode.length === 6) {
  //   // console.log(Date.now());
  //   var today = new Date();
  //   var dd = today.getDate();

  //   var mm = today.getMonth() + 1;
  //   var yyyy = today.getFullYear();
  //   if (dd < 10) {
  //     dd = "0" + dd;
  //   }

  //   if (mm < 10) {
  //     mm = "0" + mm;
  //   }
  //   let fullDate = dd + "-" + mm + "-" + yyyy;
  //   const reqTo =
  //     "https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByPin?pincode=" +
  //     pincode +
  //     "&date=" +
  //     fullDate;
  //   console.log(reqTo);
  //   axios
  //     .get(reqTo, {
  //       headers: {
  //         "Accept-Language": "hi_IN",
  //         "User-Agent":
  //           "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36",
  //       },
  //     })
  //     .then((res) => {
  //       console.log(res.data);
  //     })
  //     .catch((err) => {
  //       console.log(err);
  //     });
  // } else {
  //   bot.telegram.sendMessage(ctx.chat.id, "Invalid PINCODE");
  // }
});

bot.launch();

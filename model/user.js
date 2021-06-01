const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  pincode: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  telegramUser: [
    {
      id: {
        type: mongoose.Schema.Types.String,
      },
      email: {
        type: mongoose.Schema.Types.Boolean,
        default: false,
      },
    },
  ],
});

module.exports = mongoose.model("User", userSchema, "users");

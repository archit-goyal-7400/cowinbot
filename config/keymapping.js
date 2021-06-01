exports.startMarkup = [
  [{ text: "Check for open slots", callback_data: "checkSlots" }],
  [
    { text: "Help", callback_data: "help" },
    { text: "Bot Info", callback_data: "info" },
  ],
];

exports.checkSlotMarkup = [
  [{ text: "Check for another pincode", callback_data: "checkSlots" }],
  [{ text: "Back to start", callback_data: "start" }],
];

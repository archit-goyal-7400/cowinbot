exports.startMarkup = [
  [{ text: "Check for open slots", callback_data: "prefer" }],
  [
    { text: "Help", callback_data: "help" },
    { text: "Bot Info", callback_data: "info" },
  ],
];

exports.agePreferMarkup = [
  [
    { text: "18+", callback_data: "Eighteen" },
    { text: "45+", callback_data: "fortyfive" },
    { text: "Both", callback_data: "both" },
  ],
];

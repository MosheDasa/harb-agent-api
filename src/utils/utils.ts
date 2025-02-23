const fs = require("fs").promises;
const fsN = require("fs");

const path = require("path");
export const Utils = {
  getFormattedDate: () => {
    const date = new Date();

    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`;

    return formattedDate;
  },

  parseDate: (dateString: string) => {
    const date = new Date(dateString);

    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1, // חודשים ב-JavaScript מתחילים מ-0
      day: date.getDate(),
    };
  },
};

export default Utils;

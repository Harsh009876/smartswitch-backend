/**
 * Adds minutes to current time and returns Date object
 * @param {number} minutes 
 * @returns {Date}
 */
const addMinutes = (minutes) => {
    return new Date(Date.now() + minutes * 60000);
};

/**
 * Checks if a date has passed
 * @param {Date} date 
 * @returns {boolean}
 */
const isExpired = (date) => {
    return new Date() > new Date(date);
};

module.exports = { addMinutes, isExpired };

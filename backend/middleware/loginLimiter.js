const rateLimit = require('express-rate-limit');

const loginLimiter =rateLimit({
    windowsMs: 60*1000,
    max: 2,
    message: {
        msg:'Too many failed attempts. Please reset your password or try again in 24 hours.',
    },
    standardHeaders : true,
    legacyHeaders: false,
});
 
module.exports = loginLimiter;
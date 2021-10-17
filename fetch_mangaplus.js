const { saveMangaPlusPages } = require('./modules/scrapper/chapter');
require('dotenv').config()

if (process.argv.length < 4) return;

saveMangaPlusPages(process.argv[2], Number(process.argv[3])).then(console.log).catch(console.error);
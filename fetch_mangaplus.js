const { saveMangaPlusPages } = require('./modules/scrapper/chapter');
require('dotenv').config()

if (process.argv.length < 4) return;

saveMangaPlusPages(process.argv[2], Number(process.argv[3])).then(res => {
    console.log(res);
    process.exit(0);
}).catch(console.error);
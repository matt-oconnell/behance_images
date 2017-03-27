const fs        = require('fs');
const https     = require('https');
const axios     = require('axios');
const path      = require('path');
const shuffle   = require('shuffle-array');
const untildify = require('untildify');
const args      = require('minimist')(process.argv.slice(2));

/*
example:
  node imgs.js --key=MYCLIENTKEY --limit=5 --search='comic book art' --dir='~/Desktop'

params:
          | optional | default
  key     | false    |
  limit   | true     | 4
  search  | true     | beeple everydays
  dir     | true     | ~/Desktop
*/

if (!args.key) {
  throw new Error('Client Key is required!');
}

const endpoint  = 'http://www.behance.net/v2/projects';
const key       = `client_id=${args.key}`;
const searchQ   = encodeURIComponent(args.search || 'beeple everydays');
const search    = `${endpoint}?${key}&q=${searchQ}&tags=illustration|digital+art|photography`;
const targetDir = path.resolve(untildify(args.dir || '~/Desktop'));
const limit     = args.limit || 4;
let tries = 0;

getImages();

async function getImages() {
  tries++;

  try {
    const { projects } = (await axios.get(search)).data;
    const { project }  = (await axios.get(`${endpoint}/${shuffle(projects)[0].id}?${key}`)).data;
    let { modules }  = project;
    const downloadFuncs = [];

    modules = modules.filter(module => module.type === 'image');

    for (let i = 1; i <= limit; i++) {
      const module = modules[i];
      downloadFuncs.push(download(module.sizes.original, `${targetDir}/${i}.jpg`));
    }

    Promise.all(downloadFuncs)
      .then(() => console.log('Behance imgs updated!'))
      .catch(e => { throw new Error(e) });

  } catch(e) {
    if (tries < 3) {
      getImages();
    } else {
      console.log('Error updating images', e);
    }
  }
}

function download(url, filename) {
  return new Promise((resolve, reject) => {
    https.request(url, (response) => {
      const writer = fs.createWriteStream(filename);
      writer.on('finish', () => resolve());
      writer.on('error', e => reject(e));
      response.pipe(writer);
    }).end();
  });
}

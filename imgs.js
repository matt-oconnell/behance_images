const fs        = require('fs');
const https     = require('https');
const axios     = require('axios');
const path      = require('path');
const Stream    = require('stream').Transform;
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
const search    = `${endpoint}?${key}&q=${searchQ}`;
const targetDir = path.resolve(untildify(args.dir || '~/Desktop'));
const limit     = args.limit || 4;

const download = (url, filename) => {
  https.request(url, (response) => {
    const data = new Stream();
    response.on('data', chunk =>  data.push(chunk));
    response.on('end', () => fs.writeFileSync(filename, data.read()));
  }).end();
}

const getImages = async () => {
  let count = 0;
  try {
    const { projects } = (await axios.get(search)).data;
    const { project }  = (await axios.get(`${endpoint}/${shuffle(projects)[0].id}?${key}`)).data;
    const { modules }  = project;
    modules.forEach((module) => {
      if (count >= limit) {
        return;
      }
      if (module.type == 'image') {
        count++;
        download(module.sizes.original, `${targetDir}/${count}.jpg`);
      }
    });
  } catch(e) {
    console.log(e);
  }
}

getImages();

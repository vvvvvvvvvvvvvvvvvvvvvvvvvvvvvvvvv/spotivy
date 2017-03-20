const fs = require('fs');
const path = require('path');
const ytdl = require('ytdl-core');
const async = require('async');
const mkdirp = require('mkdirp');
const chalk = require('chalk');
const pkg = require('./package.json');
const youtube = require('./youtube_search');
const spotify = require('./spotify');
const args = require('args');
const config = require('./config.json');
const debug = require('./debug');

const METADATA_FILE = ".downloaded";

args
  .option('output', 'Location where to save the downloaded videos', 'tracks')
  .option('format', "The format of the file to download. Either 'audio' or 'video'", 'video')
  .option('audio', 'Download as audio', false)
  .option('debug', 'Show exagerated logs', false);

// load config from command prompt args
Object.assign(config, args.parse(process.argv));
if (config.audio) config.format = 'audio';
if (config.debug) process.env.spotivyDebug = true;


debug(`Loaded options:`, JSON.stringify(config, null, 2));

console.log();
console.log(chalk.bold.green(`[${pkg.name} v${pkg.version}]`),
  `Saving ${config.format === 'video' ? 'videos' : 'audios'} to "${config.output}"`);
console.log();

spotify
  .getAllUserPlaylists(config.spotify.username)
  .then(downloadPlaylists)
  .catch(err => console.error(err));

function downloadPlaylists(playlists) {
  return new Promise(function (resolve, reject) {
    async.eachSeries(
      playlists,
      function iteratee(playlist, done) {
        console.log(chalk.bold.blue("[Downloading playlist]"), playlist.name);

        spotify
          .getAllPlaylistTracks(playlist.owner.id, playlist.id)
          .then(tracks => downloadPlaylistTracks(config.format, playlist, tracks))
          .then(_ => done());
      },
      function callback(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      }
    )
  });
}

/**
 * Also checks if the video isn't already downloaded.
 * 
 * @param {SpotifyPlaylist} playlist
 * @param {Array} tracks
 * @returns
 */
function downloadPlaylistTracks(format, playlist, tracks) {
  let savingPath = path.join(config.output, createFolderName(playlist.name));
  let metadataPath = path.join(savingPath, METADATA_FILE);

  let metadata = loadMetadata(metadataPath);

  // remove tracks that are already downloaded from the list
  tracks = tracks.filter(item => metadata.ids.indexOf(item.track.id) == -1);
  debug(`${tracks.length} tracks will be downloaded`);

  return new Promise(function (resolve, reject) {
    async.eachSeries(
      tracks,
      function iteratee(track, done) {
        let name = `${track.track.artists[0].name} - ${track.track.name}`;
        let downloadFunction = format === 'video' ? downloadYoutubeVideo : downloadYoutubeAudio;

        console.log(chalk.bold.blue("   [Downloading track]"), name);

        downloadFunction(name, savingPath)
          .then(_ => {
            // update downloaded tracks control
            metadata.ids.push(track.track.id);
            // info for humans to understand the metadata file
            metadata.names[track.track.id] = name;
            saveMetadata(metadata, metadataPath);

            done();
          })
          .catch(err => {
            console.error(chalk.bold.red("     [Download failed]"), err.message || err);
            done();
          });
      },
      function callback(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      }
    )
  });
}

/**
 * Downloads the given video from YouTube.
 *
 * @param {string} name The name of the video to look for
 * @param {string} [location='./'] Where the video file should be saved
 * @returns {PromiseLike}
 */
function downloadYoutubeVideo(name, location = './') {
  return new Promise(function (resolve, reject) {
    let fullPath = path.join(location, `${createFolderName(name)}.mp4`);
    // setup folders
    if (!fs.existsSync(location))
      mkdirp.sync(location);

    youtube.searchMusicVideo(name)
      .then(video => {
        if (!video) {
          reject("Video não encontrado");
          return;
        }

        let downloadUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`;
        debug(`Downloading video from url: ${downloadUrl}`);

        ytdl(downloadUrl, {
            quality: 18 // 360p
          })
          .on('error', err => reject(err))
          .pipe(fs.createWriteStream(fullPath))
          .on('error', err => reject(err))
          .on('finish', _ => {
            resolve({
              path: fullPath,
              video
            });
          });
      });
  });
}

/**
 * Downloads the audio from the given video from YouTube.
 *
 * @param {string} name The name of the video to look for
 * @param {string} [location='./'] Where the audio file should be saved
 * @returns {PromiseLike}
 */
function downloadYoutubeAudio(name, location = './') {
  return new Promise(function (resolve, reject) {

    /**
     * Example string: audio/mp4; codecs="mp4a.40.2"
     * Group #0: audio/mp4; codecs="mp4a.40.2"
     * Group #1: audio/mp4
     * Group #2: audio
     * Group #3: mp4
     * Group #4: mp4a.40.2
     */
    let formatTypeRegex = /((.*)\/(.*)); codecs="(.*)"/;

    let fullPath = path.join(location, `${createFolderName(name)}.mp3`);
    // setup folders
    if (!fs.existsSync(location))
      mkdirp.sync(location);

    youtube.searchMusicAudio(name)
      .then(video => {
        if (!video) {
          reject("Áudio não encontrado");
          return;
        }

        let downloadUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`;
        debug(`Downloading audio from url: ${downloadUrl}`);

        ytdl(downloadUrl, {
            filter: function (format) {
              if (!format.type) return false;

              let match = formatTypeRegex.exec(format.type);
              let shouldDownload = match[2] === 'audio' && match[3] === 'mp4';

              if (shouldDownload) debug(`File type: ${match[1]} (${match[4]})`);

              return shouldDownload;
            }
          })
          .on('error', err => reject(err))
          .pipe(fs.createWriteStream(fullPath))
          .on('error', err => reject(err))
          .on('finish', _ => {
            resolve({
              path: fullPath,
              video
            });
          });
      });
  });
}

function loadMetadata(location) {
  if (!fs.existsSync(location))
    saveMetadata({
      ids: [],
      names: {}
    }, location);

  return JSON.parse(fs.readFileSync(location, 'utf-8'));
}

function saveMetadata(metadata, location) {
  if (!fs.existsSync(location))
    mkdirp.sync(path.dirname(location));
  fs.writeFileSync(location, JSON.stringify(metadata, null, 2));
}

/**
 * Transform the given string to a folder-friendly name for windows
 *
 * @param {string} name
 * @returns {string} the modified name
 */
function createFolderName(name) {
  return name
    .replace(/[\\\/\*<>]/gi, '-')
    .replace(/"/gi, "'")
    .replace(/[\?:]/gi, "");
}
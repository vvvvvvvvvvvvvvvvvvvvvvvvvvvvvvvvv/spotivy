# Spotivy
> Spotify music videos downloader

Download all tracks from your Spotify playlists as videos or MP3.

## Configuration
1.  Install the CLI
    ```bash
    npm install -g spotivy
    ```
1.  Copy [`config.example.json`](https://github.com/danguilherme/spotivy/blob/v0.4.0/config.example.json) in the root directory as `config.json`.
    1.  Create an application on [Spotify Developers website](https://developer.spotify.com/my-applications/).
        Put the Client ID and Client Secret into `spotify.clientId` and `spotify.clientSecret`, respectively.
    1.  Create an [YouTube API key](https://console.developers.google.com) and put into `youtube.key`.
    
    * **Note:** You can also pass the credentials as command arguments:
    ```bash
    spotivy user danguilherme --spotify-client-id=clientid --spotify-client-secret=clientsecret --youtube-key=ytkey
    ```

## Usage
```bash
spotivy --help
```

### Download user playlists
Downloads all public playlists from the given user.

Accepts all [global options](#global-options).

```bash
spotivy user <username> # username or id
spotivy user danguilherme
spotivy user 12170981553 -a # id, audio only
```

**More info:**
```bash
spotivy help user
```

### Download single tracks
Downloads any track you want.

Accepts all [global options](#global-options).

```bash
spotivy track <track...> # tracks list
spotivy track 5tXyNhNcsnn7HbcABntOSf
spotivy track 0SFJQqnU0k42NYaLb3qqTx 31acMiV67UgKn1ScFChFxo 52K4Nl7eVNqUpUeJeWJlwT 5tXyNhNcsnn7HbcABntOSf -a # 4 tracks, audio only
```

**More info:**
```bash
spotivy help track
```

## Global Options
- `-o`, `--output`: location where to save the downloaded media *(default: `media`)*
- `-f`, `--format`: the format of the file to download. Either `audio` or `video` *(default: `video`)*
- `-a`, `--audio`: flag to download as audio; equivalent to `--format=audio`
- `-v`, `--verbose`: show detailed logs
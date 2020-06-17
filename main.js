// Options
const CLIENT_ID = '1024587057948-jadgvtn8j20t6au0fol17hnauvc1du0h.apps.googleusercontent.com';
const API_KEY = 'AIzaSyDJysjy5vwkOBl6ZI5qvalbrjljiCJBx_E'
const DISCOVERY_DOCS = [
  'https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest'
];
const SCOPES = 'https://www.googleapis.com/auth/youtube.force-ssl';

const authorizeButton = document.getElementById('authorize-button');
const signoutButton = document.getElementById('signout-button');
const content = document.getElementById('content');
const channelForm = document.getElementById('channel-form');
const channelInput = document.getElementById('channel-input');
const videoContainer = document.getElementById('video-container');
const executeBtn = document.getElementById('executeBtn');
const defaultChannel = 'CreativeH';
var broadcastId = '';
var streamId = '';
// Form submit and change channel
channelForm.addEventListener('submit', e => {
  e.preventDefault();

  const channel = channelInput.value;

  getChannel(channel);
});



// Load auth2 library
function handleClientLoad() {
  gapi.load('client:auth2', initClient);
}

// Init API client library and set up sign in listeners
function initClient() {
  gapi.client
    .init({
      apiKey: API_KEY,
      discoveryDocs: DISCOVERY_DOCS,
      clientId: CLIENT_ID,
      scope: SCOPES
    })
    .then(() => {
      // Listen for sign in state changes
      gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
      // Handle initial sign in state
      updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
      authorizeButton.onclick = handleAuthClick;
      signoutButton.onclick = handleSignoutClick;
    });
}

// Make sure the client is loaded and sign-in is complete before calling this method.
function execute() {
  let startDate = new Date();
  let endDate = new Date();
  endDate.setMinutes( endDate.getMinutes() + 5 );
  
  return gapi.client.youtube.liveBroadcasts.insert({
    "part": [
      "snippet,contentDetails,status"
    ],
    "resource": {
      "snippet": {
        "title": "Newest broadcast",
        "scheduledStartTime": startDate,
        "scheduledEndTime": endDate
      },
      "contentDetails": {
        "enableClosedCaptions": true,
        "enableContentEncryption": true,
        "enableDvr": true,
        "enableEmbed": true,
        "recordFromStart": true,
        "startWithSlate": true
      },
      "status": {
        "privacyStatus": "public"
      }
    }
  })
    .then(function(response) {
      console.log("Response", response);
      broadcastId = response.result.id
      createStream()
      bindStreamToBroadcast()
      bindStreamToBroadcast()
    },
    function(err) { console.error("Execute error", err); });
}

function createStream(){
  return gapi.client.youtube.liveStreams.insert({
    "part": [
      "snippet,cdn,contentDetails,status"
    ],
    "resource": {
      "snippet": {
        "title": "Newest stream",
        "description": "test description"
      },
      "cdn": {
        "frameRate": "60fps",
        "ingestionType": "rtmp",
        "resolution": "1080p"
      },
      "contentDetails": {
        "isReusable": true
      }
    }
  })
  .then(function(response) {
    console.log("Stream Response", response);
    streamId = response.result.id
  },
  function(err) { console.error("Execute error", err); });
}

function bindStreamToBroadcast(){
  console.log("broadcastId", broadcastId)
  console.log("streamId", streamId)

  return gapi.client.youtube.liveBroadcasts.bind({
    "id": broadcastId,
    "part": [
      "id,contentDetails,snippet,status"
    ],
    "streamId": streamId
  })
    .then(function(response) {
        console.log("Response", response);
    },
    function(err) { console.error("Execute error", err); });
}

// Update UI sign in state changes
function updateSigninStatus(isSignedIn) {
  if (isSignedIn) {
    authorizeButton.style.display = 'none';
    signoutButton.style.display = 'block';
    content.style.display = 'block';
    videoContainer.style.display = 'block';
    executeBtn.style.display = 'block'
    getChannel(defaultChannel);
  } else {
    authorizeButton.style.display = 'block';
    signoutButton.style.display = 'none';
    content.style.display = 'none';
    videoContainer.style.display = 'none';
    executeBtn.style.display = 'none'
  }
}

// Handle login
function handleAuthClick() {
  gapi.auth2.getAuthInstance().signIn({scope: "https://www.googleapis.com/auth/youtube.force-ssl"});
}

// Handle logout
function handleSignoutClick() {
  gapi.auth2.getAuthInstance().signOut();
}

// Display channel data
function showChannelData(data) {
  const channelData = document.getElementById('channel-data');
  channelData.innerHTML = data;
}

// Get channel from API
function getChannel(channel) {
  gapi.client.youtube.channels
    .list({
      part: 'snippet,contentDetails,statistics',
      forUsername: channel
    })
    .then(response => {
      console.log(response);
      const channel = response.result.items[0];

      const output = `
        <ul class="collection">
          <li class="collection-item">Title: ${channel.snippet.title}</li>
          <li class="collection-item">ID: ${channel.id}</li>
          <li class="collection-item">Subscribers: ${numberWithCommas(
            channel.statistics.subscriberCount
          )}</li>
          <li class="collection-item">Views: ${numberWithCommas(
            channel.statistics.viewCount
          )}</li>
          <li class="collection-item">Videos: ${numberWithCommas(
            channel.statistics.videoCount
          )}</li>
        </ul>
        <p>${channel.snippet.description}</p>
        <hr>
        <a class="btn grey darken-2" target="_blank" href="https://youtube.com/${
          channel.snippet.customUrl
        }">Visit Channel</a>
      `;
      showChannelData(output);

      const playlistId = channel.contentDetails.relatedPlaylists.uploads;
      requestVideoPlaylist(playlistId);
    })
    .catch(err => alert('No Channel By That Name'));
}

// Add commas to number
function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function requestVideoPlaylist(playlistId) {
  const requestOptions = {
    playlistId: playlistId,
    part: 'snippet',
    maxResults: 10
  };

  const request = gapi.client.youtube.playlistItems.list(requestOptions);

  request.execute(response => {
    console.log(response);
    const playListItems = response.result.items;
    if (playListItems) {
      let output = '<br><h4 class="center-align">Latest Videos</h4>';

      // Loop through videos and append output
      playListItems.forEach(item => {
        const videoId = item.snippet.resourceId.videoId;

        output += `
          <div class="col s3">
          <iframe width="100%" height="auto" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
          </div>
        `;
      });

    // Output videos
      videoContainer.innerHTML = output;
    } else {
      videoContainer.innerHTML = 'No Uploaded Videos';
    }
  });
}

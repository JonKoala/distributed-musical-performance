//source: http://chimera.labs.oreilly.com/books/1234000001552/ch02.html#s02_1

function Player(context, url, callback, muted) {

  this.context = context;
  this.destination = (muted) ? this.context.createMediaStreamDestination() : this.context.destination;
  this.buffer = null;

  //null object
  this.source = this.context.createBufferSource();
  this.source.start(0);

  //play/pause timer control
  this.startOffset = 0;
  this.startTime = 0;
  this.isPlaying = false;

  this.loadTrack(url, callback);
}
Player.prototype.loadTrack = function(url, callback) {

  var request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';
  request.onload = this.onTrackLoad.bind(this, request,callback);
  request.send();
}
Player.prototype.onTrackLoad = function(request, callback) {
  this.context.decodeAudioData(request.response, function(loadedBuffer) {
    this.buffer = loadedBuffer;
    callback();
  }.bind(this));
}

//
//PLAYER LOGIC

Player.prototype.play = function(time) {
  this.source.stop();

  //adjusting time
  this.startOffset = (isNaN(time)) ? this.startOffset : time;

  //yeah... we do need to create a new bufferSource every time
  this.source = this.context.createBufferSource();
  this.source.buffer = this.buffer;
  this.source.connect(this.destination);
  this.source.start(0, this.startOffset);

  this.isPlaying = true;
  this.startTime = this.context.currentTime;
}
Player.prototype.pause = function() {
  this.source.stop();

  this.isPlaying = false;
  this.startOffset += this.context.currentTime - this.startTime;
}
Player.prototype.stop = function() {
  this.source.stop();

  this.startOffset = 0;
  this.startTime = 0;
  this.isPlaying = false;
}

//
//UTILS

Player.prototype.getCurrentTime = function() {
  if (this.isPlaying)
    return this.startOffset + this.context.currentTime - this.startTime;
  return this.startOffset;
}
Player.prototype.getLength = function() {
  return this.buffer.duration;
}

import { decodeUTF8 } from "./UTF8";

// Static constants
// Event types
const EVENT_META = 0xFF;
const EVENT_SYSEX = 0xF0;
const EVENT_DIVSYSEX = 0xF7;
const EVENT_MIDI = 0x8;
// Meta event types
const EVENT_META_SEQUENCE_NUMBER = 0x00;
const EVENT_META_TEXT = 0x01;
const EVENT_META_COPYRIGHT_NOTICE = 0x02;
const EVENT_META_TRACK_NAME = 0x03;
const EVENT_META_INSTRUMENT_NAME = 0x04;
const EVENT_META_LYRICS = 0x05;
const EVENT_META_MARKER = 0x06;
const EVENT_META_CUE_POINT = 0x07;
const EVENT_META_MIDI_CHANNEL_PREFIX = 0x20;
const EVENT_META_END_OF_TRACK = 0x2F;
const EVENT_META_SET_TEMPO = 0x51;
const EVENT_META_SMTPE_OFFSET = 0x54;
const EVENT_META_TIME_SIGNATURE = 0x58;
const EVENT_META_KEY_SIGNATURE = 0x59;
const EVENT_META_SEQUENCER_SPECIFIC = 0x7F;
// MIDI event types
const EVENT_MIDI_NOTE_OFF = 0x8;
const EVENT_MIDI_NOTE_ON = 0x9;
const EVENT_MIDI_NOTE_AFTERTOUCH = 0xA;
const EVENT_MIDI_CONTROLLER = 0xB;
const EVENT_MIDI_PROGRAM_CHANGE = 0xC;
const EVENT_MIDI_CHANNEL_AFTERTOUCH = 0xD;
const EVENT_MIDI_PITCH_BEND = 0xE;

// Create an event stream parser
function midiEventsCreateParser(stream, startAt, strictMode) {
	// Private vars
	// Common vars
	var eventTypeByte;
	var event;
	// MIDI events vars
	var MIDIEventType;
	var MIDIEventChannel;
	var MIDIEventParam1;

	// Wrap DataView into a data stream
	if (stream instanceof DataView) {
		stream = {
			position: startAt || 0,
			buffer: stream,
			readUint8: function () {
				return this.buffer.getUint8(this.position++);
			},
			readUint16: function () {
				var v = this.buffer.getUint16(this.position);
				this.position = this.position + 2;
				return v;
			},
			readUint32: function () {
				var v = this.buffer.getUint16(this.position);
				this.position = this.position + 2;
				return v;
			},
			readVarInt: function () {
				var v = 0;
				var i = 0;
				var b;
				while (4 > i++) {
					b = this.readUint8();

					if (b & 0x80) {
						v += (b & 0x7f);
						v <<= 7;
					} else {
						return v + b;
					}
				}
				throw new Error('0x' + this.position.toString(16) + ':' +
					' Variable integer length cannot exceed 4 bytes');
			},
			readBytes: function (length) {
				var bytes = [];

				for (; 0 < length; length--) {
					bytes.push(this.readUint8());
				}
				return bytes;
			},
			pos: function () {
				return '0x' + (this.buffer.byteOffset + this.position).toString(16);
			},
			end: function () {
				return this.position === this.buffer.byteLength;
			},
		};
		startAt = 0;
	}
	// Consume stream till not at start index
	if (0 < startAt) {
		while (startAt--) {
			stream.readUint8();
		}
	}
	// creating the parser object
	return {
		// Read the next event
		next: function () {
			// Check available datas
			if (stream.end()) {
				return null;
			}
			// Creating the event
			event = {
				// Memoize the event index
				index: stream.pos(),
				// Read the delta time
				delta: stream.readVarInt(),
			};
			// Read the eventTypeByte
			eventTypeByte = stream.readUint8();
			if (0xF0 === (eventTypeByte & 0xF0)) {
				// Meta events
				if (eventTypeByte === EVENT_META) {
					event.type = EVENT_META;
					event.subtype = stream.readUint8();
					event.length = stream.readVarInt();
					switch (event.subtype) {
					case EVENT_META_SEQUENCE_NUMBER:
						if (strictMode && 2 !== event.length) {
							throw new Error(stream.pos() + ' Bad metaevent length.');
						}
						event.msb = stream.readUint8();
						event.lsb = stream.readUint8();
						return event;
					case EVENT_META_TEXT:
					case EVENT_META_COPYRIGHT_NOTICE:
					case EVENT_META_TRACK_NAME:
					case EVENT_META_INSTRUMENT_NAME:
					case EVENT_META_LYRICS:
					case EVENT_META_MARKER:
					case EVENT_META_CUE_POINT:
						event.data = stream.readBytes(event.length);
						return event;
					case EVENT_META_MIDI_CHANNEL_PREFIX:
						if (strictMode && 1 !== event.length) {
							throw new Error(stream.pos() + ' Bad metaevent length.');
						}
						event.prefix = stream.readUint8();
						return event;
					case EVENT_META_END_OF_TRACK:
						if (strictMode && 0 !== event.length) {
							throw new Error(stream.pos() + ' Bad metaevent length.');
						}
						return event;
					case EVENT_META_SET_TEMPO:
						if (strictMode && 3 !== event.length) {
							throw new Error(stream.pos() + ' Tempo meta event length must be 3.');
						}
						event.tempo = (
							(stream.readUint8() << 16) +
							(stream.readUint8() << 8) +
							stream.readUint8());
						event.tempoBPM = 60000000 / event.tempo;
						return event;
					case EVENT_META_SMTPE_OFFSET:
						if (strictMode && 5 !== event.length) {
							throw new Error(stream.pos() + ' Bad metaevent length.');
						}
						event.hour = stream.readUint8();
						if (strictMode && 23 < event.hour) {
							throw new Error(stream.pos() + ' SMTPE offset hour value must' +
								' be part of 0-23.');
						}
						event.minutes = stream.readUint8();
						if (strictMode && 59 < event.minutes) {
							throw new Error(stream.pos() + ' SMTPE offset minutes value' +
								' must be part of 0-59.');
						}
						event.seconds = stream.readUint8();
						if (strictMode && 59 < event.seconds) {
							throw new Error(stream.pos() + ' SMTPE offset seconds value' +
								' must be part of 0-59.');
						}
						event.frames = stream.readUint8();
						if (strictMode && 30 < event.frames) {
							throw new Error(stream.pos() + ' SMTPE offset frames value must' +
								' be part of 0-30.');
						}
						event.subframes = stream.readUint8();
						if (strictMode && 99 < event.subframes) {
							throw new Error(stream.pos() + ' SMTPE offset subframes value' +
								' must be part of 0-99.');
						}
						return event;
					case EVENT_META_KEY_SIGNATURE:
						if (strictMode && 2 !== event.length) {
							throw new Error(stream.pos() + ' Bad metaevent length.');
						}
						event.key = stream.readUint8();
						if (strictMode && (-7 > event.key || 7 < event.key)) {
							throw new Error(stream.pos() + ' Bad metaevent length.');
						}
						event.scale = stream.readUint8();
						if (strictMode && 0 !== event.scale && 1 !== event.scale) {
							throw new Error(stream.pos() + ' Key signature scale value must' +
								' be 0 or 1.');
						}
						return event;
					case EVENT_META_TIME_SIGNATURE:
						if (strictMode && 4 !== event.length) {
							throw new Error(stream.pos() + ' Bad metaevent length.');
						}
						event.data = stream.readBytes(event.length);
						event.param1 = event.data[0];
						event.param2 = event.data[1];
						event.param3 = event.data[2];
						event.param4 = event.data[3];
            console.log('ts',event)
						return event;
					case EVENT_META_SEQUENCER_SPECIFIC:
						event.data = stream.readBytes(event.length);
						return event;
					default:
						if (strictMode) {
							throw new Error(stream.pos() + ' Unknown meta event type ' +
								'(' + event.subtype.toString(16) + ').');
						}
						event.data = stream.readBytes(event.length);
						return event;
					}
					// System events
				} else if (eventTypeByte === EVENT_SYSEX ||
					eventTypeByte === EVENT_DIVSYSEX) {
					event.type = eventTypeByte;
					event.length = stream.readVarInt();
					event.data = stream.readBytes(event.length);
					return event;
					// Unknown event, assuming it's system like event
				} else {
					if (strictMode) {
						throw new Error(stream.pos() + ' Unknown event type ' +
							eventTypeByte.toString(16) + ', Delta: ' + event.delta + '.');
					}
					event.type = eventTypeByte;
					event.badsubtype = stream.readVarInt();
					event.length = stream.readUint8();
					event.data = stream.readBytes(event.length);
					return event;
				}
				// MIDI eventsdestination[index++]
			} else {
				// running status
				if (0 === (eventTypeByte & 0x80)) {
					if (!(MIDIEventType)) {
						throw new Error(stream.pos() + ' Running status without previous event');
					}
					MIDIEventParam1 = eventTypeByte;
				} else {
					MIDIEventType = eventTypeByte >> 4;
					MIDIEventChannel = eventTypeByte & 0x0F;
					MIDIEventParam1 = stream.readUint8();
				}
				event.type = EVENT_MIDI;
				event.subtype = MIDIEventType;
				event.channel = MIDIEventChannel;
				event.param1 = MIDIEventParam1;
				switch (MIDIEventType) {
				case EVENT_MIDI_NOTE_OFF:
					event.param2 = stream.readUint8();
					return event;
				case EVENT_MIDI_NOTE_ON:
					event.param2 = stream.readUint8();

					// If velocity is 0, it's a note off event in fact
					if (!event.param2) {
						event.subtype = EVENT_MIDI_NOTE_OFF;
						event.param2 = 127; // Find a standard telling what to do here
					}
					return event;
				case EVENT_MIDI_NOTE_AFTERTOUCH:
					event.param2 = stream.readUint8();
					return event;
				case EVENT_MIDI_CONTROLLER:
					event.param2 = stream.readUint8();
					return event;
				case EVENT_MIDI_PROGRAM_CHANGE:
					return event;
				case EVENT_MIDI_CHANNEL_AFTERTOUCH:
					return event;
				case EVENT_MIDI_PITCH_BEND:
					event.param2 = stream.readUint8();
					return event;
				default:
					if (strictMode) {
						throw new Error(stream.pos() + ' Unknown MIDI event type ' +
							'(' + MIDIEventType.toString(16) + ').');
					}
					return event;
				}
			}
		},
	};
};

///...........................................

// MIDIFileHeader : Read and edit a MIDI header chunk in a given ArrayBuffer
///...........................................
// MIDIFileHeader : Read and edit a MIDI header chunk in a given ArrayBuffer
class MIDIFileHeader {
  // Static constants
  static HEADER_LENGTH = 14;
  static FRAMES_PER_SECONDS = 1;
  static TICKS_PER_BEAT = 2;
  constructor(buffer) {
    let a;

    if (!(buffer instanceof ArrayBuffer)) {
      throw Error('Invalid buffer received.');
    }
    this.datas = new DataView(buffer, 0, MIDIFileHeader.HEADER_LENGTH);
    // Reading MIDI header chunk
    if (!(
      'M' === String.fromCharCode(this.datas.getUint8(0)) &&
      'T' === String.fromCharCode(this.datas.getUint8(1)) &&
      'h' === String.fromCharCode(this.datas.getUint8(2)) &&
      'd' === String.fromCharCode(this.datas.getUint8(3)))) {
      throw new Error('Invalid MIDIFileHeader : MThd prefix not found');
    }
    // Reading chunk length
    if (6 !== this.datas.getUint32(4)) {
      throw new Error('Invalid MIDIFileHeader : Chunk length must be 6');
    }
  }
  // MIDI file format
  getFormat() {
    const format = this.datas.getUint16(8);
    if (0 !== format && 1 !== format && 2 !== format) {
      throw new Error('Invalid MIDI file : MIDI format (' + format + '),' +
        ' format can be 0, 1 or 2 only.');
    }
    return format;
  }
  // Number of tracks
  getTracksCount() {
    return this.datas.getUint16(10);
  }
  // Tick compute
  getTickResolution(tempo) {
    // Frames per seconds
    if (this.datas.getUint16(12) & 0x8000) {
      return 1000000 / (this.getSMPTEFrames() * this.getTicksPerFrame());
      // Ticks per beat
    }
    // Default MIDI tempo is 120bpm, 500ms per beat
    tempo = tempo || 500000;
    return tempo / this.getTicksPerBeat();
  }
  // Time division type
  getTimeDivision() {
    if (this.datas.getUint16(12) & 0x8000) {
      return MIDIFileHeader.FRAMES_PER_SECONDS;
    }
    return MIDIFileHeader.TICKS_PER_BEAT;
  }
  // Ticks per beat
  getTicksPerBeat() {
    var divisionWord = this.datas.getUint16(12);
    if (divisionWord & 0x8000) {
      throw new Error('Time division is not expressed as ticks per beat.');
    }
    return divisionWord;
  }
  // Frames per seconds
  getSMPTEFrames() {
    const divisionWord = this.datas.getUint16(12);
    let smpteFrames;

    if (!(divisionWord & 0x8000)) {
      throw new Error('Time division is not expressed as frames per seconds.');
    }
    smpteFrames = divisionWord & 0x7F00;
    if (-1 === [24, 25, 29, 30].indexOf(smpteFrames)) {
      throw new Error('Invalid SMPTE frames value (' + smpteFrames + ').');
    }
    return 29 === smpteFrames ? 29.97 : smpteFrames;
  }
  getTicksPerFrame() {
    const divisionWord = this.datas.getUint16(12);

    if (!(divisionWord & 0x8000)) {
      throw new Error('Time division is not expressed as frames per seconds.');
    }
    return divisionWord & 0x00FF;
  }
}














///...........................................
// MIDIFileTrack : Read and edit a MIDI track chunk in a given ArrayBuffer
///...........................................
// MIDIFileTrack : Read and edit a MIDI track chunk in a given ArrayBuffer
class MIDIFileTrack {
  constructor(buffer, start) {
    let a;
    let trackLength;

    if (!(buffer instanceof ArrayBuffer)) {
      throw new Error('Invalid buffer received.');
    }
    // Buffer length must size at least like an  empty track (8+3bytes)
    if (12 > buffer.byteLength - start) {
      throw new Error('Invalid MIDIFileTrack (0x' + start.toString(16) + ') :' +
        ' Buffer length must size at least 12bytes');
    }
    // Creating a temporary view to read the track header
    this.datas = new DataView(buffer, start, MIDIFileTrack.HDR_LENGTH);
    // Reading MIDI track header chunk
    if (!(
      'M' === String.fromCharCode(this.datas.getUint8(0)) &&
      'T' === String.fromCharCode(this.datas.getUint8(1)) &&
      'r' === String.fromCharCode(this.datas.getUint8(2)) &&
      'k' === String.fromCharCode(this.datas.getUint8(3)))) {
      throw new Error('Invalid MIDIFileTrack (0x' + start.toString(16) + ') :' +
        ' MTrk prefix not found');
    }
    // Reading the track length
    trackLength = this.getTrackLength();
    if (buffer.byteLength - start < trackLength) {
      throw new Error('Invalid MIDIFileTrack (0x' + start.toString(16) + ') :' +
        ' The track size exceed the buffer length.');
    }
    // Creating the final DataView
    this.datas = new DataView(buffer, start, MIDIFileTrack.HDR_LENGTH + trackLength);
    // Trying to find the end of track event
    if (!(
      0xFF === this.datas.getUint8(MIDIFileTrack.HDR_LENGTH + (trackLength - 3)) &&
      0x2F === this.datas.getUint8(MIDIFileTrack.HDR_LENGTH + (trackLength - 2)) &&
      0x00 === this.datas.getUint8(MIDIFileTrack.HDR_LENGTH + (trackLength - 1)))) {
      throw new Error('Invalid MIDIFileTrack (0x' + start.toString(16) + ') :' +
        ' No track end event found at the expected index' +
        ' (' + (MIDIFileTrack.HDR_LENGTH + (trackLength - 1)).toString(16) + ').');
    }
  }
  // Track length
  getTrackLength() {
    return this.datas.getUint32(4);
  }
  // Read track contents
  getTrackContent() {
    return new DataView(this.datas.buffer,
      this.datas.byteOffset + MIDIFileTrack.HDR_LENGTH,
      this.datas.byteLength - MIDIFileTrack.HDR_LENGTH);
  }
}

// Static constants
MIDIFileTrack.HDR_LENGTH = 8;





///...........................................


// MIDIFile : Read (and soon edit) a MIDI file in a given ArrayBuffer


function ensureArrayBuffer(buf) {
	if (buf) {
		if (buf instanceof ArrayBuffer) {
			return buf;
		}
		if (buf instanceof Uint8Array) {
			// Copy/convert to standard Uint8Array, because derived classes like
			// node.js Buffers might have unexpected data in the .buffer property.
			return new Uint8Array(buf).buffer;
		}
	}
	throw new Error('Unsupported buffer type, need ArrayBuffer or Uint8Array');
}

// Constructor
// Constructor
export class MIDIFile {
  constructor(buffer, strictMode) {
    var track;
    var curIndex;
    var i;
    var j;
    buffer = ensureArrayBuffer(buffer);
    // Minimum MIDI file size is a headerChunk size (14bytes)
    // and an empty track (8+3bytes)
    if (25 > buffer.byteLength) {
      throw new Error('A buffer of a valid MIDI file must have, at least, a' +
        ' size of 25bytes.');
    }
    // Reading header
    this.header = new MIDIFileHeader(buffer, strictMode);
    this.tracks = [];
    curIndex = MIDIFileHeader.HEADER_LENGTH;
    // Reading tracks
    for (i = 0, j = this.header.getTracksCount(); i < j; i++) {
      // Testing the buffer length
      if (strictMode && curIndex >= buffer.byteLength - 1) {
        throw new Error('Couldn\'t find datas corresponding to the track #' + i + '.');
      }
      // Creating the track object
      track = new MIDIFileTrack(buffer, curIndex, strictMode);
      this.tracks.push(track);
      // Updating index to the track end
      curIndex += track.getTrackLength() + 8;
    }
    // Testing integrity : curIndex should be at the end of the buffer
    if (strictMode && curIndex !== buffer.byteLength) {
      throw new Error('It seems that the buffer contains too much datas.');
    }
  }
  startNote(event, song) {
    var track = this.takeTrack(event.channel, song);
    track.notes.push({
      when: event.playTime / 1000,
      pitch: event.param1,
      duration: 0.0000001,
      slides: []
    });
  }
  closeNote(event, song) {
    var track = this.takeTrack(event.channel, song);
    for (var i = 0; i < track.notes.length; i++) {
      if (track.notes[i].duration == 0.0000001 //
        && track.notes[i].pitch == event.param1 //
        && track.notes[i].when <= event.playTime / 1000) {
        track.notes[i].duration = event.playTime / 1000 - track.notes[i].when;
        break;
      }
    }
  }
  addSlide(event, song) {
    var track = this.takeTrack(event.channel, song);
    for (var i = 0; i < track.notes.length; i++) {
      if (track.notes[i].duration == 0.0000001 //
        && track.notes[i].when < event.playTime / 1000) {
        //if (Math.abs(track.notes[i].shift) < Math.abs(event.param2 - 64) / 6) {
        //track.notes[i].shift = (event.param2 - 64) / 6;
        //console.log(event.param2-64);
        //}
        track.notes[i].slides.push({
          pitch: track.notes[i].pitch + (event.param2 - 64) / 6,
          when: event.playTime / 1000 - track.notes[i].when
        });
      }
    }
  }
  startDrum(event, song) {
    var beat = this.takeBeat(event.param1, song);
    beat.notes.push({
      when: event.playTime / 1000
    });
  }
  takeTrack(n, song) {
    for (var i = 0; i < song.tracks.length; i++) {
      if (song.tracks[i].n == n) {
        return song.tracks[i];
      }
    }
    var track = {
      n: n,
      notes: [],
      volume: 1,
      program: 0
    };
    song.tracks.push(track);
    return track;
  }
  takeBeat(n, song) {
    for (var i = 0; i < song.beats.length; i++) {
      if (song.beats[i].n == n) {
        return song.beats[i];
      }
    }
    var beat = {
      n: n,
      notes: [],
      volume: 1
    };
    song.beats.push(beat);
    return beat;
  }
  parseSong() {
    var song = {
      duration: 0,
      tracks: [],
      beats: []
    };
    var events = this.getMidiEvents();
    console.log(events);
    for (var i = 0; i < events.length; i++) {
      //console.log('		next',events[i]);
      if (song.duration < events[i].playTime / 1000) {
        song.duration = events[i].playTime / 1000;
      }
      if (events[i].subtype == EVENT_MIDI_NOTE_ON) {
        if (events[i].channel == 9) {
          if (events[i].param1 >= 35 && events[i].param1 <= 81) {
            this.startDrum(events[i], song);
          } else {
            console.log('wrong drum', events[i]);
          }
        } else {
          if (events[i].param1 >= 0 && events[i].param1 <= 127) {
            //console.log('start', events[i].param1);
            this.startNote(events[i], song);
          } else {
            console.log('wrong tone', events[i]);
          }
        }
      } else {
        if (events[i].subtype == EVENT_MIDI_NOTE_OFF) {
          if (events[i].channel != 9) {
            this.closeNote(events[i], song);
            //console.log('close', events[i].param1);
          }
        } else {
          if (events[i].subtype == EVENT_MIDI_PROGRAM_CHANGE) {
            if (events[i].channel != 9) {
              var track = this.takeTrack(events[i].channel, song);
              track.program = events[i].param1;
            } else {
              console.log('skip program for drums');
            }
          } else {
            if (events[i].subtype == EVENT_MIDI_CONTROLLER) {
              if (events[i].param1 == 7) {
                if (events[i].channel != 9) {
                  var track = this.takeTrack(events[i].channel, song);
                  track.volume = events[i].param2 / 127 || 0.000001;
                  //console.log('volume', track.volume,'for',events[i].channel);
                }
              } else {
                //console.log('controller', events[i]);
              }
            } else {
              if (events[i].subtype == EVENT_MIDI_PITCH_BEND) {
                //console.log('	bend', events[i].channel, events[i].param1, events[i].param2);
                this.addSlide(events[i], song);
              } else {
                console.log('unknown', events[i].channel, events[i]);
              };
            }
          }
        }
      }
    }
    return song;
  }
  // Events reading helpers
  getEvents(type, subtype) {
    var events;
    var event;
    var playTime = 0;
    var filteredEvents = [];
    var format = this.header.getFormat();
    var tickResolution = this.header.getTickResolution();
    var i;
    var j;
    var trackParsers;
    var smallestDelta;

    // Reading events
    // if the read is sequential
    if (1 !== format || 1 === this.tracks.length) {
      for (i = 0, j = this.tracks.length; i < j; i++) {
        // reset playtime if format is 2
        playTime = (2 === format && playTime ? playTime : 0);
        events = midiEventsCreateParser(this.tracks[i].getTrackContent(), 0, false);
        // loooping through events
        event = events.next();
        while (event) {
          playTime += event.delta ? (event.delta * tickResolution) / 1000 : 0;
          if (event.type === EVENT_META) {
            // tempo change events
            if (event.subtype === EVENT_META_SET_TEMPO) {
              tickResolution = this.header.getTickResolution(event.tempo);
            }
          }
          // push the asked events
          if (((!type) || event.type === type) &&
            ((!subtype) || (event.subtype && event.subtype === subtype))) {
            event.playTime = playTime;
            filteredEvents.push(event);
          }
          event = events.next();
        }
      }
      // the read is concurrent
    } else {
      trackParsers = [];
      smallestDelta = -1;

      // Creating parsers
      for (i = 0, j = this.tracks.length; i < j; i++) {
        trackParsers[i] = {};
        trackParsers[i].parser = midiEventsCreateParser(
          this.tracks[i].getTrackContent(), 0, false);
        trackParsers[i].curEvent = trackParsers[i].parser.next();
      }
      // Filling events
      do {
        smallestDelta = -1;
        // finding the smallest event
        for (i = 0, j = trackParsers.length; i < j; i++) {
          if (trackParsers[i].curEvent) {
            if (-1 === smallestDelta || trackParsers[i].curEvent.delta <
              trackParsers[smallestDelta].curEvent.delta) {
              smallestDelta = i;
            }
          }
        }
        if (-1 !== smallestDelta) {
          // removing the delta of previous events
          for (i = 0, j = trackParsers.length; i < j; i++) {
            if (i !== smallestDelta && trackParsers[i].curEvent) {
              trackParsers[i].curEvent.delta -= trackParsers[smallestDelta].curEvent.delta;
            }
          }
          // filling values
          event = trackParsers[smallestDelta].curEvent;
          playTime += (event.delta ? (event.delta * tickResolution) / 1000 : 0);
          if (event.type === EVENT_META) {
            // tempo change events
            if (event.subtype === EVENT_META_SET_TEMPO) {
              tickResolution = this.header.getTickResolution(event.tempo);
            }
          }
          // push midi events
          if (((!type) || event.type === type) &&
            ((!subtype) || (event.subtype && event.subtype === subtype))) {
            event.playTime = playTime;
            event.track = smallestDelta;
            filteredEvents.push(event);
          }
          // getting next event
          trackParsers[smallestDelta].curEvent = trackParsers[smallestDelta].parser.next();
        }
      } while (-1 !== smallestDelta);
    }
    return filteredEvents;
  }
  getMidiEvents() {
    return this.getEvents(EVENT_MIDI);
  }
  getLyrics() {
    var events = this.getEvents(EVENT_META);
    var texts = [];
    var lyrics = [];
    var event;
    var i;
    var j;

    for (i = 0, j = events.length; i < j; i++) {
      event = events[i];
      // Lyrics
      if (event.subtype === EVENT_META_LYRICS) {
        lyrics.push(event);
        // Texts
      } else if (event.subtype === EVENT_META_TEXT) {
        // Ignore special texts
        if ('@' === String.fromCharCode(event.data[0])) {
          if ('T' === String.fromCharCode(event.data[1])) {
            // console.log('Title : ' + event.text.substring(2));
          } else if ('I' === String.fromCharCode(event.data[1])) {
            // console.log('Info : ' + event.text.substring(2));
          } else if ('L' === String.fromCharCode(event.data[1])) {
            // console.log('Lang : ' + event.text.substring(2));
          }
          // karaoke text follows, remove all previous text
        } else if (0 === String.fromCharCode.apply(String, event.data).indexOf('words')) {
          texts.length = 0;
          // console.log('Word marker found');
          // Karaoke texts
          // If playtime is greater than 0
        } else if (0 !== event.playTime) {
          texts.push(event);
        }
      }
    }
    // Choosing the right lyrics
    if (2 < lyrics.length) {
      texts = lyrics;
    } else if (!texts.length) {
      texts = [];
    }
    // Convert texts and detect encoding
    try {
      texts.forEach(function (event) {
        event.text = decodeUTF8(event.data, 0, event.length, true);
      });
    } catch (e) {
      texts.forEach(function (event) {
        event.text = event.data.map(function (c) {
          return String.fromCharCode(c);
        }).join('');
      });
    }
    return texts;
  }
  // Basic events reading
  getTrackEvents(index) {
    var event;
    var events = [];
    var parser;
    if (index > this.tracks.length || 0 > index) {
      throw Error('Invalid track index (' + index + ')');
    }
    parser = midiEventsCreateParser(
      this.tracks[index].getTrackContent(), 0, false);
    event = parser.next();
    do {
      events.push(event);
      event = parser.next();
    } while (event);
    return events;
  }
  // Retrieve the content in a buffer
  getContent() {
    var bufferLength;
    var destination;
    var origin;
    var i;
    var j;
    var k;
    var l;
    var m;
    var n;

    // Calculating the buffer content
    // - initialize with the header length
    bufferLength = MIDIFileHeader.HEADER_LENGTH;
    // - add tracks length
    for (i = 0, j = this.tracks.length; i < j; i++) {
      bufferLength += this.tracks[i].getTrackLength() + 8;
    }
    // Creating the destination buffer
    destination = new Uint8Array(bufferLength);
    // Adding header
    origin = new Uint8Array(this.header.datas.buffer,
      this.header.datas.byteOffset,
      MIDIFileHeader.HEADER_LENGTH);
    for (i = 0, j = MIDIFileHeader.HEADER_LENGTH; i < j; i++) {
      destination[i] = origin[i];
    }
    // Adding tracks
    for (k = 0, l = this.tracks.length; k < l; k++) {
      origin = new Uint8Array(this.tracks[k].datas.buffer,
        this.tracks[k].datas.byteOffset,
        this.tracks[k].datas.byteLength);
      for (m = 0, n = this.tracks[k].datas.byteLength; m < n; m++) {
        destination[i++] = origin[m];
      }
    }
    return destination.buffer;
  }
}

// Exports Track/Header constructors
MIDIFile.Header = MIDIFileHeader;
MIDIFile.Track = MIDIFileTrack;

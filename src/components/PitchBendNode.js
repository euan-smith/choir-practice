/**
 * 
 * INPUT ->  
 * 
 * 
 */
export default class PitchBendNode extends GainNode{
  constructor(ac){
    super(ac);
    this._delay1 = new DelayNode(ac);
    this._delay2 = new DelayNode(ac);

    this._saw1 = new OscillatorNode(ac,{type:'sawtooth',frequency:25});
    this._saw_offset1 = new ConstantSourceNode(ac);
    this._saw_gain1 = new GainNode(ac);
    this._saw2 = new OscillatorNode(ac,{type:'sawtooth',frequency:25});
    this._saw_offset2 = new ConstantSourceNode(ac);
    this._saw_gain2 = new GainNode(ac);

    this._gain1 = new GainNode(ac);
    this._gain2 = new GainNode(ac);

    this._fade1 = new OscillatorNode(ac,{type:'triangle',frequency:12.5});
    this._fade2 = new OscillatorNode(ac,{type:'triangle',frequency:12.5});

    this._saw1.connect(this._saw_gain1);
    this._saw_offset1.connect(this._saw_gain1);
    this._saw_gain1.gain.value=0;
    this._saw_gain1.connect(this._delay1.delayTime);
    this._saw2.connect(this._saw_gain2);
    this._saw_offset2.connect(this._saw_gain2);
    this._saw_gain2.gain.value=0;
    this._saw_gain2.connect(this._delay2.delayTime);
    this._saw1.start(ac.currentTime);
    this._saw2.start(ac.currentTime+0.01);


    this._fade1.connect(this._gain1.gain);
    this._fade2.connect(this._gain2.gain);
    this._fade1.start(ac.currentTime);
    this._fade2.start(ac.currentTime+0.04);

    super.connect.call(this, this._delay1).connect(this._gain1);
    super.connect.call(this, this._delay2).connect(this._gain2);
    // this._saw1.connect(this._delay1.delayTime)
  }
  connect(node){
    this._gain1.connect(node);
    this._gain2.connect(node);
  }
  disconnect(node){
    this._gain1.disconnect(node);
    this._gain2.disconnect(node);
  }
}
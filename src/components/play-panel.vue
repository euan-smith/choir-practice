<script>
export default {
  data(){
    return{
      expanded:false,
      metronome:false,
      playing:false,

    }
  }

}
</script>
<template>
  <div class=play-panel :class={expanded} >
    <div class=panel-container>
      <svg class="piano"></svg>
      <svg class="met" viewBox="-128 -128 768 768" @click="toggleMetOn">
        <path :fill="metronome ? '#eee' : '#555'" d="m 463.84136,154.89339 c -6.42,-6.42 -16.83,-6.42 -23.251,0 -71.31197,70.35135 -136.61146,132.25426 -208.741,199.7 h -105.82 c 23.35495,-140.1063 67.13099,-217.59716 120.727,-318.357996 0.86,-0.803 2.209,-0.801 3.067,-10e-4 20.50653,37.383983 48.51152,88.812606 72.26194,147.190756 1.186,9.002 12.2214,17.4338 23.3242,11.71391 9.002,-1.186 11.1594,-12.2324 9.9724,-21.2344 -21.69905,-53.89113 -30.43965,-85.078342 -83.11454,-161.702266 -13.446,-12.55299965 -34.508,-12.55699965 -47.954,10e-4 C 126.80877,149.30021 96.099465,324.74626 77.091365,474.25139 c -2.829,21.473 13.907,40.535 35.543995,40.535 h 271.311 c 21.661,0 38.373,-19.087 35.544,-40.535 -8.26237,-52.34207 -14.88466,-100.7074 -24.7871,-157.02622 -6.40949,-11.78839 -8.3911,-14.9907 -17.4031,-13.8037 -9.002,1.186 -13.59751,8.0528 -12.41051,17.0548 l 5.66371,34.11712 h -83.159 c 64.35441,-63.86663 129.29308,-130.29894 176.448,-176.449 6.42,-6.42 6.42,-16.83 -10e-4,-23.251 z m -88.956,232.582 12.004,91.074 c 0.112,0.846 -0.148,1.701 -0.708,2.341 -0.566,0.645 -1.38,1.014 -2.235,1.014 h -271.311 c -0.855,0 -1.668,-0.369 -2.231,-1.011 -0.564,-0.643 -0.824,-1.499 -0.712,-2.347 l 12.003,-91.072 h 253.19 z" />
      </svg>
      <svg class="record"></svg>
      <svg class="reset" @click=reset fill="#eee" viewBox="0 0 48 48"><path d="M26 18.5v-3h6.5V6h3v9.5H42v3ZM32.5 42V21.5h3V42Zm-20 0v-9H6v-3h16v3h-6.5v9Zm0-15V6h3v21Z"/></svg>
      <svg class="back" @click=backToStart fill="#eee" viewBox="0 0 48 48"><path d="M11 36V12h3v24Zm26 0L19.7 24 37 12Z"/></svg>
      <svg class="pre-play" viewBox="-2 -2 28 28" @click.exact="prePlay()" @click.ctrl="prePlay(true)">
        <path :fill="playing?'#555':'#eee'" d="m 8.9838564,1.5166215 v 2 h 5.9999996 v -2 z m 2.9999996,3 c -4.9699996,0 -8.9999996,4.0299999 -8.9999996,8.9999995 0,4.97 4.02,9 8.9999996,9 4.98,0 9,-4.03 9,-9 0,-2.12 -0.740703,-4.0693745 -1.970703,-5.6093745 l 1.419922,-1.421875 c -0.43,-0.51 -0.900156,-0.9882031 -1.410156,-1.4082031 l -1.419922,1.4199219 c -1.55,-1.24 -3.499141,-1.9804688 -5.619141,-1.9804688 z m -1.789062,4.7480469 6,4.4999996 -6,4.5 z" />
      </svg>
      <div class=toggle @click="expanded=!expanded" >
        <svg class=toggle viewBox="0 8 48 32" :style="`transform:rotate(${expanded?90:-90}deg)`"><path d="m24 30.75-12-12 2.15-2.15L24 26.5l9.85-9.85L36 18.8Z"/></svg>
      </div>
      <svg class="play" viewBox="0 0 48 48" @click.exact="playing?pause():play()" @click.ctrl="playing?pause():play(true)"><path :d="playing?'M27.4 35.4V12.6h8v22.8Zm-14.8 0V12.6h8.05v22.8Z':'M16 37.85v-28l22 14Z'"/></svg>

      <label class=timeline>
        <input class=time ref=time type=range min=0 max=1 step=0.001 value=0 @input="setTime">
      </label>
    </div>
  </div>
</template>
<style scoped>
  /* *{
    border:1px solid red;
  } */
  svg{
    flex:0 0 48px;
    height:48px;
    margin-top:4px;
  }
  svg.toggle{
    flex:0 0 24px;
    height:48px;
    fill:white;
    transition:transform linear 0.5s;
  }
  svg.play{
    flex:0 0 56px;
    height:56px;
    margin-top:0;
    fill:white;
  }
  .play-panel{
    position:relative;
    overflow:hidden;
    background:#333;
  }
  .panel-container{
    position:absolute;
    width:calc(100% + 48px * 6);
    height:100%;
    right:0;
    transition: width linear 0.5s;
    display:flex;
    flex-direction:row;
  }
  .timeline{
    flex:1 1 0;
    padding-top:10px;
  }
  .expanded>.panel-container{
    width:100%;
  }


  input.time{
  -webkit-appearance: none;
  width:calc( 100% - 8px);
  height:32px;
  background:#0000;
}

input.time::-moz-range-thumb{
  height:32px;
  width:16px;
  border-radius: 12px;
  border:1px solid #111;
  background:#aaf;
  cursor: pointer;
  background: linear-gradient(90deg, #88d, #88d 20%, #aaf 40%, #88d 40%, #88d 60%, #66b 60%, #88d 80%, #88d 100%)
}
input.time::-webkit-slider-thumb {
  box-shadow: none;
  transform:translate(0,-10px);
  height:32px;
  width:16px;
  border-radius: 12px;
  border:1px solid #111;
  background:#aaf;
  cursor: pointer;
  -webkit-appearance: none;
  background: linear-gradient(90deg, #88d, #88d 20%, #aaf 40%, #88d 40%, #88d 60%, #66b 60%, #88d 80%, #88d 100%)
}
input.time::-ms-thumb {
  height:32px;
  width:16px;
  border-radius: 12px;
  border:1px solid #111;
  background:#aaf;
  cursor: pointer;
  background: linear-gradient(90deg, #88d, #88d 20%, #aaf 40%, #88d 40%, #88d 60%, #66b 60%, #88d 80%, #88d 100%)
}

input.time::-moz-range-track {
  width: 100%;
  height: 8px;
  cursor: pointer;
  box-shadow: none;
  background: #111;
  border-radius: 12px;
  border: none;
}

input.time::-webkit-slider-runnable-track {
  -webkit-appearance: none;
  width: 100%;
  height: 8px;
  cursor: pointer;
  box-shadow: none;
  background: #111;
  border-radius: 12px;
  border: none;
}
input.time:focus::-webkit-slider-runnable-track {
  background: #111;
}

input.time::-ms-track {
  width: 100%;
  height: 8px;
  cursor: pointer;
  box-shadow: none;
  background: #111;
  border-radius: 12px;
  border: none;
}
input.time::-ms-fill-lower {
  background: #111;
  border: none;
  border-radius: 12px;
  box-shadow: none;
}
input.time::-ms-fill-upper {
  background: #111;
  border: none;
  border-radius: 12px;
  box-shadow: none;
}
input.time:focus::-ms-fill-lower {
  background: #111;
}
input.time:focus::-ms-fill-upper {
  background: #111;
}
</style>
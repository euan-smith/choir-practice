<script>
  export default {
    props:{
      value:{
        type:[Number,String],
        default:1.0
      },
      thumb:{
        type:String,
      },
      min:[Number,String],
      max:[Number,String],
      step:[Number,String]
    },
    emits:['input'],
    data(){
      return{
        width:0,
        height:0,
        ticker:null
      }
    },
    methods:{
      input(e){
        e.preventDefault();
        this.$emit('input',e);
      },
      resize(){
        const {outer} = this.$refs;
        this.width = outer.offsetWidth;
        this.height = outer.offsetHeight;
      },
      setTo(v){
        this.$refs.slider.value = v;
      }
    },
    mounted(){
      window.addEventListener('resize',this.resize);
      this.ticker = setInterval(this.resize,1000);
      setTimeout(this.resize);
    },
    beforeUnmount(){
      window.removeEventListener('resize',this.resize);
      clearInterval(this.ticker);
    },
    computed:{
      style(){
        const {height,width} = this;
        const backgroundImage = 'repeating-linear-gradient(90deg, #555, #555 1px,#333 1px, #333 calc(10% - 0.08px))';
        return height>width ? {
          width:height+'px',
          height:width+'px',
          transform:'rotate(270deg)',
          transformOrigin:height/2+'px '+height/2+'px',
          backgroundImage
        } : {
          width:width+'px',
          height:height+'px',
          backgroundImage
        }
      }
    }
  }
</script>
<template>
  <div ref="outer" class="outer">
    <input ref=slider type="range" :max="max" :min="min" :step="step" :style="style" :class="thumb" @input="input">
  </div>
</template>
<style scoped>
  .outer{
    position:relative;
  }
  input{
    position:absolute;
    top:0;
    left:0;
    border:none;
    background:#333 no-repeat;
    background-size:calc( 100% - 30px) 100%;
    background-position:center;
    -webkit-appearance: none;
    -webkit-user-drag: none;
  }
  input.vol:focus {
  outline: none;
  border:none;
}
input::-webkit-slider-runnable-track {
  -webkit-appearance: none;
  width: 100%;
  height: 8px;
  cursor: pointer;
  box-shadow: none;
  background: #111;
  border-radius: 0;
  border: none;
}
input:focus::-webkit-slider-runnable-track {
  background: #111;
}
input::-moz-range-track {
  width: 100%;
  height: 8px;
  cursor: pointer;
  box-shadow: none;
  background: #111;
  border-radius: 0;
  border: none;
}
input::-ms-track {
  width: 100%;
  height: 8px;
  cursor: pointer;
  background: transparent;
  border-color: transparent;
  color: transparent;
}
input::-ms-fill-lower {
  background: #111;
  border: none;
  border-radius: 0;
  box-shadow: none;
}
input::-ms-fill-upper {
  background: #111;
  border: none;
  border-radius: 0;
  box-shadow: none;
}
input:focus::-ms-fill-lower {
  background: #111;
}
input:focus::-ms-fill-upper {
  background: #111;
}

input::-webkit-slider-thumb {
  -webkit-appearance: none;
  transform: translate(0,2.5px);
  box-shadow: none;
  border: none;
  height: 25px;
  width: 30px;
  border-radius: 3px;
  background: linear-gradient(90deg, #555 0%, #555 15%, #aaa 16%, #888 17%, #666 47%, #bbb 48%, #bbb 52%, #666 53%, #444 83%, #aaa 64%, #888 65%, #888 100%);
  cursor: pointer;
  -webkit-appearance: none;
  margin-top: -11.5px;
}
input::-moz-range-thumb {
  box-shadow: none;
  border: none;
  height: 25px;
  width: 30px;
  border-radius: 3px;
  background: linear-gradient(90deg, #555 0%, #555 15%, #aaa 16%, #888 17%, #666 47%, #bbb 48%, #bbb 52%, #666 53%, #444 83%, #aaa 64%, #888 65%, #888 100%);
  cursor: pointer;
}
input::-ms-thumb {
  margin-top: 1px;
  border: none;
  height: 25px;
  width: 30px;
  border-radius: 3px;
  background: linear-gradient(90deg, #555 0%, #555 15%, #aaa 16%, #888 17%, #666 47%, #bbb 48%, #bbb 52%, #666 53%, #444 83%, #aaa 64%, #888 65%, #888 100%);
  cursor: pointer;
}

input.red::-webkit-slider-thumb {
  background: linear-gradient(90deg, #744 0%, #744 15%, #c99 16%, #a77 17%, #855 47%, #daa 48%, #daa 52%, #855 53%, #633 83%, #c99 64%, #a77 65%, #a77 100%);
}
input.red::-moz-range-thumb {
  background: linear-gradient(90deg, #744 0%, #744 15%, #c99 16%, #a77 17%, #855 47%, #daa 48%, #daa 52%, #855 53%, #633 83%, #c99 64%, #a77 65%, #a77 100%);
}
input.red::-ms-thumb {
  background: linear-gradient(90deg, #744 0%, #744 15%, #c99 16%, #a77 17%, #855 47%, #daa 48%, #daa 52%, #855 53%, #633 83%, #c99 64%, #a77 65%, #a77 100%);
}

input.blue::-webkit-slider-thumb {
  background: linear-gradient(90deg, #447 0%, #447 15%, #99c 16%, #77a 17%, #558 47%, #aad 48%, #aad 52%, #558 53%, #336 83%, #99c 64%, #77a 65%, #77a 100%);
}
input.blue::-moz-range-thumb {
  background: linear-gradient(90deg, #447 0%, #447 15%, #99c 16%, #77a 17%, #558 47%, #aad 48%, #aad 52%, #558 53%, #336 83%, #99c 64%, #77a 65%, #77a 100%);
}
input.blue::-ms-thumb {
  background: linear-gradient(90deg, #447 0%, #447 15%, #99c 16%, #77a 17%, #558 47%, #aad 48%, #aad 52%, #558 53%, #336 83%, #99c 64%, #77a 65%, #77a 100%);
}

</style>

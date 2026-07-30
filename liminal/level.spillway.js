/* =====================================================================
   LIMINAL — level.spillway.js
   Level 94 · "The Spillway"

   Outside, but not outdoors. A concrete flood channel forty metres wide
   between two dam faces that go up past where the fog gives out. A film
   of water comes down the steps at walking pace and has been doing that
   for a while.

   The channel is straight and stepped, so the walk is always downhill
   and the far end is always the same distance away.
   ===================================================================== */
(function(){
"use strict";

const TXX=LIMINAL.tex;

function base(c,S,seed,rgb,amt,scale,oct,warp){
  const per=Math.max(2,S/scale);
  TXX.pixels(c,(x,y)=>{
    let sx=x/scale, sy=y/scale;
    if(warp){
      sx+=TXX.fbm(x/(scale*3),y/(scale*3),per/3,seed+91,2)*warp;
      sy+=TXX.fbm(x/(scale*3)+5,y/(scale*3)+5,per/3,seed+92,2)*warp;
    }
    const n=TXX.fbm(sx,sy,per,seed,oct);
    const k=1+(n-0.5)*amt;
    return [rgb[0]*k,rgb[1]*k,rgb[2]*k];
  });
}

/* board-marked shuttered concrete: the timber grain of the formwork, tie
   holes on a grid, and a lift joint where one pour met the next */
function shuttered(c,S,rng,TX,rgb,boards,ties){
  base(c,S,7,rgb,0.16,S/9,4,0.35);
  const bh=S/boards;
  for(let i=0;i<boards;i++){
    const y=i*bh;
    const k=1+(TX.ihash(i,4,11)-0.5)*0.10;
    c.fillStyle=`rgba(${(rgb[0]*k)|0},${(rgb[1]*k)|0},${(rgb[2]*k)|0},0.55)`;
    c.fillRect(0,y+1,S,bh-2);
    // the ridge each board leaves
    c.fillStyle='rgba(255,255,255,0.10)';c.fillRect(0,y,S,Math.max(1,S/380));
    c.fillStyle='rgba(0,0,0,0.22)';c.fillRect(0,y+bh-Math.max(1,S/300),S,Math.max(1,S/300));
    // grain along the board
    c.globalAlpha=0.10;
    for(let g=0;g<7;g++){
      const gy=y+bh*(0.12+g*0.13);
      c.strokeStyle=g%2?'#000':'#fff';c.lineWidth=0.7;
      c.beginPath();
      for(let x=0;x<=S;x+=S/12) c.lineTo(x,gy+TX.fbm(x/40,i*3+g,S/40,17,2)*bh*0.16);
      c.stroke();
    }
    c.globalAlpha=1;
  }
  // form-tie holes, recessed and rust-stained
  for(let j=0;j<ties;j++)for(let i=0;i<ties;i++){
    const x=(i+0.5)*S/ties, y=(j+0.5)*S/ties, r=S*0.011;
    TX.blot(c,x,y,r*4,[[0,'rgba(120,72,40,0.30)'],[0.4,'rgba(120,72,40,0.12)'],[1,'rgba(120,72,40,0)']]);
    c.fillStyle='rgba(40,40,38,0.75)';c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();
    c.fillStyle='rgba(255,255,255,0.10)';c.beginPath();c.arc(x,y-r*0.35,r*0.8,0,Math.PI*2);c.fill();
  }
  TX.grain(c,0.045,1.3,23);
}

const MATS={
  wallCon:{tile:0.13,bump:0.55,specular:0.05,shininess:16,draw(c,S,rng,TX){
    shuttered(c,S,rng,TX,[136,137,133],7,3);
    // long weathering runs from everything that ever held water
    TX.streaks(c,rng,20,TX.rgba(96,98,94),6,0.24);
    TX.streaks(c,rng,8,TX.rgba(168,170,164),4,0.14);
    TX.stains(c,rng,4,TX.rgba(104,110,100),0.28,0.10,0.30);
  }},
  wallStain:{tile:0.13,bump:0.55,specular:0.09,shininess:20,draw(c,S,rng,TX){
    shuttered(c,S,rng,TX,[118,120,116],7,3);
    c.globalCompositeOperation='multiply';
    TX.stains(c,rng,5,TX.rgba(78,92,80),0.55,0.14,0.40);
    TX.streaks(c,rng,26,TX.rgba(58,70,58),7,0.34);
    c.globalCompositeOperation='source-over';
    TX.stains(c,rng,3,TX.rgba(150,138,102),0.22,0.06,0.18);
  }},
  chanFloor:{tile:0.22,bump:0.4,specular:0.30,shininess:60,draw(c,S,rng,TX){
    base(c,S,29,[122,126,124],0.16,S/10,4,0.25);
    // wet, so it is darker in the low places and algal in the corners
    c.globalCompositeOperation='multiply';
    TX.stains(c,rng,7,TX.rgba(74,88,80),0.5,0.08,0.30);
    c.globalCompositeOperation='source-over';
    // brush finish, transverse
    c.globalAlpha=0.08;
    for(let y=0;y<S;y+=2){c.fillStyle=rng()>0.5?'#fff':'#000';c.fillRect(0,y,S,1);}
    c.globalAlpha=1;
    TX.grain(c,0.05,1.2,31);
  }},
  weir:{tile:0.5,bump:0.35,specular:0.45,shininess:90,draw(c,S,rng,TX){
    base(c,S,37,[150,152,148],0.12,S/8,3,0);
    c.fillStyle='rgba(60,72,64,0.35)';c.fillRect(0,S*0.62,S,S*0.38);
    TX.streaks(c,rng,18,TX.rgba(88,102,92),3,0.28);
    TX.grain(c,0.04,1.2,41);
  }},
  water:{tile:0.30,blend:true,alpha:0.44,wave:1.9,specular:1.0,shininess:190,fresnel:0.5,bump:0,
    scroll:[0,0.055],draw(c,S,rng,TX){
      base(c,S,43,[104,124,126],0.55,S/16,5,0.7);
      c.globalCompositeOperation='screen';
      TX.streaks(c,rng,30,TX.rgba(190,214,214),3,0.30);
      c.globalCompositeOperation='source-over';
      TX.grain(c,0.06,2,47);
    }},
  foam:{tile:0.6,blend:true,alpha:0.55,emissive:[0.35,0.38,0.40],specular:0,scroll:[0,0.10],
    draw(c,S,rng,TX){
      TXX.pixels(c,(x,y)=>{
        const n=TX.fbm(x/13,y/26,Math.max(2,S/13),53,4);
        const v=Math.pow(TX.clamp((n-0.42)*3.2,0,1),1.4)*255;
        return [v,v*1.02,v*1.02];
      });
    }},
  steel:{tile:0.7,bump:0.3,specular:0.55,shininess:120,draw(c,S,rng,TX){
    base(c,S,59,[104,106,108],0.14,S/6,3,0);
    TX.stains(c,rng,6,TX.rgba(126,74,40),0.45,0.04,0.16);
    TX.streaks(c,rng,12,TX.rgba(110,64,34),3,0.22);
    TX.grain(c,0.04,1,61);
  }},
  paintYel:{tile:0.7,bump:0.25,specular:0.3,shininess:70,draw(c,S,rng,TX){
    base(c,S,67,[176,150,52],0.16,S/7,3,0.2);
    // worn back to the metal in patches
    c.globalCompositeOperation='destination-out';
    TX.stains(c,rng,8,'rgba(0,0,0,ALPHA)',0.6,0.03,0.14);
    c.globalCompositeOperation='destination-over';
    TXX.fill(c,'#5c5e60');
    c.globalCompositeOperation='source-over';
    TX.grain(c,0.05,1,71);
  }},
  mesh:{tile:1.0,bump:0.4,specular:0.4,shininess:90,alpha:1,draw(c,S,rng,TX){
    TXX.fill(c,'#3a3c3d');
    c.strokeStyle='rgba(150,152,150,0.9)';c.lineWidth=Math.max(2,S/40);
    TX.grid(c,S/5,'rgba(150,152,150,0.9)',c.lineWidth,0);
    c.strokeStyle='rgba(30,32,32,0.7)';c.lineWidth=Math.max(1,S/90);
    TX.grid(c,S/5,'rgba(30,32,32,0.7)',c.lineWidth,S/40);
    TX.grain(c,0.05,1,73);
  }},
  lamp:{tile:1.0,emissive:[3.0,2.05,0.95],specular:0,draw(c,S,rng,TX){
    const g=c.createRadialGradient(S/2,S/2,0,S/2,S/2,S*0.6);
    g.addColorStop(0,'#fff3d4');g.addColorStop(0.45,'#ffcf7a');g.addColorStop(1,'#b06a1c');
    c.fillStyle=g;c.fillRect(0,0,S,S);
  }},
  sky:{tile:0.02,emissive:[0.62,0.65,0.70],specular:0,draw(c,S,rng,TX){
    base(c,S,79,[196,201,208],0.22,S/4,4,0.6);
    TX.stains(c,rng,6,TX.rgba(150,158,170),0.35,0.20,0.55);
    TX.grain(c,0.03,2,83);
  }},
  tunnel:{tile:1,specular:0,draw(c){ TXX.fill(c,'#050607'); }}
};

/* ==================================================================== level */
LIMINAL.registerLevel({
  id:'spillway',
  name:'Level 94',
  subtitle:'The Spillway',
  badge:'vast',
  accent:'#8fa3a6',
  tags:['megastructure','concrete','flowing water','overcast','outside'],
  size:'44 × 260 × 120 m',
  lighting:'flat overcast · sodium gantries',
  defaultSeed:94,
  description:'A stepped flood channel between two dam faces. The walls are a hundred and '+
              'twenty metres of board-marked concrete and the sky is a lid. Water comes down '+
              'the steps at exactly the speed you walk, so it never overtakes you and you never '+
              'catch it up.',

  preview(g,w,h){
    const grd=g.createLinearGradient(0,0,0,h);
    grd.addColorStop(0,'#c3c9d1');grd.addColorStop(0.34,'#9aa3a8');grd.addColorStop(1,'#5a6163');
    g.fillStyle=grd;g.fillRect(0,0,w,h);
    // two converging walls
    const hz=h*0.30;
    g.fillStyle='#8b8f8c';
    g.beginPath();g.moveTo(0,0);g.lineTo(w*0.30,hz);g.lineTo(w*0.30,h);g.lineTo(0,h);g.closePath();g.fill();
    g.fillStyle='#7c807d';
    g.beginPath();g.moveTo(w,0);g.lineTo(w*0.70,hz);g.lineTo(w*0.70,h);g.lineTo(w,h);g.closePath();g.fill();
    // piers
    g.fillStyle='rgba(60,64,62,0.35)';
    for(let i=1;i<7;i++){
      const t=i/7, x=w*0.30*(1-t*0.98), x2=w-x;
      g.fillRect(x-2,hz*(1-t*0.0)+ (h-hz)*0*1,4,h);
      g.fillRect(x2-2,hz,4,h);
    }
    // stepped channel floor
    for(let i=0;i<9;i++){
      const t=i/9, y=hz+(h-hz)*Math.pow(t,1.7);
      const iw=w*0.40*(0.06+t*0.94);
      g.fillStyle=`rgba(${120+i*6},${132+i*6},${132+i*6},1)`;
      g.fillRect(w*0.5-iw/2,y,iw,(h-hz)*0.06+2);
      g.fillStyle=`rgba(206,224,226,${0.18+t*0.30})`;
      g.fillRect(w*0.5-iw/2,y,iw,3);
    }
    const v=g.createRadialGradient(w*0.5,hz,0,w*0.5,hz,w*0.75);
    v.addColorStop(0,'rgba(255,255,255,0.25)');v.addColorStop(1,'rgba(30,36,38,0.55)');
    g.fillStyle=v;g.fillRect(0,0,w,h);
  },

  /* ------------------------------------------------------------------ build */
  build(W,ctx){
    const TX=ctx.TX, rng=W.rng;
    const M={}; for(const k in MATS) M[k]=W.material(k,MATS[k]);

    const CW=40;              // channel width
    const LEN=260;            // channel length, running +z
    const WALL=120;           // wall height
    const STEP=0.38;          // one weir — under the player's 0.42 m step limit
    const RUN=13;             // metres of flat channel per step
    const N=Math.floor(LEN/RUN);
    const yAt=(z)=>-Math.floor(Math.max(0,Math.min(LEN-0.001,z))/RUN)*STEP;

    W.spawn(CW*0.5,0.05,4,0);
    W.setStepMaterial(()=>'water');

    /* ============================================== channel floor, stepped */
    for(let i=0;i<N;i++){
      const z0=i*RUN, z1=z0+RUN, y=-i*STEP;
      for(let x=0;x<CW;x+=10) W.floor(x,z0,x+10,z1,y,M.chanFloor,{uvScale:1,tess:2.5});
      W.solid(0,y-1.6,z0,CW,1.6,RUN);
      // the weir at the head of each run
      if(i>0){
        W.quad([CW,y+STEP,z0],[0,y+STEP,z0],[0,y,z0],[CW,y,z0],M.weir,{uvScale:1,tess:2});
        W.box(0,y,z0-0.30,CW,STEP+0.06,0.32,M.weir,{uvScale:1,solid:false,tess:2.5});
      }
      /* the sheet of water, a hair above the slab, plus foam at the drop */
      W.floor(0.25,z0,CW-0.25,z1,y+0.035,M.water,{uvScale:1,tess:4});
      W.floor(0.25,z0-0.4,CW-0.25,z0+2.6,y+0.045,M.foam,{uvScale:1,tess:4});
      /* the low training walls that split the channel into bays */
      if(i%2===0){
        for(const x of [CW*0.25,CW*0.75])
          W.box(x-0.35,y,z0+1.2,0.70,0.55,RUN-2.4,M.weir,{uvScale:1,tess:2});
      }
    }

    /* ============================================== the two dam faces */
    const face=(sx)=>{
      const x=sx?CW:-2.2;
      W.box(x,-N*STEP-3,-6,2.2,WALL+N*STEP+3,LEN+12,M.wallCon,{uvScale:1,tess:5});
      // a taller band of staining low down where the water has always been
      W.box(sx?CW-0.04:-0.02,-N*STEP-1,-6,0.06,7.5+N*STEP,LEN+12,M.wallStain,
            {uvScale:1,solid:false,tess:5});
      // massive buttress piers every 20 m — the thing that gives the wall a size
      for(let z=6;z<LEN;z+=20){
        const px=sx?CW-1.2:-2.2;
        W.box(px,yAt(z)-1.5,z-1.6,3.4,WALL*0.72,3.2,M.wallCon,{uvScale:1,tess:5});
        // and a chamfer at its head so it does not just stop
        W.box(px,yAt(z)-1.5+WALL*0.72,z-1.1,3.4,2.2,2.2,M.wallCon,{uvScale:1,solid:false,tess:2.5});
      }
      // horizontal lift joints, all the way up, receding into the fog
      for(let y=3;y<WALL;y+=4.5){
        W.box(sx?CW-0.03:-0.05,y,-6,0.08,0.12,LEN+12,M.wallStain,{uvScale:1,solid:false,tess:9});
      }
    };
    face(false); face(true);

    /* ============================================== gantries and lamps */
    for(let z=14;z<LEN;z+=26){
      const y=yAt(z)+9.5;
      // a walkway bridging the channel, far enough up to be no use
      W.box(-2.2,y,z-0.8,CW+4.4,0.35,1.6,M.steel,{uvScale:1,solid:false,tess:3});
      W.box(-2.2,y+0.35,z-0.9,CW+4.4,1.05,0.10,M.mesh,{uvScale:1,solid:false,tess:3});
      W.box(-2.2,y+0.35,z+0.8,CW+4.4,1.05,0.10,M.mesh,{uvScale:1,solid:false,tess:3});
      for(let x=1;x<CW;x+=5)
        W.box(x-0.16,y-0.55,z-0.16,0.32,0.55,0.32,M.steel,{uvScale:2,solid:false});
      // sodium heads hanging off it
      for(const x of [CW*0.25,CW*0.75]){
        W.box(x-0.45,y-1.35,z-0.45,0.9,0.30,0.9,M.paintYel,{uvScale:1.2,solid:false});
        W.floor(x-0.34,z-0.34,x+0.34,z+0.34,y-1.37,M.lamp,{uvScale:1,solid:false});
        W.light({x,y:y-1.7,z,r:1.0,g:0.66,b:0.28,radius:26,intensity:1.35,
                 flicker:rng()<0.25?0.35:0.04,shadow:true});
      }
      // and the ladder nobody is going to climb
      const lx=CW-0.7;
      for(let k=0;k<Math.floor((y-yAt(z))/0.32);k++)
        W.box(lx-0.30,yAt(z)+k*0.32,z+2.0,0.60,0.05,0.05,M.steel,{uvScale:3,solid:false});
      W.box(lx-0.34,yAt(z),z+1.94,0.06,y-yAt(z),0.16,M.steel,{uvScale:3,solid:false,tess:4});
      W.box(lx+0.28,yAt(z),z+1.94,0.06,y-yAt(z),0.16,M.steel,{uvScale:3,solid:false,tess:4});
    }

    /* ============================================== the lid */
    // Not a ceiling so much as the point where the fog becomes cloud.
    for(let z=-6;z<LEN+6;z+=40)
      W.ceiling(-3,z,CW+3,Math.min(z+40,LEN+6),WALL+14,M.sky,{uvScale:1,solid:false,tess:8});
    // daylight: broad, unshadowed, and stacked so the walls fade upward
    for(let z=10;z<LEN;z+=34){
      for(let i=0;i<3;i++){
        W.light({x:CW*0.5,y:14+i*26,z,r:0.86,g:0.90,b:0.96,
                 radius:70,intensity:0.20-i*0.05,shadow:false});
      }
    }

    /* ============================================== upstream: the gates */
    W.box(-2.2,-2,-6.4,CW+4.4,WALL*0.5,2.2,M.wallCon,{uvScale:1,tess:5});
    for(let i=0;i<4;i++){
      const x=2+i*(CW-4)/4;
      W.box(x,-1.6,-4.4,(CW-4)/4-1.4,7.5,0.55,M.paintYel,{uvScale:0.6,solid:false,tess:2.5});
      W.box(x-0.5,-1.6,-4.6,0.5,10.5,0.9,M.steel,{uvScale:1,solid:false});
      W.light({x:x+2,y:5.5,z:-3.4,r:1.0,g:0.72,b:0.34,radius:12,intensity:0.5,shadow:false});
    }
    W.box(-2.2,-1.6,-4.6,CW+4.4,0.4,0.9,M.steel,{uvScale:1,solid:false,tess:3});

    /* ============================================== the outfall */
    const zEnd=N*RUN, yEnd=-N*STEP;
    // a cross wall with one tunnel mouth in it, which is where you are going
    W.box(-2.2,yEnd-2,zEnd,CW+4.4,WALL,3.0,M.wallCon,{uvScale:1,tess:5});
    const gx=CW*0.5;
    W.box(gx-3.0,yEnd,zEnd-0.05,6.0,4.4,3.2,M.tunnel,{solid:false});
    // the round head over it, in bands fine enough to read as an arch
    for(let i=0;i<12;i++){
      const t=i/12, y=yEnd+4.4+3.0*t;
      const hw=3.0*Math.sqrt(Math.max(0,1-((i+1)/12)*((i+1)/12)));
      W.box(gx-hw,y,zEnd-0.05,hw*2,3.0/12+0.02,3.2,M.tunnel,{solid:false});
    }
    W.box(gx-3.4,yEnd,zEnd-0.35,0.42,7.4,0.4,M.weir,{uvScale:1,solid:false});
    W.box(gx+2.98,yEnd,zEnd-0.35,0.42,7.4,0.4,M.weir,{uvScale:1,solid:false});
    W.box(gx-3.4,yEnd+7.0,zEnd-0.35,6.8,0.42,0.4,M.weir,{uvScale:1,solid:false});
    W.light({x:gx,y:yEnd+3.2,z:zEnd-2.2,r:1.0,g:0.74,b:0.36,radius:14,intensity:1.5,shadow:true});
    W.goal({x:gx,y:yEnd+1,z:zEnd-0.6,r:1.6,
      title:'The channel went under',
      text:'The water tipped into the tunnel mouth and stopped making any noise at all, '+
           'which it should not have done. You walked in after it. The walls were close '+
           'enough to touch on both sides and that was, briefly, a relief.'});

    /* ============================================== atmosphere */
    W.environment({
      fogColor:[0.40,0.43,0.455],
      fogDensity:0.0072,
      ambient:[0.070,0.078,0.088],
      exposure:0.80,
      lift:[0.006,0.008,0.010],
      gain:[0.98,1.00,1.04],
      sat:0.78,
      bloomThresh:0.90,
      aoStrength:1.0
    });
    W.ambience({
      hum:0.02, humFreq:50, drone:0.42, droneFreq:27,
      water:1.0, tone:0.13, toneCut:620, toneLow:28,
      reverb:0.52, drips:true, eventGap:11
    });
  }
});
})();

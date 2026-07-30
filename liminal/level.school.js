/* =====================================================================
   LIMINAL — level.school.js
   Level 5 · "After Hours"

   A secondary school corridor at some hour that is not on the timetable.
   Vinyl floor, lockers, doors with wired glass, a display board that has
   been up since a term that already ended.

   Half the lights are on the night circuit, which means the corridor
   alternates: lit, dark, lit, dark, all the way to the gym.
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

const MATS={
  /* marbled safety vinyl, buffed to a shine by a machine that comes at night */
  vinyl:{tile:0.42,bump:0.14,specular:0.62,shininess:170,draw(c,S,rng,TX){
    base(c,S,11,[142,136,120],0.10,S/14,4,0.5);
    // the marbling: long smeared veins, the colour of institutional beige
    c.globalAlpha=0.35;
    for(let i=0;i<38;i++){
      const y=rng()*S, amp=S*(0.01+rng()*0.03);
      c.strokeStyle=rng()>0.5?'rgba(176,170,152,0.9)':'rgba(112,106,92,0.9)';
      c.lineWidth=1+rng()*5;
      c.beginPath();
      for(let x=0;x<=S;x+=S/14) c.lineTo(x,y+TX.fbm(x/38,i*4,S/38,3,3)*amp*4-amp*2);
      c.stroke();
    }
    c.globalAlpha=1;
    // welded sheet joints every 2 m
    c.strokeStyle='rgba(108,102,90,0.55)';c.lineWidth=Math.max(1,S/300);
    c.beginPath();c.moveTo(0,S*0.5);c.lineTo(S,S*0.5);c.stroke();
    // scuffs from thirty years of the same shoes
    c.globalAlpha=0.10;
    for(let i=0;i<30;i++){
      const x=rng()*S,y=rng()*S,r=S*(0.01+rng()*0.05);
      c.strokeStyle='#3a3630';c.lineWidth=1+rng()*2;
      c.beginPath();c.arc(x,y,r,rng()*6,rng()*6+2);c.stroke();
    }
    c.globalAlpha=1;
    TX.stains(c,rng,4,TX.rgba(160,154,138),0.18,0.10,0.28);
    TX.grain(c,0.03,1,13);
  }},
  /* the two-tone wall every school has: paint above, wipeable dado below */
  wallTop:{tile:0.42,bump:0.28,specular:0.10,shininess:26,draw(c,S,rng,TX){
    base(c,S,17,[206,201,182],0.10,S/8,4,0.3);
    // roller texture, orange peel
    c.globalAlpha=0.07;
    for(let i=0;i<300;i++){
      const x=rng()*S,y=rng()*S;
      c.fillStyle=rng()>0.5?'#fff':'#000';
      c.beginPath();c.arc(x,y,S*(0.002+rng()*0.006),0,Math.PI*2);c.fill();
    }
    c.globalAlpha=1;
    TX.stains(c,rng,3,TX.rgba(178,170,148),0.20,0.08,0.24);
    TX.streaks(c,rng,8,TX.rgba(174,168,148),4,0.10);
    TX.grain(c,0.03,1.2,19);
  }},
  wallDado:{tile:0.42,bump:0.20,specular:0.30,shininess:70,draw(c,S,rng,TX){
    base(c,S,23,[86,116,124],0.12,S/7,3,0.25);
    // gloss, and the marks of every bag that ever swung into it
    c.globalAlpha=0.12;
    for(let i=0;i<24;i++){
      const x=rng()*S,y=rng()*S,l=S*(0.03+rng()*0.14),a=(rng()-0.5)*0.8;
      c.strokeStyle='#20303a';c.lineWidth=0.8+rng()*2;
      c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);c.stroke();
    }
    c.globalAlpha=1;
    TX.grain(c,0.025,1,29);
  }},
  /* 600 mm mineral-fibre tile, a couple of them lifted and never put back */
  ceiltile:{tile:1/1.8,bump:0.28,specular:0.03,shininess:10,draw(c,S,rng,TX){
    base(c,S,31,[214,210,198],0.08,S/12,3,0);
    c.fillStyle='rgba(140,136,126,0.42)';
    for(let i=0;i<S*10;i++){
      const x=rng()*S,y=rng()*S;
      c.beginPath();c.arc(x,y,0.5+rng()*1.0,0,Math.PI*2);c.fill();
    }
    const cell=S/3;
    TX.grid(c,cell,'rgba(96,94,88,0.8)',Math.max(1.2,S/200),0);
    TX.grid(c,cell,'rgba(238,236,226,0.35)',1,1.6);
    TX.stains(c,rng,2,TX.rgba(150,124,72),0.34,0.08,0.22);
    TX.grain(c,0.03,1.2,37);
  }},
  /* lockers: a bank of doors, vents, and one that will not shut */
  locker:{tile:1/0.9,bump:0.45,specular:0.30,shininess:70,draw(c,S,rng,TX){
    base(c,S,41,[62,92,86],0.12,S/8,3,0.2);
    // three doors across the 0.9 m texture, with a shadow gap round each
    for(let i=0;i<3;i++){
      const x=i*S/3;
      c.fillStyle='rgba(0,0,0,0.35)';c.fillRect(x,0,Math.max(2,S/120),S);
      const g=c.createLinearGradient(x,0,x+S/3,0);
      g.addColorStop(0,'rgba(255,255,255,0.10)');
      g.addColorStop(0.5,'rgba(255,255,255,0)');
      g.addColorStop(1,'rgba(0,0,0,0.14)');
      c.fillStyle=g;c.fillRect(x+2,0,S/3-4,S);
      // vents
      c.fillStyle='rgba(18,26,24,0.75)';
      for(let v=0;v<4;v++) c.fillRect(x+S/12,S*(0.08+v*0.035),S/6,S*0.012);
      for(let v=0;v<4;v++) c.fillRect(x+S/12,S*(0.80+v*0.035),S/6,S*0.012);
      // handle and lock
      c.fillStyle='rgba(190,194,190,0.8)';c.fillRect(x+S/3-S*0.09,S*0.44,S*0.045,S*0.10);
      c.fillStyle='rgba(120,124,120,0.9)';
      c.beginPath();c.arc(x+S/3-S*0.065,S*0.60,S*0.016,0,Math.PI*2);c.fill();
      // a number sticker, half peeled
      c.fillStyle='rgba(226,222,208,0.7)';c.fillRect(x+S/9,S*0.16,S*0.10,S*0.05);
    }
    TX.stains(c,rng,4,TX.rgba(44,66,62),0.3,0.04,0.16);
    TX.grain(c,0.035,1,43);
  }},
  /* classroom door: painted, with a tall pane of wired glass */
  door:{tile:1/1.0,bump:0.30,specular:0.30,shininess:70,draw(c,S,rng,TX){
    base(c,S,47,[152,128,88],0.12,S/8,3,0.2);
    // the vision panel
    c.fillStyle='#101619';
    c.fillRect(S*0.30,S*0.16,S*0.40,S*0.52);
    c.strokeStyle='rgba(90,74,50,0.9)';c.lineWidth=Math.max(1.5,S/90);
    c.strokeRect(S*0.30,S*0.16,S*0.40,S*0.52);
    // the wire in the glass
    c.strokeStyle='rgba(150,158,150,0.45)';c.lineWidth=Math.max(1,S/300);
    c.beginPath();
    for(let i=1;i<9;i++){
      c.moveTo(S*0.30,S*(0.16+i*0.058));c.lineTo(S*0.70,S*(0.16+i*0.058));
      c.moveTo(S*(0.30+i*0.045),S*0.16);c.lineTo(S*(0.30+i*0.045),S*0.68);
    }
    c.stroke();
    // handle, kick plate, and the room number
    c.fillStyle='rgba(178,182,184,0.9)';c.fillRect(S*0.78,S*0.46,S*0.10,S*0.035);
    c.fillStyle='rgba(150,154,156,0.55)';c.fillRect(S*0.10,S*0.86,S*0.80,S*0.10);
    c.fillStyle='rgba(230,226,214,0.85)';c.fillRect(S*0.40,S*0.075,S*0.20,S*0.055);
    TX.grain(c,0.03,1,53);
  }},
  /* the display board that has been up since a term that already ended */
  board:{tile:1/1.2,bump:0.30,specular:0.05,shininess:14,draw(c,S,rng,TX){
    base(c,S,59,[122,86,72],0.16,S/10,4,0.3);
    // sugar paper backing and a border of wavy card
    c.fillStyle='rgba(52,86,120,0.85)';
    c.fillRect(S*0.06,S*0.06,S*0.88,S*0.88);
    c.fillStyle='rgba(206,180,60,0.9)';
    for(let i=0;i<16;i++){
      c.beginPath();
      c.arc(S*(0.06+i*0.055+0.028),S*0.06,S*0.028,Math.PI,0);c.fill();
      c.beginPath();
      c.arc(S*(0.06+i*0.055+0.028),S*0.94,S*0.028,0,Math.PI);c.fill();
    }
    // work, pinned up, gone soft at the corners
    for(let i=0;i<6;i++){
      const x=S*(0.14+(i%3)*0.26), y=S*(0.20+((i/3)|0)*0.36);
      c.fillStyle='rgba(238,234,222,0.95)';
      c.fillRect(x,y,S*0.20,S*0.28);
      c.fillStyle='rgba(90,96,110,0.5)';
      for(let l=0;l<7;l++) c.fillRect(x+S*0.02,y+S*(0.03+l*0.032),S*(0.08+TX.ihash(i,l,3)*0.08),S*0.008);
      c.fillStyle='rgba(160,60,60,0.6)';
      c.beginPath();c.arc(x+S*0.10,y-S*0.004,S*0.008,0,Math.PI*2);c.fill();
    }
    TX.stains(c,rng,3,TX.rgba(80,60,50),0.28,0.06,0.20);
    TX.grain(c,0.035,1.2,61);
  }},
  skirting:{tile:0.5,bump:0.2,specular:0.25,shininess:60,draw(c,S,rng,TX){
    base(c,S,67,[62,66,68],0.14,S/6,3,0.2);
    TX.grain(c,0.04,1,71);
  }},
  radiator:{tile:0.6,bump:0.5,specular:0.35,shininess:80,draw(c,S,rng,TX){
    base(c,S,73,[206,204,196],0.08,S/6,3,0);
    for(let i=0;i<10;i++){
      const x=i*S/10;
      c.fillStyle='rgba(0,0,0,0.22)';c.fillRect(x,0,Math.max(2,S/90),S);
      c.fillStyle='rgba(255,255,255,0.14)';c.fillRect(x+3,0,1,S);
    }
    TX.stains(c,rng,3,TX.rgba(160,150,130),0.2,0.04,0.14);
    TX.grain(c,0.03,1,79);
  }},
  glassWired:{tile:0.6,blend:true,alpha:0.28,specular:0.8,shininess:200,fresnel:0.55,bump:0,
    draw(c,S,rng,TX){
      base(c,S,83,[150,168,170],0.20,S/6,3,0.2);
      c.strokeStyle='rgba(190,200,196,0.55)';c.lineWidth=Math.max(1,S/220);
      TX.grid(c,S/12,'rgba(190,200,196,0.55)',c.lineWidth,0);
    }},
  gymFloor:{tile:0.30,bump:0.22,specular:0.55,shininess:150,draw(c,S,rng,TX){
    base(c,S,89,[178,142,88],0.16,S/16,4,0.2);
    // strip flooring
    c.globalAlpha=0.22;
    for(let i=0;i<8;i++){
      c.fillStyle='#6a5230';c.fillRect(0,i*S/8,S,Math.max(1.5,S/240));
      c.fillStyle='rgba(255,235,190,0.5)';c.fillRect(0,i*S/8+2,S,1);
    }
    c.globalAlpha=1;
    TX.streaks(c,rng,14,TX.rgba(140,108,64),6,0.14);
    TX.grain(c,0.035,1.4,97);
  }},
  gymLine:{tile:1.0,bump:0.1,specular:0.4,shininess:90,draw(c,S,rng,TX){
    TXX.fill(c,'#c8452f');
    TX.grain(c,0.05,1,101);
  }},
  brick:{tile:0.30,bump:0.5,specular:0.05,shininess:12,draw(c,S,rng,TX){
    base(c,S,103,[176,168,152],0.10,S/9,3,0.2);
    const rows=8, h=S/rows;
    for(let r=0;r<rows;r++){
      const off=(r%2)*S/8;
      for(let i=0;i<4;i++){
        const x=off+i*S/4, k=1+(TX.ihash(i,r,7)-0.5)*0.14;
        c.fillStyle=`rgba(${(176*k)|0},${(168*k)|0},${(150*k)|0},0.9)`;
        c.fillRect(x+1.5,r*h+1.5,S/4-3,h-3);
      }
    }
    c.strokeStyle='rgba(150,146,136,0.6)';
    TX.grid(c,h,'rgba(150,146,136,0.6)',Math.max(1,S/300),0);
    TX.stains(c,rng,4,TX.rgba(150,142,126),0.22,0.08,0.24);
    TX.grain(c,0.04,1.2,107);
  }},
  tube:{tile:1.0,emissive:[2.6,2.6,2.45],specular:0,draw(c,S,rng,TX){
    const g=c.createLinearGradient(0,0,0,S);
    g.addColorStop(0,'#e9eef0');g.addColorStop(0.5,'#ffffff');g.addColorStop(1,'#dfe6e8');
    c.fillStyle=g;c.fillRect(0,0,S,S);
    c.fillStyle='rgba(120,130,132,0.35)';
    c.fillRect(0,0,S,S*0.06);c.fillRect(0,S*0.94,S,S*0.06);
  }},
  tubeOff:{tile:1.0,emissive:[0.06,0.062,0.058],specular:0.15,shininess:40,draw(c,S,rng,TX){
    base(c,S,109,[118,120,116],0.12,S/6,3,0);
  }},
  exitSign:{tile:1.0,emissive:[0.55,2.4,0.85],specular:0,draw(c,S,rng,TX){
    TXX.fill(c,'#0d2415');
    c.fillStyle='#6effa8';
    c.fillRect(S*0.10,S*0.34,S*0.16,S*0.32);
    c.fillRect(S*0.10,S*0.34,S*0.34,S*0.08);
    c.fillRect(S*0.10,S*0.60,S*0.34,S*0.06);
    c.fillRect(S*0.56,S*0.42,S*0.30,S*0.16);
    c.beginPath();c.moveTo(S*0.86,S*0.30);c.lineTo(S*0.96,S*0.50);c.lineTo(S*0.86,S*0.70);
    c.closePath();c.fill();
  }},
  voidM:{tile:1,specular:0,draw(c){ TXX.fill(c,'#060607'); }}
};

/* ==================================================================== level */
LIMINAL.registerLevel({
  id:'school',
  name:'Level 5',
  subtitle:'After Hours',
  badge:'quiet',
  accent:'#7fb2ba',
  tags:['corridor','lockers','vinyl','night circuit','term time'],
  size:'46 × 62 m',
  lighting:'night circuit · every other fitting',
  defaultSeed:5,
  description:'A school corridor at an hour that is not on the timetable. The lockers are shut, '+
              'the doors are locked, and the display board is still advertising a trip that '+
              'happened. Only every second light is on the night circuit, so the corridor goes '+
              'lit, dark, lit, dark, all the way to the gym.',

  preview(g,w,h){
    const grd=g.createLinearGradient(0,0,0,h);
    grd.addColorStop(0,'#1c1e1e');grd.addColorStop(0.5,'#3d4442');grd.addColorStop(1,'#20211f');
    g.fillStyle=grd;g.fillRect(0,0,w,h);
    const cx=w*0.5, cy=h*0.50;
    for(let i=8;i>=0;i--){
      const t=i/8, k=Math.pow(1-t,1.45)*0.92+0.08;
      const x0=cx-w*0.42*k, x1=cx+w*0.42*k;
      const y0=cy-h*0.44*k, y1=cy+h*0.46*k;
      const lit=i%2===0;
      const l=(lit?58:26)+(1-t)*40;
      // walls: paint over, dado under
      g.fillStyle=`rgb(${l+96},${l+92},${l+76})`;
      g.fillRect(x0,y0,x1-x0,(y1-y0)*0.52);
      g.fillStyle=`rgb(${l+18},${l+46},${l+52})`;
      g.fillRect(x0,y0+(y1-y0)*0.52,x1-x0,(y1-y0)*0.48);
      // floor + ceiling
      g.fillStyle=`rgb(${l+52},${l+48},${l+38})`;
      g.fillRect(x0,y1,x1-x0,h);
      g.fillStyle=`rgb(${l+70},${l+68},${l+62})`;
      g.fillRect(x0,0,x1-x0,y0);
      // lockers each side
      g.fillStyle=`rgba(${28+l*0.4},${58+l*0.4},${54+l*0.4},1)`;
      g.fillRect(x0,y0+(y1-y0)*0.30,w*0.05*k,(y1-y0)*0.52);
      g.fillRect(x1-w*0.05*k,y0+(y1-y0)*0.30,w*0.05*k,(y1-y0)*0.52);
      // the fitting, and the pool it drops
      if(lit){
        g.fillStyle='rgba(246,248,240,0.95)';
        g.fillRect(cx-w*0.07*k,y0+2,w*0.14*k,Math.max(1.5,3*k));
        const gr=g.createRadialGradient(cx,y0,0,cx,y0,w*0.40*k);
        gr.addColorStop(0,`rgba(238,244,232,${0.22*(1-t)+0.07})`);
        gr.addColorStop(1,'rgba(238,244,232,0)');
        g.fillStyle=gr;g.fillRect(x0,y0,x1-x0,y1-y0);
      }
    }
    // exit sign at the end
    g.fillStyle='rgba(110,255,168,0.85)';
    g.fillRect(cx-w*0.035,cy-h*0.10,w*0.07,h*0.035);
    const v=g.createRadialGradient(cx,cy,0,cx,cy,w*0.6);
    v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,0.68)');
    g.fillStyle=v;g.fillRect(0,0,w,h);
  },

  /* ------------------------------------------------------------------ build */
  build(W,ctx){
    const TX=ctx.TX, rng=W.rng;
    const M={}; for(const k in MATS) M[k]=W.material(k,MATS[k]);

    const H=2.85;             // ceiling
    const CW=2.9;             // corridor width
    const LEN=52;             // main corridor, along +z
    const CX=23;              // its centre line in x
    const X0=CX-CW/2, X1=CX+CW/2;
    const T=0.16;
    const DADO=1.15;

    W.spawn(CX,0.05,3.2,0);
    W.setStepMaterial((x,z,y)=>(z>LEN-1?'concrete':'tile'));

    /* ---- helpers ------------------------------------------------------- */
    const floorRun=(x0,z0,x1,z1,mat)=>{
      for(let z=z0;z<z1;z+=4) for(let x=x0;x<x1;x+=4){
        W.floor(x,z,Math.min(x+4,x1),Math.min(z+4,z1),0,mat||M.vinyl,{uvScale:1,tess:2});
        W.solid(x,-1,z,Math.min(4,x1-x),1,Math.min(4,z1-z));
      }
    };
    const ceilRun=(x0,z0,x1,z1,y)=>{
      for(let z=z0;z<z1;z+=4) for(let x=x0;x<x1;x+=4)
        W.ceiling(x,z,Math.min(x+4,x1),Math.min(z+4,z1),y||H,M.ceiltile,{uvScale:1,tess:2});
      W.solid(x0,y||H,z0,x1-x0,0.5,z1-z0);
    };
    /* a wall with the dado band, the skirting, and its own collision */
    const wall=(x0,z0,x1,z1,h)=>{
      h=h||H;
      const horiz=Math.abs(x1-x0)>Math.abs(z1-z0);
      const L=horiz?Math.abs(x1-x0):Math.abs(z1-z0);
      const bx=Math.min(x0,x1)-(horiz?0:T/2), bz=Math.min(z0,z1)-(horiz?T/2:0);
      const sx=horiz?L:T, sz=horiz?T:L;
      W.box(bx,DADO,bz,sx,h-DADO,sz,M.wallTop,{uvScale:1,tess:3});
      W.box(bx,0.12,bz,sx,DADO-0.12,sz,M.wallDado,{uvScale:1,tess:3});
      W.box(bx-0.01,0,bz-0.01,sx+(horiz?0.02:0.02),0.12,sz+0.02,M.skirting,
            {uvScale:1.6,solid:false,tess:3});
      // the nosing where dado meets paint
      W.box(bx-0.015,DADO,bz-0.015,sx+0.03,0.035,sz+0.03,M.skirting,
            {uvScale:1.6,solid:false,tess:3});
    };

    /* where the cross corridor tees off the main one, on the -x side */
    const CZ=LEN*0.45, CH=2.9;

    /* ============================================== the main corridor */
    floorRun(X0,0,X1,LEN);
    ceilRun(X0,0,X1,LEN);
    wall(X0,0,X1,0);                      // the dead end you started at

    /* Both walls are built in 0.9 m modules, and each module is either locker
       bank, classroom door, display board, radiator, or blank. Doors get a
       frame; a couple of them are open onto a room that is not lit. */
    const openRooms=[];
    for(const side of [0,1]){
      const xf=side?X1:X0;
      const nx=side?1:-1;
      let z=0.5;
      while(z<LEN-1.2){
        // leave the opening where the cross corridor tees off
        if(side===0&&z<CZ+CH/2&&z+0.9>CZ-CH/2){
          if(z<CZ-CH/2) wall(xf,z,xf,CZ-CH/2);
          z=CZ+CH/2; continue;
        }
        const roll=TX.ihash(side,(z*10)|0,7);
        if(roll<0.34){
          /* lockers: three modules of them, 1.85 m tall */
          const n=2+((roll*9)|0)%2;
          const L=Math.min(n*0.9,LEN-1.2-z);
          wall(side?xf:xf,z,side?xf:xf,z+L);
          W.box(side?xf-0.42:xf+0.02,0,z,0.40,1.85,L,M.locker,{uvScale:1,tess:2});
          // the sloped top that stops anything being left on them
          W.box(side?xf-0.42:xf+0.02,1.85,z,0.40,0.10,L,M.skirting,{uvScale:1.6,solid:false,tess:2});
          z+=L;
        } else if(roll<0.62){
          /* a classroom door in its frame */
          const L=1.15;
          if(z+L>LEN-1.2){ wall(side?xf:xf,z,side?xf:xf,LEN-1.2); z=LEN; break; }
          const open=roll>0.585;
          // reveal each side
          W.box(side?xf:xf-T/2,0,z,T,H,0.10,M.wallTop,{uvScale:1,tess:2});
          W.box(side?xf:xf-T/2,0,z+L-0.10,T,H,0.10,M.wallTop,{uvScale:1,tess:2});
          W.box(side?xf:xf-T/2,2.05,z,T,H-2.05,L,M.wallTop,{uvScale:1,tess:2});
          // frame
          W.box(side?xf-0.03:xf-0.09,0,z+0.04,0.12,2.14,0.09,M.skirting,{uvScale:1.6,solid:false,tess:2});
          W.box(side?xf-0.03:xf-0.09,0,z+L-0.13,0.12,2.14,0.09,M.skirting,{uvScale:1.6,solid:false,tess:2});
          W.box(side?xf-0.03:xf-0.09,2.05,z+0.04,0.12,0.12,L-0.08,M.skirting,{uvScale:1.6,solid:false,tess:2});
          if(open){
            // the door stood back against the inside wall, and the dark beyond
            W.box(side?xf+0.08:xf-0.14,0,z+0.12,0.06,2.02,0.86,M.door,{uvScale:1,solid:false,tess:2});
            W.box(side?xf+0.02:xf-0.10,0,z+0.10,0.08,2.05,L-0.22,M.voidM,{solid:false});
            openRooms.push([xf+nx*0.6,z+L/2,side]);
          } else {
            W.box(side?xf-0.02:xf-0.06,0,z+0.10,0.08,2.05,L-0.22,M.door,{uvScale:1,tess:2});
          }
          z+=L;
        } else if(roll<0.78){
          /* display board */
          const L=Math.min(2.4,LEN-1.2-z);
          wall(side?xf:xf,z,side?xf:xf,z+L);
          W.box(side?xf-0.07:xf+0.01,1.05,z+0.1,0.06,1.30,L-0.2,M.board,{uvScale:1,solid:false,tess:2});
          W.box(side?xf-0.09:xf+0.0,1.00,z+0.06,0.09,0.06,L-0.12,M.skirting,{uvScale:2,solid:false,tess:2});
          W.box(side?xf-0.09:xf+0.0,2.37,z+0.06,0.09,0.06,L-0.12,M.skirting,{uvScale:2,solid:false,tess:2});
          z+=L;
        } else if(roll<0.90){
          /* radiator under a blank stretch of wall */
          const L=Math.min(1.8,LEN-1.2-z);
          wall(side?xf:xf,z,side?xf:xf,z+L);
          W.box(side?xf-0.16:xf+0.01,0.20,z+0.2,0.15,0.62,L-0.4,M.radiator,{uvScale:1,tess:2});
          W.box(side?xf-0.13:xf+0.03,0.10,z+0.30,0.05,0.12,0.05,M.radiator,{uvScale:3,solid:false});
          z+=L;
        } else {
          const L=Math.min(1.6,LEN-1.2-z);
          wall(side?xf:xf,z,side?xf:xf,z+L);
          z+=L;
        }
      }
    }

    /* the rooms behind the open doors: a black box with one window's worth of
       something in it, so a lit corridor has a dark thing beside it */
    for(const [rx,rz,side] of openRooms){
      const nx=side?1:-1;
      const D=5.2;
      const x0=side?rx-0.4:rx+0.4-D;
      for(let z=rz-3;z<rz+3;z+=3) for(let x=x0;x<x0+D;x+=3){
        W.floor(x,z,Math.min(x+3,x0+D),z+3,0,M.vinyl,{uvScale:1,tess:2});
        W.ceiling(x,z,Math.min(x+3,x0+D),z+3,H,M.ceiltile,{uvScale:1,tess:2});
        W.solid(x,-1,z,3,1,3);
      }
      W.solid(x0,H,rz-3,D,0.5,6);
      // enclose it
      W.box(x0-0.16,0,rz-3.2,0.16,H,6.4,M.wallTop,{uvScale:1,tess:3});
      W.box(x0+D,0,rz-3.2,0.16,H,6.4,M.wallTop,{uvScale:1,tess:3});
      W.box(x0-0.16,0,rz-3.2,D+0.32,H,0.16,M.wallTop,{uvScale:1,tess:3});
      W.box(x0-0.16,0,rz+3.0,D+0.32,H,0.16,M.wallTop,{uvScale:1,tess:3});
      // a window on the far wall, showing nothing
      W.box(side?x0+D-0.10:x0+0.02,0.95,rz-1.6,0.10,1.35,3.2,M.glassWired,{uvScale:1,solid:false,tess:2});
      // and a very weak light, because a completely black doorway reads as a bug
      W.light({x:rx+nx*1.8,y:2.2,z:rz,r:0.62,g:0.68,b:0.78,radius:5.5,intensity:0.22,shadow:true});
    }

    /* ============================================== the night circuit */
    /* Fittings every 2.6 m; only the even ones are alive. Twin 5 ft tubes in a
       diffuser, so the lit ones put a long soft rectangle on the floor. */
    for(let z=2.0, i=0; z<LEN-1; z+=2.6, i++){
      const on=i%2===0;
      W.box(CX-0.62,H-0.09,z-0.16,1.24,0.09,0.32,on?M.tube:M.tubeOff,{uvScale:1,solid:false,tess:2});
      W.box(CX-0.68,H-0.12,z-0.20,1.36,0.05,0.40,M.skirting,{uvScale:1.6,solid:false,tess:2});
      if(!on) continue;
      W.light({x:CX,y:H-0.25,z,r:0.98,g:1.0,b:0.97,radius:7.4,intensity:1.15,
               flicker:TX.ihash(i,3,11)<0.12?0.38:0.02,shadow:true});
    }

    /* ============================================== the cross corridor */
    floorRun(4,CZ-CH/2,X0,CZ+CH/2);
    ceilRun(4,CZ-CH/2,X0,CZ+CH/2);
    wall(4,CZ-CH/2,X0,CZ-CH/2);
    wall(4,CZ+CH/2,X0,CZ+CH/2);
    wall(4,CZ-CH/2,4,CZ+CH/2);
    for(let x=6;x<X0;x+=2.6){
      const on=((x/2.6)|0)%2===1;
      W.box(x-0.62,H-0.09,CZ-0.16,1.24,0.09,0.32,on?M.tube:M.tubeOff,{uvScale:1,solid:false,tess:2});
      if(on) W.light({x,y:H-0.25,z:CZ,r:0.98,g:1.0,b:0.97,radius:7,intensity:1.0,shadow:true});
    }
    // fire door at the end of it, shut, with a sign that is doing its best
    W.box(4.02,0,CZ-1.0,0.10,2.05,2.0,M.door,{uvScale:1,tess:2});
    W.box(4.14,1.95,CZ-0.45,0.06,0.24,0.90,M.exitSign,{uvScale:1,solid:false});
    W.light({x:5.0,y:2.1,z:CZ,r:0.45,g:1.0,b:0.60,radius:5,intensity:0.7,shadow:false});

    /* ============================================== the gym at the end */
    const GZ0=LEN, GZ1=LEN+16, GX0=CX-11, GX1=CX+11, GH=7.6;
    for(let z=GZ0;z<GZ1;z+=5.5) for(let x=GX0;x<GX1;x+=5.5){
      W.floor(x,z,Math.min(x+5.5,GX1),Math.min(z+5.5,GZ1),0,M.gymFloor,{uvScale:1,tess:2.4});
      W.solid(x,-1,z,5.5,1,5.5);
      W.ceiling(x,z,Math.min(x+5.5,GX1),Math.min(z+5.5,GZ1),GH,M.ceiltile,{uvScale:1,tess:2.4});
    }
    W.solid(GX0,GH,GZ0,GX1-GX0,0.6,GZ1-GZ0);
    W.box(GX0-0.3,0,GZ0,0.3,GH,GZ1-GZ0,M.brick,{uvScale:1,tess:4});
    W.box(GX1,0,GZ0,0.3,GH,GZ1-GZ0,M.brick,{uvScale:1,tess:4});
    W.box(GX0-0.3,0,GZ1,GX1-GX0+0.6,GH,0.3,M.brick,{uvScale:1,tess:4});
    // the wall the corridor comes through
    W.box(GX0-0.3,0,GZ0-0.3,CX-1.2-GX0+0.3,GH,0.3,M.brick,{uvScale:1,tess:4});
    W.box(CX+1.2,0,GZ0-0.3,GX1-CX-1.2+0.3,GH,0.3,M.brick,{uvScale:1,tess:4});
    W.box(CX-1.2,2.35,GZ0-0.3,2.4,GH-2.35,0.3,M.brick,{uvScale:1,tess:3});
    // court lines
    for(let x=GX0+1.5;x<GX1-1.4;x+=0.9)
      W.floor(x,GZ0+1.4,x+0.6,GZ0+1.48,0.004,M.gymLine,{uvScale:1,solid:false,tess:2});
    W.floor(GX0+1.4,GZ0+1.4,GX0+1.48,GZ1-1.4,0.004,M.gymLine,{uvScale:1,solid:false,tess:3});
    W.floor(GX1-1.48,GZ0+1.4,GX1-1.4,GZ1-1.4,0.004,M.gymLine,{uvScale:1,solid:false,tess:3});
    W.floor(GX0+1.4,(GZ0+GZ1)/2-0.04,GX1-1.4,(GZ0+GZ1)/2+0.04,0.004,M.gymLine,{uvScale:1,solid:false,tess:3});
    // wall bars, a basketball hoop, and the high windows
    for(let x=GX0+2;x<GX1-2;x+=6){
      for(let k=0;k<12;k++)
        W.box(x-0.55,0.4+k*0.24,GZ1-0.36,1.10,0.06,0.06,M.skirting,{uvScale:3,solid:false});
      W.box(x-0.62,0.3,GZ1-0.40,0.10,3.1,0.14,M.skirting,{uvScale:2,solid:false});
      W.box(x+0.52,0.3,GZ1-0.40,0.10,3.1,0.14,M.skirting,{uvScale:2,solid:false});
    }
    W.box(CX-0.9,3.1,GZ1-0.55,1.8,1.15,0.12,M.radiator,{uvScale:0.8,solid:false});
    W.box(CX-0.3,2.85,GZ1-0.95,0.6,0.06,0.42,M.skirting,{uvScale:2,solid:false});
    for(const gx of [GX0+0.02,GX1-0.14])
      for(let z=GZ0+2;z<GZ1-2;z+=4)
        W.box(gx,5.0,z,0.12,1.8,2.6,M.glassWired,{uvScale:1,solid:false,tess:2});
    // six fittings, two of them on
    for(let x=GX0+4;x<GX1-2;x+=6) for(let z=GZ0+4;z<GZ1-2;z+=6){
      const on=TX.ihash((x/6)|0,(z/6)|0,5)>0.55;
      W.box(x-0.9,GH-0.22,z-0.3,1.8,0.16,0.6,on?M.tube:M.tubeOff,{uvScale:1,solid:false,tess:2});
      if(on) W.light({x,y:GH-0.6,z,r:0.98,g:1.0,b:0.96,radius:16,intensity:1.1,
                      flicker:0.03,shadow:true});
    }
    // a spill of daylight through the high windows, which should not be there
    W.light({x:GX0+2,y:5.6,z:(GZ0+GZ1)/2,r:0.72,g:0.80,b:0.95,radius:14,intensity:0.30,shadow:false});
    W.light({x:GX1-2,y:5.6,z:(GZ0+GZ1)/2,r:0.72,g:0.80,b:0.95,radius:14,intensity:0.30,shadow:false});

    /* ============================================== the way out */
    const gz=GZ1-1.2;
    W.box(GX0+3.0,0,gz,1.9,2.15,0.24,M.door,{uvScale:1,solid:false,tess:2});
    W.box(GX0+2.85,0,gz-0.05,0.16,2.35,0.34,M.skirting,{uvScale:1.6,solid:false});
    W.box(GX0+4.90,0,gz-0.05,0.16,2.35,0.34,M.skirting,{uvScale:1.6,solid:false});
    W.box(GX0+2.85,2.15,gz-0.05,2.21,0.20,0.34,M.skirting,{uvScale:1.6,solid:false});
    W.box(GX0+3.50,2.45,gz-0.12,0.90,0.26,0.10,M.exitSign,{uvScale:1,solid:false});
    W.light({x:GX0+3.95,y:2.4,z:gz-1.1,r:0.45,g:1.0,b:0.60,radius:7,intensity:1.0,shadow:false});
    W.goal({x:GX0+3.95,y:1,z:gz-0.6,r:1.4,
      title:'The fire door at the back of the gym',
      text:'The bar went down with a bang that took four seconds to stop. Outside was a stairwell, '+
           'and the stairwell had a corridor at the bottom of it, and the corridor had lockers. '+
           'You stood in the doorway for a while before you let it shut.'});

    /* ============================================== atmosphere */
    W.environment({
      fogColor:[0.085,0.088,0.082],
      fogDensity:0.024,
      ambient:[0.036,0.038,0.038],
      exposure:1.0,
      lift:[0.004,0.005,0.005],
      gain:[1.00,1.02,1.00],
      sat:0.92,
      bloomThresh:0.74,
      aoStrength:1.1
    });
    W.ambience({
      hum:0.26, humFreq:50, drone:0.14, droneFreq:47,
      water:0.04, tone:0.055, toneCut:380, toneLow:44,
      reverb:0.46, drips:false, eventGap:14
    });
  }
});
})();

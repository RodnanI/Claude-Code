/* =====================================================================
   LIMINAL — level.atrium.js
   Level 188 · "The Atrium"

   The lobby of a building that has no upstairs, only more of upstairs.
   Twenty galleries of balcony stacked into a haze you cannot see the
   top of, and down here a polished floor, a dry pool, and you.

   Scale is the whole point. Everything at ground level is deliberately
   human-sized — handrails, bollards, benches, a fire door — so the
   ninety metres above it has something to be measured against.
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

/* polished aggregate — chips of stone suspended in cement, then a gloss pass */
function terrazzo(c,S,rng,TX,rgb,chips,density,gloss){
  base(c,S,71,rgb,0.07,S/10,3,0);
  TX.wrap(c,()=>{
    for(let i=0;i<density;i++){
      const x=rng()*S, y=rng()*S, r=S*(0.004+rng()*0.012);
      const col=chips[(rng()*chips.length)|0];
      c.fillStyle=`rgba(${col[0]},${col[1]},${col[2]},${0.55+rng()*0.4})`;
      c.beginPath();
      const seg=5+((rng()*3)|0);
      for(let k=0;k<seg;k++){
        const a=k/seg*Math.PI*2, rr=r*(0.6+rng()*0.8);
        const px=x+Math.cos(a)*rr, py=y+Math.sin(a)*rr;
        k?c.lineTo(px,py):c.moveTo(px,py);
      }
      c.closePath();c.fill();
    }
  });
  // long buffing swirls, the reason a floor like this reads as polished
  c.globalAlpha=0.05*gloss;
  for(let i=0;i<26;i++){
    const y=rng()*S;
    c.strokeStyle=rng()>0.5?'#ffffff':'#000000';
    c.lineWidth=0.6+rng()*2.2;
    c.beginPath();
    for(let x=0;x<=S;x+=S/16) c.lineTo(x,y+Math.sin(x/S*Math.PI*2+i)*S*0.02);
    c.stroke();
  }
  c.globalAlpha=1;
  TX.grain(c,0.02,1,73);
}

const MATS={
  /* ------------------------------------------------- floors and balconies */
  floorStone:{tile:0.42,bump:0.22,specular:0.55,shininess:150,draw(c,S,rng,TX){
    terrazzo(c,S,rng,TX,[186,182,171],[[122,118,110],[214,210,198],[152,140,124],[96,102,104]],240,1);
    // 1.2 m panel joints — the only thing that gives the floor a size
    c.strokeStyle='rgba(126,122,114,0.55)';
    TX.grid(c,S/2,'rgba(126,122,114,0.55)',Math.max(1,S/300),0);
    TX.stains(c,rng,3,TX.rgba(150,146,138),0.16,0.10,0.28);
  }},
  fascia:{tile:0.4,bump:0.2,specular:0.30,shininess:70,draw(c,S,rng,TX){
    base(c,S,83,[196,193,184],0.10,S/8,3,0.2);
    // shallow horizontal reveal, so twenty stacked bands don't read as one wall
    const g=c.createLinearGradient(0,0,0,S);
    g.addColorStop(0,'rgba(255,255,255,0.16)');
    g.addColorStop(0.14,'rgba(0,0,0,0.10)');
    g.addColorStop(0.86,'rgba(0,0,0,0.04)');
    g.addColorStop(1,'rgba(0,0,0,0.22)');
    c.fillStyle=g;c.fillRect(0,0,S,S);
    TX.streaks(c,rng,10,TX.rgba(140,136,126),4,0.10);
    TX.grain(c,0.025,1.2,89);
  }},
  soffit:{tile:0.4,bump:0.18,specular:0.10,shininess:26,draw(c,S,rng,TX){
    base(c,S,97,[168,166,160],0.09,S/9,3,0);
    c.strokeStyle='rgba(120,118,112,0.5)';
    TX.grid(c,S/4,'rgba(120,118,112,0.5)',Math.max(1,S/380),0);
    TX.stains(c,rng,3,TX.rgba(134,130,120),0.18,0.06,0.20);
    TX.grain(c,0.03,1.2,101);
  }},
  plaster:{tile:0.4,bump:0.30,specular:0.06,shininess:18,draw(c,S,rng,TX){
    base(c,S,103,[188,184,173],0.13,S/7,4,0.35);
    TX.streaks(c,rng,14,TX.rgba(150,146,134),5,0.12);
    TX.stains(c,rng,4,TX.rgba(158,152,138),0.22,0.08,0.24);
    TX.grain(c,0.035,1.3,107);
  }},
  /* -------------------------------------------------------------- glazing */
  glassDark:{tile:0.5,bump:0.05,specular:0.85,shininess:220,fresnel:0.6,
    emissive:[0.045,0.05,0.055],draw(c,S,rng,TX){
      base(c,S,109,[26,30,36],0.35,S/5,3,0.3);
      // a smeared reflection of something that is not in the room
      const g=c.createLinearGradient(0,S,S,0);
      g.addColorStop(0,'rgba(90,104,116,0.00)');
      g.addColorStop(0.45,'rgba(96,112,124,0.30)');
      g.addColorStop(0.55,'rgba(120,138,150,0.16)');
      g.addColorStop(1,'rgba(40,48,56,0)');
      c.fillStyle=g;c.fillRect(0,0,S,S);
      TX.grain(c,0.02,1,113);
    }},
  mullion:{tile:0.6,bump:0.25,specular:0.55,shininess:130,draw(c,S,rng,TX){
    base(c,S,127,[74,78,82],0.14,S/6,3,0);
    c.globalAlpha=0.10;
    for(let y=0;y<S;y+=2){c.fillStyle=(y%4)?'#fff':'#000';c.fillRect(0,y,S,1);}
    c.globalAlpha=1;
    TX.grain(c,0.03,1,131);
  }},
  /* ---------------------------------------------------------------- light */
  strip:{tile:1.0,emissive:[2.1,2.05,1.90],specular:0,draw(c,S,rng,TX){
    const g=c.createLinearGradient(0,0,0,S);
    g.addColorStop(0,'#f4efe0');g.addColorStop(0.5,'#ffffff');g.addColorStop(1,'#e8e2d2');
    c.fillStyle=g;c.fillRect(0,0,S,S);
  }},
  sky:{tile:0.08,emissive:[1.55,1.60,1.68],specular:0,draw(c,S,rng,TX){
    base(c,S,137,[228,233,240],0.10,S/6,3,0.2);
    // the coffered glazing bars of a roof light, seen from ninety metres down
    c.strokeStyle='rgba(120,128,140,0.75)';
    TX.grid(c,S/6,'rgba(120,128,140,0.75)',Math.max(1.5,S/120),0);
    c.strokeStyle='rgba(150,158,170,0.35)';
    TX.grid(c,S/24,'rgba(150,158,170,0.35)',Math.max(1,S/400),0);
  }},
  /* --------------------------------------------------------------- metals */
  rail:{tile:0.8,bump:0.15,specular:0.75,shininess:170,draw(c,S,rng,TX){
    base(c,S,139,[176,180,184],0.10,S/5,3,0);
    c.globalAlpha=0.09;
    for(let y=0;y<S;y++){c.fillStyle=rng()>0.5?'#fff':'#000';c.fillRect(0,y,S,1);}
    c.globalAlpha=1;
    TX.grain(c,0.025,1,149);
  }},
  brass:{tile:0.7,bump:0.2,specular:0.7,shininess:140,draw(c,S,rng,TX){
    base(c,S,151,[152,132,86],0.16,S/6,3,0.2);
    TX.streaks(c,rng,10,TX.rgba(96,82,50),3,0.16);
    TX.grain(c,0.03,1,157);
  }},
  /* ------------------------------------------------------ ground-floor bits */
  poolTile:{tile:0.9,bump:0.35,specular:0.45,shininess:110,draw(c,S,rng,TX){
    base(c,S,163,[92,104,106],0.10,S/8,3,0);
    c.strokeStyle='rgba(58,68,70,0.8)';
    TX.grid(c,S/6,'rgba(58,68,70,0.8)',Math.max(1,S/220),0);
    TX.stains(c,rng,5,TX.rgba(70,84,80),0.34,0.06,0.22);
    TX.grain(c,0.03,1,167);
  }},
  water:{tile:0.25,blend:true,alpha:0.5,wave:0.7,specular:1.0,shininess:200,fresnel:0.6,bump:0,
    scroll:[0.002,0.003],draw(c,S,rng,TX){
      base(c,S,173,[44,62,64],0.45,S/12,4,0.4);
      TX.grain(c,0.04,2,179);
    }},
  soil:{tile:0.6,bump:0.7,specular:0.03,shininess:8,draw(c,S,rng,TX){
    base(c,S,181,[52,44,36],0.40,S/18,5,0);
    TX.grain(c,0.16,1,191);
    TX.stains(c,rng,5,TX.rgba(34,30,24),0.5,0.05,0.18);
  }},
  bark:{tile:0.9,bump:0.6,specular:0.05,shininess:12,draw(c,S,rng,TX){
    base(c,S,193,[86,74,58],0.30,S/14,4,0.6);
    TX.streaks(c,rng,22,TX.rgba(48,40,30),2,0.30);
  }},
  leaf:{tile:0.5,bump:0.3,specular:0.10,shininess:20,draw(c,S,rng,TX){
    base(c,S,197,[74,80,52],0.35,S/12,4,0.5);
    TX.stains(c,rng,7,TX.rgba(52,58,36),0.4,0.05,0.2);
  }},
  signage:{tile:1.0,bump:0.1,specular:0.25,shininess:60,emissive:[0.30,0.31,0.33],
    draw(c,S,rng,TX){
      TXX.fill(c,'#20232a');
      c.fillStyle='rgba(210,214,220,0.9)';
      // a directory board of lines that do not resolve into words
      for(let i=0;i<9;i++){
        const y=S*(0.14+i*0.084);
        c.fillRect(S*0.10,y,S*(0.20+TX.ihash(i,1,9)*0.42),S*0.022);
        c.fillRect(S*0.80,y,S*0.10,S*0.022);
      }
      c.fillStyle='rgba(160,166,176,0.5)';c.fillRect(S*0.08,S*0.08,S*0.84,S*0.012);
    }},
  door:{tile:0.5,bump:0.2,specular:0.2,shininess:50,draw(c,S,rng,TX){
    base(c,S,199,[118,124,126],0.10,S/7,3,0);
    c.strokeStyle='rgba(70,76,78,0.7)';c.lineWidth=Math.max(1.5,S/90);
    c.strokeRect(S*0.10,S*0.06,S*0.80,S*0.88);
    TX.grain(c,0.03,1,211);
  }},
  concrete:{tile:0.35,bump:0.4,specular:0.05,shininess:14,draw(c,S,rng,TX){
    base(c,S,223,[142,140,134],0.16,S/8,4,0.3);
    TX.stains(c,rng,4,TX.rgba(112,110,104),0.2,0.08,0.24);
    TX.grain(c,0.05,1.2,227);
  }},
  voidM:{tile:1,specular:0,draw(c){ TXX.fill(c,'#07080a'); }}
};

/* ==================================================================== level */
LIMINAL.registerLevel({
  id:'atrium',
  name:'Level 188',
  subtitle:'The Atrium',
  badge:'vast',
  accent:'#c9c4b2',
  tags:['megastructure','galleries','terrazzo','daylight','no upstairs'],
  size:'72 × 72 × 90 m',
  lighting:'roof light · cove strips',
  defaultSeed:188,
  description:'A reception atrium twenty galleries deep. The roof light is ninety metres up '+
              'and reads as weather. Every balcony is identical, every balcony is empty, and '+
              'the handrails are exactly waist height, which is how you know how far away the top is.',

  preview(g,w,h){
    const grd=g.createLinearGradient(0,0,0,h);
    grd.addColorStop(0,'#e8e6dd');grd.addColorStop(0.30,'#c3c0b4');grd.addColorStop(1,'#4b4a46');
    g.fillStyle=grd;g.fillRect(0,0,w,h);
    // one-point perspective up a stack of galleries
    const cx=w*0.5, cy=h*0.16;
    for(let i=14;i>=0;i--){
      const k=0.10+i/14*0.92;
      const ww=w*1.30*k, hh=h*0.055*Math.max(0.35,k);
      const y=cy+(h*0.94-cy)*Math.pow(i/14,1.55);
      const sh=40+i*8;
      g.fillStyle=`rgb(${sh+112},${sh+110},${sh+102})`;
      g.fillRect(cx-ww/2,y,ww,hh);
      g.fillStyle=`rgba(20,22,24,${0.36+0.03*i})`;
      g.fillRect(cx-ww/2,y+hh,ww,hh*0.55);
      g.strokeStyle='rgba(240,240,232,0.45)';g.lineWidth=1;
      g.beginPath();g.moveTo(cx-ww/2,y-2);g.lineTo(cx+ww/2,y-2);g.stroke();
    }
    // roof light
    g.fillStyle='rgba(255,255,250,0.9)';
    g.fillRect(cx-w*0.16,0,w*0.32,h*0.12);
    g.strokeStyle='rgba(120,128,140,0.7)';g.lineWidth=1;
    for(let i=1;i<5;i++){g.beginPath();g.moveTo(cx-w*0.16+i*w*0.064,0);g.lineTo(cx-w*0.16+i*w*0.064,h*0.12);g.stroke();}
    const v=g.createRadialGradient(w*0.5,h*0.45,0,w*0.5,h*0.45,w*0.62);
    v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(12,12,14,0.6)');
    g.fillStyle=v;g.fillRect(0,0,w,h);
  },

  /* ------------------------------------------------------------------ build */
  build(W,ctx){
    const TX=ctx.TX, rng=W.rng;
    const M={}; for(const k in MATS) M[k]=W.material(k,MATS[k]);

    const S=72;                 // plan, metres
    const WELL=16;              // ring depth from the outer wall to the void edge
    const w0=WELL, w1=S-WELL;   // the open well runs w0..w1 in both axes
    const H0=6.6;               // underside of the first gallery
    const FH=4.2;               // gallery to gallery
    const FLOORS=20;
    const TOP=H0+FLOORS*FH;     // ≈ 90.6 m to the roof light
    const T=0.35;

    W.spawn(S*0.5,0.05,S-3.4,Math.PI);
    W.setStepMaterial((x,z,y)=>{
      const inPool = x>S*0.5-6&&x<S*0.5+6&&z>S*0.5-6&&z<S*0.5+6;
      return inPool?'water':'tile';
    });

    /* ============================================== ground floor */
    // split into 8 m panels so the chunker has something to cull with
    for(let z=0;z<S;z+=8) for(let x=0;x<S;x+=8)
      W.floor(x,z,x+8,z+8,0,M.floorStone,{uvScale:1,tess:2.6});
    W.solid(0,-1.2,0,S,1.2,S);

    /* outer envelope — plaster below the first gallery, glazing above it */
    const outer=(x0,z0,x1,z1)=>{
      W.box(Math.min(x0,x1),0,Math.min(z0,z1),
            Math.max(Math.abs(x1-x0),T),TOP+3,Math.max(Math.abs(z1-z0),T),
            M.plaster,{uvScale:1,tess:6});
    };
    outer(-T,-T,0,S+T); outer(S,-T,S+T,S+T);
    outer(-T,-T,S+T,0); outer(-T,S,S+T,S+T);

    /* ============================================== the galleries */
    /* Each level is a square ring: soffit under it, a fascia band at the void
       edge, the walking deck, a rail, and a wall of office glazing behind. */
    const ringQuads=(y,mat,inset,opt)=>{
      const a=inset, b=S-inset;
      // four rectangles of ring deck, avoiding a hole in the middle
      W.floor(a,a,b,w0,y,mat,opt);
      W.floor(a,w1,b,b,y,mat,opt);
      W.floor(a,w0,w0,w1,y,mat,opt);
      W.floor(w1,w0,b,w1,y,mat,opt);
    };
    const ringCeil=(y,mat,opt)=>{
      W.ceiling(0,0,S,w0,y,mat,opt);
      W.ceiling(0,w1,S,S,y,mat,opt);
      W.ceiling(0,w0,w0,w1,y,mat,opt);
      W.ceiling(w1,w0,S,w1,y,mat,opt);
    };
    const ringSolid=(y,h)=>{
      W.solid(0,y,0,S,h,w0);
      W.solid(0,y,w1,S,h,w0);
      W.solid(0,y,w0,w0,h,w1-w0);
      W.solid(w1,y,w0,w0,h,w1-w0);
    };
    /* the four edges of the void, as [x0,z0,x1,z1] running clockwise */
    const EDGES=[[w0,w0,w1,w0],[w1,w0,w1,w1],[w1,w1,w0,w1],[w0,w1,w0,w0]];

    for(let f=0;f<FLOORS;f++){
      const yd=H0+f*FH;             // deck level
      const nearby=f<7;             // only the low galleries get real lights

      ringSolid(yd-0.45,0.45);
      ringQuads(yd,M.floorStone,0,{uvScale:1,tess:4});
      ringCeil(yd+FH-0.35,M.soffit,{uvScale:1,tess:4});

      for(const [x0,z0,x1,z1] of EDGES){
        const dx=Math.sign(x1-x0), dz=Math.sign(z1-z0);
        const len=Math.abs(x1-x0)+Math.abs(z1-z0);
        // inward normal for this edge
        const nx=dz, nz=-dx;
        const put=(off,thick,y,hh,mat,o)=>{
          const ax=x0+nx*off, az=z0+nz*off;
          const bx=ax+dx*len+ (nx?nx*thick:0), bz=az+dz*len+(nz?nz*thick:0);
          W.box(Math.min(ax,bx),y,Math.min(az,bz),
                Math.max(Math.abs(bx-ax),thick),hh,Math.max(Math.abs(bz-az),thick),mat,o);
        };
        // fascia: the downstand you see from below, all the way round
        put(-0.02,0.34,yd-0.45,1.05,M.fascia,{uvScale:1,solid:false,tess:5});
        // cove strip tucked behind the fascia — this is what lights the ring
        put(0.34,0.16,yd-0.30,0.22,M.strip,{uvScale:1,solid:false,tess:5});
        // handrail: post, top rail, and one intermediate. Waist height, always.
        put(-0.02,0.09,yd+1.00,0.09,M.rail,{uvScale:2,solid:false,tess:6});
        put(-0.02,0.07,yd+0.52,0.05,M.rail,{uvScale:2,solid:false,tess:6});
        for(let t=0;t<=len;t+=1.6){
          const px=x0+dx*t+nx*0.02, pz=z0+dz*t+nz*0.02;
          W.box(px-0.035,yd,pz-0.035,0.07,1.03,0.07,M.rail,{uvScale:3,solid:false,tess:4});
        }
        // stop the player walking off the gallery, invisibly
        {
          const ax=x0+nx*-0.06, az=z0+nz*-0.06;
          const bx=ax+dx*len+(nx?nx*0.16:0), bz=az+dz*len+(nz?nz*0.16:0);
          W.solid(Math.min(ax,bx),yd,Math.min(az,bz),
                  Math.max(Math.abs(bx-ax),0.16),1.1,Math.max(Math.abs(bz-az),0.16));
        }
      }

      // the glazed wall at the back of every gallery
      const bays=(x0,z0,x1,z1)=>{
        const horiz=Math.abs(x1-x0)>Math.abs(z1-z0);
        const L=horiz?Math.abs(x1-x0):Math.abs(z1-z0);
        for(let t=0;t<L-0.01;t+=2.4){
          const wdt=Math.min(2.4,L-t);
          const bx=horiz?Math.min(x0,x1)+t:x0, bz=horiz?z0:Math.min(z0,z1)+t;
          const sx=horiz?wdt:0.14, sz=horiz?0.14:wdt;
          W.box(bx,yd+0.15,bz,sx,FH-0.85,sz,M.glassDark,{uvScale:1,solid:false,tess:3});
          W.box(horiz?bx:bx-0.03,yd+0.10,horiz?bz-0.03:bz,
                horiz?0.10:0.20,FH-0.75,horiz?0.20:0.10,M.mullion,{uvScale:2,solid:false,tess:4});
        }
      };
      bays(0.6,1.0,S-0.6,1.0); bays(0.6,S-1.0,S-0.6,S-1.0);
      bays(1.0,0.6,1.0,S-0.6); bays(S-1.0,0.6,S-1.0,S-0.6);

      if(nearby){
        const k=1-f*0.10;
        for(const [cx,cz] of [[S*0.5,w0*0.5],[S*0.5,S-w0*0.5],[w0*0.5,S*0.5],[S-w0*0.5,S*0.5]]){
          W.light({x:cx,y:yd+FH-0.9,z:cz,r:1.0,g:0.97,b:0.90,
                   radius:26,intensity:0.62*k,flicker:0,shadow:f<3});
        }
        for(const [x0,z0,x1,z1] of EDGES){
          W.light({x:(x0+x1)/2,y:yd+0.35,z:(z0+z1)/2,r:1.0,g:0.96,b:0.88,
                   radius:20,intensity:0.55*k,shadow:false});
        }
      }
    }

    /* ============================================== the roof light */
    W.ceiling(w0-2,w0-2,w1+2,w1+2,TOP+2.4,M.sky,{uvScale:1,tess:3});
    ringCeil(TOP+2.4,M.soffit,{uvScale:1,tess:4});
    W.solid(0,TOP+2.4,0,S,1.0,S);
    // structural trusses across the roof light, for something to be small under
    for(let t=w0;t<=w1;t+=5){
      W.box(t-0.35,TOP+1.4,w0-2,0.70,0.9,w1-w0+4,M.mullion,{uvScale:0.8,solid:false,tess:6});
      W.box(w0-2,TOP+1.15,t-0.28,w1-w0+4,0.55,0.56,M.mullion,{uvScale:0.8,solid:false,tess:6});
    }
    // daylight, faked as a small stack of very wide unshadowed lights so the
    // whole shaft gets a gradient instead of a hard falloff at one radius
    for(let i=0;i<5;i++){
      W.light({x:S*0.5,y:TOP-i*17,z:S*0.5,r:0.92,g:0.95,b:1.0,
               radius:110,intensity:0.50-i*0.055,shadow:false});
    }
    W.light({x:S*0.5,y:9,z:S*0.5,r:0.86,g:0.90,b:0.98,radius:46,intensity:0.34,shadow:false});

    /* ============================================== ground-floor furniture */
    /* columns on a 12 m grid through the ring, carrying everything above */
    for(let x=6;x<S;x+=12) for(let z=6;z<S;z+=12){
      if(x>w0&&x<w1&&z>w0&&z<w1) continue;   // not in the void
      W.box(x-0.65,0,z-0.65,1.30,H0,1.30,M.plaster,{uvScale:1,tess:1.6});
      W.box(x-0.78,0,z-0.78,1.56,0.24,1.56,M.floorStone,{uvScale:1.4,solid:false});
      W.box(x-0.80,H0-0.30,z-0.80,1.60,0.30,1.60,M.soffit,{uvScale:1.4,solid:false});
      W.light({x,y:H0-0.6,z,r:1.0,g:0.96,b:0.88,radius:15,intensity:0.80,shadow:true});
      W.light({x,y:1.7,z,r:0.92,g:0.92,b:0.90,radius:8,intensity:0.16,shadow:false});
      W.box(x-0.34,H0-0.36,z-0.34,0.68,0.10,0.68,M.strip,{uvScale:1,solid:false});
    }
    // the ring soffit at ground level
    ringCeil(H0,M.soffit,{uvScale:1,tess:4});

    /* the dry-ish reflecting pool at the centre of the void */
    const P=6, cx=S*0.5, cz=S*0.5, D=0.55;
    for(let x=cx-P;x<cx+P;x+=6) for(let z=cz-P;z<cz+P;z+=6)
      W.floor(x,z,x+6,z+6,-D,M.poolTile,{uvScale:1});
    for(const s of [[-1,0],[1,0],[0,-1],[0,1]]){
      const ax=cx+s[0]*P, az=cz+s[1]*P;
      if(s[0]) W.quad([ax,-D,az+P*(s[0]>0?1:-1)],[ax,-D,az-P*(s[0]>0?1:-1)],
                      [ax,0,az-P*(s[0]>0?1:-1)],[ax,0,az+P*(s[0]>0?1:-1)],M.poolTile,{uvScale:1});
      else     W.quad([ax-P*(s[1]>0?-1:1),-D,az],[ax+P*(s[1]>0?-1:1),-D,az],
                      [ax+P*(s[1]>0?-1:1),0,az],[ax-P*(s[1]>0?-1:1),0,az],M.poolTile,{uvScale:1});
    }
    W.floor(cx-P,cz-P,cx+P,cz+P,-0.16,M.water,{uvScale:1});
    // coping
    for(const s of [[-1,0],[1,0],[0,-1],[0,1]]){
      const bx=cx+s[0]*(P+0.2)-(s[0]?0.2:P+0.4), bz=cz+s[1]*(P+0.2)-(s[1]?0.2:P+0.4);
      W.box(bx,0,bz,s[0]?0.4:2*P+0.8,0.14,s[1]?0.4:2*P+0.8,M.brass,{uvScale:1.6,solid:false});
    }
    W.light({x:cx,y:1.4,z:cz,r:0.72,g:0.86,b:0.92,radius:16,intensity:0.32,shadow:false});

    /* planters with things that were alive */
    for(let i=0;i<10;i++){
      const a=i/10*Math.PI*2, r=13.5+rng()*2.5;
      const px=cx+Math.cos(a)*r, pz=cz+Math.sin(a)*r;
      W.box(px-1.1,0,pz-1.1,2.2,0.62,2.2,M.floorStone,{uvScale:1.4});
      W.floor(px-0.95,pz-0.95,px+0.95,pz+0.95,0.60,M.soil,{uvScale:1,solid:false});
      const th=2.6+rng()*2.2;
      W.box(px-0.11,0.6,pz-0.11,0.22,th,0.22,M.bark,{uvScale:2,solid:false});
      for(let k=0;k<4;k++){
        const y=0.6+th*(0.55+k*0.12), sp=0.9-k*0.16;
        W.box(px-sp/2,y,pz-sp/2,sp,0.10,sp,M.leaf,{uvScale:1.2,solid:false});
      }
    }

    /* benches, bollards, a directory board — the human-scale reference set */
    for(let i=0;i<8;i++){
      const a=(i+0.5)/8*Math.PI*2, r=19+rng()*3;
      const px=cx+Math.cos(a)*r, pz=cz+Math.sin(a)*r;
      const horiz=Math.abs(Math.cos(a))>Math.abs(Math.sin(a));
      W.box(px-(horiz?0.3:1.4),0,pz-(horiz?1.4:0.3),horiz?0.6:2.8,0.44,horiz?2.8:0.6,
            M.floorStone,{uvScale:1.4});
    }
    for(let i=0;i<16;i++){
      const t=(i+0.5)/16*S;
      W.box(t-0.09,0,2.6-0.09,0.18,0.95,0.18,M.brass,{uvScale:3,solid:false});
      W.box(t-0.09,0,S-2.6-0.09,0.18,0.95,0.18,M.brass,{uvScale:3,solid:false});
    }
    W.box(6.2,1.0,3.0,0.16,2.2,3.6,M.signage,{uvScale:0.4,solid:false});
    W.light({x:6.9,y:2.1,z:4.8,r:0.9,g:0.94,b:1.0,radius:6,intensity:0.5,shadow:false});

    /* reception desk, facing the doors nobody comes through */
    W.box(S*0.5-4.5,0,10.0,9.0,1.10,1.5,M.plaster,{uvScale:1});
    W.box(S*0.5-4.7,1.10,9.85,9.4,0.10,1.8,M.brass,{uvScale:1.4,solid:false});
    W.light({x:S*0.5,y:H0-1.2,z:10.6,r:1.0,g:0.95,b:0.86,radius:10,intensity:0.55});

    /* ============================================== the way out */
    const gx=S*0.5, gz=S-1.4;
    W.box(gx-1.1,0,gz-0.2,2.2,2.4,0.4,M.voidM,{solid:false});
    W.box(gx-1.35,0,gz-0.3,0.25,2.75,0.6,M.mullion,{uvScale:1.4,solid:false});
    W.box(gx+1.10,0,gz-0.3,0.25,2.75,0.6,M.mullion,{uvScale:1.4,solid:false});
    W.box(gx-1.35,2.4,gz-0.3,2.70,0.35,0.6,M.mullion,{uvScale:1.4,solid:false});
    W.box(gx-0.55,2.52,gz-0.34,1.10,0.24,0.10,M.strip,{uvScale:1,solid:false});
    W.light({x:gx,y:2.2,z:gz-1.2,r:0.60,g:1.0,b:0.72,radius:8,intensity:1.4});
    W.goal({x:gx,y:1,z:gz-0.5,r:1.4,
      title:'You found the doors',
      text:'Revolving, unpowered, and turning anyway. Behind you the galleries went up '+
           'until they stopped being galleries and started being a texture. You did not '+
           'count them on the way out. Nobody does.'});

    /* ============================================== atmosphere */
    W.environment({
      fogColor:[0.30,0.30,0.29],
      fogDensity:0.0075,
      ambient:[0.085,0.086,0.090],
      exposure:0.94,
      lift:[0.006,0.006,0.008],
      gain:[1.02,1.01,0.99],
      sat:0.92,
      bloomThresh:0.80,
      aoStrength:1.1
    });
    W.ambience({
      hum:0.05, humFreq:50, drone:0.30, droneFreq:33,
      water:0.14, tone:0.075, toneCut:340, toneLow:34,
      reverb:0.78, drips:true, eventGap:13
    });
  }
});
})();

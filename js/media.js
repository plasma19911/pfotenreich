// Generated fantasy art; local assets, no runtime network services.
(function(){
  const P=self.P,A=P.ART,M=P.MEDIA={images:{},failed:[]};
  M.ready=Promise.all(['portraits','cats','buildings','scenes','terrain','props'].map(name=>new Promise(resolve=>{
    const im=new Image(); im.onload=()=>{M.images[name]=im;resolve();};
    im.onerror=()=>{M.failed.push(name);resolve();};im.src='assets/'+name+'.webp';
  })));
  const tiles=[];
  M.texture=function(g,index){
    if(!M.images.terrain)return null;
    if(!tiles[index]){const c=document.createElement('canvas');c.width=c.height=192;const q=c.getContext('2d'),im=M.images.terrain;const sw=im.width/2,sh=im.height/2;q.drawImage(im,(index%2)*sw,Math.floor(index/2)*sh,sw,sh,0,0,192,192);tiles[index]=c;}
    return g.createPattern(tiles[index],'repeat');
  };
  function cell(g,name,index,cols,rows,x,y,w,h){
    const im=M.images[name];if(!im)return false;
    const sw=im.width/cols,sh=im.height/rows;
    g.drawImage(im,(index%cols)*sw,Math.floor(index/cols)*sh,sw,sh,x,y,w,h);return true;
  }
  // Immutable appearance: stays the same when a resident changes profession.
  M.profile=c=>{
    const L=c.look,seed=L.seed>>>0;
    let portrait;
    if(L.fur===0)portrait=seed%2?2:14;
    else if(L.fur===1||L.fur===4)portrait=seed%3===0?15:3;
    else if(L.fur===3||L.fur===6)portrait=seed%2?0:4;
    else if(L.pat===3)portrait=seed%2?6:8;
    else if(L.pat===4)portrait=11;
    else if(L.pat===5)portrait=9;
    else portrait=[1,5,7,10,12,13][seed%6];
    const row=[0,1,2,3,0,3,0,1,3,1,1,0,2,1,2,2][portrait];
    return {portrait,row,size:(.76+(seed%9)*.065)*(L.size||1),wide:L.body===2?1.17:L.body===0?.84:1};
  };
  const portrait=A.portrait;
  A.portrait=function(g,c,x,y,r,expr,t,o){
    if(!M.images.portraits)return portrait.apply(this,arguments);
    const v=M.profile(c),d=r*3.7;
    g.save();g.beginPath();g.arc(x,y+r*.12,d*.49,0,Math.PI*2);g.clip();
    const drift=P.R&&P.R.reduced?0:Math.sin((t||0)*.75+c.id)*r*.008;
    cell(g,'portraits',v.portrait,4,4,x-d/2,y-d*.48+drift,d,d);
    g.restore();
  };
  const cat=A.drawCat;
  A.drawCat=function(g,c,x,y,sc,face,pose,t,o){
    if(!M.images.cats)return cat.apply(this,arguments);
    o=o||{};const v=M.profile(c),kid=o.kid===0?.5:o.kid===1?.74:1;
    const moving=pose==='walk'||pose==='carry';
    const frame=moving?Math.floor((t||0)*7+(c.look.seed%4))%4:0;
    const w=35*sc*v.size*v.wide*kid,h=34*sc*v.size*kid;
    const breath=P.R&&P.R.reduced?1:1+Math.sin((t||0)*1.5+c.id)*.009;
    g.save();g.translate(x,y);g.scale(face||1,1);
    g.fillStyle='rgba(18,22,16,.22)';g.beginPath();g.ellipse(0,0,w*.36,h*.065,0,0,Math.PI*2);g.fill();
    if(pose==='sleep'){g.scale(1,.67);g.globalAlpha=.92;}
    cell(g,'cats',v.row*4+frame,4,4,-w/2,-h*breath,w,h*breath);
    if(pose==='fish'){g.strokeStyle='#c4aa78';g.lineWidth=.65;g.beginPath();g.moveTo(w*.3,-h*.23);g.lineTo(w*.62,-h*.75);g.stroke();}
    if(pose==='build'){g.save();g.translate(w*.32,-h*.3);g.rotate(Math.sin((t||0)*6)*.5);g.fillStyle='#b9a580';g.fillRect(0,-7,.9,7);g.fillStyle='#6d7475';g.fillRect(-2,-8,5,2);g.restore();}
    g.restore();
  };
  const scenes=A.scene;
  A.scene=function(g,w,h,key,t,season,s){
    if(!M.images.scenes)return scenes.apply(this,arguments);
    const index=season===3||key==='winter'?2:/night|festival|feast|love/.test(key)?3:s&&s.stage>=3?1:0;
    // Cover crop preserves perspective and aspect ratio.
    const im=M.images.scenes,sw=im.width/2,sh=im.height/2;
    const scale=Math.max(w/sw,h/sh),dw=sw*scale,dh=sh*scale;
    g.save();g.beginPath();g.rect(0,0,w,h);g.clip();cell(g,'scenes',index,2,2,(w-dw)/2,(h-dh)/2,dw,dh);
    const shade=g.createLinearGradient(0,0,0,h);shade.addColorStop(0,'rgba(7,12,15,.03)');shade.addColorStop(1,'rgba(7,12,15,.38)');g.fillStyle=shade;g.fillRect(0,0,w,h);
    if(/rain|storm/.test(key)){g.strokeStyle='rgba(206,222,229,.45)';g.lineWidth=.7;g.beginPath();for(let i=0;i<48;i++){const x=P.h2(i,2,8)*w,y=(P.h2(i,3,8)*h+(t||0)*180)%h;g.moveTo(x,y);g.lineTo(x-3,y+9);}g.stroke();}
    g.restore();
  };
  M.prop=function(g,index,x,y,w,h){return cell(g,'props',index,3,3,x-w/2,y-h,w,h);};
  const props={feedspot:3,scratch:4,sunspot:5,fire:6,lantern:7,playground:8};
  const map={den:0,treehouse:1,council:2,jetty:3,school:4,workshop:5,tinker:5,market:6,tower:7,skytower:7,greenhouse:8,garden:8,store:0,lounge:1,hanging:8,harbor:3,tunnel:0};
  M.building=function(g,b,s,t,X,Y,night){
    if(props[b.type]!==undefined&&M.images.props){
      const heights={feedspot:27,scratch:31,sunspot:24,fire:23,lantern:37,playground:22};
      const h=heights[b.type],w=b.type==='scratch'||b.type==='lantern'?h*.65:h*1.4;
      M.prop(g,props[b.type],X,Y+2,w,h);if(night&&P.R&&(b.type==='fire'||b.type==='lantern'))P.R.lights.push([X,Y-h*.5,35,.65]);return true;
    }
    if(!M.images.buildings||map[b.type]===undefined)return false;
    const tall=P.BUILD[b.type].tall,lv=b.lv||1;
    const h=tall?P.bHeight(b)+12:48+(b.type==='council'?18:0);
    const w=b.type==='tower'||b.type==='skytower'?h*.72:b.type==='treehouse'?h*.83:Math.min(72,h*1.22);
    g.save();g.fillStyle='rgba(14,24,15,.25)';g.beginPath();g.ellipse(X,Y,w*.40,5,0,0,Math.PI*2);g.fill();
    cell(g,'buildings',map[b.type],3,3,X-w/2,Y-h+3,w,h);
    if(P.season(s)===3){g.fillStyle='rgba(234,241,244,.7)';g.beginPath();g.ellipse(X,Y-h+7,w*.23,2,0,0,Math.PI*2);g.fill();}
    if(night&&P.R)P.R.lights.push([X,Y-h*.28,24,.48]);g.restore();return true;
  };
})();
